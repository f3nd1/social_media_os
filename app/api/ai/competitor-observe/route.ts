import { NextResponse } from "next/server";

import {
  applyNeverBlankEstimates,
  buildCompetitorBackgroundSearchInput,
  buildCompetitorObserveSystemPrompt,
  buildCompetitorObserveUserPrompt,
  buildCompetitorSocialSearchInput,
  isValidObserveUrl,
  mergeScrapedPlatforms,
  sanitizeCompetitorObserveDraft,
  scrapeHomepageSocialLinks,
  type CompetitorObserveDraft,
} from "@/lib/competitor-observe-ai";
import { callOpenAiJson, callOpenAiWebSearch } from "@/lib/openai-shared";

export const runtime = "nodejs";
export const maxDuration = 120;

type ObserveRequestBody = {
  apiKey?: string;
  searchModel?: string;
  synthesisModel?: string;
  name?: string;
  profileUrl?: string;
};

export async function POST(request: Request) {
  let body: ObserveRequestBody;

  try {
    body = (await request.json()) as ObserveRequestBody;
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid request body." }, { status: 400 });
  }

  const apiKey = body.apiKey?.trim();
  const searchModel = body.searchModel?.trim();
  const synthesisModel = body.synthesisModel?.trim();
  const name = body.name?.trim();
  const profileUrl = body.profileUrl?.trim();

  if (!apiKey) {
    return NextResponse.json({ ok: false, error: "Connect OpenAI in Settings first." }, { status: 400 });
  }

  if (!searchModel || !synthesisModel) {
    return NextResponse.json(
      { ok: false, error: "No model chosen. Pick models in Settings." },
      { status: 400 },
    );
  }

  if (!profileUrl) {
    return NextResponse.json(
      { ok: false, error: "Add the competitor's profile or website link first." },
      { status: 400 },
    );
  }

  // Reject a non-URL (for example a bare keyword) before any web search runs, so
  // the search is always anchored to a real domain rather than a loose phrase.
  if (!isValidObserveUrl(profileUrl)) {
    return NextResponse.json(
      {
        ok: false,
        error:
          "Enter a full website or profile URL that starts with http:// or https:// (for example https://www.example.edu.sg).",
      },
      { status: 400 },
    );
  }

  const input = { name: name || "", profileUrl };

  // Step 1: two focused web searches, plus a direct scrape of the competitor's
  // own homepage, all in parallel. The searches hunt social profile pages and
  // general background respectively; the scrape reads the homepage's own
  // footer/header links, a more trustworthy source since it comes straight
  // from the org rather than a model's search. The scrape never throws and
  // never surfaces an error: any failure resolves to an empty list.
  const [social, background, scrapedPlatforms] = await Promise.all([
    callOpenAiWebSearch({
      apiKey,
      model: searchModel,
      input: buildCompetitorSocialSearchInput(input),
    }),
    callOpenAiWebSearch({
      apiKey,
      model: searchModel,
      input: buildCompetitorBackgroundSearchInput(input),
    }),
    scrapeHomepageSocialLinks(profileUrl),
  ]);

  // Only fail outright if the searches both failed AND the homepage scrape
  // found nothing either; otherwise proceed with whatever came back, so one
  // flaky search (or a homepage that blocks scraping) does not sink the run.
  if (!social.ok && !background.ok && scrapedPlatforms.length === 0) {
    return NextResponse.json({ ok: false, error: social.error });
  }

  const searchTexts: string[] = [];
  const citations: { title: string; url: string }[] = [];
  const searchUsage = { promptTokens: 0, completionTokens: 0 };
  let searchModelUsed = searchModel;

  if (social.ok) {
    searchTexts.push(`SOCIAL PROFILE FINDINGS:\n${social.text}`);
    citations.push(...social.citations);
    searchUsage.promptTokens += social.usage.promptTokens;
    searchUsage.completionTokens += social.usage.completionTokens;
    searchModelUsed = social.model;
  }
  if (background.ok) {
    searchTexts.push(`BACKGROUND FINDINGS:\n${background.text}`);
    citations.push(...background.citations);
    searchUsage.promptTokens += background.usage.promptTokens;
    searchUsage.completionTokens += background.usage.completionTokens;
    searchModelUsed = background.model;
  }

  // Dedupe citations by url across the two searches, keeping first-seen order.
  const seenUrls = new Set<string>();
  const combinedCitations = citations.filter((citation) => {
    if (seenUrls.has(citation.url)) {
      return false;
    }
    seenUrls.add(citation.url);
    return true;
  });
  const combinedText = searchTexts.join("\n\n");

  // A synthetic citation naming exactly which platforms the homepage scrape
  // found, so the AI Generation Log's "Sources cited" list stays honest about
  // where each platform came from. Only added when the scrape found something;
  // placed first so it wins the dedupe-by-url above a generic search citation
  // of the same homepage.
  const homepageCitation =
    scrapedPlatforms.length > 0
      ? {
          title: `Official homepage (found ${scrapedPlatforms.map((platform) => platform.name).join(", ")} links)`,
          url: profileUrl,
        }
      : null;
  const responseCitations = homepageCitation
    ? [homepageCitation, ...combinedCitations.filter((citation) => citation.url !== profileUrl)]
    : combinedCitations;

  // Logged so a real run can be diagnosed from the server logs (pm2 logs):
  // the raw findings and citations from each search, before any extraction.
  console.log(
    `[competitor-observe] searches for ${profileUrl}: social ok=${social.ok} bg ok=${background.ok}, ` +
      `scraped ${scrapedPlatforms.length} platform(s) from the homepage, ` +
      `${combinedCitations.length} search citation(s)\n` +
      `citations: ${JSON.stringify(combinedCitations)}\n` +
      `raw search text: ${combinedText}`,
  );

  // Nothing to ground the text fields in, but the homepage scrape found real
  // platforms: return those directly rather than spend a synthesis call on
  // empty search text. The four text fields still get labelled estimates so the
  // run never leaves a blank field.
  if (combinedCitations.length === 0 && scrapedPlatforms.length > 0) {
    const scrapeOnlyPlatforms = mergeScrapedPlatforms([], scrapedPlatforms);
    const draft = applyNeverBlankEstimates(
      sanitizeCompetitorObserveDraft({} as CompetitorObserveDraft),
      scrapeOnlyPlatforms.map((platform) => platform.name),
    );
    return NextResponse.json({
      ok: true,
      draft: { ...draft, platforms: scrapeOnlyPlatforms },
      citations: responseCitations,
      searchUsage,
      searchModel: searchModelUsed,
    });
  }

  if (combinedCitations.length === 0) {
    return NextResponse.json({
      ok: false,
      error:
        "The search finished but cited no public pages for this link, so there is nothing solid to observe. Check the link or fill the fields in by hand.",
    });
  }

  // Step 2: synthesise the findings into competitor fields, restricted to the
  // real citations from the searches above.
  const synthesis = await callOpenAiJson<CompetitorObserveDraft>({
    apiKey,
    model: synthesisModel,
    system: buildCompetitorObserveSystemPrompt(),
    user: buildCompetitorObserveUserPrompt(combinedText, combinedCitations, input),
  });

  if (!synthesis.ok) {
    return NextResponse.json({ ok: false, error: synthesis.error });
  }

  // Logged before sanitizeCompetitorObserveDraft touches it, so this is
  // exactly what the model returned.
  console.log(
    `[competitor-observe] raw synthesis draft for ${profileUrl}: ${JSON.stringify(synthesis.data)}`,
  );

  const sanitized = sanitizeCompetitorObserveDraft(synthesis.data);
  // The homepage-scraped url wins for a platform found by both, since it is
  // sourced directly from the org rather than inferred by the model.
  const mergedPlatforms = mergeScrapedPlatforms(sanitized.platforms, scrapedPlatforms);
  // Guarantee the four text fields are never blank, labelling any the model
  // left empty as estimates (frequency reason can name the confirmed platforms).
  const draft = applyNeverBlankEstimates(
    sanitized,
    mergedPlatforms.map((platform) => platform.name),
  );

  return NextResponse.json({
    ok: true,
    draft: { ...draft, platforms: mergedPlatforms },
    citations: responseCitations,
    searchUsage,
    searchModel: searchModelUsed,
    synthesisUsage: synthesis.usage,
    synthesisModel: synthesis.model,
  });
}

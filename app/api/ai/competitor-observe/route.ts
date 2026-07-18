import { NextResponse } from "next/server";

import {
  buildCompetitorBackgroundSearchInput,
  buildCompetitorObserveSystemPrompt,
  buildCompetitorObserveUserPrompt,
  buildCompetitorSocialSearchInput,
  isValidObserveUrl,
  sanitizeCompetitorObserveDraft,
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

  // Step 1: two focused web searches in parallel. One hunts the org's own
  // social profile pages (the five behaviour fields depend on it), the other
  // gathers general background and sentiment. Splitting them stops the easy,
  // well-indexed background sources from crowding out social-profile discovery.
  const [social, background] = await Promise.all([
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
  ]);

  // Only fail outright if BOTH searches failed; otherwise proceed with whatever
  // came back, so one flaky search does not sink the whole run.
  if (!social.ok && !background.ok) {
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

  // Logged so a real run can be diagnosed from the server logs (pm2 logs):
  // the raw findings and citations from each search, before any extraction.
  console.log(
    `[competitor-observe] searches for ${profileUrl}: social ok=${social.ok} bg ok=${background.ok}, ` +
      `${combinedCitations.length} citation(s)\n` +
      `citations: ${JSON.stringify(combinedCitations)}\n` +
      `raw search text: ${combinedText}`,
  );

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

  return NextResponse.json({
    ok: true,
    draft: sanitizeCompetitorObserveDraft(synthesis.data),
    citations: combinedCitations,
    searchUsage,
    searchModel: searchModelUsed,
    synthesisUsage: synthesis.usage,
    synthesisModel: synthesis.model,
  });
}

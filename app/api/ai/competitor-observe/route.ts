import { NextResponse } from "next/server";

import {
  buildCompetitorObserveSearchInput,
  buildCompetitorObserveSystemPrompt,
  buildCompetitorObserveUserPrompt,
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

  // Step 1: real web search over what is publicly indexed about the profile.
  const search = await callOpenAiWebSearch({
    apiKey,
    model: searchModel,
    input: buildCompetitorObserveSearchInput(input),
  });

  if (!search.ok) {
    return NextResponse.json({ ok: false, error: search.error });
  }

  if (search.citations.length === 0) {
    return NextResponse.json({
      ok: false,
      error:
        "The search finished but cited no public pages for this link, so there is nothing solid to observe. Check the link or fill the fields in by hand.",
    });
  }

  // Step 2: synthesise the findings into competitor fields, restricted to the
  // real citations from step 1.
  const synthesis = await callOpenAiJson<CompetitorObserveDraft>({
    apiKey,
    model: synthesisModel,
    system: buildCompetitorObserveSystemPrompt(),
    user: buildCompetitorObserveUserPrompt(search.text, search.citations, input),
  });

  if (!synthesis.ok) {
    return NextResponse.json({ ok: false, error: synthesis.error });
  }

  return NextResponse.json({
    ok: true,
    draft: sanitizeCompetitorObserveDraft(synthesis.data),
    citations: search.citations,
    searchUsage: search.usage,
    searchModel: search.model,
    synthesisUsage: synthesis.usage,
    synthesisModel: synthesis.model,
  });
}

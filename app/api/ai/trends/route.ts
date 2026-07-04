import { NextResponse } from "next/server";

import { callOpenAiJson, callOpenAiWebSearch } from "@/lib/openai-shared";
import {
  buildTrendSearchInput,
  buildTrendSynthesisSystemPrompt,
  buildTrendSynthesisUserPrompt,
  trendDraftToInsights,
  type TrendAiContext,
  type TrendAiDraft,
} from "@/lib/trend-ai";

export const runtime = "nodejs";
export const maxDuration = 120;

type TrendsRequestBody = {
  apiKey?: string;
  searchModel?: string;
  synthesisModel?: string;
  context?: TrendAiContext;
};

export async function POST(request: Request) {
  let body: TrendsRequestBody;

  try {
    body = (await request.json()) as TrendsRequestBody;
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid request body." }, { status: 400 });
  }

  const apiKey = body.apiKey?.trim();
  const searchModel = body.searchModel?.trim();
  const synthesisModel = body.synthesisModel?.trim();

  if (!apiKey) {
    return NextResponse.json({ ok: false, error: "Connect OpenAI in Settings first." }, { status: 400 });
  }

  if (!searchModel || !synthesisModel) {
    return NextResponse.json(
      { ok: false, error: "No model chosen. Pick models in Settings." },
      { status: 400 },
    );
  }

  if (!body.context) {
    return NextResponse.json({ ok: false, error: "Missing workspace context." }, { status: 400 });
  }

  // Step 1: real web search with the utility model.
  const search = await callOpenAiWebSearch({
    apiKey,
    model: searchModel,
    input: buildTrendSearchInput(body.context),
  });

  if (!search.ok) {
    return NextResponse.json({ ok: false, error: search.error });
  }

  if (search.citations.length === 0) {
    return NextResponse.json({
      ok: false,
      error:
        "The web search finished but cited no pages, so there is nothing solid to report. Try again later.",
    });
  }

  // Step 2: synthesis with the analysis model, restricted to the real
  // citations from step 1.
  const synthesis = await callOpenAiJson<TrendAiDraft>({
    apiKey,
    model: synthesisModel,
    system: buildTrendSynthesisSystemPrompt(),
    user: buildTrendSynthesisUserPrompt(search.text, search.citations, body.context),
  });

  if (!synthesis.ok) {
    return NextResponse.json({ ok: false, error: synthesis.error });
  }

  const trends = trendDraftToInsights(synthesis.data, search.citations, synthesis.model);

  if (trends.length === 0) {
    return NextResponse.json({
      ok: false,
      error:
        "The search results were too thin to support any trend with a real source, so no trends were made up.",
    });
  }

  return NextResponse.json({
    ok: true,
    trends,
    searchUsage: search.usage,
    searchModel: search.model,
    synthesisUsage: synthesis.usage,
    synthesisModel: synthesis.model,
  });
}

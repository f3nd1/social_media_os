import { NextResponse } from "next/server";

import {
  buildCampaignSystemPrompt,
  buildCampaignUserPrompt,
  type CampaignAiContext,
  type CampaignAiSuggestionDraft,
} from "@/lib/campaign-ai";
import { callOpenAiJson } from "@/lib/openai-shared";

export const runtime = "nodejs";

type CampaignRequestBody = {
  apiKey?: string;
  model?: string;
  context?: CampaignAiContext;
};

export async function POST(request: Request) {
  let body: CampaignRequestBody;

  try {
    body = (await request.json()) as CampaignRequestBody;
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid request body." }, { status: 400 });
  }

  const apiKey = body.apiKey?.trim();
  const model = body.model?.trim();

  if (!apiKey) {
    return NextResponse.json({ ok: false, error: "Connect OpenAI in Settings first." }, { status: 400 });
  }

  if (!model) {
    return NextResponse.json(
      { ok: false, error: "No analysis model chosen. Pick one in Settings." },
      { status: 400 },
    );
  }

  if (!body.context) {
    return NextResponse.json({ ok: false, error: "Missing workspace context." }, { status: 400 });
  }

  const result = await callOpenAiJson<{ suggestions?: CampaignAiSuggestionDraft[] }>({
    apiKey,
    model,
    system: buildCampaignSystemPrompt(),
    user: buildCampaignUserPrompt(body.context),
  });

  if (!result.ok) {
    return NextResponse.json({ ok: false, error: result.error });
  }

  const suggestions = Array.isArray(result.data.suggestions)
    ? result.data.suggestions
    : [];

  if (suggestions.length === 0) {
    return NextResponse.json({
      ok: false,
      error: "OpenAI returned no campaign suggestions. Try again or pick another model.",
    });
  }

  return NextResponse.json({
    ok: true,
    suggestions,
    usage: result.usage,
    model: result.model,
  });
}

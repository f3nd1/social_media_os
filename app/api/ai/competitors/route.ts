import { NextResponse } from "next/server";

import {
  buildCompetitorSystemPrompt,
  buildCompetitorUserPrompt,
  type CompetitorAiContext,
  type CompetitorAiDraft,
} from "@/lib/competitor-ai";
import { callOpenAiJson } from "@/lib/openai-shared";

export const runtime = "nodejs";

type CompetitorRequestBody = {
  apiKey?: string;
  model?: string;
  context?: CompetitorAiContext;
};

export async function POST(request: Request) {
  let body: CompetitorRequestBody;

  try {
    body = (await request.json()) as CompetitorRequestBody;
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

  if (!body.context || body.context.competitors.length === 0) {
    return NextResponse.json(
      { ok: false, error: "Add at least one competitor record first." },
      { status: 400 },
    );
  }

  const result = await callOpenAiJson<CompetitorAiDraft>({
    apiKey,
    model,
    system: buildCompetitorSystemPrompt(),
    user: buildCompetitorUserPrompt(body.context),
  });

  if (!result.ok) {
    return NextResponse.json({ ok: false, error: result.error });
  }

  if (!Array.isArray(result.data.competitors) || result.data.competitors.length === 0) {
    return NextResponse.json({
      ok: false,
      error: "OpenAI returned no competitor insights. Try again or pick another model.",
    });
  }

  return NextResponse.json({
    ok: true,
    draft: result.data,
    usage: result.usage,
    model: result.model,
  });
}

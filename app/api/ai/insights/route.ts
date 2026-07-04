import { NextResponse } from "next/server";

import {
  buildInsightsSystemPrompt,
  buildInsightsUserPrompt,
  type InsightsAiContext,
  type InsightsAiDraft,
} from "@/lib/insights-ai";
import { callOpenAiJson } from "@/lib/openai-shared";

export const runtime = "nodejs";

type InsightsRequestBody = {
  apiKey?: string;
  model?: string;
  context?: InsightsAiContext;
};

export async function POST(request: Request) {
  let body: InsightsRequestBody;

  try {
    body = (await request.json()) as InsightsRequestBody;
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

  if (!body.context || (body.context.module !== "budget" && body.context.module !== "kpi")) {
    return NextResponse.json({ ok: false, error: "Missing workspace context." }, { status: 400 });
  }

  const result = await callOpenAiJson<InsightsAiDraft>({
    apiKey,
    model,
    system: buildInsightsSystemPrompt(body.context.module),
    user: buildInsightsUserPrompt(body.context),
  });

  if (!result.ok) {
    return NextResponse.json({ ok: false, error: result.error });
  }

  if (!Array.isArray(result.data.insights) || result.data.insights.length === 0) {
    return NextResponse.json({
      ok: false,
      error: "OpenAI returned no insights. Try again or pick another model.",
    });
  }

  return NextResponse.json({
    ok: true,
    draft: result.data,
    usage: result.usage,
    model: result.model,
  });
}

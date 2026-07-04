import { NextResponse } from "next/server";

import { callOpenAiJson } from "@/lib/openai-shared";
import {
  buildReportSystemPrompt,
  buildReportUserPrompt,
  type ReportAiContext,
  type ReportAiDraft,
} from "@/lib/report-ai";

export const runtime = "nodejs";

type ReportRequestBody = {
  apiKey?: string;
  model?: string;
  context?: ReportAiContext;
};

export async function POST(request: Request) {
  let body: ReportRequestBody;

  try {
    body = (await request.json()) as ReportRequestBody;
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

  const result = await callOpenAiJson<ReportAiDraft>({
    apiKey,
    model,
    system: buildReportSystemPrompt(),
    user: buildReportUserPrompt(body.context),
  });

  if (!result.ok) {
    return NextResponse.json({ ok: false, error: result.error });
  }

  if (!result.data.narrative?.trim()) {
    return NextResponse.json({
      ok: false,
      error: "OpenAI returned an empty narrative. Try again or pick another model.",
    });
  }

  return NextResponse.json({
    ok: true,
    narrative: result.data.narrative.trim(),
    usage: result.usage,
    model: result.model,
  });
}

import { NextResponse } from "next/server";

import {
  buildCopySystemPrompt,
  buildCopyUserPrompt,
  type CopyAiContext,
  type CopyAiDraft,
} from "@/lib/copy-ai";
import { callOpenAiJson } from "@/lib/openai-shared";

export const runtime = "nodejs";

type CopyRequestBody = {
  apiKey?: string;
  model?: string;
  context?: CopyAiContext;
};

export async function POST(request: Request) {
  let body: CopyRequestBody;

  try {
    body = (await request.json()) as CopyRequestBody;
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

  const result = await callOpenAiJson<CopyAiDraft>({
    apiKey,
    model,
    system: buildCopySystemPrompt(),
    user: buildCopyUserPrompt(body.context),
  });

  if (!result.ok) {
    return NextResponse.json({ ok: false, error: result.error });
  }

  if (!result.data.caption && !result.data.videoScript) {
    return NextResponse.json({
      ok: false,
      error: "OpenAI returned no usable copy. Try again or pick another model.",
    });
  }

  return NextResponse.json({
    ok: true,
    draft: result.data,
    usage: result.usage,
    model: result.model,
  });
}

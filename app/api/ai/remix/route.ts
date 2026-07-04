import { NextResponse } from "next/server";

import { callOpenAiJson } from "@/lib/openai-shared";
import {
  buildRemixSystemPrompt,
  buildRemixUserPrompt,
  type RemixAiContext,
  type RemixAiDraft,
} from "@/lib/remix-ai";

export const runtime = "nodejs";

type RemixRequestBody = {
  apiKey?: string;
  model?: string;
  context?: RemixAiContext;
};

export async function POST(request: Request) {
  let body: RemixRequestBody;

  try {
    body = (await request.json()) as RemixRequestBody;
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

  if (!body.context || body.context.targetPlatforms.length === 0) {
    return NextResponse.json({ ok: false, error: "Missing workspace context." }, { status: 400 });
  }

  const result = await callOpenAiJson<RemixAiDraft>({
    apiKey,
    model,
    system: buildRemixSystemPrompt(),
    user: buildRemixUserPrompt(body.context),
  });

  if (!result.ok) {
    return NextResponse.json({ ok: false, error: result.error });
  }

  if (!Array.isArray(result.data.variants) || result.data.variants.length === 0) {
    return NextResponse.json({
      ok: false,
      error: "OpenAI returned no variants. Try again or pick another model.",
    });
  }

  return NextResponse.json({
    ok: true,
    draft: result.data,
    usage: result.usage,
    model: result.model,
  });
}

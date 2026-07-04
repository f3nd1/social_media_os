import { NextResponse } from "next/server";

import {
  buildBriefSystemPrompt,
  buildBriefUserPrompt,
  type BriefAiContext,
  type BriefAiDraft,
} from "@/lib/brief-ai";
import { callOpenAiJson } from "@/lib/openai-shared";

export const runtime = "nodejs";

type BriefRequestBody = {
  apiKey?: string;
  model?: string;
  context?: BriefAiContext;
};

export async function POST(request: Request) {
  let body: BriefRequestBody;

  try {
    body = (await request.json()) as BriefRequestBody;
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid request body." }, { status: 400 });
  }

  const apiKey = body.apiKey?.trim();
  const model = body.model?.trim();

  if (!apiKey) {
    return NextResponse.json(
      { ok: false, error: "Connect OpenAI in Settings first." },
      { status: 400 },
    );
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

  const result = await callOpenAiJson<BriefAiDraft>({
    apiKey,
    model,
    system: buildBriefSystemPrompt(),
    user: buildBriefUserPrompt(body.context),
  });

  if (!result.ok) {
    return NextResponse.json({ ok: false, error: result.error });
  }

  return NextResponse.json({
    ok: true,
    draft: result.data,
    usage: result.usage,
    model: result.model,
  });
}

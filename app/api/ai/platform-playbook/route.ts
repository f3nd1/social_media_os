import { NextResponse } from "next/server";

import {
  buildPlatformPlaybookSystemPrompt,
  buildPlatformPlaybookUserPrompt,
  type PlatformPlaybookAiContext,
  type PlatformPlaybookAiDraft,
} from "@/lib/platform-playbook-ai";
import { callOpenAiJson } from "@/lib/openai-shared";

export const runtime = "nodejs";

type PlatformPlaybookRequestBody = {
  apiKey?: string;
  model?: string;
  context?: PlatformPlaybookAiContext;
};

export async function POST(request: Request) {
  let body: PlatformPlaybookRequestBody;

  try {
    body = (await request.json()) as PlatformPlaybookRequestBody;
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

  const result = await callOpenAiJson<PlatformPlaybookAiDraft>({
    apiKey,
    model,
    system: buildPlatformPlaybookSystemPrompt(),
    user: buildPlatformPlaybookUserPrompt(body.context),
  });

  if (!result.ok) {
    return NextResponse.json({ ok: false, error: result.error });
  }

  if (!result.data.role) {
    return NextResponse.json({
      ok: false,
      error: "OpenAI returned no playbook. Try again or pick another model.",
    });
  }

  return NextResponse.json({
    ok: true,
    draft: result.data,
    usage: result.usage,
    model: result.model,
  });
}

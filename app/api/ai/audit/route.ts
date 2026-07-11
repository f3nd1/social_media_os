import { NextResponse } from "next/server";

import {
  buildAuditSystemPrompt,
  buildAuditUserPrompt,
  buildWholeAuditSystemPrompt,
  buildWholeAuditUserPrompt,
  type AuditAiContext,
  type AuditAiDraft,
  type WholeAuditAiContext,
  type WholeAuditAiDraft,
} from "@/lib/audit-ai";
import { callOpenAiJson } from "@/lib/openai-shared";

export const runtime = "nodejs";

type AuditRequestBody = {
  apiKey?: string;
  model?: string;
  // "whole" assesses every platform together in one call (Audit Output);
  // omitted or "platform" keeps the existing single-platform assessment.
  mode?: "platform" | "whole";
  context?: AuditAiContext;
  wholeContext?: WholeAuditAiContext;
};

export async function POST(request: Request) {
  let body: AuditRequestBody;

  try {
    body = (await request.json()) as AuditRequestBody;
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

  if (body.mode === "whole") {
    if (!body.wholeContext) {
      return NextResponse.json({ ok: false, error: "Missing workspace context." }, { status: 400 });
    }

    const result = await callOpenAiJson<WholeAuditAiDraft>({
      apiKey,
      model,
      system: buildWholeAuditSystemPrompt(),
      user: buildWholeAuditUserPrompt(body.wholeContext),
    });

    if (!result.ok) {
      return NextResponse.json({ ok: false, error: result.error });
    }

    if (!result.data.overallSummary) {
      return NextResponse.json({
        ok: false,
        error: "OpenAI returned no summary. Try again or pick another model.",
      });
    }

    return NextResponse.json({
      ok: true,
      draft: result.data,
      usage: result.usage,
      model: result.model,
    });
  }

  if (!body.context) {
    return NextResponse.json({ ok: false, error: "Missing workspace context." }, { status: 400 });
  }

  const result = await callOpenAiJson<AuditAiDraft>({
    apiKey,
    model,
    system: buildAuditSystemPrompt(),
    user: buildAuditUserPrompt(body.context),
  });

  if (!result.ok) {
    return NextResponse.json({ ok: false, error: result.error });
  }

  if (!result.data.recommendation) {
    return NextResponse.json({
      ok: false,
      error: "OpenAI returned no recommendation. Try again or pick another model.",
    });
  }

  return NextResponse.json({
    ok: true,
    draft: result.data,
    usage: result.usage,
    model: result.model,
  });
}

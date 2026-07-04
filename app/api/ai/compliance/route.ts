import { NextResponse } from "next/server";

import {
  buildComplianceSystemPrompt,
  buildComplianceUserPrompt,
  type ComplianceAiContext,
  type ComplianceAiDraft,
} from "@/lib/compliance-ai";
import { callOpenAiJson } from "@/lib/openai-shared";

export const runtime = "nodejs";

type ComplianceRequestBody = {
  apiKey?: string;
  model?: string;
  context?: ComplianceAiContext;
};

export async function POST(request: Request) {
  let body: ComplianceRequestBody;

  try {
    body = (await request.json()) as ComplianceRequestBody;
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
    return NextResponse.json({ ok: false, error: "Missing review content." }, { status: 400 });
  }

  if (body.context.mode === "single" && !body.context.content.trim()) {
    return NextResponse.json({ ok: false, error: "Paste some content to review first." }, { status: 400 });
  }

  if (body.context.mode === "calendar" && body.context.calendarItems.length === 0) {
    return NextResponse.json({
      ok: false,
      error: "There are no unapproved calendar captions to review.",
    });
  }

  const result = await callOpenAiJson<ComplianceAiDraft>({
    apiKey,
    model,
    system: buildComplianceSystemPrompt(),
    user: buildComplianceUserPrompt(body.context),
  });

  if (!result.ok) {
    return NextResponse.json({ ok: false, error: result.error });
  }

  const draft = result.data;
  const score = Number.isFinite(draft.score)
    ? Math.max(0, Math.min(100, Math.round(draft.score)))
    : 0;

  return NextResponse.json({
    ok: true,
    review: {
      score,
      riskLevel: ["low", "medium", "high"].includes(draft.riskLevel)
        ? draft.riskLevel
        : "high",
      summary: typeof draft.summary === "string" ? draft.summary : "",
      flags: Array.isArray(draft.flags) ? draft.flags : [],
      calendarFindings: Array.isArray(draft.calendarFindings)
        ? draft.calendarFindings
        : [],
    },
    usage: result.usage,
    model: result.model,
  });
}

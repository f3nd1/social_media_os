import { NextResponse } from "next/server";

import {
  buildBriefSystemPrompt,
  buildBriefUserPrompt,
  type BriefAiContext,
  type BriefAiDraft,
} from "@/lib/brief-ai";

export const runtime = "nodejs";

type BriefRequestBody = {
  apiKey?: string;
  model?: string;
  context?: BriefAiContext;
};

type OpenAiChatResponse = {
  choices?: Array<{ message?: { content?: string } }>;
  error?: { message?: string; code?: string; type?: string };
};

// Turn an OpenAI failure into plain words for a non-technical manager, while
// keeping the raw detail so nothing is hidden. Never fabricates a result.
function friendlyError(status: number, payload: OpenAiChatResponse | null): string {
  const raw = payload?.error?.message ?? "";
  const code = payload?.error?.code ?? payload?.error?.type ?? "";

  if (status === 401 || /invalid_api_key|incorrect api key/i.test(`${code} ${raw}`)) {
    return "Invalid key. Check the OpenAI API key in Settings.";
  }

  if (/insufficient_quota|exceeded your current quota/i.test(`${code} ${raw}`)) {
    return "No OpenAI credit. Check your OpenAI billing, then try again.";
  }

  if (status === 404 || /model_not_found|does not exist|do not have access/i.test(`${code} ${raw}`)) {
    return "Model not available for this account. Pick another analysis model in Settings.";
  }

  if (status === 429) {
    return `Rate limited by OpenAI. Wait a moment and try again.${raw ? ` (${raw})` : ""}`;
  }

  return raw || `OpenAI request failed (${status}).`;
}

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

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: buildBriefSystemPrompt() },
          { role: "user", content: buildBriefUserPrompt(body.context) },
        ],
      }),
    });

    const payload = (await response.json().catch(() => null)) as OpenAiChatResponse | null;

    if (!response.ok) {
      return NextResponse.json({ ok: false, error: friendlyError(response.status, payload) });
    }

    const content = payload?.choices?.[0]?.message?.content;

    if (!content) {
      return NextResponse.json({
        ok: false,
        error: "OpenAI returned an empty response. Try again or pick another model.",
      });
    }

    let draft: BriefAiDraft;

    try {
      draft = JSON.parse(content) as BriefAiDraft;
    } catch {
      return NextResponse.json({
        ok: false,
        error: "OpenAI did not return readable JSON. Try again or pick another analysis model.",
      });
    }

    return NextResponse.json({ ok: true, draft });
  } catch (error) {
    return NextResponse.json({
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

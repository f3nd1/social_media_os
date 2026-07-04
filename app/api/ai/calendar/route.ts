import { NextResponse } from "next/server";

import {
  buildCalendarSystemPrompt,
  buildCalendarUserPrompt,
  type CalendarAiContext,
  type CalendarDraftItem,
} from "@/lib/calendar-ai";
import { callOpenAiJson } from "@/lib/openai-shared";

export const runtime = "nodejs";

type CalendarRequestBody = {
  apiKey?: string;
  model?: string;
  context?: CalendarAiContext;
};

export async function POST(request: Request) {
  let body: CalendarRequestBody;

  try {
    body = (await request.json()) as CalendarRequestBody;
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

  const result = await callOpenAiJson<{ items?: CalendarDraftItem[] }>({
    apiKey,
    model,
    system: buildCalendarSystemPrompt(),
    user: buildCalendarUserPrompt(body.context),
  });

  if (!result.ok) {
    return NextResponse.json({ ok: false, error: result.error });
  }

  const items = Array.isArray(result.data.items) ? result.data.items : [];

  if (items.length === 0) {
    return NextResponse.json({
      ok: false,
      error: "OpenAI returned no calendar items. Try again or pick another model.",
    });
  }

  return NextResponse.json({
    ok: true,
    items,
    usage: result.usage,
    model: result.model,
  });
}

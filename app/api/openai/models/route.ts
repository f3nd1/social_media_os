import { NextResponse } from "next/server";

export const runtime = "nodejs";

type ModelsRequestBody = {
  apiKey?: string;
};

type OpenAiModelsResponse = {
  data?: Array<{ id?: string }>;
  error?: { message?: string };
};

// Server-side proxy so the browser can list an account's OpenAI models. OpenAI
// does not permit direct browser calls (no CORS), and this keeps the key out
// of any client-visible request to a third party. The key is used for this one
// request only and never stored server-side. On failure the verbatim upstream
// message is returned, never a fabricated success.
export async function POST(request: Request) {
  let body: ModelsRequestBody;

  try {
    body = (await request.json()) as ModelsRequestBody;
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid request body." }, { status: 400 });
  }

  const apiKey = body.apiKey?.trim();

  if (!apiKey) {
    return NextResponse.json(
      { ok: false, error: "Enter an OpenAI API key first." },
      { status: 400 },
    );
  }

  try {
    const response = await fetch("https://api.openai.com/v1/models", {
      headers: { Authorization: `Bearer ${apiKey}` },
    });

    const payload = (await response.json().catch(() => null)) as OpenAiModelsResponse | null;

    if (!response.ok) {
      const detail = payload?.error?.message || `${response.status} ${response.statusText}`;
      return NextResponse.json({ ok: false, error: detail });
    }

    const models = (payload?.data ?? [])
      .map((model) => model.id)
      .filter((id): id is string => Boolean(id))
      .sort((a, b) => a.localeCompare(b));

    if (models.length === 0) {
      return NextResponse.json({
        ok: false,
        error: "The key worked but the account returned no available models.",
      });
    }

    return NextResponse.json({ ok: true, models });
  } catch (error) {
    return NextResponse.json({
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

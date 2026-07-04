// Shared server-side OpenAI plumbing for every AI route in the app.
// One place for the call, the JSON parsing, the plain-word error mapping, and
// the token usage that feeds the AI usage meter. Never fabricates a result.

export type OpenAiUsage = {
  promptTokens: number;
  completionTokens: number;
};

export type OpenAiJsonResult<T> =
  | { ok: true; data: T; usage: OpenAiUsage; model: string }
  | { ok: false; error: string };

type OpenAiChatResponse = {
  model?: string;
  choices?: Array<{ message?: { content?: string } }>;
  usage?: { prompt_tokens?: number; completion_tokens?: number };
  error?: { message?: string; code?: string; type?: string };
};

// Plain words for a non-technical manager, keeping the raw detail visible.
export function friendlyOpenAiError(
  status: number,
  payload: OpenAiChatResponse | null,
): string {
  const raw = payload?.error?.message ?? "";
  const code = payload?.error?.code ?? payload?.error?.type ?? "";

  if (status === 401 || /invalid_api_key|incorrect api key/i.test(`${code} ${raw}`)) {
    return "Invalid key. Check the OpenAI API key in Settings.";
  }

  if (/insufficient_quota|exceeded your current quota/i.test(`${code} ${raw}`)) {
    return "No OpenAI credit. Check your OpenAI billing, then try again.";
  }

  if (status === 404 || /model_not_found|does not exist|do not have access/i.test(`${code} ${raw}`)) {
    return "Model not available for this account. Pick another model in Settings.";
  }

  if (status === 429) {
    return `Rate limited by OpenAI. Wait a moment and try again.${raw ? ` (${raw})` : ""}`;
  }

  return raw || `OpenAI request failed (${status}).`;
}

export async function callOpenAiJson<T>({
  apiKey,
  model,
  system,
  user,
}: {
  apiKey: string;
  model: string;
  system: string;
  user: string;
}): Promise<OpenAiJsonResult<T>> {
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
          { role: "system", content: system },
          { role: "user", content: user },
        ],
      }),
    });

    const payload = (await response.json().catch(() => null)) as OpenAiChatResponse | null;

    if (!response.ok) {
      return { ok: false, error: friendlyOpenAiError(response.status, payload) };
    }

    const content = payload?.choices?.[0]?.message?.content;

    if (!content) {
      return {
        ok: false,
        error: "OpenAI returned an empty response. Try again or pick another model.",
      };
    }

    let data: T;

    try {
      data = JSON.parse(content) as T;
    } catch {
      return {
        ok: false,
        error: "OpenAI did not return readable JSON. Try again or pick another model.",
      };
    }

    return {
      ok: true,
      data,
      usage: {
        promptTokens: payload?.usage?.prompt_tokens ?? 0,
        completionTokens: payload?.usage?.completion_tokens ?? 0,
      },
      model: payload?.model ?? model,
    };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

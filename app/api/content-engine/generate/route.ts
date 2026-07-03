import { NextResponse } from "next/server";

import {
  contentEngineOutputSchema,
  type ContentEngineInput,
  type ContentEngineOutput,
} from "@/lib/content-engine";
import { insertSupabaseRow } from "@/lib/supabase-server";

export const runtime = "nodejs";

type OpenAITextContent = {
  type?: string;
  text?: string;
};

type OpenAIOutputMessage = {
  type?: string;
  content?: OpenAITextContent[];
};

type OpenAIResponsePayload = {
  id?: string;
  model?: string;
  output_text?: string;
  output?: OpenAIOutputMessage[];
  error?: {
    message?: string;
  };
};

type ContentEngineRunRow = {
  id: string;
};

const requiredFields: Array<keyof ContentEngineInput> = [
  "businessGoal",
  "brandName",
  "productOffer",
  "audienceSegment",
  "audienceInsight",
  "customerPain",
  "platforms",
  "funnelStage",
  "primaryCta",
  "dueDate",
  "publishDate",
];

export async function POST(request: Request) {
  try {
    const input = (await request.json()) as ContentEngineInput;
    const missingField = requiredFields.find((field) => !input[field]?.trim());

    if (missingField) {
      return NextResponse.json(
        { error: `Missing required field: ${missingField}` },
        { status: 400 },
      );
    }

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: "OPENAI_API_KEY is not configured on the server." },
        { status: 500 },
      );
    }

    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json(
        {
          error:
            "Supabase storage is not configured. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY on the server.",
        },
        { status: 500 },
      );
    }

    const model = process.env.OPENAI_MODEL || "gpt-5.2";
    const openaiResponse = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        store: false,
        max_output_tokens: 6000,
        input: [
          {
            role: "developer",
            content:
              "You are a senior content strategist. Build a connected Content Engine flow from business goal to execution. Return only structured JSON matching the schema.",
          },
          {
            role: "user",
            content: [
              {
                type: "input_text",
                text: buildGenerationPrompt(input),
              },
            ],
          },
        ],
        text: {
          format: {
            type: "json_schema",
            name: "content_engine_output",
            strict: true,
            schema: contentEngineOutputSchema,
          },
        },
      }),
    });

    const responsePayload = (await openaiResponse.json()) as OpenAIResponsePayload;

    if (!openaiResponse.ok) {
      return NextResponse.json(
        {
          error:
            responsePayload.error?.message ||
            "OpenAI request failed while generating the Content Engine output.",
        },
        { status: openaiResponse.status },
      );
    }

    const outputText = extractOutputText(responsePayload);
    const output = JSON.parse(outputText) as ContentEngineOutput;
    const persistedRun = await insertSupabaseRow<ContentEngineRunRow>({
      table: "content_engine_runs",
      payload: {
        company_id: process.env.CONTENT_OS_COMPANY_ID || null,
        input,
        brand_blueprint: output.brandBlueprint,
        audience_blueprint: output.audienceBlueprint,
        content_angles: output.contentAngles,
        series_ideas: output.seriesIdeas,
        platform_adaptations: output.platformAdaptations,
        content_cards: output.contentCards,
        full_output: output,
        openai_response_id: responsePayload.id || null,
        model: responsePayload.model || model,
      },
    });

    if (!persistedRun) {
      throw new Error("Supabase did not return a saved Content Engine run.");
    }

    return NextResponse.json({
      id: persistedRun?.id,
      input,
      output,
      model: responsePayload.model || model,
      openaiResponseId: responsePayload.id,
      persisted: Boolean(persistedRun),
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "The Content Engine generation failed.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}

function buildGenerationPrompt(input: ContentEngineInput) {
  return `Generate a Content Engine flow with this sequence:
1. Business Goal -> 2. Audience Insight -> 3. Content Angle -> 4. Series Opportunity -> 5. Platform Adaptation -> 6. Content Execution.

Strategy input:
${JSON.stringify(input, null, 2)}

Output requirements:
- Brand Blueprint: positioning, promise, voice, proof points, guardrails.
- Audience Blueprint: segment, core insight, pains, outcomes, objections, triggers.
- Content Angles: specific, differentiated angles tied to the funnel stage.
- Series Ideas: repeatable series opportunities with cadence and episode ideas.
- Platform Adaptations: adapt the strategy to each requested platform.
- Content Cards: execution-ready cards with goal, audience, angle, series, platform, funnel stage, owner role, status, due date, publish date, hook, outline, CTA, and metrics.

Keep the outputs practical enough for a production team to use immediately.`;
}

function extractOutputText(payload: OpenAIResponsePayload) {
  if (payload.output_text) {
    return payload.output_text;
  }

  const text = payload.output
    ?.flatMap((item) => item.content || [])
    .filter((content) => content.type === "output_text" || content.text)
    .map((content) => content.text || "")
    .join("");

  if (!text) {
    throw new Error("OpenAI returned no structured output text.");
  }

  return text;
}

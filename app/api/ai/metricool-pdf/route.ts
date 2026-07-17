import { NextResponse } from "next/server";

import {
  buildMetricoolPdfSystemPrompt,
  buildMetricoolPdfUserPrompt,
  mapMetricoolPdfDraft,
  type MetricoolPdfDraft,
} from "@/lib/metricool-pdf-ai";
import { callOpenAiJson } from "@/lib/openai-shared";
import { extractPdfText } from "@/lib/pdf-extract";
import { MAX_UPLOAD_BYTES, oversizedFileMessage } from "@/lib/upload-limits";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
// Web-free but the PDF parse plus a model round-trip can be slow on big reports.
export const maxDuration = 120;

const MAX_REPORT_CHARACTERS = 40_000;

export async function POST(request: Request) {
  const formData = await request.formData();
  const file = formData.get("file");
  const apiKey = String(formData.get("apiKey") ?? "").trim();
  const model = String(formData.get("model") ?? "").trim();

  if (!(file instanceof File)) {
    return NextResponse.json(
      { ok: false, error: "Attach a Metricool PDF report using the file field." },
      { status: 400 },
    );
  }

  const isPdf = file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");

  if (!isPdf) {
    return NextResponse.json(
      { ok: false, error: "Only PDF analytics reports can be imported." },
      { status: 400 },
    );
  }

  if (file.size > MAX_UPLOAD_BYTES) {
    return NextResponse.json(
      { ok: false, error: oversizedFileMessage(file.size, "PDF") },
      { status: 413 },
    );
  }

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

  let reportText = "";

  try {
    const extracted = await extractPdfText(Buffer.from(await file.arrayBuffer()));
    reportText = extracted.text.trim();
  } catch (error) {
    return NextResponse.json({
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    });
  }

  if (!reportText) {
    return NextResponse.json({
      ok: false,
      error:
        "The PDF opened but no selectable text was found. It may be a scanned or image-only report. Export a text-based Metricool PDF first.",
    });
  }

  const result = await callOpenAiJson<MetricoolPdfDraft>({
    apiKey,
    model,
    system: buildMetricoolPdfSystemPrompt(),
    user: buildMetricoolPdfUserPrompt(reportText.slice(0, MAX_REPORT_CHARACTERS)),
  });

  if (!result.ok) {
    return NextResponse.json({ ok: false, error: result.error });
  }

  const metrics = mapMetricoolPdfDraft(result.data);

  if (metrics.length === 0) {
    return NextResponse.json({
      ok: false,
      error:
        "The AI could not find any per-platform numbers in this PDF. Check it is a Metricool analytics export with each network shown.",
    });
  }

  return NextResponse.json({
    ok: true,
    metrics,
    usage: result.usage,
    model: result.model,
  });
}

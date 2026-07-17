// Shared client helper: upload a Metricool PDF, let the AI break it into
// per-platform metrics, and return a PendingMetricReview ready for the existing
// approve-before-apply flow. Used by both the Settings importer and the Market
// Intelligence "Live Platform Data Connections" panel, so the two entry points
// stay identical.

import { apiUrl } from "@/lib/base-path";
import { buildPdfMetricReviewRows, type PendingMetricReview } from "@/lib/pdf-data-import";
import type { PlatformDataMetrics } from "@/lib/pdf-data-import";
import type { OpenAiUsage } from "@/lib/openai-shared";
import { MAX_UPLOAD_BYTES, oversizedFileMessage } from "@/lib/upload-limits";
import { readJsonResponse } from "@/lib/utils";

export type MetricoolPdfImportResult =
  | { ok: true; pending: PendingMetricReview; usage?: OpenAiUsage; model?: string }
  | { ok: false; message: string };

export async function importMetricoolPdf({
  file,
  apiKey,
  model,
}: {
  file: File;
  apiKey: string;
  model: string;
}): Promise<MetricoolPdfImportResult> {
  if (file.size > MAX_UPLOAD_BYTES) {
    return { ok: false, message: oversizedFileMessage(file.size, "PDF") };
  }

  try {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("apiKey", apiKey);
    formData.append("model", model);

    const response = await fetch(apiUrl("/api/ai/metricool-pdf"), {
      method: "POST",
      body: formData,
    });

    if (response.status === 413) {
      return { ok: false, message: oversizedFileMessage(file.size, "PDF") };
    }

    const result = await readJsonResponse<
      | { ok: true; metrics: PlatformDataMetrics[]; usage?: OpenAiUsage; model?: string }
      | { ok: false; error: string }
    >(response);

    if (!result.ok) {
      return { ok: false, message: result.error };
    }

    return {
      ok: true,
      pending: {
        rows: buildPdfMetricReviewRows(result.metrics, "metricool-pdf"),
        sourceLabel: `Metricool PDF import (${file.name})`,
        noteLabel: "Metricool PDF import",
        rangeLabel: "the date range in the PDF report",
      },
      usage: result.usage,
      model: result.model,
    };
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : String(error),
    };
  }
}

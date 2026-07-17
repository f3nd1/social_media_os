import { spawn } from "node:child_process";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { NextResponse } from "next/server";

import { parsePdfReportMetrics } from "@/lib/pdf-data-import";
import { MAX_UPLOAD_BYTES, MAX_UPLOAD_MB } from "@/lib/upload-limits";
import { sanitizeFileName } from "@/lib/utils";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const MAX_RETURNED_TEXT_CHARACTERS = 120_000;
const MAX_EXTRACTOR_OUTPUT_BYTES = 12 * 1024 * 1024;

type ExtractorResult = {
  text?: string;
  pages?: number;
  method?: string;
  characters?: number;
  error?: string;
  detail?: string;
};

export async function POST(request: Request) {
  const formData = await request.formData();
  const file = formData.get("file");

  if (!(file instanceof File)) {
    return NextResponse.json(
      { error: "Attach a PDF file using the file field." },
      { status: 400 },
    );
  }

  const isPdf =
    file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");

  if (!isPdf) {
    return NextResponse.json(
      { error: "Only PDF analytics reports can be imported." },
      { status: 400 },
    );
  }

  if (file.size > MAX_UPLOAD_BYTES) {
    return NextResponse.json(
      { error: `PDF reports must be ${MAX_UPLOAD_MB} MB or smaller.` },
      { status: 413 },
    );
  }

  const tempDir = await mkdtemp(path.join(os.tmpdir(), "social-calendar-pdf-"));
  const pdfPath = path.join(tempDir, sanitizeFileName(file.name, "analytics-report.pdf"));

  try {
    const pdfBuffer = Buffer.from(await file.arrayBuffer());
    await writeFile(pdfPath, pdfBuffer);

    const extracted = await runPdfExtractor(pdfPath);
    const fullText = extracted.text?.trim() ?? "";

    if (!fullText) {
      return NextResponse.json(
        {
          error:
            "The PDF opened, but no selectable text or tables were found. It may be a scanned/image-only report. Export a text-based analytics PDF or run OCR first.",
        },
        { status: 422 },
      );
    }

    const platformMetrics = parsePdfReportMetrics(fullText);
    const returnedText = fullText.slice(0, MAX_RETURNED_TEXT_CHARACTERS);
    const wasTrimmed = fullText.length > returnedText.length;

    return NextResponse.json({
      fileName: file.name,
      fileSize: file.size,
      extractedText: returnedText,
      textWasTrimmed: wasTrimmed,
      pages: extracted.pages ?? 0,
      method: extracted.method ?? "unknown",
      characters: extracted.characters ?? fullText.length,
      platformMetrics,
      platformMetricCount: platformMetrics.length,
      summary: buildExtractionSummary({
        pages: extracted.pages ?? 0,
        method: extracted.method ?? "unknown",
        characterCount: fullText.length,
        platformMetricCount: platformMetrics.length,
        wasTrimmed,
      }),
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "PDF extraction failed. Try exporting a text-based analytics PDF.";

    return NextResponse.json({ error: message }, { status: 422 });
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
}

async function runPdfExtractor(pdfPath: string) {
  const scriptPath = path.join(process.cwd(), "scripts", "extract_pdf_text.py");
  const pythonCandidates = [
    process.env.PDF_EXTRACTOR_PYTHON,
    "python3",
    "python",
  ].filter(Boolean) as string[];
  const errors: string[] = [];

  for (const pythonPath of pythonCandidates) {
    const result = await runExtractorCandidate(pythonPath, scriptPath, pdfPath);

    if (result.ok) {
      return result.data;
    }

    errors.push(result.error);
  }

  throw new Error(
    `Could not read the PDF with the available local PDF extractors. ${errors.join(" ")}`,
  );
}

function runExtractorCandidate(
  pythonPath: string,
  scriptPath: string,
  pdfPath: string,
): Promise<{ ok: true; data: ExtractorResult } | { ok: false; error: string }> {
  return new Promise((resolve) => {
    const child = spawn(pythonPath, [scriptPath, pdfPath], {
      stdio: ["ignore", "pipe", "pipe"],
    });
    const stdoutChunks: Buffer[] = [];
    const stderrChunks: Buffer[] = [];
    let stdoutSize = 0;
    let settled = false;

    child.stdout.on("data", (chunk: Buffer) => {
      stdoutSize += chunk.length;

      if (stdoutSize > MAX_EXTRACTOR_OUTPUT_BYTES) {
        settled = true;
        child.kill();
        resolve({
          ok: false,
          error: "The extracted report text was too large to import.",
        });
        return;
      }

      stdoutChunks.push(chunk);
    });

    child.stderr.on("data", (chunk: Buffer) => {
      stderrChunks.push(chunk);
    });

    child.on("error", (error) => {
      if (settled) {
        return;
      }

      settled = true;
      resolve({ ok: false, error: error.message });
    });

    child.on("close", (code) => {
      if (settled) {
        return;
      }

      settled = true;
      const stdout = Buffer.concat(stdoutChunks).toString("utf8");
      const stderr = Buffer.concat(stderrChunks).toString("utf8").trim();

      if (code !== 0) {
        resolve({
          ok: false,
          error: stderr || `PDF extractor exited with code ${code}.`,
        });
        return;
      }

      try {
        const parsed = JSON.parse(stdout) as ExtractorResult;

        if (parsed.error) {
          resolve({
            ok: false,
            error: `${parsed.error} ${parsed.detail ?? ""}`.trim(),
          });
          return;
        }

        resolve({ ok: true, data: parsed });
      } catch {
        resolve({
          ok: false,
          error: "PDF extractor returned unreadable output.",
        });
      }
    });
  });
}

function buildExtractionSummary({
  pages,
  method,
  characterCount,
  platformMetricCount,
  wasTrimmed,
}: {
  pages: number;
  method: string;
  characterCount: number;
  platformMetricCount: number;
  wasTrimmed: boolean;
}) {
  const metricSummary =
    platformMetricCount > 0
      ? `Detected ${platformMetricCount} platform metric set${
          platformMetricCount === 1 ? "" : "s"
        }.`
      : "No platform metrics were detected yet.";
  const trimSummary = wasTrimmed
    ? " The editable text preview was shortened for local storage."
    : "";

  return `Read ${pages} page${pages === 1 ? "" : "s"} with ${method}; extracted ${characterCount.toLocaleString()} characters. ${metricSummary}${trimSummary}`;
}

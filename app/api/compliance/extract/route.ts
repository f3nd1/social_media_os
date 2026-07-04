import { spawn } from "node:child_process";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// Extracts text from compliance guideline documents (Module B3).
// Plain text and Markdown are read directly. PDF reuses the existing Python
// extractor; .docx uses a stdlib-only Python script. Like the PDF importer,
// the Python paths work in this dev environment but need Python 3 available
// at deploy time.

const MAX_BYTES = 15 * 1024 * 1024;
const MAX_STORED_CHARACTERS = 20_000;

type ExtractorResult = {
  text?: string;
  characters?: number;
  method?: string;
  error?: string;
  detail?: string;
};

export async function POST(request: Request) {
  const formData = await request.formData();
  const file = formData.get("file");

  if (!(file instanceof File)) {
    return NextResponse.json(
      { ok: false, error: "Attach a document using the file field." },
      { status: 400 },
    );
  }

  if (file.size > MAX_BYTES) {
    return NextResponse.json(
      { ok: false, error: "Guideline documents must be 15 MB or smaller." },
      { status: 413 },
    );
  }

  const lowerName = file.name.toLowerCase();
  const isText = /\.(txt|md|text)$/.test(lowerName) || file.type.startsWith("text/");
  const isPdf = lowerName.endsWith(".pdf") || file.type === "application/pdf";
  const isDocx = lowerName.endsWith(".docx");

  if (!isText && !isPdf && !isDocx) {
    return NextResponse.json(
      {
        ok: false,
        error:
          "Only PDF, Word (.docx), and plain text guideline documents are supported. Older .doc files should be saved as .docx first.",
      },
      { status: 400 },
    );
  }

  try {
    let fullText = "";
    let source: "pdf" | "docx" | "text" = "text";

    if (isText) {
      fullText = (await file.text()).trim();
    } else {
      const script = isPdf ? "extract_pdf_text.py" : "extract_docx_text.py";
      source = isPdf ? "pdf" : "docx";
      const tempDir = await mkdtemp(path.join(os.tmpdir(), "compliance-doc-"));
      const filePath = path.join(tempDir, sanitizeFileName(file.name));

      try {
        await writeFile(filePath, Buffer.from(await file.arrayBuffer()));
        const extracted = await runExtractor(
          path.join(process.cwd(), "scripts", script),
          filePath,
        );
        fullText = extracted.text?.trim() ?? "";
      } finally {
        await rm(tempDir, { recursive: true, force: true });
      }
    }

    if (!fullText) {
      return NextResponse.json({
        ok: false,
        error:
          "The document opened but no readable text was found. Scanned or image-only files need OCR first.",
      });
    }

    const storedText = fullText.slice(0, MAX_STORED_CHARACTERS);

    return NextResponse.json({
      ok: true,
      name: file.name,
      source,
      characters: fullText.length,
      truncated: fullText.length > storedText.length,
      text: storedText,
    });
  } catch (error) {
    return NextResponse.json({
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

function runExtractor(scriptPath: string, filePath: string): Promise<ExtractorResult> {
  const pythonCandidates = [process.env.PDF_EXTRACTOR_PYTHON, "python3", "python"].filter(
    Boolean,
  ) as string[];

  return new Promise((resolve, reject) => {
    const tryCandidate = (index: number) => {
      if (index >= pythonCandidates.length) {
        reject(
          new Error(
            "No Python 3 runtime was found to read this document. Plain text files still work.",
          ),
        );
        return;
      }

      const child = spawn(pythonCandidates[index], [scriptPath, filePath], {
        stdio: ["ignore", "pipe", "pipe"],
      });
      const stdout: Buffer[] = [];
      const stderr: Buffer[] = [];

      child.stdout.on("data", (chunk: Buffer) => stdout.push(chunk));
      child.stderr.on("data", (chunk: Buffer) => stderr.push(chunk));
      child.on("error", () => tryCandidate(index + 1));
      child.on("close", (code) => {
        if (code !== 0) {
          const detail = Buffer.concat(stderr).toString("utf8").trim();
          reject(new Error(detail || `Document extractor exited with code ${code}.`));
          return;
        }

        try {
          const parsed = JSON.parse(Buffer.concat(stdout).toString("utf8")) as ExtractorResult;

          if (parsed.error) {
            reject(new Error(`${parsed.error} ${parsed.detail ?? ""}`.trim()));
            return;
          }

          resolve(parsed);
        } catch {
          reject(new Error("Document extractor returned unreadable output."));
        }
      });
    };

    tryCandidate(0);
  });
}

function sanitizeFileName(fileName: string) {
  const safeName = fileName.replace(/[^a-z0-9._-]/gi, "-").slice(0, 100);
  return safeName || "guideline-document";
}

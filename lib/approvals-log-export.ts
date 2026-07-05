// One-click export of the append-only approvals log as a dated CSV and a
// dated PDF, for management and audit evidence. No external dependency: the
// PDF is a minimal, valid, text-only document assembled by hand, and the CSV
// reuses the same plain-text escaping style as the workbook exporter.
//
// The log itself is never changed here; this only reads it. Browser-only APIs
// (Blob, document, URL) are touched inside the download helpers, which run
// from user click handlers, never at module load.

import type { ApprovalLogEntry } from "@/lib/social-calendar-data";

const CSV_COLUMNS = ["When", "Module", "What", "Decision", "By"] as const;

function decisionLabel(decision: ApprovalLogEntry["decision"]): string {
  return decision === "approved" ? "Approved" : "Rejected";
}

function whenLabel(decidedAt: string): string {
  // Stored as an ISO string; show a compact "YYYY-MM-DD HH:MM".
  return decidedAt.slice(0, 16).replace("T", " ");
}

// ----- CSV -----------------------------------------------------------------

function escapeCsvValue(value: string): string {
  if (/[",\n]/.test(value)) {
    return `"${value.replaceAll('"', '""')}"`;
  }

  return value;
}

export function buildApprovalsLogCsv(entries: ApprovalLogEntry[]): string {
  const header = CSV_COLUMNS.join(",");
  const rows = entries.map((entry) =>
    [
      whenLabel(entry.decidedAt),
      entry.module,
      entry.subject,
      decisionLabel(entry.decision),
      entry.decidedBy,
    ]
      .map((cell) => escapeCsvValue(cell ?? ""))
      .join(","),
  );

  return [header, ...rows].join("\n");
}

// ----- PDF -----------------------------------------------------------------

type PdfLine = { text: string; size: number; gap: number };

// PDF text strings are Latin-1; fold the punctuation we actually produce down
// to ASCII so byte offsets stay correct and readers do not choke.
function toAscii(value: string): string {
  return value
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[–—]/g, "-")
    .replace(/…/g, "...")
    .replace(/[^\x20-\x7E]/g, "?");
}

function escapePdfText(value: string): string {
  return value
    .replaceAll("\\", "\\\\")
    .replaceAll("(", "\\(")
    .replaceAll(")", "\\)");
}

// Break a long string onto multiple lines at word boundaries so table subjects
// do not run off the page. maxChars is a conservative fit for Helvetica 9pt in
// the usable page width.
function wrapText(text: string, maxChars: number): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = "";

  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;

    if (candidate.length > maxChars && current) {
      lines.push(current);
      current = word.length > maxChars ? word.slice(0, maxChars) : word;
    } else {
      current = candidate.length > maxChars ? candidate.slice(0, maxChars) : candidate;
    }
  }

  if (current) {
    lines.push(current);
  }

  return lines.length > 0 ? lines : [""];
}

function buildLines(
  entries: ApprovalLogEntry[],
  generatedAtLabel: string,
): PdfLine[] {
  const lines: PdfLine[] = [];

  lines.push({ text: "UCC Marketing OS Approvals Log", size: 16, gap: 0 });
  lines.push({ text: `Exported ${generatedAtLabel}`, size: 10, gap: 20 });
  lines.push({
    text: `${entries.length} decision${entries.length === 1 ? "" : "s"} recorded. This is an automatic audit trail; entries cannot be edited.`,
    size: 10,
    gap: 16,
  });

  if (entries.length === 0) {
    lines.push({
      text: "No approvals or rejections have been recorded yet.",
      size: 10,
      gap: 24,
    });
    return lines;
  }

  entries.forEach((entry, index) => {
    lines.push({
      text: `${whenLabel(entry.decidedAt)}  ${decisionLabel(entry.decision).toUpperCase()}  ${entry.module}  by ${entry.decidedBy}`,
      size: 10,
      gap: index === 0 ? 26 : 16,
    });

    wrapText(entry.subject, 105).forEach((wrapped, wrapIndex) => {
      lines.push({ text: `    ${wrapped}`, size: 9, gap: wrapIndex === 0 ? 12 : 11 });
    });
  });

  return lines;
}

function paginate(allLines: PdfLine[]): PdfLine[][] {
  const startY = 752;
  const bottom = 50;
  const pages: PdfLine[][] = [];
  let current: PdfLine[] = [];
  let y = startY;

  for (const line of allLines) {
    const gap = current.length === 0 ? 0 : line.gap;

    if (current.length > 0 && y - gap < bottom) {
      pages.push(current);
      current = [];
      y = startY;
    }

    const effectiveGap = current.length === 0 ? 0 : line.gap;
    y -= effectiveGap;
    current.push({ ...line, gap: effectiveGap });
  }

  if (current.length > 0) {
    pages.push(current);
  }

  return pages;
}

function pageStream(lines: PdfLine[], startY: number): string {
  let out = "BT\n";
  let first = true;

  for (const line of lines) {
    out += `/F1 ${line.size} Tf\n`;

    if (first) {
      out += `50 ${startY} Td\n`;
      first = false;
    } else {
      out += `0 -${line.gap} Td\n`;
    }

    out += `(${escapePdfText(toAscii(line.text))}) Tj\n`;
  }

  out += "ET";
  return out;
}

// Assemble a minimal multi-page PDF. Everything written is ASCII, so string
// length equals byte length and the xref offsets stay valid.
export function buildApprovalsLogPdf(
  entries: ApprovalLogEntry[],
  generatedAtLabel: string,
): string {
  const pages = paginate(buildLines(entries, generatedAtLabel));
  const pageCount = pages.length;

  const catalogNum = 1;
  const pagesNum = 2;
  const fontNum = 3;
  const pageNums = pages.map((_, i) => 4 + i);
  const contentNums = pages.map((_, i) => 4 + pageCount + i);
  const totalObjs = 3 + pageCount * 2;

  const parts: string[] = [];
  const offsets: Record<number, number> = {};
  let length = 0;

  function push(text: string): void {
    parts.push(text);
    length += text.length;
  }

  function addObject(num: number, body: string): void {
    offsets[num] = length;
    push(`${num} 0 obj\n${body}\nendobj\n`);
  }

  push("%PDF-1.4\n");

  addObject(catalogNum, `<< /Type /Catalog /Pages ${pagesNum} 0 R >>`);
  addObject(
    pagesNum,
    `<< /Type /Pages /Kids [${pageNums.map((n) => `${n} 0 R`).join(" ")}] /Count ${pageCount} >>`,
  );
  addObject(
    fontNum,
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>",
  );

  pages.forEach((_, i) => {
    addObject(
      pageNums[i],
      `<< /Type /Page /Parent ${pagesNum} 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 ${fontNum} 0 R >> >> /Contents ${contentNums[i]} 0 R >>`,
    );
  });

  pages.forEach((lines, i) => {
    const stream = pageStream(lines, 752);
    addObject(
      contentNums[i],
      `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`,
    );
  });

  const xrefOffset = length;
  let xref = `xref\n0 ${totalObjs + 1}\n0000000000 65535 f \n`;
  for (let n = 1; n <= totalObjs; n += 1) {
    xref += `${String(offsets[n]).padStart(10, "0")} 00000 n \n`;
  }
  push(xref);
  push(
    `trailer\n<< /Size ${totalObjs + 1} /Root ${catalogNum} 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`,
  );

  return parts.join("");
}

// ----- Downloads -----------------------------------------------------------

function isoDateStamp(now: Date): string {
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function readableStamp(now: Date): string {
  const date = isoDateStamp(now);
  const hours = String(now.getHours()).padStart(2, "0");
  const minutes = String(now.getMinutes()).padStart(2, "0");
  return `${date} ${hours}:${minutes}`;
}

function downloadBlob(fileName: string, content: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export function downloadApprovalsLogCsv(entries: ApprovalLogEntry[]): void {
  const now = new Date();
  downloadBlob(
    `approvals-log-${isoDateStamp(now)}.csv`,
    buildApprovalsLogCsv(entries),
    "text/csv;charset=utf-8;",
  );
}

export function downloadApprovalsLogPdf(entries: ApprovalLogEntry[]): void {
  const now = new Date();
  downloadBlob(
    `approvals-log-${isoDateStamp(now)}.pdf`,
    buildApprovalsLogPdf(entries, readableStamp(now)),
    "application/pdf",
  );
}

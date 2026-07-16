// Pure-JS PDF text extraction, replacing the old Python (pdfplumber/pypdf)
// subprocess. Those libraries were never installed on the droplet, so every
// PDF upload failed. pdfjs-dist ships with the app and is provisioned by the
// normal `npm install` on deploy, so this works wherever Node runs.
//
// Text extraction only: we never render, so pdfjs's optional `canvas`
// dependency is not installed and never invoked. `isEvalSupported: false`
// keeps the parser off the eval path as defence in depth.

export type PdfTextResult = {
  text: string;
  pages: number;
};

export async function extractPdfText(data: Buffer | Uint8Array): Promise<PdfTextResult> {
  // Dynamic import keeps the (large) pdfjs bundle out of the module graph until
  // a PDF is actually uploaded, and pins us to the Node-friendly legacy build.
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");

  // Always build a plain Uint8Array: pdfjs rejects Node's Buffer even though
  // it subclasses Uint8Array, so a bare `instanceof` check is not enough.
  const bytes = new Uint8Array(data);
  const doc = await pdfjs.getDocument({
    data: bytes,
    isEvalSupported: false,
    useSystemFonts: true,
  }).promise;

  const pageTexts: string[] = [];

  for (let pageNumber = 1; pageNumber <= doc.numPages; pageNumber += 1) {
    const page = await doc.getPage(pageNumber);
    const content = await page.getTextContent();
    const pageText = content.items
      .map((item) => ("str" in item ? item.str : ""))
      .join(" ")
      .replace(/\s+/g, " ")
      .trim();

    if (pageText) {
      pageTexts.push(`--- Page ${pageNumber} ---\n${pageText}`);
    }
  }

  return { text: pageTexts.join("\n\n"), pages: doc.numPages };
}

// What a full-quota save is allowed to discard, kept in its own file so the
// rule can be checked in isolation. This runs at exactly the worst moment,
// when storage is already full, and getting it wrong means silently destroying
// somebody's decisions to make room for text that could simply be re-uploaded.

import type { MarketingWorkspaceData } from "@/lib/social-calendar-data";

// Extracted document text is the one thing here that grows without limit and is
// re-derivable: a PDF report keeps up to 120,000 characters and nothing caps how
// many uploads accumulate, so roughly forty reports alone can fill a 5 MB
// origin. Everything else in the workspace is a decision somebody made, so under
// pressure this is what gets shed and nothing else.
const KEEP_FULL_TEXT_FOR_RECENT = 3;

// Drops raw extracted text from older uploaded documents, keeping the records
// themselves so nothing vanishes from the manager's view, and the text returns
// by re-uploading the file. Deliberately never touches the approvals log, the
// calendar, or any accepted insight: those are decisions rather than
// re-derivable source material, and silently discarding them to save space
// would be a far worse failure than refusing to save.
export function shedRederivableText(data: MarketingWorkspaceData): {
  next: MarketingWorkspaceData;
  freedFrom: string;
} {
  const shedFrom: string[] = [];
  const uploads = data.pdfDataSource?.uploads ?? [];
  const trimmedUploads = uploads.map((upload, index) =>
    index < KEEP_FULL_TEXT_FOR_RECENT || !upload.extractedText
      ? upload
      : { ...upload, extractedText: "" },
  );

  if (trimmedUploads.some((u, i) => u.extractedText !== uploads[i]?.extractedText)) {
    shedFrom.push("older report uploads");
  }

  // ComplianceDoc calls the same thing "text", not "extractedText".
  const docs = data.complianceDocs ?? [];
  const trimmedDocs = docs.map((doc, index) =>
    index < KEEP_FULL_TEXT_FOR_RECENT || !doc.text ? doc : { ...doc, text: "" },
  );

  if (trimmedDocs.some((d, i) => d.text !== docs[i]?.text)) {
    shedFrom.push("older compliance documents");
  }

  return {
    next: {
      ...data,
      pdfDataSource: { ...data.pdfDataSource, uploads: trimmedUploads },
      complianceDocs: trimmedDocs,
    },
    freedFrom: shedFrom.join(" and "),
  };
}

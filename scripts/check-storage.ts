// Self-check for what a full-quota save is allowed to discard. Run with
//
//   npm run check:storage
//
// This is the highest-stakes mapping in the app: it runs exactly when storage
// is full, and getting it wrong means silently destroying a manager's
// decisions to make room for re-derivable text. The rule it encodes is that
// only raw extracted document text may be shed, never anything anyone decided.

import assert from "node:assert/strict";

import { shedRederivableText } from "../lib/workspace-storage-limits.ts";

const upload = (id: string, text: string) => ({
  id, fileName: `${id}.pdf`, fileSize: 1, uploadedAt: "2026-07-01", source: "metricool",
  startDate: "", endDate: "", notes: "", extractedText: text,
});
const doc = (id: string, text: string) => ({
  id, name: `${id}.pdf`, uploadedAt: "2026-07-01", source: "pdf" as const,
  characters: text.length, text,
});

const before = {
  pdfDataSource: { uploads: [upload("a","AAA"), upload("b","BBB"), upload("c","CCC"), upload("d","DDD"), upload("e","EEE")] },
  complianceDocs: [doc("p","PPP"), doc("q","QQQ"), doc("r","RRR"), doc("s","SSS")],
  // Everything below is a decision and must come through untouched.
  approvalsLog: [{ id: "log-1", decision: "approved" }],
  calendar: [{ id: "cal-1", approvalStage: "manager approved" }],
  listeningResults: [{ id: "l-1", status: "accepted", insight: "kept" }],
  trendInsights: [{ id: "t-1", status: "accepted" }],
  brief: { approved: true },
} as never;

const { next, freedFrom } = shedRederivableText(before) as never as {
  next: Record<string, never>; freedFrom: string;
};

// The three most recent of each keep their text; older ones lose only the text.
const uploads = (next.pdfDataSource as never as { uploads: Array<{ id: string; extractedText: string }> }).uploads;
assert.deepEqual(
  uploads.map((u) => u.extractedText),
  ["AAA", "BBB", "CCC", "", ""],
  "only uploads past the three most recent lose their text",
);
assert.equal(uploads.length, 5, "no upload record is ever removed, only its text");

const docs = next.complianceDocs as never as Array<{ id: string; text: string }>;
assert.deepEqual(docs.map((d) => d.text), ["PPP", "QQQ", "RRR", ""]);
assert.equal(docs.length, 4, "no compliance record is removed either");

assert.equal(freedFrom, "older report uploads and older compliance documents");

// The part that actually matters: decisions survive untouched.
assert.deepEqual(next.approvalsLog, before["approvalsLog" as never], "the approvals log must never be shed");
assert.deepEqual(next.calendar, before["calendar" as never], "the calendar must never be shed");
assert.deepEqual(next.listeningResults, before["listeningResults" as never], "accepted findings must never be shed");
assert.deepEqual(next.trendInsights, before["trendInsights" as never], "accepted trends must never be shed");
assert.deepEqual(next.brief, before["brief" as never], "the approved brief must never be shed");

// Nothing to shed reports nothing, so the caller does not claim it freed space.
const clean = shedRederivableText({ pdfDataSource: { uploads: [] }, complianceDocs: [] } as never);
assert.equal(clean.freedFrom, "", "with nothing to shed, report nothing");

// A workspace missing these fields entirely must not throw.
assert.equal(shedRederivableText({} as never).freedFrom, "");

console.log("check-storage: all assertions passed");

// Self-check for approvals-log derivation, focused on the Social Listening
// block. Run with
//
//   npm run check:approvals
//
// Social Listening was the one collection with no diffing block, so accepting
// a finding as strategy input left no trace anywhere (issue 3 in
// docs/module-connection-map.html). These assertions pin the behaviour so it
// cannot silently regress back to invisible.

import assert from "node:assert/strict";

import { deriveApprovalLogEntries } from "../lib/approvals-log.ts";

const AT = "2026-07-30T09:00:00.000Z";

// A minimal workspace: only the fields the derivation reads.
const base = {
  approverName: "Felix",
  brief: { approved: false },
  auditInsights: [], competitorInsights: [], trendInsights: [],
  campaignSuggestions: [], calendar: [], aiRecommendations: [],
  ucc: { campaigns: [], budgetPlans: [] },
  weeklyReport: null,
  listeningResults: [
    { id: "l1", topic: "IELTS preparation in Singapore", status: "new" },
    { id: "l2", topic: "PRC parents choosing a college", status: "new" },
  ],
} as never;

const withAccepted = {
  ...(base as never as Record<string, unknown>),
  listeningResults: [
    { id: "l1", topic: "IELTS preparation in Singapore", status: "accepted" },
    { id: "l2", topic: "PRC parents choosing a college", status: "new" },
  ],
} as never;

const accepted = deriveApprovalLogEntries(base, withAccepted, AT);
const listening = accepted.filter((e) => e.module === "Social Listening");

assert.equal(listening.length, 1, "accepting one finding logs exactly one entry");
assert.equal(listening[0].decision, "approved");
assert.ok(
  listening[0].subject.startsWith("IELTS preparation in Singapore"),
  "the subject names what was accepted",
);
// The question the log has to answer later is where an accepted finding goes.
assert.ok(
  /Strategy Brief, Campaigns and Platform Intelligence/.test(listening[0].subject),
  "an approved entry names the three consumers it becomes available to",
);
assert.equal(listening[0].decidedBy, "Felix", "who decided is recorded");
assert.equal(listening[0].decidedAt, AT, "when is recorded");

// Dismissal is logged too, but must not claim it reached anything.
const withDismissed = {
  ...(base as never as Record<string, unknown>),
  listeningResults: [
    { id: "l1", topic: "IELTS preparation in Singapore", status: "dismissed" },
    { id: "l2", topic: "PRC parents choosing a college", status: "new" },
  ],
} as never;

const dismissed = deriveApprovalLogEntries(base, withDismissed, AT)
  .filter((e) => e.module === "Social Listening");
assert.equal(dismissed.length, 1);
assert.equal(dismissed[0].decision, "rejected");
assert.ok(
  !/available to/.test(dismissed[0].subject),
  "a rejected finding must not claim it reached any consumer",
);

// No status change means no entry, or every unrelated save would spam the log.
assert.deepEqual(
  deriveApprovalLogEntries(base, base, AT).filter((e) => e.module === "Social Listening"),
  [],
  "an unchanged workspace logs nothing",
);

// A brand new finding arriving already dismissed is not a decision anyone made.
const withNewDismissed = {
  ...(base as never as Record<string, unknown>),
  listeningResults: [
    ...(base as never as { listeningResults: unknown[] }).listeningResults,
    { id: "l3", topic: "arrived dismissed", status: "dismissed" },
  ],
} as never;
assert.deepEqual(
  deriveApprovalLogEntries(base, withNewDismissed, AT).filter((e) => e.module === "Social Listening"),
  [],
  "a fresh row that arrives dismissed is not a logged rejection",
);

// Rows saved before status existed must not throw or log spuriously.
const legacy = {
  ...(base as never as Record<string, unknown>),
  listeningResults: [{ id: "l9", topic: "no status field" }],
} as never;
assert.doesNotThrow(() => deriveApprovalLogEntries(legacy, legacy, AT));

console.log("check-approvals-log: all assertions passed");

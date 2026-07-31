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

import {
  deriveApprovalLogEntries,
  purgeApprovalsForSource,
} from "../lib/approvals-log.ts";

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

// Account Research has no draft state: a saved lookup arrives already
// accepted, and that IS the manager's decision, so it must be logged as an
// approval rather than skipped as a fresh draft.
const withSavedLookup = {
  ...(base as never as Record<string, unknown>),
  accountFindings: [
    { id: "f1", subject: "TikTok @rival", status: "accepted" },
  ],
} as never;

const savedEntries = deriveApprovalLogEntries(base, withSavedLookup, AT)
  .filter((e) => e.module === "Account Research");
assert.equal(savedEntries.length, 1, "saving a lookup is logged");
assert.equal(savedEntries[0].decision, "approved");
assert.ok(
  /TikTok @rival, available to Strategy Brief, Campaigns and Platform Intelligence/
    .test(savedEntries[0].subject),
  "a saved lookup names what it is and where it goes",
);

// Removing it marks it dismissed rather than deleting it, so the log sees a
// real rejection.
const withRemovedLookup = {
  ...(base as never as Record<string, unknown>),
  accountFindings: [
    { id: "f1", subject: "TikTok @rival", status: "dismissed" },
  ],
} as never;
const removedEntries = deriveApprovalLogEntries(withSavedLookup, withRemovedLookup, AT)
  .filter((e) => e.module === "Account Research");
assert.equal(removedEntries.length, 1);
assert.equal(removedEntries[0].decision, "rejected");
assert.ok(
  !/available to/.test(removedEntries[0].subject),
  "a removed lookup must not claim it still reaches anything",
);

// Workspaces saved before account findings existed have no such field.
assert.doesNotThrow(() => deriveApprovalLogEntries(base, base, AT));

// A decision now carries the id of the row it was about, so a real delete can
// take that row's history with it. Archive must not: only delete purges.
assert.equal(savedEntries[0].sourceId, "f1", "an entry names the row it decided on");
assert.equal(listening[0].sourceId, "l1");

// --- purgeApprovalsForSource

const log = [
  { id: "1", module: "Social Listening", subject: "IELTS preparation", decision: "approved", decidedBy: "F", decidedAt: AT, sourceId: "l1" },
  { id: "2", module: "Social Listening", subject: "PRC parents", decision: "approved", decidedBy: "F", decidedAt: AT, sourceId: "l2" },
  { id: "3", module: "Account Research", subject: "TikTok @rival", decision: "approved", decidedBy: "F", decidedAt: AT, sourceId: "l1" },
  // Written before sourceId existed.
  { id: "4", module: "Social Listening", subject: "legacy topic", decision: "approved", decidedBy: "F", decidedAt: AT },
  { id: "5", module: "Social Listening", subject: "another legacy", decision: "rejected", decidedBy: "F", decidedAt: AT },
] as never as Parameters<typeof purgeApprovalsForSource>[0];

const afterDelete = purgeApprovalsForSource(log, "Social Listening", "l1", []);
assert.deepEqual(
  afterDelete.map((e) => e.id),
  ["2", "3", "4", "5"],
  "only the deleted row's own entries go",
);

// Same id in a different module must survive: ids are unique per collection,
// not across the workspace.
assert.ok(
  purgeApprovalsForSource(log, "Social Listening", "l1", []).some((e) => e.id === "3"),
  "an identical id in another module is untouched",
);

// A legacy entry has no id, so it is matched on its exact subject.
assert.deepEqual(
  purgeApprovalsForSource(log, "Social Listening", "zz", ["legacy topic"]).map((e) => e.id),
  ["1", "2", "3", "5"],
);

// Exact, never a prefix: deleting "legacy" must not take "legacy topic" with
// it, because losing the wrong history is worse than leaving a stale line.
assert.deepEqual(
  purgeApprovalsForSource(log, "Social Listening", "zz", ["legacy"]).map((e) => e.id),
  ["1", "2", "3", "4", "5"],
);

// Nothing matching means nothing lost.
assert.equal(purgeApprovalsForSource(log, "Trend Radar", "l1", []).length, log.length);

// --- Platform Intelligence: no archivable list, but decisions must still log

function playbookEntry(overrides: Record<string, unknown>) {
  return {
    approved: { content: "Post twice a week", role: "", persona: "", defaultFormat: "",
      bestPostingTime: "", cta: "", metrics: "", guardrail: "" },
    approvedBy: "", approvedAt: "", approvedSource: "template",
    draft: null, draftSource: "none", draftModel: "", draftGeneratedAt: "",
    ...overrides,
  };
}

const playbookBase = {
  ...(base as never as Record<string, unknown>),
  platformPlaybook: { tiktok: playbookEntry({}) },
} as never;

// Approving a draft: a fresh, later approvedAt is the signal, regardless of
// whether the draft came from AI or a manual edit.
const playbookApproved = {
  ...(base as never as Record<string, unknown>),
  platformPlaybook: {
    tiktok: playbookEntry({
      approved: { content: "New AI-drafted plan", role: "", persona: "", defaultFormat: "",
        bestPostingTime: "", cta: "", metrics: "", guardrail: "" },
      approvedBy: "Felix", approvedAt: AT, approvedSource: "ai",
    }),
  },
} as never;

const playbookLog = deriveApprovalLogEntries(playbookBase, playbookApproved, AT)
  .filter((e) => e.module === "Platform Intelligence");
assert.equal(playbookLog.length, 1, "approving a platform playbook draft is logged");
assert.equal(playbookLog[0].decision, "approved");
assert.ok(
  playbookLog[0].subject.startsWith("tiktok: New AI-drafted plan"),
  "the subject names the platform and the newly-approved content",
);
assert.ok(
  /available to calendar generation and content production/.test(playbookLog[0].subject),
  "an approved playbook says where it is actually read",
);

// Discarding a draft: the draft disappears with no new approval alongside it.
const playbookWithDraft = {
  ...(base as never as Record<string, unknown>),
  platformPlaybook: {
    tiktok: playbookEntry({
      draft: { content: "A rejected draft", role: "", persona: "", defaultFormat: "",
        bestPostingTime: "", cta: "", metrics: "", guardrail: "" },
      draftSource: "ai",
    }),
  },
} as never;

const playbookDiscarded = deriveApprovalLogEntries(playbookWithDraft, playbookBase, AT)
  .filter((e) => e.module === "Platform Intelligence");
assert.equal(playbookDiscarded.length, 1, "discarding a draft is logged");
assert.equal(playbookDiscarded[0].decision, "rejected");
assert.ok(playbookDiscarded[0].subject.startsWith("tiktok: A rejected draft"));

// Editing draft text without approving or discarding must not log anything:
// that is neither decision, just a work in progress.
const playbookEdited = {
  ...(base as never as Record<string, unknown>),
  platformPlaybook: {
    tiktok: playbookEntry({
      draft: { content: "Edited, not yet decided", role: "", persona: "", defaultFormat: "",
        bestPostingTime: "", cta: "", metrics: "", guardrail: "" },
      draftSource: "manual",
    }),
  },
} as never;
assert.deepEqual(
  deriveApprovalLogEntries(playbookWithDraft, playbookEdited, AT)
    .filter((e) => e.module === "Platform Intelligence"),
  [],
  "editing a draft's text, with no approve or discard, logs nothing",
);

// A workspace saved before platformPlaybook existed must not throw.
assert.doesNotThrow(() => deriveApprovalLogEntries(base, base, AT));

console.log("check-approvals-log: all assertions passed");

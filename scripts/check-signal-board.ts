// Self-check for the Signal Board projection. Run with
//
//   npm run check:signals
//
// The board's whole job is to be accurate about two things: which findings a
// human actually accepted, and where each one genuinely goes next. Both are
// claims a manager would act on, so both are pinned here.

import assert from "node:assert/strict";

import {
  SIGNAL_REACH,
  collectSignals,
  pendingByModule,
  reachSentence,
} from "../lib/signal-board.ts";

// Only the fields the projection reads.
const data = {
  auditInsights: [
    {
      id: "a1", platform: "TikTok", recommendation: "Post twice a week",
      status: "accepted", model: "gpt", generatedAt: "2026-07-01T00:00:00.000Z",
    },
    {
      id: "a2", platform: "LinkedIn", recommendation: "Still a draft",
      status: "draft", model: "gpt", generatedAt: "2026-07-02T00:00:00.000Z",
    },
  ],
  competitorInsights: [
    {
      id: "c1", competitorName: "Rival College", kind: "content gap",
      insight: "No short video at all", status: "accepted", model: "gpt",
      generatedAt: "2026-07-05T00:00:00.000Z",
    },
  ],
  trendInsights: [
    {
      id: "t1", title: "Skills-first hiring", whyItMatters: "Parents ask about it",
      status: "dismissed", model: "gpt", generatedAt: "2026-07-06T00:00:00.000Z",
    },
  ],
  listeningResults: [
    {
      id: "l1", topic: "IELTS preparation", insight: "Cost is the top worry",
      status: "accepted", model: "gpt", generatedAt: "2026-07-10T00:00:00.000Z",
    },
    // No status field at all: an older save, still "new" in practice. It must
    // never promote itself onto the board.
    {
      id: "l2", topic: "legacy row", insight: "no status", model: "gpt",
      generatedAt: "2026-07-11T00:00:00.000Z",
    },
  ],
} as never;

const signals = collectSignals(data);

assert.deepEqual(
  signals.map((row) => row.id),
  ["listening-l1", "competitors-c1", "objectives-a1"],
  "only accepted findings appear, newest first",
);

assert.ok(
  !signals.some((row) => row.module === "Trend Radar"),
  "a dismissed finding never reaches the board",
);

// The reach claim is the reason this screen exists, so it must be per module
// and not a single blanket sentence.
assert.deepEqual(
  signals.find((row) => row.module === "Platform Audit")?.reaches,
  ["Campaigns", "Reports"],
  "an audit insight does not claim to reach the Strategy Brief",
);
assert.ok(
  SIGNAL_REACH["Trend Radar"].includes("Calendar"),
  "trends are the only kind that reach the Calendar generator",
);
assert.ok(
  !SIGNAL_REACH["Social Listening"].includes("Calendar"),
  "a listening finding must not claim it reaches the Calendar",
);

// The approvals log builds its "available to ..." wording from this, so the
// prose form has to stay a readable list.
assert.equal(
  reachSentence("Social Listening"),
  "Strategy Brief, Campaigns and Platform Intelligence",
  "reachSentence renders the list the approvals log already writes",
);

// Pending counts point at the screens that need a decision. A listening row
// with no status is pending, not accepted.
assert.deepEqual(
  pendingByModule(data),
  [
    { module: "Platform Audit", count: 1 },
    { module: "Social Listening", count: 1 },
  ],
  "pending counts cover missing-status listening rows and skip empty modules",
);

// An empty or half-migrated workspace must not throw: normalizeWorkspaceData
// fills these in, but cloud pulls of very old documents have been missing
// collections before.
assert.deepEqual(collectSignals({} as never), []);
assert.deepEqual(pendingByModule({} as never), []);

console.log("check-signal-board: all assertions passed");

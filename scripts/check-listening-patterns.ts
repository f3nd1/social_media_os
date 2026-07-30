// Self-check for recency filtering and sample pattern counting. Run with
//
//   npm run check:patterns
//
// The date arithmetic and the "keep undated posts" rule are both easy to get
// subtly wrong in ways that lose real evidence silently, and the hashtag
// counter has to resist a single caption stuffed with one tag looking like
// consensus. Both are pinned here.

import assert from "node:assert/strict";

import {
  extractHashtags,
  filterPostsByRecency,
  recencyToDateRange,
  recencyToTikTokBucket,
  summariseSample,
} from "../lib/listening-patterns.ts";

const TODAY = new Date("2026-07-30T00:00:00.000Z");
const post = (text: string, date: string, source = "TikTok") => ({
  text,
  source,
  url: `https://example.test/${encodeURIComponent(text.slice(0, 12))}`,
  date,
});

// ---- date ranges ----

assert.deepEqual(
  recencyToDateRange("this-week", TODAY),
  { from: "2026-07-23", to: "2026-07-30" },
  "this week should be the previous seven days",
);
assert.deepEqual(recencyToDateRange("this-month", TODAY).from, "2026-06-30");
assert.deepEqual(recencyToDateRange("last-3-months", TODAY).from, "2026-05-01");

// The buckets sent to TikTok must be its own accepted enum values, not ours.
assert.equal(recencyToTikTokBucket("this-week"), "this-week");
assert.equal(recencyToTikTokBucket("last-3-months"), "last-3-months");

// ---- recency filtering ----

const mixed = [
  post("recent one", "2026-07-29"),
  post("just inside the week", "2026-07-24"),
  post("older than a week", "2026-07-01"),
  post("ancient", "2025-01-01"),
  post("no date at all", ""),
  post("unparseable date", "sometime last spring"),
];

const week = filterPostsByRecency(mixed, "this-week", TODAY);
assert.deepEqual(
  week.kept.map((p) => p.text),
  ["recent one", "just inside the week", "no date at all", "unparseable date"],
  "only posts dated outside the window are dropped",
);
assert.equal(week.dropped, 2, "two posts are genuinely older");

// Undated posts are kept rather than discarded: an absent date means we do not
// know when it was written, and throwing away real evidence on a guess is worse
// than showing something slightly older than asked for.
assert.equal(week.undated, 2, "both the blank and the unparseable date count as undated");

const quarter = filterPostsByRecency(mixed, "last-3-months", TODAY);
assert.equal(quarter.dropped, 1, "only the 2025 post falls outside three months");

assert.deepEqual(
  filterPostsByRecency([], "this-week", TODAY),
  { kept: [], dropped: 0, undated: 0 },
  "an empty set must not throw",
);

// ---- hashtags ----

const tagged = [
  post("Loving #IELTS prep and #StudyInSG", "2026-07-29"),
  post("More #ielts talk", "2026-07-28"),
  post("#StudyInSG is everywhere", "2026-07-27"),
  post("#OnlyOnce mentioned", "2026-07-26"),
  post("#spam #spam #spam #spam", "2026-07-25"),
];

const tags = extractHashtags(tagged);

// Case-insensitive grouping, most common spelling wins.
const ielts = tags.find((t) => t.tag.toLowerCase() === "ielts");
assert.equal(ielts?.count, 2, "#IELTS and #ielts are the same tag");

// A tag mentioned once is not a pattern.
assert.ok(!tags.some((t) => t.tag === "OnlyOnce"), "a single mention is excluded");

// One caption repeating a tag must not look like consensus.
assert.ok(
  !tags.some((t) => t.tag === "spam"),
  "a tag repeated within one post counts once, so it does not reach the threshold",
);

assert.deepEqual(extractHashtags([]), [], "no posts means no tags");
assert.deepEqual(
  extractHashtags([post("a bare # and a colour #fff", "2026-07-29")]),
  [],
  "a bare hash is not a tag",
);

// ---- sample summary ----

const summary = summariseSample(
  [
    post("#IELTS one", "2026-07-29", "TikTok"),
    post("#IELTS two", "2026-07-28", "TikTok"),
    post("something", "2026-07-27", "r/singapore"),
  ],
  1,
);

assert.equal(summary.postCount, 3);
assert.deepEqual(summary.sourceMix, [
  { source: "TikTok", count: 2 },
  { source: "r/singapore", count: 1 },
]);
assert.equal(summary.hashtags[0]?.count, 2);
assert.equal(summary.undated, 1, "the undated count passes through for the UI to disclose");

console.log("check-listening-patterns: all assertions passed");

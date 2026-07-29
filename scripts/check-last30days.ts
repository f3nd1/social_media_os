// Self-check for the last30days normaliser. No test framework: run it with
//
//   node --experimental-strip-types scripts/check-last30days.ts
//
// It fails loudly if the mapping from the tool's --emit=json export to
// ListeningPost drifts. Worth keeping because this parser reads output from an
// external project we do not control, so a schema change upstream should break
// something noisy here rather than quietly produce empty evidence.

import assert from "node:assert/strict";

import {
  LAST30DAYS_PER_SOURCE_CAP,
  normaliseLast30DaysExport,
} from "../lib/last30days.ts";

// A representative export: mixed sources, a Reddit url that should become a
// subreddit label, a result missing a url, and one missing all text.
const sample = {
  schema_version: "1.2",
  query: "studying in Singapore private college",
  window_days: 30,
  source_status: { reddit: "ok", youtube: "ok", tiktok: "error", github: "skipped" },
  results: [
    {
      title: "Anyone done a diploma at a private college here?",
      source: "reddit",
      url: "https://www.reddit.com/r/singapore/comments/abc123/",
      published_at: "2026-07-02T04:11:00Z",
      summary: "Asking because I want to switch careers and cannot stop working.",
      relevance_score: 0.91,
    },
    {
      title: "Private college review",
      source: "youtube",
      url: "https://www.youtube.com/watch?v=xyz",
      published_at: "2026-06-28T00:00:00Z",
      summary: "The teachers were supportive and the timetable suited shift work.",
      relevance_score: 0.74,
    },
    {
      // No url: not checkable evidence, must be dropped.
      title: "Unsourced claim",
      source: "grounding",
      summary: "Some assertion with nothing to click through to.",
      relevance_score: 0.99,
    },
    {
      // No text at all: must be dropped.
      source: "reddit",
      url: "https://www.reddit.com/r/askSingapore/comments/def456/",
      relevance_score: 0.98,
    },
    {
      // Falls back to title when summary is absent.
      title: "Diploma vs degree in SG",
      source: "tiktok",
      url: "https://www.tiktok.com/@someone/video/123",
      published_at: "2026-07-10T09:00:00Z",
      relevance_score: 0.5,
    },
  ],
};

const { posts, windowDays, degradedSources } = normaliseLast30DaysExport(sample);

// Two of the five results are unusable and must not appear.
assert.equal(posts.length, 3, "expected the two unusable results to be dropped");

// Reddit is labelled with the real subreddit, reusing sourceFromUrl.
assert.equal(posts[0].source, "r/singapore", "reddit should label as its subreddit");

// Ordered by relevance, highest first.
assert.deepEqual(
  posts.map((post) => post.source),
  ["r/singapore", "YouTube", "TikTok"],
  "posts should be ordered by relevance descending",
);

// published_at is trimmed to a plain date, matching ListeningPost.
assert.equal(posts[0].date, "2026-07-02", "date should be the ISO day only");

// summary wins over title when both exist; title is the fallback.
assert.ok(posts[0].text.startsWith("Asking because"), "summary should win over title");
assert.equal(posts[2].text, "Diploma vs degree in SG", "title should be the fallback text");

// Anything the tool did not report as ok is surfaced, so the UI can say a
// source was quiet instead of implying it was searched successfully.
assert.deepEqual(degradedSources, ["GitHub", "TikTok"], "non-ok sources should be reported");

assert.equal(windowDays, 30, "window_days should pass through");

// The per-source cap must actually bite: 30 chatty Hacker News results should
// not be able to crowd out the rest of the evidence budget.
const flood = {
  results: [
    ...Array.from({ length: 30 }, (_, index) => ({
      title: `HN story ${index}`,
      source: "hackernews",
      url: `https://news.ycombinator.com/item?id=${index}`,
      summary: `Story ${index}`,
      relevance_score: 0.9,
    })),
    {
      title: "The one post that matters",
      source: "reddit",
      url: "https://www.reddit.com/r/singapore/comments/keep/",
      summary: "Real sentiment from a real prospective student.",
      relevance_score: 0.2,
    },
  ],
};

const flooded = normaliseLast30DaysExport(flood);

assert.equal(
  flooded.posts.filter((post) => post.source === "Hacker News").length,
  LAST30DAYS_PER_SOURCE_CAP,
  "a single source must not exceed the per-source cap",
);
assert.ok(
  flooded.posts.some((post) => post.source === "r/singapore"),
  "a low-scoring post from a quiet source must survive a flood from a chatty one",
);

// Empty and malformed input must not throw: the route treats a failed run as
// simply fewer posts, never a failed request.
assert.deepEqual(normaliseLast30DaysExport({}).posts, [], "empty export should give no posts");
assert.deepEqual(
  normaliseLast30DaysExport({ results: undefined }).posts,
  [],
  "missing results should give no posts",
);

console.log("check-last30days: all assertions passed");

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
  extractJsonObject,
  LAST30DAYS_PER_SOURCE_CAP,
  normaliseLast30DaysExport,
} from "../lib/last30days.ts";
import { dedupeByUrl } from "../lib/listening-ai.ts";
import {
  availableListeningSources,
  last30daysSearchArg,
  listeningSourceLabels,
  resolveListeningSources,
  scResearchSourceArg,
} from "../lib/listening-sources.ts";
import { readJsonResponse } from "../lib/utils.ts";

// A representative export: mixed sources, a Reddit url that should become a
// subreddit label, a result missing a url, and one missing all text.
const sample = {
  schema_version: "1.2",
  query: "studying in Singapore private college",
  window_days: 30,
  source_status: {
    reddit: "ok",
    youtube: "ok",
    // Genuinely tried and failed: worth telling the manager about.
    tiktok: "error",
    // Never attempted for want of credentials: must stay silent, or the UI
    // claims a source came back empty when it was never asked.
    github: "skipped",
    bluesky: "unconfigured",
  },
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

// A source that genuinely failed is surfaced, so the UI can say it was quiet
// instead of implying it was searched successfully. A source that was never
// attempted is not: Bluesky is deliberately unconfigured and must not read as a
// failure, and neither must a skipped source the manager has no key for.
assert.deepEqual(
  degradedSources,
  ["TikTok"],
  "only genuinely attempted-and-failed sources should be reported",
);

// An unrecognised status is still treated as a real degradation, because
// hiding a genuine problem is worse than mentioning a harmless one.
assert.deepEqual(
  normaliseLast30DaysExport({ source_status: { reddit: "wedged somehow" } }).degradedSources,
  ["Reddit"],
  "an unknown status should still be reported rather than silently dropped",
);

// Status matching must not be defeated by case or padding.
assert.deepEqual(
  normaliseLast30DaysExport({ source_status: { github: "  SKIPPED  ", x: " OK " } })
    .degradedSources,
  [],
  "status comparison should ignore case and surrounding whitespace",
);

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

// stdout may carry a banner or progress line before the export. The extractor
// must find the JSON anyway, and must never throw on junk.
assert.equal(
  extractJsonObject('Fetching sources...\n{"window_days": 7}')?.window_days,
  7,
  "should find the JSON object after a progress line",
);
assert.equal(
  extractJsonObject('{"window_days": 7}\nDone in 12s')?.window_days,
  7,
  "should find the JSON object before a trailing line",
);
assert.equal(extractJsonObject(""), null, "empty stdout should give null");
assert.equal(extractJsonObject("no json here"), null, "junk stdout should give null");
assert.equal(extractJsonObject("{broken"), null, "unterminated json should give null");
assert.equal(extractJsonObject("{{{"), null, "malformed json should give null");

// The same Reddit post reached by both tools must count once, or the synthesis
// step reads one person's opinion as two independent voices.
const withDuplicates = [
  { text: "richer version from sc-research", source: "r/singapore", url: "https://reddit.com/r/singapore/x/", date: "2026-07-01" },
  { text: "thinner version from last30days", source: "r/singapore", url: "https://REDDIT.com/r/singapore/x", date: "2026-07-01" },
  { text: "a genuinely different post", source: "TikTok", url: "https://tiktok.com/@a/video/1", date: "2026-07-02" },
  { text: "no url, cannot be judged a duplicate", source: "Public web", url: "", date: "" },
  { text: "also no url, must survive too", source: "Public web", url: "", date: "" },
];

const deduped = dedupeByUrl(withDuplicates);

assert.equal(deduped.length, 4, "case and trailing-slash variants should collapse to one");
assert.equal(
  deduped[0].text,
  "richer version from sc-research",
  "the first occurrence should win so the richer source keeps its version",
);
assert.equal(
  deduped.filter((post) => !post.url).length,
  2,
  "posts with no url must never be collapsed into each other",
);

// stdout may carry a banner or progress line before the export. The extractor
// must find the JSON anyway, and must never throw on junk.
assert.equal(
  extractJsonObject('Fetching sources...\n{"window_days": 7}')?.window_days,
  7,
  "should find the JSON object after a progress line",
);
assert.equal(
  extractJsonObject('{"window_days": 7}\nDone in 12s')?.window_days,
  7,
  "should find the JSON object before a trailing line",
);
assert.equal(extractJsonObject(""), null, "empty stdout should give null");
assert.equal(extractJsonObject("no json here"), null, "junk stdout should give null");
assert.equal(extractJsonObject("{broken"), null, "unterminated json should give null");
assert.equal(extractJsonObject("{{{"), null, "malformed json should give null");

// A search that outruns the reverse proxy comes back as an HTML gateway error
// page, not JSON. The manager must get the real status, not "Unexpected token
// '<'". The default wording must stay put for the PDF upload callers, which is
// the easy thing to break when editing this helper.
const gatewayTimeout = () =>
  new Response("<html><head><title>504 Gateway Time-out</title></head></html>", {
    status: 504,
  });

await assert.rejects(
  () =>
    readJsonResponse(gatewayTimeout(), "complete the search", "Try a narrower topic."),
  /could not complete the search \(HTTP 504\)\. Try a narrower topic\./,
  "a gateway error page should surface the real status, not a JSON parse crash",
);

await assert.rejects(
  () => readJsonResponse(gatewayTimeout()),
  /could not process the upload \(HTTP 504\)\. Please try again, or use a smaller text-based PDF\./,
  "the default wording must stay unchanged for the existing upload callers",
);

// Valid JSON must still parse straight through, whatever the wording args.
assert.deepEqual(
  await readJsonResponse<{ ok: boolean }>(
    new Response('{"ok":true}', { status: 200 }),
    "complete the search",
    "Try again.",
  ),
  { ok: true },
  "a healthy JSON response should parse normally",
);

// ---- source selection ----

const allKeys = {
  xaiApiKey: "xai-k",
  youtubeApiKey: "yt-k",
  scrapeCreatorsApiKey: "sc-k",
};

// A chip is only tickable when its key is present.
assert.deepEqual(
  availableListeningSources({}),
  ["reddit", "web"],
  "with no optional keys, only the keyless sources are available",
);
assert.equal(
  availableListeningSources(allKeys).length,
  9,
  "with every key set, all nine sources are available",
);
assert.deepEqual(
  availableListeningSources({ scrapeCreatorsApiKey: "  " }),
  ["reddit", "web"],
  "a whitespace-only key must not count as present",
);

// Undefined means everything: a workspace saved before this feature existed
// must keep searching what it always did, not silently narrow to nothing.
assert.deepEqual(
  resolveListeningSources(undefined, availableListeningSources(allKeys)),
  availableListeningSources(allKeys),
  "an unsaved selection means every available source",
);

// A stored selection is filtered to what is still usable, so a TikTok choice
// kept from when a ScrapeCreators key existed does not resurrect itself.
assert.deepEqual(
  resolveListeningSources(["reddit", "tiktok"], availableListeningSources({})),
  ["reddit"],
  "a stored source whose key has since been removed must drop out",
);
assert.deepEqual(
  resolveListeningSources(["reddit", "nonsense"], availableListeningSources({})),
  ["reddit"],
  "an unrecognised stored id must be ignored rather than passed through",
);
assert.deepEqual(
  resolveListeningSources([], availableListeningSources(allKeys)),
  [],
  "an explicitly empty selection stays empty: the screen blocks it, it does not mean all",
);

// sc-research takes one flag for both its platforms, and must be skipped
// entirely when neither is wanted. Skipping it is where the time is saved.
assert.equal(scResearchSourceArg(["reddit", "x"]), "both");
assert.equal(scResearchSourceArg(["reddit"]), "reddit");
assert.equal(scResearchSourceArg(["x"]), "x", "X alone must be valid, not welded to Reddit");
assert.equal(
  scResearchSourceArg(["tiktok", "web"]),
  null,
  "sc-research must be skipped when neither of its platforms is picked",
);

// last30days gets only the platforms it owns. Reddit, X and YouTube go to the
// dedicated engines instead, so we stop fetching them twice.
assert.equal(last30daysSearchArg(["tiktok", "instagram"]), "tiktok,instagram");
assert.equal(
  last30daysSearchArg(["reddit", "x", "youtube", "web"]),
  null,
  "last30days must be skipped when only dedicated-engine sources are picked",
);
assert.equal(
  last30daysSearchArg(["reddit", "linkedin"]),
  "linkedin",
  "Reddit must not be passed to last30days when sc-research is already fetching it",
);

// Labels are ordered by the catalogue, not by however the ids arrived, so the
// "we searched X, Y, Z" wording is stable between runs.
assert.deepEqual(
  listeningSourceLabels(["linkedin", "reddit", "tiktok"]),
  ["Reddit", "TikTok", "LinkedIn"],
  "labels should follow catalogue order regardless of selection order",
);

console.log("check-last30days: all assertions passed");

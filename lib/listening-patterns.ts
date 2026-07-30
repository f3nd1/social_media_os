// Recency filtering and pattern surfacing for Social Listening. Pure helpers,
// no network, so the date arithmetic and the hashtag counting are testable.
//
// Two honesty constraints shape this file.
//
// First, recency is a set of buckets, not a date picker. Only one endpoint
// across every source we use takes a real start and end date; TikTok takes
// fixed relative buckets, and most sources take nothing at all and have to be
// filtered after the fetch. A calendar control would imply a precision the
// sources cannot deliver, so the UI offers exactly the windows that can be
// honoured and the code maps each one to whatever the source actually accepts.
//
// Second, anything counted here describes the posts THIS SEARCH returned. It is
// a sample, not the platform. Hashtag counts from sixty posts say nothing
// reliable about what is trending on TikTok, and labelling them as though they
// did would be inventing data. Every consumer must present these as
// "from our own search sample".

import type { ListeningPost } from "./listening-ai.ts";

export type ListeningRecency = "this-week" | "this-month" | "last-3-months";

export const LISTENING_RECENCY_OPTIONS: Array<{
  value: ListeningRecency;
  label: string;
  days: number;
  // The enum TikTok's own search accepts, so that leg filters server-side
  // rather than fetching wide and discarding.
  tiktokBucket: string;
}> = [
  { value: "this-week", label: "This week", days: 7, tiktokBucket: "this-week" },
  { value: "this-month", label: "This month", days: 30, tiktokBucket: "this-month" },
  {
    value: "last-3-months",
    label: "Last 3 months",
    days: 90,
    tiktokBucket: "last-3-months",
  },
];

export const DEFAULT_LISTENING_RECENCY: ListeningRecency = "this-month";

export function isListeningRecency(value: unknown): value is ListeningRecency {
  return LISTENING_RECENCY_OPTIONS.some((option) => option.value === value);
}

function optionFor(recency: ListeningRecency) {
  return (
    LISTENING_RECENCY_OPTIONS.find((option) => option.value === recency) ??
    LISTENING_RECENCY_OPTIONS[1]
  );
}

// sc-research takes --from and --to as plain YYYY-MM-DD, which it turns into
// Reddit's own period parameter, so this leg genuinely filters at the source.
export function recencyToDateRange(
  recency: ListeningRecency,
  today: Date,
): { from: string; to: string } {
  const days = optionFor(recency).days;
  const start = new Date(today.getTime() - days * 24 * 60 * 60 * 1000);

  return { from: start.toISOString().slice(0, 10), to: today.toISOString().slice(0, 10) };
}

export function recencyToTikTokBucket(recency: ListeningRecency): string {
  return optionFor(recency).tiktokBucket;
}

// Drops posts older than the window. Posts with no usable date are KEPT on
// purpose: an absent date means we do not know when it was written, and
// discarding real evidence on a guess is worse than showing something slightly
// older than asked for. The UI says how many were undated so the manager can
// judge for themselves.
export function filterPostsByRecency(
  posts: ListeningPost[],
  recency: ListeningRecency,
  today: Date,
): { kept: ListeningPost[]; dropped: number; undated: number } {
  const cutoff = today.getTime() - optionFor(recency).days * 24 * 60 * 60 * 1000;
  let dropped = 0;
  let undated = 0;

  const kept = posts.filter((post) => {
    const raw = (post.date ?? "").trim();

    if (!raw) {
      undated += 1;
      return true;
    }

    const at = new Date(raw).getTime();

    if (Number.isNaN(at)) {
      undated += 1;
      return true;
    }

    if (at < cutoff) {
      dropped += 1;
      return false;
    }

    return true;
  });

  return { kept, dropped, undated };
}

// A hashtag as it appears in post text. Deliberately conservative: it must
// start with # at a word boundary and be at least two characters, so a bare #
// or a colour code in a caption is not counted as a tag.
const HASHTAG = /(?:^|[\s(])#([A-Za-z0-9_]{2,50})/g;

export type PatternTag = { tag: string; count: number };

// Counts hashtags across the posts this search returned. Case-insensitive, so
// #IELTS and #ielts are one tag, and the most common spelling is the one shown.
export function extractHashtags(posts: ListeningPost[], limit = 12): PatternTag[] {
  const counts = new Map<string, number>();
  const spellings = new Map<string, Map<string, number>>();

  for (const post of posts) {
    // A tag repeated inside one post still only counts once for that post,
    // otherwise a single caption stuffed with the same tag looks like consensus.
    const seenHere = new Set<string>();

    for (const match of post.text.matchAll(HASHTAG)) {
      const raw = match[1];
      const key = raw.toLowerCase();

      if (seenHere.has(key)) {
        continue;
      }

      seenHere.add(key);
      counts.set(key, (counts.get(key) ?? 0) + 1);

      const forms = spellings.get(key) ?? new Map<string, number>();
      forms.set(raw, (forms.get(raw) ?? 0) + 1);
      spellings.set(key, forms);
    }
  }

  return [...counts.entries()]
    .map(([key, count]) => {
      const forms = [...(spellings.get(key) ?? new Map()).entries()].sort(
        (a, b) => b[1] - a[1],
      );
      return { tag: forms.length > 0 ? forms[0][0] : key, count };
    })
    .filter((entry) => entry.count > 1)
    .sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag))
    .slice(0, limit);
}

export type SamplePatterns = {
  postCount: number;
  hashtags: PatternTag[];
  sourceMix: Array<{ source: string; count: number }>;
  undated: number;
};

// Factual aggregation over the fetched sample. No model involved, so there is
// nothing here to hallucinate: every number is a count of posts actually
// returned. A tag appearing once is excluded by extractHashtags, because one
// mention is not a pattern.
export function summariseSample(posts: ListeningPost[], undated = 0): SamplePatterns {
  const bySource = new Map<string, number>();

  for (const post of posts) {
    bySource.set(post.source, (bySource.get(post.source) ?? 0) + 1);
  }

  return {
    postCount: posts.length,
    hashtags: extractHashtags(posts),
    sourceMix: [...bySource.entries()]
      .map(([source, count]) => ({ source, count }))
      .sort((a, b) => b.count - a.count || a.source.localeCompare(b.source)),
    undated,
  };
}

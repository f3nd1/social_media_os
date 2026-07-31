// Self-check for the trending-now request builder and normaliser. Run with
//
//   npm run check:trending
//
// The endpoint takes no parameters and no key beyond ScrapeCreators' own, so
// there is little to get wrong on the request side. The normaliser is the
// part worth testing: its exact field names were not observable from a live
// call while this was written, so it tries several plausible keys per field,
// and this check pins down that behaviour.

import assert from "node:assert/strict";

import { buildYouTubeShortsTrendingUrl, normaliseTrendingVideos } from "../lib/trending.ts";

const url = new URL(buildYouTubeShortsTrendingUrl());
assert.equal(url.pathname, "/v1/youtube/shorts/trending");
assert.equal(url.search, "", "the endpoint is query-less: no country, category or key belongs on it");

// A response shaped like a plain "videos" list, using the field names other
// ScrapeCreators YouTube endpoints in this codebase already use.
const videos = normaliseTrendingVideos({
  videos: [
    {
      id: "abc123",
      title: "How I chose my diploma",
      channelTitle: "A Channel",
      viewCount: "184320",
      publishedTimeText: "2026-07-28T04:00:00Z",
    },
    // An abbreviated, text-only view count, as shown on the page itself.
    {
      videoId: "def456",
      title: "1.2M views short",
      channel: { title: "B Channel" },
      viewCountText: "1.2M views",
    },
    // No title: nothing to show.
    { id: "ghi789", channelTitle: "No title" },
  ],
});

assert.deepEqual(
  videos.map((row) => row.title),
  ["How I chose my diploma", "1.2M views short"],
  "a titleless entry is dropped",
);
assert.equal(videos[0].views, 184320, "a numeric-string count becomes a number");
assert.equal(videos[1].views, 1_200_000, "an abbreviated count like 1.2M is parsed");
assert.equal(videos[0].channel, "A Channel");
assert.equal(videos[1].channel, "B Channel", "a nested channel.title is read too");
assert.equal(videos[0].publishedAt, "2026-07-28");
assert.equal(videos[0].url, "https://www.youtube.com/shorts/abc123", "falls back to a shorts url built from the id");

// A handful of other plausible envelope shapes must all be tried before
// giving up, since the real one was not directly observable.
assert.equal(normaliseTrendingVideos({ shorts: [{ title: "x", url: "https://y" }] }).length, 1);
assert.equal(normaliseTrendingVideos({ items: [{ title: "x", url: "https://y" }] }).length, 1);
assert.equal(normaliseTrendingVideos({ data: [{ title: "x", url: "https://y" }] }).length, 1);

// A shape this app cannot read at all must come back empty, not throw: the
// route above treats an empty list here as a real failure to report, never
// as "nothing trending".
assert.deepEqual(normaliseTrendingVideos({}), []);
assert.deepEqual(normaliseTrendingVideos(null), []);

console.log("check-trending: all assertions passed");

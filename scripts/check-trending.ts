// Self-check for the trending-now request builders and normalisers. Run with
//
//   npm run check:trending
//
// Two things here are easy to get silently wrong and expensive to get wrong.
// A dropped countryCode or industry turns a Singapore education trend list
// into a global one that still renders perfectly. And rank movement is sent as
// an unsigned number plus a direction flag, so reading the number alone shows
// a tag falling twenty places as if it were climbing.

import assert from "node:assert/strict";

import {
  buildTikTokHashtagsUrl,
  buildYouTubeTrendingUrl,
  normaliseTrendingTags,
  normaliseTrendingVideos,
  tagToSearchTopic,
} from "../lib/trending.ts";

// --- TikTok request

const url = new URL(buildTikTokHashtagsUrl({ country: "SG", period: 7, industry: "education" }));

assert.equal(url.pathname, "/v1/tiktok/hashtags/popular");
assert.equal(url.searchParams.get("countryCode"), "SG", "the market is never left off");
assert.equal(url.searchParams.get("industry"), "education");
assert.equal(url.searchParams.get("period"), "7");
assert.equal(url.searchParams.get("newOnBoard"), null, "an unticked box sends nothing");

// "Every industry" is the absence of the parameter. Sending industry="" would
// filter on an industry literally named empty and return nothing.
const wide = new URL(buildTikTokHashtagsUrl({ country: "MY", period: 120, industry: "" }));
assert.equal(wide.searchParams.has("industry"), false);
assert.equal(wide.searchParams.get("period"), "120");
assert.equal(wide.searchParams.get("countryCode"), "MY", "the chosen market is the one sent");

const fresh = new URL(
  buildTikTokHashtagsUrl({ country: "SG", period: 30, industry: "education", newOnBoard: true }),
);
assert.equal(fresh.searchParams.get("newOnBoard"), "true");

// --- TikTok response

const tags = normaliseTrendingTags({
  list: [
    {
      hashtag_name: "studyinsingapore",
      rank: 3,
      rank_diff: 12,
      rank_diff_type: 1,
      publish_cnt: 4210,
      video_views: 9100000,
    },
    {
      hashtag_name: "polyintake",
      rank: 8,
      rank_diff: 20,
      rank_diff_type: 2,
      publish_cnt: 900,
      video_views: null,
    },
    { hashtag_name: "steady", rank: 9, rank_diff_type: 0, publish_cnt: 5 },
    // No name: nothing to show and nothing to link to.
    { rank: 10, publish_cnt: 1 },
  ],
});

assert.deepEqual(
  tags.map((row) => row.tag),
  ["studyinsingapore", "polyintake", "steady"],
  "a nameless entry is dropped",
);
assert.equal(tags[0].rankChange, 12, "rank_diff_type 1 is a climb");
assert.equal(tags[1].rankChange, -20, "rank_diff_type 2 is a fall, and must read as negative");
assert.equal(tags[2].rankChange, null, "no rank_diff means unknown, not zero");
assert.equal(tags[1].views, null, "a missing view count is never rendered as 0");
assert.equal(tags[0].url, "https://www.tiktok.com/tag/studyinsingapore");
assert.deepEqual(normaliseTrendingTags({}), [], "an empty reply must not throw");

// --- YouTube request

const yt = new URL(buildYouTubeTrendingUrl({ apiKey: "k", country: "SG", categoryId: "27" }));
assert.equal(yt.searchParams.get("chart"), "mostPopular", "this is the chart, not a search");
assert.equal(yt.searchParams.get("regionCode"), "SG");
assert.equal(yt.searchParams.get("videoCategoryId"), "27");
assert.equal(yt.searchParams.has("q"), false, "a trending call must never carry a query");

const ytAll = new URL(buildYouTubeTrendingUrl({ apiKey: "k", country: "SG", categoryId: "" }));
assert.equal(ytAll.searchParams.has("videoCategoryId"), false, "All categories sends no filter");

// --- YouTube response

const videos = normaliseTrendingVideos({
  items: [
    {
      id: "abc123",
      snippet: {
        title: "How I chose my diploma",
        channelTitle: "A Channel",
        publishedAt: "2026-07-28T04:00:00Z",
      },
      statistics: { viewCount: "184320" },
    },
    // Uploader hid the count.
    { id: "def456", snippet: { title: "No counts", channelTitle: "B" }, statistics: {} },
    { id: "ghi789", snippet: { channelTitle: "No title" }, statistics: {} },
  ],
});

assert.deepEqual(videos.map((row) => row.title), ["How I chose my diploma", "No counts"]);
assert.equal(videos[0].views, 184320, "YouTube's string counts become numbers");
assert.equal(videos[1].views, null, "a hidden count is not zero views");
assert.equal(videos[0].publishedAt, "2026-07-28");
assert.equal(videos[0].url, "https://www.youtube.com/watch?v=abc123");
assert.deepEqual(normaliseTrendingVideos({}), []);

// --- Handing a tag to the listening search

assert.equal(
  tagToSearchTopic("#studyinsingapore", "SG"),
  "studyinsingapore Singapore",
  "the hash is dropped, because Reddit and web search do not match on it",
);
assert.equal(tagToSearchTopic("  ", "SG"), "", "an empty tag never becomes a bare market search");

// A Malaysian trend researched as though it were Singaporean would
// misattribute it, so the market travels with the tag.
assert.equal(tagToSearchTopic("#spm", "MY"), "spm Malaysia");

// --- The country catalogue is the honest part of the feature

import {
  DEFAULT_TRENDING_COUNTRY,
  TRENDING_COUNTRIES,
  trendingCountry,
} from "../lib/trending.ts";

assert.equal(DEFAULT_TRENDING_COUNTRY, "SG", "Singapore stays the default");
assert.ok(
  TRENDING_COUNTRIES.every((entry) => entry.tiktok || entry.youtube),
  "a country neither source covers has no business being offered",
);
// India and Hong Kong are genuinely absent from the endpoint's own countryCode
// enum. Marking them tiktok:true would send a code TikTok ignores, and the
// default market's list would come back looking like theirs.
assert.equal(trendingCountry("IN").tiktok, false);
assert.equal(trendingCountry("HK").tiktok, false);
assert.equal(trendingCountry("IN").youtube, true);
assert.equal(trendingCountry("SG").tiktok, true);
assert.ok(
  !TRENDING_COUNTRIES.some((entry) => entry.code === "CN"),
  "mainland China is not offered: TikTok does not operate there and YouTube is blocked",
);
// An unknown code must resolve to the default rather than being passed on.
assert.equal(trendingCountry("ZZ").code, "SG");

console.log("check-trending: all assertions passed");

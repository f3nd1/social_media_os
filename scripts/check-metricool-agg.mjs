// Self-check for the per-network Metricool aggregator (no test framework in
// this repo; run with `node --experimental-strip-types scripts/check-metricool-agg.mjs`).
// Fixtures are REAL posts captured from the live account, one per network, so
// this locks in each network's own field schema and the two rules that are easy
// to get wrong: the per-post `engagement` field is a RATE and must never be
// summed, and null/absent fields must read as 0, never NaN.
import assert from "node:assert/strict";

import { aggregateNetworkPosts } from "../lib/metricool.ts";

// Instagram: impressionsTotal/reach/interactions/saved/follows.
let r = aggregateNetworkPosts("instagram", [
  { impressionsTotal: 17, reach: 5, interactions: 0, comments: 0, shares: 0, saved: 0, follows: 0, engagement: 0.0 },
]);
assert.equal(r.impressions, 17);
assert.equal(r.reach, 5);
assert.equal(r.engagement, 0);

// Facebook: impressions/impressionsUnique(reach)/reactions/clicks; engagement
// rate 16.67 must NOT leak into the engagement count.
r = aggregateNetworkPosts("facebook", [
  { impressions: 10, impressionsUnique: 6, reactions: 0, comments: 0, shares: 0, clicks: 1, videoTimeWatched: 0, engagement: 16.67 },
]);
assert.equal(r.impressions, 10);
assert.equal(r.reach, 6);
assert.equal(r.clicks, 1);
assert.equal(r.engagement, 0, "must ignore the 16.67 engagement RATE");

// TikTok: viewCount(impressions)/reach/likeCount+commentCount+shareCount/totalTimeWatched.
r = aggregateNetworkPosts("tiktok", [
  { viewCount: 168, reach: 158, likeCount: 6, commentCount: 0, shareCount: 0, totalTimeWatched: 567.0, engagement: 3.8 },
]);
assert.equal(r.impressions, 168);
assert.equal(r.reach, 158);
assert.equal(r.engagement, 6, "6 likes as the count, not the 3.8 rate");
assert.equal(r.watchTime, 567);

// LinkedIn: two posts, second missing several fields entirely (absent, not 0).
// Only impressions/clicks/timeWatched exist; no interaction count, so
// engagement stays 0 honestly. Must not NaN on the absent reads.
r = aggregateNetworkPosts("linkedin", [
  { impressions: 12, engagement: 0.0, videoViews: 1, viewers: 1, timeWatched: 5, type: "VIDEO" },
  { clicks: 1, impressions: 37, engagement: 2.7, type: "MULTIIMAGE" },
]);
assert.equal(r.impressions, 49);
assert.equal(r.clicks, 1);
assert.equal(r.watchTime, 5);
assert.equal(r.engagement, 0, "no interaction-count field on LinkedIn; never the 2.7 rate");
Object.values(r).forEach((v) => assert.ok(Number.isFinite(v), "no NaN from absent fields"));

// Threads: views(impressions)/likes+replies+reposts+quotes+shares.
r = aggregateNetworkPosts("threads", [
  { views: 18, likes: 0, replies: 0, reposts: 0, quotes: 0, shares: 0, engagement: 0.0 },
]);
assert.equal(r.impressions, 18);
assert.equal(r.engagement, 0);

// Twitter: fields are literal null when zero. Must read as 0, not NaN.
r = aggregateNetworkPosts("twitter", [
  { totalImpressions: 1, totalLikes: null, totalRetweets: null, totalReplies: null, totalQuotes: null, totalEngagement: 0.0 },
]);
assert.equal(r.impressions, 1);
assert.equal(r.engagement, 0);
Object.values(r).forEach((v) => assert.ok(Number.isFinite(v), "null fields must not NaN"));

// YouTube: floats (views 152.0, likes 1.0, watchMinutes 6.03). Result integers.
r = aggregateNetworkPosts("youtube", [
  { views: 152.0, watchMinutes: 6.03, likes: 1.0, comments: 0.0, shares: 0.0 },
]);
assert.equal(r.impressions, 152);
assert.equal(r.engagement, 1);
assert.equal(r.watchTime, 6, "6.03 rounded to 6");
Object.values(r).forEach((v) => assert.ok(Number.isInteger(v), "all row metrics are integers"));

// Unknown slug returns an all-zero contribution, never throws.
r = aggregateNetworkPosts("pinterest", [{ anything: 5 }]);
assert.equal(r.impressions, 0);

console.log("check-metricool-agg: all checks passed");

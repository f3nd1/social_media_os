// Self-check for the ScrapeCreators field mapping. Run with
//
//   npm run check:scrapecreators
//
// Worth keeping because every platform names its follower count differently
// and reading the wrong field yields a silent null rather than an error: the
// card would render, look fine, and simply say nothing where the number should
// be. The sample shapes below follow the vendor's own published response
// examples.

import assert from "node:assert/strict";

import {
  accountFindingSummary,
  buildAccountRequestUrl,
  buildCreatorRequestUrl,
  normaliseAccountSnapshot,
  commentsFindingSummary,
  companyFindingSummary,
  normaliseComments,
  normaliseCompanySnapshot,
  normaliseCreatorResults,
} from "../lib/scrapecreators.ts";

const AT = "2026-07-29T12:00:00.000Z";

// ---- follower counts, one shape per platform ----

assert.equal(
  normaliseAccountSnapshot("tiktok", {
    user: { uniqueId: "unitedceres", nickname: "United Ceres", signature: "bio", verified: true },
    stats: { followerCount: 4210, videoCount: 88 },
  }, AT).followers,
  4210,
  "tiktok nests counts under stats",
);

assert.equal(
  normaliseAccountSnapshot("instagram", {
    data: { user: { username: "unitedceres", full_name: "UCC", edge_followed_by: { count: 9100 } } },
  }, AT).followers,
  9100,
  "instagram uses edge_followed_by.count under data.user",
);

assert.equal(
  normaliseAccountSnapshot("threads", { username: "ucc", follower_count: 320 }, AT).followers,
  320,
  "threads uses a flat follower_count",
);

assert.equal(
  normaliseAccountSnapshot("youtube", { handle: "@ucc", subscriberCount: 1500 }, AT).followers,
  1500,
  "youtube uses subscriberCount",
);

assert.equal(
  normaliseAccountSnapshot("facebook", { name: "UCC", followerCount: 2400 }, AT).followers,
  2400,
  "facebook uses followerCount",
);

assert.equal(
  normaliseAccountSnapshot("x", { screen_name: "ucc", followers_count: 700 }, AT).followers,
  700,
  "x uses followers_count",
);

assert.equal(
  normaliseAccountSnapshot("linkedin", { name: "Someone", followers: 512 }, AT).followers,
  512,
  "linkedin person profiles use followers",
);

// A count given as a formatted string must still become a number, since
// several endpoints return "1,500" rather than 1500.
assert.equal(
  normaliseAccountSnapshot("youtube", { subscriberCountText: "1,500" }, AT).followers,
  1500,
  "a comma-separated count string should parse",
);

// A missing count must be null, never 0: reporting zero followers for a field
// we failed to read would be a fabricated number.
assert.equal(
  normaliseAccountSnapshot("tiktok", { user: { uniqueId: "x" } }, AT).followers,
  null,
  "an absent count must be null, not zero",
);

// Malformed input must not throw.
assert.equal(normaliseAccountSnapshot("tiktok", null, AT).followers, null);
assert.equal(normaliseAccountSnapshot("x", "not an object", AT).name, "");

// A cached reply is flagged, because it cost nothing and that is worth showing.
assert.equal(
  normaliseAccountSnapshot("threads", { username: "u", cached: true }, AT).cached,
  true,
);

// ---- request urls ----

assert.equal(
  buildAccountRequestUrl("tiktok", "@unitedceres"),
  "https://api.scrapecreators.com/v1/tiktok/profile?handle=unitedceres&cache_max_age=7d",
  "a leading @ must be stripped and the cache param sent",
);

// LinkedIn supports caching on none of its endpoints, so sending the parameter
// would be a wasted argument against an API that does not accept it.
assert.equal(
  buildAccountRequestUrl("linkedin", "https://www.linkedin.com/in/someone/"),
  "https://api.scrapecreators.com/v1/linkedin/profile?url=https%3A%2F%2Fwww.linkedin.com%2Fin%2Fsomeone%2F",
  "linkedin must not be sent a cache parameter",
);

assert.ok(
  buildAccountRequestUrl("instagram", "ucc", "30d").endsWith("cache_max_age=30d"),
  "an explicit cache age should be honoured",
);

const creatorUrl = buildCreatorRequestUrl({ country: "SG", sortBy: "engagement" });
assert.ok(creatorUrl.includes("creatorCountry=SG"), "creator discovery must filter to SG");
assert.ok(creatorUrl.includes("audienceCountry=SG"));
assert.ok(creatorUrl.includes("sortBy=engagement"));
assert.ok(!creatorUrl.includes("page="), "page 1 should be left implicit");
assert.ok(
  buildCreatorRequestUrl({ page: 3, followerBand: "10K-100K" }).includes("followerCount=10K-100K"),
);

// ---- company ----

const company = normaliseCompanySnapshot({
  name: "A College",
  employeeCount: 210,
  industry: "Education",
  specialties: ["Diplomas", "Short courses"],
  similarPages: [{ name: "Another College", url: "https://x" }, { name: "" }],
}, AT);

assert.equal(company.employeeCount, 210);
assert.deepEqual(company.specialities, ["Diplomas", "Short courses"]);
assert.equal(company.similarPages.length, 1, "a similar page with no name is not usable");

// ---- creators and comments ----

assert.deepEqual(
  normaliseCreatorResults({
    creator_list: [
      { unique_id: "someone", nickname: "Someone", follower_count: 50000, engagement_rate: 7.2 },
      { nickname: "no handle" },
    ],
  }).map((creator) => creator.handle),
  ["someone"],
  "a creator with no handle cannot be linked to, so is dropped",
);

const comments = normaliseComments({
  comments: [
    { text: "Is this course recognised?", user: { nickname: "asker" }, digg_count: 12 },
    { text: "", user: { nickname: "empty" } },
  ],
});

assert.equal(comments.length, 1, "an empty comment is not evidence");
assert.equal(comments[0].author, "asker");
assert.equal(comments[0].likes, 12);
assert.deepEqual(normaliseComments({}), [], "a reply with no comments array must not throw");

// A saved finding is read straight into the Strategy Brief prompt, so the
// "not reported" wording has to survive into the saved text. A follower count
// the API never returned must never become a zero in a brief.
assert.match(
  accountFindingSummary({
    platform: "tiktok", handle: "someone", name: "Someone", bio: "",
    followers: null, posts: 12, verified: false, url: "",
    cached: false, capturedAt: "2026-07-12T10:00:00.000Z",
  }),
  /Followers not reported, posts 12, captured 2026-07-12/,
);

// The capture date is not decoration: without it a stale number reads as
// current once it is sitting in a prompt.
assert.match(
  companyFindingSummary({
    name: "Rival", description: "", industry: "Education", employeeCount: null,
    headquarters: "Singapore", founded: "", website: "", specialities: [],
    similarPages: [], capturedAt: "2026-07-12T10:00:00.000Z",
  }),
  /Employees not reported.*captured 2026-07-12/,
);

// Comments carry their own restriction, because whatever reads them later
// never sees the caption in the UI.
assert.match(
  commentsFindingSummary(comments),
  /internal research evidence only, never marketing copy/,
);

console.log("check-scrapecreators: all assertions passed");

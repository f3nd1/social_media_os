#!/usr/bin/env node
// ScrapeCreators live endpoint audit. Run where api.scrapecreators.com is
// actually reachable (the droplet, or any host with real network access) —
// this sandbox's outbound access to that host is blocked by org egress
// policy (confirmed: 403 on CONNECT, not a transient failure), so this
// script could be prepared but not executed from there.
//
// Usage:
//   SCRAPECREATORS_API_KEY=sk_live_... node scripts/audit-scrapecreators.mjs
//
// No dependencies beyond Node 18+'s built-in fetch. Prints the exact
// consolidated markdown table format requested, plus a credits total.
//
// Real, well-known public test targets are used throughout (NASA's accounts
// mostly, being large, verified, and unlikely to ever go private or vanish).
// Where an endpoint needs an id/url that can only come from another real
// object (a comment id, a post url, a feedback token), this script chains:
// it calls a listing endpoint first for real data, then feeds a genuine
// value forward, rather than guessing a fixed id that could go stale.

const KEY = process.env.SCRAPECREATORS_API_KEY;
if (!KEY) {
  console.error("Set SCRAPECREATORS_API_KEY first.");
  process.exit(1);
}

const BASE = "https://api.scrapecreators.com";
let creditsCharged = 0;
const rows = [];

async function call(path, params = {}) {
  const url = new URL(path, BASE);
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && v !== "") url.searchParams.set(k, String(v));
  }

  let res, text;
  try {
    res = await fetch(url, { headers: { "x-api-key": KEY }, signal: AbortSignal.timeout(30_000) });
    text = await res.text();
  } catch (err) {
    return { ok: false, transportError: String(err), body: null, status: 0 };
  }

  let body = null;
  try { body = JSON.parse(text); } catch { /* leave null, report raw below */ }

  if (typeof body?.credits_charged === "number") creditsCharged += body.credits_charged;

  return { ok: res.ok, status: res.status, body, raw: text.slice(0, 500) };
}

// One test case: platform, endpoint label (must match the task's list
// exactly, for direct table use), path, params, and a human note describing
// the real input used. `optional` lets a chained call be skipped cleanly
// (recorded as its own row) if the object it depends on could not be
// fetched, rather than crashing the whole audit.
async function run(platform, endpoint, path, params, inputNote) {
  const result = await call(path, params);
  let status;
  let note = inputNote;

  if (result.transportError) {
    status = "Untestable from here";
    note += ` — transport error: ${result.transportError}`;
  } else if (result.body === null) {
    status = "Broken";
    note += ` — HTTP ${result.status}, non-JSON reply: ${result.raw}`;
  } else if (result.body.success === true) {
    status = "Working";
  } else {
    const msg = result.body.error || result.body.message || JSON.stringify(result.body).slice(0, 300);
    if (/missing[_\s]?param|required param/i.test(String(msg))) {
      status = "Needs real input to test meaningfully";
      note += ` — endpoint reports a missing parameter even with the input given: ${msg}`;
    } else {
      status = "Broken";
      note += ` — HTTP ${result.status}: ${msg}`;
    }
  }

  const row = { platform, endpoint, status, note, result };
  rows.push(row);
  return row;
}

function skip(platform, endpoint, reason) {
  rows.push({ platform, endpoint, status: "Needs real input to test meaningfully", note: reason });
}

// Pull a field out of a successful response, trying several plausible keys
// (every platform names things slightly differently), for chaining into the
// next real call.
function pick(body, ...paths) {
  for (const p of paths) {
    const val = p.split(".").reduce((o, k) => (o && typeof o === "object" ? o[k] : undefined), body);
    if (val !== undefined && val !== null && val !== "") return val;
  }
  return undefined;
}

async function main() {
  // ---------------- Instagram ----------------
  const igProfile = await run("Instagram", "Profile", "/v1/instagram/profile", { handle: "nasa" }, "handle=nasa");
  const igUserId = pick(igProfile.result.body, "user.pk", "user.id", "data.user.pk");
  await run("Instagram", "Basic Profile", "/v1/instagram/basic-profile", { userId: igUserId }, `userId from Profile call (${igUserId ?? "not found"})`);

  const igPosts = await run("Instagram", "Posts", "/v2/instagram/user/posts", { handle: "nasa" }, "handle=nasa");
  const igPostUrl = pick(igPosts.result.body, "items.0.code", "data.items.0.code");
  const igPostFullUrl = igPostUrl ? `https://www.instagram.com/p/${igPostUrl}/` : undefined;

  const igReels = await run("Instagram", "Reels", "/v1/instagram/user/reels", { handle: "nasa" }, "handle=nasa");
  const igReelCode = pick(igReels.result.body, "items.0.media.code", "items.0.code");
  const igAudioId = pick(igReels.result.body, "items.0.media.clips_metadata.original_sound_info.audio_asset_id");

  if (igPostFullUrl) {
    await run("Instagram", "Post/Reel Info", "/v1/instagram/post", { url: igPostFullUrl }, `url of a real @nasa post fetched from Posts (${igPostFullUrl})`);
    await run("Instagram", "Comments", "/v2/instagram/post/comments", { url: igPostFullUrl }, `url of the same @nasa post`);
  } else {
    skip("Instagram", "Post/Reel Info", "Could not fetch a real @nasa post url from the Posts endpoint to chain from.");
    skip("Instagram", "Comments", "Same dependency as Post/Reel Info.");
  }

  if (igReelCode) {
    await run("Instagram", "Transcript", "/v2/instagram/media/transcript", { url: `https://www.instagram.com/reel/${igReelCode}/` }, `url of a real @nasa reel fetched from Reels`);
  } else {
    skip("Instagram", "Transcript", "Could not fetch a real @nasa reel url to chain from.");
  }

  await run("Instagram", "Search Hashtag Posts", "/v1/instagram/search/hashtag", { hashtag: "spacex" }, "hashtag=spacex");
  await run("Instagram", "Search Instagram Profiles", "/v1/instagram/search/profiles", { query: "nasa" }, "query=nasa");
  await run("Instagram", "Search Reels", "/v2/instagram/reels/search", { query: "space" }, "query=space");

  if (igAudioId) {
    await run("Instagram", "Get Reels By Audio Id", "/v1/instagram/audio/reels", { audio_id: igAudioId }, `audio_id from a real @nasa reel (${igAudioId})`);
  } else {
    skip("Instagram", "Get Reels By Audio Id", "Could not fetch a real audio_id from the Reels endpoint to chain from.");
  }

  await run("Instagram", "Trending Reels", "/v1/instagram/reels/trending", {}, "no parameters, query-less endpoint");

  skip("Instagram", "Comment Replies", "Not present in ScrapeCreators' own current endpoint registry (@scrapecreators/cli 1.0.27) despite appearing in the Playground screenshot — see catalogue-drift note.");

  if (igUserId) {
    const igHighlights = await run("Instagram", "Story Highlights", "/v1/instagram/user/highlights", { user_id: igUserId }, `user_id from Profile (${igUserId})`);
    const igHighlightId = pick(igHighlights.result.body, "highlights.0.id", "data.0.id");
    if (igHighlightId) {
      await run("Instagram", "Highlights Details", "/v1/instagram/user/highlight/detail", { id: igHighlightId }, `id from Story Highlights (${igHighlightId})`);
    } else {
      skip("Instagram", "Highlights Details", "Could not fetch a real highlight id to chain from (the account may have none active).");
    }
  } else {
    skip("Instagram", "Story Highlights", "Could not resolve @nasa's numeric user_id from Profile.");
    skip("Instagram", "Highlights Details", "Same dependency as Story Highlights.");
  }

  await run("Instagram", "Embed HTML", "/v1/instagram/user/embed", { handle: "nasa" }, "handle=nasa");

  // ---------------- TikTok ----------------
  await run("TikTok", "Profile", "/v1/tiktok/profile", { handle: "nasa" }, "handle=nasa");
  await run("TikTok", "Profile Region", "/v1/tiktok/profile/region", { handle: "nasa" }, "handle=nasa");
  await run("TikTok", "User's Audience Demographics", "/v1/tiktok/user/audience", { handle: "nasa" }, "handle=nasa (this is a creator-analytics endpoint; a non-partner account may legitimately be refused — recorded as-is)");

  skip("TikTok", "Collection Videos", "No endpoint by this name found in ScrapeCreators' current registry under any platform — see catalogue-drift note; if this was meant to be a different vendor feature, needs Felix to confirm the exact Playground path.");

  const ttVideos = await run("TikTok", "Profile Videos", "/v3/tiktok/profile/videos", { handle: "nasa" }, "handle=nasa");
  const ttVideoUrl = pick(ttVideos.result.body, "aweme_list.0.share_url", "videos.0.share_url", "data.0.share_url");

  if (ttVideoUrl) {
    await run("TikTok", "Video Info", "/v2/tiktok/video", { url: ttVideoUrl }, `url of a real @nasa video fetched from Profile Videos (${ttVideoUrl})`);
    await run("TikTok", "Transcript", "/v1/tiktok/video/transcript", { url: ttVideoUrl }, "same real @nasa video url");
    const ttComments = await run("TikTok", "Comments", "/v1/tiktok/video/comments", { url: ttVideoUrl }, "same real @nasa video url");
    const ttCommentId = pick(ttComments.result.body, "comments.0.cid", "comments.0.id");
    if (ttCommentId) {
      await run("TikTok", "Comment Replies", "/v1/tiktok/video/comment/replies", { comment_id: ttCommentId, url: ttVideoUrl }, `comment_id from Comments (${ttCommentId})`);
    } else {
      skip("TikTok", "Comment Replies", "The real video's top comments had no replies to chain a comment_id from.");
    }
  } else {
    skip("TikTok", "Video Info", "Could not fetch a real @nasa video url from Profile Videos to chain from.");
    skip("TikTok", "Transcript", "Same dependency as Video Info.");
    skip("TikTok", "Comments", "Same dependency as Video Info.");
    skip("TikTok", "Comment Replies", "Same dependency as Video Info.");
  }

  await run("TikTok", "Live", "/v1/tiktok/user/live", { handle: "nasa" }, "handle=nasa (a not-currently-live account is expected; classified strictly on the literal success field returned)");
  skip("TikTok", "Live Info", "No separate \"Live Info\" endpoint found in the current registry distinct from \"Live\" — see catalogue-drift note; may be the same endpoint under a different name in the Playground.");
  await run("TikTok", "Following", "/v1/tiktok/user/following", { handle: "nasa" }, "handle=nasa");
  await run("TikTok", "Followers", "/v1/tiktok/user/followers", { handle: "nasa" }, "handle=nasa");
  await run("TikTok", "Search Users", "/v1/tiktok/search/users", { query: "nasa" }, "query=nasa");
  skip("TikTok", "Search Suggestions", "Not present in ScrapeCreators' own current endpoint registry (@scrapecreators/cli 1.0.27) — see catalogue-drift note.");
  await run("TikTok", "Search by Hashtag", "/v1/tiktok/search/hashtag", { hashtag: "space" }, "hashtag=space");
  await run("TikTok", "Search by Keyword", "/v1/tiktok/search/keyword", { query: "space" }, "query=space");
  await run("TikTok", "Top Search", "/v1/tiktok/search/top", { query: "space" }, "query=space");
  await run("TikTok", "Get popular creators", "/v1/tiktok/creators/popular", { creatorCountry: "SG", audienceCountry: "SG" }, "creatorCountry=audienceCountry=SG (already used live in this app's Account Research)");

  // This is the endpoint Felix found missing from the live Playground list.
  // Tested anyway so the audit has a real, current data point rather than
  // relying only on the earlier production 400.
  await run("TikTok", "Get popular hashtags", "/v1/tiktok/hashtags/popular", { countryCode: "SG", period: 7 }, "countryCode=SG, period=7 (already used live in this app's Trending Now — flagged by Felix as possibly removed)");

  if (ttVideoUrl) {
    const ttVideoInfo = rows.find((r) => r.endpoint === "Video Info" && r.platform === "TikTok");
    const clipId = pick(ttVideoInfo?.result?.body, "music.id", "aweme_detail.music.id");
    if (clipId) {
      await run("TikTok", "Get Song Details", "/v1/tiktok/song", { clipId }, `clipId from Video Info's music data (${clipId})`);
      await run("TikTok", "TikToks using Song", "/v1/tiktok/song/videos", { clipId }, "same real clipId");
    } else {
      skip("TikTok", "Get Song Details", "Could not resolve a real clipId from the fetched video's music metadata.");
      skip("TikTok", "TikToks using Song", "Same dependency as Get Song Details.");
    }
  } else {
    skip("TikTok", "Get Song Details", "Depends on a video url that could not be fetched.");
    skip("TikTok", "TikToks using Song", "Same dependency as Get Song Details.");
  }

  await run("TikTok", "Trending Feed", "/v1/tiktok/get-trending-feed", { region: "SG" }, "region=SG");

  // ---------------- YouTube ----------------
  await run("YouTube", "Channel Details", "/v1/youtube/channel", { handle: "@nasa" }, "handle=@nasa");
  const ytVideos = await run("YouTube", "Channel Videos", "/v1/youtube/channel-videos", { handle: "@nasa" }, "handle=@nasa");
  const ytVideoUrl = pick(ytVideos.result.body, "videos.0.url", "videos.0.videoUrl");
  await run("YouTube", "Channel Playlists", "/v1/youtube/channel/playlists", { handle: "@nasa" }, "handle=@nasa");
  await run("YouTube", "Channel Lives", "/v1/youtube/channel/lives", { handle: "@nasa" }, "handle=@nasa (no live in progress is expected; classified on the literal success field)");
  await run("YouTube", "Channel Community Posts", "/v1/youtube/channel/community-posts", { handle: "@nasa" }, "handle=@nasa");
  await run("YouTube", "Channel Shorts", "/v1/youtube/channel/shorts", { handle: "@nasa" }, "handle=@nasa");

  if (ytVideoUrl) {
    await run("YouTube", "Video/Short Details", "/v1/youtube/video", { url: ytVideoUrl }, `url of a real @nasa video fetched from Channel Videos (${ytVideoUrl})`);
    await run("YouTube", "Transcript", "/v1/youtube/video/transcript", { url: ytVideoUrl }, "same real @nasa video url");
    const ytComments = await run("YouTube", "Comments", "/v1/youtube/video/comments", { url: ytVideoUrl }, "same real @nasa video url");
    const ytContinuation = pick(ytComments.result.body, "continuationToken", "comments.0.repliesContinuationToken");
    if (ytContinuation) {
      await run("YouTube", "Comment Replies", "/v1/youtube/video/comment/replies", { continuationToken: ytContinuation }, "continuationToken from Comments");
    } else {
      skip("YouTube", "Comment Replies", "Comments returned no repliesContinuationToken to chain from (top comments may have no replies).");
    }
  } else {
    skip("YouTube", "Video/Short Details", "Could not fetch a real @nasa video url from Channel Videos to chain from.");
    skip("YouTube", "Transcript", "Same dependency as Video/Short Details.");
    skip("YouTube", "Comments", "Same dependency as Video/Short Details.");
    skip("YouTube", "Comment Replies", "Same dependency as Video/Short Details.");
  }

  await run("YouTube", "Search", "/v1/youtube/search", { query: "nasa" }, "query=nasa");
  await run("YouTube", "Search by Hashtag", "/v1/youtube/search/hashtag", { hashtag: "space" }, "hashtag=space");
  await run("YouTube", "Trending Shorts", "/v1/youtube/shorts/trending", {}, "no parameters, query-less endpoint");

  const ytPlaylists = rows.find((r) => r.endpoint === "Channel Playlists" && r.platform === "YouTube");
  const ytPlaylistId = pick(ytPlaylists?.result?.body, "playlists.0.playlistId", "playlists.0.id");
  if (ytPlaylistId) {
    await run("YouTube", "Playlist", "/v1/youtube/playlist", { playlist_id: ytPlaylistId }, `playlist_id from Channel Playlists (${ytPlaylistId})`);
  } else {
    skip("YouTube", "Playlist", "Could not fetch a real playlist_id from Channel Playlists to chain from.");
  }

  const ytCommunity = rows.find((r) => r.endpoint === "Channel Community Posts" && r.platform === "YouTube");
  const ytCommunityUrl = pick(ytCommunity?.result?.body, "posts.0.url", "posts.0.postUrl");
  if (ytCommunityUrl) {
    await run("YouTube", "Community Post Details", "/v1/youtube/community-post", { url: ytCommunityUrl }, `url from Channel Community Posts (${ytCommunityUrl})`);
  } else {
    skip("YouTube", "Community Post Details", "@nasa had no fetchable community post url to chain from (the channel may not currently have any).");
  }

  // ---------------- LinkedIn ----------------
  await run("LinkedIn", "Person's Profile", "/v1/linkedin/profile", { url: "https://www.linkedin.com/in/satyanadella/" }, "url=linkedin.com/in/satyanadella (large, real, public profile)");
  await run("LinkedIn", "Company Page", "/v1/linkedin/company", { url: "https://www.linkedin.com/company/microsoft/" }, "url=linkedin.com/company/microsoft");
  const liPosts = await run("LinkedIn", "Company Posts", "/v1/linkedin/company/posts", { url: "https://www.linkedin.com/company/microsoft/" }, "same company url");
  const liPostUrl = pick(liPosts.result.body, "posts.0.url", "data.0.url");
  await run("LinkedIn", "Search Posts", "/v1/linkedin/search/posts", { query: "artificial intelligence" }, 'query="artificial intelligence"');

  if (liPostUrl) {
    await run("LinkedIn", "Post", "/v1/linkedin/post", { url: liPostUrl }, `url of a real Microsoft post fetched from Company Posts (${liPostUrl})`);
    await run("LinkedIn", "Post Transcript", "/v1/linkedin/post/transcript", { url: liPostUrl }, "same real post url (a text/image post with no video is expected to fail meaningfully here; recorded as-is)");
  } else {
    skip("LinkedIn", "Post", "Could not fetch a real post url from Company Posts to chain from.");
    skip("LinkedIn", "Post Transcript", "Same dependency as Post.");
  }

  // ---------------- Facebook ----------------
  await run("Facebook", "Profile", "/v1/facebook/profile", { url: "https://www.facebook.com/NASA/" }, "url=facebook.com/NASA");
  await run("Facebook", "Profile Reels", "/v1/facebook/profile/reels", { url: "https://www.facebook.com/NASA/" }, "same page url");
  await run("Facebook", "Profile Photos", "/v1/facebook/profile/photos", { url: "https://www.facebook.com/NASA/" }, "same page url");
  const fbPosts = await run("Facebook", "Profile Posts", "/v1/facebook/profile/posts", { url: "https://www.facebook.com/NASA/" }, "same page url");
  const fbPostUrl = pick(fbPosts.result.body, "posts.0.url", "data.0.url");
  await run("Facebook", "Profile Events", "/v1/facebook/profile/events", { url: "https://www.facebook.com/NASA/" }, "same page url (a page with no upcoming public events is expected to return an empty, successful list)");

  if (fbPostUrl) {
    await run("Facebook", "Post", "/v1/facebook/post", { url: fbPostUrl }, `url of a real NASA post fetched from Profile Posts (${fbPostUrl})`);
    await run("Facebook", "Transcript", "/v1/facebook/post/transcript", { url: fbPostUrl }, "same real post url (a photo/text post with no video is expected to fail meaningfully here; recorded as-is)");
    const fbComments = await run("Facebook", "Comments", "/v1/facebook/post/comments", { url: fbPostUrl }, "same real post url");
    const fbFeedbackId = pick(fbComments.result.body, "feedback_id");
    const fbExpansionToken = pick(fbComments.result.body, "comments.0.expansion_token", "expansion_token");
    if (fbFeedbackId && fbExpansionToken) {
      await run("Facebook", "Comment Replies", "/v1/facebook/post/comment/replies", { feedback_id: fbFeedbackId, expansion_token: fbExpansionToken }, "feedback_id + expansion_token from Comments");
    } else {
      skip("Facebook", "Comment Replies", "Comments did not return a feedback_id/expansion_token pair to chain from — these are opaque tokens Facebook's own scrape may not always expose.");
    }
  } else {
    skip("Facebook", "Post", "Could not fetch a real NASA post url from Profile Posts to chain from.");
    skip("Facebook", "Transcript", "Same dependency as Post.");
    skip("Facebook", "Comments", "Same dependency as Post.");
    skip("Facebook", "Comment Replies", "Same dependency as Post.");
  }

  skip("Facebook", "Facebook Group Info", "No separate \"Group Info\" endpoint found in the current registry (only \"Facebook Group Posts\" exists) — see catalogue-drift note; Felix's Playground screenshot may show a differently-named or newer endpoint.");
  skip("Facebook", "Facebook Group Posts", "Needs a real, currently-public Facebook Group url/id — public groups are uncommon and often go private without notice, so no test target could be picked confidently without Felix naming one he has verified is public.");

  // ---------------- Twitter/X ----------------
  await run("Twitter/X", "Profile", "/v1/twitter/profile", { handle: "nasa" }, "handle=nasa");
  const xTweets = await run("Twitter/X", "User Tweets", "/v1/twitter/user-tweets", { handle: "nasa" }, "handle=nasa");
  const xTweetUrl = pick(xTweets.result.body, "tweets.0.url", "data.0.url");

  if (xTweetUrl) {
    await run("Twitter/X", "Tweet Details", "/v1/twitter/tweet", { url: xTweetUrl }, `url of a real @nasa tweet fetched from User Tweets (${xTweetUrl})`);
    await run("Twitter/X", "Transcript", "/v1/twitter/tweet/transcript", { url: xTweetUrl }, "same real tweet url (a text/image tweet with no video is expected to fail meaningfully here; recorded as-is)");
  } else {
    skip("Twitter/X", "Tweet Details", "Could not fetch a real @nasa tweet url from User Tweets to chain from.");
    skip("Twitter/X", "Transcript", "Same dependency as Tweet Details.");
  }

  skip("Twitter/X", "Community", "Needs a real, currently-active X Community url/id — communities can be archived or made private without notice, and no single well-known example could be confirmed stable enough to pick confidently.");
  skip("Twitter/X", "Community Tweets", "Same dependency as Community.");

  // ---------------- Reddit ----------------
  await run("Reddit", "Subreddit Details", "/v1/reddit/subreddit/details", { subreddit: "explainlikeimfive" }, "subreddit=explainlikeimfive");
  const rdPosts = await run("Reddit", "Subreddit Posts", "/v1/reddit/subreddit", { subreddit: "explainlikeimfive" }, "subreddit=explainlikeimfive");
  const rdPostUrl = pick(rdPosts.result.body, "posts.0.url", "data.0.url");
  await run("Reddit", "Subreddit Search", "/v1/reddit/subreddit/search", { subreddit: "explainlikeimfive", query: "space" }, "subreddit=explainlikeimfive, query=space");

  if (rdPostUrl) {
    await run("Reddit", "Post Comments", "/v1/reddit/post/comments", { url: rdPostUrl }, `url of a real r/explainlikeimfive post fetched from Subreddit Posts (${rdPostUrl})`);
    await run("Reddit", "Post Transcript", "/v1/reddit/post/transcript", { url: rdPostUrl }, "same real post url (a text post with no video is expected to fail meaningfully here; recorded as-is)");
  } else {
    skip("Reddit", "Post Comments", "Could not fetch a real post url from Subreddit Posts to chain from.");
    skip("Reddit", "Post Transcript", "Same dependency as Post Comments.");
  }

  await run("Reddit", "Search", "/v1/reddit/search", { query: "nasa" }, "query=nasa");

  // ---------------- Threads ----------------
  await run("Threads", "Profile", "/v1/threads/profile", { handle: "zuck" }, "handle=zuck");
  const thPosts = await run("Threads", "Posts", "/v1/threads/user/posts", { handle: "zuck" }, "handle=zuck");
  const thPostUrl = pick(thPosts.result.body, "posts.0.url", "data.0.url");

  if (thPostUrl) {
    await run("Threads", "Post", "/v1/threads/post", { url: thPostUrl }, `url of a real @zuck post fetched from Posts (${thPostUrl})`);
  } else {
    skip("Threads", "Post", "Could not fetch a real @zuck post url from Posts to chain from.");
  }

  await run("Threads", "Search by Keyword", "/v1/threads/search", { query: "ai" }, "query=ai");
  await run("Threads", "Search Users", "/v1/threads/search/users", { query: "nasa" }, "query=nasa");

  // ---------------- Output ----------------
  console.log("| Platform | Endpoint | Status | Notes (test input used, or real error message) |");
  console.log("|---|---|---|---|");
  for (const r of rows) {
    console.log(`| ${r.platform} | ${r.endpoint} | ${r.status} | ${(r.note || "").replace(/\|/g, "\\|")} |`);
  }
  console.log(`\nTotal credits charged: ${creditsCharged}`);
}

main();

// Ad-hoc self-check for the Social Listening Plan A helpers (no test
// framework in this repo; run with `node scripts/check-listening-ai.mjs`).
import assert from "node:assert/strict";

import {
  buildInstagramHashtagSearchUrl,
  buildWebListeningSearchInput,
  buildYouTubeSearchUrl,
  isHashtagShapedTopic,
  normaliseInstagramHashtagPosts,
  normaliseYouTubeSearchPosts,
  topicToInstagramHashtag,
  webCitationsToListeningPosts,
} from "../lib/listening-ai.ts";

const searchInput = buildWebListeningSearchInput("IELTS preparation");
assert.match(searchInput, /IELTS preparation/);

const posts = webCitationsToListeningPosts([
  { title: "Real page title", url: "https://example.com/a" },
  { title: "", url: "https://example.com/b" },
  { title: "dropped, no url", url: "" },
]);

assert.equal(posts.length, 2);
assert.deepEqual(posts[0], {
  text: "Real page title",
  source: "Public web",
  url: "https://example.com/a",
  date: "",
});
// Falls back to the url when a citation has no title, never inventing text.
assert.equal(posts[1].text, "https://example.com/b");

// A single word is hashtag-shaped; a full phrase is not. Guessing a hashtag
// out of a phrase would risk pulling in posts under an unrelated tag and
// presenting that as evidence, so a phrase must never reach the network call.
assert.equal(isHashtagShapedTopic("IELTS"), true);
assert.equal(isHashtagShapedTopic("IELTS preparation"), false);
assert.equal(isHashtagShapedTopic("   "), false, "whitespace only is not a topic");
assert.equal(isHashtagShapedTopic(""), false);

assert.equal(topicToInstagramHashtag("IELTS"), "ielts");
assert.equal(
  topicToInstagramHashtag("  #IELTS!  "),
  "ielts",
  "punctuation and surrounding whitespace are stripped",
);

const hashtagUrl = new URL(buildInstagramHashtagSearchUrl("IELTS"));
assert.equal(hashtagUrl.pathname, "/v1/instagram/search/hashtag");
assert.equal(hashtagUrl.searchParams.get("hashtag"), "ielts");

const hashtagPosts = normaliseInstagramHashtagPosts({
  success: true,
  posts: [
    {
      caption: "Real caption about IELTS prep",
      url: "https://www.instagram.com/p/real/",
      taken_at: "2026-07-01T12:00:00.000Z",
    },
    // No caption: nothing to quote, so it must be dropped rather than
    // fabricating text for it.
    { url: "https://www.instagram.com/p/nocaption/" },
    // No url: cannot be shown as checkable evidence, so it must be dropped.
    { caption: "orphaned caption" },
  ],
});

assert.equal(hashtagPosts.length, 1);
assert.deepEqual(hashtagPosts[0], {
  text: "Real caption about IELTS prep",
  source: "Instagram",
  url: "https://www.instagram.com/p/real/",
  date: "2026-07-01",
});

// A reply with no posts array at all (a malformed or unexpected shape) must
// not throw: it means fewer posts, not a crashed search.
assert.deepEqual(normaliseInstagramHashtagPosts({}), []);
assert.deepEqual(normaliseInstagramHashtagPosts(null), []);

const youtubeUrl = new URL(buildYouTubeSearchUrl("IELTS preparation"));
assert.equal(youtubeUrl.pathname, "/v1/youtube/search");
assert.equal(youtubeUrl.searchParams.get("query"), "IELTS preparation");

const youtubePosts = normaliseYouTubeSearchPosts({
  videos: [
    {
      id: "abc123",
      title: "Real IELTS prep video",
      description: "Tips from a real teacher",
      publishedAt: "2026-07-01T00:00:00.000Z",
    },
    // No title, but a description is still real text: kept, not dropped.
    { id: "def456", description: "orphaned description" },
    // Neither title nor description: nothing to quote, so it is dropped.
    { id: "ghi789" },
    // No id and no url: nothing to link to, so it must be dropped even
    // though it has a title.
    { title: "Nowhere to send anyone" },
  ],
});

assert.deepEqual(
  youtubePosts.map((post) => post.text),
  ["Real IELTS prep video - Tips from a real teacher", "orphaned description"],
);
assert.deepEqual(youtubePosts[0], {
  text: "Real IELTS prep video - Tips from a real teacher",
  source: "YouTube",
  url: "https://www.youtube.com/watch?v=abc123",
  date: "2026-07-01",
});

// A handful of other plausible envelope shapes must all be tried, since the
// endpoint's real shape could not be directly observed while this was built.
assert.equal(
  normaliseYouTubeSearchPosts({ items: [{ title: "x", url: "https://y" }] }).length,
  1,
);
assert.equal(
  normaliseYouTubeSearchPosts({ data: [{ title: "x", url: "https://y" }] }).length,
  1,
);

// A reply with no recognisable list at all must not throw: fewer posts, not
// a crashed search.
assert.deepEqual(normaliseYouTubeSearchPosts({}), []);
assert.deepEqual(normaliseYouTubeSearchPosts(null), []);

console.log("check-listening-ai: all checks passed");

// Ad-hoc self-check for the Social Listening Plan A helpers (no test
// framework in this repo; run with `node scripts/check-listening-ai.mjs`).
import assert from "node:assert/strict";

import {
  buildInstagramHashtagSearchUrl,
  buildWebListeningSearchInput,
  isHashtagShapedTopic,
  normaliseInstagramHashtagPosts,
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

console.log("check-listening-ai: all checks passed");

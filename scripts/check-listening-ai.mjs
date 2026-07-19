// Ad-hoc self-check for the Social Listening Plan A helpers (no test
// framework in this repo; run with `node scripts/check-listening-ai.mjs`).
import assert from "node:assert/strict";

import {
  buildWebListeningSearchInput,
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

console.log("check-listening-ai: all checks passed");

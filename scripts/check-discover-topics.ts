// Self-check for the Discover topic derivation. Run with
//
//   npm run check:discover
//
// Every topic here becomes a real search that spends real credits, so the two
// things worth pinning are that the list only contains words the manager
// already entered, and that it stays short enough that "run all of them" is
// not an accidentally expensive click.

import assert from "node:assert/strict";

import {
  DISCOVERY_TOPIC_LIMIT,
  discoverySourceTarget,
  suggestDiscoveryTopics,
} from "../lib/discover-topics.ts";

const data = {
  ucc: {
    courses: [
      { id: "c1", name: "Diploma in Business", status: "active" },
      { id: "c2", name: "Retired Diploma", status: "archived" },
      // Same name twice: two records, one search.
      { id: "c3", name: "diploma in business", status: "future" },
    ],
    audiences: [
      { id: "a1", name: "PRC parents", concerns: ["", "Is the diploma recognised"] },
      { id: "a2", name: "Adult learners", concerns: [] },
    ],
  },
  competitors: [{ id: "x1", name: "Rival College" }],
} as never;

const topics = suggestDiscoveryTopics(data);

assert.deepEqual(
  topics.map((entry) => entry.topic),
  [
    "Diploma in Business Singapore",
    "Is the diploma recognised Singapore",
    "Rival College reviews",
  ],
  "topics come from courses, audience concerns and competitors, in that order",
);

assert.ok(
  !topics.some((entry) => entry.topic.includes("Retired")),
  "an archived course is not worth researching",
);

// Every topic has to say where it came from, or a manager cannot tell derived
// from invented.
assert.ok(topics.every((entry) => entry.why.length > 0));
assert.equal(topics[0].why, "Course: Diploma in Business");
assert.equal(topics[1].why, "Concern raised by PRC parents");

// The "why" is for reading; the source is for linking. Both have to point at
// the same record, and the source has to carry the real workspace id or the
// link would open the wrong thing (or nothing).
assert.deepEqual(topics[0].source, { kind: "course", id: "c1" });
assert.deepEqual(topics[1].source, { kind: "audience", id: "a1" });
assert.deepEqual(topics[2].source, { kind: "competitor", id: "x1" });

// A course and a competitor each have their own record on a real screen.
assert.deepEqual(discoverySourceTarget(topics[0].source), {
  view: "courses",
  elementId: "record-course-c1",
  label: "Open course",
});
assert.deepEqual(discoverySourceTarget(topics[2].source), {
  view: "competitors",
  elementId: "record-competitor-x1",
  label: "Open competitor",
});

// A concern deliberately resolves to the AUDIENCE that raised it, not to a
// concern page: concerns are entries in an audience's pain-points list and
// have no record of their own. The id must be the audience's, never the
// concern text, so this pins that the fallback is the honest one rather than
// an invented destination.
assert.deepEqual(discoverySourceTarget(topics[1].source), {
  view: "courses",
  elementId: "record-audience-a1",
  label: "Open audience",
});

// An empty audience concern must not become a search for "Singapore".
assert.ok(!topics.some((entry) => entry.topic === "Singapore"));

// Round-robin, not one list after another: a college with more courses than
// the limit must still be offered its competitors and audience concerns.
const courseHeavy = suggestDiscoveryTopics({
  ucc: {
    courses: Array.from({ length: 12 }, (_, index) => ({
      id: `c${index}`,
      name: `Course ${index}`,
      status: "active",
    })),
    audiences: [{ id: "a1", name: "Parents", concerns: ["Is it recognised"] }],
  },
  competitors: [{ id: "x1", name: "Rival College" }],
} as never);
assert.ok(
  courseHeavy.some((entry) => entry.why.startsWith("Competitor:")),
  "courses cannot crowd competitors off the list",
);
assert.ok(
  courseHeavy.some((entry) => entry.why.startsWith("Concern raised by")),
  "courses cannot crowd audience concerns off the list",
);

// A big workspace must not offer thirty searches at once.
const many = suggestDiscoveryTopics(
  {
    ucc: {
      courses: Array.from({ length: 30 }, (_, index) => ({
        id: `c${index}`,
        name: `Course ${index}`,
        status: "active",
      })),
      audiences: [],
    },
    competitors: [],
  } as never,
);
assert.equal(many.length, DISCOVERY_TOPIC_LIMIT, "the list is capped");

// A brand new workspace has nothing to derive from, and must say nothing
// rather than guess.
assert.deepEqual(suggestDiscoveryTopics({} as never), []);

console.log("check-discover-topics: all assertions passed");

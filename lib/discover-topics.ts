// Discover (Task 4, point 1): the no-query entry point for Social Listening.
//
// "No query" cannot mean "no search terms": every engine behind Social
// Listening (sc-research, last30days, the YouTube Data API, the web search)
// takes a query, so a Discover run that claimed to just show "what is
// trending" would have to invent one. What it does instead is stop making the
// manager think of the terms: the terms are read out of what the workspace
// already holds, each one shown with the record it came from, and the manager
// picks which to run before a single credit is spent.
//
// Pure helpers, no network. Nothing here generates language of its own: every
// topic is words the manager already typed into a course, an audience or a
// competitor, plus a fixed suffix naming the market.

import type { MarketingWorkspaceData } from "@/lib/social-calendar-data";

// Where a topic came from, as an addressable record rather than only the
// human-readable "why" string. Courses and competitors each have their own
// record on a real screen. A concern does not: it is one entry in an
// audience's "Pain points" list, with no page of its own, so the audience
// that raised it is the closest honest destination and the kind says so.
export type DiscoverySource =
  | { kind: "course"; id: string }
  | { kind: "audience"; id: string }
  | { kind: "competitor"; id: string };

export type DiscoveryTopic = {
  id: string;
  topic: string;
  source: DiscoverySource;
  // Which workspace record this came from, shown next to the topic so a
  // manager can see it is derived from their own data rather than guessed.
  why: string;
};

// Discovery is for the local market, and an unqualified course name searches
// the whole world. Appending the market is the one piece of wording this file
// adds, and it is a fact about the college, not an invention.
const MARKET = "Singapore";

// How many topics to offer. Each selected topic is a full search across every
// ticked source, so the list stays short enough that the cost of running all
// of them is still a sensible thing to click.
export const DISCOVERY_TOPIC_LIMIT = 8;

// How many are ticked when the panel opens. Deliberately low: the run button
// spends credits on the paid sources, so the default has to be a cheap one
// that a manager opts up from rather than an expensive one they must notice
// and opt down from.
export const DISCOVERY_DEFAULT_SELECTION = 3;

function clean(value: string): string {
  return value.trim().replace(/\s+/g, " ");
}

export function suggestDiscoveryTopics(
  data: MarketingWorkspaceData,
  limit = DISCOVERY_TOPIC_LIMIT,
): DiscoveryTopic[] {
  const topics: DiscoveryTopic[] = [];
  const seen = new Set<string>();

  function add(topic: string, why: string, source: DiscoverySource) {
    const text = clean(topic);
    const key = text.toLowerCase();

    if (!text || seen.has(key)) {
      return;
    }

    seen.add(key);
    topics.push({ id: `discover-${topics.length}`, topic: text, why, source });
  }

  // Three kinds of topic, taken round-robin rather than one list after
  // another. A college with eight courses would otherwise fill the whole limit
  // with course names and the manager would never see a competitor or an
  // audience concern, which is most of the point of discovering rather than
  // searching.
  const byCourse = (data.ucc?.courses ?? [])
    // Archived courses are excluded: research on something no longer offered
    // cannot lead anywhere.
    .filter((course) => course.status !== "archived")
    .map((course) => ({
      topic: `${course.name} ${MARKET}`,
      why: `Course: ${course.name}`,
      source: { kind: "course" as const, id: course.id },
    }));

  // Audience concerns are the questions prospective students are already
  // asking, which is exactly what listening is good at answering.
  const byConcern = (data.ucc?.audiences ?? []).flatMap((audience) => {
    const concern = (audience.concerns ?? []).find((entry) => clean(entry));

    return concern
      ? [
          {
            topic: `${concern} ${MARKET}`,
            why: `Concern raised by ${audience.name}`,
            source: { kind: "audience" as const, id: audience.id },
          },
        ]
      : [];
  });

  // Competitors by name: what people say about them, not about us.
  const byCompetitor = (data.competitors ?? []).map((competitor) => ({
    topic: `${competitor.name} reviews`,
    why: `Competitor: ${competitor.name}`,
    source: { kind: "competitor" as const, id: competitor.id },
  }));

  const buckets = [byCourse, byConcern, byCompetitor];
  const longest = Math.max(0, ...buckets.map((bucket) => bucket.length));

  for (let index = 0; index < longest && topics.length < limit; index += 1) {
    for (const bucket of buckets) {
      if (topics.length >= limit) {
        break;
      }

      const entry = bucket[index];

      if (entry) {
        add(entry.topic, entry.why, entry.source);
      }
    }
  }

  return topics;
}

// The DOM id of the card that holds a source record, and the screen it sits
// on. Kept here so the Discover link and the card that receives it derive the
// same string from one place rather than agreeing by coincidence.
//
// "audience" resolves to the Products & Audiences screen rather than a concern
// page, because there is no concern page: concerns are the "Pain points" list
// inside an audience, so the audience card is where that text actually lives
// and can be edited.
export function discoverySourceTarget(source: DiscoverySource): {
  view: "courses" | "competitors";
  elementId: string;
  label: string;
} {
  if (source.kind === "competitor") {
    return {
      view: "competitors",
      elementId: `record-competitor-${source.id}`,
      label: "Open competitor",
    };
  }

  if (source.kind === "audience") {
    return {
      view: "courses",
      elementId: `record-audience-${source.id}`,
      label: "Open audience",
    };
  }

  return {
    view: "courses",
    elementId: `record-course-${source.id}`,
    label: "Open course",
  };
}

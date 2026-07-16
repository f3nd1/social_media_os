// Prompt building and output mapping for observing a competitor from a public
// profile/website link. Pure helpers, no network.
//
// ponytail: this is web-search observation, not a real social scraper. Public
// platforms (Instagram, TikTok, etc.) block automated crawling and hide most
// content behind auth, so we lean on the model's web_search over whatever is
// publicly indexed about the profile. If a genuine per-post crawler is ever
// needed, that is a separate hosted worker, not this route.

import type { WebSearchCitation } from "@/lib/openai-shared";

export type CompetitorObserveInput = {
  name: string;
  profileUrl: string;
};

export type CompetitorObserveDraft = {
  contentFormats: string[];
  postingFrequency: string;
  tone: string;
  observedStrengths: string[];
};

export function buildCompetitorObserveSearchInput({
  name,
  profileUrl,
}: CompetitorObserveInput): string {
  return [
    `Research the public social media presence of "${name}" starting from this link: ${profileUrl}.`,
    "Look at what is publicly visible about how they post: the content formats they use (for example short video, carousels, reels, live, long-form), how often and at what times they post, the tone of voice, and their observable strengths.",
    "Only report what public sources actually show. Do not guess private analytics.",
  ].join(" ");
}

export function buildCompetitorObserveSystemPrompt(): string {
  return [
    "You are a competitive intelligence analyst for a private college in Singapore.",
    "You observe a competitor's public social media behaviour from web search findings and summarise it for a human Marketing Manager to review and edit. You never act on it yourself.",
    "Ground every field strictly in the provided search findings and their cited pages. Do not invent formats, numbers, or strengths that the findings do not support. If something cannot be observed, leave that field empty (empty string or empty array).",
    "Compliance is mandatory. Keep observations factual and neutral. Never promise or imply guaranteed employment, salary figures, visa outcomes, admission certainty, rankings, or guaranteed course outcomes.",
    "Use British spelling. Do not use em dashes. Refer to teaching staff as teachers, never instructors.",
    "Return only a single JSON object matching the requested shape.",
  ].join(" ");
}

export function buildCompetitorObserveUserPrompt(
  searchText: string,
  citations: WebSearchCitation[],
  input: CompetitorObserveInput,
): string {
  const shape = {
    contentFormats: ["string, a content format actually observed"],
    postingFrequency: "string, how often/when they post, in plain words",
    tone: "string, the observed tone of voice",
    observedStrengths: ["string, a strength supported by the findings"],
  };

  return [
    `Summarise the public social media behaviour of "${input.name}" (${input.profileUrl}) from these findings.`,
    "",
    "SEARCH FINDINGS:",
    searchText,
    "",
    "CITED SOURCES:",
    citations.map((citation) => `- ${citation.title}: ${citation.url}`).join("\n"),
    "",
    "Return a JSON object with exactly this shape:",
    JSON.stringify(shape, null, 2),
  ].join("\n");
}

function toStringList(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((entry) => (typeof entry === "string" ? entry.trim() : ""))
    .filter(Boolean);
}

// Clean the model's draft into safe competitor fields.
export function sanitizeCompetitorObserveDraft(
  draft: CompetitorObserveDraft,
): CompetitorObserveDraft {
  return {
    contentFormats: toStringList(draft?.contentFormats),
    postingFrequency:
      typeof draft?.postingFrequency === "string" ? draft.postingFrequency.trim() : "",
    tone: typeof draft?.tone === "string" ? draft.tone.trim() : "",
    observedStrengths: toStringList(draft?.observedStrengths),
  };
}

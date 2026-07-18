// Prompt building and output mapping for observing a competitor from a public
// profile/website link. Pure helpers, no network.
//
// ponytail: this is web-search observation, not a real social scraper. Public
// platforms (Instagram, TikTok, etc.) block automated crawling and hide most
// content behind auth, so we lean on the model's web_search over whatever is
// publicly indexed about the profile. If a genuine per-post crawler is ever
// needed, that is a separate hosted worker, not this route.

import { COMPLIANCE_PROMPT_RULE } from "@/lib/compliance-ai";
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

// A valid observe target must be a real http(s) URL with a proper host, so a
// bare keyword ("furen") or a hostless string ("http://furen") is rejected
// before it can be used as a loose web-search phrase. Returns the parsed URL,
// or null when the value is not a usable link.
export function parseObserveUrl(value: string): URL | null {
  const trimmed = value.trim();

  if (!/^https?:\/\//i.test(trimmed)) {
    return null;
  }

  try {
    const url = new URL(trimmed);

    if (url.protocol !== "http:" && url.protocol !== "https:") {
      return null;
    }

    // A genuine host has at least one dot (rejects "http://furen").
    if (!url.hostname.includes(".")) {
      return null;
    }

    return url;
  } catch {
    return null;
  }
}

export function isValidObserveUrl(value: string): boolean {
  return parseObserveUrl(value) !== null;
}

// The bare domain used to anchor and disambiguate the search ("www." dropped).
export function observeHostname(value: string): string {
  const url = parseObserveUrl(value);
  return url ? url.hostname.replace(/^www\./i, "") : "";
}

// A label for the competitor in the prompts: the typed name if given, else the
// domain, so an unnamed row still reads sensibly.
function observeLabel({ name, profileUrl }: CompetitorObserveInput): string {
  return name.trim() || observeHostname(profileUrl) || profileUrl;
}

// Anchor the web search to the exact domain the user entered, then reach that
// same organisation's official social accounts. This is the fix for the
// backwards behaviour: the old prompt was a loose keyword phrase, so a random
// word could match some organisation while a real URL cited nothing. Anchoring
// on the domain makes a real link the reliable input and blocks a similarly
// named different organisation from being substituted.
export function buildCompetitorObserveSearchInput(
  input: CompetitorObserveInput,
): string {
  const hostname = observeHostname(input.profileUrl);
  const named = input.name.trim() ? ` (known as "${input.name.trim()}")` : "";

  return [
    `Identify the specific organisation whose official website is ${input.profileUrl}${named}.`,
    `Confirm the organisation from that exact domain, ${hostname}. Then find that same organisation's official social media accounts (Instagram, TikTok, Facebook, YouTube, LinkedIn) that are linked from or clearly belong to ${hostname}.`,
    "From those specific, verified sources only, observe: the content formats they post (for example short video, reels, carousels, live, long-form), how often and when they post, their tone of voice, and their observable strengths.",
    `Only report what these sources actually show, and do not guess private analytics. Do not report on a different organisation that merely has a similar name. If the organisation cannot be confirmed from ${hostname}, say that nothing could be confirmed and report no findings.`,
  ].join(" ");
}

export function buildCompetitorObserveSystemPrompt(): string {
  return [
    "You are a competitive intelligence analyst for a private college in Singapore.",
    "You observe a competitor's public social media behaviour from web search findings and summarise it for a human Marketing Manager to review and edit. You never act on it yourself.",
    "Ground every field strictly in the provided search findings and their cited pages. Do not invent formats, numbers, or strengths that the findings do not support. If something cannot be observed, leave that field empty (empty string or empty array).",
    COMPLIANCE_PROMPT_RULE + " Keep observations neutral.",
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
    `Summarise the public social media behaviour of "${observeLabel(input)}" (${input.profileUrl}) from these findings.`,
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

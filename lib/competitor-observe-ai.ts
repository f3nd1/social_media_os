// Prompt building and output mapping for observing a competitor from a public
// profile/website link. Mostly pure helpers, no network, with one exception:
// scrapeHomepageSocialLinks fetches the competitor's own homepage to read its
// footer/header social links directly, since that is a more trustworthy source
// than a model's web search guessing at profile urls.
//
// ponytail: the web-search half of this is not a real social scraper. Public
// platforms (Instagram, TikTok, etc.) block automated crawling and hide most
// content behind auth, so we lean on the model's web_search over whatever is
// publicly indexed about the profile. If a genuine per-post crawler is ever
// needed, that is a separate hosted worker, not this route.

import { COMPLIANCE_PROMPT_RULE } from "@/lib/compliance-ai";
import type { WebSearchCitation } from "@/lib/openai-shared";
import { platforms, type Platform } from "@/lib/social-calendar-data";
import { dropSharedProfileUrls } from "@/lib/utils";

export type CompetitorObserveInput = {
  name: string;
  profileUrl: string;
};

export type ObservedPlatform = { name: string; url: string };

export type CompetitorObserveDraft = {
  platforms: ObservedPlatform[];
  contentFormats: string[];
  postingFrequency: string;
  tone: string;
  observedStrengths: string[];
  background: string;
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

// A label for the competitor: the typed name if given, else the domain, so an
// unnamed row still reads sensibly. Used in prompts and reused client-side for
// the human-readable observe result messages.
export function observeLabel({ name, profileUrl }: CompetitorObserveInput): string {
  return name.trim() || observeHostname(profileUrl) || profileUrl;
}

// Observe runs two separate, focused web searches rather than one combined
// prompt. In production, a single prompt that asked for both social behaviour
// AND background/sentiment reliably returned the easy, well-indexed background
// sources (encyclopedic, review sites) and never surfaced the org's actual
// social feeds, leaving the five behaviour fields empty. Splitting the ask
// gives platform discovery its own dedicated search turn so those fields have a
// chance of real source material. Both feed one synthesis step.

// Search 1: the org's OWN social profile pages, with explicit per-platform
// phrasing so the model runs targeted profile searches rather than settling for
// general pages about the org.
export function buildCompetitorSocialSearchInput(
  input: CompetitorObserveInput,
): string {
  const hostname = observeHostname(input.profileUrl);
  const label = observeLabel(input);
  const named = input.name.trim() ? ` (known as "${input.name.trim()}")` : "";

  return [
    `Identify the specific organisation whose official website is ${input.profileUrl}${named}, confirmed from the exact domain ${hostname}.`,
    `Find that same organisation's OWN official social media profile pages. Search specifically for their accounts on each of these platforms: TikTok, Instagram, YouTube, LinkedIn, Facebook, X/Twitter, Threads. For example look for "${label} Instagram", "${label} TikTok", site:instagram.com ${label}, site:tiktok.com ${label}, site:facebook.com ${label}, site:linkedin.com ${label}, and any social links on ${hostname} itself.`,
    "From those specific profile pages only, observe: which platforms they are genuinely and currently active on (with the profile url for each), the content formats they post (for example short video, reels, carousels, live, long-form), how often and when they post, their tone of voice, and their observable strengths.",
    `Only report what the actual profile pages show. Do not guess posting behaviour you cannot see, and do not report on a different organisation that merely has a similar name. If no official social profiles for ${hostname} can be found, say so and report no social findings.`,
  ].join(" ");
}

// Search 2: general background and public sentiment about the organisation.
export function buildCompetitorBackgroundSearchInput(
  input: CompetitorObserveInput,
): string {
  const hostname = observeHostname(input.profileUrl);
  const named = input.name.trim() ? ` (known as "${input.name.trim()}")` : "";

  return [
    `Identify the specific organisation whose official website is ${input.profileUrl}${named}, confirmed from the exact domain ${hostname}.`,
    "Research general background on the organisation itself: what it teaches or offers, its approximate size or scale if mentioned (for example student numbers, campus count, years established), and general public sentiment if anything is found, such as reviews or commonly repeated praise or complaints.",
    `Only report what the sources actually show. Do not invent sentiment that is not there, and do not report on a different organisation that merely has a similar name. If the organisation cannot be confirmed from ${hostname}, say that nothing could be confirmed and report no findings.`,
  ].join(" ");
}

export function buildCompetitorObserveSystemPrompt(): string {
  return [
    "You are a competitive intelligence analyst for a private college in Singapore.",
    "You observe a competitor's public social media behaviour and general background from web search findings and summarise it for a human Marketing Manager to review and edit. You never act on it yourself.",
    "Ground every field strictly in the provided search findings and their cited pages. Do not invent platforms, formats, numbers, strengths, or sentiment that the findings do not support. If something cannot be observed, leave that field empty (empty string or empty array).",
    `Only include a platform in the platforms list if the sources genuinely show that account is active, using exactly these names where applicable: ${platforms.join(", ")}. Never guess a platform just because it is common for this kind of organisation.`,
    "The background field is a short, factual summary only: what the organisation teaches or offers, its approximate size or scale if mentioned, and general public sentiment if genuinely found. If the sources give nothing solid for this, leave background as an empty string rather than guessing.",
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
    platforms: [
      {
        name: `string, one of exactly: ${platforms.join(", ")}, genuinely active`,
        url: "string, the official public profile url on that platform if a cited source shows one, otherwise an empty string. Never invent a url.",
      },
    ],
    contentFormats: ["string, a content format actually observed"],
    postingFrequency: "string, how often/when they post, in plain words",
    tone: "string, the observed tone of voice",
    observedStrengths: ["string, a strength supported by the findings"],
    background:
      "string, 2-3 sentences on what they teach/offer, approximate size or scale if mentioned, and general public sentiment if found; empty string if nothing solid was found",
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

// Pull a platform name and optional url out of one raw entry. Normally this is
// the structured { name, url } object the model was asked for, but a model can
// ignore the shape and emit a markdown string like "* [Instagram](https://...)"
// or put markdown in the name; we extract the real name and url from that
// rather than let the literal markdown reach the UI.
const MARKDOWN_LINK = /\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/i;

function parsePlatformEntry(entry: unknown): { name: string; url: string } {
  if (typeof entry === "string") {
    const md = entry.match(MARKDOWN_LINK);
    if (md) {
      return { name: md[1].trim(), url: md[2].trim() };
    }
    return { name: entry.replace(/^[\s*\-•]+/, "").trim(), url: "" };
  }
  if (entry && typeof entry === "object") {
    const rawName = typeof (entry as { name?: unknown }).name === "string" ? (entry as { name: string }).name : "";
    const rawUrl = typeof (entry as { url?: unknown }).url === "string" ? (entry as { url: string }).url.trim() : "";
    const md = rawName.match(MARKDOWN_LINK);
    if (md) {
      return { name: md[1].trim(), url: rawUrl || md[2].trim() };
    }
    return { name: rawName.trim(), url: rawUrl };
  }
  return { name: "", url: "" };
}

// Only exact, known platform names survive (the model is told the exact list,
// so no alias tolerance is needed, only a defensive filter against invented
// values), and a url is kept only when it is a genuine http(s) link so a
// fabricated profile link is never passed to the client. A url shared across
// two or more platforms (the org homepage, not a real profile) is dropped.
function toObservedPlatforms(value: unknown): ObservedPlatform[] {
  if (!Array.isArray(value)) {
    return [];
  }
  const seen = new Set<Platform>();
  const collected: ObservedPlatform[] = [];

  for (const entry of value) {
    const { name, url } = parsePlatformEntry(entry);
    if (!(platforms as readonly string[]).includes(name) || seen.has(name as Platform)) {
      continue;
    }
    seen.add(name as Platform);
    collected.push({ name, url: /^https?:\/\//i.test(url) ? url : "" });
  }

  return dropSharedProfileUrls(collected);
}

// Clean the model's draft into safe competitor fields.
export function sanitizeCompetitorObserveDraft(
  draft: CompetitorObserveDraft,
): CompetitorObserveDraft {
  return {
    platforms: toObservedPlatforms(draft?.platforms),
    contentFormats: toStringList(draft?.contentFormats),
    postingFrequency:
      typeof draft?.postingFrequency === "string" ? draft.postingFrequency.trim() : "",
    tone: typeof draft?.tone === "string" ? draft.tone.trim() : "",
    observedStrengths: toStringList(draft?.observedStrengths),
    background: typeof draft?.background === "string" ? draft.background.trim() : "",
  };
}

// ---------------------------------------------------------------------------
// Homepage scrape: a third, more trustworthy source for social profile links.
// A footer/header link on the org's own homepage pointing straight at a known
// platform domain is sourced directly from the org, not inferred by a model.
// ---------------------------------------------------------------------------

// Hostname suffixes for each platform. Matched against the resolved anchor's
// hostname (a subdomain like "www.instagram.com" or "m.facebook.com" still
// matches), never against arbitrary substrings of the full url.
const PLATFORM_DOMAINS: Array<{ suffixes: string[]; name: Platform }> = [
  { suffixes: ["instagram.com"], name: "Instagram" },
  { suffixes: ["tiktok.com"], name: "TikTok" },
  { suffixes: ["youtube.com", "youtu.be"], name: "YouTube Shorts" },
  { suffixes: ["linkedin.com"], name: "LinkedIn" },
  { suffixes: ["facebook.com", "fb.com"], name: "Facebook" },
  { suffixes: ["x.com", "twitter.com"], name: "X/Twitter" },
  { suffixes: ["threads.net"], name: "Threads" },
  { suffixes: ["pinterest.com", "pin.it"], name: "Pinterest" },
  { suffixes: ["reddit.com", "redd.it"], name: "Reddit" },
];

function matchPlatformDomain(hostname: string): Platform | null {
  const host = hostname.toLowerCase().replace(/^www\./, "");
  for (const { suffixes, name } of PLATFORM_DOMAINS) {
    if (suffixes.some((suffix) => host === suffix || host.endsWith(`.${suffix}`))) {
      return name;
    }
  }
  return null;
}

// A share-widget link (for example a "Share on Facebook" button) points at the
// platform's domain but is not the org's own profile, so it must never be
// mistaken for one. Matched against the path/query of the resolved url.
const SHARE_WIDGET_PATTERN =
  /\/(sharer|share|share\.php|sharer\.php|intent)(\/|\.php|\?|$)/i;

const HREF_ATTR = /<a\s+[^>]*?href\s*=\s*["']([^"']+)["'][^>]*>/gi;

// Extract genuine social profile links from raw homepage HTML. Pure, no
// network. Only accepts an href that literally appears in the HTML, resolved
// against baseUrl; never constructs or guesses a url. Excludes share-widget
// links and bare domain-root links (no path), neither of which is a real
// profile. Multiple links to the same platform keep the first found.
export function extractSocialLinksFromHtml(html: string, baseUrl: string): ObservedPlatform[] {
  const seen = new Set<Platform>();
  const result: ObservedPlatform[] = [];

  for (const match of html.matchAll(HREF_ATTR)) {
    const rawHref = match[1].trim();
    if (!rawHref || rawHref.startsWith("#")) {
      continue;
    }

    let resolved: URL;
    try {
      resolved = new URL(rawHref, baseUrl);
    } catch {
      continue;
    }

    if (resolved.protocol !== "http:" && resolved.protocol !== "https:") {
      continue;
    }

    const name = matchPlatformDomain(resolved.hostname);
    if (!name || seen.has(name)) {
      continue;
    }

    if (SHARE_WIDGET_PATTERN.test(resolved.pathname)) {
      continue;
    }

    // A bare domain root (no path beyond "/") is not a specific profile.
    if (resolved.pathname === "" || resolved.pathname === "/") {
      continue;
    }

    seen.add(name);
    result.push({ name, url: resolved.toString() });
  }

  return result;
}

// Fetch the competitor's own homepage and pull out its real social links.
// Never throws and never surfaces an error: any failure (network error,
// timeout, non-2xx, no readable body) simply resolves to an empty list, so the
// caller can fall through to the search-based findings with nothing shown to
// the user.
export async function scrapeHomepageSocialLinks(profileUrl: string): Promise<ObservedPlatform[]> {
  try {
    const response = await fetch(profileUrl, {
      signal: AbortSignal.timeout(6000),
      headers: { "User-Agent": "Mozilla/5.0 (compatible; UCC-Marketing-OS/1.0)" },
    });

    if (!response.ok) {
      return [];
    }

    const html = await response.text();
    // A defensive cap, not a streaming limit: a normal homepage is well under
    // this, and a pathological page should not make the regex scan unbounded.
    const truncated = html.length > 2_000_000 ? html.slice(0, 2_000_000) : html;

    return extractSocialLinksFromHtml(truncated, profileUrl);
  } catch {
    return [];
  }
}

// Merge homepage-scraped platforms into the search/synthesis-derived list. The
// homepage-scraped url wins for a platform found by both (it is sourced
// directly from the org, not inferred), a platform found only by one source is
// kept as-is, and the result runs through dropSharedProfileUrls once more as a
// final safety net.
export function mergeScrapedPlatforms(
  searchPlatforms: ObservedPlatform[],
  scrapedPlatforms: ObservedPlatform[],
): ObservedPlatform[] {
  const scrapedByName = new Map(scrapedPlatforms.map((platform) => [platform.name, platform]));
  const seen = new Set<string>();
  const merged: ObservedPlatform[] = [];

  for (const platform of searchPlatforms) {
    seen.add(platform.name);
    merged.push(scrapedByName.get(platform.name) ?? platform);
  }
  for (const platform of scrapedPlatforms) {
    if (!seen.has(platform.name)) {
      seen.add(platform.name);
      merged.push(platform);
    }
  }

  return dropSharedProfileUrls(merged);
}

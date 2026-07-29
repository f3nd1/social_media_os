// Social listening source expansion (Module D3), built around the
// open-source last30days skill (https://github.com/mvanhorn/last30days-skill,
// MIT licence, Copyright (c) 2026 Matt Van Horn). Pure helpers, no network:
// the server route runs the tool as a subprocess with --emit=json and these
// helpers turn its export into the same ListeningPost shape the rest of the
// listening pipeline already speaks. No insight without evidence.

// Relative rather than the usual "@/lib/..." alias so scripts/check-last30days.ts
// can run this file directly under node --experimental-strip-types, which does
// not resolve tsconfig path aliases. Next.js resolves both forms identically.
import { sourceFromUrl, type ListeningPost } from "./listening-ai.ts";

// One entry from the tool's results[] array. Every field beyond the ones we
// read is deliberately omitted: candidate_id, engagement and cluster are real
// parts of the schema that this pipeline has no use for, and reading fields we
// do not need would invite them to drift.
type Last30DaysResult = {
  title?: string;
  source?: string;
  url?: string;
  published_at?: string;
  summary?: string;
  relevance_score?: number;
};

// The top level of a --emit=json export (schema_version 1.2).
export type Last30DaysExport = {
  schema_version?: string;
  query?: string;
  window_days?: number;
  source_status?: Record<string, string>;
  results?: Last30DaysResult[];
};

// The tool's own source ids, mapped to the labels this app already shows for
// the same platform, so a Reddit post fetched by this tool and one fetched by
// sc-research read identically in the evidence list. Anything not listed here
// falls through to its raw id, which is honest if less tidy.
const SOURCE_LABELS: Record<string, string> = {
  bluesky: "Bluesky",
  github: "GitHub",
  grounding: "Public web",
  hackernews: "Hacker News",
  instagram: "Instagram",
  linkedin: "LinkedIn",
  perplexity: "Public web",
  pinterest: "Pinterest",
  polymarket: "Polymarket",
  reddit: "Reddit",
  stocktwits: "StockTwits",
  techmeme: "Techmeme",
  threads: "Threads",
  tiktok: "TikTok",
  web: "Public web",
  x: "X",
  youtube: "YouTube",
};

// No single source may contribute more than this many posts. The route caps
// total evidence at 60 posts before synthesis, so without a per-source limit a
// chatty source (Hacker News and StockTwits are both high volume and rarely
// on-topic for a Singapore college) could fill the whole budget and starve the
// Reddit and YouTube comments that carry the real sentiment. Twelve leaves room
// for at least five sources in a full 60.
export const LAST30DAYS_PER_SOURCE_CAP = 12;

// Matches the 600 character trim normalizeResearchFile already applies to
// sc-research posts, so evidence from either tool is the same shape.
const MAX_POST_CHARACTERS = 600;

// Statuses meaning the tool never attempted a source, almost always because it
// has no credentials for it. Reporting these as "returned nothing this run"
// would tell a manager a source came back empty when it was never asked, which
// is exactly the overstatement this app exists to avoid. Bluesky is the live
// example: it is deliberately not configured, so it must stay silent rather
// than read as a failure. The tool's status vocabulary is not fully documented,
// so anything unrecognised is still treated as a real degradation. Over
// reporting a genuine problem is the safer error here than hiding one.
const NOT_ATTEMPTED_STATUSES = new Set([
  "disabled",
  "missing_key",
  "not_configured",
  "skipped",
  "unconfigured",
]);

// The tool writes its export to stdout, but is free to print a banner or
// progress line first. Rather than assume stdout is pure JSON, take the widest
// {...} span and parse that. Returns null on anything unparseable, because a
// run that produced no readable export must mean fewer posts, never a crash.
export function extractJsonObject(stdout: string): Last30DaysExport | null {
  const trimmed = stdout.trim();

  if (!trimmed) {
    return null;
  }

  const first = trimmed.indexOf("{");
  const last = trimmed.lastIndexOf("}");

  if (first === -1 || last <= first) {
    return null;
  }

  try {
    return JSON.parse(trimmed.slice(first, last + 1)) as Last30DaysExport;
  } catch {
    return null;
  }
}

function labelForSource(source: string, url: string): string {
  const key = source.trim().toLowerCase();

  // Reddit is the one source worth deriving from the url instead of the id:
  // sourceFromUrl pulls the actual subreddit ("r/singapore"), which is what the
  // existing evidence list shows and is far more useful to a manager than a
  // flat "Reddit".
  if (key === "reddit" && url) {
    const derived = sourceFromUrl(url);

    if (derived.startsWith("r/")) {
      return derived;
    }
  }

  return SOURCE_LABELS[key] ?? (source.trim() || "web");
}

// Highest relevance first. Results with no score sort last rather than being
// treated as perfectly relevant, so a source that omits the field cannot jump
// the queue ahead of one that genuinely scored well.
function byRelevanceDescending(a: Last30DaysResult, b: Last30DaysResult): number {
  return (b.relevance_score ?? -1) - (a.relevance_score ?? -1);
}

export function normaliseLast30DaysExport(
  raw: Last30DaysExport,
  perSourceCap: number = LAST30DAYS_PER_SOURCE_CAP,
): {
  posts: ListeningPost[];
  windowDays: number;
  // Sources the tool reported as anything other than ok, so the UI can say
  // which ones were quiet instead of implying every source was searched.
  degradedSources: string[];
} {
  const results = Array.isArray(raw.results) ? raw.results : [];

  // A result with neither text nor a link is not evidence a manager can check,
  // so it is dropped rather than shown as an unverifiable quote.
  const usable = results.filter((result) => {
    const text = (result.summary ?? result.title ?? "").trim();
    return Boolean(text) && Boolean(result.url?.trim());
  });

  const perSource = new Map<string, Last30DaysResult[]>();

  for (const result of usable) {
    const key = (result.source ?? "web").trim().toLowerCase() || "web";
    const bucket = perSource.get(key);

    if (bucket) {
      bucket.push(result);
    } else {
      perSource.set(key, [result]);
    }
  }

  const capped: Last30DaysResult[] = [];

  for (const bucket of perSource.values()) {
    capped.push(...[...bucket].sort(byRelevanceDescending).slice(0, perSourceCap));
  }

  const posts = capped.sort(byRelevanceDescending).map((result) => {
    const url = result.url!.trim();

    return {
      text: (result.summary ?? result.title ?? "").trim().slice(0, MAX_POST_CHARACTERS),
      source: labelForSource(result.source ?? "", url),
      url,
      date: (result.published_at ?? "").slice(0, 10),
    };
  });

  const status = raw.source_status ?? {};
  const degradedSources = Object.keys(status)
    .filter((source) => {
      const value = (status[source] ?? "").trim().toLowerCase();
      return value !== "ok" && !NOT_ATTEMPTED_STATUSES.has(value);
    })
    .map((source) => labelForSource(source, ""))
    .sort();

  return {
    posts,
    windowDays: typeof raw.window_days === "number" ? raw.window_days : 0,
    degradedSources: [...new Set(degradedSources)],
  };
}

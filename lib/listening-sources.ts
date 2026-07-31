// Which sources a Social Listening run should search (Module D3).
//
// Pure catalogue and mapping, no network. The manager picks source chips on the
// screen; this file turns that choice into the arguments each of the four
// search engines actually understands:
//
//   sc-research   --source=reddit         (Reddit, real comment text, free)
//   the app       YouTube Data API        (YouTube comments)
//   the app       ScrapeCreators directly (Instagram hashtag search)
//   OpenAI        web_search              (public web, titles only)
//   last30days    --search <comma list>   (TikTok, Instagram, Threads, LinkedIn)
//
// X/Twitter listening (sc-research --source=x, billed through the xAI key) has
// been removed on cost grounds: it is the one engine here that is not free,
// and the decision was to stop paying for it rather than gate it behind a key
// check like the others. Pinterest has been removed because it was never a
// plausible place to hear from a prospective Singapore college student; ignore
// it entirely rather than leave a chip nobody should tick.
//
// Nothing here needs a redeploy to change: --search is a per-invocation flag
// and beats the tool's LAST30DAYS_DEFAULT_SEARCH env var, so a manager can
// narrow a search from the UI on any given run.

export type ListeningSourceId =
  | "reddit"
  | "youtube"
  | "web"
  | "tiktok"
  | "instagram"
  | "threads"
  | "linkedin";

// The Settings key a source cannot work without, if any.
type RequiredKey = "youtubeApiKey" | "scrapeCreatorsApiKey";

export type ListeningSourceOption = {
  id: ListeningSourceId;
  label: string;
  requiresKey?: RequiredKey;
  // Shown on the disabled chip so a manager can see why it is unavailable
  // rather than ticking it and silently getting nothing back.
  missingKeyReason?: string;
};

// Deliberately omits Hacker News, GitHub, StockTwits, Polymarket, arXiv and
// Techmeme. last30days can search them and they cost nothing, but none is a
// plausible place to hear from a prospective Singapore college student, and a
// chip each would be clutter for sources nobody should tick. Because the app
// now always passes an explicit --search list, they are simply never requested.
export const LISTENING_SOURCES: ListeningSourceOption[] = [
  { id: "reddit", label: "Reddit" },
  {
    id: "youtube",
    label: "YouTube",
    requiresKey: "youtubeApiKey",
    missingKeyReason: "Needs a YouTube Data API key in Settings",
  },
  { id: "web", label: "Public web" },
  {
    id: "tiktok",
    label: "TikTok",
    requiresKey: "scrapeCreatorsApiKey",
    missingKeyReason: "Needs a ScrapeCreators API key in Settings",
  },
  {
    id: "instagram",
    label: "Instagram",
    requiresKey: "scrapeCreatorsApiKey",
    missingKeyReason: "Needs a ScrapeCreators API key in Settings",
  },
  {
    id: "threads",
    label: "Threads",
    requiresKey: "scrapeCreatorsApiKey",
    missingKeyReason: "Needs a ScrapeCreators API key in Settings",
  },
  {
    id: "linkedin",
    label: "LinkedIn",
    requiresKey: "scrapeCreatorsApiKey",
    missingKeyReason: "Needs a ScrapeCreators API key in Settings",
  },
];

// Sources reached through the last30days tool. Reddit and YouTube are
// deliberately absent even though the tool can also fetch them: the dedicated
// engines return real comment threads rather than summaries, and asking both
// for the same platform meant paying twice for posts that were then merged
// away by dedupeByUrl.
const LAST30DAYS_SOURCE_IDS = new Set<ListeningSourceId>([
  "tiktok",
  "instagram",
  "threads",
  "linkedin",
]);

const ALL_SOURCE_IDS = new Set<string>(LISTENING_SOURCES.map((source) => source.id));

export function isListeningSourceId(value: unknown): value is ListeningSourceId {
  return typeof value === "string" && ALL_SOURCE_IDS.has(value);
}

// Which chips the manager can actually tick, given the keys in Settings.
// Availability is judged on keys alone: whether the last30days tool is
// installed on the server is not knowable from the browser, and a run with the
// tool missing already degrades quietly and reports it honestly.
export function availableListeningSources(keys: {
  youtubeApiKey?: string;
  scrapeCreatorsApiKey?: string;
}): ListeningSourceId[] {
  return LISTENING_SOURCES.filter((source) => {
    if (!source.requiresKey) {
      return true;
    }

    return Boolean(keys[source.requiresKey]?.trim());
  }).map((source) => source.id);
}

// The set to actually search. An absent stored value means every available
// source, so workspaces saved before this feature existed keep behaving exactly
// as they did, and a source added later is picked up automatically instead of
// being missing from a list frozen at upgrade time.
//
// An explicitly empty selection is NOT treated as "everything": the screen
// blocks the search instead, because unticking all nine chips and then getting
// all nine results would be a genuinely confusing thing to do to someone.
export function resolveListeningSources(
  stored: string[] | undefined,
  available: ListeningSourceId[],
): ListeningSourceId[] {
  if (!Array.isArray(stored)) {
    return available;
  }

  const availableSet = new Set(available);

  // Drop anything stored but no longer usable, for example a TikTok selection
  // kept from when a ScrapeCreators key was present and has since been removed.
  return stored.filter(
    (id): id is ListeningSourceId => isListeningSourceId(id) && availableSet.has(id),
  );
}

// Human-readable names for a selection, for the "we searched X, Y, Z" lines.
// Order follows the catalogue rather than the order the ids arrived in, so the
// wording is stable between runs.
export function listeningSourceLabels(selected: ListeningSourceId[]): string[] {
  const chosen = new Set<ListeningSourceId>(selected);
  return LISTENING_SOURCES.filter((source) => chosen.has(source.id)).map(
    (source) => source.label,
  );
}

// Total posts the analysis step receives. The route trims to this after merging
// and deduplicating, so it is the real evidence budget for a run.
export const LISTENING_EVIDENCE_BUDGET = 60;

// How many posts one source may contribute, given how many were picked.
// A fixed cap of 12 made sense when everything ran at once, but with source
// selection it became a bug: a TikTok-only search fetched 60 slots of budget
// and then threw away everything past the twelfth, so narrowing the search
// narrowed the evidence too. Sharing the budget out keeps the anti-crowding
// property when several sources run and lifts it when only one does. The floor
// stops a nine-source search starving any single one.
export function listeningPerSourceCap(selectedCount: number): number {
  return Math.max(8, Math.ceil(LISTENING_EVIDENCE_BUDGET / Math.max(1, selectedCount)));
}

// sc-research also supports X via the xAI key, but that leg has been removed
// on cost grounds (see the file header), so this now only ever spawns the tool
// for Reddit. Null means Reddit is not selected and the subprocess should not
// be spawned at all, which is where most of the time saving comes from on a
// narrow search.
export function scResearchSourceArg(selected: ListeningSourceId[]): "reddit" | null {
  return selected.includes("reddit") ? "reddit" : null;
}

// The --search value for last30days, or null when nothing it covers is
// selected, in which case the subprocess is skipped entirely.
export function last30daysSearchArg(selected: ListeningSourceId[]): string | null {
  const ids = selected.filter((id) => LAST30DAYS_SOURCE_IDS.has(id));
  return ids.length > 0 ? ids.join(",") : null;
}

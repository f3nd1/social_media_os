"use client";

// Trending now. What YouTube itself reports as popular right now, with no
// keyword from us at all and no configuration screen in front of it.
//
// Kept separate from Discover on purpose. Discover reads terms out of the
// workspace, so it can only find more about courses and competitors already
// on file. This asks YouTube what is moving, which can surface something
// nobody here thought to search for.
//
// There used to be a second source here (TikTok's hashtag ranking) and a row
// of country/industry/category/window controls in front of both. TikTok's
// ranking page was taken down by the vendor (three separate live checks got
// the identical error, so it is removed rather than kept as a permanently
// failing button), and the replacement YouTube source, ScrapeCreators'
// Trending Shorts endpoint, takes no country or category parameter at all:
// it is one global chart. Offering a country picker over a global chart
// would be showing a filter that does nothing, so this panel has none. It
// simply loads the chart as soon as it is opened.

import { useEffect, useState } from "react";

import { Flame, Loader2, Trash2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { apiUrl } from "@/lib/base-path";
import { type TrendingVideo } from "@/lib/trending";
import { formatDisplayDate, readJsonResponse } from "@/lib/utils";

function countLabel(value: number | null): string {
  return typeof value === "number" ? value.toLocaleString("en-GB") : "not reported";
}

type Leg = {
  state: "idle" | "running" | "done" | "failed" | "no-key";
  rows: TrendingVideo[];
  error: string;
};

const IDLE: Leg = { state: "idle", rows: [], error: "" };

// "trending" is the order ScrapeCreators returned, which is YouTube's own
// chart ranking rather than a view-count ordering: a video climbing fast today
// can sit above an older one with more total views. Both orderings answer a
// real question, so the control names which is which instead of silently
// picking one.
type SortBy = "views-desc" | "views-asc" | "trending";

const SORT_OPTIONS: Array<{ value: SortBy; label: string }> = [
  { value: "views-desc", label: "Most viewed first" },
  { value: "views-asc", label: "Fewest viewed first" },
  { value: "trending", label: "YouTube trending order" },
];

// Sorts a copy, never the state array. Videos whose uploader hides the count
// come back as null and always sink to the bottom in both directions: a hidden
// count is not zero views, and sorting it as though it were would rank a video
// nobody can measure below one that genuinely nobody watched.
function sortRows(rows: TrendingVideo[], sortBy: SortBy): TrendingVideo[] {
  if (sortBy === "trending") {
    return rows;
  }

  return [...rows].sort((a, b) => {
    if (a.views === null && b.views === null) {
      return 0;
    }

    if (a.views === null) {
      return 1;
    }

    if (b.views === null) {
      return -1;
    }

    return sortBy === "views-desc" ? b.views - a.views : a.views - b.views;
  });
}

export function TrendingNowPanel({
  scrapeCreatorsApiKey,
  onResearch,
  busy,
}: {
  scrapeCreatorsApiKey: string;
  // Hands a term to Social Listening below. The only bridge between the two:
  // a trending video is a lead, not a finding, and it becomes evidence only
  // once a real search has been run on it and a human has accepted the
  // result.
  onResearch: (topic: string) => void;
  busy: boolean;
}) {
  const [youtube, setYoutube] = useState<Leg>(IDLE);
  // The list before the last delete, so both Delete and Delete all can be
  // taken back. Worth having even though nothing here is stored: these rows
  // are held in component state only, so the only other way back is Refresh,
  // and that spends another ScrapeCreators request. One level is enough; this
  // is a scratch list, not a record.
  const [undoRows, setUndoRows] = useState<TrendingVideo[] | null>(null);
  const [sortBy, setSortBy] = useState<SortBy>("views-desc");
  const hasKey = Boolean(scrapeCreatorsApiKey.trim());

  // Removing a row here is not the app's usual delete. These are raw trending
  // items that live in this component's state for the length of the visit:
  // they are not saved findings, they are not in the workspace document, and
  // they write nothing to the approvals log. So there is no audit trail to
  // protect and no soft-delete or confirmation dialog to justify. Hiding a row
  // is a display choice, and Undo puts it straight back.
  function dropRows(keep: (row: TrendingVideo) => boolean) {
    setUndoRows(youtube.rows);
    setYoutube({ ...youtube, rows: youtube.rows.filter(keep) });
  }

  async function run() {
    if (!hasKey) {
      setYoutube({ state: "no-key", rows: [], error: "" });
      return;
    }

    setYoutube({ state: "running", rows: [], error: "" });
    // A fresh chart makes the previous list meaningless, so the undo goes with
    // it rather than sitting there ready to restore rows from an older fetch.
    setUndoRows(null);

    try {
      const response = await fetch(apiUrl("/api/trending"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scrapeCreatorsApiKey }),
      });

      const result = await readJsonResponse<
        { ok: true; videos: TrendingVideo[] } | { ok: false; error: string }
      >(response, "read the trending list", "Try again in a moment.");

      if (!result.ok) {
        setYoutube({ state: "failed", rows: [], error: result.error });
        return;
      }

      setYoutube({ state: "done", rows: result.videos, error: "" });
    } catch (caught) {
      setYoutube({
        state: "failed",
        rows: [],
        error: caught instanceof Error ? caught.message : String(caught),
      });
    }
  }

  // Loads the moment the panel is seen. No button press, no country or
  // category to pick first: this is the whole point of the feature.
  useEffect(() => {
    if (hasKey) {
      void run();
    } else {
      setYoutube(IDLE);
    }
    // Re-run only when the key itself changes (e.g. added in Settings while
    // this panel is open); a manual "Refresh" below covers everything else.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasKey]);

  return (
    <Card>
      <CardHeader className="flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <Flame className="h-5 w-5" />
          <p className="text-sm font-semibold">Trending now</p>
          <Badge variant="outline">No keyword needed</Badge>
        </div>
        <p className="text-xs leading-5 text-muted-foreground">
          YouTube&rsquo;s own Shorts trending chart, read the moment this
          panel opens, with nothing seeded from your courses, competitors or
          audience notes. This is a single global chart, not a Singapore or
          education-specific one: the vendor endpoint that reads it without a
          Google API key takes no country or category setting, so there is
          nothing here to configure.
        </p>
      </CardHeader>

      <CardContent className="space-y-3">
        {youtube.state === "no-key" ? (
          <p className="rounded-md border border-dashed p-3 text-xs leading-5 text-muted-foreground">
            Add a ScrapeCreators API key in Settings to read YouTube Shorts
            trending.
          </p>
        ) : null}

        {youtube.state === "running" ? (
          <p className="flex items-center gap-2 text-xs text-muted-foreground">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            Reading the trending chart
          </p>
        ) : null}

        {youtube.state === "failed" ? (
          <div className="rounded-md border border-warning-border bg-warning p-3 text-xs leading-5 text-warning-foreground">
            {youtube.error}
          </div>
        ) : null}

        {youtube.state === "done" && youtube.rows.length === 0 ? (
          <p className="rounded-md border border-dashed p-3 text-xs leading-5 text-muted-foreground">
            {/* An emptied list and an empty chart are different facts, and
                saying the chart was empty when it was not would be wrong. */}
            {undoRows && undoRows.length > 0
              ? "You have cleared every video from this list. Undo puts them back, or Refresh reads the chart again."
              : "YouTube returned no videos on this chart right now."}
          </p>
        ) : null}

        {(youtube.state === "done" || youtube.state === "failed") && hasKey ? (
          <div className="flex flex-wrap items-center gap-2">
            <Button
              disabled={busy}
              onClick={() => void run()}
              size="sm"
              variant="outline"
              type="button"
            >
              <Flame className="h-4 w-4" />
              Refresh
            </Button>

            {youtube.rows.length > 0 ? (
              <>
                <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <span>Sort</span>
                  <select
                    className="h-8 rounded-md border border-input bg-background px-2 text-xs outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring"
                    disabled={busy}
                    onChange={(event) => setSortBy(event.target.value as SortBy)}
                    value={sortBy}
                  >
                    {SORT_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>

                <Button
                  className="ml-auto text-destructive hover:bg-destructive/10"
                  disabled={busy}
                  onClick={() => dropRows(() => false)}
                  size="sm"
                  type="button"
                  variant="ghost"
                >
                  <Trash2 className="h-4 w-4" />
                  Delete all {youtube.rows.length}
                </Button>
              </>
            ) : null}
          </div>
        ) : null}

        {undoRows ? (
          <div
            aria-live="polite"
            className="flex flex-wrap items-center gap-2 rounded-md border bg-muted/30 p-2 text-xs"
          >
            <span className="text-muted-foreground">
              {undoRows.length - youtube.rows.length}{" "}
              {undoRows.length - youtube.rows.length === 1 ? "video" : "videos"} hidden
              from this list. Nothing was saved or deleted from your workspace.
            </span>
            <Button
              className="h-6 px-2"
              onClick={() => {
                setYoutube((current) => ({ ...current, rows: undoRows }));
                setUndoRows(null);
              }}
              size="sm"
              type="button"
              variant="outline"
            >
              Undo
            </Button>
          </div>
        ) : null}

        {youtube.state === "done" && youtube.rows.length > 0 ? (
          <fieldset className="space-y-2" disabled={busy}>
            {sortRows(youtube.rows, sortBy).map((row) => (
              <div className="rounded-lg border p-3" key={row.url}>
                <a
                  className="text-sm font-medium underline underline-offset-2"
                  href={row.url}
                  rel="noreferrer"
                  target="_blank"
                >
                  {row.title}
                </a>
                <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  <span>{row.channel}</span>
                  <span aria-hidden>·</span>
                  <span>{countLabel(row.views)} views</span>
                  {row.publishedAt ? (
                    <>
                      <span aria-hidden>·</span>
                      <span>{formatDisplayDate(row.publishedAt)}</span>
                    </>
                  ) : null}
                  <Button
                    className="h-6 px-2"
                    disabled={busy}
                    onClick={() => onResearch(row.title)}
                    size="sm"
                    variant="ghost"
                  >
                    Research this
                  </Button>
                  <Button
                    aria-label={`Remove ${row.title} from this list`}
                    className="h-6 px-2 text-destructive hover:bg-destructive/10"
                    disabled={busy}
                    onClick={() => dropRows((entry) => entry.url !== row.url)}
                    size="sm"
                    variant="ghost"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Delete
                  </Button>
                </div>
              </div>
            ))}
          </fieldset>
        ) : null}

        {youtube.rows.length > 0 ? (
          <p className="text-xs leading-5 text-muted-foreground">
            A trending video is a lead, not evidence. Research this runs a
            real listening search on it below, and only an accepted result
            from that search reaches the Signal Board or any AI context.
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}

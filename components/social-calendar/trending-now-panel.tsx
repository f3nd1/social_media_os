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

import { Flame, Loader2 } from "lucide-react";

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
  const hasKey = Boolean(scrapeCreatorsApiKey.trim());

  async function run() {
    if (!hasKey) {
      setYoutube({ state: "no-key", rows: [], error: "" });
      return;
    }

    setYoutube({ state: "running", rows: [], error: "" });

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
            YouTube returned no videos on this chart right now.
          </p>
        ) : null}

        {(youtube.state === "done" || youtube.state === "failed") && hasKey ? (
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
        ) : null}

        {youtube.state === "done" && youtube.rows.length > 0 ? (
          <fieldset className="space-y-2" disabled={busy}>
            {youtube.rows.map((row) => (
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

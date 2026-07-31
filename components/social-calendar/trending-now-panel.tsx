"use client";

// Trending now. What the platforms say is popular right now, with no keyword
// from us at all.
//
// Kept separate from Discover on purpose. Discover reads terms out of the
// workspace, so it can only find more about courses and competitors already
// on file. This asks TikTok and YouTube what is moving, which can surface
// something nobody here thought to search for. The two answer different
// questions and are not interchangeable.

import { useState, type ReactNode } from "react";

import { Flame, Loader2, TrendingDown, TrendingUp } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { apiUrl } from "@/lib/base-path";
import {
  DEFAULT_TRENDING_COUNTRY,
  TIKTOK_INDUSTRIES,
  TIKTOK_PERIODS,
  TRENDING_COUNTRIES,
  YOUTUBE_CATEGORIES,
  tagToSearchTopic,
  trendingCountry,
  type TikTokPeriod,
  type TrendingTag,
  type TrendingVideo,
} from "@/lib/trending";
import { cn, formatDisplayDate, readJsonResponse } from "@/lib/utils";

function countLabel(value: number | null): string {
  return typeof value === "number" ? value.toLocaleString("en-GB") : "not reported";
}

// One leg's outcome. Held separately per source so a dead TikTok page cannot
// take the YouTube list down with it: before this, both shared one error slot
// and one results area, so whichever leg failed emptied the screen.
type Leg<T> = {
  state: "idle" | "running" | "done" | "failed" | "no-key" | "unsupported";
  rows: T[];
  error: string;
};

const IDLE: Leg<never> = { state: "idle", rows: [], error: "" };

// One source's outcome. Every state is spelled out rather than collapsing to
// "no results": a missing key, a country the source does not cover, an outage
// and a genuinely quiet week are four different answers and a manager needs to
// tell them apart.
function LegSection<T>({
  busy,
  children,
  emptyNote,
  leg,
  noKeyNote,
  title,
}: {
  busy: boolean;
  children: ReactNode;
  emptyNote: string;
  leg: Leg<T>;
  noKeyNote: string;
  title: string;
}) {
  if (leg.state === "idle") {
    return null;
  }

  return (
    <div className="space-y-2">
      <p className="text-xs font-medium uppercase text-muted-foreground">
        {title}
        {leg.state === "done" && leg.rows.length > 0 ? ` (${leg.rows.length})` : ""}
      </p>

      {leg.state === "running" ? (
        <p className="flex items-center gap-2 text-xs text-muted-foreground">
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          Reading
        </p>
      ) : null}

      {leg.state === "no-key" ? (
        <p className="rounded-md border border-dashed p-3 text-xs leading-5 text-muted-foreground">
          {noKeyNote}
        </p>
      ) : null}

      {leg.state === "unsupported" ? (
        <p className="rounded-md border border-dashed p-3 text-xs leading-5 text-muted-foreground">
          {leg.error}
        </p>
      ) : null}

      {leg.state === "failed" ? (
        <div className="rounded-md border border-warning-border bg-warning p-3 text-xs leading-5 text-warning-foreground">
          {leg.error}
        </div>
      ) : null}

      {leg.state === "done" && leg.rows.length === 0 ? (
        <p className="rounded-md border border-dashed p-3 text-xs leading-5 text-muted-foreground">
          {emptyNote}
        </p>
      ) : null}

      {leg.state === "done" && leg.rows.length > 0 ? (
        <fieldset className="space-y-2" disabled={busy}>
          {children}
        </fieldset>
      ) : null}
    </div>
  );
}

export function TrendingNowPanel({
  scrapeCreatorsApiKey,
  youtubeApiKey,
  onResearch,
  busy,
}: {
  scrapeCreatorsApiKey: string;
  youtubeApiKey: string;
  // Hands a term to Social Listening below. The only bridge between the two:
  // a trending tag is a lead, not a finding, and it becomes evidence only once
  // a real search has been run on it and a human has accepted the result.
  onResearch: (topic: string) => void;
  busy: boolean;
}) {
  const [country, setCountry] = useState(DEFAULT_TRENDING_COUNTRY);
  // Both on, so nothing changes until a source is actively turned off. Off
  // means the request is never made: the point of skipping TikTok is not
  // waiting on a page the vendor documents as liable to disappear.
  const [runTikTok, setRunTikTok] = useState(true);
  const [runYouTube, setRunYouTube] = useState(true);
  const [pickError, setPickError] = useState("");
  const [period, setPeriod] = useState<TikTokPeriod>(7);
  const [industry, setIndustry] = useState("education");
  const [categoryId, setCategoryId] = useState("27");
  const [newOnBoard, setNewOnBoard] = useState(false);
  const [tiktok, setTiktok] = useState<Leg<TrendingTag>>(IDLE);
  const [youtube, setYoutube] = useState<Leg<TrendingVideo>>(IDLE);
  const [credits, setCredits] = useState<{ charged: number | null; remaining: number | null } | null>(
    null,
  );

  const market = trendingCountry(country);
  const running = tiktok.state === "running" || youtube.state === "running";
  const hasTikTokKey = Boolean(scrapeCreatorsApiKey.trim());
  const hasYouTubeKey = Boolean(youtubeApiKey.trim());

  async function callLeg(source: "tiktok-hashtags" | "youtube-popular") {
    const response = await fetch(apiUrl("/api/trending"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        source,
        scrapeCreatorsApiKey,
        youtubeApiKey,
        country,
        period,
        industry,
        categoryId,
        newOnBoard,
      }),
    });

    return readJsonResponse<
      | {
          ok: true;
          tags?: TrendingTag[];
          videos?: TrendingVideo[];
          credits?: { charged: number | null; remaining: number | null } | null;
        }
      | { ok: false; error: string; sourceDown?: boolean; unsupportedCountry?: boolean }
    >(response, "read the trending list", "Try again in a moment.");
  }

  // Both legs, in parallel, each landing in its own slot. Deliberately not
  // Promise.all on a single state write: a rejected TikTok call must not stop
  // the YouTube list appearing, which is the whole point of splitting them.
  async function run() {
    // Matches the "pick at least one source" rule the listening chips already
    // use: unticking everything and then getting everything would be a
    // confusing thing to do to someone.
    if (!runTikTok && !runYouTube) {
      setPickError("Pick at least one source to read.");
      return;
    }

    setPickError("");
    setCredits(null);

    const tiktokRun = (async () => {
      // Not selected means not called. The leg is reset to idle so a result
      // from a previous run cannot linger and look like it came from this one.
      if (!runTikTok) {
        setTiktok(IDLE);
        return;
      }

      if (!market.tiktok) {
        setTiktok({
          state: "unsupported",
          rows: [],
          error: `TikTok does not publish a hashtag ranking for ${market.label}.`,
        });
        return;
      }

      if (!hasTikTokKey) {
        setTiktok({ state: "no-key", rows: [], error: "" });
        return;
      }

      setTiktok({ state: "running", rows: [], error: "" });

      try {
        const result = await callLeg("tiktok-hashtags");

        if (!result.ok) {
          setTiktok({
            state: result.unsupportedCountry ? "unsupported" : "failed",
            rows: [],
            error: result.error,
          });
          return;
        }

        setTiktok({ state: "done", rows: result.tags ?? [], error: "" });

        if (result.credits) {
          setCredits(result.credits);
        }
      } catch (caught) {
        setTiktok({
          state: "failed",
          rows: [],
          error: caught instanceof Error ? caught.message : String(caught),
        });
      }
    })();

    const youtubeRun = (async () => {
      if (!runYouTube) {
        setYoutube(IDLE);
        return;
      }

      if (!market.youtube) {
        setYoutube({
          state: "unsupported",
          rows: [],
          error: `YouTube does not publish a most-viewed chart for ${market.label}.`,
        });
        return;
      }

      if (!hasYouTubeKey) {
        setYoutube({ state: "no-key", rows: [], error: "" });
        return;
      }

      setYoutube({ state: "running", rows: [], error: "" });

      try {
        const result = await callLeg("youtube-popular");

        if (!result.ok) {
          setYoutube({
            state: result.unsupportedCountry ? "unsupported" : "failed",
            rows: [],
            error: result.error,
          });
          return;
        }

        setYoutube({ state: "done", rows: result.videos ?? [], error: "" });
      } catch (caught) {
        setYoutube({
          state: "failed",
          rows: [],
          error: caught instanceof Error ? caught.message : String(caught),
        });
      }
    })();

    await Promise.all([tiktokRun, youtubeRun]);
  }

  return (
    <Card>
      <CardHeader className="flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <Flame className="h-5 w-5" />
          <p className="text-sm font-semibold">Trending now</p>
          <Badge variant="outline">No keyword needed</Badge>
        </div>
        <p className="text-xs leading-5 text-muted-foreground">
          What the platforms themselves report as popular, with nothing seeded
          from your courses, competitors or audience notes. Only two sources can
          honestly do this. TikTok publishes a hashtag ranking that filters by
          country and industry at source, and YouTube publishes a most-viewed
          chart per country. Both are read in one go, so if one is unavailable
          the other still shows. Instagram Reels trending, YouTube Shorts
          trending and TikTok&rsquo;s For You feed are deliberately not here:
          they take no country or category setting at all, so there is no honest
          way to call them local or education.
        </p>
      </CardHeader>

      <CardContent className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-medium uppercase text-muted-foreground">
            Sources to read
          </span>
          {[
            { on: runTikTok, set: setRunTikTok, label: "TikTok hashtags" },
            { on: runYouTube, set: setRunYouTube, label: "YouTube most viewed" },
          ].map((chip) => (
            <button
              className={cn(
                "rounded-full border px-3 py-1 text-xs font-medium transition",
                chip.on
                  ? "border-primary bg-primary text-primary-foreground"
                  : "hover:bg-muted",
              )}
              key={chip.label}
              onClick={() => {
                chip.set(!chip.on);
                setPickError("");
              }}
              type="button"
            >
              {chip.label}
            </button>
          ))}
        </div>

        {pickError ? (
          <p className="text-xs leading-5 text-warning-foreground">{pickError}</p>
        ) : null}

        <div className="flex flex-wrap items-end gap-2 rounded-lg border bg-muted/20 p-3">
          <label className="block space-y-1">
            <span className="text-xs font-medium">Country</span>
            {/* A fixed list, never free text. Only markets at least one source
                genuinely covers appear, and the list says which. */}
            <select
              className="h-9 rounded-md border bg-background px-2 text-sm"
              onChange={(event) => setCountry(event.target.value)}
              value={country}
            >
              {TRENDING_COUNTRIES.map((entry) => (
                <option key={entry.code} value={entry.code}>
                  {entry.label}
                  {entry.tiktok && entry.youtube
                    ? ""
                    : entry.youtube
                      ? " (YouTube only)"
                      : " (TikTok only)"}
                </option>
              ))}
            </select>
          </label>

          {runTikTok ? (
            <>
          <label className="block space-y-1">
            <span className="text-xs font-medium">TikTok industry</span>
            <select
              className="h-9 rounded-md border bg-background px-2 text-sm"
              onChange={(event) => setIndustry(event.target.value)}
              value={industry}
            >
              {TIKTOK_INDUSTRIES.map((option) => (
                <option key={option.label} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label className="block space-y-1">
            <span className="text-xs font-medium">TikTok window</span>
            <select
              className="h-9 rounded-md border bg-background px-2 text-sm"
              onChange={(event) => setPeriod(Number(event.target.value) as TikTokPeriod)}
              value={period}
            >
              {TIKTOK_PERIODS.map((value) => (
                <option key={value} value={value}>
                  Last {value} days
                </option>
              ))}
            </select>
          </label>

          <label className="flex h-9 items-center gap-2 text-xs">
            <input
              checked={newOnBoard}
              onChange={(event) => setNewOnBoard(event.target.checked)}
              type="checkbox"
            />
            Newly trending only
          </label>
            </>
          ) : null}

          {runYouTube ? (
          <label className="block space-y-1">
            <span className="text-xs font-medium">YouTube category</span>
            <select
              className="h-9 rounded-md border bg-background px-2 text-sm"
              onChange={(event) => setCategoryId(event.target.value)}
              value={categoryId}
            >
              {YOUTUBE_CATEGORIES.map((option) => (
                <option key={option.label} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          ) : null}

          <Button
            disabled={running || (!hasTikTokKey && !hasYouTubeKey)}
            onClick={() => void run()}
            size="sm"
            type="button"
          >
            {running ? <Loader2 className="h-4 w-4 animate-spin" /> : <Flame className="h-4 w-4" />}
            {running
              ? "Reading"
              : runTikTok && runYouTube
                ? "Show what is trending"
                : runTikTok
                  ? "Show trending hashtags"
                  : "Show most viewed"}
          </Button>
        </div>

        <p className="text-xs leading-5 text-muted-foreground">
          Mainland China is not on the list. TikTok does not operate there and
          YouTube is blocked, so neither source could answer honestly. That
          market would need Xiaohongshu or WeChat and neither is integrated.
        </p>

        {/* The cost has to name only what is actually about to be spent: a
            YouTube-only run must not mention a ScrapeCreators credit. */}
        <p className="text-xs leading-5 text-muted-foreground">
          {runTikTok && runYouTube
            ? "A run costs one ScrapeCreators credit for the TikTok list and one YouTube quota unit, out of the 10,000 a day a standard key allows."
            : runTikTok
              ? "A run costs one ScrapeCreators credit. No YouTube quota is used."
              : runYouTube
                ? "A run costs one YouTube quota unit, out of the 10,000 a day a standard key allows. No ScrapeCreators credit is spent."
                : "Nothing is selected, so a run would cost nothing and do nothing."}{" "}
          Ranking, post counts and view counts are the platforms&rsquo; own
          figures, read at the moment you press the button.
        </p>

        {credits ? (
          <p className="text-xs leading-5 text-muted-foreground">
            {credits.charged === 0
              ? "Served from cache, no credit charged."
              : `Cost ${credits.charged ?? "an unreported number of"} credit${credits.charged === 1 ? "" : "s"}.`}
            {typeof credits.remaining === "number"
              ? ` ${credits.remaining.toLocaleString("en-GB")} remaining.`
              : ""}
          </p>
        ) : null}

        {/* One section per source. Each shows its own outcome, so a dead
            TikTok page leaves the YouTube list exactly where it is. */}
        <LegSection
          busy={busy}
          emptyNote={`No ranked hashtags for ${market.label} with that industry and window. That is a real answer, not an error: try a wider window or every industry.`}
          leg={tiktok}
          noKeyNote="Add a ScrapeCreators API key in Settings to read TikTok trending hashtags."
          title={`Trending hashtags on TikTok, ${market.label}`}
        >
          {tiktok.rows.map((row) => (
            <div className="rounded-lg border p-3" key={row.tag}>
              <div className="flex flex-wrap items-center gap-2">
                {row.rank ? <Badge variant="outline">#{row.rank}</Badge> : null}
                <a
                  className="text-sm font-medium underline underline-offset-2"
                  href={row.url}
                  rel="noreferrer"
                  target="_blank"
                >
                  #{row.tag}
                </a>
                {row.rankChange === null ? null : row.rankChange > 0 ? (
                  <span className="flex items-center gap-1 text-xs text-success-foreground">
                    <TrendingUp className="h-3 w-3" />
                    up {row.rankChange}
                  </span>
                ) : row.rankChange < 0 ? (
                  <span className="flex items-center gap-1 text-xs text-muted-foreground">
                    <TrendingDown className="h-3 w-3" />
                    down {Math.abs(row.rankChange)}
                  </span>
                ) : (
                  <span className="text-xs text-muted-foreground">unchanged</span>
                )}
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                <span>{countLabel(row.posts)} posts</span>
                <span aria-hidden>·</span>
                <span>{countLabel(row.views)} views</span>
                <Button
                  className="h-6 px-2"
                  disabled={busy}
                  onClick={() => onResearch(tagToSearchTopic(row.tag, country))}
                  size="sm"
                  variant="ghost"
                >
                  Research this
                </Button>
              </div>
            </div>
          ))}
        </LegSection>

        {credits ? (
          <p className="text-xs leading-5 text-muted-foreground">
            {credits.charged === 0
              ? "TikTok list served from cache, no credit charged."
              : `TikTok list cost ${credits.charged ?? "an unreported number of"} credit${credits.charged === 1 ? "" : "s"}.`}
            {typeof credits.remaining === "number"
              ? ` ${credits.remaining.toLocaleString("en-GB")} remaining.`
              : ""}
          </p>
        ) : null}

        <LegSection
          busy={busy}
          emptyNote={`YouTube returned no videos for that category in ${market.label}.`}
          leg={youtube}
          noKeyNote="Add a YouTube Data API key in Settings to read the most-viewed chart."
          title={`Most viewed on YouTube, ${market.label}`}
        >
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
        </LegSection>

        {tiktok.rows.length > 0 || youtube.rows.length > 0 ? (
          <p className="text-xs leading-5 text-muted-foreground">
            A trending tag is a lead, not evidence. Research this runs a real
            listening search on it below, and only an accepted result from that
            search reaches the Signal Board or any AI context.
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}

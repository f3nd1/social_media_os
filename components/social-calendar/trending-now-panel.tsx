"use client";

// Trending now. What the platforms say is popular right now, with no keyword
// from us at all.
//
// Kept separate from Discover on purpose. Discover reads terms out of the
// workspace, so it can only find more about courses and competitors already
// on file. This asks TikTok and YouTube what is moving, which can surface
// something nobody here thought to search for. The two answer different
// questions and are not interchangeable.

import { useState } from "react";

import { Flame, Loader2, TrendingDown, TrendingUp } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { apiUrl } from "@/lib/base-path";
import {
  TIKTOK_INDUSTRIES,
  TIKTOK_PERIODS,
  TRENDING_COUNTRY_LABEL,
  YOUTUBE_CATEGORIES,
  tagToSearchTopic,
  type TikTokPeriod,
  type TrendingTag,
  type TrendingVideo,
} from "@/lib/trending";
import { formatDisplayDate, readJsonResponse } from "@/lib/utils";

type Source = "tiktok-hashtags" | "youtube-popular";

function countLabel(value: number | null): string {
  return typeof value === "number" ? value.toLocaleString("en-GB") : "not reported";
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
  const [source, setSource] = useState<Source>("tiktok-hashtags");
  const [period, setPeriod] = useState<TikTokPeriod>(7);
  const [industry, setIndustry] = useState("education");
  const [categoryId, setCategoryId] = useState("27");
  const [newOnBoard, setNewOnBoard] = useState(false);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState("");
  const [tags, setTags] = useState<TrendingTag[]>([]);
  const [videos, setVideos] = useState<TrendingVideo[]>([]);
  const [credits, setCredits] = useState<{ charged: number | null; remaining: number | null } | null>(
    null,
  );
  const [ranAt, setRanAt] = useState("");

  const hasKey = source === "tiktok-hashtags" ? Boolean(scrapeCreatorsApiKey.trim()) : Boolean(youtubeApiKey.trim());

  async function run() {
    setRunning(true);
    setError("");
    setTags([]);
    setVideos([]);
    setCredits(null);

    try {
      const response = await fetch(apiUrl("/api/trending"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          source,
          scrapeCreatorsApiKey,
          youtubeApiKey,
          period,
          industry,
          categoryId,
          newOnBoard,
        }),
      });

      const result = await readJsonResponse<
        | { ok: true; tags?: TrendingTag[]; videos?: TrendingVideo[]; credits?: typeof credits }
        | { ok: false; error: string }
      >(response, "read the trending list", "Try again in a moment.");

      if (!result.ok) {
        setError(result.error);
        return;
      }

      setTags(result.tags ?? []);
      setVideos(result.videos ?? []);
      setCredits(result.credits ?? null);
      setRanAt(new Date().toISOString());
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : String(caught));
    } finally {
      setRunning(false);
    }
  }

  const empty = !running && !error && ranAt && tags.length === 0 && videos.length === 0;

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
          chart per country. Instagram Reels trending, YouTube Shorts trending
          and TikTok&rsquo;s For You feed are deliberately not here: they take no
          country or category setting at all, so there is no honest way to call
          them {TRENDING_COUNTRY_LABEL} or education.
        </p>
      </CardHeader>

      <CardContent className="space-y-3">
        {!hasKey ? (
          <div className="rounded-md border border-warning-border bg-warning p-3 text-xs leading-5 text-warning-foreground">
            {source === "tiktok-hashtags"
              ? "Add a ScrapeCreators API key in Settings to read TikTok trending hashtags."
              : "Add a YouTube Data API key in Settings to read the Singapore popular chart."}
          </div>
        ) : null}

        <div className="flex flex-wrap gap-2">
          <button
            className={`rounded-full border px-3 py-1 text-xs font-medium transition ${
              source === "tiktok-hashtags"
                ? "border-primary bg-primary text-primary-foreground"
                : "hover:bg-muted"
            }`}
            onClick={() => {
              setSource("tiktok-hashtags");
              setError("");
            }}
            type="button"
          >
            TikTok hashtags
          </button>
          <button
            className={`rounded-full border px-3 py-1 text-xs font-medium transition ${
              source === "youtube-popular"
                ? "border-primary bg-primary text-primary-foreground"
                : "hover:bg-muted"
            }`}
            onClick={() => {
              setSource("youtube-popular");
              setError("");
            }}
            type="button"
          >
            YouTube most viewed
          </button>
        </div>

        <div className="flex flex-wrap items-end gap-2 rounded-lg border bg-muted/20 p-3">
          <label className="block space-y-1">
            <span className="text-xs font-medium">Country</span>
            {/* Not a dropdown. Recruiting happens here, and a country picker
                invites someone to read a Vietnamese trend list as a local one. */}
            <p className="flex h-9 items-center rounded-md border bg-background px-2 text-sm">
              {TRENDING_COUNTRY_LABEL}
            </p>
          </label>

          {source === "tiktok-hashtags" ? (
            <>
              <label className="block space-y-1">
                <span className="text-xs font-medium">Industry</span>
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
                <span className="text-xs font-medium">Window</span>
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
          ) : (
            <label className="block space-y-1">
              <span className="text-xs font-medium">Category</span>
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
          )}

          <Button disabled={!hasKey || running} onClick={() => void run()} size="sm" type="button">
            {running ? <Loader2 className="h-4 w-4 animate-spin" /> : <Flame className="h-4 w-4" />}
            {running ? "Reading" : "Show what is trending"}
          </Button>
        </div>

        <p className="text-xs leading-5 text-muted-foreground">
          {source === "tiktok-hashtags"
            ? "One ScrapeCreators credit per run. Ranking, post counts and view counts are TikTok's own figures from its Creative Center, read at the moment you press the button."
            : "One YouTube quota unit per run, out of the 10,000 a day a standard key allows. Not every category has a chart in every country, and YouTube says so plainly when it does not."}
        </p>

        {error ? (
          <div className="rounded-md border border-warning-border bg-warning p-3 text-xs leading-5 text-warning-foreground">
            {error}
          </div>
        ) : null}

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

        {empty ? (
          <p className="rounded-md border border-dashed p-4 text-xs leading-5 text-muted-foreground">
            The source returned nothing for that combination. That is a real
            answer, not an error: with a narrow industry or a short window there
            may genuinely be no ranked entries for {TRENDING_COUNTRY_LABEL}. Try a
            wider window or every industry.
          </p>
        ) : null}

        {tags.length > 0 ? (
          <div className="space-y-2">
            <p className="text-xs font-medium uppercase text-muted-foreground">
              {tags.length} trending hashtags, ranked by TikTok
            </p>
            {tags.map((row) => (
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
                    onClick={() => onResearch(tagToSearchTopic(row.tag))}
                    size="sm"
                    variant="ghost"
                  >
                    Research this
                  </Button>
                </div>
              </div>
            ))}
          </div>
        ) : null}

        {videos.length > 0 ? (
          <div className="space-y-2">
            <p className="text-xs font-medium uppercase text-muted-foreground">
              {videos.length} most viewed in {TRENDING_COUNTRY_LABEL} right now
            </p>
            {videos.map((row) => (
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
          </div>
        ) : null}

        {tags.length > 0 || videos.length > 0 ? (
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

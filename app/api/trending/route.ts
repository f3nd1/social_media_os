// Trending now. Two query-less calls, kept out of /api/social-listening
// because nothing here takes a topic and nothing here runs an AI pass: it
// returns what the platforms say is popular, unread and uninterpreted.

import { NextResponse } from "next/server";

import {
  DEFAULT_TRENDING_COUNTRY,
  TIKTOK_PERIODS,
  TIKTOK_UNOFFICIAL_NOTE,
  buildTikTokHashtagsUrl,
  buildYouTubeTrendingUrl,
  normaliseTrendingTags,
  normaliseTrendingVideos,
  trendingCountry,
  type TikTokPeriod,
} from "@/lib/trending";

export const runtime = "nodejs";
export const maxDuration = 60;

type RequestBody = {
  source?: "tiktok-hashtags" | "youtube-popular";
  scrapeCreatorsApiKey?: string;
  youtubeApiKey?: string;
  country?: string;
  period?: number;
  industry?: string;
  categoryId?: string;
  newOnBoard?: boolean;
};

export async function POST(request: Request) {
  let body: RequestBody;

  try {
    body = (await request.json()) as RequestBody;
  } catch {
    return NextResponse.json({ ok: false, error: "Malformed request." }, { status: 400 });
  }

  // Resolved against the fixed catalogue, so an unknown code can never reach
  // either API and come back as a confidently wrong country's trend list.
  const country = trendingCountry(body.country ?? DEFAULT_TRENDING_COUNTRY);

  if (body.source === "tiktok-hashtags") {
    // Said plainly rather than sent anyway: the endpoint ignores a country it
    // does not know and returns its default market, which would read as a
    // genuine Indian or Hong Kong trend list.
    if (!country.tiktok) {
      return NextResponse.json({
        ok: false,
        unsupportedCountry: true,
        error: `TikTok does not publish a hashtag ranking for ${country.label}. Its ranking covers a fixed list of markets and ${country.label} is not one of them, so there is nothing to show rather than something wrong.`,
      });
    }

    const apiKey = body.scrapeCreatorsApiKey?.trim() ?? "";

    if (!apiKey) {
      return NextResponse.json({
        ok: false,
        error: "Add a ScrapeCreators API key in Settings to read TikTok trending hashtags.",
      });
    }

    // Guard the enum rather than trusting the client: TikTok rejects any
    // period outside 7, 30 and 120, and a rejected call still costs nothing
    // but still wastes the manager's time waiting for an error.
    const period = (TIKTOK_PERIODS as readonly number[]).includes(body.period ?? 0)
      ? (body.period as TikTokPeriod)
      : 7;

    let response: Response;

    try {
      response = await fetch(
        buildTikTokHashtagsUrl({
          country: country.code,
          period,
          industry: body.industry ?? "",
          newOnBoard: Boolean(body.newOnBoard),
        }),
        { headers: { "x-api-key": apiKey }, signal: AbortSignal.timeout(45_000) },
      );
    } catch (error) {
      const timedOut = error instanceof DOMException && error.name === "TimeoutError";
      return NextResponse.json({
        ok: false,
        sourceDown: true,
        error:
          (timedOut
            ? "ScrapeCreators did not respond within 45 seconds."
            : `Could not reach ScrapeCreators: ${error instanceof Error ? error.message : String(error)}`) +
          ` ${TIKTOK_UNOFFICIAL_NOTE}`,
      });
    }

    const text = await response.text();

    if (!response.ok) {
      // Their own words, not ours: a 402 body says the account is out of
      // credits, which is the one thing the manager needs to read.
      const detail = text.trim().slice(0, 300);
      // A key or billing problem is ours to fix and must not be dressed up as
      // a TikTok outage. Everything else on this endpoint is the page being
      // gone, which is theirs, and gets the standing explanation.
      const ourProblem =
        response.status === 401 || response.status === 403 || response.status === 402;

      return NextResponse.json({
        ok: false,
        sourceDown: !ourProblem,
        error:
          `ScrapeCreators returned HTTP ${response.status}.` +
          (detail ? ` It said: ${detail}` : "") +
          (response.status === 401 || response.status === 403
            ? " Check the API key in Settings."
            : response.status === 402
              ? " The account is out of credits."
              : ` ${TIKTOK_UNOFFICIAL_NOTE}`),
      });
    }

    let parsed: Record<string, unknown>;

    try {
      parsed = JSON.parse(text) as Record<string, unknown>;
    } catch {
      return NextResponse.json({
        ok: false,
        error: "ScrapeCreators returned a reply that could not be read as JSON.",
      });
    }

    return NextResponse.json({
      ok: true,
      tags: normaliseTrendingTags(parsed),
      credits: {
        charged: typeof parsed.credits_charged === "number" ? parsed.credits_charged : null,
        remaining:
          typeof parsed.credits_remaining === "number" ? parsed.credits_remaining : null,
      },
    });
  }

  if (body.source === "youtube-popular") {
    if (!country.youtube) {
      return NextResponse.json({
        ok: false,
        unsupportedCountry: true,
        error: `YouTube does not publish a most-viewed chart for ${country.label}.`,
      });
    }

    const apiKey = body.youtubeApiKey?.trim() ?? "";

    if (!apiKey) {
      return NextResponse.json({
        ok: false,
        error: "Add a YouTube Data API key in Settings to read the Singapore popular chart.",
      });
    }

    let response: Response;

    try {
      response = await fetch(
        buildYouTubeTrendingUrl({
          apiKey,
          country: country.code,
          categoryId: body.categoryId ?? "",
        }),
        { signal: AbortSignal.timeout(20_000) },
      );
    } catch (error) {
      return NextResponse.json({
        ok: false,
        error: `Could not reach YouTube: ${error instanceof Error ? error.message : String(error)}`,
      });
    }

    const text = await response.text();

    if (!response.ok) {
      // Google states the real cause in the body (quotaExceeded, keyInvalid,
      // videoChartNotFound). Passing it through is the difference between the
      // manager fixing the key and the manager retrying forever.
      const detail = /"(?:reason|message)"\s*:\s*"([^"]+)"/.exec(text)?.[1] ?? "";
      const notCharted = /videoChartNotFound/i.test(text);

      return NextResponse.json({
        ok: false,
        error: notCharted
          ? `YouTube does not publish a popular chart for that category in ${country.label}. Try All categories.`
          : `YouTube refused the request (HTTP ${response.status}${detail ? `: ${detail}` : ""}).` +
            (response.status === 403
              ? " That is usually the daily quota or a restricted key."
              : " Check the YouTube Data API key in Settings."),
      });
    }

    let parsed: unknown;

    try {
      parsed = JSON.parse(text);
    } catch {
      return NextResponse.json({
        ok: false,
        error: "YouTube returned a reply that could not be read as JSON.",
      });
    }

    return NextResponse.json({ ok: true, videos: normaliseTrendingVideos(parsed) });
  }

  return NextResponse.json({ ok: false, error: "Unknown trending source." }, { status: 400 });
}

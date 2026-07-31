// Trending now. One query-less call, kept out of /api/social-listening
// because nothing here takes a topic and nothing here runs an AI pass: it
// returns what YouTube's own Shorts trending chart says is popular, unread
// and uninterpreted.

import { NextResponse } from "next/server";

import { buildYouTubeShortsTrendingUrl, normaliseTrendingVideos } from "@/lib/trending";

export const runtime = "nodejs";
export const maxDuration = 60;

type RequestBody = {
  scrapeCreatorsApiKey?: string;
};

export async function POST(request: Request) {
  let body: RequestBody;

  try {
    body = (await request.json()) as RequestBody;
  } catch {
    return NextResponse.json({ ok: false, error: "Malformed request." }, { status: 400 });
  }

  const apiKey = body.scrapeCreatorsApiKey?.trim() ?? "";

  if (!apiKey) {
    return NextResponse.json({
      ok: false,
      error: "Add a ScrapeCreators API key in Settings to read YouTube Shorts trending.",
    });
  }

  let response: Response;

  try {
    response = await fetch(buildYouTubeShortsTrendingUrl(), {
      headers: { "x-api-key": apiKey },
      signal: AbortSignal.timeout(45_000),
    });
  } catch (error) {
    const timedOut = error instanceof DOMException && error.name === "TimeoutError";
    return NextResponse.json({
      ok: false,
      error: timedOut
        ? "ScrapeCreators did not respond within 45 seconds."
        : `Could not reach ScrapeCreators: ${error instanceof Error ? error.message : String(error)}`,
    });
  }

  const text = await response.text();

  if (!response.ok) {
    const detail = text.trim().slice(0, 300);

    return NextResponse.json({
      ok: false,
      error:
        `ScrapeCreators returned HTTP ${response.status}.` +
        (detail ? ` It said: ${detail}` : "") +
        (response.status === 401 || response.status === 403
          ? " Check the API key in Settings."
          : response.status === 402
            ? " The account is out of credits."
            : ""),
    });
  }

  let parsed: unknown;

  try {
    parsed = JSON.parse(text);
  } catch {
    return NextResponse.json({
      ok: false,
      error: "ScrapeCreators returned a reply that could not be read as JSON.",
    });
  }

  const videos = normaliseTrendingVideos(parsed);

  if (videos.length === 0) {
    // A 200 with a shape this app cannot read is a different problem from a
    // genuinely quiet chart, and must not be presented as the same "nothing
    // trending" result: one is a real answer, the other means this route
    // needs fixing against a live reply.
    return NextResponse.json({
      ok: false,
      error:
        "ScrapeCreators answered but returned no readable videos. If this keeps happening, the reply's shape has likely changed and lib/trending.ts's normaliseTrendingVideos needs updating against a real response.",
    });
  }

  return NextResponse.json({ ok: true, videos });
}

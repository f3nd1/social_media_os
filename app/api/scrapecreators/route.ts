// ScrapeCreators account research. One route, action-dispatched, so the key
// never has to be repeated across several endpoints.
//
// This is lookup, not listening: it answers "how big is this competitor and
// what are people saying under their posts", where /api/social-listening
// answers "what is being said about a topic". Both feed internal research
// only. Comments returned here carry the same rule as listening quotes: they
// are evidence for planning, never marketing copy.

import { NextResponse } from "next/server";

import {
  ACCOUNT_ENDPOINTS,
  COMMENT_ENDPOINTS,
  SCRAPECREATORS_BASE,
  buildAccountRequestUrl,
  buildCreatorRequestUrl,
  buildXTweetDetailsUrl,
  normaliseAccountSnapshot,
  normaliseComments,
  normaliseCompanySnapshot,
  normaliseCreatorResults,
  normaliseXTweetDetails,
  type AccountPlatform,
  type CacheMaxAge,
  type CommentPlatform,
} from "@/lib/scrapecreators";

export const runtime = "nodejs";
export const maxDuration = 60;

type RequestBody = {
  apiKey?: string;
  action?: "account" | "company" | "creators" | "comments" | "x-tweet";
  platform?: string;
  identifier?: string;
  cacheMaxAge?: CacheMaxAge;
  country?: string;
  followerBand?: string;
  sortBy?: string;
  page?: number;
};

// Every response carries what the call cost and what is left, so credit spend
// is visible in the UI next to the result rather than being discovered on a
// billing page later.
type Credits = { charged: number | null; remaining: number | null };

function readCredits(body: Record<string, unknown>): Credits {
  const charged = body.credits_charged;
  const remaining = body.credits_remaining;

  return {
    charged: typeof charged === "number" ? charged : null,
    remaining: typeof remaining === "number" ? remaining : null,
  };
}

// A failed lookup must say why. The whole reason this route exists separately
// from listening is that a manager is spending real credits here, so "nothing
// found" without a reason is not good enough: an unpaid invoice, a wrong
// handle and a genuinely empty account must not look the same.
async function callScrapeCreators(
  url: string,
  apiKey: string,
): Promise<
  | { ok: true; body: Record<string, unknown>; credits: Credits }
  | { ok: false; error: string }
> {
  let response: Response;

  try {
    response = await fetch(url, {
      headers: { "x-api-key": apiKey },
      signal: AbortSignal.timeout(45_000),
    });
  } catch (error) {
    const timedOut = error instanceof DOMException && error.name === "TimeoutError";
    return {
      ok: false,
      error: timedOut
        ? "ScrapeCreators did not respond within 45 seconds. Try again."
        : `Could not reach ScrapeCreators: ${error instanceof Error ? error.message : String(error)}`,
    };
  }

  const text = await response.text();

  if (!response.ok) {
    // Pass their own message through rather than inventing one: for a 402 the
    // body says the account is out of credits, which is exactly what the
    // manager needs to read.
    const detail = text.trim().slice(0, 300);
    return {
      ok: false,
      error:
        `ScrapeCreators returned HTTP ${response.status}.` +
        (detail ? ` It said: ${detail}` : "") +
        (response.status === 401 || response.status === 403
          ? " Check the API key in Settings."
          : response.status === 402
            ? " The account is out of credits."
            : ""),
    };
  }

  try {
    const parsed = JSON.parse(text) as Record<string, unknown>;
    return { ok: true, body: parsed, credits: readCredits(parsed) };
  } catch {
    return { ok: false, error: "ScrapeCreators returned a reply that could not be read as JSON." };
  }
}

export async function POST(request: Request) {
  let body: RequestBody;

  try {
    body = (await request.json()) as RequestBody;
  } catch {
    return NextResponse.json({ ok: false, error: "Malformed request." }, { status: 400 });
  }

  const apiKey = body.apiKey?.trim() ?? "";

  if (!apiKey) {
    return NextResponse.json({
      ok: false,
      error: "Add a ScrapeCreators API key in Settings to use account research.",
    });
  }

  const capturedAt = new Date().toISOString();
  const identifier = body.identifier?.trim() ?? "";

  if (body.action === "creators") {
    const result = await callScrapeCreators(
      buildCreatorRequestUrl({
        country: body.country || "SG",
        followerBand: body.followerBand || "",
        page: typeof body.page === "number" ? body.page : 1,
        sortBy: body.sortBy || "engagement",
      }),
      apiKey,
    );

    if (!result.ok) {
      return NextResponse.json({ ok: false, error: result.error });
    }

    return NextResponse.json({
      ok: true,
      creators: normaliseCreatorResults(result.body),
      credits: result.credits,
    });
  }

  if (!identifier) {
    return NextResponse.json({ ok: false, error: "Enter a handle or url to look up." });
  }

  if (body.action === "company") {
    if (!/^https?:\/\//i.test(identifier)) {
      return NextResponse.json({
        ok: false,
        error: "LinkedIn company lookup needs the full company page url, not a name.",
      });
    }

    const url = new URL("/v1/linkedin/company", SCRAPECREATORS_BASE);
    url.searchParams.set("url", identifier);
    const result = await callScrapeCreators(url.toString(), apiKey);

    if (!result.ok) {
      return NextResponse.json({ ok: false, error: result.error });
    }

    return NextResponse.json({
      ok: true,
      company: normaliseCompanySnapshot(result.body, capturedAt),
      credits: result.credits,
    });
  }

  if (body.action === "comments") {
    const platform = body.platform as CommentPlatform;

    if (!platform || !(platform in COMMENT_ENDPOINTS)) {
      return NextResponse.json({
        ok: false,
        error:
          "Comments are available for TikTok, Instagram, YouTube and Facebook. LinkedIn and Threads return comments inside the post itself, which is not wired up.",
      });
    }

    const url = new URL(COMMENT_ENDPOINTS[platform].path, SCRAPECREATORS_BASE);
    url.searchParams.set("url", identifier);
    const result = await callScrapeCreators(url.toString(), apiKey);

    if (!result.ok) {
      return NextResponse.json({ ok: false, error: result.error });
    }

    return NextResponse.json({
      ok: true,
      comments: normaliseComments(result.body),
      credits: result.credits,
    });
  }

  if (body.action === "x-tweet") {
    if (!/^https?:\/\//i.test(identifier)) {
      return NextResponse.json({
        ok: false,
        error: "X post lookup needs the full tweet url, not a handle.",
      });
    }

    const result = await callScrapeCreators(buildXTweetDetailsUrl(identifier), apiKey);

    if (!result.ok) {
      return NextResponse.json({ ok: false, error: result.error });
    }

    const tweet = normaliseXTweetDetails(result.body, identifier);

    if (!tweet) {
      return NextResponse.json({
        ok: false,
        error: "The lookup succeeded but returned nothing readable. Check the tweet url.",
      });
    }

    return NextResponse.json({ ok: true, tweet, credits: result.credits });
  }

  const platform = body.platform as AccountPlatform;

  if (!platform || !(platform in ACCOUNT_ENDPOINTS)) {
    return NextResponse.json({ ok: false, error: "Pick a platform to look up." });
  }

  if (ACCOUNT_ENDPOINTS[platform].param === "url" && !/^https?:\/\//i.test(identifier)) {
    return NextResponse.json({
      ok: false,
      error: `${ACCOUNT_ENDPOINTS[platform].label} needs a full profile url, not a handle.`,
    });
  }

  const result = await callScrapeCreators(
    buildAccountRequestUrl(platform, identifier, body.cacheMaxAge ?? "7d"),
    apiKey,
  );

  if (!result.ok) {
    return NextResponse.json({ ok: false, error: result.error });
  }

  return NextResponse.json({
    ok: true,
    account: normaliseAccountSnapshot(platform, result.body, capturedAt),
    credits: result.credits,
  });
}

// Server-side Metricool API client. Called only from app/api/metricool/route.ts
// so the API token never reaches the browser network tab, and so the calls
// avoid the CORS restrictions a browser would hit calling Metricool directly.
//
// Request format verified against the working open-source Metricool CLI
// (github.com/Purple-Horizons/metricool-cli, which has full API coverage):
//   - Base:  https://app.metricool.com/api
//   - Auth:  userToken, userId and blogId are QUERY PARAMETERS, not headers.
//   - Brands: GET /brands
//   - Metric timeline: GET /stats/timeline/{metric}?start=...&end=...
//   - Dates: compact 8-digit YYYYMMDD numbers (for example 20260703), matching
//     the reference CLI. Dashes ("2026-07-03") or a time component ("T00:00:00")
//     make Metricool throw "For input string" and return HTTP 500.
// Earlier code called /v2/settings/brands and /v2/analytics/timelines with an
// X-Mc-Auth header, which is why Metricool served its website HTML with a 404:
// the request never reached the API router.
//
// Nothing here ever reports success on a failed call. Every failure is
// returned to the UI as the exact status, the raw body, and the URL called
// (with the token masked) so the owner can compare it against the docs.

import type { Platform } from "@/lib/social-calendar-data";
import type { PlatformDataMetrics } from "@/lib/pdf-data-import";

export const METRICOOL_BASE_URL = "https://app.metricool.com/api";

export type MetricoolCredentials = {
  apiToken: string;
  userId: string;
  blogId: string;
};

export type MetricoolResult<T> =
  | { ok: true; value: T }
  | { ok: false; error: string; status?: number };

// Metricool network identifiers mapped to the app's Platform union. Networks
// Metricool tracks that the app has no Platform for (Pinterest, Google
// Business Profile, and similar) are intentionally left unmapped and skipped.
export const METRICOOL_NETWORK_TO_PLATFORM: Record<string, Platform> = {
  facebook: "Facebook",
  instagram: "Instagram",
  twitter: "X/Twitter",
  x: "X/Twitter",
  linkedin: "LinkedIn",
  linkedincompany: "LinkedIn",
  tiktok: "TikTok",
  youtube: "YouTube Shorts",
  threads: "Threads",
};

export const METRICOOL_SYNC_NETWORKS = Object.keys(METRICOOL_NETWORK_TO_PLATFORM);

// The network slug the per-network posts endpoint expects in its path
// (/v2/analytics/posts/{slug}). This is NOT the same string as the brand
// record's field name: the brand record uses "linkedincompany", but the posts
// endpoint wants "linkedin". All seven slugs below were confirmed with real
// authenticated calls against the live account. Networks with no slug here
// (pinterest, gmb) have no matching app Platform anyway and are skipped.
export const METRICOOL_NETWORK_TO_POSTS_SLUG: Record<string, string> = {
  facebook: "facebook",
  instagram: "instagram",
  twitter: "twitter",
  linkedin: "linkedin",
  linkedincompany: "linkedin",
  tiktok: "tiktok",
  youtube: "youtube",
  threads: "threads",
};

// Appends the auth query parameters exactly as the working CLI does:
// userToken (the API token), userId, and blogId.
function withAuth(url: string, credentials: MetricoolCredentials) {
  const parsed = new URL(url);
  parsed.searchParams.set("userToken", credentials.apiToken);
  parsed.searchParams.set("userId", credentials.userId);
  parsed.searchParams.set("blogId", credentials.blogId);
  return parsed.toString();
}

// The URL with the token value replaced, safe to show the owner so they can
// compare the exact call against Metricool's documentation.
export function maskUrl(url: string) {
  return url.replace(/userToken=[^&]*/i, "userToken=***");
}

// The path and query with the token masked, for short error lines.
function endpointPath(url: string) {
  try {
    const parsed = new URL(maskUrl(url));
    return parsed.pathname + parsed.search;
  } catch {
    return maskUrl(url);
  }
}

async function readBody(response: Response) {
  try {
    return (await response.text()).trim();
  } catch {
    return "";
  }
}

// Metricool serves its website (an HTML page) when a request does not hit an
// API route, so an HTML body is the tell-tale sign of a wrong path or host.
function looksLikeHtml(body: string) {
  const head = body.slice(0, 200).toLowerCase();
  return head.includes("<!doctype html") || head.includes("<html") || head.includes("<title>metricool");
}

// Always reports the exact upstream status and raw body so the owner can tell
// auth (401) from permission/plan (402/403) from a wrong endpoint (404) from a
// malformed request (400). For plan-gated codes it ADDS a CSV-import hint
// rather than replacing the real detail.
function describeUpstream(status: number, statusText: string, body: string, path: string) {
  const planHint =
    status === 401 || status === 402 || status === 403
      ? " This usually means Metricool API access is not enabled on your plan (it needs at least the Advanced plan). The CSV import is the fallback if the API stays blocked."
      : "";

  return `Metricool returned HTTP ${status} ${statusText} for ${path}. Response body: ${
    body || "(empty)"
  }.${planHint}`;
}

function isoDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

export const METRICOOL_RANGE_OPTIONS = [7, 30, 90] as const;

function lastNDayRange(days: number) {
  const to = new Date();
  const from = new Date();
  from.setDate(from.getDate() - days);

  return { from: isoDate(from), to: isoDate(to) };
}

type MetricoolBrandRow = {
  id?: number | string;
  blogId?: number | string;
  label?: string;
  name?: string;
  title?: string;
};

// Metricool's endpoints do not all return a bare JSON list: some wrap the
// list in { "data": [...] } or similar. Calling .find on a non-array crashed
// with "brands.find is not a function", so this accepts every wrapper shape
// we can recognise and returns null (never throws) for anything else, letting
// the caller show the raw body instead.
function extractBrandList(payload: unknown): MetricoolBrandRow[] | null {
  if (Array.isArray(payload)) {
    return payload as MetricoolBrandRow[];
  }

  if (payload && typeof payload === "object") {
    const record = payload as Record<string, unknown>;

    for (const key of ["data", "brands", "profiles", "items", "content"]) {
      if (Array.isArray(record[key])) {
        return record[key] as MetricoolBrandRow[];
      }
    }
  }

  return null;
}

function matchBrand(
  brands: MetricoolBrandRow[],
  blogId: string,
): MetricoolBrandRow | undefined {
  return brands.find(
    (brand) =>
      String(brand.id) === String(blogId) || String(brand.blogId) === String(blogId),
  );
}

// Network names Metricool may reference inside a brand record. Used to work
// out, best effort, which networks the account actually has connected.
const KNOWN_NETWORK_NAMES = [
  "facebook",
  "instagram",
  "twitter",
  "linkedincompany",
  "linkedin",
  "tiktok",
  "youtube",
  "threads",
  "pinterest",
  "googlemybusiness",
  "gmb",
  "bluesky",
  "twitch",
  "web",
] as const;

// Best-effort read of which networks the brand record shows as connected:
// truthy fields whose names start with a network name (facebook, instagramId,
// tiktokPicture and so on), plus any nested "networks" list.
export function extractConnectedNetworks(row: Record<string, unknown>): string[] {
  const found = new Set<string>();

  const consider = (key: string, value: unknown) => {
    const lower = key.toLowerCase();
    const match = KNOWN_NETWORK_NAMES.find((name) => lower.startsWith(name));

    if (!match || match === "web") {
      return;
    }

    if (
      value === null ||
      value === undefined ||
      value === false ||
      value === "" ||
      value === 0 ||
      (typeof value === "object" && Object.keys(value as object).length === 0)
    ) {
      return;
    }

    found.add(match);
  };

  for (const [key, value] of Object.entries(row)) {
    consider(key, value);
  }

  const networks = (row as { networks?: unknown }).networks;

  if (Array.isArray(networks)) {
    for (const entry of networks) {
      if (typeof entry === "string") {
        consider(entry, true);
      } else if (entry && typeof entry === "object") {
        const record = entry as Record<string, unknown>;
        consider(String(record.name ?? record.network ?? record.id ?? ""), true);
      }
    }
  }

  return [...found].sort();
}

// Reads one brand-listing endpoint. Distinguishes: found the brand (ok),
// got a list without the brand (ok:false with the ids we did see), got a
// non-list body (unrecognised, with the raw body), or an HTTP error
// (exact status and body).
async function readBrandEndpoint(
  credentials: MetricoolCredentials,
  url: string,
): Promise<
  | { kind: "found"; label: string; row: MetricoolBrandRow }
  | { kind: "empty-list" }
  | { kind: "wrong-brand"; ids: string }
  | { kind: "unrecognised"; raw: string; html: boolean; maskedUrl: string }
  | { kind: "http-error"; error: string; status: number }
  | { kind: "network-error"; error: string }
> {
  const authedUrl = withAuth(url, credentials);

  try {
    const response = await fetch(authedUrl);
    const raw = await readBody(response);

    if (!response.ok) {
      const htmlNote = looksLikeHtml(raw)
        ? " Metricool returned an HTML web page, not API data, which means this URL did not reach the API (wrong path or host)."
        : "";
      return {
        kind: "http-error",
        error:
          describeUpstream(response.status, response.statusText, raw, endpointPath(authedUrl)) +
          htmlNote,
        status: response.status,
      };
    }

    let payload: unknown = null;

    try {
      payload = JSON.parse(raw);
    } catch {
      payload = null;
    }

    const brands = extractBrandList(payload);

    if (!brands) {
      return { kind: "unrecognised", raw, html: looksLikeHtml(raw), maskedUrl: maskUrl(authedUrl) };
    }

    if (brands.length === 0) {
      return { kind: "empty-list" };
    }

    const matched = matchBrand(brands, credentials.blogId);

    if (matched) {
      return {
        kind: "found",
        label: matched.label ?? matched.name ?? matched.title ?? "connected brand",
        row: matched,
      };
    }

    return {
      kind: "wrong-brand",
      ids: brands.map((brand) => brand.id ?? brand.blogId).join(", "),
    };
  } catch (error) {
    return {
      kind: "network-error",
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

async function fetchBrandInfo(
  credentials: MetricoolCredentials,
): Promise<MetricoolResult<{ label: string; row: MetricoolBrandRow }>> {
  // Verified against the working CLI: brands are listed at /brands with auth
  // as query parameters. admin/simpleProfiles is kept as a documented
  // secondary listing.
  const primaryUrl = `${METRICOOL_BASE_URL}/brands`;
  const legacyUrl = `${METRICOOL_BASE_URL}/admin/simpleProfiles`;

  const v2 = await readBrandEndpoint(credentials, primaryUrl);

  if (v2.kind === "found") {
    return { ok: true, value: { label: v2.label, row: v2.row } };
  }

  if (v2.kind === "wrong-brand") {
    return {
      ok: false,
      error: `Connected to Metricool (the token works), but no brand with Blog ID "${credentials.blogId}" was found for this user. Brand ids Metricool returned: ${v2.ids}.`,
    };
  }

  if (v2.kind === "http-error" && v2.status !== 404) {
    return { ok: false, error: v2.error, status: v2.status };
  }

  // The primary listing was a 404, an empty list, an unrecognised body, or
  // unreachable: try the secondary listing before reporting anything.
  const legacy = await readBrandEndpoint(credentials, legacyUrl);

  if (legacy.kind === "found") {
    return { ok: true, value: { label: legacy.label, row: legacy.row } };
  }

  if (legacy.kind === "wrong-brand") {
    return {
      ok: false,
      error: `Connected to Metricool (the token works), but no brand with Blog ID "${credentials.blogId}" was found for this user. Brand ids Metricool returned: ${legacy.ids}.`,
    };
  }

  if (legacy.kind === "empty-list") {
    return {
      ok: false,
      error:
        "Connected to Metricool (the token works), but it returned an empty brand list for this User ID. Check the User ID in Metricool Settings > API.",
    };
  }

  if (legacy.kind === "http-error") {
    return { ok: false, error: legacy.error, status: legacy.status };
  }

  if (legacy.kind === "unrecognised" || v2.kind === "unrecognised") {
    const source = legacy.kind === "unrecognised" ? legacy : (v2 as Extract<typeof v2, { kind: "unrecognised" }>);

    if (source.html) {
      return {
        ok: false,
        error:
          `Metricool returned an HTML web page instead of brand data, so this URL did not reach the API. URL called (token masked): ${source.maskedUrl}. Compare this against Metricool's API docs. Use the CSV import meanwhile.`,
      };
    }

    return {
      ok: false,
      error:
        `Metricool answered HTTP 200 but the body was not a recognisable list of brands. URL called (token masked): ${source.maskedUrl}. Raw response: ${
          source.raw ? source.raw.slice(0, 400) : "(empty body)"
        }. Use the CSV import as the fallback and send this so the endpoint can be adjusted.`,
    };
  }

  return {
    ok: false,
    error:
      legacy.kind === "network-error"
        ? legacy.error
        : v2.kind === "network-error"
          ? v2.error
          : "Metricool could not be reached.",
  };
}

export async function testMetricoolConnection(
  credentials: MetricoolCredentials,
): Promise<MetricoolResult<{ accountLabel: string }>> {
  const result = await fetchBrandInfo(credentials);

  if (!result.ok) {
    return result;
  }

  return { ok: true, value: { accountLabel: result.value.label } };
}

const TIMELINE_CONTAINER_KEYS = ["data", "values", "timeline", "items", "content", "points"];

// Finds the list of data points wherever Metricool put it: a bare array, an
// array under a known key, or one level deeper (for example {data:{values:
// [...]}}). Returns null when no list exists so the raw body can be shown.
function extractTimelinePoints(payload: unknown): unknown[] | null {
  if (Array.isArray(payload)) {
    return payload;
  }

  if (!payload || typeof payload !== "object") {
    return null;
  }

  const record = payload as Record<string, unknown>;

  for (const key of TIMELINE_CONTAINER_KEYS) {
    const inner = record[key];

    if (Array.isArray(inner)) {
      return inner;
    }

    if (inner && typeof inner === "object") {
      const nested = inner as Record<string, unknown>;

      for (const innerKey of TIMELINE_CONTAINER_KEYS) {
        if (Array.isArray(nested[innerKey])) {
          return nested[innerKey] as unknown[];
        }
      }
    }
  }

  return null;
}

// Reads one data point however it is shaped: a plain number, a [date, value]
// pair, or an object using any of the value field names seen in analytics
// APIs.
function timelinePointValue(point: unknown): number {
  if (typeof point === "number") {
    return point;
  }

  if (Array.isArray(point)) {
    const candidate = Number(point[1] ?? point[0] ?? 0);
    return Number.isFinite(candidate) ? candidate : 0;
  }

  if (point && typeof point === "object") {
    const record = point as Record<string, unknown>;
    const candidate = Number(
      record.value ?? record.y ?? record.count ?? record.total ?? record.metricValue ?? 0,
    );
    return Number.isFinite(candidate) ? candidate : 0;
  }

  return 0;
}

type TimelineOutcome =
  | { ok: true; total: number; latest: number; points: number; maskedUrl: string }
  | {
      ok: false;
      status: number;
      notFound: boolean;
      unrecognised: boolean;
      html: boolean;
      error: string;
      raw: string;
      maskedUrl: string;
    };

// Convert a YYYY-MM-DD (or ISO datetime) date to the compact 8-digit YYYYMMDD
// form Metricool's v1 stats endpoints require, matching the reference CLI's
// toYYYYMMDD helper. Example: "2026-07-03" -> "20260703".
function toMetricoolDate(value: string): string {
  return value.slice(0, 10).replace(/-/g, "");
}

// Safeguard against the date-format regression: Metricool's v1 stats endpoints
// parse these dates as numbers and reject anything that is not the compact
// 8-digit YYYYMMDD form (dashes or a "T" time component throw "For input
// string" and a 500). Surface a bad date loudly rather than failing silently.
function assertPlainMetricoolDate(value: string, label: string) {
  if (!/^\d{8}$/.test(value)) {
    console.warn(
      `[metricool] ${label} date "${value}" is not the required YYYYMMDD (8-digit) form. ` +
        "Metricool parses these dates as numbers and rejects dashes or a time component " +
        '(throws "For input string" and returns HTTP 500).',
    );
  }
}

// Metricool's v1 stats endpoints want the date parameters as compact YYYYMMDD
// numbers; dashes or a time component make the API throw and answer HTTP 500.
function timelineUrl(credentials: MetricoolCredentials, metric: string, start: string, end: string) {
  assertPlainMetricoolDate(start, "timeline start");
  assertPlainMetricoolDate(end, "timeline end");
  const url = `${METRICOOL_BASE_URL}/stats/timeline/${encodeURIComponent(metric)}?start=${encodeURIComponent(
    start,
  )}&end=${encodeURIComponent(end)}`;
  return withAuth(url, credentials);
}

async function fetchTimelineMetric(
  credentials: MetricoolCredentials,
  metric: string,
  start: string,
  end: string,
): Promise<TimelineOutcome> {
  const authedUrl = timelineUrl(credentials, metric, start, end);
  const masked = maskUrl(authedUrl);

  try {
    const response = await fetch(authedUrl);
    const raw = await readBody(response);
    const html = looksLikeHtml(raw);

    if (!response.ok) {
      return {
        ok: false,
        status: response.status,
        notFound: response.status === 404,
        unrecognised: false,
        html,
        error: describeUpstream(response.status, response.statusText, html ? "(HTML web page)" : raw, endpointPath(authedUrl)),
        raw: raw.slice(0, 200),
        maskedUrl: masked,
      };
    }

    let payload: unknown = null;

    try {
      payload = JSON.parse(raw);
    } catch {
      payload = null;
    }

    const points = extractTimelinePoints(payload);

    if (!points) {
      return {
        ok: false,
        status: 200,
        notFound: false,
        unrecognised: true,
        html,
        error: `Metricool answered HTTP 200 but the body held no recognisable list of data points.`,
        raw: raw.slice(0, 200),
        maskedUrl: masked,
      };
    }

    const values = points.map(timelinePointValue);
    const total = values.reduce((sum, value) => sum + value, 0);
    const latest = values.length > 0 ? values[values.length - 1] : 0;

    return { ok: true, total, latest, points: values.length, maskedUrl: masked };
  } catch (error) {
    return {
      ok: false,
      status: 0,
      notFound: false,
      unrecognised: false,
      html: false,
      error: error instanceof Error ? error.message : String(error),
      raw: "",
      maskedUrl: masked,
    };
  }
}

// ---------------------------------------------------------------------------
// Per-network posts (real per-platform figures).
//
// GET /v2/analytics/posts/{slug} returns a list of real posts, each with that
// network's own engagement fields. Confirmed against the live account: every
// network uses a DIFFERENT schema (Instagram's `impressionsTotal` is Facebook's
// `impressions` is TikTok's `viewCount`), so each needs its own field mapper
// below. Two rules hold across all of them:
//   1. The per-post `engagement` field is a RATE (a percentage, e.g. 16.67),
//      never a count. It is never summed; the engagement count is rebuilt from
//      the real interaction fields per network.
//   2. Fields are absent (LinkedIn) or null (Twitter) when zero, so every read
//      goes through num(), which turns null/undefined/non-numbers into 0.
//
// This endpoint wants full date-times (2026-06-19T00:00:00), unlike the v1
// /stats endpoints which want compact YYYYMMDD; see toMetricoolDateTime.
// ---------------------------------------------------------------------------

// The additive part of a metrics row (everything except followers/leads/posts).
type PostContribution = {
  impressions: number;
  reach: number;
  engagement: number;
  comments: number;
  shares: number;
  saves: number;
  watchTime: number;
  clicks: number;
  followsGained: number;
};

const EMPTY_CONTRIBUTION: PostContribution = {
  impressions: 0,
  reach: 0,
  engagement: 0,
  comments: 0,
  shares: 0,
  saves: 0,
  watchTime: 0,
  clicks: 0,
  followsGained: 0,
};

// null (Twitter), undefined (LinkedIn absent field), floats (YouTube), and
// numeric strings all collapse to a finite number or 0. Never NaN.
function num(value: unknown): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

// One mapper per network, reading that network's real field names (confirmed
// live). `engagement` here is the interaction COUNT, rebuilt from real counts,
// never the per-post engagement-rate field. A network with no interaction-count
// fields (LinkedIn only exposes an engagement rate) honestly contributes 0 to
// engagement rather than a fabricated number.
export const NETWORK_POST_MAPPERS: Record<
  string,
  (post: Record<string, unknown>) => PostContribution
> = {
  instagram: (p) => ({
    ...EMPTY_CONTRIBUTION,
    impressions: num(p.impressionsTotal),
    reach: num(p.reach),
    engagement: num(p.interactions),
    comments: num(p.comments),
    shares: num(p.shares),
    saves: num(p.saved),
    followsGained: num(p.follows),
  }),
  facebook: (p) => ({
    ...EMPTY_CONTRIBUTION,
    impressions: num(p.impressions),
    reach: num(p.impressionsUnique),
    engagement: num(p.reactions) + num(p.comments) + num(p.shares),
    comments: num(p.comments),
    shares: num(p.shares),
    watchTime: num(p.videoTimeWatched),
    clicks: num(p.clicks),
  }),
  tiktok: (p) => ({
    ...EMPTY_CONTRIBUTION,
    impressions: num(p.viewCount),
    reach: num(p.reach),
    engagement: num(p.likeCount) + num(p.commentCount) + num(p.shareCount),
    comments: num(p.commentCount),
    shares: num(p.shareCount),
    watchTime: num(p.totalTimeWatched),
  }),
  // LinkedIn's posts endpoint returns impressions/clicks/time but no
  // interaction-count fields (only an engagement rate), so engagement stays 0
  // honestly. Fields are absent when zero: num() handles the undefined reads.
  linkedin: (p) => ({
    ...EMPTY_CONTRIBUTION,
    impressions: num(p.impressions),
    watchTime: num(p.timeWatched),
    clicks: num(p.clicks),
  }),
  threads: (p) => ({
    ...EMPTY_CONTRIBUTION,
    impressions: num(p.views),
    engagement:
      num(p.likes) + num(p.replies) + num(p.reposts) + num(p.quotes) + num(p.shares),
    comments: num(p.replies),
    shares: num(p.reposts) + num(p.shares),
  }),
  // Twitter fields are literal null when zero; num(null) === 0.
  twitter: (p) => ({
    ...EMPTY_CONTRIBUTION,
    impressions: num(p.totalImpressions),
    engagement:
      num(p.totalLikes) + num(p.totalRetweets) + num(p.totalReplies) + num(p.totalQuotes),
    comments: num(p.totalReplies),
    shares: num(p.totalRetweets),
  }),
  // YouTube returns floats (views 152.0, likes 1.0); summed here, rounded once
  // at the end of aggregateNetworkPosts.
  youtube: (p) => ({
    ...EMPTY_CONTRIBUTION,
    impressions: num(p.views),
    engagement: num(p.likes) + num(p.comments) + num(p.shares),
    comments: num(p.comments),
    shares: num(p.shares),
    watchTime: num(p.watchMinutes),
  }),
};

// Sum every post's contribution for one network into a single integer row.
// ponytail: reach is summed per post, which overcounts unique reach when the
// same person saw several posts; there is no per-network unique-reach figure in
// this endpoint, so this is the honest ceiling. The sync report says so.
export function aggregateNetworkPosts(
  slug: string,
  posts: Array<Record<string, unknown>>,
): PostContribution {
  const mapper = NETWORK_POST_MAPPERS[slug];

  if (!mapper) {
    return { ...EMPTY_CONTRIBUTION };
  }

  const totals = posts.reduce<PostContribution>((sum, post) => {
    const one = mapper(post);
    return {
      impressions: sum.impressions + one.impressions,
      reach: sum.reach + one.reach,
      engagement: sum.engagement + one.engagement,
      comments: sum.comments + one.comments,
      shares: sum.shares + one.shares,
      saves: sum.saves + one.saves,
      watchTime: sum.watchTime + one.watchTime,
      clicks: sum.clicks + one.clicks,
      followsGained: sum.followsGained + one.followsGained,
    };
  }, { ...EMPTY_CONTRIBUTION });

  return {
    impressions: Math.round(totals.impressions),
    reach: Math.round(totals.reach),
    engagement: Math.round(totals.engagement),
    comments: Math.round(totals.comments),
    shares: Math.round(totals.shares),
    saves: Math.round(totals.saves),
    watchTime: Math.round(totals.watchTime),
    clicks: Math.round(totals.clicks),
    followsGained: Math.round(totals.followsGained),
  };
}

// The per-network posts endpoint wants full ISO date-times (start of day for
// `from`, end of day for `to`), confirmed live: a plain YYYY-MM-DD returns a
// 400 ValidationError. This is deliberately DIFFERENT from toMetricoolDate,
// which the v1 /stats endpoints still require as compact YYYYMMDD.
function toMetricoolDateTime(isoDate: string, endOfDay: boolean): string {
  return `${isoDate.slice(0, 10)}T${endOfDay ? "23:59:59" : "00:00:00"}`;
}

type NetworkPostsOutcome =
  | { ok: true; posts: Array<Record<string, unknown>>; maskedUrl: string }
  | {
      ok: false;
      status: number;
      notFound: boolean;
      unrecognised: boolean;
      html: boolean;
      error: string;
      raw: string;
      maskedUrl: string;
    };

async function fetchNetworkPosts(
  credentials: MetricoolCredentials,
  slug: string,
  from: string,
  to: string,
): Promise<NetworkPostsOutcome> {
  const url = `${METRICOOL_BASE_URL}/v2/analytics/posts/${encodeURIComponent(
    slug,
  )}?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`;
  const authedUrl = withAuth(url, credentials);
  const masked = maskUrl(authedUrl);

  try {
    const response = await fetch(authedUrl);
    const raw = await readBody(response);
    const html = looksLikeHtml(raw);

    if (!response.ok) {
      return {
        ok: false,
        status: response.status,
        notFound: response.status === 404,
        unrecognised: false,
        html,
        error: describeUpstream(
          response.status,
          response.statusText,
          html ? "(HTML web page)" : raw,
          endpointPath(authedUrl),
        ),
        raw: raw.slice(0, 200),
        maskedUrl: masked,
      };
    }

    let payload: unknown = null;

    try {
      payload = JSON.parse(raw);
    } catch {
      payload = null;
    }

    const points = extractTimelinePoints(payload);

    if (!points) {
      return {
        ok: false,
        status: 200,
        notFound: false,
        unrecognised: true,
        html,
        error: "Metricool answered HTTP 200 but the body held no recognisable list of posts.",
        raw: raw.slice(0, 200),
        maskedUrl: masked,
      };
    }

    const posts = points.filter(
      (point): point is Record<string, unknown> =>
        Boolean(point) && typeof point === "object" && !Array.isArray(point),
    );

    return { ok: true, posts, maskedUrl: masked };
  } catch (error) {
    return {
      ok: false,
      status: 0,
      notFound: false,
      unrecognised: false,
      html: false,
      error: error instanceof Error ? error.message : String(error),
      raw: "",
      maskedUrl: masked,
    };
  }
}

export async function syncMetricoolMetrics(
  credentials: MetricoolCredentials,
  rangeDays = 30,
): Promise<
  MetricoolResult<{
    metrics: PlatformDataMetrics[];
    skippedNetworks: string[];
    // A plain-English account of exactly what Metricool returned: the range
    // asked for, the brand and its connected networks, and per-metric
    // statuses with the exact URL called (token masked). Shown in the UI so
    // an empty sync is never a mystery.
    report: string[];
  }>
> {
  const brandCheck = await fetchBrandInfo(credentials);

  if (!brandCheck.ok) {
    return brandCheck;
  }

  const days = METRICOOL_RANGE_OPTIONS.includes(
    rangeDays as (typeof METRICOOL_RANGE_OPTIONS)[number],
  )
    ? rangeDays
    : 30;
  const { from, to } = lastNDayRange(days);
  // Metricool's v1 stats endpoints parse these date parameters as numbers, so
  // they must be the compact 8-digit YYYYMMDD form (for example 20260703).
  // A value with dashes ("2026-07-03") or a time component ("2026-07-03T00:00:00")
  // makes Metricool throw "For input string" and return HTTP 500.
  const start = toMetricoolDate(from);
  const end = toMetricoolDate(to);

  const report: string[] = [];
  const brandRow = brandCheck.value.row as Record<string, unknown>;
  const connectedNetworks = extractConnectedNetworks(brandRow);

  report.push(
    `Date range requested: ${from} to ${to} (sent to Metricool as ${start} and ${end}, last ${days} days).`,
  );
  report.push(`Brand found: "${brandCheck.value.label}" (Blog ID ${credentials.blogId}).`);

  if (connectedNetworks.length > 0) {
    report.push(
      `Networks the Metricool brand record shows connected: ${connectedNetworks.join(", ")}.`,
    );
  } else {
    report.push(
      `The brand record did not clearly list any connected networks. Raw brand record (truncated): ${JSON.stringify(brandRow).slice(0, 400)}`,
    );
  }

  // The per-network posts endpoint needs full date-times (start of day / end of
  // day), unlike the followers timeline which still needs compact YYYYMMDD.
  const fromDateTime = toMetricoolDateTime(from, false);
  const toDateTime = toMetricoolDateTime(to, true);

  // Only networks that BOTH map to an app Platform AND have a confirmed posts
  // slug are fetched. Unsupported connected networks (pinterest, gmb) are noted
  // and skipped, never fetched with a guessed slug.
  const targets = connectedNetworks
    .map((network) => ({
      network,
      platform: METRICOOL_NETWORK_TO_PLATFORM[network] as Platform | undefined,
      slug: METRICOOL_NETWORK_TO_POSTS_SLUG[network] as string | undefined,
    }))
    .filter(
      (candidate): candidate is { network: string; platform: Platform; slug: string } =>
        Boolean(candidate.platform) && Boolean(candidate.slug),
    );

  // Networks Metricool tracks but this app has no per-network sync for (for
  // example pinterest, gmb). These are the genuinely "not synced" ones the UI
  // lists; a network that IS supported but whose fetch fails is reported in
  // detail below instead, not lumped in here.
  const skippedNetworks = connectedNetworks.filter(
    (network) =>
      !METRICOOL_NETWORK_TO_PLATFORM[network] || !METRICOOL_NETWORK_TO_POSTS_SLUG[network],
  );

  if (skippedNetworks.length > 0) {
    report.push(
      `Connected networks with no per-network sync (not fetched): ${skippedNetworks.join(", ")}.`,
    );
  }

  const metrics: PlatformDataMetrics[] = [];

  // Fetch every supported network's posts in parallel.
  const postOutcomes = await Promise.all(
    targets.map((target) =>
      fetchNetworkPosts(credentials, target.slug, fromDateTime, toDateTime),
    ),
  );

  const postFailures: Array<Extract<NetworkPostsOutcome, { ok: false }>> = [];

  targets.forEach((target, index) => {
    const outcome = postOutcomes[index];

    if (!outcome.ok) {
      postFailures.push(outcome);
      const rawNote = outcome.raw.trim() ? ` Raw reply: ${outcome.raw}` : "";
      report.push(`${target.platform}: could not fetch posts (${outcome.error}).${rawNote}`);
      return;
    }

    if (outcome.posts.length === 0) {
      // Reachable, just no posts in this window. Not an error, and no row is
      // invented; the manager sees an honest "0 posts" note instead.
      report.push(
        `${target.platform}: reachable, 0 posts in this date range. URL: ${outcome.maskedUrl}.`,
      );
      return;
    }

    const totals = aggregateNetworkPosts(target.slug, outcome.posts);

    metrics.push({
      platform: target.platform,
      label: `${target.platform} (${outcome.posts.length} posts, last ${days} days)`,
      followers: 0,
      ...totals,
      leads: 0,
      posts: outcome.posts.length,
    });

    report.push(
      `${target.platform}: ${outcome.posts.length} posts, ${totals.impressions} impressions, ${totals.reach} reach, ${totals.engagement} interactions. URL: ${outcome.maskedUrl}.`,
    );
  });

  // Followers are only available brand-wide (no per-network split exists in this
  // API), so they are fetched once from the v1 timeline endpoint (compact
  // YYYYMMDD dates) and shown as a single clearly-labelled combined row. The
  // per-network rows above carry followers: 0 because a per-network follower
  // count is genuinely unavailable, NOT because the network has none.
  const followersOutcome = await fetchTimelineMetric(credentials, "followers", start, end);

  if (followersOutcome.ok && followersOutcome.latest > 0) {
    const anchor: Platform = targets[0]?.platform ?? "Facebook";
    metrics.push({
      platform: anchor,
      label: "Followers (all networks combined)",
      followers: Math.round(followersOutcome.latest),
      impressions: 0,
      reach: 0,
      engagement: 0,
      comments: 0,
      shares: 0,
      saves: 0,
      watchTime: 0,
      clicks: 0,
      followsGained: 0,
      leads: 0,
      posts: 0,
    });
    report.push(
      `Followers: ${Math.round(
        followersOutcome.latest,
      )} brand-wide (all networks combined; Metricool exposes no per-network follower count). Shown as one labelled row; per-network rows show 0 followers by design.`,
    );
  } else {
    report.push(
      `Followers: no brand-level figure returned${
        followersOutcome.ok ? " (endpoint reachable, value 0)" : ` (${followersOutcome.error})`
      }.`,
    );
  }

  report.push(
    "Note: per-network reach is summed across posts, which can exceed unique reach when the same person saw several posts. Metricool's posts endpoint has no per-network unique-reach figure.",
  );

  // No rows at all: distinguish a real failure from a genuinely empty account so
  // the UI never shows a mystery blank, and never invents numbers.
  if (metrics.length === 0) {
    if (targets.length === 0) {
      return {
        ok: false,
        error:
          "Metricool connected, but the brand record shows no networks this app can sync per-network (checked Instagram, Facebook, TikTok, LinkedIn, X/Twitter, Threads, YouTube). Use the PDF import for the rest.",
      };
    }

    if (postFailures.length === targets.length) {
      const anyHtml = postFailures.some((failure) => failure.html);

      if (anyHtml) {
        return {
          ok: false,
          error: `Every per-network posts request returned Metricool's website HTML rather than API data, so the endpoint did not reach the API for this account. Example URL (token masked): ${postFailures[0].maskedUrl}. Use the PDF import meanwhile.`,
        };
      }

      const planGated = postFailures.every((failure) =>
        [401, 402, 403].includes(failure.status),
      );

      if (planGated) {
        return {
          ok: false,
          error:
            "Metricool returned 401/402/403 for every network, which means API access is not enabled on your plan (it needs at least the Advanced plan). Use the PDF import instead.",
          status: 403,
        };
      }

      const first = postFailures.find((failure) => failure.unrecognised) ?? postFailures[0];
      return { ok: false, error: first.error, status: first.status };
    }
    // Otherwise: some networks were reachable but simply had no posts in range
    // (and no followers). Return ok-but-empty so the honest report is shown.
  }

  return { ok: true, value: { metrics, skippedNetworks, report } };
}

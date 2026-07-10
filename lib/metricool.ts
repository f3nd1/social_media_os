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
//   - Dates: plain calendar dates YYYY-MM-DD only. A time component such as
//     "T00:00:00" makes Metricool throw "For input string" and return HTTP 500.
// Earlier code called /v2/settings/brands and /v2/analytics/timelines with an
// X-Mc-Auth header, which is why Metricool served its website HTML with a 404:
// the request never reached the API router.
//
// Nothing here ever reports success on a failed call. Every failure is
// returned to the UI as the exact status, the raw body, and the URL called
// (with the token masked) so the owner can compare it against the docs.

import { type Platform } from "@/lib/social-calendar-data";
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

// Timeline metric ids, matching the metric names the verified CLI documents
// for `analytics timeline` (followers, impressions, engagement, reach,
// clicks). Some networks may not report every metric.
const METRICOOL_METRIC_IDS = {
  followers: "followers",
  impressions: "impressions",
  reach: "reach",
  engagement: "engagement",
  clicks: "clicks",
} as const;

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

// Safeguard against the date-format regression: Metricool rejects a time
// component on its date parameters, so any date still carrying a "T" must be
// surfaced loudly rather than failing silently with a 500 later.
function assertPlainMetricoolDate(value: string, label: string) {
  if (value.includes("T")) {
    console.warn(
      `[metricool] ${label} date "${value}" still contains a time component. ` +
        "Metricool rejects times (throws \"For input string\"); send YYYY-MM-DD only.",
    );
  }
}

// Metricool date parameters must be plain dates (YYYY-MM-DD) with no time and no
// timezone; a time component makes the API answer HTTP 500.
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

async function fetchPostCount(
  credentials: MetricoolCredentials,
  start: string,
  end: string,
): Promise<number> {
  try {
    assertPlainMetricoolDate(start, "posts start");
    assertPlainMetricoolDate(end, "posts end");
    const url = withAuth(
      `${METRICOOL_BASE_URL}/posts?start=${encodeURIComponent(start)}&end=${encodeURIComponent(end)}`,
      credentials,
    );
    const response = await fetch(url);

    if (!response.ok) {
      return 0;
    }

    const raw = await readBody(response);
    let payload: unknown = null;
    try {
      payload = JSON.parse(raw);
    } catch {
      return 0;
    }

    const list = extractTimelinePoints(payload);
    return list ? list.length : 0;
  } catch {
    return 0;
  }
}

// One plain-words phrase for a metric outcome, used in the sync report.
function describeTimelineOutcome(outcome: TimelineOutcome): string {
  if (outcome.ok) {
    return `${outcome.points} data point${outcome.points === 1 ? "" : "s"}`;
  }

  if (outcome.html) {
    return "HTML web page (wrong endpoint)";
  }

  if (outcome.unrecognised) {
    return "HTTP 200 but unreadable body";
  }

  return outcome.status === 0 ? "network error" : `HTTP ${outcome.status}`;
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
  // Metricool's timeline API rejects any time component on these dates: a value
  // like "2026-07-03T00:00:00" throws "For input string: 2026-07-03T00:00:00"
  // and returns HTTP 500. Send plain YYYY-MM-DD dates only, with no T portion.
  const start = from;
  const end = to;

  const report: string[] = [];
  const brandRow = brandCheck.value.row as Record<string, unknown>;
  const connectedNetworks = extractConnectedNetworks(brandRow);

  report.push(`Date range requested: ${start} to ${end} (last ${days} days).`);
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

  // Metricool's timeline API is keyed by brand (blogId), not per network, so
  // each metric is fetched once for the brand.
  const metricNames = Object.values(METRICOOL_METRIC_IDS);
  const outcomes = await Promise.all(
    metricNames.map((metric) => fetchTimelineMetric(credentials, metric, start, end)),
  );
  const [followers, impressions, reach, engagement, clicks] = outcomes;

  metricNames.forEach((metric, index) => {
    const outcome = outcomes[index];
    const rawNote = !outcome.ok && outcome.raw.trim() ? ` Raw reply: ${outcome.raw}` : "";
    report.push(
      `${metric}: ${describeTimelineOutcome(outcome)}. URL called: ${outcome.maskedUrl}.${rawNote}`,
    );
  });

  const failures = outcomes.filter(
    (outcome): outcome is Extract<TimelineOutcome, { ok: false }> => !outcome.ok,
  );
  const anyHtml = failures.some((failure) => failure.html);
  const allFailed = failures.length === outcomes.length;

  // Every call served the website HTML: the endpoint/host is wrong for this
  // account. Report it plainly with the masked URL to compare against docs.
  if (allFailed && anyHtml) {
    return {
      ok: false,
      error: `Every metric request returned Metricool's website HTML rather than API data, so the timeline endpoint did not reach the API for this account. Example URL called (token masked): ${outcomes[0].maskedUrl}. Compare this against Metricool's API docs; use the CSV import meanwhile.`,
    };
  }

  if (allFailed) {
    const planGated = failures.every((failure) => [401, 402, 403].includes(failure.status));

    if (planGated) {
      return {
        ok: false,
        error:
          "Metricool returned 401/402/403 for every metric, which means API access is not enabled on your plan (it needs at least the Advanced plan). Use the CSV import instead.",
        status: 403,
      };
    }

    const allNotFound = failures.every((failure) => failure.notFound);

    if (!allNotFound) {
      const first = failures.find((f) => f.unrecognised) ?? failures[0];
      return { ok: false, error: first.error, status: first.status };
    }
    // All clean 404s: no data for this brand in this range. Fall through to a
    // successful-but-empty result so the report is shown; no numbers invented.
  }

  const metrics: PlatformDataMetrics[] = [];
  const skippedNetworks: string[] = [];
  const gotData = outcomes.some((outcome) => outcome.ok && outcome.points > 0);

  if (gotData) {
    // The timeline is brand-level (all networks combined), so this is a single
    // "Brand total" row. It still needs a platform key to attach to an audit on
    // apply: the first connected network that maps to a platform, or a default.
    // The row is labelled "Brand total (all networks)" so it is never mistaken
    // for one network's figures. Reviewed and approved before it is applied.
    const primaryNetwork = connectedNetworks.find(
      (network) => METRICOOL_NETWORK_TO_PLATFORM[network],
    );
    const platform: Platform = primaryNetwork
      ? METRICOOL_NETWORK_TO_PLATFORM[primaryNetwork]
      : "Facebook";
    const posts = await fetchPostCount(credentials, start, end);

    report.push(
      `Producing one row for review, labelled "Brand total (all networks)" and stored against the ${platform} audit${
        primaryNetwork ? "" : " (no network mapped, using a default)"
      }. Metricool's timeline API returns brand totals, not a per-network split; for per-network figures use the CSV export.`,
    );

    metrics.push({
      platform,
      label: "Brand total (all networks)",
      followers: followers.ok ? Math.round(followers.latest) : 0,
      impressions: impressions.ok ? Math.round(impressions.total) : 0,
      reach: reach.ok ? Math.round(reach.total) : 0,
      engagement: engagement.ok ? Math.round(engagement.total) : 0,
      comments: 0,
      shares: 0,
      saves: 0,
      watchTime: 0,
      clicks: clicks.ok ? Math.round(clicks.total) : 0,
      followsGained: 0,
      leads: 0,
      posts,
    });
  }

  return { ok: true, value: { metrics, skippedNetworks, report } };
}

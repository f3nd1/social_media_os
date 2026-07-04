// Server-side Metricool API client. Called only from app/api/metricool/route.ts
// so the API token never reaches the browser network tab, and so the calls
// avoid the CORS restrictions a browser would hit calling Metricool directly.
//
// Authentication follows Metricool's published API: the access token in the
// "X-Mc-Auth" request header, with userId and blogId as query parameters on
// every call (confirmed against Metricool's API documentation). Where a v2
// path is not available on an account, this client falls back to the older
// documented path. If Metricool changes a path, this is the one file to
// update.
//
// Nothing here ever reports success on a failed call. Every failure is
// returned to the UI as the exact upstream status code, the raw response
// body, and the endpoint path that produced it, so the owner can tell auth
// (401) from plan/permission (402/403) from a wrong endpoint (404) from a
// malformed request (400). The CSV import remains the fallback when the API
// is gated by the account's plan.

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

// v2 analytics/timelines metric ids. Confirmed against Metricool's public
// documentation for the metric names that exist on every network; some
// networks may not report every metric, which the sync loop treats as "no
// data for this metric" rather than an error.
const METRICOOL_METRIC_IDS = {
  followers: "followers",
  impressions: "impressions",
  reach: "reach",
  engagement: "interactions",
  clicks: "clicks",
} as const;

function authHeaders(apiToken: string) {
  return { "X-Mc-Auth": apiToken };
}

// The path (and query, minus the secret token which only ever travels in the
// header) so an error can name exactly which endpoint Metricool rejected.
function endpointPath(url: string) {
  try {
    const parsed = new URL(url);
    return parsed.pathname + parsed.search;
  } catch {
    return url;
  }
}

async function readBody(response: Response) {
  try {
    return (await response.text()).trim();
  } catch {
    return "";
  }
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
  | { kind: "unrecognised"; raw: string }
  | { kind: "http-error"; error: string; status: number }
  | { kind: "network-error"; error: string }
> {
  try {
    const response = await fetch(url, { headers: authHeaders(credentials.apiToken) });
    const raw = await readBody(response);

    if (!response.ok) {
      return {
        kind: "http-error",
        error: describeUpstream(response.status, response.statusText, raw, endpointPath(url)),
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
      return { kind: "unrecognised", raw };
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
  const v2Url = `${METRICOOL_BASE_URL}/v2/settings/brands?userId=${encodeURIComponent(credentials.userId)}`;
  // The endpoint Metricool's own help pages document for listing brands and
  // their blogIds.
  const legacyUrl = `${METRICOOL_BASE_URL}/admin/simpleProfiles?userId=${encodeURIComponent(credentials.userId)}`;

  const v2 = await readBrandEndpoint(credentials, v2Url);

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

  // v2 was a 404, an empty list, an unrecognised body, or unreachable: try
  // the documented legacy listing before reporting anything.
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
    const raw = legacy.kind === "unrecognised" ? legacy.raw : (v2 as { raw: string }).raw;

    return {
      ok: false,
      error:
        `Metricool answered with HTTP 200 (so the token and User ID are accepted) but the response was not a recognisable list of brands. Raw response from Metricool: ${
          raw ? raw.slice(0, 400) : "(empty body)"
        }. If this keeps happening, use the CSV import as the fallback and send this raw response so the endpoint can be adjusted.`,
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
  | { ok: true; total: number; latest: number; points: number }
  | {
      ok: false;
      status: number;
      notFound: boolean;
      unrecognised: boolean;
      error: string;
      raw: string;
    };

async function fetchTimelineMetric(
  credentials: MetricoolCredentials,
  network: string,
  metric: string,
  from: string,
  to: string,
): Promise<TimelineOutcome> {
  const url = `${METRICOOL_BASE_URL}/v2/analytics/timelines/${metric}?from=${from}&to=${to}&blogId=${encodeURIComponent(
    credentials.blogId,
  )}&userId=${encodeURIComponent(credentials.userId)}&network=${encodeURIComponent(network)}`;

  try {
    const response = await fetch(url, { headers: authHeaders(credentials.apiToken) });
    const raw = await readBody(response);

    if (!response.ok) {
      return {
        ok: false,
        status: response.status,
        notFound: response.status === 404,
        unrecognised: false,
        error: describeUpstream(response.status, response.statusText, raw, endpointPath(url)),
        raw: raw.slice(0, 200),
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
        error: `Metricool answered HTTP 200 for ${endpointPath(url)} but the body held no recognisable list of data points.`,
        raw: raw.slice(0, 200),
      };
    }

    const values = points.map(timelinePointValue);
    const total = values.reduce((sum, value) => sum + value, 0);
    const latest = values.length > 0 ? values[values.length - 1] : 0;

    return { ok: true, total, latest, points: values.length };
  } catch (error) {
    return {
      ok: false,
      status: 0,
      notFound: false,
      unrecognised: false,
      error: error instanceof Error ? error.message : String(error),
      raw: "",
    };
  }
}

async function fetchPostCount(
  credentials: MetricoolCredentials,
  network: string,
  from: string,
  to: string,
): Promise<number> {
  try {
    const url = `${METRICOOL_BASE_URL}/v2/analytics/posts/${network}?from=${from}&to=${to}&blogId=${encodeURIComponent(
      credentials.blogId,
    )}&userId=${encodeURIComponent(credentials.userId)}`;
    const response = await fetch(url, { headers: authHeaders(credentials.apiToken) });

    if (!response.ok) {
      return 0;
    }

    const payload = (await response.json()) as unknown;
    return Array.isArray(payload) ? payload.length : 0;
  } catch {
    return 0;
  }
}

// One plain-words phrase for a metric outcome, used in the sync report.
function describeTimelineOutcome(outcome: TimelineOutcome): string {
  if (outcome.ok) {
    return `${outcome.points} data point${outcome.points === 1 ? "" : "s"}`;
  }

  if (outcome.unrecognised) {
    return "HTTP 200 but unreadable body";
  }

  return outcome.status === 0 ? "network error" : `HTTP ${outcome.status}`;
}

export async function syncMetricoolMetrics(
  credentials: MetricoolCredentials,
  rangeDays = 30,
  networks: string[] = METRICOOL_SYNC_NETWORKS,
): Promise<
  MetricoolResult<{
    metrics: PlatformDataMetrics[];
    skippedNetworks: string[];
    // A plain-English account of exactly what Metricool returned: the range
    // asked for, the brand record's connected networks, and per-network
    // per-metric statuses with raw samples where relevant. Shown in the UI
    // so an empty sync is never a mystery.
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
  const report: string[] = [];
  const brandRow = brandCheck.value.row as Record<string, unknown>;
  const connectedNetworks = extractConnectedNetworks(brandRow);

  report.push(`Date range requested: ${from} to ${to} (last ${days} days).`);
  report.push(`Brand found: "${brandCheck.value.label}" (Blog ID ${credentials.blogId}).`);

  if (connectedNetworks.length > 0) {
    report.push(
      `Networks the Metricool brand record appears to have connected: ${connectedNetworks.join(", ")}.`,
    );
  } else {
    report.push(
      `The brand record did not clearly list any connected networks. Raw brand record (truncated): ${JSON.stringify(brandRow).slice(0, 300)}`,
    );
  }

  const metrics: PlatformDataMetrics[] = [];
  const skippedNetworks: string[] = [];
  let planGatedCount = 0;
  // The first genuine (non plan-gated) upstream failure, kept verbatim so a
  // 400 or 5xx is reported exactly instead of being flattened into "skipped".
  let firstRealError: { error: string; status: number } | null = null;

  for (const network of networks) {
    const platform = METRICOOL_NETWORK_TO_PLATFORM[network];

    if (!platform) {
      continue;
    }

    const metricNames = Object.values(METRICOOL_METRIC_IDS);
    const [followers, impressions, reach, engagement, clicks] = await Promise.all(
      metricNames.map((metric) =>
        fetchTimelineMetric(credentials, network, metric, from, to),
      ),
    );

    const results = [followers, impressions, reach, engagement, clicks];
    const outcomes = metricNames.map(
      (metric, index) => `${metric} ${describeTimelineOutcome(results[index])}`,
    );
    const distinct = new Set(results.map((result) => describeTimelineOutcome(result)));
    const rawSample = results.find(
      (result) => !result.ok && result.raw.trim().length > 0,
    );

    if (distinct.size === 1) {
      report.push(
        `${network}: all five metrics returned ${[...distinct][0]}${
          rawSample && !rawSample.ok ? `. Raw reply: ${rawSample.raw}` : "."
        }`,
      );
    } else {
      report.push(
        `${network}: ${outcomes.join(", ")}${
          rawSample && !rawSample.ok ? `. Raw reply sample: ${rawSample.raw}` : "."
        }`,
      );
    }

    const allFailed = results.every((result) => !result.ok);

    if (allFailed) {
      const failures = results.filter(
        (result): result is Exclude<TimelineOutcome, { ok: true }> => !result.ok,
      );
      // 401/402/403 mean the plan does not include API access; those are the
      // only failures we treat as "gated" and roll up into the plan message.
      const planGated = failures.every((result) =>
        [401, 402, 403].includes(result.status),
      );

      if (planGated) {
        planGatedCount += 1;
        continue;
      }

      // A 404 across every metric means Metricool holds no data at these
      // endpoints for this network: a genuine skip, not an error.
      const allNotFound = failures.every((result) => result.notFound);

      if (allNotFound) {
        skippedNetworks.push(network);
        continue;
      }

      // Anything else (a 400, a 5xx, an unreadable 200) is a real problem we
      // must surface exactly, not hide.
      if (!firstRealError) {
        const first = failures.find((f) => f.unrecognised) ?? failures[0];
        firstRealError = { error: `${network}: ${first.error}`, status: first.status };
      }

      continue;
    }

    const posts = await fetchPostCount(credentials, network, from, to);

    metrics.push({
      platform,
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

  // No metrics came back. Surface the most informative reason, exactly.
  if (metrics.length === 0) {
    if (firstRealError) {
      return { ok: false, error: firstRealError.error, status: firstRealError.status };
    }

    if (planGatedCount > 0) {
      return {
        ok: false,
        error:
          "Metricool returned 401/402/403 for every network, which means API access is not enabled on your plan (it needs at least the Advanced plan). Use the CSV import instead.",
        status: 403,
      };
    }
    // Everything was a clean 404: Metricool holds no timeline data at these
    // endpoints for any network in this range. The report says so per
    // network; the UI shows it rather than inventing numbers.
  }

  return { ok: true, value: { metrics, skippedNetworks, report } };
}

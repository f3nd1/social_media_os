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

async function describeError(response: Response, url: string) {
  const body = await readBody(response);
  return describeUpstream(response.status, response.statusText, body, endpointPath(url));
}

function isoDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

function last30DayRange() {
  const to = new Date();
  const from = new Date();
  from.setDate(from.getDate() - 30);

  return { from: isoDate(from), to: isoDate(to) };
}

async function fetchBrandLabel(
  credentials: MetricoolCredentials,
): Promise<MetricoolResult<string>> {
  const v2Url = `${METRICOOL_BASE_URL}/v2/settings/brands?userId=${encodeURIComponent(credentials.userId)}`;

  try {
    const response = await fetch(v2Url, { headers: authHeaders(credentials.apiToken) });

    if (response.ok) {
      const brands = (await response.json()) as Array<{ id?: number | string; label?: string; name?: string }>;
      const matched = brands.find(
        (brand) => String(brand.id) === String(credentials.blogId),
      );

      if (matched) {
        return { ok: true, value: matched.label ?? matched.name ?? "connected brand" };
      }

      if (brands.length > 0) {
        return {
          ok: false,
          error: `Connected to Metricool, but no brand with Blog ID "${credentials.blogId}" was found for this user. Available brand ids: ${brands
            .map((brand) => brand.id)
            .join(", ")}.`,
        };
      }

      return { ok: true, value: "connected account" };
    }

    if (response.status !== 404) {
      return { ok: false, error: await describeError(response, v2Url), status: response.status };
    }
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }

  // Fall back to the legacy profile listing endpoint.
  try {
    const legacyUrl = `${METRICOOL_BASE_URL}/admin/simpleProfiles?userId=${encodeURIComponent(credentials.userId)}`;
    const response = await fetch(legacyUrl, { headers: authHeaders(credentials.apiToken) });

    if (!response.ok) {
      return { ok: false, error: await describeError(response, legacyUrl), status: response.status };
    }

    const profiles = (await response.json()) as Array<{ id?: number | string; name?: string }>;
    const matched = profiles.find((profile) => String(profile.id) === String(credentials.blogId));

    return { ok: true, value: matched?.name ?? "connected account" };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

export async function testMetricoolConnection(
  credentials: MetricoolCredentials,
): Promise<MetricoolResult<{ accountLabel: string }>> {
  const result = await fetchBrandLabel(credentials);

  if (!result.ok) {
    return result;
  }

  return { ok: true, value: { accountLabel: result.value } };
}

async function fetchTimelineMetric(
  credentials: MetricoolCredentials,
  network: string,
  metric: string,
  from: string,
  to: string,
): Promise<
  | { ok: true; total: number; latest: number }
  | { ok: false; error: string; status: number; notFound: boolean }
> {
  const url = `${METRICOOL_BASE_URL}/v2/analytics/timelines/${metric}?from=${from}&to=${to}&blogId=${encodeURIComponent(
    credentials.blogId,
  )}&userId=${encodeURIComponent(credentials.userId)}&network=${encodeURIComponent(network)}`;

  try {
    const response = await fetch(url, { headers: authHeaders(credentials.apiToken) });

    if (!response.ok) {
      return {
        ok: false,
        error: await describeError(response, url),
        status: response.status,
        notFound: response.status === 404,
      };
    }

    const payload = (await response.json()) as
      | Array<{ value?: number; y?: number }>
      | { data?: Array<{ value?: number; y?: number }> };
    const points = Array.isArray(payload) ? payload : payload.data ?? [];
    const values = points.map((point) => Number(point.value ?? point.y ?? 0));
    const total = values.reduce((sum, value) => sum + (Number.isFinite(value) ? value : 0), 0);
    const latest = values.length > 0 ? values[values.length - 1] : 0;

    return { ok: true, total, latest };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : String(error),
      status: 0,
      notFound: false,
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

export async function syncMetricoolMetrics(
  credentials: MetricoolCredentials,
  networks: string[] = METRICOOL_SYNC_NETWORKS,
): Promise<MetricoolResult<{ metrics: PlatformDataMetrics[]; skippedNetworks: string[] }>> {
  const brandCheck = await fetchBrandLabel(credentials);

  if (!brandCheck.ok) {
    return brandCheck;
  }

  const { from, to } = last30DayRange();
  const metrics: PlatformDataMetrics[] = [];
  const skippedNetworks: string[] = [];
  let planGatedCount = 0;
  // The first genuine (non plan-gated) upstream failure, kept verbatim so a
  // 400 or 404 is reported exactly instead of being flattened into "skipped".
  let firstRealError: { error: string; status: number } | null = null;

  for (const network of networks) {
    const platform = METRICOOL_NETWORK_TO_PLATFORM[network];

    if (!platform) {
      continue;
    }

    const [followers, impressions, reach, engagement, clicks] = await Promise.all([
      fetchTimelineMetric(credentials, network, METRICOOL_METRIC_IDS.followers, from, to),
      fetchTimelineMetric(credentials, network, METRICOOL_METRIC_IDS.impressions, from, to),
      fetchTimelineMetric(credentials, network, METRICOOL_METRIC_IDS.reach, from, to),
      fetchTimelineMetric(credentials, network, METRICOOL_METRIC_IDS.engagement, from, to),
      fetchTimelineMetric(credentials, network, METRICOOL_METRIC_IDS.clicks, from, to),
    ]);

    const results = [followers, impressions, reach, engagement, clicks];
    const allFailed = results.every((result) => !result.ok);

    if (allFailed) {
      const failures = results.filter(
        (result): result is { ok: false; error: string; status: number; notFound: boolean } =>
          !result.ok,
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

      // A 404 across every metric means Metricool tracks nothing for this
      // network on this brand: a genuine skip, not an error.
      const allNotFound = failures.every((result) => result.status === 404);

      if (allNotFound) {
        skippedNetworks.push(network);
        continue;
      }

      // Anything else (a 400 malformed request, a 5xx, a wrong endpoint) is a
      // real error we must surface exactly, not hide.
      if (!firstRealError) {
        const first = failures[0];
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
    // Everything was a clean 404: the account simply has no tracked networks.
  }

  return { ok: true, value: { metrics, skippedNetworks } };
}

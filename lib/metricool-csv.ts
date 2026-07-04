// Flexible parser for Metricool CSV exports. Detects columns by header name
// rather than assuming one fixed export shape, so it works for both
// post-level exports (many rows per network across dates) and growth or
// summary exports (one row per network). Rows are aggregated per network by
// summing, which works for both shapes without knowing which one it is ahead
// of time.

import {
  platforms,
  type Platform,
} from "@/lib/social-calendar-data";
import type { PlatformDataMetrics } from "@/lib/pdf-data-import";
import { METRICOOL_NETWORK_TO_PLATFORM } from "@/lib/metricool";

export type MetricoolCsvParseResult =
  | { ok: true; metrics: PlatformDataMetrics[] }
  | { ok: false; error: string; foundHeaders: string[] };

type MetricKey = Exclude<keyof PlatformDataMetrics, "platform">;

const NETWORK_HEADER_ALIASES = ["network", "social network", "platform", "channel"];

const METRIC_HEADER_ALIASES: Record<MetricKey, string[]> = {
  followers: ["followers", "fans", "audience", "subscribers"],
  impressions: ["impressions", "views", "visualizations"],
  reach: ["reach", "unique reach", "accounts reached"],
  engagement: ["interactions", "engagement", "engagements", "likes"],
  comments: ["comments", "comment count"],
  shares: ["shares", "retweets", "reposts", "share count"],
  saves: ["saves", "saved", "bookmarks"],
  watchTime: ["watch time", "watchtime"],
  clicks: ["clicks", "link clicks", "url clicks"],
  followsGained: ["new followers", "follower growth", "followers gained", "growth"],
  leads: ["leads", "enquiries", "inquiries"],
  posts: ["posts", "post count", "publications", "published posts"],
};

const METRIC_KEYS = Object.keys(METRIC_HEADER_ALIASES) as MetricKey[];

// Metricool network name aliases, in addition to the app's own Platform
// literal names (e.g. a header cell might read "Instagram" already).
const NETWORK_NAME_TO_KEY: Record<string, string> = {
  facebook: "facebook",
  instagram: "instagram",
  twitter: "twitter",
  x: "x",
  "x/twitter": "twitter",
  linkedin: "linkedin",
  linkedin_company: "linkedin",
  tiktok: "tiktok",
  youtube: "youtube",
  "youtube shorts": "youtube",
  threads: "threads",
};

export function parseMetricoolCsv(csvText: string): MetricoolCsvParseResult {
  const rows = splitCsvRows(csvText);

  if (rows.length < 2) {
    return {
      ok: false,
      error: "The file has no data rows below the header row.",
      foundHeaders: rows[0] ?? [],
    };
  }

  const rawHeaders = rows[0];
  const headers = rawHeaders.map((header) => normaliseHeader(header));

  const networkColumnIndex = headers.findIndex((header) =>
    NETWORK_HEADER_ALIASES.some((alias) => header === alias || header.includes(alias)),
  );

  if (networkColumnIndex === -1) {
    return {
      ok: false,
      error:
        "Could not find a column identifying the social network. Looked for a header named Network, Platform, Social network, or Channel.",
      foundHeaders: rawHeaders,
    };
  }

  const metricColumnByKey = new Map<MetricKey, number>();

  headers.forEach((header, index) => {
    if (index === networkColumnIndex) {
      return;
    }

    for (const key of METRIC_KEYS) {
      if (metricColumnByKey.has(key)) {
        continue;
      }

      if (METRIC_HEADER_ALIASES[key].some((alias) => header === alias || header.includes(alias))) {
        metricColumnByKey.set(key, index);
      }
    }
  });

  if (metricColumnByKey.size === 0) {
    const expected = METRIC_KEYS.map((key) => METRIC_HEADER_ALIASES[key][0]).join(", ");

    return {
      ok: false,
      error: `Found a network column but no recognisable metric columns. Expected headers like: ${expected}.`,
      foundHeaders: rawHeaders,
    };
  }

  const metricsByPlatform = new Map<Platform, PlatformDataMetrics>();

  for (const row of rows.slice(1)) {
    const networkCell = row[networkColumnIndex]?.toLowerCase().trim() ?? "";
    const networkKey = NETWORK_NAME_TO_KEY[networkCell] ?? networkCell;
    const platform =
      METRICOOL_NETWORK_TO_PLATFORM[networkKey] ??
      platforms.find((candidate) => candidate.toLowerCase() === networkCell);

    if (!platform) {
      continue;
    }

    const existing =
      metricsByPlatform.get(platform) ?? emptyPlatformMetrics(platform);

    metricColumnByKey.forEach((columnIndex, key) => {
      const value = parseNumericCell(row[columnIndex]);
      existing[key] += value;
    });

    metricsByPlatform.set(platform, existing);
  }

  if (metricsByPlatform.size === 0) {
    return {
      ok: false,
      error:
        "The network column was found, but no rows matched a supported platform (Facebook, Instagram, TikTok, LinkedIn, YouTube Shorts, X/Twitter, Threads).",
      foundHeaders: rawHeaders,
    };
  }

  return { ok: true, metrics: [...metricsByPlatform.values()] };
}

function emptyPlatformMetrics(platform: Platform): PlatformDataMetrics {
  return {
    platform,
    followers: 0,
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
  };
}

function normaliseHeader(header: string) {
  return header.trim().toLowerCase().replace(/[_-]/g, " ");
}

function parseNumericCell(value: string | undefined) {
  if (!value) {
    return 0;
  }

  const cleaned = value.replace(/[^0-9.\-]/g, "");
  const parsed = Number(cleaned);

  return Number.isFinite(parsed) ? parsed : 0;
}

function splitCsvRows(csvText: string): string[][] {
  return csvText
    .replace(/\r\n/g, "\n")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map(splitCsvLine);
}

function splitCsvLine(line: string): string[] {
  const cells: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    const nextChar = line[index + 1];

    if (char === "\"" && nextChar === "\"") {
      current += "\"";
      index += 1;
      continue;
    }

    if (char === "\"") {
      inQuotes = !inQuotes;
      continue;
    }

    if (char === "," && !inQuotes) {
      cells.push(current.trim());
      current = "";
      continue;
    }

    current += char;
  }

  cells.push(current.trim());

  return cells;
}

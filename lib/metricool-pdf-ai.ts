// Prompt building and output mapping for the AI breakdown of a Metricool PDF
// report into per-platform metrics. Pure helpers, no network.
//
// Metricool's API only exposes combined totals across every connected network,
// so the manager exports a PDF (which does show each network) and the AI reads
// it back into per-platform numbers. The mapped output reuses the existing
// PlatformDataMetrics review/approve/apply pipeline unchanged.

import { platforms, type Platform } from "@/lib/social-calendar-data";
import type { PlatformDataMetrics } from "@/lib/pdf-data-import";

const METRIC_KEYS = [
  "followers",
  "impressions",
  "reach",
  "engagement",
  "comments",
  "shares",
  "saves",
  "watchTime",
  "clicks",
  "followsGained",
  "leads",
  "posts",
] as const;

type MetricKey = (typeof METRIC_KEYS)[number];

export type MetricoolPdfDraft = {
  platforms: Array<
    { platform: string } & Partial<Record<MetricKey, number | string>>
  >;
};

export function buildMetricoolPdfSystemPrompt(): string {
  return [
    "You are a marketing analytics assistant for a private college in Singapore.",
    "You read the text of a Metricool analytics PDF export and break it down into per-platform numbers for a human Marketing Manager to review and approve. You never apply the numbers yourself.",
    "Only report numbers that actually appear in the report text. Never invent or estimate figures. If a metric is not present for a platform, use 0.",
    "Report one row per individual social network. Do not output combined 'all networks' or brand-total rows; the manager needs each network split out.",
    `Valid platform names are exactly: ${platforms.join(", ")}. Map obvious aliases (for example 'IG' to Instagram, 'YouTube' to YouTube Shorts, 'X' or 'Twitter' to X/Twitter). Skip any network that is not in this list.`,
    "Use British spelling. Do not use em dashes.",
    "Return only a single JSON object matching the requested shape.",
  ].join(" ");
}

export function buildMetricoolPdfUserPrompt(reportText: string): string {
  const shape = {
    platforms: [
      {
        platform: `string, one of: ${platforms.join(", ")}`,
        followers: "number",
        impressions: "number",
        reach: "number",
        engagement: "number",
        comments: "number",
        shares: "number",
        saves: "number",
        watchTime: "number, seconds",
        clicks: "number",
        followsGained: "number",
        leads: "number",
        posts: "number",
      },
    ],
  };

  return [
    "Break the following Metricool report text into per-platform metrics.",
    "",
    "REPORT TEXT:",
    reportText,
    "",
    "Return a JSON object with exactly this shape, one entry per network found:",
    JSON.stringify(shape, null, 2),
  ].join("\n");
}

function resolvePlatform(value: string): Platform | null {
  const normalised = value.trim().toLowerCase();
  return (
    platforms.find((platform) => platform.toLowerCase() === normalised) ?? null
  );
}

function toNonNegativeNumber(value: number | string | undefined): number {
  if (typeof value === "number") {
    return Number.isFinite(value) && value > 0 ? Math.round(value) : 0;
  }

  if (typeof value === "string") {
    const parsed = Number(value.replace(/[^\d.-]/g, ""));
    return Number.isFinite(parsed) && parsed > 0 ? Math.round(parsed) : 0;
  }

  return 0;
}

// Validate the model's draft into clean PlatformDataMetrics rows: known
// platforms only, numeric non-negative values, and no all-zero rows.
export function mapMetricoolPdfDraft(draft: MetricoolPdfDraft): PlatformDataMetrics[] {
  if (!draft || !Array.isArray(draft.platforms)) {
    return [];
  }

  const rows: PlatformDataMetrics[] = [];

  for (const entry of draft.platforms) {
    const platform = resolvePlatform(String(entry?.platform ?? ""));

    if (!platform) {
      continue;
    }

    const row: PlatformDataMetrics = {
      platform,
      followers: toNonNegativeNumber(entry.followers),
      impressions: toNonNegativeNumber(entry.impressions),
      reach: toNonNegativeNumber(entry.reach),
      engagement: toNonNegativeNumber(entry.engagement),
      comments: toNonNegativeNumber(entry.comments),
      shares: toNonNegativeNumber(entry.shares),
      saves: toNonNegativeNumber(entry.saves),
      watchTime: toNonNegativeNumber(entry.watchTime),
      clicks: toNonNegativeNumber(entry.clicks),
      followsGained: toNonNegativeNumber(entry.followsGained),
      leads: toNonNegativeNumber(entry.leads),
      posts: toNonNegativeNumber(entry.posts),
    };

    const hasAnyValue = METRIC_KEYS.some((key) => row[key] > 0);

    if (hasAnyValue) {
      rows.push(row);
    }
  }

  return rows;
}

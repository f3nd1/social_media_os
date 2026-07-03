import { platforms, type Platform } from "@/lib/social-calendar-data";

type MetricKey = Exclude<keyof PlatformDataMetrics, "platform">;

export type PlatformDataMetrics = {
  platform: Platform;
  followers: number;
  impressions: number;
  reach: number;
  engagement: number;
  comments: number;
  shares: number;
  saves: number;
  watchTime: number;
  clicks: number;
  followsGained: number;
  leads: number;
  posts: number;
};

const metricKeys: MetricKey[] = [
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
];

const platformAliases: Record<Platform, string[]> = {
  TikTok: ["tiktok", "tik tok"],
  Instagram: ["instagram", "ig"],
  "YouTube Shorts": ["youtube shorts", "youtube", "yt shorts", "yt"],
  LinkedIn: ["linkedin", "linked in"],
  Facebook: ["facebook", "fb"],
  "X/Twitter": ["x/twitter", "twitter", "x"],
  Threads: ["threads"],
};

const metricAliases: Record<MetricKey, string[]> = {
  followers: ["followers", "follower count", "fans", "subscribers"],
  impressions: ["impressions", "views", "visualizations"],
  reach: ["reach", "unique reach", "accounts reached"],
  engagement: ["engagement", "engagements", "interactions", "likes", "reactions"],
  comments: ["comments", "comment count", "replies"],
  shares: ["shares", "share count", "retweets", "reposts"],
  saves: ["saves", "saved", "bookmarks"],
  watchTime: ["watch time", "watchtime", "total watch time"],
  clicks: ["clicks", "link clicks", "url clicks", "website clicks"],
  followsGained: ["follows gained", "new followers", "followers gained"],
  leads: ["leads", "lead count", "enquiries", "inquiries", "conversions"],
  posts: ["posts", "post count", "publications", "published posts"],
};

export function parsePdfReportMetrics(reportText: string) {
  const normalizedText = reportText.replace(/\r/g, "\n");
  const tableMetrics = parseDelimitedMetricRows(normalizedText);

  return platforms
    .map((platform) =>
      mergeMetrics(
        parsePlatformSection(platform, normalizedText),
        tableMetrics.get(platform),
      ),
    )
    .filter((metrics) =>
      Object.entries(metrics).some(
        ([key, value]) => key !== "platform" && typeof value === "number" && value > 0,
      ),
    );
}

function parsePlatformSection(platform: Platform, reportText: string) {
  const starts = findPlatformAliasStarts(platform, reportText);
  const start = starts[0];
  const section =
    start >= 0 ? reportText.slice(start, findNextPlatformStart(reportText, start)) : "";

  return {
    platform,
    followers: readMetric(section, metricAliases.followers),
    impressions: readMetric(section, metricAliases.impressions),
    reach: readMetric(section, metricAliases.reach),
    engagement: readMetric(section, metricAliases.engagement),
    comments: readMetric(section, metricAliases.comments),
    shares: readMetric(section, metricAliases.shares),
    saves: readMetric(section, metricAliases.saves),
    watchTime: readMetric(section, metricAliases.watchTime),
    clicks: readMetric(section, metricAliases.clicks),
    followsGained: readMetric(section, metricAliases.followsGained),
    leads: readMetric(section, metricAliases.leads),
    posts: readMetric(section, metricAliases.posts),
  };
}

function parseDelimitedMetricRows(reportText: string) {
  const parsedRows = new Map<Platform, PlatformDataMetrics>();
  let activeHeader: Array<MetricKey | null> = [];

  const lines = reportText
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  for (const line of lines) {
    const cells = splitReportRow(line);

    if (cells.length < 3) {
      continue;
    }

    const metricHeader = cells.map((cell) => normalizeMetricHeader(cell));
    const headerMetricCount = metricHeader.filter(Boolean).length;

    if (headerMetricCount >= 2) {
      activeHeader = metricHeader;
      continue;
    }

    if (activeHeader.length === 0) {
      continue;
    }

    const platform = findPlatformInCells(cells);

    if (!platform) {
      continue;
    }

    const rowMetrics = emptyMetrics(platform);

    activeHeader.forEach((metricKey, index) => {
      if (!metricKey) {
        return;
      }

      const value = parseMetricValue(cells[index]);

      if (value > 0) {
        rowMetrics[metricKey] = value;
      }
    });

    mergeMetricMapEntry(parsedRows, rowMetrics);
  }

  return parsedRows;
}

function splitReportRow(line: string) {
  if (line.includes("|")) {
    return line.split("|").map(cleanCell);
  }

  if (line.includes("\t")) {
    return line.split("\t").map(cleanCell);
  }

  if (/\s{2,}/.test(line)) {
    return line.split(/\s{2,}/).map(cleanCell);
  }

  return [];
}

function cleanCell(cell: string) {
  return cell.replace(/\s+/g, " ").trim();
}

function normalizeMetricHeader(cell: string): MetricKey | null {
  const normalizedCell = cell.toLowerCase().replace(/[_-]/g, " ");

  for (const key of metricKeys) {
    if (metricAliases[key].some((alias) => normalizedCell.includes(alias))) {
      return key;
    }
  }

  return null;
}

function findPlatformInCells(cells: string[]) {
  const joinedCells = cells.join(" ").toLowerCase();

  return platforms.find((platform) =>
    platformAliases[platform].some((alias) =>
      new RegExp(`(^|\\b)${escapeRegExp(alias)}(\\b|$)`, "i").test(joinedCells),
    ),
  );
}

function emptyMetrics(platform: Platform): PlatformDataMetrics {
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

function mergeMetricMapEntry(
  metricMap: Map<Platform, PlatformDataMetrics>,
  metrics: PlatformDataMetrics,
) {
  const existing = metricMap.get(metrics.platform);

  metricMap.set(
    metrics.platform,
    existing ? mergeMetrics(existing, metrics) : metrics,
  );
}

function mergeMetrics(
  primary: PlatformDataMetrics,
  secondary?: PlatformDataMetrics,
) {
  if (!secondary) {
    return primary;
  }

  const merged = { ...primary };

  metricKeys.forEach((key) => {
    if (secondary[key] > 0) {
      merged[key] = secondary[key];
    }
  });

  return merged;
}

function findNextPlatformStart(reportText: string, currentStart: number) {
  const nextStarts = platforms
    .flatMap((platform) =>
      findPlatformAliasStarts(platform, reportText, currentStart + 1),
    )
    .sort((a, b) => a - b);

  return nextStarts[0] ?? reportText.length;
}

function findPlatformAliasStarts(platform: Platform, reportText: string, offset = 0) {
  const text = reportText.slice(offset);
  const starts: number[] = [];

  for (const alias of platformAliases[platform]) {
    const pattern = new RegExp(
      `(^|[^a-z0-9])${escapeRegExp(alias)}([^a-z0-9]|$)`,
      "gi",
    );

    for (const match of text.matchAll(pattern)) {
      starts.push(offset + (match.index ?? 0) + (match[1]?.length ?? 0));
    }
  }

  return starts.sort((a, b) => a - b);
}

function readMetric(section: string, aliases: string[]) {
  if (!section) {
    return 0;
  }

  for (const alias of aliases) {
    const escapedAlias = escapeRegExp(alias);
    const patterns = [
      new RegExp(
        `${escapedAlias}\\s*[:=\\-]?\\s*([0-9][0-9,]*(?:\\.\\d+)?\\s*[kmb]?)`,
        "i",
      ),
      new RegExp(
        `([0-9][0-9,]*(?:\\.\\d+)?\\s*[kmb]?)\\s+${escapedAlias}`,
        "i",
      ),
    ];

    for (const pattern of patterns) {
      const match = section.match(pattern);

      if (match?.[1]) {
        return parseMetricValue(match[1]);
      }
    }
  }

  return 0;
}

function parseMetricValue(value: string | undefined) {
  if (!value) {
    return 0;
  }

  const cleanedValue = value
    .replace(/,/g, "")
    .replace(/[^\d.kmb:]/gi, "")
    .trim()
    .toLowerCase();

  if (!cleanedValue) {
    return 0;
  }

  if (cleanedValue.includes(":")) {
    return parseDurationToSeconds(cleanedValue);
  }

  const match = cleanedValue.match(/^(\d+(?:\.\d+)?)([kmb])?$/);

  if (!match) {
    return 0;
  }

  const number = Number(match[1]);
  const multiplier =
    match[2] === "k" ? 1_000 : match[2] === "m" ? 1_000_000 : match[2] === "b" ? 1_000_000_000 : 1;

  return Math.round(number * multiplier);
}

function parseDurationToSeconds(duration: string) {
  const parts = duration.split(":").map((part) => Number(part));

  if (parts.some((part) => Number.isNaN(part))) {
    return 0;
  }

  return parts.reduce((total, part) => total * 60 + part, 0);
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

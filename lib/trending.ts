// Trending now: query-less discovery. Pure helpers, no network.
//
// This is not Discover. Discover reads search terms out of the workspace, so
// it can only ever find more about what the college already knows. This asks
// the platforms what is popular right now with no keyword at all.
//
// History worth knowing before touching this file:
//
// TikTok's hashtag ranking (ScrapeCreators' /v1/tiktok/hashtags/popular) used
// to be the other leg here. It scraped TikTok's advertiser-facing Creative
// Center page rather than an API TikTok actually supports, and TikTok took
// that page down. Three separate live checks all got the identical error, so
// it is removed outright rather than kept as a permanently-failing leg that
// spends a request every run for nothing.
//
// The official YouTube Data API's mostPopular chart used to be the other
// half of this file. It genuinely does take a country and a category, but it
// needed a Google-issued key that was never going to be added, so the chip
// sat permanently disabled. Replaced with ScrapeCreators' Trending Shorts
// endpoint, confirmed working in the live endpoint audit with no separate
// key. The trade: that endpoint takes no parameters at all, so what it
// returns is a single global chart, not a Singapore or education-specific
// one. Offering a country or category control over it would be showing a
// filter that does nothing, so there is not one. This is why the panel has
// no configuration at all: there is genuinely nothing left to configure.
export const SCRAPECREATORS_BASE = "https://api.scrapecreators.com";

export type TrendingVideo = {
  title: string;
  channel: string;
  views: number | null;
  publishedAt: string;
  url: string;
};

export function buildYouTubeShortsTrendingUrl(): string {
  return new URL("/v1/youtube/shorts/trending", SCRAPECREATORS_BASE).toString();
}

function toNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value !== "string" || !value.trim()) {
    return null;
  }

  const cleaned = value.trim();

  // Plain numeric strings, sometimes with thousands separators.
  const plain = Number(cleaned.replace(/,/g, ""));
  if (Number.isFinite(plain) && /^[\d,]+$/.test(cleaned)) {
    return plain;
  }

  // Abbreviated view counts as shown on the page, e.g. "1.2M views", "834K".
  const abbreviated = /^([\d.]+)\s*([KkMmBb])/.exec(cleaned);
  if (abbreviated) {
    const base = Number(abbreviated[1]);
    if (Number.isFinite(base)) {
      const scale = { k: 1_000, m: 1_000_000, b: 1_000_000_000 }[
        abbreviated[2].toLowerCase() as "k" | "m" | "b"
      ];
      return Math.round(base * scale);
    }
  }

  return null;
}

function firstString(...values: unknown[]): string {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }

  return "";
}

// The endpoint's exact response shape was not directly observable from this
// environment (no live ScrapeCreators call could be made while building
// this), so field access is deliberately defensive: several plausible key
// names are tried per field, the same pattern lib/scrapecreators.ts already
// uses for platforms whose field names are not fully documented. If the real
// reply uses none of these names, this returns an empty list rather than
// guessing, and the route above treats a parse failure as a real failure to
// report rather than silently showing "nothing trending".
export function normaliseTrendingVideos(raw: unknown): TrendingVideo[] {
  const body = (raw ?? {}) as Record<string, unknown>;
  const list = body.videos ?? body.shorts ?? body.items ?? body.data ?? body.results;

  if (!Array.isArray(list)) {
    return [];
  }

  return list
    .map((entry) => (entry ?? {}) as Record<string, unknown>)
    .map((entry) => {
      const channel = (entry.channel ?? {}) as Record<string, unknown>;
      const id = firstString(entry.id, entry.videoId, entry.video_id);
      const url = firstString(
        entry.url,
        entry.videoUrl,
        entry.link,
        id && `https://www.youtube.com/shorts/${id}`,
      );

      return {
        title: firstString(entry.title, entry.videoTitle, entry.name),
        channel: firstString(
          channel.title,
          channel.name,
          entry.channelTitle,
          entry.channelName,
        ),
        views: toNumber(entry.viewCount ?? entry.views ?? entry.viewCountText ?? entry.view_count),
        publishedAt: firstString(
          entry.publishedAt,
          entry.publishedTimeText,
          entry.published_time,
          entry.uploadedAt,
        ).slice(0, 10),
        url,
      };
    })
    .filter((video) => video.title && video.url);
}

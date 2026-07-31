// Trending now: query-less discovery. Pure helpers, no network.
//
// This is not Discover. Discover reads search terms out of the workspace, so
// it can only ever find more about what the college already knows. This asks
// the platforms what is popular right now with no keyword at all.
//
// Only two sources are here, and the omissions are deliberate. A source earns
// a place only if it can be scoped to something a Singapore college could act
// on, at the source rather than by filtering afterwards:
//
//   TikTok popular hashtags  -> countryCode and industry are real parameters,
//                               so "education, Singapore, last 7 days" is the
//                               API's own filter, not ours.
//   YouTube mostPopular      -> regionCode is real geography.
//
// Left out on purpose, with reasons, so nobody wires them in later thinking
// they were forgotten:
//   /v1/instagram/reels/trending  no parameters at all, global consumer feed
//   /v1/youtube/shorts/trending   no parameters at all, global consumer feed
//   /v1/tiktok/get-trending-feed  its "region" is the proxy location, not the
//                                 content's geography, so calling it
//                                 "trending in Singapore" would be untrue
//   /v1/github/trending/*         developer tooling, no bearing on a college
//   /v1/tiktok/videos/popular     switched off by the vendor: "doesn't work
//   /v1/tiktok/songs/popular      right now, down even on TikTok's website"

export const SCRAPECREATORS_BASE = "https://api.scrapecreators.com";

// The one market this college recruits in. Not a dropdown: a wrong country
// here would silently return a trend list for somewhere else.
export const TRENDING_COUNTRY = "SG";
export const TRENDING_COUNTRY_LABEL = "Singapore";

// TikTok's own industry taxonomy, taken from the endpoint's published
// parameter list. Only the handful a college could plausibly act on are
// offered; the full list runs to eighteen and the rest are retail verticals.
export const TIKTOK_INDUSTRIES: Array<{ value: string; label: string }> = [
  { value: "education", label: "Education" },
  { value: "business-services", label: "Business services" },
  { value: "life-services", label: "Life services" },
  { value: "news-and-entertainment", label: "News and entertainment" },
  { value: "tech-and-electronics", label: "Tech and electronics" },
  { value: "", label: "Every industry" },
];

// The endpoint accepts 7, 30 or 120 only. Anything else is rejected.
export const TIKTOK_PERIODS = [7, 30, 120] as const;
export type TikTokPeriod = (typeof TIKTOK_PERIODS)[number];

// YouTube's own category ids. mostPopular accepts a videoCategoryId, but which
// categories have a chart in a given region is Google's business and not
// documented per region, so an empty result is a real answer here and the UI
// has to say "nothing charted" rather than "no trends".
export const YOUTUBE_CATEGORIES: Array<{ value: string; label: string }> = [
  { value: "", label: "All categories" },
  { value: "27", label: "Education" },
  { value: "26", label: "Howto and style" },
  { value: "25", label: "News and politics" },
  { value: "28", label: "Science and technology" },
  { value: "22", label: "People and blogs" },
];

export type TrendingTag = {
  tag: string;
  rank: number | null;
  // Movement in the rank table since the previous period. Positive is
  // climbing. Null when TikTok did not report it, never 0 as a stand-in.
  rankChange: number | null;
  posts: number | null;
  views: number | null;
  // TikTok's own discover page for the tag, so a claim can be checked.
  url: string;
};

export type TrendingVideo = {
  title: string;
  channel: string;
  views: number | null;
  publishedAt: string;
  url: string;
};

export function buildTikTokHashtagsUrl({
  period,
  industry,
  page = 1,
  newOnBoard = false,
}: {
  period: TikTokPeriod;
  industry: string;
  page?: number;
  newOnBoard?: boolean;
}): string {
  const url = new URL("/v1/tiktok/hashtags/popular", SCRAPECREATORS_BASE);

  url.searchParams.set("countryCode", TRENDING_COUNTRY);
  url.searchParams.set("period", String(period));

  if (page > 1) {
    url.searchParams.set("page", String(page));
  }

  // Sent only when chosen. The parameter's own default is null, so an empty
  // string would be a filter on an industry named "", not "every industry".
  if (industry) {
    url.searchParams.set("industry", industry);
  }

  if (newOnBoard) {
    url.searchParams.set("newOnBoard", "true");
  }

  return url.toString();
}

export function buildYouTubeTrendingUrl({
  apiKey,
  categoryId,
  maxResults = 15,
}: {
  apiKey: string;
  categoryId: string;
  maxResults?: number;
}): string {
  const url = new URL("https://www.googleapis.com/youtube/v3/videos");

  url.searchParams.set("part", "snippet,statistics");
  url.searchParams.set("chart", "mostPopular");
  url.searchParams.set("regionCode", TRENDING_COUNTRY);
  url.searchParams.set("maxResults", String(maxResults));

  if (categoryId) {
    url.searchParams.set("videoCategoryId", categoryId);
  }

  url.searchParams.set("key", apiKey);

  return url.toString();
}

function toNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  // YouTube returns its counts as strings.
  if (typeof value === "string" && value.trim() && Number.isFinite(Number(value))) {
    return Number(value);
  }

  return null;
}

export function normaliseTrendingTags(raw: unknown): TrendingTag[] {
  const list = (raw as { list?: unknown })?.list;

  if (!Array.isArray(list)) {
    return [];
  }

  return list
    .map((entry) => entry as Record<string, unknown>)
    .filter((entry) => typeof entry?.hashtag_name === "string" && entry.hashtag_name.trim())
    .map((entry) => {
      const tag = String(entry.hashtag_name).trim();

      return {
        tag,
        rank: toNumber(entry.rank),
        // rank_diff is unsigned and rank_diff_type says which way it moved:
        // reading rank_diff alone would show a tag falling twenty places as if
        // it were climbing twenty. Type 1 is up, 2 is down in TikTok's data;
        // anything else is left null rather than guessed at.
        rankChange:
          toNumber(entry.rank_diff) === null
            ? null
            : entry.rank_diff_type === 1
              ? toNumber(entry.rank_diff)
              : entry.rank_diff_type === 2
                ? -(toNumber(entry.rank_diff) as number)
                : null,
        posts: toNumber(entry.publish_cnt),
        views: toNumber(entry.video_views),
        url: `https://www.tiktok.com/tag/${encodeURIComponent(tag)}`,
      };
    });
}

export function normaliseTrendingVideos(raw: unknown): TrendingVideo[] {
  const items = (raw as { items?: unknown })?.items;

  if (!Array.isArray(items)) {
    return [];
  }

  return items
    .map((entry) => entry as Record<string, unknown>)
    .filter((entry) => typeof entry?.id === "string")
    .map((entry) => {
      const snippet = (entry.snippet ?? {}) as Record<string, unknown>;
      const statistics = (entry.statistics ?? {}) as Record<string, unknown>;

      return {
        title: typeof snippet.title === "string" ? snippet.title : "",
        channel: typeof snippet.channelTitle === "string" ? snippet.channelTitle : "",
        // Absent when the uploader hides the count. Null, not zero: a hidden
        // count is not the same as a video nobody watched.
        views: toNumber(statistics.viewCount),
        publishedAt:
          typeof snippet.publishedAt === "string" ? snippet.publishedAt.slice(0, 10) : "",
        url: `https://www.youtube.com/watch?v=${String(entry.id)}`,
      };
    })
    .filter((video) => video.title);
}

// The search term a "Research this" click hands to Social Listening. A raw
// hashtag searches badly on Reddit and the web, so the hash is dropped and the
// market added, which is the same shape the manual search box expects.
export function tagToSearchTopic(tag: string): string {
  const bare = tag.replace(/^#+/, "").trim();

  return bare ? `${bare} ${TRENDING_COUNTRY_LABEL}` : "";
}

// ScrapeCreators account research (Module D3 extension). Pure helpers, no
// network: the server route builds a request from these and normalises the
// reply through them, so the per-platform field mapping is testable.
//
// Endpoint paths, parameter names and response fields below were read from
// ScrapeCreators' own published CLI registry
// (github.com/ScrapeCreators/scrapecreators-cli, api-config/), not from
// guesswork. Where a platform is absent from a capability, it is absent here
// too rather than being faked.
//
// Cost model: 1 credit per call, charged per call and not per result. A cache
// hit costs 0 and returns cached: true. Every response carries credits_charged
// and credits_remaining, which the route passes back so spend stays visible.

export const SCRAPECREATORS_BASE = "https://api.scrapecreators.com";

// Platforms with a real account-lookup endpoint. Pinterest is deliberately
// absent: it has no profile endpoint at all, despite one appearing in the
// vendor's own example docs.
export type AccountPlatform =
  | "tiktok"
  | "instagram"
  | "threads"
  | "youtube"
  | "facebook"
  | "x"
  | "linkedin";

type AccountEndpoint = {
  path: string;
  // The query parameter the handle or url goes into.
  param: "handle" | "url";
  // Whether a repeat lookup can be served from cache for 0 credits. LinkedIn
  // supports this on none of its endpoints, so a LinkedIn refresh always costs.
  cacheable: boolean;
  label: string;
  // What the input should look like, shown in the UI so nobody pastes a handle
  // where a full url is required.
  inputHint: string;
};

export const ACCOUNT_ENDPOINTS: Record<AccountPlatform, AccountEndpoint> = {
  tiktok: {
    path: "/v1/tiktok/profile",
    param: "handle",
    cacheable: true,
    label: "TikTok",
    inputHint: "@handle",
  },
  instagram: {
    path: "/v1/instagram/profile",
    param: "handle",
    cacheable: true,
    label: "Instagram",
    inputHint: "@handle",
  },
  threads: {
    path: "/v1/threads/profile",
    param: "handle",
    cacheable: true,
    label: "Threads",
    inputHint: "@handle",
  },
  youtube: {
    path: "/v1/youtube/channel",
    param: "handle",
    cacheable: true,
    label: "YouTube",
    inputHint: "@handle",
  },
  facebook: {
    path: "/v1/facebook/profile",
    param: "url",
    cacheable: true,
    label: "Facebook",
    inputHint: "full page url",
  },
  x: {
    path: "/v1/twitter/profile",
    param: "handle",
    cacheable: true,
    label: "X",
    inputHint: "@handle",
  },
  linkedin: {
    path: "/v1/linkedin/profile",
    param: "url",
    cacheable: false,
    label: "LinkedIn",
    inputHint: "full profile url",
  },
};

export type CacheMaxAge = "1d" | "3d" | "7d" | "14d" | "30d";

// One account, flattened. Every platform names its follower field differently,
// so the mapping lives in one place rather than being re-derived per caller.
export type AccountSnapshot = {
  platform: AccountPlatform;
  handle: string;
  name: string;
  bio: string;
  followers: number | null;
  posts: number | null;
  verified: boolean;
  url: string;
  // True when ScrapeCreators served this from its cache, which costs nothing.
  cached: boolean;
  capturedAt: string;
};

function firstNumber(...values: unknown[]): number | null {
  for (const value of values) {
    if (typeof value === "number" && Number.isFinite(value)) {
      return value;
    }

    // Several endpoints return counts as strings, sometimes with separators.
    if (typeof value === "string") {
      const parsed = Number(value.replace(/[,\s]/g, ""));
      if (Number.isFinite(parsed) && value.trim() !== "") {
        return parsed;
      }
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

type Json = Record<string, unknown>;

const asJson = (value: unknown): Json =>
  value && typeof value === "object" ? (value as Json) : {};

// Maps a raw reply onto AccountSnapshot. Each platform gets its own field
// names because they genuinely differ: TikTok nests counts under stats,
// Instagram uses edge_followed_by.count, YouTube uses subscriberCount, X uses
// followers_count. Reading the wrong one yields a silent null, not an error,
// which is exactly why this is covered by the self-check.
export function normaliseAccountSnapshot(
  platform: AccountPlatform,
  raw: unknown,
  capturedAt: string,
): AccountSnapshot {
  const body = asJson(raw);
  const cached = body.cached === true;

  const base = {
    platform,
    cached,
    capturedAt,
  };

  if (platform === "tiktok") {
    const user = asJson(body.user);
    const stats = asJson(body.stats);
    return {
      ...base,
      handle: firstString(user.uniqueId, user.unique_id),
      name: firstString(user.nickname),
      bio: firstString(user.signature),
      followers: firstNumber(stats.followerCount),
      posts: firstNumber(stats.videoCount),
      verified: user.verified === true,
      url: firstString(user.uniqueId && `https://www.tiktok.com/@${user.uniqueId}`),
    };
  }

  if (platform === "instagram") {
    const user = asJson(asJson(body.data).user) ;
    const source = Object.keys(user).length > 0 ? user : body;
    return {
      ...base,
      handle: firstString(source.username),
      name: firstString(source.full_name),
      bio: firstString(source.biography),
      followers: firstNumber(
        asJson(source.edge_followed_by).count,
        source.follower_count,
      ),
      posts: firstNumber(asJson(source.edge_owner_to_timeline_media).count, source.media_count),
      verified: source.is_verified === true,
      url: firstString(source.username && `https://www.instagram.com/${source.username}/`),
    };
  }

  if (platform === "threads") {
    return {
      ...base,
      handle: firstString(body.username),
      name: firstString(body.full_name),
      bio: firstString(body.biography),
      followers: firstNumber(body.follower_count),
      posts: null,
      verified: body.is_verified === true,
      url: firstString(body.username && `https://www.threads.net/@${body.username}`),
    };
  }

  if (platform === "youtube") {
    return {
      ...base,
      handle: firstString(body.handle, body.channelId),
      name: firstString(body.name, body.title),
      bio: firstString(body.description),
      // subscriberCount is the integer; subscriberCountText is "1.2K".
      followers: firstNumber(body.subscriberCount, body.subscriberCountText),
      posts: firstNumber(body.videoCount, body.videoCountText),
      verified: body.isVerified === true,
      url: firstString(body.url, body.channelUrl),
    };
  }

  if (platform === "facebook") {
    return {
      ...base,
      handle: firstString(body.name),
      name: firstString(body.name),
      bio: firstString(body.pageIntro, body.about),
      followers: firstNumber(body.followerCount, body.likeCount),
      posts: null,
      verified: body.is_verified === true,
      url: firstString(body.url, body.pageUrl),
    };
  }

  if (platform === "x") {
    return {
      ...base,
      handle: firstString(body.screen_name),
      name: firstString(body.name),
      bio: firstString(body.description),
      followers: firstNumber(body.followers_count),
      posts: firstNumber(body.statuses_count),
      verified: body.is_blue_verified === true,
      url: firstString(body.screen_name && `https://x.com/${body.screen_name}`),
    };
  }

  // LinkedIn person profile.
  return {
    ...base,
    handle: firstString(body.publicIdentifier, body.name),
    name: firstString(body.name),
    bio: firstString(body.about, body.headline),
    followers: firstNumber(body.followers),
    posts: null,
    verified: false,
    url: firstString(body.url, body.profileUrl),
  };
}

// A LinkedIn organisation. Kept separate from AccountSnapshot because the
// useful fields genuinely differ: there is no follower count for a company,
// only employeeCount, and similarPages is a competitor-discovery list with no
// equivalent anywhere else in the API.
export type CompanySnapshot = {
  name: string;
  description: string;
  industry: string;
  employeeCount: number | null;
  headquarters: string;
  founded: string;
  website: string;
  specialities: string[];
  similarPages: Array<{ name: string; url: string }>;
  capturedAt: string;
};

export function normaliseCompanySnapshot(raw: unknown, capturedAt: string): CompanySnapshot {
  const body = asJson(raw);
  const similar = Array.isArray(body.similarPages) ? body.similarPages : [];

  return {
    name: firstString(body.name),
    description: firstString(body.description, body.slogan),
    industry: firstString(body.industry),
    employeeCount: firstNumber(body.employeeCount),
    headquarters: firstString(body.headquarters, body.location),
    founded: firstString(body.founded),
    website: firstString(body.website),
    specialities: Array.isArray(body.specialties)
      ? body.specialties.filter((item): item is string => typeof item === "string")
      : [],
    similarPages: similar
      .map((entry) => {
        const item = asJson(entry);
        return { name: firstString(item.name), url: firstString(item.url) };
      })
      .filter((entry) => entry.name),
    capturedAt,
  };
}

// TikTok creator discovery. The only endpoint in the API that finds accounts
// without being told which ones to look at, and it filters to Singapore
// natively, which is why it earns its place over the generic trending feeds.
export type CreatorResult = {
  handle: string;
  name: string;
  followers: number | null;
  engagementRate: number | null;
  averageViews: number | null;
  url: string;
};

// Registry enums. Sending anything outside these is a wasted credit.
export const CREATOR_SORT_OPTIONS = ["engagement", "follower", "avg_views"] as const;
export const CREATOR_FOLLOWER_BANDS = ["10K-100K", "100K-1M", "1M-10M", "10M+"] as const;

export function normaliseCreatorResults(raw: unknown): CreatorResult[] {
  const body = asJson(raw);
  const list = Array.isArray(body.creator_list)
    ? body.creator_list
    : Array.isArray(body.creators)
      ? body.creators
      : [];

  return list
    .map((entry) => {
      const item = asJson(entry);
      const handle = firstString(item.unique_id, item.uniqueId);

      return {
        handle,
        name: firstString(item.nickname),
        followers: firstNumber(item.follower_count, item.followerCount),
        engagementRate: firstNumber(item.engagement_rate, item.engagementRate),
        averageViews: firstNumber(item.avg_views, item.video_views, item.avgViews),
        url: handle ? `https://www.tiktok.com/@${handle}` : "",
      };
    })
    .filter((creator) => creator.handle);
}

// Comments, for audience-voice research. These are internal research evidence
// under the same rule as listening quotes: never marketing copy.
export type CommentResult = {
  text: string;
  author: string;
  likes: number | null;
  date: string;
};

export type CommentPlatform = "tiktok" | "instagram" | "youtube" | "facebook";

// LinkedIn and Threads are absent on purpose: neither has a comments endpoint,
// their comments arrive nested inside the post response instead, so pretending
// otherwise here would send a request that does not exist.
export const COMMENT_ENDPOINTS: Record<CommentPlatform, { path: string; label: string }> = {
  tiktok: { path: "/v1/tiktok/video/comments", label: "TikTok" },
  instagram: { path: "/v2/instagram/post/comments", label: "Instagram" },
  youtube: { path: "/v1/youtube/video/comments", label: "YouTube" },
  facebook: { path: "/v1/facebook/post/comments", label: "Facebook" },
};

export function normaliseComments(raw: unknown): CommentResult[] {
  const body = asJson(raw);
  const list = Array.isArray(body.comments) ? body.comments : [];

  return list
    .map((entry) => {
      const item = asJson(entry);
      const user = asJson(item.user);
      const author = asJson(item.author);

      return {
        text: firstString(item.text, item.comment, item.content).slice(0, 600),
        author: firstString(
          user.nickname,
          user.unique_id,
          user.username,
          author.name,
          item.username,
          item.authorName,
        ),
        likes: firstNumber(item.digg_count, item.like_count, item.likeCount, item.reaction_count),
        date: firstString(item.create_time, item.created_at, item.timestamp, item.publishDate),
      };
    })
    .filter((comment) => comment.text);
}

// Builds the request url. Kept pure so the self-check can assert the exact
// query string, including that LinkedIn never gets a cache parameter it does
// not support.
export function buildAccountRequestUrl(
  platform: AccountPlatform,
  identifier: string,
  cacheMaxAge: CacheMaxAge = "7d",
): string {
  const endpoint = ACCOUNT_ENDPOINTS[platform];
  const url = new URL(endpoint.path, SCRAPECREATORS_BASE);
  const value =
    endpoint.param === "handle" ? identifier.trim().replace(/^@/, "") : identifier.trim();

  url.searchParams.set(endpoint.param, value);

  if (endpoint.cacheable) {
    url.searchParams.set("cache_max_age", cacheMaxAge);
  }

  return url.toString();
}

export function buildCreatorRequestUrl({
  country = "SG",
  followerBand = "",
  page = 1,
  sortBy = "engagement",
}: {
  country?: string;
  followerBand?: string;
  page?: number;
  sortBy?: string;
}): string {
  const url = new URL("/v1/tiktok/creators/popular", SCRAPECREATORS_BASE);

  url.searchParams.set("creatorCountry", country);
  url.searchParams.set("audienceCountry", country);
  url.searchParams.set("sortBy", sortBy);

  if (followerBand) {
    url.searchParams.set("followerCount", followerBand);
  }

  if (page > 1) {
    url.searchParams.set("page", String(page));
  }

  return url.toString();
}

// Saving a lookup to the Signal Board. The saved summary is assembled from
// fields the API actually returned, using the same "not reported" wording the
// panel shows, so a number that was never returned can never turn into a zero
// in the Strategy Brief later.
function saveableCount(value: number | null): string {
  return typeof value === "number" ? value.toLocaleString("en-GB") : "not reported";
}

export function accountFindingSummary(snapshot: AccountSnapshot): string {
  return [
    `Followers ${saveableCount(snapshot.followers)}`,
    `posts ${saveableCount(snapshot.posts)}`,
    snapshot.verified ? "verified account" : "",
    snapshot.bio ? `bio: ${snapshot.bio.slice(0, 200)}` : "",
    // A follower count is one point in time, so the saved line has to say when.
    // Without it a six-month-old number reads as current in the brief.
    `captured ${snapshot.capturedAt.slice(0, 10)}`,
  ]
    .filter(Boolean)
    .join(", ");
}

export function companyFindingSummary(company: CompanySnapshot): string {
  return [
    `Employees ${saveableCount(company.employeeCount)}`,
    company.industry,
    company.headquarters,
    company.specialities.length > 0
      ? `specialities: ${company.specialities.slice(0, 8).join(", ")}`
      : "",
    company.similarPages.length > 0
      ? `similar pages: ${company.similarPages.slice(0, 6).map((page) => page.name).join(", ")}`
      : "",
    `captured ${company.capturedAt.slice(0, 10)}`,
  ]
    .filter(Boolean)
    .join(", ");
}

export function creatorsFindingSummary(creators: CreatorResult[]): string {
  const top = creators
    .slice(0, 10)
    .map((creator) => `@${creator.handle} (${saveableCount(creator.followers)} followers)`);

  return `${creators.length} Singapore creators found. Top: ${top.join(", ")}`;
}

// Comments are internal research evidence under the same rule as listening
// quotes, so the saved summary says so in the text itself. Whatever reads this
// downstream sees the restriction attached to the words, not only in a UI
// caption it never sees.
export function commentsFindingSummary(comments: CommentResult[]): string {
  const sample = comments.slice(0, 8).map((comment) => `"${comment.text.slice(0, 160)}"`);

  return [
    `${comments.length} public comments, internal research evidence only, never marketing copy.`,
    ...sample,
  ].join(" ");
}

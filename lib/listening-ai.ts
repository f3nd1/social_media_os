// Social listening helpers (Module D3), built around the open-source
// sc-research package (https://github.com/skainguyen1412/social-media-research-skill,
// MIT licence). Pure helpers, no network: the server route fetches real
// posts with sc-research, and these helpers turn them into prompts and map
// the analysis back onto the genuine quotes. No insight without evidence.

export type ListeningAnalysisType =
  | "quick"
  | "ranking"
  | "sentiment"
  | "timeline"
  | "controversy";

export const LISTENING_ANALYSIS_OPTIONS: Array<{
  value: ListeningAnalysisType;
  label: string;
  instruction: string;
}> = [
  {
    value: "quick",
    label: "Quick answer",
    instruction:
      "Give a short, direct answer to the topic question based only on the posts provided.",
  },
  {
    value: "ranking",
    label: "Ranking",
    instruction:
      "Rank the options, choices, or themes people actually recommend or mention most in the posts, with a short reason each.",
  },
  {
    value: "sentiment",
    label: "Sentiment",
    instruction:
      "Describe the balance of positive, negative, and mixed feeling in the posts, with the main reasons on each side.",
  },
  {
    value: "timeline",
    label: "Trend timeline",
    instruction:
      "Describe how the discussion has developed over the covered period: what came up early, what is recent, what is growing or fading.",
  },
  {
    value: "controversy",
    label: "Controversy",
    instruction:
      "Lay out the main disagreement: the strongest arguments on each side as real people put them, without picking a winner.",
  },
];

export const SUGGESTED_LISTENING_TOPICS = [
  "studying in Singapore private college",
  "IELTS preparation",
  "PRC parents Singapore education",
  "adult learner short courses Singapore",
];

// One post as fetched by sc-research, reduced to what the analysis needs.
export type ListeningPost = {
  text: string;
  source: string;
  url: string;
  date: string;
};

type RawResearchItem = {
  author?: string;
  author_handle?: string;
  date?: string | null;
  url?: string;
  title?: string;
  text?: string;
};

type RawResearchFile = {
  query?: string;
  dateRange?: { from?: string; to?: string };
  items?: RawResearchItem[];
};

// Exported so the last30days normaliser labels a Reddit post with the same
// "r/subreddit" form this module already uses, rather than deriving it twice.
export function sourceFromUrl(url: string): string {
  // Match on the parsed hostname rather than a pattern over the whole url.
  // The previous regex was (^|\.)x\.com OR twitter\.com, which required x.com
  // to sit at the start of the string or right after a dot. X now serves bare
  // https://x.com/... where the preceding character is a slash, so every real X
  // post fell through to "web": mislabelled in the evidence list, and counted
  // as "X returned nothing this run" because the coverage line looks for the
  // label "X". Hostname matching cannot fail that way, and it also stops a url
  // like evil.com/?r=reddit.com/r/foo passing itself off as Reddit.
  let host = "";
  let pathname = "";

  try {
    const parsed = new URL(url);
    host = parsed.hostname.toLowerCase().replace(/^www\./, "");
    pathname = parsed.pathname;
  } catch {
    // Not a parseable absolute url. Fall through to the default rather than
    // throwing: a malformed url is worth showing as evidence with a vague
    // label, not worth failing an entire search over.
    return "web";
  }

  if (host === "reddit.com" || host.endsWith(".reddit.com")) {
    const subreddit = /^\/(r\/[A-Za-z0-9_]+)/.exec(pathname);
    return subreddit ? subreddit[1] : "Reddit";
  }

  if (
    host === "x.com" ||
    host === "twitter.com" ||
    host.endsWith(".x.com") ||
    host.endsWith(".twitter.com")
  ) {
    return "X";
  }

  return "web";
}

export function normalizeResearchFile(raw: RawResearchFile): {
  posts: ListeningPost[];
  from: string;
  to: string;
} {
  const posts = (Array.isArray(raw.items) ? raw.items : [])
    .filter((item) => item.text?.trim() && item.url)
    .map((item) => ({
      text: item.text!.trim().slice(0, 600),
      source: sourceFromUrl(item.url!),
      url: item.url!,
      date: (item.date ?? "").slice(0, 10),
    }));

  return {
    posts,
    from: raw.dateRange?.from ?? "",
    to: raw.dateRange?.to ?? "",
  };
}

// sc-research and last30days both search Reddit and X, so the same post can
// genuinely arrive from two sources. Left in, the synthesis step would read one
// person's opinion as two independent voices and overstate how common it is.
// First occurrence wins, so the earlier (richer) source keeps its version. A
// post with no url is never treated as a duplicate of another, since an empty
// key says nothing about whether two posts are the same.
export function dedupeByUrl(posts: ListeningPost[]): ListeningPost[] {
  const seen = new Set<string>();

  return posts.filter((post) => {
    const key = post.url.trim().toLowerCase().replace(/\/+$/, "");

    if (!key) {
      return true;
    }

    if (seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
}

// Words that mark a stderr line as worth showing a manager. Deliberately wider
// than it looks like it needs to be: the previous version was
// /error|failed|key|timed out|rate limit/ and it silently dropped
// "HTTP 402: Payment Required", which was the real reason ScrapeCreators
// returned nothing. An allowlist will always miss something, which is why the
// function below falls back to the last line rather than to silence.
const ERROR_HINT =
  /error|fail|denied|unauthor|forbidden|payment|quota|credit|billing|rate.?limit|timed? ?out|invalid|expired|missing|not found|HTTP \d{3}|\b[45]\d{2}\b/i;

// Pulls the one line from a tool's stderr most likely to explain a failure.
// Returns "" only when stderr was genuinely empty: if there was any output at
// all, the manager gets something rather than "no posts found, try a broader
// topic" for what is actually an unpaid invoice.
export function meaningfulErrorLine(stderr: string): string {
  const lines = stderr
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length === 0) {
    return "";
  }

  const flagged = lines.filter((line) => ERROR_HINT.test(line));
  const chosen = flagged.length > 0 ? flagged[flagged.length - 1] : lines[lines.length - 1];

  return chosen.slice(0, 300);
}

export function buildListeningSystemPrompt(): string {
  return [
    "You analyse real social media posts and public web findings for the marketing team of a private college in Singapore.",
    "You are given numbered posts fetched live from Reddit, X, YouTube comments, and a public web search. Work ONLY from these posts; you have no other knowledge of the discussion.",
    "Never invent posts, quotes, statistics, or sentiment. If the posts are too few or off-topic to answer properly, say exactly that in the insight.",
    "Posts labelled \"Public web\" are the titles of real cited pages, not full quotes the way Reddit, X, or YouTube comments are. Prefer Reddit/X/YouTube posts for direct sentiment quotes when both are available, and use Public web posts mainly to support a claim about breadth or prevalence, not as a stand-in for a real person's words.",
    "In quoteIndexes, list the numbers of the specific posts your insight rests on (3 to 8 where possible). These are shown to the manager as evidence.",
    "These posts are research evidence for internal planning only, never marketing copy.",
    "Use British spelling. Do not use em dashes. Refer to teaching staff as teachers, never instructors.",
    'Return only a JSON object of the shape { "insight": "string", "quoteIndexes": [numbers] }.',
  ].join(" ");
}

// Search 3 (Plan A): general public web/news/forum coverage of the topic, via
// OpenAI's own web_search tool (already used elsewhere in the app: Trend
// Radar, Competitor Observe). Broadens coverage beyond Reddit/X/YouTube with no
// new dependency or paid key, at the honest cost of shallower evidence: a
// citation's title, not a full comment the way Reddit/YouTube give real
// conversation text.
export function buildWebListeningSearchInput(topic: string): string {
  return [
    `Search the public web for real discussion, news coverage, and forum commentary about: "${topic}".`,
    "Focus on genuine public opinion and discussion: education forums, news articles, blog commentary, and any public social posts that are indexed and visible without logging in.",
    "Only report what real, citable pages actually show. Do not invent discussion, statistics, or sentiment that the sources do not support. If nothing relevant is found, say so plainly.",
  ].join(" ");
}

// Each citation becomes one evidence "post". The text is the page's own real
// title, not an invented quote: a web_search citation is a real, cited page,
// but not the same depth of evidence as a Reddit/YouTube comment, so it is
// labelled "Public web" to keep that distinction visible to the manager and
// the synthesis step.
export function webCitationsToListeningPosts(
  citations: Array<{ title: string; url: string }>,
): ListeningPost[] {
  return citations
    .filter((citation) => citation.url)
    .map((citation) => ({
      text: citation.title || citation.url,
      source: "Public web",
      url: citation.url,
      date: "",
    }));
}

export function buildListeningUserPrompt(
  topic: string,
  analysisType: ListeningAnalysisType,
  posts: ListeningPost[],
): string {
  const option = LISTENING_ANALYSIS_OPTIONS.find(
    (row) => row.value === analysisType,
  );

  return [
    `TOPIC: ${topic}`,
    `ANALYSIS TYPE: ${option?.label ?? analysisType}. ${option?.instruction ?? ""}`,
    "",
    "REAL POSTS (numbered):",
    ...posts.map(
      (post, index) =>
        `[${index}] (${post.source}${post.date ? `, ${post.date}` : ""}) ${post.text}`,
    ),
    "",
    'Return JSON: { "insight": "your analysis in plain English", "quoteIndexes": [the post numbers your analysis rests on] }',
  ].join("\n");
}

// Instagram hashtag search, a direct ScrapeCreators call rather than something
// last30days does for us: last30days' own Instagram leg searches reels by
// keyword, which is a real and different angle from a hashtag search over
// ordinary posts. Confirmed working in a live ScrapeCreators endpoint audit.
// Kept pure (url-building and response-parsing only) so it is testable without
// a network call, matching every other ScrapeCreators helper in this app.
export const INSTAGRAM_HASHTAG_SEARCH_BASE = "https://api.scrapecreators.com/v1/instagram/search/hashtag";

// The endpoint takes a single hashtag, not a free-text query. Most listening
// topics here are full phrases ("IELTS preparation in Singapore"), and
// concatenating every word into "ieltspreparationinsingapore" would almost
// never match a hashtag anyone actually uses, turning "no evidence" into
// "evidence from an unrelated tag that happens to share a word." Rather than
// guess, this only treats a topic as hashtag-shaped when it already is one:
// a single word, with no spaces. A manager researching "IELTS" alone gets a
// real hashtag search; one researching a full phrase does not get a fabricated
// guess standing in for it.
export function isHashtagShapedTopic(topic: string): boolean {
  return topic.trim().length > 0 && !/\s/.test(topic.trim());
}

export function topicToInstagramHashtag(topic: string): string {
  return topic.trim().toLowerCase().replace(/[^a-z0-9]/g, "");
}

export function buildInstagramHashtagSearchUrl(topic: string): string {
  const url = new URL(INSTAGRAM_HASHTAG_SEARCH_BASE);
  url.searchParams.set("hashtag", topicToInstagramHashtag(topic));
  return url.toString();
}

// One entry from the endpoint's real, published response shape: id, caption,
// url, taken_at among others. Only what is needed to make a ListeningPost is
// read, matching the narrow-read convention lib/last30days.ts already uses.
type InstagramHashtagPost = {
  caption?: string;
  url?: string;
  taken_at?: string;
};

export function normaliseInstagramHashtagPosts(raw: unknown): ListeningPost[] {
  const body = (raw ?? {}) as { posts?: unknown };
  const posts = Array.isArray(body.posts) ? (body.posts as InstagramHashtagPost[]) : [];

  return posts
    .filter((post) => post.caption?.trim() && post.url)
    .map((post) => ({
      text: post.caption!.trim().slice(0, 600),
      source: "Instagram",
      url: post.url!,
      date: (post.taken_at ?? "").slice(0, 10),
    }));
}

// YouTube search, a direct ScrapeCreators call. This is the no-key path for
// the YouTube listening chip: it used to require a separate Google-issued
// YouTube Data API key, which was never going to be added, so the chip sat
// permanently disabled. Confirmed working in the live ScrapeCreators endpoint
// audit, and billed through the ScrapeCreators key this app already has.
//
// This is a real trade, not a free upgrade: the Google API path returns real
// audience comments (see fetchYouTubeListeningPostsViaGoogle in the route),
// which is richer evidence than a video's own title and description. The
// route prefers the Google path when a YouTube Data API key is present, and
// only falls back to this one otherwise, so nothing is lost for a workspace
// that does have the key.
//
// A video's title and description are still genuine evidence, not invented
// text, the same way webCitationsToListeningPosts above treats a public web
// page's own title as evidence rather than fabricating a summary of it.
export const YOUTUBE_SEARCH_BASE = "https://api.scrapecreators.com/v1/youtube/search";

export function buildYouTubeSearchUrl(topic: string): string {
  const url = new URL(YOUTUBE_SEARCH_BASE);
  url.searchParams.set("query", topic);
  return url.toString();
}

function firstString(...values: unknown[]): string {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }

  return "";
}

// The endpoint's exact response shape could not be observed directly while
// this was built (no live call was possible from the build environment), so
// several plausible field names are tried per item rather than one, the same
// defensive approach lib/trending.ts's normaliseTrendingVideos uses for the
// same reason. An unreadable shape returns an empty list rather than a guess;
// the route treats that as a real parse failure to report, not silence.
export function normaliseYouTubeSearchPosts(raw: unknown): ListeningPost[] {
  const body = (raw ?? {}) as Record<string, unknown>;
  const list = body.videos ?? body.items ?? body.data ?? body.results;

  if (!Array.isArray(list)) {
    return [];
  }

  return list
    .map((entry) => (entry ?? {}) as Record<string, unknown>)
    .map((entry) => {
      const id = firstString(entry.id, entry.videoId, entry.video_id);
      const url = firstString(
        entry.url,
        entry.videoUrl,
        entry.link,
        id && `https://www.youtube.com/watch?v=${id}`,
      );
      const title = firstString(entry.title, entry.videoTitle, entry.name);
      const description = firstString(entry.description, entry.descriptionSnippet);

      return {
        text: [title, description].filter(Boolean).join(" - ").slice(0, 600),
        source: "YouTube",
        url,
        date: firstString(
          entry.publishedAt,
          entry.publishedTimeText,
          entry.published_time,
        ).slice(0, 10),
      };
    })
    .filter((post) => post.text && post.url);
}

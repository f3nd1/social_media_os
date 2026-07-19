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

function sourceFromUrl(url: string): string {
  const redditMatch = /reddit\.com\/(r\/[A-Za-z0-9_]+)/.exec(url);

  if (redditMatch) {
    return redditMatch[1];
  }

  if (/(^|\.)x\.com|twitter\.com/.test(url)) {
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

// Social listening (Module D3): runs the open-source sc-research package
// (https://github.com/skainguyen1412/social-media-research-skill, MIT
// licence) as a subprocess to fetch real posts from Reddit and optionally X,
// then asks the analysis model to interpret ONLY those posts. Quotes are
// attached by this route from the genuinely fetched posts, never by the
// model, so evidence cannot be invented.
//
// Deployment note: like the PDF extractor, the subprocess approach works in
// a Node server environment (dev machine or self-hosted). Serverless hosts
// without a writable filesystem or bundled node_modules need a hosted worker
// for this route.

import { spawn } from "node:child_process";
import { access, mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import { NextResponse } from "next/server";

import { extractJsonObject, normaliseLast30DaysExport } from "@/lib/last30days";
import {
  buildListeningSystemPrompt,
  buildListeningUserPrompt,
  buildWebListeningSearchInput,
  dedupeByUrl,
  normalizeResearchFile,
  webCitationsToListeningPosts,
  type ListeningAnalysisType,
  type ListeningPost,
} from "@/lib/listening-ai";
import { callOpenAiJson, callOpenAiWebSearch } from "@/lib/openai-shared";

export const runtime = "nodejs";
export const maxDuration = 300;

const ANALYSIS_TYPES: ListeningAnalysisType[] = [
  "quick",
  "ranking",
  "sentiment",
  "timeline",
  "controversy",
];

type ListeningRequestBody = {
  apiKey?: string;
  xaiApiKey?: string;
  youtubeApiKey?: string;
  scrapeCreatorsApiKey?: string;
  blueskyHandle?: string;
  blueskyAppPassword?: string;
  model?: string;
  searchModel?: string;
  topic?: string;
  analysisType?: ListeningAnalysisType;
};

type ListeningDraft = {
  insight: string;
  quoteIndexes: number[];
};

function runResearchCli({
  topic,
  source,
  cwd,
  apiKey,
  xaiApiKey,
}: {
  topic: string;
  source: "reddit" | "both";
  cwd: string;
  apiKey: string;
  xaiApiKey: string;
}): Promise<{ code: number; stderr: string }> {
  return new Promise((resolve) => {
    const cliPath = path.join(
      process.cwd(),
      "node_modules",
      "sc-research",
      "dist",
      "index.js",
    );
    const child = spawn(
      process.execPath,
      [cliPath, "research", topic, `--source=${source}`],
      {
        cwd,
        env: {
          ...process.env,
          OPENAI_API_KEY: apiKey,
          XAI_API_KEY: xaiApiKey,
        },
      },
    );

    let stderr = "";

    child.stderr.on("data", (chunk: Buffer) => {
      stderr += chunk.toString();
    });
    child.stdout.on("data", () => {
      // Progress noise; the results land in JSON files in cwd.
    });

    const timer = setTimeout(() => {
      child.kill("SIGKILL");
      resolve({ code: -1, stderr: `${stderr}\nTimed out after 180 seconds.` });
    }, 180_000);

    child.on("close", (code) => {
      clearTimeout(timer);
      resolve({ code: code ?? -1, stderr });
    });
    child.on("error", (error) => {
      clearTimeout(timer);
      resolve({ code: -1, stderr: `${stderr}\n${String(error)}` });
    });
  });
}

async function readResearchFile(dir: string, name: string) {
  try {
    const raw = await readFile(path.join(dir, name), "utf8");
    return normalizeResearchFile(JSON.parse(raw));
  } catch {
    return null;
  }
}

const LAST30DAYS_TIMEOUT_MS = 180_000;

// The tool is a Python project with its own release cadence, so it is installed
// beside the app rather than vendored into it, and its location comes from the
// environment. When it is not installed every last30days source is skipped and
// listening keeps working exactly as it did before. That matters because deploys
// are manual: there is a real window where this code is live but the droplet has
// not been provisioned yet, and that window must not break the feature.
async function resolveLast30DaysScript(): Promise<string> {
  const candidates = [
    process.env.LAST30DAYS_SCRIPT,
    path.join(
      process.cwd(),
      "..",
      "last30days-skill",
      "skills",
      "last30days",
      "scripts",
      "last30days.py",
    ),
  ].filter(Boolean) as string[];

  for (const candidate of candidates) {
    try {
      await access(candidate);
      return candidate;
    } catch {
      // Not at this path, try the next candidate.
    }
  }

  return "";
}

function spawnLast30Days({
  env,
  python,
  scriptPath,
  topic,
}: {
  env: NodeJS.ProcessEnv;
  python: string;
  scriptPath: string;
  topic: string;
}): Promise<{ ok: boolean; stdout: string; interpreterMissing: boolean }> {
  return new Promise((resolve) => {
    const child = spawn(python, [scriptPath, topic, "--emit=json"], { env });

    let stdout = "";

    child.stdout.on("data", (chunk: Buffer) => {
      stdout += chunk.toString();
    });
    child.stderr.on("data", () => {
      // Progress and source-warning noise; the export lands on stdout.
    });

    const timer = setTimeout(() => {
      child.kill("SIGKILL");
      resolve({ ok: false, stdout: "", interpreterMissing: false });
    }, LAST30DAYS_TIMEOUT_MS);

    // An error event here is this interpreter not existing, which is different
    // from the tool running and failing: the first is worth retrying with the
    // next candidate, the second is not.
    child.on("error", () => {
      clearTimeout(timer);
      resolve({ ok: false, stdout: "", interpreterMissing: true });
    });
    child.on("close", (code) => {
      clearTimeout(timer);
      resolve({ ok: code === 0, stdout, interpreterMissing: false });
    });
  });
}

// Real posts from the last30days source set only. Never throws: a missing
// install, a missing interpreter, a timeout, or an unreadable export all just
// mean fewer posts, matching fetchYouTubeListeningPosts below.
async function fetchLast30DaysPosts({
  blueskyAppPassword,
  blueskyHandle,
  scrapeCreatorsApiKey,
  topic,
  xaiApiKey,
}: {
  blueskyAppPassword: string;
  blueskyHandle: string;
  scrapeCreatorsApiKey: string;
  topic: string;
  xaiApiKey: string;
}): Promise<{ posts: ListeningPost[]; degradedSources: string[]; ran: boolean }> {
  const skipped = { posts: [], degradedSources: [], ran: false };

  try {
    const scriptPath = await resolveLast30DaysScript();

    if (!scriptPath) {
      return skipped;
    }

    const env: NodeJS.ProcessEnv = { ...process.env };

    // Each key is only set when present, so an absent key leaves the tool's own
    // default behaviour alone rather than handing it an empty string.
    if (scrapeCreatorsApiKey) {
      env.SCRAPECREATORS_API_KEY = scrapeCreatorsApiKey;
    }

    if (xaiApiKey) {
      env.XAI_API_KEY = xaiApiKey;
    }

    // Bluesky needs both halves before it can authenticate at all.
    if (blueskyHandle && blueskyAppPassword) {
      env.BSKY_HANDLE = blueskyHandle;
      env.BSKY_APP_PASSWORD = blueskyAppPassword;
    }

    const pythons = [
      process.env.LAST30DAYS_PYTHON,
      // The tool requires 3.12 or newer, so prefer an explicitly versioned
      // binary before falling back to whatever python3 happens to be.
      "python3.12",
      "python3",
    ].filter(Boolean) as string[];

    for (const python of pythons) {
      const run = await spawnLast30Days({ env, python, scriptPath, topic });

      if (run.interpreterMissing) {
        continue;
      }

      if (!run.ok) {
        return skipped;
      }

      const parsed = extractJsonObject(run.stdout);

      if (!parsed) {
        return skipped;
      }

      const { degradedSources, posts } = normaliseLast30DaysExport(parsed);

      return { posts, degradedSources, ran: true };
    }

    return skipped;
  } catch {
    return skipped;
  }
}

function stripHtml(text: string): string {
  return text
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .trim();
}

type YouTubeSearchItem = { id?: { videoId?: string }; snippet?: { title?: string } };
type YouTubeCommentItem = {
  snippet?: {
    topLevelComment?: {
      snippet?: { textDisplay?: string; publishedAt?: string };
    };
  };
};

// Real YouTube comments only, via the free YouTube Data API v3 (search.list +
// commentThreads.list). Never throws: a missing key, a quota error, or a
// video with comments disabled all just mean fewer posts, not a failed
// request, matching the never-throw pattern used by scrapeHomepageSocialLinks
// in lib/competitor-observe-ai.ts.
async function fetchYouTubeListeningPosts(
  topic: string,
  apiKey: string,
): Promise<ListeningPost[]> {
  if (!apiKey) {
    return [];
  }

  try {
    const searchUrl = new URL("https://www.googleapis.com/youtube/v3/search");
    searchUrl.searchParams.set("part", "snippet");
    searchUrl.searchParams.set("q", topic);
    searchUrl.searchParams.set("type", "video");
    searchUrl.searchParams.set("order", "relevance");
    searchUrl.searchParams.set("maxResults", "6");
    searchUrl.searchParams.set("key", apiKey);

    const searchResponse = await fetch(searchUrl, { signal: AbortSignal.timeout(10_000) });

    if (!searchResponse.ok) {
      return [];
    }

    const searchPayload = (await searchResponse.json().catch(() => null)) as {
      items?: YouTubeSearchItem[];
    } | null;
    const videoIds = (searchPayload?.items ?? [])
      .map((item) => item.id?.videoId)
      .filter((id): id is string => Boolean(id));

    const perVideo = await Promise.all(
      videoIds.map(async (videoId) => {
        try {
          const commentsUrl = new URL(
            "https://www.googleapis.com/youtube/v3/commentThreads",
          );
          commentsUrl.searchParams.set("part", "snippet");
          commentsUrl.searchParams.set("videoId", videoId);
          commentsUrl.searchParams.set("order", "relevance");
          commentsUrl.searchParams.set("maxResults", "10");
          commentsUrl.searchParams.set("key", apiKey);

          const commentsResponse = await fetch(commentsUrl, {
            signal: AbortSignal.timeout(10_000),
          });

          if (!commentsResponse.ok) {
            // Comments disabled on this video, or a quota hiccup: skip it,
            // other videos may still yield comments.
            return [];
          }

          const commentsPayload = (await commentsResponse.json().catch(() => null)) as {
            items?: YouTubeCommentItem[];
          } | null;

          return (commentsPayload?.items ?? [])
            .map((item) => item.snippet?.topLevelComment?.snippet)
            .filter((snippet): snippet is { textDisplay?: string; publishedAt?: string } =>
              Boolean(snippet?.textDisplay?.trim()),
            )
            .map((snippet) => ({
              text: stripHtml(snippet.textDisplay ?? "").slice(0, 600),
              source: "YouTube",
              url: `https://www.youtube.com/watch?v=${videoId}`,
              date: (snippet.publishedAt ?? "").slice(0, 10),
            }));
        } catch {
          return [];
        }
      }),
    );

    return perVideo.flat().filter((post) => post.text);
  } catch {
    return [];
  }
}

export async function POST(request: Request) {
  let body: ListeningRequestBody;

  try {
    body = (await request.json()) as ListeningRequestBody;
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid request body." }, { status: 400 });
  }

  const apiKey = body.apiKey?.trim();
  const xaiApiKey = body.xaiApiKey?.trim() ?? "";
  const youtubeApiKey = body.youtubeApiKey?.trim() ?? "";
  const scrapeCreatorsApiKey = body.scrapeCreatorsApiKey?.trim() ?? "";
  const blueskyHandle = body.blueskyHandle?.trim() ?? "";
  const blueskyAppPassword = body.blueskyAppPassword?.trim() ?? "";
  const model = body.model?.trim();
  const topic = body.topic?.trim();
  const analysisType = body.analysisType;

  if (!apiKey) {
    return NextResponse.json({ ok: false, error: "Connect OpenAI in Settings first." }, { status: 400 });
  }

  if (!model) {
    return NextResponse.json(
      { ok: false, error: "No analysis model chosen. Pick one in Settings." },
      { status: 400 },
    );
  }

  const searchModel = body.searchModel?.trim() || model;

  if (!topic) {
    return NextResponse.json({ ok: false, error: "Enter a topic to research." }, { status: 400 });
  }

  if (!analysisType || !ANALYSIS_TYPES.includes(analysisType)) {
    return NextResponse.json({ ok: false, error: "Pick an analysis type." }, { status: 400 });
  }

  const source: "reddit" | "both" = xaiApiKey ? "both" : "reddit";
  const workDir = await mkdtemp(path.join(tmpdir(), "sc-research-"));

  try {
    const [run, youtubePosts, last30days, webSearch] = await Promise.all([
      runResearchCli({
        topic,
        source,
        cwd: workDir,
        apiKey,
        xaiApiKey,
      }),
      fetchYouTubeListeningPosts(topic, youtubeApiKey),
      fetchLast30DaysPosts({
        blueskyAppPassword,
        blueskyHandle,
        scrapeCreatorsApiKey,
        topic,
        xaiApiKey,
      }),
      callOpenAiWebSearch({
        apiKey,
        model: searchModel,
        input: buildWebListeningSearchInput(topic),
      }),
    ]);

    const reddit = await readResearchFile(workDir, "reddit_data.json");
    const x = await readResearchFile(workDir, "x_data.json");
    const webPosts = webSearch.ok ? webCitationsToListeningPosts(webSearch.citations) : [];

    // Public web posts go last because they are page titles rather than a real
    // person's words, so when the 60-post budget bites they are the right thing
    // to lose first. last30days sits above them for the same reason: it carries
    // genuine post and comment text.
    const posts: ListeningPost[] = dedupeByUrl([
      ...(reddit?.posts ?? []),
      ...(x?.posts ?? []),
      ...youtubePosts,
      ...last30days.posts,
      ...webPosts,
    ]).slice(0, 60);

    if (posts.length === 0) {
      const detail = run.stderr
        .split("\n")
        .map((line) => line.trim())
        .filter((line) => /error|failed|key|timed out|rate limit/i.test(line))
        .slice(-1)
        .join(" ")
        .slice(0, 300);

      const sourcesTried = [
        "Reddit",
        xaiApiKey ? "X" : "",
        youtubeApiKey ? "YouTube" : "",
        "the public web",
      ].filter(Boolean);

      return NextResponse.json({
        ok: false,
        error:
          `No public posts were found for this topic across ${sourcesTried.join(", ")}.` +
          (detail ? ` Tool said: ${detail}` : " Try a broader topic."),
      });
    }

    const analysis = await callOpenAiJson<ListeningDraft>({
      apiKey,
      model,
      system: buildListeningSystemPrompt(),
      user: buildListeningUserPrompt(topic, analysisType, posts),
    });

    if (!analysis.ok) {
      return NextResponse.json({ ok: false, error: analysis.error });
    }

    if (!analysis.data.insight?.trim()) {
      return NextResponse.json({
        ok: false,
        error: "The analysis came back empty. Try again or pick another model.",
      });
    }

    // Attach only genuinely fetched posts as evidence. If the model pointed
    // at nothing valid, fall back to the first fetched posts rather than
    // showing an insight with no evidence.
    const indexes = (Array.isArray(analysis.data.quoteIndexes)
      ? analysis.data.quoteIndexes
      : []
    ).filter((index) => Number.isInteger(index) && index >= 0 && index < posts.length);
    const evidence = (indexes.length > 0 ? indexes : posts.slice(0, 5).map((_, i) => i))
      .slice(0, 8)
      .map((index) => ({
        text: posts[index].text.slice(0, 300),
        source: posts[index].source,
        url: posts[index].url,
      }));

    const subreddits = [
      ...new Set(
        posts
          .filter((post) => post.source.startsWith("r/"))
          .map((post) => post.source),
      ),
    ];
    const hasX = posts.some((post) => post.source === "X");
    const hasYouTube = posts.some((post) => post.source === "YouTube");
    const hasWeb = posts.some((post) => post.source === "Public web");

    // Everything last30days contributed beyond the four sources named above,
    // listed by name so the manager sees exactly which platforms were read
    // rather than a vague claim of broader coverage.
    const namedAlready = new Set(["X", "YouTube", "Public web"]);
    const extraSources = [
      ...new Set(
        posts
          .filter(
            (post) => !post.source.startsWith("r/") && !namedAlready.has(post.source),
          )
          .map((post) => post.source),
      ),
    ].sort();

    const sourcesCovered = [
      subreddits.length > 0 ? `Reddit (${subreddits.slice(0, 6).join(", ")})` : "",
      hasX ? "X" : source === "reddit" ? "X not searched (no xAI key)" : "",
      hasYouTube ? "YouTube comments" : youtubeApiKey ? "" : "YouTube not searched (no API key)",
      extraSources.join(", "),
      hasWeb ? "public web" : "",
      last30days.ran && !scrapeCreatorsApiKey
        ? "TikTok, Instagram, Threads, Pinterest and LinkedIn not searched (no ScrapeCreators key)"
        : "",
      last30days.degradedSources.length > 0
        ? `${last30days.degradedSources.join(", ")} returned nothing this run`
        : "",
    ]
      .filter(Boolean)
      .join(", ");

    const from = [reddit?.from, x?.from].filter(Boolean).sort()[0] ?? "";
    const to = [reddit?.to, x?.to].filter(Boolean).sort().reverse()[0] ?? "";

    return NextResponse.json({
      ok: true,
      insight: analysis.data.insight.trim(),
      quotes: evidence,
      sourcesCovered: sourcesCovered || "Public web posts",
      dateRange: from && to ? `${from} to ${to}` : "Recent posts",
      postsFetched: posts.length,
      usage: analysis.usage,
      model: analysis.model,
    });
  } finally {
    await rm(workDir, { recursive: true, force: true }).catch(() => undefined);
  }
}

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
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import { NextResponse } from "next/server";

import {
  buildListeningSystemPrompt,
  buildListeningUserPrompt,
  buildWebListeningSearchInput,
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
    const [run, youtubePosts, webSearch] = await Promise.all([
      runResearchCli({
        topic,
        source,
        cwd: workDir,
        apiKey,
        xaiApiKey,
      }),
      fetchYouTubeListeningPosts(topic, youtubeApiKey),
      callOpenAiWebSearch({
        apiKey,
        model: searchModel,
        input: buildWebListeningSearchInput(topic),
      }),
    ]);

    const reddit = await readResearchFile(workDir, "reddit_data.json");
    const x = await readResearchFile(workDir, "x_data.json");
    const webPosts = webSearch.ok ? webCitationsToListeningPosts(webSearch.citations) : [];
    const posts: ListeningPost[] = [
      ...(reddit?.posts ?? []),
      ...(x?.posts ?? []),
      ...youtubePosts,
      ...webPosts,
    ].slice(0, 60);

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
    const sourcesCovered = [
      subreddits.length > 0 ? `Reddit (${subreddits.slice(0, 6).join(", ")})` : "",
      hasX ? "X" : source === "reddit" ? "X not searched (no xAI key)" : "",
      hasYouTube ? "YouTube comments" : youtubeApiKey ? "" : "YouTube not searched (no API key)",
      hasWeb ? "public web" : "",
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

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
  availableListeningSources,
  last30daysSearchArg,
  listeningSourceLabels,
  resolveListeningSources,
  scResearchSourceArg,
} from "@/lib/listening-sources";
import {
  buildListeningSystemPrompt,
  buildListeningUserPrompt,
  buildWebListeningSearchInput,
  dedupeByUrl,
  meaningfulErrorLine,
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
  sources?: string[];
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
  // sc-research's own usage string is --source=reddit|x|both. This was
  // previously narrowed to reddit|both, which welded X to Reddit for no reason:
  // with source selection, X alone is a valid thing to ask for.
  source: "reddit" | "x" | "both";
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

// The result of trying the extra source group. "ran" separates a tool that is
// not installed from one that ran, and "reason" carries why there are no posts
// when that is knowable. All three used to collapse into one empty result, so a
// missing install, a crash, and a genuinely quiet topic looked identical to the
// manager, and a paid source refusing on billing grounds looked like silence.
type Last30DaysOutcome = {
  posts: ListeningPost[];
  degradedSources: string[];
  ran: boolean;
  reason: string;
};

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
  searchArg,
  topic,
}: {
  env: NodeJS.ProcessEnv;
  python: string;
  scriptPath: string;
  searchArg: string;
  topic: string;
}): Promise<{
  ok: boolean;
  stdout: string;
  stderr: string;
  interpreterMissing: boolean;
  timedOut: boolean;
}> {
  return new Promise((resolve) => {
    // --search is a per-invocation flag and beats the tool's own
    // LAST30DAYS_DEFAULT_SEARCH env var, so the manager's chip selection takes
    // effect on this run alone with no redeploy and no .env.production edit.
    // It also means the noise sources the UI hides are never even requested.
    const child = spawn(
      python,
      [scriptPath, topic, "--emit=json", `--search=${searchArg}`],
      { env },
    );

    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (chunk: Buffer) => {
      stdout += chunk.toString();
    });
    // Previously discarded as progress noise. It is also where the tool reports
    // why a paid source refused to answer, so throwing it away turned an
    // unpaid ScrapeCreators invoice into a blank "no posts found".
    child.stderr.on("data", (chunk: Buffer) => {
      stderr += chunk.toString();
    });

    const timer = setTimeout(() => {
      child.kill("SIGKILL");
      resolve({ ok: false, stdout: "", stderr, interpreterMissing: false, timedOut: true });
    }, LAST30DAYS_TIMEOUT_MS);

    // An error event here is this interpreter not existing, which is different
    // from the tool running and failing: the first is worth retrying with the
    // next candidate, the second is not.
    child.on("error", () => {
      clearTimeout(timer);
      resolve({ ok: false, stdout: "", stderr, interpreterMissing: true, timedOut: false });
    });
    child.on("close", (code) => {
      clearTimeout(timer);
      resolve({ ok: code === 0, stdout, stderr, interpreterMissing: false, timedOut: false });
    });
  });
}

// Real posts from the last30days source set only. Never throws: a missing
// install, a missing interpreter, a timeout, or an unreadable export all just
// mean fewer posts, matching fetchYouTubeListeningPosts below.
async function fetchLast30DaysPosts({
  scrapeCreatorsApiKey,
  searchArg,
  topic,
  xaiApiKey,
}: {
  scrapeCreatorsApiKey: string;
  searchArg: string;
  topic: string;
  xaiApiKey: string;
}): Promise<Last30DaysOutcome> {
  // "not installed" is a deployment state, not a failure, so it carries no
  // reason: the feature is simply absent and the rest of the search proceeds.
  const notInstalled: Last30DaysOutcome = {
    posts: [],
    degradedSources: [],
    ran: false,
    reason: "",
  };

  try {
    const scriptPath = await resolveLast30DaysScript();

    if (!scriptPath) {
      return notInstalled;
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

    const pythons = [
      process.env.LAST30DAYS_PYTHON,
      // The tool requires 3.12 or newer, so prefer an explicitly versioned
      // binary before falling back to whatever python3 happens to be.
      "python3.12",
      "python3",
    ].filter(Boolean) as string[];

    for (const python of pythons) {
      const run = await spawnLast30Days({ env, python, scriptPath, searchArg, topic });

      if (run.interpreterMissing) {
        continue;
      }

      // Each of these was previously the same silent empty result. They are
      // different problems with different fixes, so they now say which.
      if (run.timedOut) {
        return {
          posts: [],
          degradedSources: [],
          ran: true,
          reason: `the extra sources timed out after ${LAST30DAYS_TIMEOUT_MS / 1000} seconds`,
        };
      }

      if (!run.ok) {
        const detail = meaningfulErrorLine(run.stderr);
        return {
          posts: [],
          degradedSources: [],
          ran: true,
          reason: detail || "the extra sources tool exited with an error",
        };
      }

      const parsed = extractJsonObject(run.stdout);

      if (!parsed) {
        const detail = meaningfulErrorLine(run.stderr);
        return {
          posts: [],
          degradedSources: [],
          ran: true,
          reason: detail || "the extra sources tool returned output that could not be read",
        };
      }

      const { degradedSources, posts } = normaliseLast30DaysExport(parsed);

      // A clean exit can still hide a per-source refusal, an unpaid invoice
      // being the obvious one, so keep the stderr line when nothing came back.
      return {
        posts,
        degradedSources,
        ran: true,
        reason: posts.length === 0 ? meaningfulErrorLine(run.stderr) : "",
      };
    }

    // Every candidate interpreter was missing.
    return {
      posts: [],
      degradedSources: [],
      ran: false,
      reason: "no Python 3.12 interpreter was found for the extra sources",
    };
  } catch (error) {
    return {
      posts: [],
      degradedSources: [],
      ran: false,
      reason: error instanceof Error ? error.message.slice(0, 300) : "",
    };
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

  // Which sources this run should actually search. An absent list means every
  // source the keys allow, so a workspace saved before source selection existed
  // behaves exactly as it did. An explicitly empty list is rejected by the
  // screen before it gets here, but guard anyway rather than silently searching
  // nothing and reporting an empty result as though the topic were quiet.
  const available = availableListeningSources({
    scrapeCreatorsApiKey,
    xaiApiKey,
    youtubeApiKey,
  });
  const selected = resolveListeningSources(body.sources, available);

  if (selected.length === 0) {
    return NextResponse.json(
      { ok: false, error: "Pick at least one source to search." },
      { status: 400 },
    );
  }

  const source = scResearchSourceArg(selected);
  const last30daysSearch = last30daysSearchArg(selected);
  const wantsYouTube = selected.includes("youtube");
  const wantsWeb = selected.includes("web");
  const workDir = await mkdtemp(path.join(tmpdir(), "sc-research-"));

  try {
    // Every leg is now conditional. Skipping an unwanted engine outright is
    // where the time saving comes from: a Reddit-and-TikTok search no longer
    // waits on the web search, the YouTube fetch, or a last30days run.
    const [run, youtubePosts, last30days, webSearch] = await Promise.all([
      source
        ? runResearchCli({ topic, source, cwd: workDir, apiKey, xaiApiKey })
        : Promise.resolve({ code: 0, stderr: "" }),
      wantsYouTube
        ? fetchYouTubeListeningPosts(topic, youtubeApiKey)
        : Promise.resolve([]),
      last30daysSearch
        ? fetchLast30DaysPosts({
            scrapeCreatorsApiKey,
            searchArg: last30daysSearch,
            topic,
            xaiApiKey,
          })
        : Promise.resolve<Last30DaysOutcome>({
            posts: [],
            degradedSources: [],
            ran: false,
            reason: "",
          }),
      wantsWeb
        ? callOpenAiWebSearch({
            apiKey,
            model: searchModel,
            input: buildWebListeningSearchInput(topic),
          })
        : Promise.resolve({ ok: false as const, citations: [], error: "" }),
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
      // The selection IS the list of sources tried, so name it directly rather
      // than inferring from which keys happen to be present. A dead end on two
      // chosen sources should read as exactly that, not as a wide search.
      const sourcesTried = listeningSourceLabels(selected);
      const narrow = selected.length < available.length;

      // Every reason we actually hold, rather than only sc-research's. On a
      // TikTok-only search sc-research is not even spawned, so its stderr is
      // empty by construction and used to be the only thing consulted: the
      // manager got "try a broader topic" for what was really an unpaid
      // ScrapeCreators invoice. degradedSources is included for the same
      // reason, having previously been computed and then only used further
      // down, on a code path that zero posts never reaches.
      const reasons = [
        meaningfulErrorLine(run.stderr),
        last30days.reason,
        last30days.degradedSources.length > 0
          ? `${last30days.degradedSources.join(", ")} did not answer`
          : "",
      ].filter(Boolean);

      return NextResponse.json({
        ok: false,
        error:
          `No public posts were found for this topic across ${sourcesTried.join(", ")}.` +
          (reasons.length > 0
            ? ` Reported: ${reasons.join("; ")}`
            : narrow
              ? " Try a broader topic, or tick more sources."
              : " Try a broader topic."),
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
    // The selection now says what was searched, so coverage is reported by
    // comparing it against what actually produced posts. That is both simpler
    // and more honest than inferring from which keys are set, and it retires
    // the old "not searched (no key)" wording: a source with no key can no
    // longer be selected, so that case is unreachable rather than merely rare.
    const produced = (label: string) =>
      label === "Reddit"
        ? subreddits.length > 0
        : posts.some((post) => post.source === label);

    const searchedLabels = listeningSourceLabels(selected);
    const answered = searchedLabels.filter(produced);
    const quiet = searchedLabels.filter((label) => !produced(label));

    // last30days can say a source errored rather than merely finding nothing.
    // Only add names that "quiet" has not already covered, so a failed source
    // is not listed twice.
    const alsoDegraded = last30days.degradedSources.filter(
      (label) => !quiet.includes(label) && !answered.includes(label),
    );

    const sourcesCovered = [
      subreddits.length > 0 ? `Reddit (${subreddits.slice(0, 6).join(", ")})` : "",
      ...answered.filter((label) => label !== "Reddit"),
      quiet.length > 0 ? `${quiet.join(", ")} returned nothing this run` : "",
      alsoDegraded.length > 0 ? `${alsoDegraded.join(", ")} errored` : "",
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

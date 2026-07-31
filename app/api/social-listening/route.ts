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
  DEFAULT_LISTENING_RECENCY,
  filterPostsByRecency,
  isListeningRecency,
  recencyToDateRange,
  summariseSample,
  type ListeningRecency,
} from "@/lib/listening-patterns";
import {
  availableListeningSources,
  last30daysSearchArg,
  listeningSourceLabels,
  resolveListeningSources,
  listeningPerSourceCap,
  scResearchSourceArg,
} from "@/lib/listening-sources";
import {
  buildInstagramHashtagSearchUrl,
  buildListeningSystemPrompt,
  buildListeningUserPrompt,
  buildWebListeningSearchInput,
  dedupeByUrl,
  isHashtagShapedTopic,
  meaningfulErrorLine,
  normalizeResearchFile,
  normaliseInstagramHashtagPosts,
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
  youtubeApiKey?: string;
  scrapeCreatorsApiKey?: string;
  sources?: string[];
  recency?: string;
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
  dateRange,
  cwd,
  apiKey,
}: {
  topic: string;
  // sc-research accepts --from and --to as plain YYYY-MM-DD and turns them
  // into Reddit's own period parameter, so this leg genuinely narrows at the
  // source instead of fetching wide and discarding afterwards.
  dateRange: { from: string; to: string };
  cwd: string;
  apiKey: string;
}): Promise<{ code: number; stderr: string }> {
  return new Promise((resolve) => {
    const cliPath = path.join(
      process.cwd(),
      "node_modules",
      "sc-research",
      "dist",
      "index.js",
    );
    // sc-research also supports --source=x|both via an xAI key, but that leg
    // has been removed on cost grounds, so this only ever asks for Reddit now.
    const child = spawn(
      process.execPath,
      [
        cliPath,
        "research",
        topic,
        "--source=reddit",
        `--from=${dateRange.from}`,
        `--to=${dateRange.to}`,
      ],
      {
        cwd,
        env: {
          ...process.env,
          OPENAI_API_KEY: apiKey,
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
      resolve({
        code: -1,
        stderr: `${stderr}\nTimed out after ${SOURCE_TIMEOUT_MS / 1000} seconds.`,
      });
    }, SOURCE_TIMEOUT_MS);

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

// The time budget for one search, in one place so it can be checked by reading
// rather than by adding up numbers scattered through the file.
//
// The sourcing legs run concurrently, so the parallel block costs the slowest
// of them, not their sum. Synthesis then runs after it. Worst case is therefore
// SOURCE + SYNTHESIS, about 150 seconds, which fits inside a reverse proxy
// limit of 180s with headroom.
//
// These were each 180 seconds, with both OpenAI calls unbounded entirely. That
// let one slow source consume a budget the proxy had already given up on, so
// the manager got a gateway error page instead of a result. Capping each leg
// does not make anything faster; it makes the total predictable.
const SOURCE_TIMEOUT_MS = 90_000;
const WEB_SEARCH_TIMEOUT_MS = 30_000;
const SYNTHESIS_TIMEOUT_MS = 60_000;

const LAST30DAYS_TIMEOUT_MS = SOURCE_TIMEOUT_MS;

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
  perSourceCap,
  searchArg,
  topic,
}: {
  scrapeCreatorsApiKey: string;
  perSourceCap: number;
  searchArg: string;
  topic: string;
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

    // Only set when present, so an absent key leaves the tool's own default
    // behaviour alone rather than handing it an empty string. XAI_API_KEY is
    // deliberately never passed here: the only source set this app ever asks
    // last30days for (tiktok, instagram, threads, linkedin) has no X/Twitter
    // among it, so the tool's own X backend is unreachable through this call
    // regardless, and passing a costly key it will never use would be pointless.
    if (scrapeCreatorsApiKey) {
      env.SCRAPECREATORS_API_KEY = scrapeCreatorsApiKey;
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

      const { degradedSources, posts } = normaliseLast30DaysExport(parsed, perSourceCap);

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
// YouTube listening runs on the YouTube Data API v3, NOT on yt-dlp. yt-dlp is
// only used by last30days, and youtube is deliberately absent from
// LAST30DAYS_SOURCE_IDS because the dedicated path returns real comment threads
// rather than summaries. So whether yt-dlp is installed has no bearing on
// whether this works, which is worth stating because it is the obvious wrong
// place to look.
//
// Returns a reason alongside the posts. Every failure here used to be a bare
// "return []": an invalid key, a restricted key and an exhausted quota all
// looked identical to a topic nobody has posted about. Quota is the likely one
// in practice, since search.list costs 100 units against a 10,000 unit daily
// default, so about a hundred searches exhausts a fresh project for the day.
type YouTubeOutcome = { posts: ListeningPost[]; reason: string };

async function fetchYouTubeListeningPosts(
  topic: string,
  apiKey: string,
): Promise<YouTubeOutcome> {
  if (!apiKey) {
    return { posts: [], reason: "" };
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
      // Google puts the real cause in the body: quotaExceeded, keyInvalid,
      // ipRefererBlocked. Passing it through is the difference between the
      // manager fixing it and the manager retyping their topic.
      const body = await searchResponse.text().catch(() => "");
      const detail = /"(?:reason|message)"\s*:\s*"([^"]+)"/.exec(body)?.[1] ?? "";

      return {
        posts: [],
        reason:
          `YouTube refused the search (HTTP ${searchResponse.status}` +
          (detail ? `: ${detail}` : "") +
          `). ${searchResponse.status === 403 ? "That is usually the daily quota or a restricted key." : "Check the YouTube Data API key in Settings."}`,
      };
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

    const posts = perVideo.flat().filter((post) => post.text);

    return {
      posts,
      reason:
        posts.length === 0 && videoIds.length > 0
          ? "YouTube returned videos but none had readable comments (comments may be disabled on them)"
          : "",
    };
  } catch (error) {
    const timedOut = error instanceof DOMException && error.name === "TimeoutError";

    return {
      posts: [],
      reason: timedOut
        ? "YouTube did not respond within 10 seconds"
        : `YouTube could not be reached: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

// Instagram hashtag search, direct to ScrapeCreators. A second, complementary
// Instagram leg alongside last30days' own reel-by-keyword search: this one
// finds ordinary posts (not just reels) by hashtag. Confirmed working in a
// live endpoint audit. Never throws, matching every other fetch* function in
// this route: a bad key, a timeout, or a quiet tag all just mean fewer posts.
async function fetchInstagramHashtagPosts(
  topic: string,
  apiKey: string,
): Promise<{ posts: ListeningPost[]; reason: string }> {
  try {
    const response = await fetch(buildInstagramHashtagSearchUrl(topic), {
      headers: { "x-api-key": apiKey },
      signal: AbortSignal.timeout(15_000),
    });

    const text = await response.text();

    if (!response.ok) {
      const detail = text.trim().slice(0, 300);
      return {
        posts: [],
        reason:
          `Instagram hashtag search returned HTTP ${response.status}` +
          (detail ? `: ${detail}` : "") +
          (response.status === 401 || response.status === 403
            ? ". Check the ScrapeCreators API key in Settings."
            : response.status === 402
              ? ". The ScrapeCreators account is out of credits."
              : "."),
      };
    }

    let parsed: unknown;

    try {
      parsed = JSON.parse(text);
    } catch {
      return { posts: [], reason: "Instagram hashtag search returned a reply that could not be read as JSON." };
    }

    return { posts: normaliseInstagramHashtagPosts(parsed), reason: "" };
  } catch (error) {
    const timedOut = error instanceof DOMException && error.name === "TimeoutError";

    return {
      posts: [],
      reason: timedOut
        ? "Instagram hashtag search did not respond within 15 seconds"
        : `Instagram hashtag search could not be reached: ${error instanceof Error ? error.message : String(error)}`,
    };
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
    youtubeApiKey,
  });
  const selected = resolveListeningSources(body.sources, available);

  if (selected.length === 0) {
    return NextResponse.json(
      { ok: false, error: "Pick at least one source to search." },
      { status: 400 },
    );
  }

  const recency: ListeningRecency = isListeningRecency(body.recency)
    ? body.recency
    : DEFAULT_LISTENING_RECENCY;
  const dateRange = recencyToDateRange(recency, new Date());

  const source = scResearchSourceArg(selected);
  const last30daysSearch = last30daysSearchArg(selected);
  const wantsYouTube = selected.includes("youtube");
  const wantsWeb = selected.includes("web");
  // Instagram already gets keyword-shaped reel search via last30days. This is
  // a second, complementary leg straight to ScrapeCreators: real Instagram
  // posts (not just reels) matching a hashtag, confirmed working in the live
  // endpoint audit and genuinely missing from the pipeline before this. Only
  // fired for a single-word topic (see isHashtagShapedTopic): guessing a
  // hashtag out of a full phrase would risk pulling in posts under an
  // unrelated tag and calling that evidence.
  const wantsInstagramHashtags =
    selected.includes("instagram") && Boolean(scrapeCreatorsApiKey) && isHashtagShapedTopic(topic);
  const workDir = await mkdtemp(path.join(tmpdir(), "sc-research-"));

  try {
    // Every leg is now conditional. Skipping an unwanted engine outright is
    // where the time saving comes from: a Reddit-and-TikTok search no longer
    // waits on the web search, the YouTube fetch, or a last30days run.
    const [run, youtubePosts, last30days, webSearch, instagramHashtagPosts] = await Promise.all([
      source
        ? runResearchCli({ topic, dateRange, cwd: workDir, apiKey })
        : Promise.resolve({ code: 0, stderr: "" }),
      wantsYouTube
        ? fetchYouTubeListeningPosts(topic, youtubeApiKey)
        : Promise.resolve({ posts: [], reason: "" }),
      last30daysSearch
        ? fetchLast30DaysPosts({
            scrapeCreatorsApiKey,
            perSourceCap: listeningPerSourceCap(selected.length),
            searchArg: last30daysSearch,
            topic,
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
            timeoutMs: WEB_SEARCH_TIMEOUT_MS,
          })
        : Promise.resolve({ ok: false as const, citations: [], error: "" }),
      wantsInstagramHashtags
        ? fetchInstagramHashtagPosts(topic, scrapeCreatorsApiKey)
        : Promise.resolve({ posts: [], reason: "" }),
    ]);

    const reddit = await readResearchFile(workDir, "reddit_data.json");
    const webPosts = webSearch.ok ? webCitationsToListeningPosts(webSearch.citations) : [];

    // Public web posts go last because they are page titles rather than a real
    // person's words, so when the 60-post budget bites they are the right thing
    // to lose first. last30days sits above them for the same reason: it carries
    // genuine post and comment text.
    const merged = dedupeByUrl([
      ...(reddit?.posts ?? []),
      ...youtubePosts.posts,
      ...last30days.posts,
      ...instagramHashtagPosts.posts,
      ...webPosts,
    ]);

    // Only sc-research and TikTok can narrow at the source. Everything else
    // returns whatever it returns, so the window is applied here. Undated posts
    // survive on purpose: not knowing when something was written is not a
    // reason to throw away real evidence.
    const windowed = filterPostsByRecency(merged, recency, new Date());
    const posts: ListeningPost[] = windowed.kept.slice(0, 60);

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
        youtubePosts.reason,
        last30days.reason,
        last30days.degradedSources.length > 0
          ? `${last30days.degradedSources.join(", ")} did not answer`
          : "",
        instagramHashtagPosts.reason,
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
      timeoutMs: SYNTHESIS_TIMEOUT_MS,
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

    // Show how much each source actually contributed. A run reading "TikTok,
    // Reddit" hides that TikTok gave 30 posts and Reddit gave 1, which changes
    // how much weight the insight deserves.
    const countFor = (label: string) =>
      label === "Reddit"
        ? posts.filter((post) => post.source.startsWith("r/")).length
        : posts.filter((post) => post.source === label).length;

    const sourcesCovered = [
      subreddits.length > 0
        ? `Reddit (${subreddits.slice(0, 6).join(", ")}: ${countFor("Reddit")} posts)`
        : "",
      ...answered
        .filter((label) => label !== "Reddit")
        .map((label) => `${label} (${countFor(label)})`),
      quiet.length > 0 ? `${quiet.join(", ")} returned nothing this run` : "",
      alsoDegraded.length > 0 ? `${alsoDegraded.join(", ")} errored` : "",
      // A source can fail while others succeed, in which case the zero-post
      // path never runs and the reason would be lost. Without this, a quota
      // refusal reads as "YouTube returned nothing this run", which sends the
      // manager looking at their topic instead of their key.
      youtubePosts.reason,
      instagramHashtagPosts.reason,
    ]
      .filter(Boolean)
      .join(", ");

    const from = reddit?.from ?? "";
    const to = reddit?.to ?? "";

    return NextResponse.json({
      ok: true,
      insight: analysis.data.insight.trim(),
      quotes: evidence,
      sourcesCovered: sourcesCovered || "Public web posts",
      dateRange: from && to ? `${from} to ${to}` : "Recent posts",
      postsFetched: posts.length,
      // Counts over the posts THIS search returned. A sample, never the
      // platform: the UI must label it that way.
      patterns: summariseSample(posts, windowed.undated),
      recency,
      olderPostsDropped: windowed.dropped,
      usage: analysis.usage,
      model: analysis.model,
    });
  } finally {
    await rm(workDir, { recursive: true, force: true }).catch(() => undefined);
  }
}

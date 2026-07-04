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
  normalizeResearchFile,
  type ListeningAnalysisType,
  type ListeningPost,
} from "@/lib/listening-ai";
import { callOpenAiJson } from "@/lib/openai-shared";

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
  model?: string;
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

export async function POST(request: Request) {
  let body: ListeningRequestBody;

  try {
    body = (await request.json()) as ListeningRequestBody;
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid request body." }, { status: 400 });
  }

  const apiKey = body.apiKey?.trim();
  const xaiApiKey = body.xaiApiKey?.trim() ?? "";
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

  if (!topic) {
    return NextResponse.json({ ok: false, error: "Enter a topic to research." }, { status: 400 });
  }

  if (!analysisType || !ANALYSIS_TYPES.includes(analysisType)) {
    return NextResponse.json({ ok: false, error: "Pick an analysis type." }, { status: 400 });
  }

  const source: "reddit" | "both" = xaiApiKey ? "both" : "reddit";
  const workDir = await mkdtemp(path.join(tmpdir(), "sc-research-"));

  try {
    const run = await runResearchCli({
      topic,
      source,
      cwd: workDir,
      apiKey,
      xaiApiKey,
    });

    const reddit = await readResearchFile(workDir, "reddit_data.json");
    const x = await readResearchFile(workDir, "x_data.json");
    const posts: ListeningPost[] = [
      ...(reddit?.posts ?? []),
      ...(x?.posts ?? []),
    ].slice(0, 40);

    if (posts.length === 0) {
      const detail = run.stderr
        .split("\n")
        .map((line) => line.trim())
        .filter((line) => /error|failed|key|timed out|rate limit/i.test(line))
        .slice(-1)
        .join(" ")
        .slice(0, 300);

      return NextResponse.json({
        ok: false,
        error:
          `The research tool fetched no public posts for this topic${source === "reddit" ? " (Reddit only, no xAI key set)" : ""}.` +
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
    const sourcesCovered = [
      subreddits.length > 0 ? `Reddit (${subreddits.slice(0, 6).join(", ")})` : "",
      hasX ? "X" : source === "reddit" ? "X not searched (no xAI key)" : "",
    ]
      .filter(Boolean)
      .join(" and ");

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

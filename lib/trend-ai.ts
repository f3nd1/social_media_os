// Prompt building and mapping for the Trend Radar (Module D1).
// Pure helpers, no network. The route pairs a real web search (utility
// model) with a synthesis pass (analysis model); every trend card must
// carry sources that came back from the actual search.

import { COMPLIANCE_PROMPT_RULE } from "@/lib/compliance-ai";
import type {
  MarketingWorkspaceData,
  TrendInsight,
  TrendSource,
} from "@/lib/social-calendar-data";

export type TrendAiContext = {
  todayIso: string;
  courses: Array<{ name: string; category: string }>;
  audiences: Array<{ name: string; languages: string[] }>;
  platforms: string[];
};

export type TrendAiDraft = {
  trends: Array<{
    title: string;
    whyItMatters: string;
    contentAngle: string;
    sourceUrls: string[];
  }>;
};

export function buildTrendSearchInput(context: TrendAiContext): string {
  return [
    `Today is ${context.todayIso}. Search the web for current, real news and discussion from the last 60 days on these topics:`,
    "1. Singapore private education institutions: regulation, enrolment, marketing news.",
    "2. International student recruitment trends for Singapore, especially students from mainland China.",
    "3. Concerns of PRC families choosing overseas study destinations.",
    "4. English language learning content trends (IELTS and general English).",
    "5. Social media content patterns that education marketers are using right now.",
    "Report only what you actually find, with the source pages. If a topic has no solid recent coverage, say so plainly instead of padding.",
  ].join("\n");
}

export function buildTrendSynthesisSystemPrompt(): string {
  return [
    "You are a marketing analyst for United Ceres College, a private college in Singapore.",
    "You are given real web search findings and the list of pages they cite. Turn them into trend cards for the marketing manager.",
    "Only describe trends supported by the findings. Never invent a trend, a statistic, or a source. If the findings are thin, return fewer trends or none.",
    "For sourceUrls, copy the exact URLs from the citation list that support each trend. A trend with no supporting citation must be left out.",
    COMPLIANCE_PROMPT_RULE,
    "Use British spelling. Do not use em dashes. Refer to teaching staff as teachers, never instructors.",
    "Return only a single JSON object matching the requested shape.",
  ].join(" ");
}

export function buildTrendSynthesisUserPrompt(
  findings: string,
  citations: TrendSource[],
  context: TrendAiContext,
): string {
  const shape = {
    trends: [
      {
        title: "string, the trend in one line",
        whyItMatters: "string, why this matters to United Ceres College",
        contentAngle: "string, a compliant content angle the team could draft",
        sourceUrls: ["string, exact URLs from the citation list"],
      },
    ],
  };

  return [
    "WEB SEARCH FINDINGS (real, from today's search):",
    findings,
    "",
    "CITATION LIST (the only allowed sources):",
    JSON.stringify(citations, null, 2),
    "",
    "COLLEGE CONTEXT:",
    JSON.stringify(
      {
        courses: context.courses,
        audiences: context.audiences,
        platforms: context.platforms,
      },
      null,
      2,
    ),
    "",
    "Write 3 to 6 trend cards as JSON in exactly this shape:",
    JSON.stringify(shape, null, 2),
  ].join("\n");
}

export function buildTrendContext(data: MarketingWorkspaceData): TrendAiContext {
  return {
    todayIso: new Date().toISOString().slice(0, 10),
    courses: data.ucc.courses
      .filter((course) => course.status !== "archived")
      .map((course) => ({ name: course.name, category: course.category })),
    audiences: data.ucc.audiences.map((audience) => ({
      name: audience.name,
      languages: audience.languages,
    })),
    platforms: data.audits.map((audit) => audit.platform),
  };
}

// Map the synthesis draft into stored trend cards, keeping only trends whose
// sources are genuine citations from the search. Returns [] when nothing
// survives, which the route reports honestly.
export function trendDraftToInsights(
  draft: TrendAiDraft,
  citations: TrendSource[],
  model: string,
): TrendInsight[] {
  const byUrl = new Map(citations.map((citation) => [citation.url, citation]));
  const rows = Array.isArray(draft.trends) ? draft.trends : [];
  const generatedAt = new Date().toISOString();

  return rows
    .map((row, index): TrendInsight | null => {
      const sources = (Array.isArray(row.sourceUrls) ? row.sourceUrls : [])
        .map((url) => byUrl.get(url))
        .filter((source): source is TrendSource => Boolean(source));

      if (!row.title?.trim() || sources.length === 0) {
        return null;
      }

      return {
        id: `trend-${Date.now()}-${index}`,
        title: row.title.trim(),
        whyItMatters: row.whyItMatters?.trim() ?? "",
        contentAngle: row.contentAngle?.trim() ?? "",
        sources,
        status: "draft" as const,
        model,
        generatedAt,
      };
    })
    .filter((row): row is TrendInsight => Boolean(row));
}

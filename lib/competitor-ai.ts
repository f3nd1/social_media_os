// Prompt building and output mapping for AI competitor analysis (Module A3).
// Pure helpers, no network.

import { COMPLIANCE_PROMPT_RULE } from "@/lib/compliance-ai";
import type { Competitor, CompetitorInsight } from "@/lib/social-calendar-data";

export type CompetitorAiContext = {
  ownPositioning: {
    brandName: string;
    industry: string;
    toneOfVoice: string;
    offers: string;
    goals: string[];
  };
  briefSummary: {
    monthlyCampaignGoal: string;
    contentPillars: string[];
    keyAnglesToOwn: string[];
  };
  competitors: Array<{
    id: string;
    name: string;
    website: string;
    platforms: string[];
    contentFormats: string[];
    tone: string;
    postingFrequency: string;
    observedStrengths: string[];
    contentGaps: string[];
    whitespaceOpportunities: string[];
  }>;
};

export type CompetitorAiDraft = {
  competitors: Array<{
    id: string;
    name: string;
    strengths: string[];
    weaknesses: string[];
    contentGaps: string[];
    whitespaceOpportunities: string[];
  }>;
};

export function buildCompetitorSystemPrompt(): string {
  return [
    "You are a senior competitive intelligence analyst for a private college in Singapore.",
    "You analyse the manager's own competitor records against the college's positioning and produce insights as drafts for a human Marketing Manager to accept or dismiss. You never act on them yourself.",
    "Ground every insight in the observations provided; do not invent facts about competitors that are not supported by the records. Whitespace opportunities describe openings for the college, in conditional language.",
    COMPLIANCE_PROMPT_RULE,
    "Use British spelling. Do not use em dashes. Refer to teaching staff as teachers, never instructors.",
    "Return only a single JSON object matching the requested shape.",
  ].join(" ");
}

export function buildCompetitorUserPrompt(context: CompetitorAiContext): string {
  const shape = {
    competitors: [
      {
        id: "string, the competitor id from context",
        name: "string, the competitor name from context",
        strengths: ["string, 1 to 3 entries"],
        weaknesses: ["string, 1 to 3 entries"],
        contentGaps: ["string, 1 to 3 entries"],
        whitespaceOpportunities: ["string, 1 to 3 openings for the college"],
      },
    ],
  };

  return [
    "Analyse every competitor in the context against the college's own positioning.",
    "",
    "CONTEXT (the manager's real workspace data):",
    JSON.stringify(context, null, 2),
    "",
    "Return a JSON object with exactly this shape, covering each competitor:",
    JSON.stringify(shape, null, 2),
  ].join("\n");
}

const KIND_FIELDS: Array<{
  field: keyof Omit<CompetitorAiDraft["competitors"][number], "id" | "name">;
  kind: CompetitorInsight["kind"];
}> = [
  { field: "strengths", kind: "strength" },
  { field: "weaknesses", kind: "weakness" },
  { field: "contentGaps", kind: "content gap" },
  { field: "whitespaceOpportunities", kind: "whitespace" },
];

export function competitorDraftToInsights(
  draft: CompetitorAiDraft,
  options: { competitors: Competitor[]; model: string },
): CompetitorInsight[] {
  const insights: CompetitorInsight[] = [];
  const generatedAt = new Date().toISOString();
  const rows = Array.isArray(draft.competitors) ? draft.competitors : [];

  rows.forEach((row, rowIndex) => {
    const matched =
      options.competitors.find((competitor) => competitor.id === row.id) ??
      options.competitors.find(
        (competitor) => competitor.name.toLowerCase() === row.name?.toLowerCase(),
      );

    if (!matched) {
      return;
    }

    KIND_FIELDS.forEach(({ field, kind }) => {
      const values = Array.isArray(row[field]) ? (row[field] as string[]) : [];

      values
        .map((value) => (typeof value === "string" ? value.trim() : ""))
        .filter(Boolean)
        .slice(0, 3)
        .forEach((insight, index) => {
          insights.push({
            id: `competitor-insight-${Date.now()}-${rowIndex}-${kind.replace(/\s+/g, "-")}-${index}`,
            competitorId: matched.id,
            competitorName: matched.name,
            kind,
            insight,
            status: "draft",
            model: options.model,
            generatedAt,
          });
        });
    });
  });

  return insights;
}

// Prompt building and output mapping for the live AI Strategy Brief (Stage 6).
// Pure helpers shared by the client (to build the context) and the server
// route (to build the prompt and shape the response). No network here.

import type { Platform, StrategyBrief } from "@/lib/social-calendar-data";

export type BriefAiContext = {
  brand: {
    name: string;
    industry: string;
    toneOfVoice: string;
    audience: string;
    offers: string;
    goals: string[];
    guidelines: string;
  };
  courses: Array<{
    name: string;
    category: string;
    usp: string;
    description: string;
    sellingPoints: string[];
    complianceNotes: string;
  }>;
  audiences: Array<{
    name: string;
    goals: string[];
    painPoints: string[];
    interests: string[];
    // The audience's preferred platforms, so the recommended platform mix and
    // per-platform strategy lean towards where this audience actually is.
    preferredChannels: string[];
  }>;
  auditGoal: {
    primaryObjective: string;
    conversionAction: string;
  };
  platformAnalytics: Array<{
    platform: string;
    followers: number;
    averageReach: number;
    engagementRate: number;
  }>;
  // Accepted competitor insights (Module A3), phrased "Name (kind): insight".
  acceptedCompetitorInsights: string[];
  // Accepted social listening findings (Module D3), phrased "topic: insight".
  // Internal research signals only; never marketing copy and no quotes.
  acceptedListeningInsights: string[];
  // Accepted Trend Radar cards (Module D1), so the brief reflects live trends.
  acceptedTrends: string[];
  platforms: Platform[];
};

// The JSON shape the model must return. Kept flat and simple so a wide range
// of models can produce it via response_format json_object.
export type BriefAiDraft = {
  marketingObjectives: string[];
  campaignIdeas: string[];
  contentPillars: string[];
  platformStrategy: Record<string, string>;
  platformMix: string;
  suggestedBudget: string;
  kpis: string[];
  recommendedTimeline: string;
  recommendedResources: string[];
  audiencePainPoints: string[];
  contentMixRecommendation: string;
  toneGuidance: string;
  keyAnglesToOwn: string[];
  monthlyCampaignGoal: string;
};

export function buildBriefSystemPrompt(): string {
  return [
    "You are a senior education marketing strategist for a private college.",
    "You produce a monthly strategy brief as a draft for a human Marketing Manager to review and approve. You never approve or publish anything yourself.",
    "Compliance is mandatory. Keep every claim factual and proof-based. Never promise or imply guaranteed employment, salary figures, visa or immigration outcomes, admission certainty, rankings, or guaranteed course outcomes. Prefer language about steps, support, eligibility, and evidence.",
    "Each audience lists preferredChannels. Base the platformMix and the per-platform platformStrategy on where the audiences actually are, leaning towards their preferred channels rather than treating every platform equally.",
    "Use British spelling. Do not use em dashes. Refer to teaching staff as teachers, never instructors.",
    "Return only a single JSON object that matches the requested shape. Do not include any commentary outside the JSON.",
  ].join(" ");
}

export function buildBriefUserPrompt(context: BriefAiContext): string {
  const shape = {
    marketingObjectives: ["string"],
    campaignIdeas: ["string"],
    contentPillars: ["string"],
    platformStrategy: Object.fromEntries(
      context.platforms.map((platform) => [platform, "string"]),
    ),
    platformMix: "string",
    suggestedBudget: "string",
    kpis: ["string"],
    recommendedTimeline: "string",
    recommendedResources: ["string"],
    audiencePainPoints: ["string"],
    contentMixRecommendation: "string",
    toneGuidance: "string",
    keyAnglesToOwn: ["string"],
    monthlyCampaignGoal: "string",
  };

  return [
    "Build a monthly marketing strategy brief for this college using the context below.",
    "",
    "CONTEXT (the manager's real workspace data):",
    JSON.stringify(context, null, 2),
    "",
    "REQUIRED OUTPUT: return a JSON object with exactly these keys and value types:",
    JSON.stringify(shape, null, 2),
    "",
    "Guidance:",
    "- marketingObjectives: measurable, objective-first goals tied to the audit goal.",
    "- campaignIdeas: specific campaigns the manager could choose to run.",
    "- contentPillars: repeatable content themes.",
    "- platformStrategy: one focused sentence per platform key provided.",
    "- platformMix: how effort should be split across platforms and why.",
    "- suggestedBudget: a direction and rough split, not a guarantee.",
    "- kpis: the metrics to track against the objectives.",
    "- recommendedTimeline: a sensible sequence across the month.",
    "- recommendedResources: the roles and assets needed, using teacher not instructor.",
    "Keep everything practical, factual, and compliant.",
  ].join("\n");
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => (typeof item === "string" ? item : String(item ?? "")))
    .filter((item) => item.trim().length > 0);
}

function asString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

// Merge a validated AI draft onto the current brief. Only fills fields the AI
// returned; leaves the rest as they were. approved is intentionally not set
// here, so the result stays an unapproved draft for the manager to approve.
export function briefDraftToPatch(
  draft: BriefAiDraft,
  currentPlatformStrategy: Record<Platform, string>,
  platforms: Platform[],
): Partial<StrategyBrief> {
  const platformStrategy = { ...currentPlatformStrategy };

  for (const platform of platforms) {
    const value = draft.platformStrategy?.[platform];

    if (typeof value === "string" && value.trim().length > 0) {
      platformStrategy[platform] = value;
    }
  }

  return {
    marketingObjectives: asStringArray(draft.marketingObjectives),
    campaignIdeas: asStringArray(draft.campaignIdeas),
    contentPillars: asStringArray(draft.contentPillars),
    platformStrategy,
    platformMix: asString(draft.platformMix),
    suggestedBudget: asString(draft.suggestedBudget),
    kpis: asStringArray(draft.kpis),
    recommendedTimeline: asString(draft.recommendedTimeline),
    recommendedResources: asStringArray(draft.recommendedResources),
    audiencePainPoints: asStringArray(draft.audiencePainPoints),
    contentMixRecommendation: asString(draft.contentMixRecommendation),
    toneGuidance: asString(draft.toneGuidance),
    keyAnglesToOwn: asStringArray(draft.keyAnglesToOwn),
    monthlyCampaignGoal: asString(draft.monthlyCampaignGoal),
  };
}

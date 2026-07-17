// Prompt building and output mapping for AI audit recommendations
// (Module A1, Objectives screen). Pure helpers, no network.

import { COMPLIANCE_PROMPT_RULE } from "@/lib/compliance-ai";
import type {
  AuditInsight,
  AuditOverviewInsight,
  Platform,
} from "@/lib/social-calendar-data";

export type AuditAiContext = {
  platform: Platform;
  metrics: {
    followers: number;
    averageReach: number;
    engagementRate: number;
    postingFrequency: string;
    scores: Record<string, number>;
    // Free-text audit notes. Metricool syncs and PDF imports write their
    // tagged real numbers here, so synced data reaches the model verbatim.
    notes: string;
  };
  smartGoal: {
    primaryObjective: string;
    conversionAction: string;
    funnelStage: string;
    isPriorityPlatform: boolean;
    monthlyTargets: Record<string, number>;
  };
  courses: Array<{ name: string; category: string }>;
  audiences: Array<{ name: string; painPoints: string[] }>;
};

export type AuditAiDraft = {
  recommendation: string;
  confidenceLevel: "high" | "medium" | "low";
  confidenceReason: string;
  nextActions: string[];
  limitedData: boolean;
};

export function buildAuditSystemPrompt(): string {
  return [
    "You are a senior education marketing analyst for a private college.",
    "You produce one platform recommendation as a draft for a human Marketing Manager to accept or dismiss. You never act on it yourself.",
    "Ground every claim in the numbers provided in the context. Quote only figures that appear there; never invent metrics. If the platform's metrics are zeros or missing, set limitedData to true and begin the recommendation with 'Based on limited data'.",
    COMPLIANCE_PROMPT_RULE,
    "Use British spelling. Do not use em dashes. Refer to teaching staff as teachers, never instructors.",
    "Return only a single JSON object matching the requested shape.",
  ].join(" ");
}

export function buildAuditUserPrompt(context: AuditAiContext): string {
  const shape = {
    recommendation: "string, 2 to 4 sentences grounded in the metrics",
    confidenceLevel: "high | medium | low",
    confidenceReason: "string, one line explaining the confidence level",
    nextActions: ["string, 2 or 3 concrete actions"],
    limitedData: "boolean, true when metrics are largely missing",
  };

  return [
    `Assess the ${context.platform} presence and recommend what to do next.`,
    "",
    "CONTEXT (the manager's real workspace data):",
    JSON.stringify(context, null, 2),
    "",
    "Return a JSON object with exactly this shape:",
    JSON.stringify(shape, null, 2),
  ].join("\n");
}

export function auditDraftToInsight(
  draft: AuditAiDraft,
  options: { platform: Platform; model: string; inputSummary: string },
): AuditInsight {
  return {
    id: `audit-insight-${options.platform.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${Date.now()}`,
    platform: options.platform,
    recommendation: draft.recommendation?.trim() || "",
    confidenceLevel: ["high", "medium", "low"].includes(draft.confidenceLevel)
      ? draft.confidenceLevel
      : "low",
    confidenceReason: draft.confidenceReason?.trim() || "",
    nextActions: Array.isArray(draft.nextActions)
      ? draft.nextActions
          .map((action) => (typeof action === "string" ? action.trim() : ""))
          .filter(Boolean)
          .slice(0, 3)
      : [],
    limitedData: Boolean(draft.limitedData),
    status: "draft",
    model: options.model,
    generatedAt: new Date().toISOString(),
    inputSummary: options.inputSummary,
  };
}

// Replace any previous insight for the same platform: one live insight per
// platform keeps the screen and the Dashboard unambiguous.
export function upsertAuditInsight(
  insights: AuditInsight[],
  next: AuditInsight,
): AuditInsight[] {
  return [next, ...insights.filter((insight) => insight.platform !== next.platform)];
}

// Context for the whole-audit synthesis: every platform together, so the
// model reasons about the account as one connected presence rather than
// producing a single-platform view. Used by the "Audit Output" card.
export type WholeAuditAiContext = {
  platforms: Array<{
    platform: Platform;
    followers: number;
    averageReach: number;
    engagementRate: number;
    postingFrequency: string;
    scores: Record<string, number>;
    notes: string;
    isPriorityPlatform: boolean;
  }>;
  smartGoal: {
    primaryObjective: string;
    conversionAction: string;
    funnelStage: string;
    monthlyTargets: Record<string, number>;
  };
  courses: Array<{ name: string; category: string }>;
  audiences: Array<{ name: string; painPoints: string[] }>;
};

export type WholeAuditAiDraft = {
  overallSummary: string;
  topStrengths: string[];
  topWeaknesses: string[];
  nextActions: string[];
  confidenceLevel: "high" | "medium" | "low";
  confidenceReason: string;
  limitedData: boolean;
};

export function buildWholeAuditSystemPrompt(): string {
  return [
    "You are a senior education marketing analyst for a private college.",
    "You produce ONE overall assessment of the whole social media presence, synthesising every platform together as one connected account, not a single platform's view. You are a draft for a human Marketing Manager to accept or dismiss. You never act on it yourself.",
    "Ground every claim in the numbers provided in the context. Quote only figures that appear there; never invent metrics. If most platforms have zero or missing metrics, set limitedData to true and begin the summary with 'Based on limited data'.",
    COMPLIANCE_PROMPT_RULE,
    "Use British spelling. Do not use em dashes. Refer to teaching staff as teachers, never instructors.",
    "Return only a single JSON object matching the requested shape.",
  ].join(" ");
}

export function buildWholeAuditUserPrompt(context: WholeAuditAiContext): string {
  const shape = {
    overallSummary:
      "string, 3 to 5 sentences assessing the whole audit across all platforms together",
    topStrengths: ["string, 2 or 3 strengths that hold across the whole presence"],
    topWeaknesses: ["string, 2 or 3 weaknesses that hold across the whole presence"],
    nextActions: ["string, 3 to 5 concrete cross-platform actions, in priority order"],
    confidenceLevel: "high | medium | low",
    confidenceReason: "string, one line explaining the confidence level",
    limitedData: "boolean, true when metrics are largely missing across platforms",
  };

  return [
    "Assess the WHOLE social audit below as one connected presence across every platform listed.",
    "Do not focus on any single platform in isolation; synthesise across all of them into one overall analysis.",
    "",
    "CONTEXT (the manager's real workspace data, one entry per platform):",
    JSON.stringify(context, null, 2),
    "",
    "Return a JSON object with exactly this shape:",
    JSON.stringify(shape, null, 2),
  ].join("\n");
}

export function wholeAuditDraftToInsight(
  draft: WholeAuditAiDraft,
  options: { model: string; inputSummary: string; platformsCovered: Platform[] },
): AuditOverviewInsight {
  return {
    id: `audit-overview-${Date.now()}`,
    recommendation: draft.overallSummary?.trim() || "",
    topStrengths: Array.isArray(draft.topStrengths)
      ? draft.topStrengths.map((item) => (typeof item === "string" ? item.trim() : "")).filter(Boolean)
      : [],
    topWeaknesses: Array.isArray(draft.topWeaknesses)
      ? draft.topWeaknesses.map((item) => (typeof item === "string" ? item.trim() : "")).filter(Boolean)
      : [],
    nextActions: Array.isArray(draft.nextActions)
      ? draft.nextActions
          .map((action) => (typeof action === "string" ? action.trim() : ""))
          .filter(Boolean)
          .slice(0, 5)
      : [],
    confidenceLevel: ["high", "medium", "low"].includes(draft.confidenceLevel)
      ? draft.confidenceLevel
      : "low",
    confidenceReason: draft.confidenceReason?.trim() || "",
    limitedData: Boolean(draft.limitedData),
    status: "draft",
    model: options.model,
    generatedAt: new Date().toISOString(),
    inputSummary: options.inputSummary,
    platformsCovered: options.platformsCovered,
  };
}

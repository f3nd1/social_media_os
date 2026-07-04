// Prompt building and output mapping for AI audit recommendations
// (Module A1, Objectives screen). Pure helpers, no network.

import type { AuditInsight, Platform } from "@/lib/social-calendar-data";

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
    northStarMetric: string;
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
    "Compliance is mandatory. Keep claims factual and proof-based. Never promise or imply guaranteed employment, salary figures, visa outcomes, admission certainty, rankings, or guaranteed course outcomes.",
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

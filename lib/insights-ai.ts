// Prompt building for the Budget review (Module C2) and KPI insights
// (Module C3), plus mapping into the shared AiRecommendation store.
// Pure helpers, no network.

import type {
  AiRecommendation,
  MarketingWorkspaceData,
} from "@/lib/social-calendar-data";

export type InsightsAiContext = {
  module: "budget" | "kpi";
  campaigns: Array<{
    name: string;
    objective: string;
    budget: number;
    spend: number;
    kpiTarget: Record<string, number>;
    actualResults: Record<string, number>;
    status: string;
  }>;
  budgetLines: Array<{
    campaignName: string;
    adBudget: number;
    printingCost: number;
    eventCost: number;
    agentCost: number;
    totalCost: number;
  }>;
  kpiRecords: Array<{
    campaignName: string;
    channel: string;
    leads: number;
    applications: number;
    enrolments: number;
    spend: number;
    costPerLead: number;
    status: string;
  }>;
  platformAnalytics: Array<{
    platform: string;
    followers: number;
    averageReach: number;
    engagementRate: number;
    notes: string;
  }>;
  performanceSummary: {
    postsWithResults: number;
    totalImpressions: number;
    totalEngagement: number;
    totalClicks: number;
  };
};

export type InsightsAiDraft = {
  insights: Array<{
    subject: string;
    insight: string;
    recommendation: string;
    dataUsed: string;
  }>;
};

export function buildInsightsSystemPrompt(module: "budget" | "kpi"): string {
  const focus =
    module === "budget"
      ? "You review campaign budgets against plan, spend, and results, and suggest reallocations with reasons. Suggestions are annotations for a human Marketing Manager; you never change any numbers."
      : "You review plan versus actual performance, cost per lead, platform analytics, and performance records, and recommend actions such as increasing frequency, improving hooks, or pausing underperformers. Every recommendation is a draft for a human Marketing Manager.";

  return [
    "You are a senior marketing analyst for a private college in Singapore.",
    focus,
    "Ground every insight in the numbers provided and name them in dataUsed so the manager can verify each claim; never invent figures. If the data is too thin for a conclusion, say so in the insight rather than guessing.",
    "Compliance is mandatory. Keep claims factual. Never promise or imply guaranteed employment, salary figures, visa outcomes, admission certainty, rankings, or guaranteed course outcomes.",
    "Use British spelling. Do not use em dashes. Refer to teaching staff as teachers, never instructors.",
    "Return only a single JSON object matching the requested shape.",
  ].join(" ");
}

export function buildInsightsUserPrompt(context: InsightsAiContext): string {
  const shape = {
    insights: [
      {
        subject: "string, the campaign, platform, or budget line concerned",
        insight: "string, what the numbers show",
        recommendation: "string, the suggested action, phrased as a suggestion",
        dataUsed: "string, the exact figures from context this rests on",
      },
    ],
  };

  return [
    context.module === "budget"
      ? "Review the budgets below and propose reallocation suggestions (3 to 6)."
      : "Review the performance data below and propose insights and recommendations (3 to 6), covering both campaigns and platforms.",
    "",
    "CONTEXT (the manager's real workspace data):",
    JSON.stringify(context, null, 2),
    "",
    "Return a JSON object with exactly this shape:",
    JSON.stringify(shape, null, 2),
  ].join("\n");
}

export function buildInsightsContext(
  module: "budget" | "kpi",
  data: MarketingWorkspaceData,
): InsightsAiContext {
  return {
    module,
    campaigns: data.ucc.campaigns.map((campaign) => ({
      name: campaign.name,
      objective: campaign.objective,
      budget: campaign.budget,
      spend: campaign.actualResults.spend,
      kpiTarget: campaign.kpiTarget as unknown as Record<string, number>,
      actualResults: campaign.actualResults as unknown as Record<string, number>,
      status: campaign.status,
    })),
    budgetLines: data.ucc.budgetPlans.map((plan) => ({
      campaignName:
        data.ucc.campaigns.find((campaign) => campaign.id === plan.campaignId)?.name ??
        "Unassigned",
      adBudget: plan.adBudget,
      printingCost: plan.printingCost,
      eventCost: plan.eventCost,
      agentCost: plan.agentCost,
      totalCost: plan.totalCost,
    })),
    kpiRecords: data.ucc.kpiRecords.map((record) => ({
      campaignName:
        data.ucc.campaigns.find((campaign) => campaign.id === record.campaignId)?.name ??
        "Unassigned",
      channel: record.channel,
      leads: record.leads,
      applications: record.applications,
      enrolments: record.enrolments,
      spend: record.spend,
      costPerLead: record.leads > 0 ? Math.round(record.spend / record.leads) : 0,
      status: record.status,
    })),
    platformAnalytics: data.audits.map((audit) => ({
      platform: audit.platform,
      followers: audit.followers,
      averageReach: audit.averageReach,
      engagementRate: audit.engagementRate,
      notes: audit.notes.slice(0, 500),
    })),
    performanceSummary: {
      postsWithResults: data.performanceResults.length,
      totalImpressions: data.performanceResults.reduce(
        (sum, row) => sum + row.impressions,
        0,
      ),
      totalEngagement: data.performanceResults.reduce(
        (sum, row) => sum + row.engagement,
        0,
      ),
      totalClicks: data.performanceResults.reduce((sum, row) => sum + row.clicks, 0),
    },
  };
}

export function insightsDraftToRecommendations(
  draft: InsightsAiDraft,
  module: "budget" | "kpi",
  model: string,
): AiRecommendation[] {
  const rows = Array.isArray(draft.insights) ? draft.insights : [];
  const generatedAt = new Date().toISOString();

  return rows
    .filter((row) => row.insight?.trim() || row.recommendation?.trim())
    .map((row, index) => ({
      id: `${module}-rec-${Date.now()}-${index}`,
      module,
      subject: row.subject?.trim() || "General",
      insight: row.insight?.trim() || "",
      recommendation: row.recommendation?.trim() || "",
      dataUsed: row.dataUsed?.trim() || "Not stated by the model",
      status: "draft" as const,
      model,
      generatedAt,
    }));
}

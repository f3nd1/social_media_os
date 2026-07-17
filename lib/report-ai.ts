// Prompt building for the AI weekly narrative (Module C4).
// Pure helpers, no network.

import { COMPLIANCE_PROMPT_RULE } from "@/lib/compliance-ai";
import type { MarketingWorkspaceData } from "@/lib/social-calendar-data";

export type ReportAiContext = {
  weekOfIso: string;
  posted: number;
  delayed: number;
  totalLeads: number;
  totalApplications: number;
  budgetPlanned: number;
  budgetSpent: number;
  kpiStatuses: Array<{ campaignName: string; channel: string; status: string; leads: number }>;
  acceptedInsights: string[];
  approvalsPending: number;
};

export type ReportAiDraft = {
  narrative: string;
};

export function buildReportSystemPrompt(): string {
  return [
    "You write the weekly management summary for a private college's marketing team in Singapore.",
    "Plain English for a non-technical owner. Four short sections with these exact headings: What happened, What worked, Risks, Next actions.",
    "Ground every statement in the numbers provided; never invent figures. If a section has nothing supported by the data, say so honestly.",
    "This is a draft for the Marketing Manager to edit and approve; do not present it as final.",
    COMPLIANCE_PROMPT_RULE,
    "Use British spelling. Do not use em dashes. Refer to teaching staff as teachers, never instructors.",
    'Return only a JSON object of the shape { "narrative": "string with the four sections separated by blank lines" }.',
  ].join(" ");
}

export function buildReportUserPrompt(context: ReportAiContext): string {
  return [
    `Write the weekly management narrative for the week of ${context.weekOfIso}.`,
    "",
    "THIS WEEK'S REAL WORKSPACE NUMBERS:",
    JSON.stringify(context, null, 2),
  ].join("\n");
}

export function buildReportContext(data: MarketingWorkspaceData): ReportAiContext {
  return {
    weekOfIso: new Date().toISOString().slice(0, 10),
    posted: data.calendar.filter(
      (item) => item.status === "posted" || item.approvalStage === "published",
    ).length,
    delayed: data.calendar.filter(
      (item) =>
        ["drafting", "review", "revision"].includes(item.status) ||
        item.approvalStage === "revision",
    ).length,
    totalLeads: data.ucc.kpiRecords.reduce((sum, row) => sum + row.leads, 0),
    totalApplications: data.ucc.kpiRecords.reduce(
      (sum, row) => sum + row.applications,
      0,
    ),
    budgetPlanned: data.ucc.budgetPlans.reduce((sum, row) => sum + row.totalCost, 0),
    budgetSpent: data.ucc.campaigns.reduce(
      (sum, row) => sum + row.actualResults.spend,
      0,
    ),
    kpiStatuses: data.ucc.kpiRecords.map((record) => ({
      campaignName:
        data.ucc.campaigns.find((campaign) => campaign.id === record.campaignId)?.name ??
        "Unassigned",
      channel: record.channel,
      status: record.status,
      leads: record.leads,
    })),
    acceptedInsights: [
      ...data.auditInsights
        .filter((insight) => insight.status === "accepted")
        .map((insight) => `${insight.platform}: ${insight.recommendation}`),
      ...data.aiRecommendations
        .filter((rec) => rec.status === "accepted")
        .map((rec) => `${rec.subject}: ${rec.recommendation}`),
    ],
    approvalsPending:
      data.auditInsights.filter((insight) => insight.status === "draft").length +
      data.aiRecommendations.filter((rec) => rec.status === "draft").length +
      data.campaignSuggestions.length +
      data.competitorInsights.filter((insight) => insight.status === "draft").length,
  };
}

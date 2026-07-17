// Unifies everything the app already records about AI generations into one
// list for the AI Generation Log (System tab). Pure derivation, no new storage
// of generation events: every entry is read from an existing workspace array
// (the rich, status-bearing AI outputs) or from the aiUsage call ledger for the
// generation-only modules that do not leave a discrete tracked output.
//
// No fabricated data: status is the real live status where an output array
// tracks it; for the generation-only events it is shown as "Draft" at
// generation, with the human decision living in the Approvals Log.

import type {
  AiIntegrationSettings,
  MarketingWorkspaceData,
  TrendSource,
} from "@/lib/social-calendar-data";

export type AiLogGrounding =
  | { kind: "sources"; sources: TrendSource[] }
  | { kind: "inputs"; inputs: string[] };

export type AiLogEntry = {
  // Stable, unique id (source array item id, prefixed by source) so the
  // "flag as inaccurate" store can reference an entry across reloads.
  id: string;
  at: string;
  module: string;
  model: string;
  modelTier: "analysis" | "utility" | "unknown";
  summary: string;
  status: string;
  grounding: AiLogGrounding;
  // True when grounding is external cited sources (research outputs), false
  // when the output was synthesised from workspace data only.
  sourceCited: boolean;
  // True for generation-only events whose approve/reject decision is not on the
  // entry itself but in the Approvals Log.
  decisionInApprovalsLog: boolean;
};

// aiUsage module labels that a richer, status-bearing array already represents,
// so they are NOT also pulled from the usage ledger (avoids double counting).
// Everything else in aiUsage is shown as a generation-only event, so a new or
// unknown module still appears rather than being silently hidden.
const ARRAY_COVERED_USAGE_MODULES = new Set<string>([
  "Social listening",
  "Trend Radar search",
  "Trend Radar synthesis",
  "Budget review",
  "KPI insights",
  "Weekly report",
  "Objectives audit",
  "Objectives audit overview",
  "Competitor observe (search)",
  "Competitor observe (synthesis)",
  "Competitor analysis",
  "Production copy",
]);

// Plain-English description of the real workspace inputs each generation-only
// module feeds its prompt, so the log shows what the output was reasoned from.
const GENERATION_INPUT_HINTS: Record<string, string> = {
  "Content Calendar": "Approved brief, campaigns, courses, audiences, and accepted trends",
  "Calendar item regenerate": "The existing item plus the approved brief and workspace data",
  "Strategy Brief": "Brand profile, courses, audiences, competitors, listening, and accepted trends",
  "Compliance review": "The copy under review, uploaded guideline documents, and course compliance notes",
  "Compliance calendar review": "Unapproved calendar captions, guideline documents, and course compliance notes",
  "Metricool PDF import": "The uploaded Metricool PDF report",
  "Platform playbook": "The platform's audit numbers, audiences, and accepted research signals",
  "Content Remix": "An approved calendar item and the target platforms",
  "Campaign suggestions": "The approved brief, courses, audiences, and accepted research",
};

function modelTier(
  model: string,
  ai: AiIntegrationSettings | undefined,
): AiLogEntry["modelTier"] {
  if (ai && model && model === ai.analysisModel) {
    return "analysis";
  }
  if (ai && model && model === ai.utilityModel) {
    return "utility";
  }
  return "unknown";
}

function titleCase(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function truncate(value: string, max = 160): string {
  const clean = value.replace(/\s+/g, " ").trim();
  return clean.length > max ? `${clean.slice(0, max - 1)}…` : clean;
}

function quotesToSources(
  quotes: Array<{ text: string; source: string; url: string }>,
): TrendSource[] {
  return quotes
    .filter((quote) => quote.url)
    .map((quote) => ({ title: quote.source || quote.url, url: quote.url }));
}

export function buildAiGenerationLog(workspace: MarketingWorkspaceData): AiLogEntry[] {
  const ai = workspace.aiIntegration;
  const entries: AiLogEntry[] = [];
  const inputs = (list: string[]): AiLogGrounding => ({ kind: "inputs", inputs: list });
  const sources = (list: TrendSource[]): AiLogGrounding => ({ kind: "sources", sources: list });

  // Trend Radar: real web-search citations.
  for (const trend of workspace.trendInsights ?? []) {
    entries.push({
      id: `trend:${trend.id}`,
      at: trend.generatedAt,
      module: "Trend Radar",
      model: trend.model,
      modelTier: modelTier(trend.model, ai),
      summary: truncate(trend.title),
      status: titleCase(trend.status),
      grounding: sources(trend.sources ?? []),
      sourceCited: (trend.sources ?? []).length > 0,
      decisionInApprovalsLog: false,
    });
  }

  // Social Listening: quote source URLs.
  for (const result of workspace.listeningResults ?? []) {
    const src = quotesToSources(result.quotes ?? []);
    entries.push({
      id: `listening:${result.id}`,
      at: result.generatedAt,
      module: "Social Listening",
      model: result.model,
      modelTier: modelTier(result.model, ai),
      summary: truncate(`${result.topic} (${result.analysisType}): ${result.insight}`),
      status: titleCase(result.status ?? "new"),
      grounding: src.length > 0 ? sources(src) : inputs([result.sourcesCovered || "Public discussion sources"]),
      sourceCited: src.length > 0,
      decisionInApprovalsLog: false,
    });
  }

  // Competitor observation: cited public sources (persisted in C1).
  for (const competitor of workspace.competitors ?? []) {
    if (!competitor.observedAt) {
      continue;
    }
    const src = competitor.observationSources ?? [];
    entries.push({
      id: `competitor-observe:${competitor.id}`,
      at: competitor.observedAt,
      module: "Competitor observation",
      model: competitor.observedModel ?? "unknown",
      modelTier: modelTier(competitor.observedModel ?? "", ai),
      summary: truncate(`Observed ${competitor.name || "a competitor"} from its public profile`),
      status: "Applied",
      grounding: src.length > 0 ? sources(src) : inputs(["No public source cited"]),
      sourceCited: src.length > 0,
      decisionInApprovalsLog: false,
    });
  }

  // Competitor analysis insights.
  for (const insight of workspace.competitorInsights ?? []) {
    entries.push({
      id: `competitor-insight:${insight.id}`,
      at: insight.generatedAt,
      module: "Competitor analysis",
      model: insight.model,
      modelTier: modelTier(insight.model, ai),
      summary: truncate(`${insight.competitorName} (${insight.kind}): ${insight.insight}`),
      status: titleCase(insight.status),
      grounding: inputs(["Competitor records and the college's own positioning"]),
      sourceCited: false,
      decisionInApprovalsLog: false,
    });
  }

  // Platform audit insights + the whole-audit overview.
  for (const insight of workspace.auditInsights ?? []) {
    entries.push({
      id: `audit-insight:${insight.id}`,
      at: insight.generatedAt,
      module: "Platform Audit",
      model: insight.model,
      modelTier: modelTier(insight.model, ai),
      summary: truncate(`${insight.platform}: ${insight.recommendation}`),
      status: titleCase(insight.status),
      grounding: inputs([insight.inputSummary || "Platform audit numbers"]),
      sourceCited: false,
      decisionInApprovalsLog: false,
    });
  }
  const overview = workspace.auditOverviewInsight;
  if (overview) {
    entries.push({
      id: `audit-overview:${overview.id}`,
      at: overview.generatedAt,
      module: "Platform Audit",
      model: overview.model,
      modelTier: modelTier(overview.model, ai),
      summary: truncate(`Audit overview: ${overview.recommendation}`),
      status: titleCase(overview.status),
      grounding: inputs([overview.inputSummary || "All platform audit numbers"]),
      sourceCited: false,
      decisionInApprovalsLog: false,
    });
  }

  // Budget and KPI recommendations.
  for (const rec of workspace.aiRecommendations ?? []) {
    entries.push({
      id: `recommendation:${rec.id}`,
      at: rec.generatedAt,
      module: rec.module === "budget" ? "Budget review" : "KPI insights",
      model: rec.model,
      modelTier: modelTier(rec.model, ai),
      summary: truncate(`${rec.subject}: ${rec.recommendation}`),
      status: titleCase(rec.status),
      grounding: inputs([rec.dataUsed || "Workspace budget and KPI numbers"]),
      sourceCited: false,
      decisionInApprovalsLog: false,
    });
  }

  // Weekly narrative report.
  const weekly = workspace.weeklyReport;
  if (weekly && weekly.generatedAt) {
    entries.push({
      id: "weekly-report",
      at: weekly.generatedAt,
      module: "Weekly report",
      model: weekly.model,
      modelTier: modelTier(weekly.model, ai),
      summary: truncate(weekly.content || "Weekly narrative report"),
      status: titleCase(weekly.status),
      grounding: inputs(["Workspace performance, campaigns, and KPI data"]),
      sourceCited: false,
      decisionInApprovalsLog: false,
    });
  }

  // Copywriting saved-output history (real status: draft/in review/approved/rejected).
  for (const aiModule of workspace.ucc?.aiModules ?? []) {
    for (const record of aiModule.outputHistory ?? []) {
      entries.push({
        id: `output:${aiModule.id}:${record.id}`,
        at: record.generatedAt,
        module: "Copywriting",
        model: "",
        modelTier: "unknown",
        summary: truncate(record.outputSummary || record.title),
        status: titleCase(record.status),
        grounding: inputs(["Approved brief, platform playbook, and the calendar item"]),
        sourceCited: false,
        decisionInApprovalsLog: false,
      });
    }
  }

  // Generation-only events from the usage ledger (Calendar, Brief, Compliance,
  // Metricool import, Playbook, Remix, Campaign ideas, plus any future module).
  for (const usage of workspace.aiUsage ?? []) {
    if (ARRAY_COVERED_USAGE_MODULES.has(usage.module)) {
      continue;
    }
    entries.push({
      id: `usage:${usage.id}`,
      at: usage.date,
      module: usage.module,
      model: usage.model,
      modelTier: modelTier(usage.model, ai),
      summary: truncate(`${usage.module} generation`),
      status: "Draft",
      grounding: inputs([
        GENERATION_INPUT_HINTS[usage.module] ?? "Workspace data provided to the model",
      ]),
      sourceCited: false,
      decisionInApprovalsLog: true,
    });
  }

  return entries.sort((a, b) => (a.at < b.at ? 1 : a.at > b.at ? -1 : 0));
}

// The distinct module labels present in a log, for the filter dropdown.
export function aiLogModules(entries: AiLogEntry[]): string[] {
  return Array.from(new Set(entries.map((entry) => entry.module))).sort((a, b) =>
    a.localeCompare(b),
  );
}

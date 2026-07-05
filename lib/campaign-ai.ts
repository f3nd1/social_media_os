// Prompt building and output mapping for AI campaign suggestions (Module A2).
// Pure helpers, no network.

import {
  type CampaignSuggestion,
  type UccAudience,
  type UccCampaign,
  type UccCourse,
  type UccMarketingChannel,
} from "@/lib/social-calendar-data";
import type { SgMarketingMoment } from "@/lib/sg-marketing-moments";

export type CampaignAiContext = {
  todayIso: string;
  brief: {
    monthlyCampaignGoal: string;
    marketingObjectives: string[];
    contentPillars: string[];
    platformMix: string;
    keyAnglesToOwn: string[];
  };
  acceptedAuditInsights: string[];
  acceptedCompetitorInsights: string[];
  // Accepted social listening findings (Module D3), phrased "topic: insight".
  // Internal research signals only; never marketing copy and no quotes.
  acceptedListeningInsights: string[];
  courses: Array<{
    name: string;
    category: string;
    usp: string;
    complianceNotes: string;
  }>;
  audiences: Array<{
    name: string;
    goals: string[];
    painPoints: string[];
    // The audience's preferred platforms, so each proposal's platform mix leans
    // towards where that audience actually is.
    preferredChannels: string[];
  }>;
  existingCampaignNames: string[];
  sgMoments: Array<{ name: string; window: string; relevance: string }>;
  // Trend Radar cards the manager accepted (Module D1). Optional so older
  // callers keep working. Included automatically because the whole context
  // is serialised into the prompt.
  acceptedTrends?: string[];
};

export type CampaignAiSuggestionDraft = {
  name: string;
  objective: string;
  audience: string;
  courses: string[];
  platformMix: string[];
  timeline: string;
  alignedMoments: string[];
  budgetSplit: string;
  kpis: string[];
  startDate: string;
  endDate: string;
};

export function buildCampaignSystemPrompt(): string {
  return [
    "You are a senior education marketing planner for a private college in Singapore.",
    "You propose campaign drafts for a human Marketing Manager to accept or dismiss. You never launch or approve anything yourself. Leave campaign owners unassigned.",
    "Time every proposal against the Singapore marketing moments provided (intakes, results season, festivals, fairs, 11.11 and 12.12), naming the moments used.",
    "Compliance is mandatory. Keep claims factual and proof-based. Never promise or imply guaranteed employment, salary figures, visa outcomes, admission certainty, rankings, or guaranteed course outcomes. Use conditional language for pathways.",
    "Each course in the context may carry its own complianceNotes. Respect a course's complianceNotes as binding constraints for any proposal that features that course.",
    "Each audience lists preferredChannels. Weight each proposal's platform mix towards the preferred channels of the audience it targets, rather than spreading evenly.",
    "Use British spelling. Do not use em dashes. Refer to teaching staff as teachers, never instructors.",
    "Return only a single JSON object matching the requested shape.",
  ].join(" ");
}

export function buildCampaignUserPrompt(context: CampaignAiContext): string {
  const shape = {
    suggestions: [
      {
        name: "string, distinct from the existing campaign names",
        objective: "string, measurable and tied to the brief",
        audience: "string, one of the audience names in context",
        courses: ["string, course names from context"],
        platformMix: ["string, platforms or channels"],
        timeline: "string, when and why, naming the Singapore moments used",
        alignedMoments: ["string, moment names from context"],
        budgetSplit: "string, an indicative split, not a guarantee",
        kpis: ["string, 2 to 4 measurable indicators"],
        startDate: "string, YYYY-MM-DD after today",
        endDate: "string, YYYY-MM-DD after startDate",
      },
    ],
  };

  return [
    `Today is ${context.todayIso}. Propose 3 to 5 campaign drafts for the next six months.`,
    "",
    "CONTEXT (approved brief and the manager's real workspace data):",
    JSON.stringify(context, null, 2),
    "",
    "Return a JSON object with exactly this shape:",
    JSON.stringify(shape, null, 2),
  ].join("\n");
}

export function formatMomentsForPrompt(moments: SgMarketingMoment[]) {
  const monthName = (month: number) =>
    [
      "January",
      "February",
      "March",
      "April",
      "May",
      "June",
      "July",
      "August",
      "September",
      "October",
      "November",
      "December",
    ][month - 1];

  return moments.map((moment) => ({
    name: moment.name,
    window: `${monthName(moment.startMonth)} to ${monthName(moment.endMonth)}`,
    relevance: moment.relevance,
  }));
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => (typeof item === "string" ? item.trim() : ""))
    .filter(Boolean);
}

export function suggestionDraftsToSuggestions(
  drafts: CampaignAiSuggestionDraft[],
  model: string,
): CampaignSuggestion[] {
  return drafts
    .filter((draft) => draft.name?.trim())
    .map((draft, index) => ({
      id: `campaign-suggestion-${Date.now()}-${index}`,
      name: draft.name.trim(),
      objective: draft.objective?.trim() || "",
      audienceName: draft.audience?.trim() || "",
      courseNames: asStringArray(draft.courses),
      platformMix: asStringArray(draft.platformMix),
      timeline: draft.timeline?.trim() || "",
      alignedMoments: asStringArray(draft.alignedMoments),
      budgetSplit: draft.budgetSplit?.trim() || "",
      kpis: asStringArray(draft.kpis),
      startDate: draft.startDate?.trim() || "",
      endDate: draft.endDate?.trim() || "",
      model,
      generatedAt: new Date().toISOString(),
    }));
}

// Convert an accepted suggestion into a draft campaign. Ids are matched by
// name where possible; anything unmatched falls back to the first record so
// the campaign is always openable and editable.
export function suggestionToCampaign(
  suggestion: CampaignSuggestion,
  options: {
    courses: UccCourse[];
    audiences: UccAudience[];
    validChannels: UccMarketingChannel[];
    defaultFunnelStage: UccCampaign["funnelStage"];
  },
): UccCampaign {
  const matchedCourse =
    options.courses.find((course) =>
      suggestion.courseNames.some(
        (name) => name.toLowerCase() === course.name.toLowerCase(),
      ),
    ) ?? options.courses[0];
  const matchedAudience =
    options.audiences.find(
      (audience) =>
        audience.name.toLowerCase() === suggestion.audienceName.toLowerCase(),
    ) ?? options.audiences[0];
  const platformMix = suggestion.platformMix
    .map((platform) =>
      options.validChannels.find(
        (channel) => channel.toLowerCase() === platform.toLowerCase(),
      ),
    )
    .filter((channel): channel is UccMarketingChannel => Boolean(channel));

  return {
    id: `campaign-ai-${Date.now()}`,
    name: suggestion.name,
    objective: suggestion.objective,
    courseId: matchedCourse?.id ?? "",
    audienceId: matchedAudience?.id ?? "",
    funnelStage: options.defaultFunnelStage,
    platformMix: platformMix.length > 0 ? platformMix : options.validChannels.slice(0, 2),
    startDate: suggestion.startDate,
    endDate: suggestion.endDate,
    owner: "marketing manager",
    budget: 0,
    status: "planning",
    kpiTarget: { reach: 0, leads: 0, applications: 0, enrolments: 0, costPerLead: 0 },
    actualResults: { reach: 0, leads: 0, applications: 0, enrolments: 0, spend: 0 },
    approvalStatus: "draft",
    aiNotes: [
      suggestion.timeline ? `Timeline: ${suggestion.timeline}` : "",
      suggestion.alignedMoments.length > 0
        ? `Aligned moments: ${suggestion.alignedMoments.join(", ")}`
        : "",
      suggestion.budgetSplit ? `Indicative budget split: ${suggestion.budgetSplit}` : "",
      suggestion.kpis.length > 0 ? `Suggested KPIs: ${suggestion.kpis.join("; ")}` : "",
      `Proposed by AI (${suggestion.model}) on ${suggestion.generatedAt.slice(0, 10)}. Owner left blank for the manager to assign.`,
    ]
      .filter(Boolean)
      .join("\n"),
  };
}

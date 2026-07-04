// The approvals log (Module E3). Every approval or rejection anywhere in
// the workspace is detected here, centrally, by comparing the workspace
// before and after an update. That way no decision path can forget to
// write the audit trail. Pure helpers, no network.

import type {
  ApprovalLogEntry,
  MarketingWorkspaceData,
} from "@/lib/social-calendar-data";

const LOG_CAP = 1000;

type StatusRow = { id: string; status: string };

function statusTransitions(
  previous: StatusRow[],
  next: StatusRow[],
  acceptedStatus: string,
  rejectedStatus: string,
): Array<{ id: string; decision: "approved" | "rejected" }> {
  const before = new Map(previous.map((row) => [row.id, row.status]));

  return next.flatMap((row): Array<{ id: string; decision: "approved" | "rejected" }> => {
    const was = before.get(row.id);

    if (was === row.status) {
      return [];
    }

    if (row.status === acceptedStatus) {
      return [{ id: row.id, decision: "approved" as const }];
    }

    // Only log a rejection when something previously visible was turned
    // down, not when a fresh draft arrives already dismissed.
    if (row.status === rejectedStatus && was !== undefined) {
      return [{ id: row.id, decision: "rejected" as const }];
    }

    return [];
  });
}

export function deriveApprovalLogEntries(
  previous: MarketingWorkspaceData,
  next: MarketingWorkspaceData,
  decidedAt: string,
): ApprovalLogEntry[] {
  const decidedBy = next.approverName.trim() || "Not named";
  const entries: Array<Omit<ApprovalLogEntry, "id" | "decidedBy" | "decidedAt">> = [];

  // Strategy brief.
  if (!previous.brief.approved && next.brief.approved) {
    entries.push({
      module: "Strategy Brief",
      subject: "Strategic narrative brief",
      decision: "approved",
    });
  }

  // Weekly report.
  if (
    previous.weeklyReport?.status !== "approved" &&
    next.weeklyReport?.status === "approved"
  ) {
    entries.push({
      module: "Reports",
      subject: "Weekly narrative report",
      decision: "approved",
    });
  }

  // Draft collections with accept/dismiss decisions.
  for (const change of statusTransitions(
    previous.auditInsights,
    next.auditInsights,
    "accepted",
    "dismissed",
  )) {
    const row = next.auditInsights.find((item) => item.id === change.id);
    entries.push({
      module: "Platform Audit",
      subject: row ? `${row.platform}: ${row.recommendation.slice(0, 120)}` : change.id,
      decision: change.decision,
    });
  }

  for (const change of statusTransitions(
    previous.competitorInsights,
    next.competitorInsights,
    "accepted",
    "dismissed",
  )) {
    const row = next.competitorInsights.find((item) => item.id === change.id);
    entries.push({
      module: "Competitors",
      subject: row ? `${row.competitorName}: ${row.insight.slice(0, 120)}` : change.id,
      decision: change.decision,
    });
  }

  for (const change of statusTransitions(
    previous.aiRecommendations,
    next.aiRecommendations,
    "accepted",
    "dismissed",
  )) {
    const row = next.aiRecommendations.find((item) => item.id === change.id);
    entries.push({
      module: row?.module === "budget" ? "Budget & Resources" : "KPI Tracker",
      subject: row ? `${row.subject}: ${row.recommendation.slice(0, 120)}` : change.id,
      decision: change.decision,
    });
  }

  for (const change of statusTransitions(
    previous.trendInsights,
    next.trendInsights,
    "accepted",
    "dismissed",
  )) {
    const row = next.trendInsights.find((item) => item.id === change.id);
    entries.push({
      module: "Trend Radar",
      subject: row ? row.title.slice(0, 140) : change.id,
      decision: change.decision,
    });
  }

  // Campaign suggestions disappear on decision: accepted ones become a
  // campaign in the same update, dismissed ones just vanish.
  const nextSuggestionIds = new Set(next.campaignSuggestions.map((row) => row.id));
  const nextCampaignNames = new Set(next.ucc.campaigns.map((row) => row.name));

  for (const suggestion of previous.campaignSuggestions) {
    if (nextSuggestionIds.has(suggestion.id)) {
      continue;
    }

    entries.push({
      module: "Campaigns",
      subject: `Campaign idea: ${suggestion.name.slice(0, 120)}`,
      decision: nextCampaignNames.has(suggestion.name) ? "approved" : "rejected",
    });
  }

  // Calendar items reaching or losing manager approval.
  const calendarBefore = new Map(
    previous.calendar.map((item) => [item.id, item.approvalStage ?? "idea"]),
  );

  for (const item of next.calendar) {
    const was = calendarBefore.get(item.id);
    const now = item.approvalStage ?? "idea";

    if (was === now || was === undefined) {
      continue;
    }

    if (now === "manager approved") {
      entries.push({
        module: "Production Board",
        subject: `${item.platform} / ${item.contentTopic.slice(0, 120)}`,
        decision: "approved",
      });
    }

    if (now === "revision") {
      entries.push({
        module: "Production Board",
        subject: `${item.platform} / ${item.contentTopic.slice(0, 120)}`,
        decision: "rejected",
      });
    }
  }

  const stamp = Date.now();

  return entries.map((entry, index) => ({
    ...entry,
    id: `log-${stamp}-${index}`,
    decidedBy,
    decidedAt: decidedAt,
  }));
}

// Append new entries, newest first, capped so the workspace document stays
// a sensible size. The cap is far above normal monthly volume.
export function appendApprovalLog(
  log: ApprovalLogEntry[],
  entries: ApprovalLogEntry[],
): ApprovalLogEntry[] {
  if (entries.length === 0) {
    return log;
  }

  return [...entries, ...log].slice(0, LOG_CAP);
}

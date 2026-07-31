// The approvals log (Module E3). Every approval or rejection anywhere in
// the workspace is detected here, centrally, by comparing the workspace
// before and after an update. That way no decision path can forget to
// write the audit trail. Pure helpers, no network.

import type {
  ApprovalLogEntry,
  MarketingWorkspaceData,
  PlatformPlaybookEntry,
} from "@/lib/social-calendar-data";
// Relative with an explicit extension, like lib/last30days.ts: these are value
// imports, so they survive type stripping and have to resolve when
// scripts/check-approvals-log.ts runs the file straight through node, where
// the "@/" alias does not exist.
import { reachSentence } from "./signal-board.ts";

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

  // Whole-audit AI summary (one entry, not a list, so compared directly
  // rather than via statusTransitions).
  if (
    previous.auditOverviewInsight?.status !== "accepted" &&
    next.auditOverviewInsight?.status === "accepted"
  ) {
    entries.push({
      module: "Platform Audit",
      subject: `Whole audit: ${next.auditOverviewInsight.recommendation.slice(0, 120)}`,
      decision: "approved",
    });
  } else if (
    previous.auditOverviewInsight?.status === "draft" &&
    next.auditOverviewInsight?.status === "dismissed" &&
    next.auditOverviewInsight.id === previous.auditOverviewInsight.id
  ) {
    entries.push({
      module: "Platform Audit",
      subject: `Whole audit: ${next.auditOverviewInsight.recommendation.slice(0, 120)}`,
      decision: "rejected",
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

  // Social listening findings. This collection was the one sibling with no
  // diffing block, so accepting a finding as strategy input left no trace
  // anywhere: the confirmation named three consumers and then the decision
  // vanished from the audit trail. Flagged as issue 3 in
  // docs/module-connection-map.html.
  //
  // Note the odd initial status: listening rows start at "new" where every
  // other collection starts at "draft". statusTransitions only cares about the
  // accepted and rejected values, so that difference is harmless here, but it
  // is why "new" is passed through rather than normalised to "draft".
  for (const change of statusTransitions(
    (previous.listeningResults ?? []).map((row) => ({
      id: row.id,
      status: row.status ?? "new",
    })),
    (next.listeningResults ?? []).map((row) => ({
      id: row.id,
      status: row.status ?? "new",
    })),
    "accepted",
    "dismissed",
  )) {
    const row = next.listeningResults.find((item) => item.id === change.id);

    // Say where an accepted finding goes, because that is the question the
    // log has to answer later. Acceptance makes it available to the three
    // generators that read acceptedListeningInsights (brief-ai, campaign-ai,
    // platform-playbook-ai); it does not mean any of them has run yet, so the
    // wording is "available to" rather than a claim it was used.
    // Wording comes from the Signal Board's reach map so the log and the board
    // cannot drift apart. Today that map yields the same sentence this line
    // used to hardcode.
    const reaches =
      change.decision === "approved"
        ? `, available to ${reachSentence("Social Listening")}`
        : "";

    entries.push({
      module: "Social Listening",
      subject: `${row ? row.topic.slice(0, 100) : change.id}${reaches}`,
      decision: change.decision,
      sourceId: change.id,
    });
  }

  // Account Research findings. Unlike every collection above, these have no
  // draft state: a saved lookup is already the manager's decision to keep it,
  // so a row that arrives "accepted" is a genuine approval and is logged as
  // one. Removing it later is logged as a rejection.
  for (const change of statusTransitions(
    previous.accountFindings ?? [],
    next.accountFindings ?? [],
    "accepted",
    "dismissed",
  )) {
    const row = (next.accountFindings ?? []).find((item) => item.id === change.id);
    const reaches =
      change.decision === "approved"
        ? `, available to ${reachSentence("Account Research")}`
        : "";

    entries.push({
      module: "Account Research",
      subject: `${row ? row.subject.slice(0, 100) : change.id}${reaches}`,
      decision: change.decision,
      sourceId: change.id,
    });
  }

  // Platform Intelligence playbooks. Unlike every collection above, this is
  // not a growing list a manager accepts or archives rows out of: it is one
  // fixed slot per platform, always present, that the calendar and copywriting
  // engines read unconditionally. There is nothing here to archive or delete,
  // so it is genuinely out of scope for that pattern (see Task 4's report).
  // What was missing, and is genuine, is that a decision on this screen left
  // no trace anywhere: approving a draft or discarding it vanished exactly
  // like every module before Task 3's fix to Social Listening, with no way to
  // see later who changed a platform's playbook or when.
  // The union of whatever platforms either side actually has an entry for,
  // rather than importing the canonical platforms list: that list lives in
  // social-calendar-data.ts, which itself has "@/..." imports that only the
  // Next.js bundler resolves, not the plain node process this file's own
  // check script runs under.
  const playbookPlatforms = new Set([
    ...Object.keys(previous.platformPlaybook ?? {}),
    ...Object.keys(next.platformPlaybook ?? {}),
  ]);

  const previousPlaybook = previous.platformPlaybook as
    | Record<string, PlatformPlaybookEntry>
    | undefined;
  const nextPlaybook = next.platformPlaybook as Record<string, PlatformPlaybookEntry> | undefined;

  for (const platform of playbookPlatforms) {
    const before = previousPlaybook?.[platform];
    const after = nextPlaybook?.[platform];

    if (!before || !after) {
      continue;
    }

    // A new, later approval timestamp is the manager clicking Approve. This
    // reads the timestamp rather than approvedSource, so a manual edit and an
    // AI draft are logged the same honest way: a human approved it either way.
    if (after.approvedAt && after.approvedAt !== before.approvedAt) {
      entries.push({
        module: "Platform Intelligence",
        subject: `${platform}: ${after.approved.content.slice(0, 120)}, available to calendar generation and content production`,
        decision: "approved",
      });
      continue;
    }

    // A draft that existed and is now gone, with no approval having just
    // happened, is Discard draft: the closest thing this screen has to a
    // rejection, and previously the one decision on it with no record at all.
    if (before.draft && !after.draft) {
      entries.push({
        module: "Platform Intelligence",
        subject: `${platform}: ${before.draft.content.slice(0, 120)}`,
        decision: "rejected",
      });
    }
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

// Strip every log entry belonging to one deleted row.
//
// This deliberately destroys audit history. A delete here is a real delete,
// which the owner asked for and accepted: the row goes and the record that it
// was ever accepted or archived goes with it. Archive, not delete, is the
// action that keeps the trail.
//
// Matching is by sourceId, which is stamped on entries written from now on.
// Entries written before that field existed have no id, so they fall back to
// an exact module-and-subject match. That fallback is exact rather than a
// prefix test on purpose: a prefix would let one deleted topic take an
// unrelated entry with it, and losing the wrong history is worse than leaving
// one stale line behind.
export function purgeApprovalsForSource(
  log: ApprovalLogEntry[],
  module: string,
  sourceId: string,
  subjects: string[],
): ApprovalLogEntry[] {
  const legacy = new Set(subjects);

  return log.filter((entry) => {
    if (entry.module !== module) {
      return true;
    }

    if (entry.sourceId) {
      return entry.sourceId !== sourceId;
    }

    return !legacy.has(entry.subject);
  });
}

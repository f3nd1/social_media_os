"use client";

// The AI Marketing Director panel (Marketing Strategy OS v2). One persistent
// right-hand intelligence column that follows the user across modules. It is
// honest by construction: everything shown is derived live from the workspace
// data that genuinely feeds the AI prompts (brand, products, audiences,
// audits, accepted evidence, approved strategy, campaigns, calendar, and
// results), and every action routes to a real AI feature that already exists.
// It never displays invented recommendations and never approves anything.

import {
  Sparkles,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { isLiveAiEnabled } from "@/lib/ai-settings";
import { sgMomentNudges } from "@/lib/sg-marketing-moments";
import {
  isCampaignApproved,
  type MarketingWorkspaceData,
} from "@/lib/social-calendar-data";

type DirectorModuleId =
  | "dashboard"
  | "foundation"
  | "insights"
  | "planning"
  | "operations"
  | "reporting";

type DirectorNavView =
  | "brand"
  | "courses"
  | "objectives"
  | "competitors"
  | "platform"
  | "brief"
  | "campaigns"
  | "calendar"
  | "production"
  | "budget"
  | "kpi"
  | "compliance"
  | "reports"
  | "settings";

type Note = { text: string; view?: DirectorNavView; action?: string };

// The live facts the AI features actually consume, counted from the
// workspace. This is the "unified context memory" made visible.
function contextFacts(data: MarketingWorkspaceData): string[] {
  const liveCourses = data.ucc.courses.filter(
    (course) => course.status !== "archived",
  ).length;
  const accepted =
    data.competitorInsights.filter((row) => row.status === "accepted").length +
    data.trendInsights.filter((row) => row.status === "accepted").length +
    data.listeningResults.filter((row) => row.status === "accepted").length +
    data.auditInsights.filter((row) => row.status === "accepted").length;

  return [
    data.brand.brandName.trim()
      ? `Brand: ${data.brand.brandName.trim()}`
      : "Brand: not set yet",
    `${liveCourses} products, ${data.ucc.audiences.length} audiences`,
    `${data.audits.length} platform audits`,
    `${accepted} accepted research signals`,
    data.brief.approved ? "Strategy brief: approved" : "Strategy brief: not approved",
    `${data.ucc.campaigns.filter(isCampaignApproved).length} approved campaigns`,
    `${data.calendar.length} calendar items, ${data.performanceResults.length} with results`,
  ];
}

// Real, data-derived notes per module. Each is a fact from the workspace with
// the screen that acts on it; none of it is generated or guessed.
function buildNotes(data: MarketingWorkspaceData, moduleId: DirectorModuleId): Note[] {
  const notes: Note[] = [];
  const campaignsAwaiting = data.ucc.campaigns.filter(
    (campaign) => !isCampaignApproved(campaign),
  ).length;
  const itemsInReview = data.calendar.filter((item) =>
    ["drafting", "review", "revision"].includes(item.status),
  ).length;
  const newEvidence =
    data.trendInsights.filter((row) => row.status === "draft").length +
    data.listeningResults.filter((row) => (row.status ?? "new") === "new").length +
    data.competitorInsights.filter((row) => row.status === "draft").length;
  const weakKpis = data.ucc.kpiRecords.filter(
    (row) => row.status === "behind target" || row.status === "needs attention",
  );
  const nextMoment = sgMomentNudges(new Date())[0];

  if (moduleId === "dashboard") {
    if (!data.brief.approved) {
      notes.push({
        text: "No approved strategy this month. Draft and approve the brief before generating content.",
        view: "brief",
        action: "Open Strategic Planning",
      });
    }
    if (campaignsAwaiting > 0) {
      notes.push({
        text: `${campaignsAwaiting} campaign${campaignsAwaiting === 1 ? "" : "s"} awaiting your approval.`,
        view: "campaigns",
        action: "Review campaigns",
      });
    }
    if (itemsInReview > 0) {
      notes.push({
        text: `${itemsInReview} calendar item${itemsInReview === 1 ? "" : "s"} in draft, review, or revision.`,
        view: "production",
        action: "Open Production Queue",
      });
    }
    if (nextMoment) {
      notes.push({
        text: nextMoment.message + " " + nextMoment.moment.relevance,
        view: "campaigns",
        action: "Plan for it",
      });
    }
  }

  if (moduleId === "foundation") {
    if (!data.brand.brandName.trim()) {
      notes.push({
        text: "The brand profile is empty. Every AI draft improves once the brand voice is set.",
        view: "brand",
        action: "Open Brand Hub",
      });
    }
    if (data.ucc.audiences.some((audience) => audience.recommendedChannels.length === 0)) {
      notes.push({
        text: "Some audiences have no preferred platforms. Adding them steers the recommended platform mix.",
        view: "courses",
        action: "Edit audiences",
      });
    }
    if (data.ucc.courses.some((course) => course.status !== "archived" && !course.complianceNotes.trim())) {
      notes.push({
        text: "Some products have no compliance notes. Notes are enforced in every AI prompt about that product.",
        view: "courses",
        action: "Add compliance notes",
      });
    }
  }

  if (moduleId === "insights") {
    if (newEvidence > 0) {
      notes.push({
        text: `${newEvidence} research signal${newEvidence === 1 ? "" : "s"} (trends, listening, competitors) awaiting an accept or dismiss decision. Only accepted signals feed strategy.`,
        view: "platform",
        action: "Review signals",
      });
    }
    if (data.audits.length === 0) {
      notes.push({
        text: "No platform audits yet, so there is no baseline to measure progress against.",
        view: "objectives",
        action: "Record an audit",
      });
    }
    if (weakKpis.length > 0) {
      notes.push({
        text: `${weakKpis.length} KPI channel${weakKpis.length === 1 ? "" : "s"} behind target or needing attention.`,
        view: "kpi",
        action: "Open KPI Tracking",
      });
    }
  }

  if (moduleId === "planning") {
    notes.push(
      data.brief.approved
        ? {
            text: "The strategy brief is approved and is driving campaign and calendar generation.",
            view: "brief",
            action: "Review the brief",
          }
        : {
            text: "The strategy brief is not approved. Campaigns and the calendar wait on it.",
            view: "brief",
            action: "Approve the brief",
          },
    );
    if (campaignsAwaiting > 0) {
      notes.push({
        text: `${campaignsAwaiting} campaign${campaignsAwaiting === 1 ? "" : "s"} not yet approved. Only approved campaigns reach the calendar generator.`,
        view: "campaigns",
        action: "Review campaigns",
      });
    }
    if (nextMoment) {
      notes.push({
        text: nextMoment.message,
        view: "campaigns",
        action: "Plan a campaign",
      });
    }
  }

  if (moduleId === "operations") {
    if (itemsInReview > 0) {
      notes.push({
        text: `${itemsInReview} item${itemsInReview === 1 ? "" : "s"} still in draft, review, or revision.`,
        view: "production",
        action: "Open the queue",
      });
    }
    const unassigned = data.calendar.filter((item) => !item.owner?.trim()).length;
    if (unassigned > 0) {
      notes.push({
        text: `${unassigned} calendar item${unassigned === 1 ? "" : "s"} with no owner.`,
        view: "production",
        action: "Assign owners",
      });
    }
    if (data.calendar.length === 0) {
      notes.push({
        text: "No calendar yet. Generate one from the approved brief.",
        view: "calendar",
        action: "Open Calendar",
      });
    }
  }

  if (moduleId === "reporting") {
    weakKpis.slice(0, 2).forEach((row) => {
      notes.push({
        text: `${row.channel}: ${row.recommendation}`,
        view: "kpi",
        action: "Open KPI Tracking",
      });
    });
    if (data.performanceResults.length === 0) {
      notes.push({
        text: "No performance results recorded yet, so reports rest on plans rather than outcomes.",
        view: "kpi",
        action: "Record results",
      });
    }
  }

  if (notes.length === 0) {
    notes.push({
      text: "Nothing urgent in this module right now. The context memory below shows what the AI features are drawing on.",
    });
  }

  return notes.slice(0, 4);
}

// Where each module's real live-AI feature lives, so the panel's action
// button always lands on genuine functionality.
const MODULE_AI_ACTION: Record<
  DirectorModuleId,
  { label: string; view: DirectorNavView }
> = {
  dashboard: { label: "Draft strategy with AI", view: "brief" },
  foundation: { label: "Run a platform audit review", view: "objectives" },
  insights: { label: "Scan live trends", view: "platform" },
  planning: { label: "Suggest campaigns with AI", view: "campaigns" },
  operations: { label: "Generate calendar from brief", view: "calendar" },
  reporting: { label: "Draft weekly report with AI", view: "reports" },
};

export function AiDirectorPanel({
  data,
  moduleId,
  onNavigate,
}: {
  data: MarketingWorkspaceData;
  moduleId: DirectorModuleId;
  onNavigate: (view: DirectorNavView) => void;
}) {
  const liveAi = isLiveAiEnabled(data.aiIntegration);
  const notes = buildNotes(data, moduleId);
  const facts = contextFacts(data);
  const action = MODULE_AI_ACTION[moduleId];

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="flex items-center gap-1.5 text-sm font-semibold">
            <Sparkles className="h-4 w-4" />
            AI Marketing Director
          </p>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">
            Drafts and recommends only. You approve everything.
          </p>
        </div>
        <Badge variant={liveAi ? "success" : "secondary"}>
          {liveAi ? "Live" : "Offline rules"}
        </Badge>
      </div>

      <div className="rounded-lg border bg-muted/20 p-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Needs attention here
        </p>
        <div className="mt-2 space-y-2">
          {notes.map((note, index) => (
            <div className="rounded-md border bg-card p-2.5" key={index}>
              <p className="text-xs leading-5">{note.text}</p>
              {note.view && note.action ? (
                <button
                  className="mt-1.5 text-xs font-semibold text-primary underline-offset-2 hover:underline"
                  onClick={() => onNavigate(note.view as DirectorNavView)}
                  type="button"
                >
                  {note.action}
                </button>
              ) : null}
            </div>
          ))}
        </div>
      </div>

      <Button
        className="w-full"
        onClick={() => onNavigate(action.view)}
        size="sm"
        type="button"
      >
        {action.label}
      </Button>
      {!liveAi ? (
        <p className="text-xs leading-5 text-muted-foreground">
          Live AI is off, so AI buttons on that screen use the offline
          rule-based drafts. Connect OpenAI in Foundation to go live.
        </p>
      ) : null}

      <div className="rounded-lg border p-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Unified context memory
        </p>
        <p className="mt-1 text-xs leading-5 text-muted-foreground">
          What every AI draft on this workspace draws from right now:
        </p>
        <ul className="mt-2 space-y-1">
          {facts.map((fact) => (
            <li className="text-xs leading-5" key={fact}>
              {fact}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

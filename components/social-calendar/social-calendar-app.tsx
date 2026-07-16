"use client";

import {
  Fragment,
  type ChangeEvent,
  type ComponentProps,
  type ReactNode,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  AlertTriangle,
  BarChart3,
  BookOpenText,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  ClipboardCheck,
  Database,
  Download,
  FileClock,
  FileSpreadsheet,
  FileText,
  FileUp,
  Filter,
  Gauge,
  GraduationCap,
  ListChecks,
  PenLine,
  Plus,
  RefreshCcw,
  SearchCheck,
  Settings2,
  Archive,
  ArchiveRestore,
  ShieldCheck,
  Sparkles,
  Table2,
  Target,
  Trash2,
  TrendingUp,
  Palette,
  UsersRound,
  Wand2,
  X,
  type LucideIcon,
} from "lucide-react";

import { useTheme } from "@/components/theme-provider";
import {
  useWorkspaceSync,
  type WorkspaceSync,
} from "@/components/social-calendar/use-workspace-sync";
import { apiUrl } from "@/lib/base-path";
import {
  isLiveAiEnabled,
  OFFLINE_DRAFT_LABEL,
  resolveModelForTask,
  suggestModels,
} from "@/lib/ai-settings";
import {
  appendAiUsage,
  buildAiUsageEntry,
  monthlyAiUsageTotals,
} from "@/lib/ai-usage";
import type { OpenAiUsage } from "@/lib/openai-shared";
import {
  auditDraftToInsight,
  upsertAuditInsight,
  wholeAuditDraftToInsight,
  type AuditAiContext,
  type AuditAiDraft,
  type WholeAuditAiContext,
  type WholeAuditAiDraft,
} from "@/lib/audit-ai";
import {
  platformPlaybookDraftToFields,
  type PlatformPlaybookAiContext,
  type PlatformPlaybookAiDraft,
} from "@/lib/platform-playbook-ai";
import {
  briefDraftToPatch,
  type BriefAiContext,
  type BriefAiDraft,
} from "@/lib/brief-ai";
import {
  calendarDraftToItems,
  calendarDraftToPatch,
  type CalendarAiContext,
  type CalendarDraftItem,
} from "@/lib/calendar-ai";
import {
  formatMomentsForPrompt,
  suggestionDraftsToSuggestions,
  suggestionToCampaign,
  type CampaignAiContext,
  type CampaignAiSuggestionDraft,
} from "@/lib/campaign-ai";
import { sgMomentNudges, upcomingSgMoments } from "@/lib/sg-marketing-moments";
import {
  competitorDraftToInsights,
  type CompetitorAiContext,
  type CompetitorAiDraft,
} from "@/lib/competitor-ai";
import {
  copyDraftToPatch,
  type CopyAiContext,
  type CopyAiDraft,
} from "@/lib/copy-ai";
import type { ComplianceAiContext, ComplianceFlag } from "@/lib/compliance-ai";
import {
  buildInsightsContext,
  insightsDraftToRecommendations,
  type InsightsAiDraft,
} from "@/lib/insights-ai";
import { buildReportContext } from "@/lib/report-ai";
import {
  audienceIncludesChinese,
  remixDraftToItems,
  type RemixAiContext,
  type RemixAiDraft,
} from "@/lib/remix-ai";
import {
  LISTENING_ANALYSIS_OPTIONS,
  SUGGESTED_LISTENING_TOPICS,
  type ListeningAnalysisType,
} from "@/lib/listening-ai";
import {
  appendApprovalLog,
  deriveApprovalLogEntries,
} from "@/lib/approvals-log";
import {
  downloadApprovalsLogCsv,
  downloadApprovalsLogPdf,
} from "@/lib/approvals-log-export";
import { buildTrendContext } from "@/lib/trend-ai";
import { resolveSupabaseConfig } from "@/lib/supabase-client";
import { THEMES, type ThemeId } from "@/lib/theme";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import {
  analyzePerformance,
  approvalStages,
  calculateAuditScore,
  calendarItemKinds,
  createDefaultPlatformPlaybook,
  createDefaultSetupGuide,
  createEmptyWorkspaceData,
  createSeedWorkspaceData,
  dailyPublishingRhythm,
  funnelStages,
  generateCalendarFromBrief,
  generateCopywritingForItem,
  getApprovedPlaybookFields,
  getDailyContentMasterMeta,
  getAuditIssues,
  getAuditRecommendations,
  makeNewAudience,
  makeNewCourse,
  platforms,
  reconcileContentPillars,
  roles,
  statuses,
  isCampaignApproved,
  type AiIntegrationSettings,
  type AiRecommendation,
  type AiUsageEntry,
  type ApprovalLogEntry,
  type ListeningResult,
  type TrendInsight,
  type WeeklyReport,
  type AuditInsight,
  type AuditOverviewInsight,
  type CampaignSuggestion,
  type CompetitorInsight,
  type ComplianceDoc,
  type AuditScores,
  type ApprovalStage,
  type BrandProfile,
  type CalendarItem,
  type CalendarItemKind,
  type CalendarStatus,
  type Competitor,
  type FunnelStage,
  type MarketingWorkspaceData,
  type PdfMetricReview,
  type PerformanceResult,
  type Platform,
  type PlatformConnection,
  type PlatformPlaybook,
  type PlatformPlaybookEntry,
  type PlatformPlaybookFields,
  type Role,
  type SocialAudit,
  type SocialGoalSettings,
  type SocialGoalTargets,
  type StrategyBrief,
  type UccAiModule,
  type UccAiOutputRecord,
  type UccAudience,
  type UccBudgetPlan,
  type UccCampaign,
  type UccCourse,
  type UccCourseCategory,
  type UccKpiRecord,
  type UccMarketingChannel,
  type UccMarketingEvent,
  type UccStrategyData,
} from "@/lib/social-calendar-data";
import {
  getPdfConfidenceLevel,
  type PendingMetricReview,
  type PlatformDataMetrics,
} from "@/lib/pdf-data-import";
import { importMetricoolPdf } from "@/lib/metricool-pdf-client";
import {
  ConnectionManagerPanel,
  MetricReviewPanel,
  reviewRowsToApprovedMetrics,
} from "@/components/social-calendar/connection-manager";
import { SetupGuide } from "@/components/social-calendar/setup-guide";
import {
  AiDirectorPanel,
  countAttentionItems,
  type DirectorModuleId,
} from "@/components/social-calendar/ai-director-panel";
import { ChangelogView } from "@/components/social-calendar/changelog-view";
import { TeamView } from "@/components/social-calendar/v2-foundation-insights";
import {
  CampaignReportsView,
  ContentPillarsView,
  ExecutiveDashboardView,
  LearningsView,
  PlatformReportsView,
} from "@/components/social-calendar/v2-planning-reporting";
import {
  buildExportSheets,
  downloadCsvPack,
  downloadExcelWorkbook,
} from "@/lib/social-calendar-export";
import {
  localSocialCalendarRepository,
  normalizeWorkspaceData,
} from "@/lib/social-calendar-storage";
import { cn } from "@/lib/utils";

type BadgeVariant = ComponentProps<typeof Badge>["variant"];

export type ViewId =
  | "dashboard"
  | "brand"
  | "team"
  | "platformIntel"
  | "pillars"
  | "campaignReports"
  | "platformReports"
  | "executive"
  | "learnings"
  | "objectives"
  | "courses"
  | "campaigns"
  | "platform"
  | "competitors"
  | "brief"
  | "calendar"
  | "production"
  | "budget"
  | "compliance"
  | "reports"
  | "settings"
  | "changelog";

type NavItem = { id: ViewId; label: string; icon: LucideIcon };

// Marketing Strategy OS v2 information architecture: six sidebar modules,
// each a workspace with horizontal tabs. Every existing screen is re-homed
// into a module tab; nothing is removed, only reorganised. The workflow reads
// Foundation, Insights, Planning, Operations, Reporting, with Dashboard as
// the command centre.
type ModuleId =
  | "dashboard"
  | "foundation"
  | "insights"
  | "planning"
  | "operations"
  | "reporting"
  | "system";

const modules: Array<{
  id: ModuleId;
  label: string;
  subtitle: string;
  icon: LucideIcon;
  tabs: NavItem[];
}> = [
  {
    id: "dashboard",
    label: "Dashboard",
    subtitle: "Command centre: what needs your attention today?",
    icon: BarChart3,
    tabs: [{ id: "dashboard", label: "Overview", icon: BarChart3 }],
  },
  {
    id: "foundation",
    label: "Foundation",
    subtitle: "Business knowledge that powers every AI recommendation.",
    icon: GraduationCap,
    tabs: [
      { id: "brand", label: "Brand Hub", icon: Palette },
      { id: "courses", label: "Products & Audiences", icon: GraduationCap },
      { id: "team", label: "Team", icon: UsersRound },
    ],
  },
  {
    id: "insights",
    label: "Insights",
    subtitle: "What is happening in performance and the market?",
    icon: Gauge,
    tabs: [
      { id: "objectives", label: "Marketing Intelligence", icon: Target },
      { id: "competitors", label: "Competitor Intelligence", icon: UsersRound },
      { id: "platform", label: "Market Intelligence", icon: Gauge },
      { id: "platformIntel", label: "Platform Intelligence", icon: Gauge },
    ],
  },
  {
    id: "planning",
    label: "Planning",
    subtitle: "Turn intelligence into approved strategy and campaigns.",
    icon: SearchCheck,
    tabs: [
      { id: "brief", label: "Strategic Planning", icon: SearchCheck },
      { id: "campaigns", label: "Campaign Management", icon: ClipboardCheck },
      { id: "pillars", label: "Content Pillars", icon: ListChecks },
      { id: "budget", label: "Budget", icon: FileSpreadsheet },
      { id: "compliance", label: "Approvals & Compliance", icon: ShieldCheck },
    ],
  },
  {
    id: "operations",
    label: "Operations",
    subtitle: "Production execution only: calendar and queue.",
    icon: ListChecks,
    tabs: [
      { id: "calendar", label: "Calendar", icon: CalendarDays },
      { id: "production", label: "Production Queue", icon: ListChecks },
    ],
  },
  {
    id: "reporting",
    label: "Reporting",
    subtitle: "Did the strategy work? Reports, exports, and learnings.",
    icon: Download,
    tabs: [
      { id: "reports", label: "Performance Review", icon: Download },
      { id: "campaignReports", label: "Campaign Reports", icon: ClipboardCheck },
      { id: "platformReports", label: "Platform Reports", icon: Gauge },
      { id: "executive", label: "Executive Dashboard", icon: BarChart3 },
      { id: "learnings", label: "Learnings", icon: BookOpenText },
    ],
  },
  {
    id: "system",
    label: "System",
    subtitle: "Settings and the record of what was built.",
    icon: Settings2,
    tabs: [
      { id: "settings", label: "Integrations & Settings", icon: Settings2 },
      { id: "changelog", label: "Changelog", icon: FileClock },
    ],
  },
];

// Flat list derived from the modules, kept for lookups (active screen label)
// and anywhere that still iterates every screen.
const navItems: NavItem[] = modules.flatMap((module) => module.tabs);

const scoreFields: Array<{ key: keyof AuditScores; label: string }> = [
  { key: "profileCompleteness", label: "Profile completeness" },
  { key: "postingConsistency", label: "Posting consistency" },
  { key: "contentMix", label: "Content mix" },
  { key: "hookQuality", label: "Hook quality" },
  { key: "ctaClarity", label: "CTA clarity" },
  { key: "visualConsistency", label: "Visual consistency" },
  { key: "engagementPerformance", label: "Engagement performance" },
];

// The header "Reset sample" button is hidden because Settings now offers
// "Load sample data" and "Start empty", which do the same job with a confirm
// and a backup. Flip this to true to bring the header button back; the
// resetSampleData handler is kept below, just not rendered.
const SHOW_HEADER_RESET = false;

export function SocialCalendarApp() {
  const [data, setData] = useState<MarketingWorkspaceData>(() =>
    createSeedWorkspaceData(),
  );
  const [activeView, setActiveView] = useState<ViewId>("dashboard");
  const [myDayMode, setMyDayMode] = useState(false);
  // Remembers the tab last used inside each module, so switching between
  // modules returns to where the user left off.
  const [moduleLastTab, setModuleLastTab] = useState<
    Partial<Record<ModuleId, ViewId>>
  >({});
  // Role view (v2): which team member's lens Operations is filtered to.
  // Selecting a role opens the Production Queue filtered to that role's work.
  const [globalRole, setGlobalRole] = useState<Role>("marketing manager");
  // After approving synced platform metrics, which row to scroll to and
  // briefly highlight on the Social Audit screen. Cleared a few seconds
  // after arriving, or when the screen is left.
  const [highlightAuditPlatform, setHighlightAuditPlatform] = useState<Platform | null>(
    null,
  );
  // Kept at this level (not inside SettingsWorkspaceView) so the confirmation
  // and its two "View in..." links survive navigating away and back, in case
  // the manager checks one screen then wants to check the other.
  const [applyConfirmation, setApplyConfirmation] = useState<{
    appliedPlatforms: AppliedPlatformSummary[];
    label: string;
  } | null>(null);

  useEffect(() => {
    const holder = modules.find((module) =>
      module.tabs.some((tab) => tab.id === activeView),
    );

    if (holder) {
      setModuleLastTab((current) =>
        current[holder.id] === activeView
          ? current
          : { ...current, [holder.id]: activeView },
      );
    }
  }, [activeView]);

  // Undo for destructive deletes (Module E5). Deleting keeps a snapshot of
  // the workspace for ten seconds; Undo restores it, expiry runs any
  // deferred clean-up (like removing a stored file).
  const [undoToast, setUndoToast] = useState<{ message: string } | null>(null);
  const undoPendingRef = useRef<{
    snapshot: MarketingWorkspaceData;
    onExpire?: () => void;
    timer: ReturnType<typeof setTimeout>;
  } | null>(null);
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    setData(localSocialCalendarRepository.load());
    setIsHydrated(true);
  }, []);

  useEffect(() => {
    if (isHydrated) {
      localSocialCalendarRepository.save(data);
    }
  }, [data, isHydrated]);

  const sync = useWorkspaceSync(data, setData, isHydrated);

  const auditAverage = useMemo(() => {
    if (data.audits.length === 0) {
      return 0;
    }

    return Math.round(
      data.audits.reduce((sum, audit) => sum + calculateAuditScore(audit), 0) /
        data.audits.length,
    );
  }, [data.audits]);

  const productionReadyCount = data.calendar.filter((item) =>
    ["approved", "scheduled", "posted"].includes(item.status),
  ).length;
  const activeNav = navItems.find((item) => item.id === activeView) ?? navItems[0];
  // The Marketing Manager's approved playbook (Platform Intelligence). Falls
  // back to the template defaults for any workspace saved before this field
  // existed; normalizeWorkspaceData already guarantees this in practice.
  const platformPlaybook = data.platformPlaybook ?? createDefaultPlatformPlaybook();

  // The module whose workspace holds the current screen, and the last tab the
  // user was on inside each module, so switching modules returns you to where
  // you left off rather than always resetting to the first tab.
  const activeModule =
    modules.find((module) => module.tabs.some((tab) => tab.id === activeView)) ??
    modules[0];

  function openModule(moduleId: ModuleId) {
    const target = modules.find((module) => module.id === moduleId);

    if (!target) {
      return;
    }

    const remembered = moduleLastTab[moduleId];
    const tab =
      target.tabs.find((candidate) => candidate.id === remembered) ?? target.tabs[0];
    setActiveView(tab.id);
  }

  // Jumps straight to where an approved sync row landed: the Social Audit
  // screen (Objectives), scrolled to and briefly highlighting the platform
  // just updated.
  function viewAppliedData(platform: Platform) {
    setActiveView("objectives");
    setHighlightAuditPlatform(platform);
  }

  function updateWorkspace(
    updater: (current: MarketingWorkspaceData) => MarketingWorkspaceData,
  ) {
    setData((current) => {
      const stamp = new Date().toISOString();
      const next = reconcileContentPillars(current, {
        ...updater(current),
        generatedAt: stamp,
      });

      // Approvals log (Module E3): every approval or rejection anywhere in
      // the workspace is detected here centrally and appended permanently.
      const logEntries = deriveApprovalLogEntries(current, next, stamp);

      return logEntries.length > 0
        ? { ...next, approvalsLog: appendApprovalLog(next.approvalsLog, logEntries) }
        : next;
    });
  }

  function resetSampleData() {
    setData(localSocialCalendarRepository.reset());
  }

  // Load the built-in demo content and leave the guide. Used by the wizard's
  // welcome step ("Explore with sample data").
  function exploreWithSampleData() {
    setData(normalizeWorkspaceData(createSeedWorkspaceData()));
    setActiveView("dashboard");
  }

  // Interactive setup guide (Part 1). Progress is stored in the workspace so
  // the guide is resumable and its live-tested green ticks survive a reload.
  function patchSetupGuide(patch: Partial<NonNullable<MarketingWorkspaceData["setupGuide"]>>) {
    updateWorkspace((current) => ({
      ...current,
      setupGuide: { ...(current.setupGuide ?? createDefaultSetupGuide()), ...patch },
    }));
  }

  function startSetupGuide() {
    patchSetupGuide({ active: true, completed: false, stepIndex: 0, skipped: [] });
    setActiveView("dashboard");
  }

  function exitSetupGuide() {
    patchSetupGuide({ active: false });
  }

  function finishSetupGuide() {
    patchSetupGuide({ active: false, completed: true });
    setActiveView("calendar");
  }

  // Finalise any pending delete: run its deferred clean-up and drop the
  // snapshot. Called when the timer expires or a new delete starts.
  function finalizePendingUndo() {
    const pending = undoPendingRef.current;

    if (pending) {
      clearTimeout(pending.timer);
      undoPendingRef.current = null;
      pending.onExpire?.();
    }
  }

  // Called by a view just BEFORE it removes something. Shows the Undo toast
  // for ten seconds; onExpire runs only if the user does not undo.
  function offerUndo(message: string, onExpire?: () => void) {
    finalizePendingUndo();

    const snapshot = data;
    const timer = setTimeout(() => {
      const pending = undoPendingRef.current;
      undoPendingRef.current = null;
      setUndoToast(null);
      pending?.onExpire?.();
    }, 10_000);

    undoPendingRef.current = { snapshot, onExpire, timer };
    setUndoToast({ message });
  }

  function undoLastDelete() {
    const pending = undoPendingRef.current;

    if (!pending) {
      return;
    }

    clearTimeout(pending.timer);
    undoPendingRef.current = null;
    setUndoToast(null);
    setData({ ...pending.snapshot, generatedAt: new Date().toISOString() });
  }

  // Records one AI call into the usage meter. Called by every AI feature
  // after a successful response, using OpenAI's own token figures.
  function recordAiUsage(module: string, model: string, usage: OpenAiUsage) {
    updateWorkspace((current) => ({
      ...current,
      aiUsage: appendAiUsage(
        current.aiUsage,
        buildAiUsageEntry({
          module,
          model,
          usage,
          aiIntegration: current.aiIntegration,
        }),
      ),
    }));
  }

  function applyApprovedMetrics(
    metrics: PlatformDataMetrics[],
    approvedBy: string,
    source: { label: string; noteLabel: string; rangeLabel: string; editedCount: number },
  ) {
    const importedAt = new Date().toISOString();
    let appliedPlatforms: AppliedPlatformSummary[] = [];

    updateWorkspace((current) => {
      const result = applyPlatformMetricsImport(
        current,
        metrics,
        importedAt,
        approvedBy,
        source,
      );
      appliedPlatforms = result.appliedPlatforms;
      return result.workspace;
    });

    // Kept at the app level, not inside SettingsWorkspaceView, so the
    // confirmation and its "View in..." links survive navigating away and
    // back (the settings screen unmounts when you leave it).
    setApplyConfirmation({ appliedPlatforms, label: source.label });
  }

  // Dedicated full-screen wizard. While the setup guide is active it is the
  // ONLY thing on screen: no left menu, no dashboard, no other panels, so a
  // non-technical user cannot get lost. Every field inside it writes to the
  // real workspace and syncs to Supabase exactly as the full screens do.
  if (isHydrated && data.setupGuide?.active) {
    return (
      <main className="min-h-screen bg-muted/20">
        <div className="mx-auto flex min-h-screen w-full max-w-2xl flex-col justify-center px-4 py-8 sm:px-6">
          <div className="mb-4 flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-md bg-foreground text-background">
              <GraduationCap className="h-5 w-5" />
            </span>
            <div>
              <p className="text-sm font-semibold">UCC Marketing OS</p>
              <p className="text-xs text-muted-foreground">Guided setup</p>
            </div>
          </div>
          <SetupGuide
            fullScreen
            data={data}
            sync={sync}
            onPatch={patchSetupGuide}
            onExit={exitSetupGuide}
            onFinish={finishSetupGuide}
            onLoadSample={exploreWithSampleData}
            onNavigate={setActiveView}
            onAiIntegrationChange={(aiIntegration) =>
              updateWorkspace((current) => ({ ...current, aiIntegration }))
            }
            onConnectionsChange={(connections) =>
              updateWorkspace((current) => ({ ...current, connections }))
            }
            onUpdateBrand={(patch) =>
              updateWorkspace((current) => ({
                ...current,
                brand: { ...current.brand, ...patch },
              }))
            }
            onUccChange={(ucc) =>
              updateWorkspace((current) => ({ ...current, ucc }))
            }
            onAuditsChange={(audits) =>
              updateWorkspace((current) => ({ ...current, audits }))
            }
            onBriefChange={(brief) =>
              updateWorkspace((current) => ({ ...current, brief }))
            }
            onRecordUsage={recordAiUsage}
          />
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen">
      <div className="mx-auto flex w-full max-w-[1560px] gap-0 px-4 py-4 sm:px-6 lg:gap-8 lg:px-8 lg:py-8">
        <aside
          className={cn(
            "sticky top-8 hidden h-[calc(100vh-4rem)] w-60 shrink-0 flex-col border-r pr-5 lg:flex",
            myDayMode && "lg:hidden",
          )}
        >
          <div className="flex items-center gap-3 px-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-md bg-foreground text-background">
              <GraduationCap className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">
                UCC Marketing Strategy OS
              </p>
              <p className="text-xs text-muted-foreground">Local-first workspace</p>
            </div>
          </div>

          <nav className="mt-8 space-y-1">
            <p className="px-3 pb-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground/70">
              Workspace
            </p>
            {modules.map((module) => {
              const Icon = module.icon;
              const active = activeModule.id === module.id;

              return (
                <button
                  className={cn(
                    "flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-left text-sm font-medium transition-colors",
                    active
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground",
                  )}
                  key={module.id}
                  onClick={() => openModule(module.id)}
                  type="button"
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  <span>{module.label}</span>
                </button>
              );
            })}

            <div className="px-3 pt-5">
              <RoleViewControl
                globalRole={globalRole}
                onRoleChange={(role) => {
                  setGlobalRole(role);
                  setActiveView("production");
                }}
              />
            </div>
          </nav>

          <div className="mt-auto space-y-5 px-2">
            <div className="h-px w-full shrink-0 bg-border" />
            <div className="rounded-lg border bg-card p-4">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-medium">Calendar readiness</p>
                <Badge variant="success">
                  {Math.round((productionReadyCount / data.calendar.length) * 100)}%
                </Badge>
              </div>
              <Progress
                className="mt-3"
                value={(productionReadyCount / data.calendar.length) * 100}
              />
              <p className="mt-3 text-xs leading-5 text-muted-foreground">
                {productionReadyCount} of {data.calendar.length} items are approved,
                scheduled, or posted.
              </p>
            </div>
          </div>
        </aside>

        <section className="min-w-0 flex-1">
          <div
            className={cn(
              "sticky top-0 z-30 mb-5 border-b bg-background/95 py-3 backdrop-blur lg:hidden",
              myDayMode && "hidden",
            )}
          >
            <div className="mb-3 flex items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-2">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-foreground text-background">
                  <GraduationCap className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">
                    UCC Marketing Strategy OS
                  </p>
                  <p className="text-xs text-muted-foreground">{activeNav.label}</p>
                </div>
              </div>
              {SHOW_HEADER_RESET ? (
                <Button
                  aria-label="Reset sample data"
                  onClick={resetSampleData}
                  size="icon"
                  variant="outline"
                >
                  <RefreshCcw className="h-4 w-4" />
                </Button>
              ) : null}
            </div>
            <nav className="flex max-w-full gap-2 overflow-x-auto pb-1">
              {modules.map((module) => {
                const Icon = module.icon;
                const active = activeModule.id === module.id;

                return (
                  <button
                    className={cn(
                      "flex h-10 shrink-0 items-center gap-2 rounded-md border px-3 text-sm font-medium transition-colors",
                      active
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border bg-card text-muted-foreground",
                    )}
                    key={module.id}
                    onClick={() => openModule(module.id)}
                    type="button"
                  >
                    <Icon className="h-4 w-4" />
                    {module.label}
                  </button>
                );
              })}
            </nav>
          </div>

          <div className="space-y-6">
            <header className="flex flex-col gap-4 border-b pb-5 xl:flex-row xl:items-end xl:justify-between">
              <div className="min-w-0">
                <div className="mb-3 flex flex-wrap items-center gap-2">
                  <Badge variant="secondary">{data.brand.industry}</Badge>
                  <Badge variant={data.brief.approved ? "success" : "warning"}>
                    {data.brief.approved ? "Brief approved" : "Brief needs approval"}
                  </Badge>
                  <SyncStatusBadge isHydrated={isHydrated} sync={sync} />
                </div>
                <h1 className="text-2xl font-semibold leading-tight text-foreground sm:text-3xl">
                  {myDayMode ? "My day" : activeModule.label}
                </h1>
                <p className="mt-2 max-w-4xl text-sm leading-6 text-muted-foreground sm:text-base">
                  {myDayMode
                    ? `${data.brand.brandName} tasks and decisions for today.`
                    : activeModule.subtitle}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <Button
                  onClick={() => setMyDayMode((current) => !current)}
                  size="sm"
                  variant={myDayMode ? "default" : "outline"}
                >
                  <CalendarDays className="h-4 w-4" />
                  {myDayMode ? "Full workspace" : "My day"}
                </Button>
                <Button onClick={() => downloadCsvPack(data)} size="sm" variant="outline">
                  <Download className="h-4 w-4" />
                  CSV
                </Button>
                <Button
                  onClick={() => downloadExcelWorkbook(data)}
                  size="sm"
                  variant="outline"
                >
                  <FileSpreadsheet className="h-4 w-4" />
                  Excel
                </Button>
                {SHOW_HEADER_RESET ? (
                  <Button onClick={resetSampleData} size="sm" variant="outline">
                    <RefreshCcw className="h-4 w-4" />
                    Reset sample
                  </Button>
                ) : null}
              </div>
            </header>

            {!myDayMode && activeModule.tabs.length > 1 ? (
              <div
                className="-mt-1 flex max-w-full gap-1 overflow-x-auto border-b"
                role="tablist"
              >
                {activeModule.tabs.map((tab) => (
                  <button
                    aria-selected={activeView === tab.id}
                    className={cn(
                      "shrink-0 whitespace-nowrap border-b-2 px-3 py-2.5 text-sm font-semibold transition-colors",
                      activeView === tab.id
                        ? "border-primary text-foreground"
                        : "border-transparent text-muted-foreground hover:text-foreground",
                    )}
                    key={tab.id}
                    onClick={() => setActiveView(tab.id)}
                    role="tab"
                    type="button"
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            ) : null}

            {sync.needsMigration ? (
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-info-border bg-info p-3 text-sm text-info-foreground">
                <span>
                  Cloud storage is connected but empty. Copy the data on this
                  device up to Supabase so nothing is lost.
                </span>
                <Button
                  onClick={() => {
                    void sync.copyLocalToCloud();
                  }}
                  size="sm"
                  type="button"
                >
                  Copy local data to cloud
                </Button>
              </div>
            ) : null}

            {myDayMode ? <MyDayView data={data} /> : null}

            {myDayMode ? null : (
              <>
            {!data.firstRunChecklistDismissed &&
            !data.brand.brandName.trim() &&
            data.calendar.length === 0 ? (
              <FirstRunChecklist
                data={data}
                onNavigate={setActiveView}
                onDismiss={() =>
                  updateWorkspace((current) => ({
                    ...current,
                    firstRunChecklistDismissed: true,
                  }))
                }
              />
            ) : null}

            {activeView === "objectives" ? (
              // Analytics summary lives with Insights, not on every screen:
              // one module, one responsibility, no duplicated analytics.
              <section className="grid gap-3 sm:grid-cols-3">
                <SummaryMetric
                  icon={Gauge}
                  label="Audit score"
                  value={`${auditAverage}%`}
                  detail={`${data.audits.length} platforms scored`}
                />
                <SummaryMetric
                  icon={CalendarDays}
                  label="Calendar"
                  value={`${data.calendar.length} days`}
                  detail={`${productionReadyCount} production-ready items`}
                />
                <SummaryMetric
                  icon={ShieldCheck}
                  label="Compliance"
                  value={`${data.brief.complianceReminders.length} checks`}
                  detail="Education claims stay factual and proof-based"
                />
              </section>
            ) : null}

            <ScreenHelpHint
              dismissed={data.dismissedHelpScreens ?? []}
              view={activeView}
              onDismiss={(view) =>
                updateWorkspace((current) => ({
                  ...current,
                  dismissedHelpScreens: [
                    ...(current.dismissedHelpScreens ?? []),
                    view,
                  ],
                }))
              }
            />

            {activeView === "dashboard" ? (
              <ManagementDashboardView data={data} onNavigate={setActiveView} />
            ) : null}

            {activeView === "brand" ? (
              <BrandSetupView
                brand={data.brand}
                onBrandChange={(field, value) =>
                  updateWorkspace((current) => ({
                    ...current,
                    brand: { ...current.brand, [field]: value },
                  }))
                }
              />
            ) : null}

            {activeView === "team" ? <TeamView data={data} /> : null}

            {activeView === "platformIntel" ? (
              <PlatformIntelligenceView
                aiIntegration={data.aiIntegration}
                approverName={data.approverName}
                data={data}
                globalRole={globalRole}
                onPlatformPlaybookChange={(platformPlaybook) =>
                  updateWorkspace((current) => ({ ...current, platformPlaybook }))
                }
                onRecordUsage={recordAiUsage}
              />
            ) : null}

            {activeView === "pillars" ? (
              <ContentPillarsView
                data={data}
                onContentPillarsChange={(contentPillars) =>
                  updateWorkspace((current) => ({
                    ...current,
                    ucc: { ...current.ucc, contentPillars },
                  }))
                }
              />
            ) : null}

            {activeView === "campaignReports" ? (
              <CampaignReportsView data={data} />
            ) : null}

            {activeView === "platformReports" ? (
              <PlatformReportsView data={data} />
            ) : null}

            {activeView === "executive" ? (
              <ExecutiveDashboardView
                data={data}
                health={computeMarketingHealth(data)}
              />
            ) : null}

            {activeView === "learnings" ? (
              <LearningsView
                acceptedActions={acceptedInsightLines(data)}
                data={data}
              />
            ) : null}

            {activeView === "objectives" ? (
              <SocialAuditView
                aiIntegration={data.aiIntegration}
                auditInsights={data.auditInsights}
                auditOverviewInsight={data.auditOverviewInsight ?? null}
                audits={data.audits}
                globalRole={globalRole}
                highlightPlatform={highlightAuditPlatform}
                socialGoals={data.socialGoals}
                ucc={data.ucc}
                onAuditInsightsChange={(auditInsights) =>
                  updateWorkspace((current) => ({ ...current, auditInsights }))
                }
                onAuditOverviewChange={(auditOverviewInsight) =>
                  updateWorkspace((current) => ({ ...current, auditOverviewInsight }))
                }
                onAuditsChange={(audits) =>
                  updateWorkspace((current) => ({ ...current, audits }))
                }
                onHighlightConsumed={() => setHighlightAuditPlatform(null)}
                onRecordUsage={recordAiUsage}
                onSocialGoalsChange={(socialGoals) =>
                  updateWorkspace((current) => ({ ...current, socialGoals }))
                }
              />
            ) : null}

            {activeView === "courses" ? (
              <CoursesAudiencesView
                onOfferUndo={offerUndo}
                ucc={data.ucc}
                onUccChange={(ucc) =>
                  updateWorkspace((current) => ({ ...current, ucc }))
                }
              />
            ) : null}

            {activeView === "campaigns" ? (
              <CampaignPlanningView
                acceptedTrends={acceptedTrendLines(data.trendInsights)}
                onOfferUndo={offerUndo}
                aiIntegration={data.aiIntegration}
                auditInsights={data.auditInsights}
                brief={data.brief}
                campaignSuggestions={data.campaignSuggestions}
                competitorInsights={data.competitorInsights}
                listeningResults={data.listeningResults}
                ucc={data.ucc}
                onCampaignSuggestionsChange={(campaignSuggestions) =>
                  updateWorkspace((current) => ({ ...current, campaignSuggestions }))
                }
                onRecordUsage={recordAiUsage}
                onUccChange={(ucc) =>
                  updateWorkspace((current) => ({ ...current, ucc }))
                }
              />
            ) : null}

            {activeView === "platform" ? (
              <PlatformStrategyView
                applyConfirmation={applyConfirmation}
                data={data}
                ucc={data.ucc}
                onAiRecommendationsChange={(aiRecommendations) =>
                  updateWorkspace((current) => ({ ...current, aiRecommendations }))
                }
                onApplyMetrics={applyApprovedMetrics}
                onCalendarChange={(calendar) =>
                  updateWorkspace((current) => ({ ...current, calendar }))
                }
                onConnectionsChange={(connections) =>
                  updateWorkspace((current) => ({ ...current, connections }))
                }
                onDismissApplyConfirmation={() => setApplyConfirmation(null)}
                onListeningResultsChange={(listeningResults) =>
                  updateWorkspace((current) => ({ ...current, listeningResults }))
                }
                onNavigate={setActiveView}
                onRecordUsage={recordAiUsage}
                onTrendInsightsChange={(trendInsights) =>
                  updateWorkspace((current) => ({ ...current, trendInsights }))
                }
                onUccChange={(ucc) =>
                  updateWorkspace((current) => ({ ...current, ucc }))
                }
                onViewAppliedData={viewAppliedData}
              />
            ) : null}

            {activeView === "competitors" ? (
              <CompetitorIntelligenceView
                aiIntegration={data.aiIntegration}
                brand={data.brand}
                brief={data.brief}
                competitorInsights={data.competitorInsights}
                competitors={data.competitors}
                onCompetitorInsightsChange={(competitorInsights) =>
                  updateWorkspace((current) => ({ ...current, competitorInsights }))
                }
                onCompetitorsChange={(competitors) =>
                  updateWorkspace((current) => ({ ...current, competitors }))
                }
                onRecordUsage={recordAiUsage}
              />
            ) : null}

            {activeView === "brief" ? (
              <StrategyBriefView
                acceptedTrends={acceptedTrendLines(data.trendInsights)}
                aiIntegration={data.aiIntegration}
                audits={data.audits}
                brand={data.brand}
                brief={data.brief}
                competitorInsights={data.competitorInsights}
                listeningResults={data.listeningResults}
                platformPlaybook={platformPlaybook}
                socialGoals={data.socialGoals}
                ucc={data.ucc}
                onBriefChange={(brief) =>
                  updateWorkspace((current) => ({ ...current, brief }))
                }
                onRecordUsage={recordAiUsage}
              />
            ) : null}

            {activeView === "calendar" ? (
              <CalendarBuilderView
                acceptedTrends={acceptedTrendLines(data.trendInsights)}
                onOfferUndo={offerUndo}
                aiIntegration={data.aiIntegration}
                brand={data.brand}
                brief={data.brief}
                calendar={data.calendar}
                externalRole={globalRole}
                performanceResults={data.performanceResults}
                platformPlaybook={platformPlaybook}
                socialGoals={data.socialGoals}
                ucc={data.ucc}
                onCalendarChange={(calendar) =>
                  updateWorkspace((current) => ({ ...current, calendar }))
                }
                onRecordUsage={recordAiUsage}
                onReplaceCalendar={(calendar, clearPerformance) =>
                  updateWorkspace((current) => ({
                    ...current,
                    calendar,
                    performanceResults: clearPerformance
                      ? []
                      : current.performanceResults,
                  }))
                }
              />
            ) : null}

            {activeView === "production" ? (
              <ContentProductionView
                aiIntegration={data.aiIntegration}
                brand={data.brand}
                brief={data.brief}
                calendar={data.calendar}
                externalRole={globalRole}
                platformPlaybook={platformPlaybook}
                socialGoals={data.socialGoals}
                ucc={data.ucc}
                onRecordUsage={recordAiUsage}
                onCalendarChange={(calendar) =>
                  updateWorkspace((current) => ({ ...current, calendar }))
                }
                onUccChange={(ucc) =>
                  updateWorkspace((current) => ({ ...current, ucc }))
                }
              />
            ) : null}

            {activeView === "budget" ? (
              <BudgetResourcesView
                data={data}
                onOfferUndo={offerUndo}
                onAiRecommendationsChange={(aiRecommendations) =>
                  updateWorkspace((current) => ({ ...current, aiRecommendations }))
                }
                onRecordUsage={recordAiUsage}
                onUccChange={(ucc) =>
                  updateWorkspace((current) => ({ ...current, ucc }))
                }
              />
            ) : null}

            {activeView === "compliance" ? (
              <ComplianceCheckerView
                data={data}
                onComplianceDocsChange={(complianceDocs) =>
                  updateWorkspace((current) => ({ ...current, complianceDocs }))
                }
                onRecordUsage={recordAiUsage}
              />
            ) : null}

            {activeView === "reports" ? (
              <ReportsView
                data={data}
                onApproverNameChange={(approverName) =>
                  updateWorkspace((current) => ({ ...current, approverName }))
                }
                onRecordUsage={recordAiUsage}
                onWeeklyReportChange={(weeklyReport) =>
                  updateWorkspace((current) => ({ ...current, weeklyReport }))
                }
              />
            ) : null}

            {activeView === "settings" ? (
              <SettingsWorkspaceView
                sync={sync}
                onRunSetupGuide={startSetupGuide}
                aiIntegration={data.aiIntegration}
                aiUsage={data.aiUsage}
                connections={data.connections}
                workspaceData={data}
                onRestoreWorkspace={(workspace) =>
                  setData(normalizeWorkspaceData(workspace))
                }
                ucc={data.ucc}
                competitors={data.competitors}
                calendar={data.calendar}
                applyConfirmation={applyConfirmation}
                onApplyMetrics={applyApprovedMetrics}
                onDismissApplyConfirmation={() => setApplyConfirmation(null)}
                onViewAppliedData={viewAppliedData}
                onAiIntegrationChange={(aiIntegration) =>
                  updateWorkspace((current) => ({ ...current, aiIntegration }))
                }
                onConnectionsChange={(connections) =>
                  updateWorkspace((current) => ({ ...current, connections }))
                }
                onUccChange={(ucc) =>
                  updateWorkspace((current) => ({ ...current, ucc }))
                }
                onCompetitorsChange={(competitors) =>
                  updateWorkspace((current) => ({ ...current, competitors }))
                }
                onCalendarChange={(calendar) =>
                  updateWorkspace((current) => ({ ...current, calendar }))
                }
                onRecordUsage={recordAiUsage}
              />
            ) : null}

            {activeView === "changelog" ? <ChangelogView /> : null}
              </>
            )}
          </div>
        </section>

        {!myDayMode ? (
          <AiDirectorTrigger
            data={data}
            moduleId={activeModule.id}
            onNavigate={setActiveView}
          />
        ) : null}
      </div>

      {undoToast ? (
        <div className="fixed bottom-4 left-1/2 z-50 flex w-[min(480px,90vw)] -translate-x-1/2 items-center justify-between gap-3 rounded-lg border bg-card p-3 shadow-lg">
          <p className="text-sm leading-5">{undoToast.message}</p>
          <div className="flex shrink-0 items-center gap-2">
            <Button onClick={undoLastDelete} size="sm" type="button">
              Undo
            </Button>
            <Button
              aria-label="Dismiss undo message"
              onClick={() => {
                setUndoToast(null);
                finalizePendingUndo();
              }}
              size="icon"
              type="button"
              variant="outline"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      ) : null}
    </main>
  );
}

// Compact "Role: X" control replacing the old permanently-visible Role view
// list, so the sidebar can stay narrow and the centre content gets the
// freed width. Opens a small floating popup with the same four roles;
// selecting one, clicking outside, or pressing Escape all close it.
// Shared by every dropdown/popup that closes on an outside click or Escape
// (RoleViewControl, AiDirectorTrigger).
function useCloseOnOutsideOrEscape(
  open: boolean,
  setOpen: (open: boolean) => void,
  containerRef: React.RefObject<HTMLDivElement | null>,
) {
  useEffect(() => {
    if (!open) {
      return;
    }

    function handlePointerDown(event: MouseEvent) {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, setOpen, containerRef]);
}

function RoleViewControl({
  globalRole,
  onRoleChange,
}: {
  globalRole: Role;
  onRoleChange: (role: Role) => void;
}) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  useCloseOnOutsideOrEscape(open, setOpen, containerRef);

  return (
    <div className="relative" ref={containerRef}>
      <p className="pb-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground/70">
        Role view
      </p>
      <button
        aria-expanded={open}
        aria-haspopup="listbox"
        className="flex w-full items-center justify-between gap-2 rounded-md border px-3 py-2 text-left text-sm capitalize text-foreground transition-colors hover:bg-muted"
        onClick={() => setOpen((current) => !current)}
        type="button"
      >
        <span className="truncate">Role: {globalRole}</span>
        <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
      </button>

      {open ? (
        <div
          aria-label="Role view options"
          className="absolute left-0 top-full z-40 mt-1 w-full rounded-md border bg-card p-1 shadow-md"
          role="listbox"
        >
          {roles.map((role) => (
            <button
              aria-selected={globalRole === role}
              className={cn(
                "flex w-full items-center gap-3 rounded-md px-3 py-2 text-left text-sm capitalize transition-colors",
                globalRole === role
                  ? "bg-muted font-medium text-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
              key={role}
              onClick={() => {
                onRoleChange(role);
                setOpen(false);
              }}
              role="option"
              type="button"
            >
              <span
                className={cn(
                  "h-1.5 w-1.5 shrink-0 rounded-full",
                  globalRole === role ? "bg-primary" : "bg-muted-foreground/40",
                )}
              />
              {role}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

// Floating "AI Marketing Director" trigger replacing the old permanently
// docked right-hand panel, so the centre content can use the full width on
// every workspace screen. Rendered once in the shared layout; the popup it
// opens shows the exact same AiDirectorPanel content, unchanged.
function AiDirectorTrigger({
  data,
  moduleId,
  onNavigate,
}: {
  data: MarketingWorkspaceData;
  moduleId: DirectorModuleId;
  onNavigate: (view: ViewId) => void;
}) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const liveAi = isLiveAiEnabled(data.aiIntegration);
  const attentionCount = countAttentionItems(data, moduleId);
  useCloseOnOutsideOrEscape(open, setOpen, containerRef);

  return (
    <div className="fixed bottom-6 right-6 z-40" ref={containerRef}>
      {open ? (
        <div className="absolute bottom-full right-0 mb-3 max-h-[70vh] w-[340px] overflow-y-auto rounded-lg border bg-card p-4 shadow-xl">
          <div className="mb-2 flex justify-end">
            <Button
              aria-label="Close AI Marketing Director"
              onClick={() => setOpen(false)}
              size="icon"
              type="button"
              variant="outline"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          <AiDirectorPanel
            data={data}
            moduleId={moduleId}
            onNavigate={(view) => {
              onNavigate(view);
              setOpen(false);
            }}
          />
        </div>
      ) : null}

      <button
        aria-expanded={open}
        className="flex items-center gap-2 rounded-full border bg-card px-4 py-2.5 text-sm font-semibold shadow-lg transition-colors hover:bg-muted"
        onClick={() => setOpen((current) => !current)}
        type="button"
      >
        <Sparkles className="h-4 w-4" />
        <span>AI Marketing Director</span>
        <Badge variant={liveAi ? "success" : "secondary"}>
          {liveAi ? "Live" : "Offline rules"}
        </Badge>
        {attentionCount > 0 ? <Badge variant="warning">{attentionCount}</Badge> : null}
      </button>
    </div>
  );
}

function SummaryMetric({
  detail,
  icon: Icon,
  label,
  value,
}: {
  detail: string;
  icon: LucideIcon;
  label: string;
  value: string;
}) {
  return (
    <Card>
      <CardContent className="flex items-start gap-4 p-4">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-secondary text-secondary-foreground">
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="mt-1 text-xl font-semibold leading-tight">{value}</p>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">{detail}</p>
        </div>
      </CardContent>
    </Card>
  );
}

// Everything currently waiting for the manager's decision, shared by the
// Dashboard (Module C5) and the My day view (Module E4).
function buildPendingApprovals(
  data: MarketingWorkspaceData,
): Array<{ label: string; count: number; where: string }> {
  return [
    {
      label: "Platform audit insights",
      count: data.auditInsights.filter((row) => row.status === "draft").length,
      where: "Platform Audit screen",
    },
    {
      label: "Campaign ideas",
      count: data.campaignSuggestions.length,
      where: "Campaigns screen",
    },
    {
      label: "Competitor insights",
      count: data.competitorInsights.filter((row) => row.status === "draft").length,
      where: "Competitors screen",
    },
    {
      label: "Budget suggestions",
      count: data.aiRecommendations.filter(
        (row) => row.module === "budget" && row.status === "draft",
      ).length,
      where: "Budget & Resources screen",
    },
    {
      label: "KPI suggestions",
      count: data.aiRecommendations.filter(
        (row) => row.module === "kpi" && row.status === "draft",
      ).length,
      where: "KPI Tracker screen",
    },
    {
      label: "Trend cards",
      count: data.trendInsights.filter((row) => row.status === "draft").length,
      where: "Platform Strategy screen (Trend Radar)",
    },
    {
      label: "Weekly report draft",
      count: data.weeklyReport?.status === "draft" ? 1 : 0,
      where: "Reports screen",
    },
    {
      label: "Strategy brief",
      count: data.brief.approved ? 0 : 1,
      where: "Strategy Brief screen",
    },
    {
      label: "Content in review",
      count: data.calendar.filter((item) => item.status === "review").length,
      where: "Production Board",
    },
  ].filter((row) => row.count > 0);
}

// The stripped-down daily view for non-technical staff (Module E4).
function MyDayView({ data }: { data: MarketingWorkspaceData }) {
  const todayIso = new Date().toISOString().slice(0, 10);
  const myName = data.approverName.trim().toLowerCase();
  const assignedToMe = myName
    ? data.calendar.filter(
        (item) =>
          (item.owner ?? "").trim().toLowerCase() === myName ||
          (item.reviewer ?? "").trim().toLowerCase() === myName,
      )
    : [];
  const todaysItems = data.calendar.filter(
    (item) => (item.plannedDate ?? item.date) === todayIso,
  );
  const pendingApprovals = buildPendingApprovals(data);

  function itemRow(item: CalendarItem) {
    return (
      <div className="rounded-lg border bg-muted/20 p-3 text-sm" key={item.id}>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="font-medium">
            {item.platform} / {item.contentTopic}
          </p>
          <StatusLabel status={item.status} />
        </div>
        <p className="mt-1 text-xs leading-5 text-muted-foreground">
          {item.plannedDate ?? item.date}
          {item.owner ? ` / Owner: ${item.owner}` : ""}
          {item.reviewer ? ` / Reviewer: ${item.reviewer}` : ""}
          {item.approvalStage ? ` / Stage: ${item.approvalStage}` : ""}
        </p>
        {item.blocker ? (
          <p className="mt-1 text-xs leading-5 text-warning-foreground">
            Blocker: {item.blocker}
          </p>
        ) : null}
      </div>
    );
  }

  return (
    <section className="space-y-4">
      <Card>
        <CardHeader>
          <SectionTitle
            icon={CalendarDays}
            kicker="My day"
            title={`Today, ${todayIso}`}
            description="Just your work: what is assigned to you, what waits for your approval, and what is planned for today. Switch off My day in the header for the full workspace."
          />
        </CardHeader>
      </Card>

      <div className="grid gap-4 xl:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Assigned to me</CardTitle>
            <CardDescription>
              Calendar items where you are the owner or reviewer.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {!myName ? (
              <p className="text-sm leading-6 text-muted-foreground">
                Set your name in Reports (Approvals Log panel) so the workspace
                knows which items are yours.
              </p>
            ) : assignedToMe.length === 0 ? (
              <p className="text-sm leading-6 text-muted-foreground">
                Nothing is assigned to {data.approverName.trim()} right now.
              </p>
            ) : (
              assignedToMe.map((item) => itemRow(item))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Waiting for approval</CardTitle>
            <CardDescription>
              Draft AI output and content that needs a human decision.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {pendingApprovals.length === 0 ? (
              <p className="text-sm leading-6 text-muted-foreground">
                Nothing is waiting for a decision right now.
              </p>
            ) : (
              pendingApprovals.map((row) => (
                <div
                  className="flex items-center justify-between gap-2 rounded-lg border bg-muted/20 p-3 text-sm"
                  key={row.label}
                >
                  <div>
                    <p className="font-medium">{row.label}</p>
                    <p className="text-xs leading-5 text-muted-foreground">
                      Decide on the {row.where}
                    </p>
                  </div>
                  <span className="rounded-md border border-warning-border bg-warning px-2 py-0.5 text-xs font-semibold text-warning-foreground">
                    {row.count}
                  </span>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Today&apos;s calendar</CardTitle>
            <CardDescription>Items planned for {todayIso}.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {todaysItems.length === 0 ? (
              <p className="text-sm leading-6 text-muted-foreground">
                No calendar items are planned for today.
              </p>
            ) : (
              todaysItems.map((item) => itemRow(item))
            )}
          </CardContent>
        </Card>
      </div>
    </section>
  );
}

// Every accepted AI suggestion, from all six draft stores, as plain action
// lines. Used so that accepting a budget/KPI recommendation, an audit insight,
// a competitor insight, or a trend all show up consistently in the Dashboard
// and Reports "next actions", not just one of them.
function acceptedInsightLines(data: MarketingWorkspaceData): string[] {
  return [
    ...data.aiRecommendations
      .filter((rec) => rec.status === "accepted")
      .map((rec) => `${rec.subject}: ${rec.recommendation}`),
    ...data.auditInsights
      .filter((insight) => insight.status === "accepted")
      .map((insight) => `${insight.platform}: ${insight.recommendation}`),
    ...data.competitorInsights
      .filter((insight) => insight.status === "accepted")
      .map((insight) => `${insight.competitorName}: ${insight.insight}`),
    ...data.trendInsights
      .filter((trend) => trend.status === "accepted")
      .map((trend) => `${trend.title}: ${trend.contentAngle}`),
  ];
}

// The whole-system checklist (Module: cross-module health check). Each row is
// a real prerequisite with a plain rule for "done" and the screen that
// completes it, so the owner can see at a glance whether the app is connected.
type SetupStatusRow = {
  label: string;
  done: boolean;
  view: ViewId;
  next: string;
};

function buildSetupStatus(data: MarketingWorkspaceData): SetupStatusRow[] {
  const liveCourses = data.ucc.courses.filter((course) => course.status !== "archived");
  const complianceReviewed =
    data.complianceDocs.length > 0 ||
    data.calendar.some((item) =>
      ["compliance approved", "manager approved", "scheduled", "published"].includes(
        item.approvalStage ?? "idea",
      ),
    );

  return [
    {
      label: "Brand set up",
      done: data.brand.brandName.trim().length > 0,
      view: "brand",
      next: "Add your brand name and details on the Brand screen.",
    },
    {
      label: "Courses added",
      done: liveCourses.length > 0,
      view: "courses",
      next: "Add at least one course on Courses & Audiences.",
    },
    {
      label: "Audiences added",
      done: data.ucc.audiences.length > 0,
      view: "courses",
      next: "Add at least one audience on Courses & Audiences.",
    },
    {
      label: "Audit done",
      done: data.audits.length > 0,
      view: "objectives",
      next: "Record a platform audit on the Objectives screen.",
    },
    {
      label: "Brief approved",
      done: data.brief.approved,
      view: "brief",
      next: "Generate or edit the Strategy Brief, then approve it.",
    },
    {
      label: "Campaigns approved",
      done: data.ucc.campaigns.some(isCampaignApproved),
      view: "campaigns",
      next: "Approve at least one campaign on the Campaigns screen.",
    },
    {
      label: "Calendar generated",
      done: data.calendar.length > 0,
      view: "calendar",
      next: "Generate the content calendar from the approved brief.",
    },
    {
      label: "Compliance reviewed",
      done: complianceReviewed,
      view: "compliance",
      next: "Upload a guideline or move an item through the compliance stage.",
    },
  ];
}

// A plain-language tooltip for a jargon word. The word is shown with a dotted
// underline and a small question mark; the explanation appears on hover or
// keyboard focus, so a non-technical reader is never left guessing.
function HelpTip({
  children,
  explanation,
}: {
  children: ReactNode;
  explanation: string;
}) {
  return (
    <span className="group relative inline-flex items-center gap-0.5">
      <span className="underline decoration-dotted underline-offset-2">{children}</span>
      <button
        aria-label="What does this mean?"
        className="inline-flex h-4 w-4 items-center justify-center rounded-full border text-[10px] font-semibold leading-none text-muted-foreground"
        tabIndex={0}
        type="button"
      >
        ?
      </button>
      <span
        className="pointer-events-none absolute left-0 top-full z-40 mt-1 hidden w-64 rounded-md border bg-card p-2 text-xs font-normal normal-case leading-5 text-foreground shadow-md group-hover:block group-focus-within:block"
        role="tooltip"
      >
        {explanation}
      </span>
    </span>
  );
}

// One plain-English line per major screen: what it is for and the single most
// useful thing to do. Jargon is explained inline the first time it appears.
const SCREEN_HELP: Partial<Record<ViewId, ReactNode>> = {
  dashboard: (
    <>
      Your overview of everything. New here? Follow the Setup status checklist
      in the side panel to connect the whole system, one step at a time.
    </>
  ),
  brand: (
    <>
      Your brand name, voice, colours, and goals. The app uses these to keep
      every piece of content on brand. This is the first thing to fill in.
    </>
  ),
  objectives: (
    <>
      Set your main goal and record a quick{" "}
      <HelpTip explanation="An audit is a simple snapshot of how each social account is doing now (followers, reach, engagement), so you can measure progress later.">
        audit
      </HelpTip>{" "}
      of where each platform stands today. Pick which{" "}
      <HelpTip explanation="The funnel is the journey from a stranger noticing you, to a lead enquiring, to an enrolment. Choose the stage you most want to improve.">
        funnel
      </HelpTip>{" "}
      stage you want to improve.
    </>
  ),
  courses: (
    <>
      List the courses you offer and the audiences you offer them to. Start by
      selecting Add course, then Add audience.
    </>
  ),
  campaigns: (
    <>
      Group your marketing into campaigns. Add a campaign, then approve it so it
      can feed the content calendar.
    </>
  ),
  platform: (
    <>
      See which platform suits each audience, scan live trends, research what
      real people are saying, connect Metricool, and record real KPI results
      against target.
    </>
  ),
  brief: (
    <>
      The brief is your plan, built from content{" "}
      <HelpTip explanation="A content pillar is a recurring theme you post about, for example 'student success' or 'course proof'. A few pillars keep your content focused.">
        pillars
      </HelpTip>{" "}
      and angles. Fill it in or generate a draft, then Approve it to unlock the
      calendar.
    </>
  ),
  calendar: (
    <>
      Your month of posts. Generate it from the approved brief, then open any
      item to refine its hook,{" "}
      <HelpTip explanation="CTA means 'call to action': the one thing you want the reader to do next, for example 'Book a campus tour' or 'Enquire now'.">
        CTA
      </HelpTip>
      , and caption.
    </>
  ),
  production: (
    <>
      Where each post is written, checked, and approved. Move an item all the
      way to &ldquo;manager approved&rdquo; when it is ready to publish.
    </>
  ),
  budget: (
    <>
      Plan the cost of each campaign. The AI review suggests changes as drafts
      you accept or dismiss; it never changes your numbers.
    </>
  ),
  competitors: (
    <>
      Track what other colleges are doing and turn it into insights you can
      accept or dismiss.
    </>
  ),
  compliance: (
    <>
      Check any wording against the education marketing rules before it goes
      out. Paste a caption to see any risky claims flagged.
    </>
  ),
  reports: (
    <>
      Your weekly summary, the approvals audit trail, and exports for
      management.
    </>
  ),
  settings: (
    <>
      Connect AI and Supabase, manage connections, and load sample data or start
      empty. Your brand details now live on the Brand screen.
    </>
  ),
};

function ScreenHelpHint({
  dismissed,
  onDismiss,
  view,
}: {
  dismissed: string[];
  onDismiss: (view: ViewId) => void;
  view: ViewId;
}) {
  const help = SCREEN_HELP[view];

  if (!help || dismissed.includes(view)) {
    return null;
  }

  return (
    <div className="flex items-start justify-between gap-3 rounded-lg border border-info-border bg-info p-3 text-sm leading-6 text-info-foreground">
      <p>
        <span className="font-semibold">Need help? </span>
        {help}
      </p>
      <button
        aria-label="Dismiss this tip"
        className="shrink-0 rounded-md border border-info-border px-2 py-0.5 text-xs font-medium"
        onClick={() => onDismiss(view)}
        type="button"
      >
        Got it
      </button>
    </div>
  );
}

// The five steps from a blank workspace to a working calendar, shown once on
// a brand-new empty workspace and dismissible. Each step links to its screen
// and ticks itself off as the owner completes it.
function FirstRunChecklist({
  data,
  onDismiss,
  onNavigate,
}: {
  data: MarketingWorkspaceData;
  onDismiss: () => void;
  onNavigate: (view: ViewId) => void;
}) {
  const steps: Array<{ label: string; done: boolean; view: ViewId }> = [
    {
      label: "1. Set up your brand on the Brand screen",
      done: data.brand.brandName.trim().length > 0,
      view: "brand",
    },
    {
      label: "2. Add your courses and audiences",
      done:
        data.ucc.courses.some((course) => course.status !== "archived") &&
        data.ucc.audiences.length > 0,
      view: "courses",
    },
    {
      label: "3. Record an audit and set your objectives",
      done: data.audits.length > 0,
      view: "objectives",
    },
    {
      label: "4. Generate the Strategy Brief and approve it",
      done: data.brief.approved,
      view: "brief",
    },
    {
      label: "5. Approve a campaign, then generate the Content Calendar",
      done: data.ucc.campaigns.some(isCampaignApproved) && data.calendar.length > 0,
      view: "calendar",
    },
  ];

  return (
    <Card>
      <CardHeader className="flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <SectionTitle
          icon={ListChecks}
          kicker="Getting started"
          title="Your first five steps"
          description="A blank workspace becomes a working calendar in five steps. Select any step to open its screen. Dismiss this once you are set up."
        />
        <Button onClick={onDismiss} size="sm" type="button" variant="outline">
          <X className="h-4 w-4" />
          Dismiss
        </Button>
      </CardHeader>
      <CardContent className="space-y-2">
        {steps.map((step) => (
          <button
            className="flex w-full items-start gap-3 rounded-lg border bg-muted/20 p-3 text-left transition-colors hover:bg-muted/40"
            key={step.label}
            onClick={() => onNavigate(step.view)}
            type="button"
          >
            <span
              aria-hidden="true"
              className={cn(
                "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-xs font-bold",
                step.done
                  ? "border-success-border bg-success text-success-foreground"
                  : "border-border bg-background text-muted-foreground",
              )}
            >
              {step.done ? "✓" : ""}
            </span>
            <span className="text-sm leading-6">{step.label}</span>
          </button>
        ))}
      </CardContent>
    </Card>
  );
}

// The "Is the system connected?" checklist, in a compact collapsible card that
// sits in the Dashboard side rail rather than dominating the top. Every row and
// the click-to-jump behaviour are unchanged; only the footprint is smaller.
function DashboardSetupStatus({
  data,
  onNavigate,
}: {
  data: MarketingWorkspaceData;
  onNavigate: (view: ViewId) => void;
}) {
  const rows = buildSetupStatus(data);
  const doneCount = rows.filter((row) => row.done).length;
  const [open, setOpen] = useState(true);

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between gap-2 space-y-0 py-3">
        <div className="flex min-w-0 items-center gap-2">
          <ListChecks className="h-4 w-4 shrink-0 text-muted-foreground" />
          <CardTitle className="truncate text-sm">Setup status</CardTitle>
          <Badge variant={doneCount === rows.length ? "success" : "info"}>
            {doneCount}/{rows.length}
          </Badge>
        </div>
        <button
          aria-expanded={open}
          aria-label={open ? "Collapse setup status" : "Expand setup status"}
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md border text-muted-foreground transition-colors hover:bg-muted/40"
          onClick={() => setOpen((value) => !value)}
          type="button"
        >
          {open ? (
            <ChevronUp className="h-4 w-4" />
          ) : (
            <ChevronDown className="h-4 w-4" />
          )}
        </button>
      </CardHeader>
      {open ? (
        <CardContent className="space-y-1.5 pt-0">
          {rows.map((row) => (
            <button
              className="flex w-full items-center gap-2 rounded-md border bg-muted/20 px-2.5 py-1.5 text-left text-xs transition-colors hover:bg-muted/40"
              key={row.label}
              onClick={() => onNavigate(row.view)}
              title={row.done ? "Ready" : row.next}
              type="button"
            >
              <span
                className={cn(
                  "flex h-4 w-4 shrink-0 items-center justify-center rounded-full border text-[10px] font-bold",
                  row.done
                    ? "border-success-border bg-success text-success-foreground"
                    : "border-warning-border bg-warning text-warning-foreground",
                )}
                aria-hidden="true"
              >
                {row.done ? "✓" : "✗"}
              </span>
              <span className="min-w-0 flex-1 truncate font-medium">
                {row.label}
              </span>
            </button>
          ))}
          <p className="pt-1 text-[11px] leading-4 text-muted-foreground">
            Select a row to jump to the screen that completes it.
          </p>
        </CardContent>
      ) : null}
    </Card>
  );
}

function SgMomentNudgePanel({
  onNavigate,
}: {
  onNavigate: (view: ViewId) => void;
}) {
  // Only real, upcoming Singapore moments from the built-in calendar. Every
  // day count is derived from today's date, so nothing here is invented.
  const nudges = sgMomentNudges(new Date()).slice(0, 3);

  if (nudges.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <SectionTitle
          icon={CalendarDays}
          kicker="Singapore moments"
          title="Timely campaign prompts"
          description="Upcoming Singapore marketing moments from the built-in calendar. These are suggestions only; you decide whether to act."
        />
      </CardHeader>
      <CardContent className="space-y-2">
        {nudges.map((nudge) => (
          <div
            className="flex flex-wrap items-center justify-between gap-2 rounded-lg border bg-muted/20 p-3"
            key={nudge.moment.id}
          >
            <div className="min-w-0">
              <p className="text-sm font-semibold">{nudge.message}</p>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">
                {nudge.moment.relevance}
              </p>
            </div>
            <Button
              onClick={() => onNavigate("campaigns")}
              size="sm"
              type="button"
              variant="outline"
            >
              Draft a campaign
            </Button>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

// A transparent Marketing Health Score computed only from data already in the
// workspace: audit strength, KPI channels on track, production readiness, and
// setup completion. Components with no data yet are left out rather than
// invented, and the contributing parts are shown next to the number.
function computeMarketingHealth(data: MarketingWorkspaceData): {
  score: number;
  parts: string[];
} {
  const components: Array<{ label: string; value: number }> = [];

  if (data.audits.length > 0) {
    const auditAverage = Math.round(
      data.audits.reduce((sum, audit) => sum + calculateAuditScore(audit), 0) /
        data.audits.length,
    );
    components.push({ label: `audit ${auditAverage}%`, value: auditAverage });
  }

  const decidedKpis = data.ucc.kpiRecords.filter((row) =>
    ["on track", "exceeded target", "behind target", "needs attention"].includes(
      row.status,
    ),
  );

  if (decidedKpis.length > 0) {
    const strong = decidedKpis.filter(
      (row) => row.status === "on track" || row.status === "exceeded target",
    ).length;
    const kpiScore = Math.round((strong / decidedKpis.length) * 100);
    components.push({ label: `KPIs on track ${kpiScore}%`, value: kpiScore });
  }

  if (data.calendar.length > 0) {
    const ready = data.calendar.filter((item) =>
      ["approved", "scheduled", "posted"].includes(item.status),
    ).length;
    const productionScore = Math.round((ready / data.calendar.length) * 100);
    components.push({
      label: `production ${productionScore}%`,
      value: productionScore,
    });
  }

  const setupRows = buildSetupStatus(data);
  const setupScore = Math.round(
    (setupRows.filter((row) => row.done).length / setupRows.length) * 100,
  );
  components.push({ label: `setup ${setupScore}%`, value: setupScore });

  const score = Math.round(
    components.reduce((sum, part) => sum + part.value, 0) / components.length,
  );

  return { score, parts: components.map((part) => part.label) };
}

function ManagementDashboardView({
  data,
  onNavigate,
}: {
  data: MarketingWorkspaceData;
  onNavigate: (view: ViewId) => void;
}) {
  const totalBudget = data.ucc.budgetPlans.reduce(
    (sum, budget) => sum + budget.totalCost,
    0,
  );
  const totalSpend = data.ucc.campaigns.reduce(
    (sum, campaign) => sum + campaign.actualResults.spend,
    0,
  );
  const totalLeads = data.ucc.kpiRecords.reduce((sum, row) => sum + row.leads, 0);
  const delayedItems = data.calendar.filter((item) =>
    ["revision", "drafting", "review"].includes(item.status) ||
    item.approvalStage === "revision",
  );
  const strongKpis = data.ucc.kpiRecords.filter(
    (row) => row.status === "on track" || row.status === "exceeded target",
  );
  const weakKpis = data.ucc.kpiRecords.filter(
    (row) => row.status === "behind target" || row.status === "needs attention",
  );
  const pendingApprovals = buildPendingApprovals(data);
  const pendingApprovalCount = pendingApprovals.reduce(
    (sum, row) => sum + row.count,
    0,
  );
  const health = computeMarketingHealth(data);
  const productionReady = data.calendar.filter((item) =>
    ["approved", "scheduled", "posted"].includes(item.status),
  ).length;
  const productionPercent =
    data.calendar.length > 0
      ? Math.round((productionReady / data.calendar.length) * 100)
      : 0;

  // Data-honesty gates. In sample mode every business figure is demo, so it is
  // shown with a "Sample" tag and a banner rather than passed off as real. In
  // live mode a figure is only shown when there is real data behind it;
  // otherwise it reads "No data yet" instead of a stale or zero-implying value.
  const isSample = (data.datasetMode ?? "sample") === "sample";
  const hasKpiData = data.ucc.kpiRecords.length > 0;
  const hasBudgetData = data.ucc.budgetPlans.length > 0 || totalSpend > 0;
  const totalApplications = data.ucc.kpiRecords.reduce(
    (sum, row) => sum + row.applications,
    0,
  );
  // Only approved campaigns appear in the Objective Cascade; unapproved drafts
  // are never shown with budget or recommendation as if they were decided.
  const approvedCampaigns = data.ucc.campaigns.filter(isCampaignApproved);
  const postedCount = data.calendar.filter(
    (item) => item.status === "posted" || item.approvalStage === "published",
  ).length;
  const acceptedActionLines = acceptedInsightLines(data);
  // KPI-derived report lines are demo in sample mode; suffix them so nobody
  // reads a seed recommendation as a real next action.
  const sampleSuffix = isSample ? " (sample)" : "";

  const quickActions: Array<{ label: string; view: ViewId }> = [
    { label: "Create campaign", view: "campaigns" },
    { label: "Generate strategy", view: "brief" },
    { label: "Add product or audience", view: "courses" },
    { label: "View calendar", view: "calendar" },
    { label: "Generate report", view: "reports" },
    { label: "Update brand", view: "brand" },
  ];

  return (
    <section className="space-y-4">
      {isSample ? (
        <div className="flex items-start gap-2 rounded-lg border border-warning-border bg-warning p-3 text-warning-foreground">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <p className="text-sm leading-5">
            You are viewing sample data. Figures marked <SampleTag /> are a demo,
            not real UCC results. Go to Integrations &amp; Settings and choose
            &quot;Start empty&quot; to enter your own data.
          </p>
        </div>
      ) : null}

      {/* CHANGE 2: the four summary cards are the first thing on the Dashboard. */}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardContent className="pt-5">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Marketing health score
            </p>
            <p className="mt-2 text-3xl font-semibold">{health.score}%</p>
            <p className="mt-2 text-xs leading-5 text-muted-foreground">
              Computed from {health.parts.join(", ")}. No numbers are invented.
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Active campaigns
            </p>
            <p className="mt-2 text-3xl font-semibold">
              {data.ucc.campaigns.filter((item) => item.status === "active").length}
            </p>
            <p className="mt-2 text-xs leading-5 text-muted-foreground">
              {data.ucc.campaigns.length} total,{" "}
              {data.ucc.campaigns.filter(isCampaignApproved).length} approved.
              Campaigns are strategic containers, not task boards.
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Production progress
            </p>
            <p className="mt-2 text-3xl font-semibold">{productionPercent}%</p>
            <p className="mt-2 text-xs leading-5 text-muted-foreground">
              {productionReady} of {data.calendar.length} items approved,
              scheduled, or posted. {delayedItems.length} in draft, review, or
              revision.
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Pending approvals
            </p>
            <p className="mt-2 text-3xl font-semibold">{pendingApprovalCount}</p>
            <p className="mt-2 text-xs leading-5 text-muted-foreground">
              Waiting for your decision. AI never approves or publishes.
            </p>
          </CardContent>
        </Card>
      </div>

      {/* CHANGE 1: main content on the left, a compact Setup status card and
          the Singapore moments in a slimmer side rail on the right. */}
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="min-w-0 space-y-4">
          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <CardTitle>Current Monthly Strategy</CardTitle>
                    <CardDescription>
                      The approved brief drives campaigns and the calendar.
                    </CardDescription>
                  </div>
                  <Badge variant={data.brief.approved ? "success" : "warning"}>
                    {data.brief.approved ? "Approved" : "Needs review"}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm leading-6">
                  {data.brief.approved
                    ? data.brief.monthlyCampaignGoal.trim() ||
                      "The approved brief has no monthly goal written yet."
                    : "Awaiting approval. Open Strategic Planning to review and approve the brief before it drives campaigns and the calendar."}
                </p>
                {data.brief.approved && data.brief.contentPillars.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {data.brief.contentPillars.slice(0, 4).map((pillar) => (
                      <Badge key={pillar} variant="outline">
                        {pillar}
                      </Badge>
                    ))}
                  </div>
                ) : null}
                <Button
                  onClick={() => onNavigate("brief")}
                  size="sm"
                  type="button"
                  variant="outline"
                >
                  Open Strategic Planning
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>KPI Snapshot</CardTitle>
                <CardDescription>
                  Live totals from the KPI Tracker and budget plans.
                </CardDescription>
              </CardHeader>
              <CardContent className="grid gap-3 sm:grid-cols-2">
                <LearningMetric
                  label="Leads generated"
                  sample={isSample}
                  value={
                    isSample || hasKpiData ? formatNumber(totalLeads) : "No data yet"
                  }
                  detail={
                    isSample || hasKpiData
                      ? `${formatNumber(totalApplications)} applications tracked`
                      : "Add KPI results in the KPI Tracker"
                  }
                />
                <LearningMetric
                  label="Budget used"
                  sample={isSample}
                  value={
                    isSample || hasBudgetData
                      ? `${formatNumber(totalSpend)} / ${formatNumber(totalBudget)}`
                      : "No data yet"
                  }
                  detail={
                    isSample || hasBudgetData
                      ? "Actual spend versus planned campaign cost"
                      : "Add budget plans and campaign spend"
                  }
                />
                <LearningMetric
                  label="Channels on track"
                  sample={isSample}
                  value={
                    isSample || hasKpiData ? String(strongKpis.length) : "No data yet"
                  }
                  detail={
                    isSample || hasKpiData
                      ? `${weakKpis.length} behind target or needing attention`
                      : "Record KPI results to track channels"
                  }
                />
                <LearningMetric
                  label="Approval watch"
                  value={String(delayedItems.length)}
                  detail="Items in draft, review, or revision"
                />
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
              <CardDescription>
                Jump straight to the next piece of work.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              {quickActions.map((action) => (
                <Button
                  key={action.view + action.label}
                  onClick={() => onNavigate(action.view)}
                  size="sm"
                  type="button"
                  variant="outline"
                >
                  {action.label}
                </Button>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Objective Cascade</CardTitle>
              <CardDescription>
                Business objective to audience, course, platform, campaign, content,
                budget, KPI, actual result, and recommendation.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {approvedCampaigns.length === 0 ? (
                <p className="text-sm leading-6 text-muted-foreground">
                  No approved campaigns yet. Approve a campaign on the Campaigns
                  screen and it will appear here with its objective cascade.
                </p>
              ) : (
                approvedCampaigns.slice(0, 4).map((campaign) => {
                  const course = findCourse(data.ucc, campaign.courseId);
                  const audience = findAudience(data.ucc, campaign.audienceId);
                  const budget = data.ucc.budgetPlans.find(
                    (row) => row.campaignId === campaign.id,
                  );
                  const campaignKpis = data.ucc.kpiRecords.filter(
                    (row) => row.campaignId === campaign.id,
                  );
                  const recommendation = campaignKpis[0]?.recommendation;

                  return (
                    <div className="rounded-lg border bg-muted/20 p-3" key={campaign.id}>
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div>
                          <p className="text-sm font-semibold">{campaign.name}</p>
                          <p className="mt-1 text-xs leading-5 text-muted-foreground">
                            {campaign.objective}
                          </p>
                        </div>
                        <StatusLabel status={getCampaignStatus(campaign)} />
                      </div>
                      <div className="mt-3 grid gap-2 text-xs leading-5 md:grid-cols-2">
                        <p><span className="font-medium">Audience:</span> {audience?.name}</p>
                        <p><span className="font-medium">Course:</span> {course?.category}</p>
                        <p><span className="font-medium">Channels:</span> {campaign.platformMix.join(", ")}</p>
                        <p>
                          <span className="font-medium">Budget:</span>{" "}
                          {formatNumber(budget?.totalCost ?? campaign.budget)}
                          {isSample ? <SampleTag /> : null}
                        </p>
                      </div>
                      <p className="mt-3 text-xs leading-5 text-muted-foreground">
                        Recommendation:{" "}
                        {recommendation
                          ? `${recommendation}${sampleSuffix}`
                          : "Add KPI results to generate the next action."}
                      </p>
                    </div>
                  );
                })
              )}
            </CardContent>
          </Card>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Approvals Pending</CardTitle>
                <CardDescription>
                  Everything waiting for your decision. AI never approves or
                  publishes anything; these stay drafts until you act.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                {pendingApprovals.length === 0 ? (
                  <p className="text-sm leading-6 text-muted-foreground">
                    Nothing is waiting for your decision right now.
                  </p>
                ) : (
                  pendingApprovals.map((row) => (
                    <div
                      className="flex items-center justify-between gap-2 rounded-lg border bg-muted/20 p-3 text-sm"
                      key={row.label}
                    >
                      <div>
                        <p className="font-medium">{row.label}</p>
                        <p className="text-xs leading-5 text-muted-foreground">
                          Decide on the {row.where}
                        </p>
                      </div>
                      <span className="rounded-md border border-warning-border bg-warning px-2 py-0.5 text-xs font-semibold text-warning-foreground">
                        {row.count}
                      </span>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Weekly Report Snapshot</CardTitle>
                <CardDescription>Management summary for this working week.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <InsightList
                  items={[
                    `${postedCount} items posted or published`,
                    `${delayedItems.length} items delayed or still in review`,
                    `${strongKpis.length} channels on track or exceeding target${sampleSuffix}`,
                  ]}
                  title="What happened"
                  variant="info"
                />
                <InsightList
                  items={[
                    ...weakKpis.map((row) => `${row.recommendation}${sampleSuffix}`),
                    ...acceptedActionLines,
                  ].slice(0, 6)}
                  title="Next actions"
                  variant="warning"
                />
                {weakKpis.length === 0 && acceptedActionLines.length === 0 ? (
                  <p className="text-xs leading-5 text-muted-foreground">
                    Next actions appear here from KPI records that need attention
                    and from any AI suggestion you accept (budget, KPI, audit,
                    competitor, or trend).
                  </p>
                ) : null}
              </CardContent>
            </Card>
          </div>
        </div>

        <aside className="space-y-4">
          <DashboardSetupStatus data={data} onNavigate={onNavigate} />
          <SgMomentNudgePanel onNavigate={onNavigate} />
        </aside>
      </div>
    </section>
  );
}

const COURSE_CATEGORY_OPTIONS: UccCourseCategory[] = [
  "Full-time courses",
  "Short courses",
  "English courses",
  "AI courses",
  "Business courses",
  "Hospitality courses",
  "Future Master pathway",
  "ATO-related courses",
];

const AUDIENCE_CHANNEL_OPTIONS: UccMarketingChannel[] = [
  "Instagram",
  "TikTok",
  "YouTube Shorts",
  "LinkedIn",
  "Facebook",
  "X/Twitter",
  "Threads",
  "Xiaohongshu",
  "WeChat",
];

function CoursesAudiencesView({
  onOfferUndo,
  onUccChange,
  ucc,
}: {
  onOfferUndo: (message: string, onExpire?: () => void) => void;
  onUccChange: (ucc: UccStrategyData) => void;
  ucc: UccStrategyData;
}) {
  const [showArchived, setShowArchived] = useState(false);
  const [courseEditor, setCourseEditor] = useState<UccCourse | null>(null);
  const [audienceEditor, setAudienceEditor] = useState<UccAudience | null>(null);
  const [selectedCourseId, setSelectedCourseId] = useState("");

  function updateCourse(id: string, patch: Partial<UccCourse>) {
    onUccChange({
      ...ucc,
      courses: ucc.courses.map((course) =>
        course.id === id ? { ...course, ...patch } : course,
      ),
    });
  }

  function saveCourse(course: UccCourse) {
    const exists = ucc.courses.some((row) => row.id === course.id);
    onUccChange({
      ...ucc,
      courses: exists
        ? ucc.courses.map((row) => (row.id === course.id ? course : row))
        : [...ucc.courses, course],
    });
    setCourseEditor(null);
  }

  function deleteCourse(course: UccCourse) {
    if (typeof window !== "undefined") {
      const confirmed = window.confirm(
        `Delete the course "${course.name || "Untitled"}"? You will have 10 seconds to undo.`,
      );

      if (!confirmed) {
        return;
      }
    }

    onOfferUndo(`Course "${course.name || "Untitled"}" deleted.`);
    onUccChange({
      ...ucc,
      courses: ucc.courses.filter((row) => row.id !== course.id),
    });
  }

  function saveAudience(audience: UccAudience) {
    const exists = ucc.audiences.some((row) => row.id === audience.id);
    onUccChange({
      ...ucc,
      audiences: exists
        ? ucc.audiences.map((row) => (row.id === audience.id ? audience : row))
        : [...ucc.audiences, audience],
    });
    setAudienceEditor(null);
  }

  function deleteAudience(audience: UccAudience) {
    if (typeof window !== "undefined") {
      const confirmed = window.confirm(
        `Delete the audience "${audience.name || "Untitled"}"? You will have 10 seconds to undo.`,
      );

      if (!confirmed) {
        return;
      }
    }

    onOfferUndo(`Audience "${audience.name || "Untitled"}" deleted.`);
    onUccChange({
      ...ucc,
      audiences: ucc.audiences.filter((row) => row.id !== audience.id),
    });
  }

  const liveCourses = ucc.courses.filter((course) => course.status !== "archived");
  const visibleCourses = showArchived ? ucc.courses : liveCourses;
  const selectedCourse = visibleCourses.find((course) => course.id === selectedCourseId) ?? null;
  const selectedCourseAudienceNames = selectedCourse
    ? selectedCourse.audienceIds
        .map((id) => ucc.audiences.find((audience) => audience.id === id)?.name)
        .filter((name): name is string => Boolean(name))
    : [];

  return (
    <section className="space-y-4">
      <Card>
        <CardHeader>
          <SectionTitle
            icon={GraduationCap}
            kicker="Database"
            title="UCC Courses & Audiences"
            description="Manage the courses and audience segments used by campaigns, channel recommendations, content planning, and KPI reporting."
          />
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {COURSE_CATEGORY_OPTIONS.map((category) => {
            const count = liveCourses.filter((course) => course.category === category).length;

            return (
              <div className="rounded-lg border bg-muted/20 p-3" key={category}>
                <p className="text-sm font-semibold">{category}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {count} active course{count === 1 ? "" : "s"}
                </p>
              </div>
            );
          })}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <CardTitle>Courses</CardTitle>
              <CardDescription>
                Add, edit, archive, or delete courses. Quick edits to proof and
                compliance can be made inline in the table.
              </CardDescription>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <label className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                <input
                  checked={showArchived}
                  onChange={(event) => setShowArchived(event.target.checked)}
                  type="checkbox"
                />
                Show archived
              </label>
              <Button onClick={() => setCourseEditor(makeNewCourse())} size="sm" type="button">
                <Plus className="h-4 w-4" />
                Add course
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {visibleCourses.length === 0 ? (
            <EmptyState
              action="No courses to show. Use Add course to create one, or turn on Show archived."
              icon={GraduationCap}
              title="No courses yet"
            />
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {visibleCourses.map((course) => (
                <button
                  className="rounded-lg border bg-card p-4 text-left transition hover:border-primary/50 hover:shadow-sm"
                  key={course.id}
                  onClick={() => setSelectedCourseId(course.id)}
                  type="button"
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-semibold">{course.name || "Untitled course"}</p>
                    <Badge variant={course.status === "archived" ? "secondary" : "outline"}>
                      {course.status === "archived" ? "Archived" : course.status}
                    </Badge>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">{course.category}</p>
                  {course.description ? (
                    <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">
                      {course.description}
                    </p>
                  ) : null}
                </button>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {selectedCourse ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={() => setSelectedCourseId("")}
        >
          <div
            className="max-h-[85vh] w-full max-w-2xl overflow-y-auto rounded-lg border bg-card p-6 shadow-lg"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-lg font-semibold">
                  {selectedCourse.name || "Untitled course"}
                </p>
                <p className="text-sm text-muted-foreground">{selectedCourse.category}</p>
              </div>
              <Button
                onClick={() => setSelectedCourseId("")}
                size="sm"
                type="button"
                variant="outline"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="mt-4 space-y-3 text-sm">
              <Badge variant={selectedCourse.status === "archived" ? "secondary" : "outline"}>
                {selectedCourse.status === "archived" ? "Archived" : selectedCourse.status}
              </Badge>

              {selectedCourse.description ? (
                <div>
                  <p className="font-medium">Description</p>
                  <p className="text-muted-foreground">{selectedCourse.description}</p>
                </div>
              ) : null}
              {selectedCourse.usp ? (
                <div>
                  <p className="font-medium">Unique selling point</p>
                  <p className="text-muted-foreground">{selectedCourse.usp}</p>
                </div>
              ) : null}
              {selectedCourse.duration ? (
                <div>
                  <p className="font-medium">Duration</p>
                  <p className="text-muted-foreground">{selectedCourse.duration}</p>
                </div>
              ) : null}
              {selectedCourse.entryRequirements ? (
                <div>
                  <p className="font-medium">Entry requirements</p>
                  <p className="text-muted-foreground">{selectedCourse.entryRequirements}</p>
                </div>
              ) : null}
              {selectedCourse.fees ? (
                <div>
                  <p className="font-medium">Fees</p>
                  <p className="text-muted-foreground">{selectedCourse.fees}</p>
                </div>
              ) : null}
              {selectedCourse.sellingPoints && selectedCourse.sellingPoints.length > 0 ? (
                <div>
                  <p className="font-medium">Selling points</p>
                  <ul className="list-disc pl-5 text-muted-foreground">
                    {selectedCourse.sellingPoints.map((point, index) => (
                      <li key={index}>{point}</li>
                    ))}
                  </ul>
                </div>
              ) : null}
              {selectedCourse.courseProof.length > 0 ? (
                <div>
                  <p className="font-medium">Supporting evidence</p>
                  <ul className="list-disc pl-5 text-muted-foreground">
                    {selectedCourse.courseProof.map((point, index) => (
                      <li key={index}>{point}</li>
                    ))}
                  </ul>
                </div>
              ) : null}
              {selectedCourse.complianceNotes ? (
                <div>
                  <p className="font-medium">Compliance notes</p>
                  <p className="text-muted-foreground">{selectedCourse.complianceNotes}</p>
                </div>
              ) : null}
              {selectedCourseAudienceNames.length > 0 ? (
                <div>
                  <p className="font-medium">Audiences</p>
                  <p className="text-muted-foreground">{selectedCourseAudienceNames.join(", ")}</p>
                </div>
              ) : null}
              {selectedCourse.sourceLink ? (
                <div>
                  <p className="font-medium">Source</p>
                  <a
                    className="text-primary underline"
                    href={selectedCourse.sourceLink}
                    rel="noreferrer"
                    target="_blank"
                  >
                    View source
                  </a>
                </div>
              ) : null}
            </div>

            <div className="mt-5 flex flex-wrap gap-1.5">
              <Button
                onClick={() => {
                  setCourseEditor(selectedCourse);
                  setSelectedCourseId("");
                }}
                size="sm"
                type="button"
                variant="outline"
              >
                Edit
              </Button>
              {selectedCourse.status === "archived" ? (
                <Button
                  onClick={() => updateCourse(selectedCourse.id, { status: "active" })}
                  size="sm"
                  type="button"
                  variant="outline"
                >
                  <ArchiveRestore className="h-4 w-4" />
                  Unarchive
                </Button>
              ) : (
                <Button
                  onClick={() => updateCourse(selectedCourse.id, { status: "archived" })}
                  size="sm"
                  type="button"
                  variant="outline"
                >
                  <Archive className="h-4 w-4" />
                  Archive
                </Button>
              )}
              <Button
                onClick={() => {
                  deleteCourse(selectedCourse);
                  setSelectedCourseId("");
                }}
                size="sm"
                type="button"
                variant="outline"
              >
                <Trash2 className="h-4 w-4" />
                Delete
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <CardTitle>Audiences</CardTitle>
              <CardDescription>
                Add, edit, or delete audience profiles used across campaigns and
                content planning.
              </CardDescription>
            </div>
            <Button onClick={() => setAudienceEditor(makeNewAudience())} size="sm" type="button">
              <Plus className="h-4 w-4" />
              Add audience
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {ucc.audiences.length === 0 ? (
            <EmptyState
              action="No audiences yet. Use Add audience to create one."
              icon={UsersRound}
              title="No audiences yet"
            />
          ) : (
            ucc.audiences.map((audience) => (
              <div className="rounded-lg border bg-muted/20 p-3" key={audience.id}>
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <Badge variant="secondary">{audience.name || "Untitled audience"}</Badge>
                    <span className="ml-2 text-xs text-muted-foreground">
                      {audience.languages.join(" / ")}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    <Button
                      onClick={() => setAudienceEditor(audience)}
                      size="sm"
                      type="button"
                      variant="outline"
                    >
                      Edit
                    </Button>
                    <Button
                      onClick={() => deleteAudience(audience)}
                      size="sm"
                      type="button"
                      variant="outline"
                    >
                      <Trash2 className="h-4 w-4" />
                      Delete
                    </Button>
                  </div>
                </div>
                {audience.nurtureAngle ? (
                  <p className="mt-2 text-sm leading-6">{audience.nurtureAngle}</p>
                ) : null}
                {audience.recommendedChannels.length > 0 ? (
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {audience.recommendedChannels.map((channel) => (
                      <Badge key={channel} variant="outline">
                        {channel}
                      </Badge>
                    ))}
                  </div>
                ) : null}
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {courseEditor ? (
        <CourseEditorSlideOver
          audiences={ucc.audiences}
          course={courseEditor}
          onCancel={() => setCourseEditor(null)}
          onSave={saveCourse}
        />
      ) : null}

      {audienceEditor ? (
        <AudienceEditorSlideOver
          audience={audienceEditor}
          onCancel={() => setAudienceEditor(null)}
          onSave={saveAudience}
        />
      ) : null}
    </section>
  );
}

function SlideOver({
  children,
  onCancel,
  title,
}: {
  children: ReactNode;
  onCancel: () => void;
  title: string;
}) {
  return (
    <div className="fixed inset-0 z-40 flex justify-end bg-background/60 backdrop-blur-sm">
      <div className="flex h-full w-full max-w-lg flex-col overflow-y-auto border-l bg-card p-5 shadow-soft">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h3 className="text-base font-semibold">{title}</h3>
          <Button aria-label="Close" onClick={onCancel} size="icon" type="button" variant="outline">
            <X className="h-4 w-4" />
          </Button>
        </div>
        {children}
      </div>
    </div>
  );
}

function CourseEditorSlideOver({
  audiences,
  course,
  onCancel,
  onSave,
}: {
  audiences: UccAudience[];
  course: UccCourse;
  onCancel: () => void;
  onSave: (course: UccCourse) => void;
}) {
  const [draft, setDraft] = useState<UccCourse>(course);

  function set<K extends keyof UccCourse>(field: K, value: UccCourse[K]) {
    setDraft((current) => ({ ...current, [field]: value }));
  }

  function toggleAudience(id: string) {
    setDraft((current) => ({
      ...current,
      audienceIds: current.audienceIds.includes(id)
        ? current.audienceIds.filter((value) => value !== id)
        : [...current.audienceIds, id],
    }));
  }

  const isNew = course.name === "" && course.courseProof.length === 0;

  return (
    <SlideOver onCancel={onCancel} title={isNew ? "Add course" : "Edit course"}>
      <div className="space-y-4">
        <Field label="Course name">
          <Input onChange={(event) => set("name", event.target.value)} value={draft.name} />
        </Field>
        <div className="grid gap-3 md:grid-cols-2">
          <Field label="Category">
            <NativeSelect
              onChange={(event) => set("category", event.target.value as UccCourseCategory)}
              value={draft.category}
            >
              {COURSE_CATEGORY_OPTIONS.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </NativeSelect>
          </Field>
          <Field label="Status">
            <NativeSelect
              onChange={(event) => set("status", event.target.value as UccCourse["status"])}
              value={draft.status}
            >
              <option value="active">Active</option>
              <option value="future">Future</option>
              <option value="paused">Paused</option>
              <option value="archived">Archived</option>
            </NativeSelect>
          </Field>
        </div>
        <Field label="Source URL">
          <Input
            onChange={(event) => set("sourceLink", event.target.value)}
            placeholder="https://..."
            value={draft.sourceLink ?? ""}
          />
        </Field>
        <Field label="Description">
          <Textarea onChange={(event) => set("description", event.target.value)} value={draft.description ?? ""} />
        </Field>
        <Field label="Unique selling point">
          <Textarea onChange={(event) => set("usp", event.target.value)} value={draft.usp ?? ""} />
        </Field>
        <div className="grid gap-3 md:grid-cols-2">
          <Field label="Duration">
            <Input onChange={(event) => set("duration", event.target.value)} value={draft.duration ?? ""} />
          </Field>
          <Field label="Fees">
            <Input onChange={(event) => set("fees", event.target.value)} value={draft.fees ?? ""} />
          </Field>
        </div>
        <Field label="Entry requirements">
          <Textarea
            onChange={(event) => set("entryRequirements", event.target.value)}
            value={draft.entryRequirements ?? ""}
          />
        </Field>
        <div>
          <p className="mb-2 text-sm font-medium text-foreground">Audience</p>
          {audiences.length === 0 ? (
            <p className="text-xs leading-5 text-muted-foreground">
              No audiences yet. Add audiences below to link them here.
            </p>
          ) : (
            <div className="grid gap-2 sm:grid-cols-2">
              {audiences.map((audience) => (
                <label
                  className="flex items-center gap-2 rounded-md border bg-background px-3 py-2 text-sm"
                  key={audience.id}
                >
                  <input
                    checked={draft.audienceIds.includes(audience.id)}
                    onChange={() => toggleAudience(audience.id)}
                    type="checkbox"
                  />
                  {audience.name || "Untitled audience"}
                </label>
              ))}
            </div>
          )}
        </div>
        <TextListField
          label="Selling points"
          onChange={(value) => set("sellingPoints", value)}
          value={draft.sellingPoints ?? []}
        />
        <TextListField
          label="Supporting evidence"
          onChange={(value) => set("courseProof", value)}
          value={draft.courseProof}
        />
        <Field label="Compliance notes">
          <Textarea
            onChange={(event) => set("complianceNotes", event.target.value)}
            value={draft.complianceNotes}
          />
        </Field>
        <div className="flex flex-wrap gap-2">
          <Button disabled={!draft.name.trim()} onClick={() => onSave(draft)} type="button">
            Save course
          </Button>
          <Button onClick={onCancel} size="sm" type="button" variant="outline">
            Cancel
          </Button>
        </div>
      </div>
    </SlideOver>
  );
}

function AudienceEditorSlideOver({
  audience,
  onCancel,
  onSave,
}: {
  audience: UccAudience;
  onCancel: () => void;
  onSave: (audience: UccAudience) => void;
}) {
  const [draft, setDraft] = useState<UccAudience>(audience);

  function set<K extends keyof UccAudience>(field: K, value: UccAudience[K]) {
    setDraft((current) => ({ ...current, [field]: value }));
  }

  function toggleChannel(channel: UccMarketingChannel) {
    setDraft((current) => ({
      ...current,
      recommendedChannels: current.recommendedChannels.includes(channel)
        ? current.recommendedChannels.filter((value) => value !== channel)
        : [...current.recommendedChannels, channel],
    }));
  }

  return (
    <SlideOver onCancel={onCancel} title={audience.name ? "Edit audience" : "Add audience"}>
      <div className="space-y-4">
        <Field label="Audience name">
          <Input onChange={(event) => set("name", event.target.value)} value={draft.name} />
        </Field>
        <TextListField label="Goals" onChange={(value) => set("motivations", value)} value={draft.motivations} />
        <TextListField label="Pain points" onChange={(value) => set("concerns", value)} value={draft.concerns} />
        <TextListField
          label="Interests"
          onChange={(value) => set("interests", value)}
          value={draft.interests ?? []}
        />
        <div>
          <p className="mb-2 text-sm font-medium text-foreground">Preferred platforms</p>
          <div className="grid gap-2 sm:grid-cols-2">
            {AUDIENCE_CHANNEL_OPTIONS.map((channel) => (
              <label
                className="flex items-center gap-2 rounded-md border bg-background px-3 py-2 text-sm"
                key={channel}
              >
                <input
                  checked={draft.recommendedChannels.includes(channel)}
                  onChange={() => toggleChannel(channel)}
                  type="checkbox"
                />
                {channel}
              </label>
            ))}
          </div>
        </div>
        <TextListField
          label="Preferred language"
          onChange={(value) => set("languages", value)}
          value={draft.languages}
        />
        <Field label="Buying journey">
          <Textarea
            onChange={(event) => set("buyingJourney", event.target.value)}
            value={draft.buyingJourney ?? ""}
          />
        </Field>
        <Field label="Decision makers">
          <Textarea
            onChange={(event) => set("decisionMakers", event.target.value)}
            value={draft.decisionMakers ?? ""}
          />
        </Field>
        <Field label="Nurture angle">
          <Textarea onChange={(event) => set("nurtureAngle", event.target.value)} value={draft.nurtureAngle} />
        </Field>
        <div className="flex flex-wrap gap-2">
          <Button disabled={!draft.name.trim()} onClick={() => onSave(draft)} type="button">
            Save audience
          </Button>
          <Button onClick={onCancel} size="sm" type="button" variant="outline">
            Cancel
          </Button>
        </div>
      </div>
    </SlideOver>
  );
}

function CampaignEditorSlideOver({
  onCancel,
  onSave,
  ucc,
}: {
  onCancel: () => void;
  onSave: (campaign: UccCampaign) => void;
  ucc: UccStrategyData;
}) {
  const [draft, setDraft] = useState<UccCampaign>({
    id: `campaign-${Date.now()}`,
    name: "",
    objective: "",
    courseId: ucc.courses[0]?.id ?? "",
    audienceId: ucc.audiences[0]?.id ?? "",
    funnelStage: funnelStages[0],
    platformMix: [],
    startDate: "",
    endDate: "",
    owner: "marketing manager",
    budget: 0,
    status: "planning",
    kpiTarget: { reach: 0, leads: 0, applications: 0, enrolments: 0, costPerLead: 0 },
    actualResults: { reach: 0, leads: 0, applications: 0, enrolments: 0, spend: 0 },
    approvalStatus: "draft",
  });

  function set<K extends keyof UccCampaign>(field: K, value: UccCampaign[K]) {
    setDraft((current) => ({ ...current, [field]: value }));
  }

  const channelOptions: UccMarketingChannel[] = [
    ...platforms,
    "Xiaohongshu",
    "WeChat",
    "Education fair",
    "Open house",
    "Campus visit",
    "Agent activity",
  ];

  function toggleChannel(channel: UccMarketingChannel) {
    setDraft((current) => ({
      ...current,
      platformMix: current.platformMix.includes(channel)
        ? current.platformMix.filter((value) => value !== channel)
        : [...current.platformMix, channel],
    }));
  }

  return (
    <SlideOver onCancel={onCancel} title="Add campaign">
      <div className="space-y-4">
        <Field label="Campaign name">
          <Input onChange={(event) => set("name", event.target.value)} value={draft.name} />
        </Field>
        <Field label="Objective">
          <Textarea
            onChange={(event) => set("objective", event.target.value)}
            value={draft.objective}
          />
        </Field>
        <div className="grid gap-3 md:grid-cols-2">
          <Field label="Course">
            <NativeSelect
              onChange={(event) => set("courseId", event.target.value)}
              value={draft.courseId}
            >
              {ucc.courses.map((course) => (
                <option key={course.id} value={course.id}>
                  {course.name}
                </option>
              ))}
            </NativeSelect>
          </Field>
          <Field label="Audience">
            <NativeSelect
              onChange={(event) => set("audienceId", event.target.value)}
              value={draft.audienceId}
            >
              {ucc.audiences.map((audience) => (
                <option key={audience.id} value={audience.id}>
                  {audience.name}
                </option>
              ))}
            </NativeSelect>
          </Field>
          <Field label="Start date">
            <Input
              onChange={(event) => set("startDate", event.target.value)}
              type="date"
              value={draft.startDate}
            />
          </Field>
          <Field label="End date">
            <Input
              onChange={(event) => set("endDate", event.target.value)}
              type="date"
              value={draft.endDate}
            />
          </Field>
          <Field label="Budget (S$)">
            <Input
              onChange={(event) => set("budget", toNumber(event.target.value))}
              type="number"
              value={draft.budget}
            />
          </Field>
          <Field label="Lead target">
            <Input
              onChange={(event) =>
                set("kpiTarget", { ...draft.kpiTarget, leads: toNumber(event.target.value) })
              }
              type="number"
              value={draft.kpiTarget.leads}
            />
          </Field>
        </div>
        <div>
          <p className="mb-2 text-sm font-medium text-foreground">Platform mix</p>
          <div className="grid gap-2 sm:grid-cols-2">
            {channelOptions.map((channel) => (
              <label
                className="flex items-center gap-2 rounded-md border bg-background px-3 py-2 text-sm"
                key={channel}
              >
                <input
                  checked={draft.platformMix.includes(channel)}
                  onChange={() => toggleChannel(channel)}
                  type="checkbox"
                />
                {channel}
              </label>
            ))}
          </div>
        </div>
        <p className="text-xs leading-5 text-muted-foreground">
          New campaigns start as drafts. Approve a campaign on its card before
          the AI calendar generator will plan content for it.
        </p>
        <div className="flex flex-wrap gap-2">
          <Button disabled={!draft.name.trim()} onClick={() => onSave(draft)} type="button">
            Save campaign
          </Button>
          <Button onClick={onCancel} size="sm" type="button" variant="outline">
            Cancel
          </Button>
        </div>
      </div>
    </SlideOver>
  );
}

function CampaignPlanningView({
  acceptedTrends,
  aiIntegration,
  auditInsights,
  brief,
  campaignSuggestions,
  competitorInsights,
  listeningResults,
  onCampaignSuggestionsChange,
  onOfferUndo,
  onRecordUsage,
  onUccChange,
  ucc,
}: {
  acceptedTrends: string[];
  aiIntegration: AiIntegrationSettings;
  auditInsights: AuditInsight[];
  brief: StrategyBrief;
  campaignSuggestions: CampaignSuggestion[];
  competitorInsights: CompetitorInsight[];
  listeningResults: ListeningResult[];
  onCampaignSuggestionsChange: (campaignSuggestions: CampaignSuggestion[]) => void;
  onOfferUndo: (message: string, onExpire?: () => void) => void;
  onRecordUsage: (module: string, model: string, usage: OpenAiUsage) => void;
  onUccChange: (ucc: UccStrategyData) => void;
  ucc: UccStrategyData;
}) {
  const [suggesting, setSuggesting] = useState(false);
  const [suggestError, setSuggestError] = useState("");
  const [campaignEditorOpen, setCampaignEditorOpen] = useState(false);

  const liveAi = isLiveAiEnabled(aiIntegration);

  async function suggestCampaigns() {
    setSuggesting(true);
    setSuggestError("");

    try {
      const response = await fetch(apiUrl("/api/ai/campaigns"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          apiKey: aiIntegration.apiKey,
          model: resolveModelForTask(aiIntegration, "analysis"),
          context: {
            todayIso: new Date().toISOString().slice(0, 10),
            brief: {
              monthlyCampaignGoal: brief.monthlyCampaignGoal,
              marketingObjectives: brief.marketingObjectives ?? [],
              contentPillars: brief.contentPillars,
              platformMix: brief.platformMix ?? "",
              keyAnglesToOwn: brief.keyAnglesToOwn,
            },
            acceptedAuditInsights: auditInsights
              .filter((insight) => insight.status === "accepted")
              .map((insight) => `${insight.platform}: ${insight.recommendation}`),
            acceptedCompetitorInsights: competitorInsights
              .filter((insight) => insight.status === "accepted")
              .map(
                (insight) =>
                  `${insight.competitorName} (${insight.kind}): ${insight.insight}`,
              ),
            acceptedListeningInsights: listeningResults
              .filter((result) => result.status === "accepted")
              .map((result) => `${result.topic}: ${result.insight}`),
            courses: ucc.courses
              .filter((course) => course.status !== "archived")
              .map((course) => ({
                name: course.name,
                category: course.category,
                usp: course.usp ?? "",
                complianceNotes: course.complianceNotes ?? "",
              })),
            audiences: ucc.audiences.map((audience) => ({
              name: audience.name,
              goals: audience.motivations,
              painPoints: audience.concerns,
              preferredChannels: audience.recommendedChannels ?? [],
            })),
            existingCampaignNames: ucc.campaigns.map((campaign) => campaign.name),
            sgMoments: formatMomentsForPrompt(upcomingSgMoments(new Date())),
            acceptedTrends,
          } satisfies CampaignAiContext,
        }),
      });
      const result = (await response.json()) as
        | {
            ok: true;
            suggestions: CampaignAiSuggestionDraft[];
            usage?: OpenAiUsage;
            model?: string;
          }
        | { ok: false; error: string };

      if (!result.ok) {
        setSuggestError(result.error);
        return;
      }

      onCampaignSuggestionsChange(
        suggestionDraftsToSuggestions(result.suggestions, result.model ?? "unknown"),
      );

      if (result.usage) {
        onRecordUsage("Campaign suggestions", result.model ?? "unknown", result.usage);
      }
    } catch (error) {
      setSuggestError(error instanceof Error ? error.message : String(error));
    } finally {
      setSuggesting(false);
    }
  }

  function acceptSuggestion(suggestion: CampaignSuggestion) {
    const campaign = suggestionToCampaign(suggestion, {
      courses: ucc.courses.filter((course) => course.status !== "archived"),
      audiences: ucc.audiences,
      validChannels: [
        ...platforms,
        "Xiaohongshu",
        "WeChat",
        "Education fair",
        "Open house",
        "Campus visit",
      ] as UccMarketingChannel[],
      defaultFunnelStage: ucc.campaigns[0]?.funnelStage ?? funnelStages[0],
    });

    onUccChange({ ...ucc, campaigns: [...ucc.campaigns, campaign] });
    onCampaignSuggestionsChange(
      campaignSuggestions.filter((row) => row.id !== suggestion.id),
    );
  }

  function dismissSuggestion(id: string) {
    onCampaignSuggestionsChange(campaignSuggestions.filter((row) => row.id !== id));
  }

  function deleteCampaign(campaign: UccCampaign) {
    if (typeof window !== "undefined") {
      const confirmed = window.confirm(
        `Delete the campaign "${campaign.name}"? You will have 10 seconds to undo.`,
      );

      if (!confirmed) {
        return;
      }
    }

    onOfferUndo(`Campaign "${campaign.name}" deleted.`);
    onUccChange({
      ...ucc,
      campaigns: ucc.campaigns.filter((row) => row.id !== campaign.id),
    });
  }

  function setCampaignApproval(id: string, approvalStatus: "draft" | "approved") {
    onUccChange({
      ...ucc,
      campaigns: ucc.campaigns.map((campaign) =>
        campaign.id === id ? { ...campaign, approvalStatus } : campaign,
      ),
    });
  }

  function addCampaign(campaign: UccCampaign) {
    onUccChange({ ...ucc, campaigns: [...ucc.campaigns, campaign] });
    setCampaignEditorOpen(false);
  }

  function updateCampaign(id: string, patch: Partial<UccCampaign>) {
    onUccChange({
      ...ucc,
      campaigns: ucc.campaigns.map((campaign) =>
        campaign.id === id ? { ...campaign, ...patch } : campaign,
      ),
    });
  }

  return (
    <section className="space-y-4">
      <Card>
        <CardHeader className="flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <SectionTitle
            icon={ClipboardCheck}
            kicker="Campaigns"
            title="Campaign-Level Planning"
            description="Plan objective, audience, course, platform mix, budget, timeline, content pieces, KPI target, owner, and actual results. Only approved campaigns feed the AI calendar generator."
          />
          <div className="flex flex-col items-stretch gap-2 sm:items-end">
            <div className="flex flex-wrap gap-2 sm:justify-end">
              <Button
                disabled={!liveAi || !brief.approved || suggesting}
                onClick={() => void suggestCampaigns()}
                size="sm"
                type="button"
                variant="outline"
              >
                <Sparkles className="h-4 w-4" />
                {suggesting ? "Suggesting" : "Suggest campaigns with AI"}
              </Button>
              <Button
                onClick={() => setCampaignEditorOpen(true)}
                size="sm"
                type="button"
              >
                <Plus className="h-4 w-4" />
                Add campaign
              </Button>
            </div>
            {!liveAi ? (
              <p className="text-xs leading-5 text-muted-foreground">
                Connect OpenAI in Settings to generate with AI.
              </p>
            ) : !brief.approved ? (
              <p className="text-xs leading-5 text-muted-foreground">
                Approve a strategy brief first.
              </p>
            ) : null}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {suggestError ? (
            <div className="rounded-md border border-warning-border bg-warning p-3 text-xs leading-5 text-warning-foreground">
              {suggestError}
            </div>
          ) : null}

          {campaignSuggestions.length > 0 ? (
            <div className="space-y-3 rounded-lg border bg-muted/20 p-3">
              <p className="text-sm font-semibold">
                AI campaign proposals, drafts awaiting your decision
              </p>
              {campaignSuggestions.map((suggestion) => (
                <div className="rounded-lg border bg-background p-3" key={suggestion.id}>
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <p className="text-sm font-semibold">{suggestion.name}</p>
                    <Badge variant="warning">AI draft</Badge>
                  </div>
                  <p className="mt-2 text-xs leading-5">{suggestion.objective}</p>
                  <div className="mt-2 grid gap-1 text-xs leading-5 text-muted-foreground md:grid-cols-2">
                    <p>
                      <span className="font-medium">Audience:</span>{" "}
                      {suggestion.audienceName}
                    </p>
                    <p>
                      <span className="font-medium">Courses:</span>{" "}
                      {suggestion.courseNames.join(", ") || "Not specified"}
                    </p>
                    <p>
                      <span className="font-medium">Platforms:</span>{" "}
                      {suggestion.platformMix.join(", ")}
                    </p>
                    <p>
                      <span className="font-medium">Dates:</span>{" "}
                      {suggestion.startDate} to {suggestion.endDate}
                    </p>
                    <p className="md:col-span-2">
                      <span className="font-medium">Timeline:</span> {suggestion.timeline}
                    </p>
                    <p className="md:col-span-2">
                      <span className="font-medium">SG moments:</span>{" "}
                      {suggestion.alignedMoments.join(", ") || "None named"}
                    </p>
                    <p className="md:col-span-2">
                      <span className="font-medium">Indicative budget:</span>{" "}
                      {suggestion.budgetSplit}
                    </p>
                    <p className="md:col-span-2">
                      <span className="font-medium">KPIs:</span>{" "}
                      {suggestion.kpis.join("; ")}
                    </p>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Button
                      onClick={() => acceptSuggestion(suggestion)}
                      size="sm"
                      type="button"
                    >
                      <CheckCircle2 className="h-4 w-4" />
                      Accept as draft campaign
                    </Button>
                    <Button
                      onClick={() => dismissSuggestion(suggestion.id)}
                      size="sm"
                      type="button"
                      variant="outline"
                    >
                      Dismiss
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : null}

          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {ucc.campaigns.map((campaign) => (
              <div className="rounded-lg border bg-muted/20 p-3" key={campaign.id}>
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-semibold leading-5">{campaign.name}</p>
                  <StatusLabel status={getCampaignStatus(campaign)} />
                </div>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {isCampaignApproved(campaign) ? (
                    <Badge variant="success">Approved</Badge>
                  ) : (
                    <Badge variant="warning">Draft, not approved</Badge>
                  )}
                </div>
                <p className="mt-2 text-xs leading-5 text-muted-foreground">
                  {campaign.objective}
                </p>
                {campaign.aiNotes ? (
                  <p className="mt-2 whitespace-pre-line text-xs leading-5 text-muted-foreground">
                    {campaign.aiNotes}
                  </p>
                ) : null}
                <Progress
                  className="mt-3"
                  value={percentOf(campaign.actualResults.leads, campaign.kpiTarget.leads)}
                />
                <p className="mt-2 text-xs text-muted-foreground">
                  {campaign.actualResults.leads}/{campaign.kpiTarget.leads} leads
                </p>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {isCampaignApproved(campaign) ? (
                    <Button
                      onClick={() => setCampaignApproval(campaign.id, "draft")}
                      size="sm"
                      type="button"
                      variant="outline"
                    >
                      Move back to draft
                    </Button>
                  ) : (
                    <Button
                      onClick={() => setCampaignApproval(campaign.id, "approved")}
                      size="sm"
                      type="button"
                    >
                      <CheckCircle2 className="h-4 w-4" />
                      Approve campaign
                    </Button>
                  )}
                  <Button
                    onClick={() => deleteCampaign(campaign)}
                    size="sm"
                    type="button"
                    variant="outline"
                  >
                    <Trash2 className="h-4 w-4" />
                    Delete
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {campaignEditorOpen ? (
        <CampaignEditorSlideOver
          ucc={ucc}
          onCancel={() => setCampaignEditorOpen(false)}
          onSave={addCampaign}
        />
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Campaign Matrix</CardTitle>
          <CardDescription>
            Campaign planning table connected to course, audience, budget, and KPI data.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1180px] text-left text-sm">
              <thead className="border-b text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="py-3 pr-4 font-medium">Campaign</th>
                  <th className="py-3 pr-4 font-medium">Course</th>
                  <th className="py-3 pr-4 font-medium">Audience</th>
                  <th className="py-3 pr-4 font-medium">Platform mix</th>
                  <th className="py-3 pr-4 font-medium">Budget</th>
                  <th className="py-3 pr-4 font-medium">Timeline</th>
                  <th className="py-3 pr-4 font-medium">Targets vs actual</th>
                  <th className="py-3 pr-4 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {ucc.campaigns.map((campaign) => (
                  <tr key={campaign.id}>
                    <td className="min-w-[260px] py-3 pr-4 align-top">
                      <Textarea
                        value={campaign.name}
                        onChange={(event) =>
                          updateCampaign(campaign.id, { name: event.target.value })
                        }
                      />
                    </td>
                    <td className="min-w-[190px] py-3 pr-4 align-top">
                      {findCourse(ucc, campaign.courseId)?.name}
                    </td>
                    <td className="min-w-[170px] py-3 pr-4 align-top">
                      {findAudience(ucc, campaign.audienceId)?.name}
                    </td>
                    <td className="min-w-[260px] py-3 pr-4 align-top">
                      {campaign.platformMix.join(", ")}
                    </td>
                    <td className="py-3 pr-4 align-top">{formatNumber(campaign.budget)}</td>
                    <td className="min-w-[180px] py-3 pr-4 align-top">
                      {campaign.startDate} to {campaign.endDate}
                    </td>
                    <td className="min-w-[220px] py-3 pr-4 align-top">
                      <p>{campaign.actualResults.reach}/{campaign.kpiTarget.reach} reach</p>
                      <p>{campaign.actualResults.leads}/{campaign.kpiTarget.leads} leads</p>
                      <p>{campaign.actualResults.enrolments}/{campaign.kpiTarget.enrolments} enrolments</p>
                    </td>
                    <td className="min-w-[150px] py-3 pr-4 align-top">
                      <NativeSelect
                        value={campaign.status}
                        onChange={(event) =>
                          updateCampaign(campaign.id, {
                            status: event.target.value as UccCampaign["status"],
                          })
                        }
                      >
                        <option value="planning">Planning</option>
                        <option value="active">Active</option>
                        <option value="paused">Paused</option>
                        <option value="completed">Completed</option>
                      </NativeSelect>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </section>
  );
}

// Lines handed to the campaign and calendar AI as extra context (Module D1).
function acceptedTrendLines(trendInsights: TrendInsight[]): string[] {
  return trendInsights
    .filter((trend) => trend.status === "accepted")
    .map((trend) => `${trend.title}. Suggested angle: ${trend.contentAngle}`);
}

function TrendRadarPanel({
  data,
  onListeningResultsChange,
  onRecordUsage,
  onTrendInsightsChange,
}: {
  data: MarketingWorkspaceData;
  onListeningResultsChange: (listeningResults: ListeningResult[]) => void;
  onRecordUsage: (module: string, model: string, usage: OpenAiUsage) => void;
  onTrendInsightsChange: (trendInsights: TrendInsight[]) => void;
}) {
  const [activeTab, setActiveTab] = useState<"trends" | "listening">("trends");
  const [scanning, setScanning] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [listeningTopic, setListeningTopic] = useState("");
  const [listeningType, setListeningType] = useState<ListeningAnalysisType>("quick");
  const [listening, setListening] = useState(false);
  const [listeningError, setListeningError] = useState("");

  const liveAi = isLiveAiEnabled(data.aiIntegration);
  const hasXaiKey = Boolean(data.aiIntegration.xaiApiKey?.trim());

  async function runListening() {
    if (!listeningTopic.trim()) {
      setListeningError("Enter a topic first, or pick one of the suggested topics.");
      return;
    }

    setListening(true);
    setListeningError("");

    try {
      const response = await fetch(apiUrl("/api/social-listening"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          apiKey: data.aiIntegration.apiKey,
          xaiApiKey: data.aiIntegration.xaiApiKey ?? "",
          model: resolveModelForTask(data.aiIntegration, "analysis"),
          topic: listeningTopic.trim(),
          analysisType: listeningType,
        }),
      });
      const result = (await response.json()) as
        | {
            ok: true;
            insight: string;
            quotes: Array<{ text: string; source: string; url: string }>;
            sourcesCovered: string;
            dateRange: string;
            usage?: OpenAiUsage;
            model?: string;
          }
        | { ok: false; error: string };

      if (!result.ok) {
        setListeningError(result.error);
        return;
      }

      const entry: ListeningResult = {
        id: `listen-${Date.now()}`,
        topic: listeningTopic.trim(),
        analysisType: listeningType,
        insight: result.insight,
        quotes: result.quotes,
        sourcesCovered: result.sourcesCovered,
        dateRange: result.dateRange,
        model: result.model ?? "unknown",
        generatedAt: new Date().toISOString(),
        status: "new",
      };

      onListeningResultsChange([entry, ...data.listeningResults].slice(0, 20));

      if (result.usage) {
        onRecordUsage("Social listening", result.model ?? "unknown", result.usage);
      }
    } catch (error) {
      setListeningError(error instanceof Error ? error.message : String(error));
    } finally {
      setListening(false);
    }
  }
  const drafts = data.trendInsights.filter((trend) => trend.status === "draft");
  const accepted = data.trendInsights.filter((trend) => trend.status === "accepted");
  const dismissed = data.trendInsights.filter((trend) => trend.status === "dismissed");

  function setTrendStatus(id: string, status: TrendInsight["status"]) {
    onTrendInsightsChange(
      data.trendInsights.map((trend) =>
        trend.id === id ? { ...trend, status } : trend,
      ),
    );
  }

  async function scanTrends() {
    setScanning(true);
    setErrorMessage("");

    try {
      const response = await fetch(apiUrl("/api/ai/trends"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          apiKey: data.aiIntegration.apiKey,
          searchModel: resolveModelForTask(data.aiIntegration, "utility"),
          synthesisModel: resolveModelForTask(data.aiIntegration, "analysis"),
          context: buildTrendContext(data),
        }),
      });
      const result = (await response.json()) as
        | {
            ok: true;
            trends: TrendInsight[];
            searchUsage?: OpenAiUsage;
            searchModel?: string;
            synthesisUsage?: OpenAiUsage;
            synthesisModel?: string;
          }
        | { ok: false; error: string };

      if (!result.ok) {
        setErrorMessage(result.error);
        return;
      }

      // Fresh drafts replace old drafts and dismissed cards; accepted cards
      // are the manager's decisions and stay.
      onTrendInsightsChange([
        ...data.trendInsights.filter((trend) => trend.status === "accepted"),
        ...result.trends,
      ]);

      if (result.searchUsage) {
        onRecordUsage(
          "Trend Radar search",
          result.searchModel ?? "unknown",
          result.searchUsage,
        );
      }

      if (result.synthesisUsage) {
        onRecordUsage(
          "Trend Radar synthesis",
          result.synthesisModel ?? "unknown",
          result.synthesisUsage,
        );
      }
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : String(error));
    } finally {
      setScanning(false);
    }
  }

  function trendCard(trend: TrendInsight) {
    return (
      <div className="space-y-2 rounded-lg border p-3" key={trend.id}>
        <div className="flex flex-wrap items-start justify-between gap-2">
          <p className="text-sm font-semibold">{trend.title}</p>
          {trend.status === "accepted" ? (
            <span className="rounded-md border border-success-border bg-success px-2 py-0.5 text-xs font-medium text-success-foreground">
              Accepted
            </span>
          ) : (
            <span className="rounded-md border border-warning-border bg-warning px-2 py-0.5 text-xs font-medium text-warning-foreground">
              Draft, needs your decision
            </span>
          )}
        </div>
        <p className="text-sm leading-6">
          <span className="font-medium">Why it matters:</span> {trend.whyItMatters}
        </p>
        <p className="text-sm leading-6">
          <span className="font-medium">Content angle:</span> {trend.contentAngle}
        </p>
        <div className="text-xs leading-5 text-muted-foreground">
          Sources:{" "}
          {trend.sources.map((source, index) => (
            <span key={source.url}>
              {index > 0 ? " / " : ""}
              <a
                className="underline underline-offset-2"
                href={source.url}
                rel="noreferrer"
                target="_blank"
              >
                {source.title}
              </a>
            </span>
          ))}
        </div>
        <p className="text-xs leading-5 text-muted-foreground">
          Found by {trend.model} on {trend.generatedAt.slice(0, 16).replace("T", " ")}
        </p>
        {trend.status === "draft" ? (
          <div className="flex flex-wrap gap-2 pt-1">
            <Button
              onClick={() => setTrendStatus(trend.id, "accepted")}
              size="sm"
              type="button"
            >
              <CheckCircle2 className="h-4 w-4" />
              Accept
            </Button>
            <Button
              onClick={() => setTrendStatus(trend.id, "dismissed")}
              size="sm"
              type="button"
              variant="outline"
            >
              <X className="h-4 w-4" />
              Dismiss
            </Button>
          </div>
        ) : (
          <div className="flex flex-wrap gap-2 pt-1">
            <Button
              onClick={() => setTrendStatus(trend.id, "dismissed")}
              size="sm"
              type="button"
              variant="outline"
            >
              <X className="h-4 w-4" />
              Withdraw acceptance
            </Button>
          </div>
        )}
      </div>
    );
  }

  return (
    <Card>
      <CardHeader className="flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <SectionTitle
          icon={TrendingUp}
          kicker="Trends"
          title="Trend Radar"
          description="A real web search for current Singapore private education, recruitment, and content trends. Every card cites the pages it came from; accepted trends feed campaign ideas and calendar generation."
        />
        <div className="flex flex-col items-stretch gap-2 sm:items-end">
          {activeTab === "trends" ? (
            <Button
              disabled={!liveAi || scanning}
              onClick={scanTrends}
              size="sm"
              type="button"
              variant="outline"
            >
              <Sparkles className="h-4 w-4" />
              {scanning ? "Scanning the web" : "Scan trends"}
            </Button>
          ) : null}
          {!liveAi ? (
            <p className="text-xs leading-5 text-muted-foreground">
              Connect OpenAI in Settings to use the Trend Radar.
            </p>
          ) : null}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex flex-wrap gap-2">
          <Button
            onClick={() => setActiveTab("trends")}
            size="sm"
            type="button"
            variant={activeTab === "trends" ? "default" : "outline"}
          >
            Web trends
          </Button>
          <Button
            onClick={() => setActiveTab("listening")}
            size="sm"
            type="button"
            variant={activeTab === "listening" ? "default" : "outline"}
          >
            Social listening
          </Button>
        </div>

        {activeTab === "trends" ? (
          <>
            {errorMessage ? (
              <div className="rounded-md border border-warning-border bg-warning p-3 text-xs leading-5 text-warning-foreground">
                {errorMessage}
              </div>
            ) : null}

            {drafts.length === 0 && accepted.length === 0 ? (
              <p className="text-sm leading-6 text-muted-foreground">
                No trends scanned yet. Scan trends runs a live web search; if the
                search finds nothing solid, it says so instead of inventing trends.
              </p>
            ) : null}

            {drafts.map((trend) => trendCard(trend))}

            {accepted.length > 0 ? (
              <>
                <p className="pt-1 text-xs font-medium uppercase text-muted-foreground">
                  Accepted trends (used by campaign and calendar AI)
                </p>
                {accepted.map((trend) => trendCard(trend))}
              </>
            ) : null}

            {dismissed.length > 0 ? (
              <p className="text-xs leading-5 text-muted-foreground">
                {dismissed.length} dismissed trend{dismissed.length === 1 ? "" : "s"} hidden.
                They are cleared on the next scan.
              </p>
            ) : null}
          </>
        ) : (
          <>
            <p className="text-xs leading-5 text-muted-foreground">
              Live public-opinion research from Reddit{hasXaiKey ? " and X" : ""}, powered
              by the open-source sc-research tool (MIT licence).{" "}
              {hasXaiKey
                ? ""
                : "No xAI key is set, so X is not searched; add one in Settings to include X."}{" "}
              Quotes are research evidence for internal planning only, never marketing copy.
            </p>

            <div className="flex flex-wrap items-end gap-2 rounded-lg border bg-muted/20 p-3">
              <div className="min-w-[260px] flex-1">
                <Field label="Topic">
                  <Input
                    placeholder="What are people discussing?"
                    value={listeningTopic}
                    onChange={(event) => setListeningTopic(event.target.value)}
                  />
                </Field>
              </div>
              <div className="min-w-[180px]">
                <Field label="Analysis type">
                  <NativeSelect
                    value={listeningType}
                    onChange={(event) =>
                      setListeningType(event.target.value as ListeningAnalysisType)
                    }
                  >
                    {LISTENING_ANALYSIS_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </NativeSelect>
                </Field>
              </div>
              <Button
                disabled={!liveAi || listening}
                onClick={() => void runListening()}
                size="sm"
                type="button"
              >
                <SearchCheck className="h-4 w-4" />
                {listening ? "Researching" : "Run listening research"}
              </Button>
            </div>

            <div className="flex flex-wrap gap-2">
              {SUGGESTED_LISTENING_TOPICS.map((topic) => (
                <Button
                  key={topic}
                  onClick={() => setListeningTopic(topic)}
                  size="sm"
                  type="button"
                  variant="outline"
                >
                  {topic}
                </Button>
              ))}
            </div>

            {listeningError ? (
              <div className="rounded-md border border-warning-border bg-warning p-3 text-xs leading-5 text-warning-foreground">
                {listeningError}
              </div>
            ) : null}

            {data.listeningResults.length === 0 ? (
              <p className="text-sm leading-6 text-muted-foreground">
                No listening research yet. Runs can take a minute or two because
                the tool fetches real posts before the analysis starts.
              </p>
            ) : (
              data.listeningResults.map((result) => (
                <div className="space-y-2 rounded-lg border p-3" key={result.id}>
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <p className="text-sm font-semibold">
                      {result.topic}
                      <span className="ml-2 text-xs font-normal text-muted-foreground">
                        {LISTENING_ANALYSIS_OPTIONS.find(
                          (option) => option.value === result.analysisType,
                        )?.label ?? result.analysisType}
                      </span>
                    </p>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">{result.dateRange}</Badge>
                      <Badge
                        variant={
                          result.status === "accepted"
                            ? "success"
                            : result.status === "dismissed"
                              ? "secondary"
                              : "warning"
                        }
                      >
                        {result.status === "accepted"
                          ? "Accepted"
                          : result.status === "dismissed"
                            ? "Dismissed"
                            : "New"}
                      </Badge>
                    </div>
                  </div>
                  <p className="whitespace-pre-wrap text-sm leading-6">{result.insight}</p>
                  <div className="space-y-2">
                    <p className="text-xs font-medium uppercase text-muted-foreground">
                      Evidence: real posts this rests on
                    </p>
                    {result.quotes.map((quote, index) => (
                      <div
                        className="rounded-md border bg-muted/20 p-2 text-xs leading-5"
                        key={`${result.id}-quote-${index}`}
                      >
                        <p className="italic">&ldquo;{quote.text}&rdquo;</p>
                        <p className="mt-1 text-muted-foreground">
                          {quote.source}
                          {" / "}
                          <a
                            className="underline underline-offset-2"
                            href={quote.url}
                            rel="noreferrer"
                            target="_blank"
                          >
                            view post
                          </a>
                        </p>
                      </div>
                    ))}
                  </div>
                  <p className="text-xs leading-5 text-muted-foreground">
                    Covered: {result.sourcesCovered}. Analysed by {result.model} on{" "}
                    {result.generatedAt.slice(0, 16).replace("T", " ")}. Research
                    evidence only; do not copy quotes into marketing content.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      disabled={result.status === "accepted"}
                      onClick={() =>
                        onListeningResultsChange(
                          data.listeningResults.map((row) =>
                            row.id === result.id
                              ? { ...row, status: "accepted" }
                              : row,
                          ),
                        )
                      }
                      size="sm"
                      type="button"
                    >
                      {result.status === "accepted"
                        ? "Accepted as strategy input"
                        : "Accept as strategy input"}
                    </Button>
                    <Button
                      disabled={result.status === "dismissed"}
                      onClick={() =>
                        onListeningResultsChange(
                          data.listeningResults.map((row) =>
                            row.id === result.id
                              ? { ...row, status: "dismissed" }
                              : row,
                          ),
                        )
                      }
                      size="sm"
                      type="button"
                      variant="outline"
                    >
                      Dismiss
                    </Button>
                  </div>
                  <p className="text-xs leading-5 text-muted-foreground">
                    Accepted findings feed the Strategy Brief and campaign
                    suggestions as internal research signals. Quotes are never
                    used as copy.
                  </p>
                </div>
              ))
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

const UCC_EVENT_TYPES: UccMarketingEvent["type"][] = [
  "public holiday",
  "school period",
  "marketing event",
  "intake",
  "campus event",
];

function PlatformStrategyView({
  applyConfirmation,
  data,
  onAiRecommendationsChange,
  onApplyMetrics,
  onCalendarChange,
  onConnectionsChange,
  onDismissApplyConfirmation,
  onListeningResultsChange,
  onNavigate,
  onRecordUsage,
  onTrendInsightsChange,
  onUccChange,
  onViewAppliedData,
  ucc,
}: {
  applyConfirmation: { appliedPlatforms: AppliedPlatformSummary[]; label: string } | null;
  data: MarketingWorkspaceData;
  onAiRecommendationsChange: (aiRecommendations: AiRecommendation[]) => void;
  onApplyMetrics: (
    metrics: PlatformDataMetrics[],
    approvedBy: string,
    source: { label: string; noteLabel: string; rangeLabel: string; editedCount: number },
  ) => void;
  onCalendarChange: (calendar: CalendarItem[]) => void;
  onConnectionsChange: (connections: PlatformConnection[]) => void;
  onDismissApplyConfirmation: () => void;
  onListeningResultsChange: (listeningResults: ListeningResult[]) => void;
  onNavigate: (view: ViewId) => void;
  onRecordUsage: (module: string, model: string, usage: OpenAiUsage) => void;
  onTrendInsightsChange: (trendInsights: TrendInsight[]) => void;
  onUccChange: (ucc: UccStrategyData) => void;
  onViewAppliedData: (platform: Platform) => void;
  ucc: UccStrategyData;
}) {
  const metricReview = useMetricReviewFlow(onApplyMetrics);
  const [newEvent, setNewEvent] = useState({
    name: "",
    date: "",
    type: "marketing event" as UccMarketingEvent["type"],
    campaignOpportunity: "",
  });

  function addMarketingEvent() {
    if (!newEvent.name.trim() || !newEvent.date) {
      return;
    }

    const event: UccMarketingEvent = {
      id: crypto.randomUUID(),
      name: newEvent.name.trim(),
      date: newEvent.date,
      type: newEvent.type,
      audienceIds: [],
      campaignOpportunity: newEvent.campaignOpportunity.trim(),
    };

    onUccChange({ ...ucc, events: [...ucc.events, event] });

    // Also reflect this event in the real Production Calendar, so it is
    // visible to the team executing content, not just as a strategy note.
    const calendarItem: CalendarItem = {
      id: crypto.randomUUID(),
      itemKind: "event",
      date: event.date,
      platform: platforms[0],
      contentPillar: data.brief.contentPillars[0] || "Admissions Confidence",
      contentTopic: event.name,
      format: "Event promotion",
      hook: `What families should know before ${event.name.toLowerCase()}`,
      caption: event.campaignOpportunity || `Save the date: ${event.name}.`,
      visualDirection:
        "Use real venue, student, faculty, or parent-facing details. Keep date, time, place, and eligibility clear.",
      cta: "Add this to your calendar or message admissions with questions.",
      hashtags: ["#CollegePlanning", "#CampusLife", "#Admissions"],
      bestPostingTime: "",
      productionNotes:
        "Added from Marketing Calendar Intelligence. Confirm platform, owner, and approval path before scheduling.",
      assignedRole: "marketing manager",
      owner: "Marketing Manager",
      reviewer: "Compliance Reviewer",
      dueDate: event.date,
      status: "idea",
      approvalStage: "idea",
      businessGoalConnection: `Supports ${data.socialGoals.primaryObjective} by giving families a dated action to complete: ${data.socialGoals.conversionAction}`,
      complianceNote:
        "Keep event and program claims factual. Do not guarantee admission, jobs, salary, visas, or work eligibility.",
      videoScript: "",
      shotNotes:
        "Capture location, signage, staff welcome, student activity, proof detail, and a clear CTA frame.",
    };

    onCalendarChange(sortCalendarItems([...data.calendar, calendarItem]));
    setNewEvent({ name: "", date: "", type: "marketing event", campaignOpportunity: "" });
  }

  return (
    <section className="space-y-4">
      <Card>
        <CardHeader>
          <SectionTitle
            icon={Gauge}
            kicker="Platform"
            title="Audience-To-Platform Strategy"
            description="Channel recommendations for PRC students, parents, working adults, agents, partners, employers, and future English/Chinese audiences."
          />
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {ucc.audiences.map((audience) => (
            <div className="rounded-lg border bg-muted/20 p-3" key={audience.id}>
              <p className="text-sm font-semibold">{audience.name}</p>
              <p className="mt-2 text-xs leading-5 text-muted-foreground">
                {audience.nurtureAngle}
              </p>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {audience.recommendedChannels.map((channel) => (
                  <Badge key={channel} variant="outline">
                    {channel}
                  </Badge>
                ))}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Platform Data Integration &amp; KPI Tracking</CardTitle>
          <CardDescription>
            Connect and sync Metricool here; the same real numbers feed both
            the connection status below and KPI Tracking, kept in one place.
          </CardDescription>
        </CardHeader>
      </Card>

      <PlatformDataIntegrationPanel
        apiKey={data.aiIntegration.apiKey}
        applyConfirmation={applyConfirmation}
        approverName={metricReview.approverName}
        connections={data.connections}
        model={resolveModelForTask(data.aiIntegration, "analysis")}
        pendingReview={metricReview.pendingReview}
        onApply={metricReview.handleApply}
        onApproverNameChange={metricReview.setApproverName}
        onConnectionsChange={onConnectionsChange}
        onDiscardReview={() => metricReview.setPendingReview(null)}
        onDismissApplyConfirmation={onDismissApplyConfirmation}
        onRecordUsage={onRecordUsage}
        onRowChange={metricReview.handleRowChange}
        onSyncReview={metricReview.setPendingReview}
        onViewAppliedData={onViewAppliedData}
      />

      <KpiTrackerView
        data={data}
        onAiRecommendationsChange={onAiRecommendationsChange}
        onRecordUsage={onRecordUsage}
      />

      <Card>
        <CardHeader>
          <CardTitle>Marketing Calendar Intelligence</CardTitle>
          <CardDescription>
            Singapore holidays, school periods, intake windows, agent cycles,
            campus events, and shopping-date campaign moments.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid gap-3 rounded-lg border bg-muted/10 p-3 md:grid-cols-[1.5fr_1fr_1fr_1.5fr_auto] md:items-end">
            <Field label="Event name">
              <Input
                value={newEvent.name}
                onChange={(event) =>
                  setNewEvent((current) => ({ ...current, name: event.target.value }))
                }
              />
            </Field>
            <Field label="Date">
              <Input
                type="date"
                value={newEvent.date}
                onChange={(event) =>
                  setNewEvent((current) => ({ ...current, date: event.target.value }))
                }
              />
            </Field>
            <Field label="Type">
              <NativeSelect
                value={newEvent.type}
                onChange={(event) =>
                  setNewEvent((current) => ({
                    ...current,
                    type: event.target.value as UccMarketingEvent["type"],
                  }))
                }
              >
                {UCC_EVENT_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {capitalize(type)}
                  </option>
                ))}
              </NativeSelect>
            </Field>
            <Field label="Campaign opportunity">
              <Input
                value={newEvent.campaignOpportunity}
                onChange={(event) =>
                  setNewEvent((current) => ({
                    ...current,
                    campaignOpportunity: event.target.value,
                  }))
                }
              />
            </Field>
            <Button
              disabled={!newEvent.name.trim() || !newEvent.date}
              onClick={addMarketingEvent}
              size="sm"
              type="button"
            >
              <Plus className="h-4 w-4" />
              Add event
            </Button>
          </div>
          <p className="text-xs leading-5 text-muted-foreground">
            Adding an event here also creates a matching item in the
            Production Calendar so the team executing content sees it too.
          </p>
          {ucc.events.map((event) => (
            <div className="rounded-lg border bg-muted/20 p-3" key={event.id}>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-semibold">{event.name}</p>
                <Badge variant="outline">{event.date}</Badge>
              </div>
              <p className="mt-2 text-xs leading-5 text-muted-foreground">
                {event.campaignOpportunity}
              </p>
            </div>
          ))}
        </CardContent>
      </Card>

      <TrendRadarPanel
        data={data}
        onListeningResultsChange={onListeningResultsChange}
        onRecordUsage={onRecordUsage}
        onTrendInsightsChange={onTrendInsightsChange}
      />

      <AiSkillControlPanel
        modules={ucc.aiModules}
        onModulesChange={(aiModules) => onUccChange({ ...ucc, aiModules })}
        onNavigate={onNavigate}
      />
    </section>
  );
}

// Where each AI skill's real engine lives. The control panel never runs
// generation itself; it sends the manager to the screen with the real
// button, or says honestly that the engine is not built yet.
const SKILL_ENGINE_LINKS: Record<
  string,
  { view: ViewId; screenLabel: string; runLabel: string }
> = {
  "ai-content-strategy": {
    view: "brief",
    screenLabel: "Strategy Brief",
    runLabel: "Generate brief with AI",
  },
  "ai-copywriting": {
    view: "production",
    screenLabel: "Production Board",
    runLabel: "the copywriting AI buttons",
  },
  "ai-calendar": {
    view: "calendar",
    screenLabel: "Content Calendar",
    runLabel: "Generate calendar with AI",
  },
  "ai-competitor": {
    view: "competitors",
    screenLabel: "Competitors",
    runLabel: "Analyse competitors with AI",
  },
  "ai-compliance": {
    view: "compliance",
    screenLabel: "Compliance",
    runLabel: "the AI compliance review",
  },
  "ai-video": {
    view: "production",
    screenLabel: "Production Board",
    runLabel: "Generate video script with AI",
  },
  "ai-kpi": {
    view: "platform",
    screenLabel: "Market Intelligence",
    runLabel: "Generate insights with AI",
  },
  "ai-budget": {
    view: "budget",
    screenLabel: "Budget & Resources",
    runLabel: "Run AI budget review",
  },
  "ai-campaign": {
    view: "campaigns",
    screenLabel: "Campaigns",
    runLabel: "Suggest campaigns with AI",
  },
  "ai-multilingual": {
    view: "production",
    screenLabel: "Production Board",
    runLabel: "the copywriting AI, which writes the Chinese version when the audience language includes Chinese",
  },
  "ai-performance-recommendation": {
    view: "platform",
    screenLabel: "Market Intelligence",
    runLabel: "Generate insights with AI",
  },
};

function AiSkillControlPanel({
  modules,
  onModulesChange,
  onNavigate,
}: {
  modules: UccAiModule[];
  onModulesChange: (modules: UccAiModule[]) => void;
  onNavigate: (view: ViewId) => void;
}) {
  const [selectedModuleId, setSelectedModuleId] = useState(modules[0]?.id ?? "");
  // Advanced reference detail is collapsed by default so this screen opens
  // simple for a new user (progressive disclosure).
  const [showAdvanced, setShowAdvanced] = useState(false);
  const selectedModule =
    modules.find((module) => module.id === selectedModuleId) ?? modules[0];

  function updateModule(id: string, patch: Partial<UccAiModule>) {
    onModulesChange(
      modules.map((module) =>
        module.id === id ? { ...module, ...patch } : module,
      ),
    );
  }

  function updateHistory(
    moduleId: string,
    recordId: string,
    patch: Partial<UccAiOutputRecord>,
  ) {
    onModulesChange(
      modules.map((module) =>
        module.id === moduleId
          ? {
              ...module,
              outputHistory: module.outputHistory.map((record) =>
                record.id === recordId ? { ...record, ...patch } : record,
              ),
            }
          : module,
      ),
    );
  }

  return (
    <Card>
      <CardHeader className="flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <SectionTitle
          icon={BookOpenText}
          kicker="AI QA"
          title="AI Skill Control Panel"
          description="A reference list of the AI skills and where each one runs, with reviewer controls, risk level, guardrails, and saved output history."
        />
        <Button
          onClick={() => setShowAdvanced((value) => !value)}
          size="sm"
          type="button"
          variant="outline"
        >
          {showAdvanced ? "Hide advanced" : "Show advanced"}
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {!showAdvanced ? (
          <p className="text-sm leading-6 text-muted-foreground">
            This is reference detail for advanced users. Select Show advanced to
            see every AI skill, where it runs, and its saved output history.
          </p>
        ) : (
          <>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1180px] text-left text-sm">
            <thead className="border-b text-xs uppercase text-muted-foreground">
              <tr>
                <th className="py-3 pr-4 font-medium">Skill</th>
                <th className="py-3 pr-4 font-medium">Status</th>
                <th className="py-3 pr-4 font-medium">Input source</th>
                <th className="py-3 pr-4 font-medium">Output destination</th>
                <th className="py-3 pr-4 font-medium">Last used</th>
                <th className="py-3 pr-4 font-medium">Reviewer</th>
                <th className="py-3 pr-4 font-medium">Risk</th>
                <th className="py-3 pr-4 font-medium">Run</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {modules.map((module) => (
                <tr
                  className={cn(
                    "cursor-pointer",
                    selectedModule?.id === module.id && "bg-muted/30",
                  )}
                  key={module.id}
                  onClick={() => setSelectedModuleId(module.id)}
                >
                  <td className="min-w-[220px] py-3 pr-4 font-medium">
                    {module.name}
                  </td>
                  <td className="min-w-[150px] py-3 pr-4">
                    <span className="text-xs capitalize">{module.status}</span>
                  </td>
                  <td className="min-w-[240px] py-3 pr-4 text-xs leading-5">
                    {module.inputSource}
                  </td>
                  <td className="min-w-[220px] py-3 pr-4 text-xs leading-5">
                    {module.outputDestination}
                  </td>
                  <td className="min-w-[140px] py-3 pr-4">
                    <Input
                      type="date"
                      value={module.lastUsedDate}
                      onChange={(event) =>
                        updateModule(module.id, {
                          lastUsedDate: event.target.value,
                        })
                      }
                    />
                  </td>
                  <td className="min-w-[130px] py-3 pr-4">
                    <span className="text-xs">
                      {module.reviewerRequired ? "Yes" : "No"}
                    </span>
                  </td>
                  <td className="min-w-[130px] py-3 pr-4">
                    <Badge
                      variant={
                        module.riskLevel === "high"
                          ? "warning"
                          : module.riskLevel === "medium"
                            ? "info"
                            : "success"
                      }
                    >
                      {module.riskLevel}
                    </Badge>
                  </td>
                  <td className="min-w-[170px] py-3 pr-4">
                    {(() => {
                      const link = SKILL_ENGINE_LINKS[module.id];

                      if (!link) {
                        return (
                          <Button disabled size="sm" type="button" variant="outline">
                            Engine not yet built
                          </Button>
                        );
                      }

                      return (
                        <Button
                          onClick={(event) => {
                            event.stopPropagation();
                            onNavigate(link.view);
                          }}
                          size="sm"
                          type="button"
                          variant="outline"
                        >
                          Open engine
                        </Button>
                      );
                    })()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {selectedModule ? (
          <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_420px]">
            <div className="space-y-3 rounded-lg border bg-muted/20 p-3">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="text-sm font-semibold">{selectedModule.name}</p>
                  <p className="mt-1 text-xs leading-5 text-muted-foreground">
                    {selectedModule.purpose}
                  </p>
                </div>
                <Badge
                  variant={
                    selectedModule.riskLevel === "high"
                      ? "warning"
                      : selectedModule.riskLevel === "medium"
                        ? "info"
                        : "success"
                  }
                >
                  {selectedModule.riskLevel} risk
                </Badge>
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                <ProductionBlock
                  eyebrow="Required inputs"
                  primary={selectedModule.input}
                  secondary={selectedModule.requiredInputs.join("\n")}
                />
                <ProductionBlock
                  eyebrow="Expected output"
                  primary={selectedModule.output}
                  secondary={selectedModule.expectedOutputFormat}
                />
                <ProductionBlock
                  eyebrow="Human approval"
                  primary={
                    selectedModule.reviewerRequired
                      ? "Reviewer required"
                      : "Reviewer optional"
                  }
                  secondary={selectedModule.humanApprovalStep}
                />
                <ProductionBlock
                  eyebrow="Error handling"
                  primary="Controlled failure"
                  secondary={selectedModule.errorHandling}
                />
              </div>
              <InsightList
                items={selectedModule.complianceGuardrails}
                title="Compliance guardrails"
                variant="warning"
              />
              {(() => {
                const link = SKILL_ENGINE_LINKS[selectedModule.id];

                if (!link) {
                  return (
                    <p className="text-xs leading-5 text-muted-foreground">
                      Engine not yet built.
                    </p>
                  );
                }

                return (
                  <p className="text-xs leading-5 text-muted-foreground">
                    This skill runs on the {link.screenLabel} screen using{" "}
                    {link.runLabel}. Open engine takes you there.
                  </p>
                );
              })()}
            </div>

            <div className="space-y-3 rounded-lg border bg-background p-3">
              <p className="text-sm font-semibold">Saved Output History</p>
              {selectedModule.outputHistory.length === 0 ? (
                <p className="text-sm leading-6 text-muted-foreground">
                  Generated outputs from this skill will appear here for review.
                </p>
              ) : (
                selectedModule.outputHistory.map((record) => (
                  <div className="rounded-lg border bg-muted/20 p-3" key={record.id}>
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <p className="text-sm font-medium">{record.title}</p>
                      <Badge
                        variant={
                          record.status === "approved"
                            ? "success"
                            : record.status === "rejected"
                              ? "warning"
                              : "secondary"
                        }
                      >
                        {record.status}
                      </Badge>
                    </div>
                    <p className="mt-1 text-xs leading-5 text-muted-foreground">
                      Reviewer: {record.reviewer} / Compliance{" "}
                      {record.complianceScore}% / Brand fit {record.brandFitScore}%
                    </p>
                    <p className="mt-2 text-xs leading-5">{record.outputSummary}</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Button
                        onClick={() =>
                          updateHistory(selectedModule.id, record.id, {
                            status: "approved",
                            approvedAt: new Date().toISOString(),
                            editHistory: [
                              ...record.editHistory,
                              "Approved by human reviewer",
                            ],
                          })
                        }
                        size="sm"
                        type="button"
                      >
                        Approve
                      </Button>
                      <Button
                        onClick={() =>
                          updateHistory(selectedModule.id, record.id, {
                            status: "rejected",
                            editHistory: [
                              ...record.editHistory,
                              "Returned for revision",
                            ],
                          })
                        }
                        size="sm"
                        type="button"
                        variant="outline"
                      >
                        Return
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        ) : null}
          </>
        )}
      </CardContent>
    </Card>
  );
}

function AiRecommendationPanel({
  module,
  buttonLabel,
  usageLabel,
  explainer,
  data,
  onAiRecommendationsChange,
  onRecordUsage,
}: {
  module: "budget" | "kpi";
  buttonLabel: string;
  usageLabel: string;
  explainer: string;
  data: MarketingWorkspaceData;
  onAiRecommendationsChange: (aiRecommendations: AiRecommendation[]) => void;
  onRecordUsage: (module: string, model: string, usage: OpenAiUsage) => void;
}) {
  const [running, setRunning] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const liveAi = isLiveAiEnabled(data.aiIntegration);
  const rows = data.aiRecommendations.filter((rec) => rec.module === module);
  const drafts = rows.filter((rec) => rec.status === "draft");
  const accepted = rows.filter((rec) => rec.status === "accepted");
  const dismissed = rows.filter((rec) => rec.status === "dismissed");

  function setRecommendationStatus(
    id: string,
    status: AiRecommendation["status"],
  ) {
    onAiRecommendationsChange(
      data.aiRecommendations.map((rec) =>
        rec.id === id ? { ...rec, status } : rec,
      ),
    );
  }

  async function runReview() {
    setRunning(true);
    setErrorMessage("");

    try {
      const response = await fetch(apiUrl("/api/ai/insights"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          apiKey: data.aiIntegration.apiKey,
          model: resolveModelForTask(data.aiIntegration, "analysis"),
          context: buildInsightsContext(module, data),
        }),
      });
      const result = (await response.json()) as
        | { ok: true; draft: InsightsAiDraft; usage?: OpenAiUsage; model?: string }
        | { ok: false; error: string };

      if (!result.ok) {
        setErrorMessage(result.error);
        return;
      }

      const fresh = insightsDraftToRecommendations(
        result.draft,
        module,
        result.model ?? "unknown",
      );

      // New drafts replace the previous unreviewed and dismissed drafts for
      // this module. Accepted decisions are kept; they are the manager's.
      onAiRecommendationsChange([
        ...data.aiRecommendations.filter(
          (rec) => rec.module !== module || rec.status === "accepted",
        ),
        ...fresh,
      ]);

      if (result.usage) {
        onRecordUsage(usageLabel, result.model ?? "unknown", result.usage);
      }
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : String(error));
    } finally {
      setRunning(false);
    }
  }

  function recommendationCard(rec: AiRecommendation) {
    return (
      <div className="space-y-2 rounded-lg border p-3" key={rec.id}>
        <div className="flex flex-wrap items-start justify-between gap-2">
          <p className="text-sm font-semibold">{rec.subject}</p>
          {rec.status === "accepted" ? (
            <span className="rounded-md border border-success-border bg-success px-2 py-0.5 text-xs font-medium text-success-foreground">
              Accepted
            </span>
          ) : (
            <span className="rounded-md border border-warning-border bg-warning px-2 py-0.5 text-xs font-medium text-warning-foreground">
              Draft, needs your decision
            </span>
          )}
        </div>
        <p className="text-sm leading-6">{rec.insight}</p>
        <p className="text-sm leading-6">
          <span className="font-medium">Suggestion:</span> {rec.recommendation}
        </p>
        <p className="text-xs leading-5 text-muted-foreground">
          Based on: {rec.dataUsed}
        </p>
        <p className="text-xs leading-5 text-muted-foreground">
          Generated by {rec.model} on {rec.generatedAt.slice(0, 16).replace("T", " ")}
        </p>
        {rec.status === "draft" ? (
          <div className="flex flex-wrap gap-2 pt-1">
            <Button
              onClick={() => setRecommendationStatus(rec.id, "accepted")}
              size="sm"
              type="button"
            >
              <CheckCircle2 className="h-4 w-4" />
              Accept
            </Button>
            <Button
              onClick={() => setRecommendationStatus(rec.id, "dismissed")}
              size="sm"
              type="button"
              variant="outline"
            >
              <X className="h-4 w-4" />
              Dismiss
            </Button>
          </div>
        ) : (
          <div className="flex flex-wrap gap-2 pt-1">
            <Button
              onClick={() => setRecommendationStatus(rec.id, "dismissed")}
              size="sm"
              type="button"
              variant="outline"
            >
              <X className="h-4 w-4" />
              Withdraw acceptance
            </Button>
          </div>
        )}
      </div>
    );
  }

  return (
    <Card>
      <CardHeader className="flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <SectionTitle
          icon={Sparkles}
          kicker="AI review"
          title={module === "budget" ? "AI Budget Review" : "AI Performance Insights"}
          description={explainer}
        />
        <div className="flex flex-col items-stretch gap-2 sm:items-end">
          <Button
            disabled={!liveAi || running}
            onClick={runReview}
            size="sm"
            type="button"
            variant="outline"
          >
            <Sparkles className="h-4 w-4" />
            {running ? "Reviewing" : buttonLabel}
          </Button>
          {!liveAi ? (
            <p className="text-xs leading-5 text-muted-foreground">
              Connect OpenAI in Settings to run this review.
            </p>
          ) : null}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {errorMessage ? (
          <div className="rounded-md border border-warning-border bg-warning p-3 text-xs leading-5 text-warning-foreground">
            {errorMessage}
          </div>
        ) : null}

        {drafts.length === 0 && accepted.length === 0 ? (
          <p className="text-sm leading-6 text-muted-foreground">
            No AI suggestions yet. Run the review to get draft suggestions based
            on your real workspace numbers. Suggestions never change any figures;
            you decide what to accept.
          </p>
        ) : null}

        {drafts.map((rec) => recommendationCard(rec))}

        {accepted.length > 0 ? (
          <>
            <p className="pt-1 text-xs font-medium uppercase text-muted-foreground">
              Accepted suggestions
            </p>
            {accepted.map((rec) => recommendationCard(rec))}
          </>
        ) : null}

        {dismissed.length > 0 ? (
          <p className="text-xs leading-5 text-muted-foreground">
            {dismissed.length} dismissed suggestion{dismissed.length === 1 ? "" : "s"} hidden.
            They are cleared the next time you run the review.
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}

function BudgetResourcesView({
  data,
  onAiRecommendationsChange,
  onOfferUndo,
  onRecordUsage,
  onUccChange,
}: {
  data: MarketingWorkspaceData;
  onAiRecommendationsChange: (aiRecommendations: AiRecommendation[]) => void;
  onOfferUndo: (message: string, onExpire?: () => void) => void;
  onRecordUsage: (module: string, model: string, usage: OpenAiUsage) => void;
  onUccChange: (ucc: UccStrategyData) => void;
}) {
  const ucc = data.ucc;
  const [newCampaignId, setNewCampaignId] = useState("");

  function updateBudget(id: string, patch: Partial<UccBudgetPlan>) {
    onUccChange({
      ...ucc,
      budgetPlans: ucc.budgetPlans.map((budget) =>
        budget.id === id ? { ...budget, ...patch } : budget,
      ),
    });
  }

  function addBudgetLine() {
    if (!newCampaignId) {
      return;
    }

    const line: UccBudgetPlan = {
      id: `budget-${Date.now()}`,
      campaignId: newCampaignId,
      adBudget: 0,
      designerHours: 0,
      videoEditorHours: 0,
      copywriterHours: 0,
      staffAssigned: [],
      equipmentNeeded: [],
      venue: "",
      printingCost: 0,
      eventCost: 0,
      agentCost: 0,
      totalCost: 0,
    };

    onUccChange({ ...ucc, budgetPlans: [...ucc.budgetPlans, line] });
    setNewCampaignId("");
  }

  function deleteBudgetLine(budget: UccBudgetPlan) {
    const campaignName = findCampaign(ucc, budget.campaignId)?.name ?? "this campaign";
    const confirmed = window.confirm(
      `Delete the budget line for ${campaignName}? You will have 10 seconds to undo.`,
    );

    if (!confirmed) {
      return;
    }

    onOfferUndo(`Budget line for ${campaignName} deleted.`);
    onUccChange({
      ...ucc,
      budgetPlans: ucc.budgetPlans.filter((row) => row.id !== budget.id),
    });
  }

  return (
    <section className="space-y-4">
      <Card>
        <CardHeader className="flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <SectionTitle
            icon={FileSpreadsheet}
            kicker="Resources"
            title="Budget & Resource Planning"
            description="Ad budget, designer/video/copywriter time, staff, equipment, venue, printing, event, agent, and total campaign cost. Total is the full campaign cost including team time, so edit it directly."
          />
          <div className="flex flex-col items-stretch gap-2 sm:w-[300px]">
            <NativeSelect
              aria-label="Campaign for new budget line"
              onChange={(event) => setNewCampaignId(event.target.value)}
              value={newCampaignId}
            >
              <option value="">Choose a campaign</option>
              {ucc.campaigns.map((campaign) => (
                <option key={campaign.id} value={campaign.id}>
                  {campaign.name}
                </option>
              ))}
            </NativeSelect>
            <Button
              disabled={!newCampaignId}
              onClick={addBudgetLine}
              size="sm"
              type="button"
            >
              <Plus className="h-4 w-4" />
              Add budget line
            </Button>
            {ucc.campaigns.length === 0 ? (
              <p className="text-xs leading-5 text-muted-foreground">
                Add and approve a campaign on the Campaigns screen first, then
                you can plan its budget here.
              </p>
            ) : null}
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1320px] text-left text-sm">
              <thead className="border-b text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="py-3 pr-4 font-medium">Campaign</th>
                  <th className="py-3 pr-4 font-medium">Ad budget</th>
                  <th className="py-3 pr-4 font-medium">Team hours</th>
                  <th className="py-3 pr-4 font-medium">Staff</th>
                  <th className="py-3 pr-4 font-medium">Equipment</th>
                  <th className="py-3 pr-4 font-medium">Venue</th>
                  <th className="py-3 pr-4 font-medium">Printing</th>
                  <th className="py-3 pr-4 font-medium">Event</th>
                  <th className="py-3 pr-4 font-medium">Agent</th>
                  <th className="py-3 pr-4 font-medium">Total</th>
                  <th className="py-3 pr-4 font-medium">Remove</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {ucc.budgetPlans.map((budget) => (
                  <tr key={budget.id}>
                    <td className="min-w-[210px] py-3 pr-4">
                      {findCampaign(ucc, budget.campaignId)?.name ?? "Campaign removed"}
                    </td>
                    <td className="min-w-[120px] py-3 pr-4">
                      <Input
                        type="number"
                        value={budget.adBudget}
                        onChange={(event) =>
                          updateBudget(budget.id, { adBudget: toNumber(event.target.value) })
                        }
                      />
                    </td>
                    <td className="min-w-[220px] py-3 pr-4 text-xs leading-5">
                      Designer {budget.designerHours}h / Video {budget.videoEditorHours}h / Copy {budget.copywriterHours}h
                    </td>
                    <td className="min-w-[200px] py-3 pr-4">{budget.staffAssigned.join(", ")}</td>
                    <td className="min-w-[200px] py-3 pr-4">{budget.equipmentNeeded.join(", ")}</td>
                    <td className="min-w-[150px] py-3 pr-4">
                      <Input
                        value={budget.venue}
                        onChange={(event) =>
                          updateBudget(budget.id, { venue: event.target.value })
                        }
                      />
                    </td>
                    <td className="min-w-[110px] py-3 pr-4">
                      <Input
                        type="number"
                        value={budget.printingCost}
                        onChange={(event) =>
                          updateBudget(budget.id, { printingCost: toNumber(event.target.value) })
                        }
                      />
                    </td>
                    <td className="min-w-[110px] py-3 pr-4">
                      <Input
                        type="number"
                        value={budget.eventCost}
                        onChange={(event) =>
                          updateBudget(budget.id, { eventCost: toNumber(event.target.value) })
                        }
                      />
                    </td>
                    <td className="min-w-[110px] py-3 pr-4">
                      <Input
                        type="number"
                        value={budget.agentCost}
                        onChange={(event) =>
                          updateBudget(budget.id, { agentCost: toNumber(event.target.value) })
                        }
                      />
                    </td>
                    <td className="min-w-[120px] py-3 pr-4">
                      <Input
                        type="number"
                        value={budget.totalCost}
                        onChange={(event) =>
                          updateBudget(budget.id, { totalCost: toNumber(event.target.value) })
                        }
                      />
                    </td>
                    <td className="py-3 pr-4">
                      <Button
                        aria-label={`Delete budget line for ${findCampaign(ucc, budget.campaignId)?.name ?? "campaign"}`}
                        onClick={() => deleteBudgetLine(budget)}
                        size="sm"
                        type="button"
                        variant="outline"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <AiRecommendationPanel
        buttonLabel="Run AI budget review"
        data={data}
        explainer="The AI reads your real budgets, spend, and results, and suggests reallocations as drafts. It never changes your numbers; you accept or dismiss each suggestion."
        module="budget"
        onAiRecommendationsChange={onAiRecommendationsChange}
        onRecordUsage={onRecordUsage}
        usageLabel="Budget review"
      />
    </section>
  );
}

function KpiTrackerView({
  data,
  onAiRecommendationsChange,
  onRecordUsage,
}: {
  data: MarketingWorkspaceData;
  onAiRecommendationsChange: (aiRecommendations: AiRecommendation[]) => void;
  onRecordUsage: (module: string, model: string, usage: OpenAiUsage) => void;
}) {
  return (
    <section className="space-y-4">
      <AiRecommendationPanel
        buttonLabel="Generate insights with AI"
        data={data}
        explainer="The AI compares plan against actual results, cost per lead, and platform analytics, then drafts recommendations. Every one stays a draft until you accept or dismiss it."
        module="kpi"
        onAiRecommendationsChange={onAiRecommendationsChange}
        onRecordUsage={onRecordUsage}
        usageLabel="KPI insights"
      />
      <PerformanceLearningView data={data} />
    </section>
  );
}

function ComplianceCheckerView({
  data,
  onComplianceDocsChange,
  onRecordUsage,
}: {
  data: MarketingWorkspaceData;
  onComplianceDocsChange: (complianceDocs: ComplianceDoc[]) => void;
  onRecordUsage: (module: string, model: string, usage: OpenAiUsage) => void;
}) {
  const [draftCopy, setDraftCopy] = useState(data.calendar[0]?.caption ?? "");
  const [docMessage, setDocMessage] = useState<{ tone: "success" | "error"; text: string } | null>(null);
  const [uploadingDoc, setUploadingDoc] = useState(false);
  const [reviewing, setReviewing] = useState<"" | "single" | "calendar">("");
  const [reviewError, setReviewError] = useState("");
  const [review, setReview] = useState<{
    score: number;
    riskLevel: "low" | "medium" | "high";
    summary: string;
    flags: ComplianceFlag[];
  } | null>(null);
  const [rejectedFlags, setRejectedFlags] = useState<string[]>([]);
  const [calendarReview, setCalendarReview] = useState<{
    summary: string;
    findings: Array<{ id: string; topic: string; riskLevel: string; issues: string[] }>;
  } | null>(null);

  const liveAi = isLiveAiEnabled(data.aiIntegration);
  const flags = checkComplianceText(draftCopy);
  const calendarFlags = data.calendar
    .map((item) => ({
      item,
      flags: checkComplianceText(
        `${item.hook}\n${item.caption}\n${item.businessGoalConnection}`,
      ),
    }))
    .filter((row) => row.flags.length > 0);
  const unapprovedItems = data.calendar.filter(
    (item) => !canPublishCalendarItem(item) && item.status !== "posted",
  );

  function guidelineExcerpts() {
    return data.complianceDocs.slice(0, 4).map((doc) => ({
      name: doc.name,
      excerpt: doc.text.slice(0, 6000),
    }));
  }

  async function uploadGuidelineDoc(file: File) {
    setUploadingDoc(true);
    setDocMessage(null);

    try {
      const formData = new FormData();
      formData.append("file", file);
      const response = await fetch(apiUrl("/api/compliance/extract"), {
        method: "POST",
        body: formData,
      });
      const result = (await response.json()) as
        | {
            ok: true;
            name: string;
            source: "pdf" | "docx" | "text";
            characters: number;
            truncated: boolean;
            text: string;
          }
        | { ok: false; error: string };

      if (!result.ok) {
        setDocMessage({ tone: "error", text: result.error });
        return;
      }

      onComplianceDocsChange([
        {
          id: `compliance-doc-${Date.now()}`,
          name: result.name,
          uploadedAt: new Date().toISOString(),
          source: result.source,
          characters: result.characters,
          text: result.text,
        },
        ...data.complianceDocs,
      ]);
      setDocMessage({
        tone: "success",
        text: `Stored ${result.name} (${formatNumber(result.characters)} characters${
          result.truncated ? ", long document stored in shortened form" : ""
        }). The AI reviewer will use it.`,
      });
    } catch (error) {
      setDocMessage({
        tone: "error",
        text: error instanceof Error ? error.message : String(error),
      });
    } finally {
      setUploadingDoc(false);
    }
  }

  function deleteGuidelineDoc(doc: ComplianceDoc) {
    if (typeof window !== "undefined") {
      const confirmed = window.confirm(`Remove the guideline document "${doc.name}"?`);

      if (!confirmed) {
        return;
      }
    }

    onComplianceDocsChange(data.complianceDocs.filter((row) => row.id !== doc.id));
  }

  async function runAiReview(mode: "single" | "calendar") {
    setReviewing(mode);
    setReviewError("");

    try {
      const response = await fetch(apiUrl("/api/ai/compliance"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          apiKey: data.aiIntegration.apiKey,
          model: resolveModelForTask(data.aiIntegration, "analysis"),
          context: {
            mode,
            content: mode === "single" ? draftCopy : "",
            calendarItems:
              mode === "calendar"
                ? unapprovedItems.map((item) => ({
                    id: item.id,
                    topic: item.contentTopic,
                    platform: item.platform,
                    text: `${item.hook}\n${item.caption}`,
                  }))
                : [],
            guidelineDocs: guidelineExcerpts(),
            courseComplianceNotes: data.ucc.courses
              .filter(
                (course) =>
                  course.status !== "archived" && course.complianceNotes.trim().length > 0,
              )
              .map((course) => ({
                course: course.name || "Untitled course",
                notes: course.complianceNotes.trim(),
              })),
          } satisfies ComplianceAiContext,
        }),
      });
      const result = (await response.json()) as
        | {
            ok: true;
            review: {
              score: number;
              riskLevel: "low" | "medium" | "high";
              summary: string;
              flags: ComplianceFlag[];
              calendarFindings: Array<{
                id: string;
                topic: string;
                riskLevel: string;
                issues: string[];
              }>;
            };
            usage?: OpenAiUsage;
            model?: string;
          }
        | { ok: false; error: string };

      if (!result.ok) {
        setReviewError(result.error);
        return;
      }

      if (mode === "single") {
        setReview({
          score: result.review.score,
          riskLevel: result.review.riskLevel,
          summary: result.review.summary,
          flags: result.review.flags,
        });
        setRejectedFlags([]);
      } else {
        setCalendarReview({
          summary: result.review.summary,
          findings: result.review.calendarFindings,
        });
      }

      if (result.usage) {
        onRecordUsage(
          mode === "single" ? "Compliance review" : "Compliance calendar review",
          result.model ?? "unknown",
          result.usage,
        );
      }
    } catch (error) {
      setReviewError(error instanceof Error ? error.message : String(error));
    } finally {
      setReviewing("");
    }
  }

  function applyRevision(flag: ComplianceFlag) {
    if (draftCopy.includes(flag.sentence)) {
      setDraftCopy(draftCopy.replace(flag.sentence, flag.suggestedRevision));
      setRejectedFlags((current) => [...current, flag.sentence]);
    } else {
      setReviewError(
        "That exact sentence is no longer in the text above, so the revision was not applied automatically. Edit the text by hand if you still want the change.",
      );
    }
  }

  function rejectRevision(flag: ComplianceFlag) {
    setRejectedFlags((current) => [...current, flag.sentence]);
  }

  const visibleFlags = review
    ? review.flags.filter((flag) => !rejectedFlags.includes(flag.sentence))
    : [];

  return (
    <section className="space-y-4">
      <Card>
        <CardHeader className="flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <SectionTitle
            icon={ShieldCheck}
            kicker="Compliance"
            title="Education Marketing Compliance Checker"
            description="Instant rule check first, then a full AI review against the built-in education rules and your uploaded guideline documents."
          />
          <div className="flex flex-col items-stretch gap-2 sm:items-end">
            <div className="flex flex-wrap gap-2 sm:justify-end">
              <Button
                disabled={!liveAi || reviewing !== "" || !draftCopy.trim()}
                onClick={() => void runAiReview("single")}
                size="sm"
                type="button"
              >
                <Sparkles className="h-4 w-4" />
                {reviewing === "single" ? "Reviewing" : "Review with AI"}
              </Button>
              <Button
                disabled={!liveAi || reviewing !== "" || unapprovedItems.length === 0}
                onClick={() => void runAiReview("calendar")}
                size="sm"
                type="button"
                variant="outline"
              >
                <Sparkles className="h-4 w-4" />
                {reviewing === "calendar"
                  ? "Reviewing calendar"
                  : `Review entire calendar (${unapprovedItems.length} unapproved)`}
              </Button>
            </div>
            {!liveAi ? (
              <p className="text-xs leading-5 text-muted-foreground">
                Connect OpenAI in Settings to review with AI. The instant rule
                check below works offline.
              </p>
            ) : null}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {reviewError ? (
            <div className="rounded-md border border-warning-border bg-warning p-3 text-xs leading-5 text-warning-foreground">
              {reviewError}
            </div>
          ) : null}

          <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_380px]">
            <Field label="Paste copy, caption, script, testimonial, or landing page text">
              <Textarea
                className="min-h-72"
                value={draftCopy}
                onChange={(event) => setDraftCopy(event.target.value)}
              />
            </Field>
            <div className="space-y-3">
              <Badge variant={flags.length === 0 ? "success" : "warning"}>
                {flags.length === 0
                  ? "Instant check: no obvious risk found"
                  : `Instant check: ${flags.length} risk flag${flags.length === 1 ? "" : "s"}`}
              </Badge>
              <InsightList
                items={
                  flags.length > 0
                    ? flags
                    : ["Keep proof factual, avoid guarantees, and cite verifiable course details."]
                }
                title="Instant rule check"
                variant={flags.length > 0 ? "warning" : "success"}
              />
            </div>
          </div>

          {review ? (
            <div className="space-y-3 rounded-lg border bg-muted/20 p-3">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-sm font-semibold">AI compliance review</p>
                <Badge
                  variant={
                    review.riskLevel === "low"
                      ? "success"
                      : review.riskLevel === "medium"
                        ? "warning"
                        : "warning"
                  }
                >
                  {review.riskLevel} risk
                </Badge>
                <Badge variant="outline">Score {review.score}/100</Badge>
              </div>
              <p className="text-sm leading-6">{review.summary}</p>
              {visibleFlags.length === 0 ? (
                <p className="text-xs leading-5 text-muted-foreground">
                  No open flags. Any applied or rejected revisions are recorded
                  above in the text itself.
                </p>
              ) : (
                visibleFlags.map((flag) => (
                  <div className="rounded-md border bg-background p-3" key={flag.sentence}>
                    <p className="text-xs font-medium uppercase text-muted-foreground">
                      Flagged sentence
                    </p>
                    <p className="mt-1 text-sm leading-6">&ldquo;{flag.sentence}&rdquo;</p>
                    <p className="mt-2 text-xs leading-5 text-warning-foreground">
                      Rule broken: {flag.rule}
                    </p>
                    <p className="mt-2 text-xs font-medium uppercase text-muted-foreground">
                      Suggested revision
                    </p>
                    <p className="mt-1 text-sm leading-6">{flag.suggestedRevision}</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Button onClick={() => applyRevision(flag)} size="sm" type="button">
                        <CheckCircle2 className="h-4 w-4" />
                        Apply revision
                      </Button>
                      <Button
                        onClick={() => rejectRevision(flag)}
                        size="sm"
                        type="button"
                        variant="outline"
                      >
                        Reject
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          ) : null}

          {calendarReview ? (
            <div className="space-y-3 rounded-lg border bg-muted/20 p-3">
              <p className="text-sm font-semibold">Calendar review results</p>
              <p className="text-sm leading-6">{calendarReview.summary}</p>
              {calendarReview.findings.length === 0 ? (
                <p className="text-xs leading-5 text-success-foreground">
                  The AI found no items needing attention among the unapproved
                  captions.
                </p>
              ) : (
                calendarReview.findings.map((finding) => (
                  <div className="rounded-md border bg-background p-3" key={finding.id}>
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-sm font-semibold">{finding.topic}</p>
                      <Badge variant="warning">{finding.riskLevel} risk</Badge>
                    </div>
                    <ul className="mt-2 list-disc space-y-1 pl-4 text-xs leading-5 text-muted-foreground">
                      {finding.issues.map((issue) => (
                        <li key={issue}>{issue}</li>
                      ))}
                    </ul>
                  </div>
                ))
              )}
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <CardTitle>Guideline Documents</CardTitle>
            <CardDescription>
              Upload PDF, Word (.docx), or text policy documents. The AI
              reviewer reads them alongside the built-in education rules.
            </CardDescription>
          </div>
          <label
            className={cn(
              "inline-flex h-9 cursor-pointer items-center gap-2 rounded-md border border-input bg-background px-3 text-sm font-medium transition-colors hover:bg-muted",
              uploadingDoc && "pointer-events-none opacity-50",
            )}
          >
            <FileUp className="h-4 w-4" />
            {uploadingDoc ? "Reading" : "Upload guideline document"}
            <input
              accept=".pdf,.docx,.txt,.md,application/pdf,text/plain"
              className="sr-only"
              disabled={uploadingDoc}
              onChange={(event) => {
                const file = event.target.files?.[0];

                if (file) {
                  void uploadGuidelineDoc(file);
                }

                event.target.value = "";
              }}
              type="file"
            />
          </label>
        </CardHeader>
        <CardContent className="space-y-3">
          {docMessage ? (
            <div
              className={cn(
                "rounded-md border p-3 text-xs leading-5",
                docMessage.tone === "error"
                  ? "border-warning-border bg-warning text-warning-foreground"
                  : "border-success-border bg-success text-success-foreground",
              )}
            >
              {docMessage.text}
            </div>
          ) : null}

          {data.complianceDocs.length === 0 ? (
            <p className="text-xs leading-5 text-muted-foreground">
              No guideline documents yet. The AI reviewer will use the built-in
              education marketing rules only.
            </p>
          ) : (
            data.complianceDocs.map((doc) => (
              <div
                className="flex flex-wrap items-center justify-between gap-3 rounded-md border bg-muted/20 px-3 py-2"
                key={doc.id}
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium">{doc.name}</p>
                  <p className="text-xs leading-5 text-muted-foreground">
                    {doc.source.toUpperCase()}, {formatNumber(doc.characters)}{" "}
                    characters, uploaded {formatDateTime(doc.uploadedAt)}
                  </p>
                </div>
                <Button
                  onClick={() => deleteGuidelineDoc(doc)}
                  size="sm"
                  type="button"
                  variant="outline"
                >
                  <Trash2 className="h-4 w-4" />
                  Remove
                </Button>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Calendar Compliance Watchlist</CardTitle>
          <CardDescription>
            Existing calendar items with phrases that should be reviewed before approval.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {calendarFlags.length === 0 ? (
            <EmptyState
              action="Current calendar copy does not contain obvious risky claim patterns."
              icon={ShieldCheck}
              title="No watchlist items"
            />
          ) : (
            calendarFlags.map(({ flags: itemFlags, item }) => (
              <div className="rounded-lg border bg-muted/20 p-3" key={item.id}>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-semibold">{item.contentTopic}</p>
                  <StatusBadge status={item.status} />
                </div>
                <ul className="mt-2 list-disc space-y-1 pl-4 text-xs leading-5 text-muted-foreground">
                  {itemFlags.map((flag) => (
                    <li key={flag}>{flag}</li>
                  ))}
                </ul>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </section>
  );
}

function WeeklyNarrativePanel({
  data,
  onRecordUsage,
  onWeeklyReportChange,
}: {
  data: MarketingWorkspaceData;
  onRecordUsage: (module: string, model: string, usage: OpenAiUsage) => void;
  onWeeklyReportChange: (weeklyReport: WeeklyReport | null) => void;
}) {
  const [generating, setGenerating] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const liveAi = isLiveAiEnabled(data.aiIntegration);
  const report = data.weeklyReport;

  async function generateNarrative() {
    setGenerating(true);
    setErrorMessage("");

    try {
      const response = await fetch(apiUrl("/api/ai/report"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          apiKey: data.aiIntegration.apiKey,
          model: resolveModelForTask(data.aiIntegration, "analysis"),
          context: buildReportContext(data),
        }),
      });
      const result = (await response.json()) as
        | { ok: true; narrative: string; usage?: OpenAiUsage; model?: string }
        | { ok: false; error: string };

      if (!result.ok) {
        setErrorMessage(result.error);
        return;
      }

      onWeeklyReportChange({
        content: result.narrative,
        status: "draft",
        generatedAt: new Date().toISOString(),
        model: result.model ?? "unknown",
        approvedAt: "",
      });

      if (result.usage) {
        onRecordUsage("Weekly report", result.model ?? "unknown", result.usage);
      }
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : String(error));
    } finally {
      setGenerating(false);
    }
  }

  function editNarrative(content: string) {
    if (!report) {
      return;
    }

    // Any edit returns the report to draft so an approved report is always
    // exactly what the manager signed off.
    onWeeklyReportChange({
      ...report,
      content,
      status: "draft",
      approvedAt: "",
    });
  }

  function approveNarrative() {
    if (!report || !report.content.trim()) {
      return;
    }

    onWeeklyReportChange({
      ...report,
      status: "approved",
      approvedAt: new Date().toISOString(),
    });
  }

  return (
    <Card>
      <CardHeader className="flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <SectionTitle
          icon={PenLine}
          kicker="AI narrative"
          title="Weekly Narrative"
          description="A plain-English summary of the week written from your real numbers: what happened, what worked, risks, and next actions. Always a draft until you approve it."
        />
        <div className="flex flex-col items-stretch gap-2 sm:items-end">
          <div className="flex flex-wrap gap-2 sm:justify-end">
            <Button
              disabled={!liveAi || generating}
              onClick={generateNarrative}
              size="sm"
              type="button"
              variant="outline"
            >
              <Sparkles className="h-4 w-4" />
              {generating ? "Writing" : "Write narrative with AI"}
            </Button>
            <Button
              disabled={!report || !report.content.trim() || report.status === "approved"}
              onClick={approveNarrative}
              size="sm"
              type="button"
              variant={report?.status === "approved" ? "secondary" : "default"}
            >
              <CheckCircle2 className="h-4 w-4" />
              {report?.status === "approved" ? "Approved" : "Approve report"}
            </Button>
          </div>
          {!liveAi ? (
            <p className="text-xs leading-5 text-muted-foreground">
              Connect OpenAI in Settings to write the narrative with AI.
            </p>
          ) : null}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {errorMessage ? (
          <div className="rounded-md border border-warning-border bg-warning p-3 text-xs leading-5 text-warning-foreground">
            {errorMessage}
          </div>
        ) : null}

        {report ? (
          <>
            {report.status === "draft" ? (
              <div className="rounded-md border border-warning-border bg-warning p-3 text-xs leading-5 text-warning-foreground">
                AI draft, not yet approved. Edit the text below, then select
                Approve report when it says what you want it to say.
              </div>
            ) : null}
            <Textarea
              className="min-h-[260px]"
              value={report.content}
              onChange={(event) => editNarrative(event.target.value)}
            />
            <p className="text-xs leading-5 text-muted-foreground">
              Written by {report.model} on {report.generatedAt.slice(0, 16).replace("T", " ")}
              {report.status === "approved" && report.approvedAt
                ? `. Approved on ${report.approvedAt.slice(0, 16).replace("T", " ")}.`
                : "."}
            </p>
          </>
        ) : (
          <p className="text-sm leading-6 text-muted-foreground">
            No narrative yet. Use the AI button to write a draft from this
            week&apos;s numbers, then edit and approve it.
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function ApprovalsLogPanel({
  approvalsLog,
  approverName,
  onApproverNameChange,
}: {
  approvalsLog: ApprovalLogEntry[];
  approverName: string;
  onApproverNameChange: (approverName: string) => void;
}) {
  return (
    <Card>
      <CardHeader className="flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <SectionTitle
          icon={ShieldCheck}
          kicker="Audit trail"
          title="Approvals Log"
          description="A permanent record of every approval and rejection: what was decided, in which module, by whom, and when. Entries are written automatically and cannot be edited."
        />
        <div className="flex w-full flex-col gap-3 sm:w-[260px]">
          <Field label="Your name (stamped on decisions)">
            <Input
              placeholder="e.g. Felix"
              value={approverName}
              onChange={(event) => onApproverNameChange(event.target.value)}
            />
          </Field>
          <div className="flex flex-wrap gap-2">
            <Button
              disabled={approvalsLog.length === 0}
              onClick={() => downloadApprovalsLogPdf(approvalsLog)}
              size="sm"
              type="button"
              variant="outline"
            >
              <FileText className="h-4 w-4" />
              Export PDF
            </Button>
            <Button
              disabled={approvalsLog.length === 0}
              onClick={() => downloadApprovalsLogCsv(approvalsLog)}
              size="sm"
              type="button"
              variant="outline"
            >
              <Download className="h-4 w-4" />
              Export CSV
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {approvalsLog.length === 0 ? (
          <p className="text-sm leading-6 text-muted-foreground">
            No decisions recorded yet. Approvals and rejections across the
            whole workspace will appear here automatically.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px] text-left text-sm">
              <thead className="border-b text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="py-3 pr-4 font-medium">When</th>
                  <th className="py-3 pr-4 font-medium">Module</th>
                  <th className="py-3 pr-4 font-medium">What</th>
                  <th className="py-3 pr-4 font-medium">Decision</th>
                  <th className="py-3 pr-4 font-medium">By</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {approvalsLog.map((entry) => (
                  <tr key={entry.id}>
                    <td className="whitespace-nowrap py-3 pr-4 text-xs">
                      {entry.decidedAt.slice(0, 16).replace("T", " ")}
                    </td>
                    <td className="min-w-[150px] py-3 pr-4">{entry.module}</td>
                    <td className="min-w-[320px] py-3 pr-4 text-xs leading-5">
                      {entry.subject}
                    </td>
                    <td className="py-3 pr-4">
                      {entry.decision === "approved" ? (
                        <span className="rounded-md border border-success-border bg-success px-2 py-0.5 text-xs font-medium text-success-foreground">
                          Approved
                        </span>
                      ) : (
                        <span className="rounded-md border border-warning-border bg-warning px-2 py-0.5 text-xs font-medium text-warning-foreground">
                          Rejected
                        </span>
                      )}
                    </td>
                    <td className="min-w-[130px] py-3 pr-4">{entry.decidedBy}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function ReportsView({
  data,
  onApproverNameChange,
  onRecordUsage,
  onWeeklyReportChange,
}: {
  data: MarketingWorkspaceData;
  onApproverNameChange: (approverName: string) => void;
  onRecordUsage: (module: string, model: string, usage: OpenAiUsage) => void;
  onWeeklyReportChange: (weeklyReport: WeeklyReport | null) => void;
}) {
  const delayed = data.calendar.filter((item) =>
    ["drafting", "review", "revision"].includes(item.status) ||
    item.approvalStage === "revision",
  );
  const topRecommendations = data.ucc.kpiRecords.map((row) => row.recommendation);
  const acceptedActions = acceptedInsightLines(data);

  return (
    <section className="space-y-4">
      <Card>
        <CardHeader>
          <SectionTitle
            icon={Download}
            kicker="Reports"
            title="Management Reporting"
            description="Weekly management view: posted work, delayed work, performance, leads, applications, budget used, and recommended next actions."
          />
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <LearningMetric
            label="Posted/published"
            value={String(data.calendar.filter((item) => item.status === "posted" || item.approvalStage === "published").length)}
            detail="Calendar items completed"
          />
          <LearningMetric
            label="Delayed"
            value={String(delayed.length)}
            detail="Draft, review, or revision"
          />
          <LearningMetric
            label="Leads"
            value={formatNumber(data.ucc.kpiRecords.reduce((sum, row) => sum + row.leads, 0))}
            detail="Campaign KPI records"
          />
          <LearningMetric
            label="Budget used"
            value={formatNumber(data.ucc.campaigns.reduce((sum, campaign) => sum + campaign.actualResults.spend, 0))}
            detail="Actual campaign spend"
          />
        </CardContent>
      </Card>
      <WeeklyNarrativePanel
        data={data}
        onRecordUsage={onRecordUsage}
        onWeeklyReportChange={onWeeklyReportChange}
      />
      <ApprovalsLogPanel
        approvalsLog={data.approvalsLog}
        approverName={data.approverName}
        onApproverNameChange={onApproverNameChange}
      />
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_380px]">
        <ExportView data={data} />
        <Card>
          <CardHeader>
            <CardTitle>Recommended Next Actions</CardTitle>
            <CardDescription>
              Recommendations from your KPI records, plus every AI suggestion
              you have accepted (budget, KPI, audit, competitor, and trend).
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {topRecommendations.map((recommendation) => (
              <div className="rounded-lg border bg-muted/20 p-3 text-sm leading-6" key={recommendation}>
                {recommendation}
              </div>
            ))}
            {acceptedActions.map((line) => (
              <div className="rounded-lg border bg-muted/20 p-3 text-sm leading-6" key={line}>
                {line}
              </div>
            ))}
            {topRecommendations.length === 0 && acceptedActions.length === 0 ? (
              <p className="text-sm leading-6 text-muted-foreground">
                Nothing yet. Recommendations appear here from KPI records and
                from any AI suggestion you accept.
              </p>
            ) : null}
          </CardContent>
        </Card>
      </div>
    </section>
  );
}

const themeSwatches: Record<ThemeId, string[]> = {
  "original-dark": ["#0d1526", "#151d31", "#17c0e0", "#34c199"],
  "original-light": ["#f6f8fb", "#ffffff", "#0a6f88", "#37a884"],
  arcane: ["#0b0a20", "#171236", "#dca63f", "#9a6bd8"],
  kingdom: ["#e5d2ac", "#f4e9cf", "#b5642c", "#4e7a3f"],
};

function AppearanceSettingsPanel() {
  const { theme, setTheme } = useTheme();

  return (
    <Card>
      <CardHeader>
        <SectionTitle
          icon={Palette}
          kicker="Appearance"
          title="Appearance"
          description="Choose a colour theme for the workspace. Your choice is saved on this device and applies instantly."
        />
      </CardHeader>
      <CardContent className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {THEMES.map((option) => {
          const active = theme === option.id;

          return (
            <button
              aria-pressed={active}
              className={cn(
                "flex flex-col gap-3 rounded-lg border p-4 text-left transition-colors",
                active
                  ? "border-primary ring-2 ring-ring"
                  : "border-border hover:bg-muted/40",
              )}
              key={option.id}
              onClick={() => setTheme(option.id)}
              type="button"
            >
              <span aria-hidden="true" className="flex gap-1.5">
                {themeSwatches[option.id].map((colour, index) => (
                  <span
                    className="h-6 w-6 rounded-full border"
                    key={`${option.id}-${index}`}
                    style={{ backgroundColor: colour }}
                  />
                ))}
              </span>
              <span className="flex items-center justify-between gap-2">
                <span className="text-sm font-semibold">{option.label}</span>
                {active ? (
                  <span className="rounded-md border border-success-border bg-success px-2 py-0.5 text-xs font-medium text-success-foreground">
                    Active
                  </span>
                ) : null}
              </span>
              <span className="text-xs leading-5 text-muted-foreground">
                {option.description}
              </span>
            </button>
          );
        })}
      </CardContent>
    </Card>
  );
}

function SyncStatusBadge({
  isHydrated,
  sync,
}: {
  isHydrated: boolean;
  sync: WorkspaceSync;
}) {
  if (!isHydrated) {
    return <Badge variant="outline">Loading</Badge>;
  }

  const display: Record<
    WorkspaceSync["status"],
    { label: string; variant: ComponentProps<typeof Badge>["variant"] }
  > = {
    "local-only": { label: "Local only", variant: "outline" },
    connecting: { label: "Connecting to cloud", variant: "secondary" },
    saving: { label: "Saving", variant: "secondary" },
    synced: { label: "Synced to cloud", variant: "success" },
    offline: { label: "Offline, saved on this device", variant: "warning" },
    error: { label: "Error", variant: "warning" },
  };

  const current = display[sync.status];

  return <Badge variant={current.variant}>{current.label}</Badge>;
}

function SupabaseDatabasePanel({ sync }: { sync: WorkspaceSync }) {
  const [url, setUrl] = useState("");
  const [anonKey, setAnonKey] = useState("");
  const [testState, setTestState] = useState<
    "idle" | "testing" | "ok" | "error"
  >("idle");
  const [testMessage, setTestMessage] = useState("");

  useEffect(() => {
    const resolved = resolveSupabaseConfig();

    if (resolved.config) {
      setUrl(resolved.config.url);
      setAnonKey(resolved.config.anonKey);
    }
  }, []);

  const statusBadge = !sync.isConfigured
    ? { label: "Local only", variant: "secondary" as const }
    : sync.status === "error"
      ? { label: "Error", variant: "warning" as const }
      : { label: "Configured", variant: "success" as const };

  function requireFields() {
    if (!url.trim() || !anonKey.trim()) {
      setTestState("error");
      setTestMessage("Enter both the Project URL and the anon key first.");
      return false;
    }

    return true;
  }

  async function handleTest() {
    if (!requireFields()) {
      return;
    }

    setTestState("testing");
    setTestMessage("");

    const result = await sync.testConnection({
      url: url.trim(),
      anonKey: anonKey.trim(),
    });

    if (result.ok) {
      setTestState("ok");
      setTestMessage(
        "Connection successful. The workspace_state table is reachable.",
      );
    } else {
      setTestState("error");
      setTestMessage(result.error ?? "Connection failed.");
    }
  }

  function handleSave() {
    if (!requireFields()) {
      return;
    }

    sync.saveConfigAndReload({ url: url.trim(), anonKey: anonKey.trim() });
  }

  async function handleReload() {
    if (typeof window !== "undefined") {
      const confirmed = window.confirm(
        "Reload from Supabase will replace the data on this device with the cloud snapshot. Continue?",
      );

      if (!confirmed) {
        return;
      }
    }

    await sync.reloadFromCloud();
  }

  function handleClear() {
    if (typeof window !== "undefined") {
      const confirmed = window.confirm(
        "Forget the saved Supabase credentials and use local storage only?",
      );

      if (!confirmed) {
        return;
      }
    }

    sync.clearConfigAndReload();
  }

  return (
    <Card>
      <CardHeader>
        <SectionTitle
          icon={Database}
          kicker="Supabase"
          title="Supabase database"
          description="Connect a Supabase project to sync this workspace to the cloud. Local storage stays the source of truth, so the app keeps working offline."
        />
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant={statusBadge.variant}>{statusBadge.label}</Badge>
          {sync.isConfigured && sync.source === "env" ? (
            <span className="text-xs text-muted-foreground">
              Using values from environment variables. Panel values override
              them.
            </span>
          ) : null}
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <Field label="Project URL">
            <Input
              onChange={(event) => setUrl(event.target.value)}
              placeholder="https://your-project.supabase.co"
              value={url}
            />
          </Field>
          <Field label="Anon / publishable key">
            <Input
              onChange={(event) => setAnonKey(event.target.value)}
              placeholder="Paste the anon public key"
              type="password"
              value={anonKey}
            />
          </Field>
        </div>

        <div className="rounded-md border border-warning-border bg-warning p-3 text-xs leading-5 text-warning-foreground">
          Use only the anon / publishable key. Never paste the service_role key
          here. This key allows anyone who has it to read and write the
          workspace data until sign in is added. Tighten the policy when
          authentication lands.
        </div>

        <div className="flex flex-wrap gap-2">
          <Button onClick={handleSave} size="sm" type="button">
            {"Save & reload"}
          </Button>
          <Button
            disabled={testState === "testing"}
            onClick={handleTest}
            size="sm"
            type="button"
            variant="outline"
          >
            {testState === "testing" ? "Testing" : "Test connection"}
          </Button>
          <Button
            disabled={!sync.isConfigured}
            onClick={handleReload}
            size="sm"
            type="button"
            variant="outline"
          >
            Reload from Supabase
          </Button>
          <Button
            onClick={handleClear}
            size="sm"
            type="button"
            variant="outline"
          >
            Clear (use local storage only)
          </Button>
        </div>

        {testMessage ? (
          <p
            className={cn(
              "text-xs leading-5",
              testState === "ok"
                ? "text-success-foreground"
                : "text-warning-foreground",
            )}
          >
            {testMessage}
          </p>
        ) : null}

        {sync.lastError && (sync.status === "offline" || sync.status === "error") ? (
          <div className="rounded-md border border-warning-border bg-warning p-3 text-xs leading-5 text-warning-foreground">
            Cloud sync error: {sync.lastError}
          </div>
        ) : null}

        {sync.lastError &&
        sync.status !== "offline" &&
        sync.status !== "error" &&
        testState !== "error" ? (
          <p className="text-xs leading-5 text-muted-foreground">
            Last sync note: {sync.lastError}
          </p>
        ) : null}

        {sync.snapshotWarning ? (
          <div className="rounded-md border border-warning-border bg-warning p-3 text-xs leading-5 text-warning-foreground">
            Version history is off: {sync.snapshotWarning}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

function AiIntegrationPanel({
  aiIntegration,
  aiUsage,
  onAiIntegrationChange,
}: {
  aiIntegration: AiIntegrationSettings;
  aiUsage: AiUsageEntry[];
  onAiIntegrationChange: (aiIntegration: AiIntegrationSettings) => void;
}) {
  const [keyDraft, setKeyDraft] = useState(aiIntegration.apiKey);
  const [models, setModels] = useState<string[]>([]);
  const [fetchState, setFetchState] = useState<"idle" | "fetching" | "ok" | "error">(
    "idle",
  );
  const [fetchMessage, setFetchMessage] = useState("");

  const isLive = isLiveAiEnabled(aiIntegration);

  // Always let the currently saved models be selectable, even before a fresh
  // fetch, so a reload still shows the saved choice.
  const analysisOptions = Array.from(
    new Set([aiIntegration.analysisModel, ...models].filter(Boolean)),
  );
  const utilityOptions = Array.from(
    new Set([aiIntegration.utilityModel, ...models].filter(Boolean)),
  );

  function update(patch: Partial<AiIntegrationSettings>) {
    onAiIntegrationChange({ ...aiIntegration, ...patch });
  }

  async function fetchModels() {
    if (!keyDraft.trim()) {
      setFetchState("error");
      setFetchMessage("Enter an OpenAI API key first.");
      return;
    }

    setFetchState("fetching");
    setFetchMessage("");

    try {
      const response = await fetch(apiUrl("/api/openai/models"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ apiKey: keyDraft.trim() }),
      });
      const result = (await response.json()) as
        | { ok: true; models: string[] }
        | { ok: false; error: string };

      if (!result.ok) {
        setFetchState("error");
        setFetchMessage(result.error);
        return;
      }

      setModels(result.models);
      setFetchState("ok");

      const defaults = suggestModels(result.models);
      const nextAnalysis = aiIntegration.analysisModel || defaults.analysis;
      const nextUtility = aiIntegration.utilityModel || defaults.utility;
      const autoPicked =
        !aiIntegration.analysisModel || !aiIntegration.utilityModel;

      if (nextAnalysis !== aiIntegration.analysisModel || nextUtility !== aiIntegration.utilityModel) {
        update({ analysisModel: nextAnalysis, utilityModel: nextUtility });
      }

      setFetchMessage(
        autoPicked
          ? `Found ${result.models.length} models. Preselected "${nextAnalysis}" for analysis and "${nextUtility}" for utility. Change either below.`
          : `Found ${result.models.length} models.`,
      );
    } catch (error) {
      setFetchState("error");
      setFetchMessage(error instanceof Error ? error.message : String(error));
    }
  }

  return (
    <Card>
      <CardHeader>
        <SectionTitle
          icon={Sparkles}
          kicker="AI"
          title="AI integration (OpenAI)"
          description="Connect an OpenAI key to run the AI features live. When it is off, the AI features use the offline rule-based drafts."
        />
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant={isLive ? "success" : "secondary"}>
            {isLive ? "Live AI active" : "Offline rules"}
          </Badge>
        </div>

        <div className="rounded-md border border-warning-border bg-warning p-3 text-xs leading-5 text-warning-foreground">
          Your API key is synced to Supabase so it follows you across devices.
          Because the workspace table uses an open access policy, anyone with
          your project&apos;s anon key can read it. Use a key scoped or limited
          to this prototype, and do not connect a shared Supabase project you do
          not control. Leave Supabase unconfigured to keep the key on this
          browser only.
        </div>

        <label className="flex items-center justify-between gap-3 rounded-lg border bg-muted/20 p-3">
          <span>
            <span className="text-sm font-medium">Enable live AI calls</span>
            <span className="mt-1 block text-xs leading-5 text-muted-foreground">
              Otherwise the AI features use the offline rule-based drafts.
            </span>
          </span>
          <button
            aria-checked={aiIntegration.enabled}
            className={cn(
              "relative h-6 w-11 shrink-0 rounded-full border transition-colors",
              aiIntegration.enabled ? "bg-primary" : "bg-muted",
            )}
            onClick={() => update({ enabled: !aiIntegration.enabled })}
            role="switch"
            type="button"
          >
            <span
              className={cn(
                "absolute top-0.5 h-4 w-4 rounded-full bg-background transition-all",
                aiIntegration.enabled ? "left-6" : "left-1",
              )}
            />
          </button>
        </label>

        <Field label="OpenAI API key">
          <Input
            onChange={(event) => setKeyDraft(event.target.value)}
            placeholder="sk-..."
            type="password"
            value={keyDraft}
          />
        </Field>

        <div className="flex flex-wrap gap-2">
          <Button
            disabled={fetchState === "fetching"}
            onClick={fetchModels}
            size="sm"
            type="button"
            variant="outline"
          >
            {fetchState === "fetching" ? "Fetching" : "Fetch available models"}
          </Button>
          <Button onClick={() => update({ apiKey: keyDraft.trim() })} size="sm" type="button">
            Save key
          </Button>
          <Button
            onClick={() => {
              setKeyDraft("");
              setModels([]);
              setFetchState("idle");
              setFetchMessage("");
              update({ apiKey: "", enabled: false });
            }}
            size="sm"
            type="button"
            variant="outline"
          >
            Clear key
          </Button>
        </div>

        {fetchMessage ? (
          <p
            className={cn(
              "text-xs leading-5",
              fetchState === "error" ? "text-warning-foreground" : "text-muted-foreground",
            )}
          >
            {fetchMessage}
          </p>
        ) : null}

        <div className="grid gap-3 md:grid-cols-2">
          <Field label="Analysis model">
            <NativeSelect
              onChange={(event) => update({ analysisModel: event.target.value })}
              value={aiIntegration.analysisModel}
            >
              <option value="">Fetch models to choose</option>
              {analysisOptions.map((model) => (
                <option key={model} value={model}>
                  {model}
                </option>
              ))}
            </NativeSelect>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">
              Used for strategy, campaign ideas, compliance review, copywriting,
              and calendar drafting. Use a smarter model.
            </p>
          </Field>
          <Field label="Utility model">
            <NativeSelect
              onChange={(event) => update({ utilityModel: event.target.value })}
              value={aiIntegration.utilityModel}
            >
              <option value="">Fetch models to choose</option>
              {utilityOptions.map((model) => (
                <option key={model} value={model}>
                  {model}
                </option>
              ))}
            </NativeSelect>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">
              Used for lighter tasks like reading images and condensing text. A
              cheaper model is fine.
            </p>
          </Field>
        </div>

        <Field label="xAI API key (optional, for social listening on X)">
          <Input
            onChange={(event) => update({ xaiApiKey: event.target.value })}
            placeholder="xai-..."
            type="password"
            value={aiIntegration.xaiApiKey ?? ""}
          />
          <p className="mt-1 text-xs leading-5 text-muted-foreground">
            Without this key, social listening searches Reddit only and says
            so. Stored the same way as the OpenAI key.
          </p>
        </Field>

        <p className="text-xs leading-5 text-muted-foreground">
          AI output is always a draft for your approval. The AI never approves
          or publishes on its own.
        </p>

        <AiUsageMeter
          aiIntegration={aiIntegration}
          aiUsage={aiUsage}
          onAiIntegrationChange={onAiIntegrationChange}
        />
      </CardContent>
    </Card>
  );
}

function AiUsageMeter({
  aiIntegration,
  aiUsage,
  onAiIntegrationChange,
}: {
  aiIntegration: AiIntegrationSettings;
  aiUsage: AiUsageEntry[];
  onAiIntegrationChange: (aiIntegration: AiIntegrationSettings) => void;
}) {
  const totals = monthlyAiUsageTotals(aiUsage);
  const meteredModels = Array.from(
    new Set(
      [aiIntegration.analysisModel, aiIntegration.utilityModel].filter(Boolean),
    ),
  );

  function updatePrice(
    model: string,
    field: "inPerMillion" | "outPerMillion",
    value: number,
  ) {
    const existing = aiIntegration.modelPrices?.[model] ?? {
      inPerMillion: 0,
      outPerMillion: 0,
    };

    onAiIntegrationChange({
      ...aiIntegration,
      modelPrices: {
        ...(aiIntegration.modelPrices ?? {}),
        [model]: { ...existing, [field]: value },
      },
    });
  }

  return (
    <div className="space-y-3 rounded-lg border bg-muted/20 p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-semibold">AI usage this month</p>
        <Badge variant="outline">{totals.calls} call{totals.calls === 1 ? "" : "s"}</Badge>
      </div>

      <div className="grid gap-2 text-xs leading-5 sm:grid-cols-3">
        <p>
          <span className="font-medium">Input tokens:</span>{" "}
          {formatNumber(totals.promptTokens)}
        </p>
        <p>
          <span className="font-medium">Output tokens:</span>{" "}
          {formatNumber(totals.completionTokens)}
        </p>
        <p>
          <span className="font-medium">Estimated cost:</span>{" "}
          {totals.estimatedCost !== null
            ? `US$${totals.estimatedCost.toFixed(2)}${
                totals.uncostedCalls > 0
                  ? ` plus ${totals.uncostedCalls} unpriced call${totals.uncostedCalls === 1 ? "" : "s"}`
                  : ""
              }`
            : totals.calls > 0
              ? "Set model prices below to estimate cost"
              : "No calls yet"}
        </p>
      </div>

      {meteredModels.length > 0 ? (
        <div className="space-y-2">
          <p className="text-xs font-medium uppercase text-muted-foreground">
            Model prices, US$ per million tokens
          </p>
          <p className="text-xs leading-5 text-muted-foreground">
            Check these against OpenAI&apos;s pricing page. Costs shown are
            estimates based on the numbers you enter here.
          </p>
          {meteredModels.map((model) => (
            <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_120px_120px]" key={model}>
              <p className="self-center break-all text-xs font-medium">{model}</p>
              <Input
                className="h-8"
                placeholder="Input"
                step="0.01"
                type="number"
                value={aiIntegration.modelPrices?.[model]?.inPerMillion ?? ""}
                onChange={(event) =>
                  updatePrice(model, "inPerMillion", toNumber(event.target.value))
                }
              />
              <Input
                className="h-8"
                placeholder="Output"
                step="0.01"
                type="number"
                value={aiIntegration.modelPrices?.[model]?.outPerMillion ?? ""}
                onChange={(event) =>
                  updatePrice(model, "outPerMillion", toNumber(event.target.value))
                }
              />
            </div>
          ))}
        </div>
      ) : null}

      {aiUsage.length > 0 ? (
        <div className="space-y-1">
          <p className="text-xs font-medium uppercase text-muted-foreground">
            Recent calls
          </p>
          {aiUsage.slice(0, 10).map((entry) => (
            <p className="text-xs leading-5 text-muted-foreground" key={entry.id}>
              {formatDateTime(entry.date)}: {entry.module}, {entry.model},{" "}
              {formatNumber(entry.promptTokens + entry.completionTokens)} tokens
              {entry.estimatedCost !== null
                ? `, about US$${entry.estimatedCost.toFixed(3)}`
                : ""}
            </p>
          ))}
        </div>
      ) : (
        <p className="text-xs leading-5 text-muted-foreground">
          No AI calls recorded yet. Every generation across the app will appear
          here with its real token count.
        </p>
      )}
    </div>
  );
}

// Downloads a timestamped JSON backup file of the whole workspace. Throws if
// the browser download sequence fails; callers decide whether to catch that.
function downloadWorkspaceBackup(workspaceData: MarketingWorkspaceData) {
  const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");
  const blob = new Blob([JSON.stringify(workspaceData, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `ucc-marketing-os-backup-${stamp}.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function BackupHistoryPanel({
  onRestoreWorkspace,
  sync,
  workspaceData,
}: {
  onRestoreWorkspace: (workspace: MarketingWorkspaceData) => void;
  sync: WorkspaceSync;
  workspaceData: MarketingWorkspaceData;
}) {
  const [message, setMessage] = useState<{ tone: "success" | "error"; text: string } | null>(null);
  const [snapshots, setSnapshots] = useState<Array<{ id: string; createdAt: string }>>([]);
  const [busy, setBusy] = useState<"" | "saving" | "listing" | string>("");

  function downloadBackup() {
    downloadWorkspaceBackup(workspaceData);
    setMessage({ tone: "success", text: "Backup file downloaded." });
  }

  async function restoreFromFile(file: File) {
    if (typeof window !== "undefined") {
      const confirmed = window.confirm(
        "Restore from this backup file? It replaces everything currently in the workspace.",
      );

      if (!confirmed) {
        return;
      }
    }

    try {
      const parsed = JSON.parse(await file.text()) as MarketingWorkspaceData;

      if (!parsed || typeof parsed !== "object" || !parsed.brand) {
        setMessage({
          tone: "error",
          text: "That file does not look like a workspace backup.",
        });
        return;
      }

      onRestoreWorkspace(parsed);
      setMessage({ tone: "success", text: `Restored from ${file.name}.` });
    } catch {
      setMessage({
        tone: "error",
        text: "Could not read that file as JSON. Choose a backup downloaded from this panel.",
      });
    }
  }

  async function saveVersionNow() {
    setBusy("saving");
    const result = await sync.saveSnapshotNow();
    setBusy("");
    setMessage(
      result.ok
        ? { tone: "success", text: "Version saved to Supabase." }
        : { tone: "error", text: result.error ?? "Could not save a version." },
    );

    if (result.ok) {
      void refreshList();
    }
  }

  async function refreshList() {
    setBusy("listing");
    const result = await sync.listSnapshots();
    setBusy("");

    if (result.ok) {
      setSnapshots(result.snapshots);
      setMessage(
        result.snapshots.length === 0
          ? {
              tone: "success",
              text: "No saved versions yet. They appear after cloud saves, or use Save a version now.",
            }
          : null,
      );
    } else {
      setMessage({ tone: "error", text: result.error });
    }
  }

  async function restoreVersion(id: string, createdAt: string) {
    if (typeof window !== "undefined") {
      const confirmed = window.confirm(
        `Restore the version saved ${formatDateTime(createdAt)}? It replaces everything currently in the workspace.`,
      );

      if (!confirmed) {
        return;
      }
    }

    setBusy(id);
    const result = await sync.restoreSnapshot(id);
    setBusy("");
    setMessage(
      result.ok
        ? { tone: "success", text: "Version restored." }
        : { tone: "error", text: result.error ?? "Could not restore that version." },
    );
  }

  return (
    <Card>
      <CardHeader>
        <SectionTitle
          icon={Download}
          kicker="Safety"
          title="Backup and history"
          description="Download the whole workspace as a file, restore from a file, and roll back to an earlier cloud version."
        />
      </CardHeader>
      <CardContent className="space-y-4">
        {sync.snapshotWarning ? (
          <div className="rounded-md border border-warning-border bg-warning p-3 text-xs leading-5 text-warning-foreground">
            Version history is not saving: {sync.snapshotWarning}
          </div>
        ) : null}
        <div className="flex flex-wrap gap-2">
          <Button onClick={downloadBackup} size="sm" type="button">
            <Download className="h-4 w-4" />
            Download backup
          </Button>
          <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-input bg-background px-3 text-sm font-medium transition-colors hover:bg-muted"
            style={{ height: "2.25rem" }}
          >
            <FileUp className="h-4 w-4" />
            Restore from backup
            <input
              accept=".json,application/json"
              className="sr-only"
              onChange={(event) => {
                const file = event.target.files?.[0];

                if (file) {
                  void restoreFromFile(file);
                }

                event.target.value = "";
              }}
              type="file"
            />
          </label>
        </div>

        <div className="space-y-3 rounded-lg border bg-muted/20 p-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-semibold">Cloud version history</p>
            <div className="flex flex-wrap gap-2">
              <Button
                disabled={!sync.isConfigured || busy === "saving"}
                onClick={saveVersionNow}
                size="sm"
                type="button"
                variant="outline"
              >
                {busy === "saving" ? "Saving" : "Save a version now"}
              </Button>
              <Button
                disabled={!sync.isConfigured || busy === "listing"}
                onClick={refreshList}
                size="sm"
                type="button"
                variant="outline"
              >
                <RefreshCcw className="h-4 w-4" />
                {busy === "listing" ? "Loading" : "Show versions"}
              </Button>
            </div>
          </div>

          {!sync.isConfigured ? (
            <p className="text-xs leading-5 text-muted-foreground">
              Connect Supabase above to keep the last 20 versions in the cloud.
              The file backup buttons work without it.
            </p>
          ) : (
            <p className="text-xs leading-5 text-muted-foreground">
              A version is saved automatically at most once every five minutes
              while you work, keeping the newest 20.
            </p>
          )}

          {snapshots.length > 0 ? (
            <div className="space-y-1">
              {snapshots.map((snapshot) => (
                <div
                  className="flex items-center justify-between gap-3 rounded-md border bg-background px-3 py-2"
                  key={snapshot.id}
                >
                  <p className="text-xs leading-5">
                    {formatDateTime(snapshot.createdAt)}
                  </p>
                  <Button
                    disabled={busy === snapshot.id}
                    onClick={() => void restoreVersion(snapshot.id, snapshot.createdAt)}
                    size="sm"
                    type="button"
                    variant="outline"
                  >
                    {busy === snapshot.id ? "Restoring" : "Restore"}
                  </Button>
                </div>
              ))}
            </div>
          ) : null}
        </div>

        {message ? (
          <p
            className={cn(
              "text-xs leading-5",
              message.tone === "success"
                ? "text-success-foreground"
                : "text-warning-foreground",
            )}
          >
            {message.text}
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}

function WorkspaceDataModePanel({
  onRestoreWorkspace,
  sync,
  workspaceData,
}: {
  onRestoreWorkspace: (workspace: MarketingWorkspaceData) => void;
  sync: WorkspaceSync;
  workspaceData: MarketingWorkspaceData;
}) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ tone: "success" | "error"; text: string } | null>(null);

  const isSample = (workspaceData.datasetMode ?? "sample") === "sample";

  // Always keep a copy before a destructive replace: download a backup file
  // (works with no cloud) and attempt a cloud snapshot when Supabase is
  // connected. Never blocks the replace on the cloud call.
  function backupFirst() {
    try {
      downloadWorkspaceBackup(workspaceData);
    } catch {
      // A failed download must not stop the owner replacing the data; they
      // were warned and can also use the Backup panel above.
    }

    if (sync.isConfigured) {
      void sync.saveSnapshotNow();
    }
  }

  async function loadSample() {
    if (typeof window !== "undefined") {
      const confirmed = window.confirm(
        "Load sample data? This REPLACES everything currently in the workspace with the demo content. A backup file of the current workspace will be downloaded first.",
      );

      if (!confirmed) {
        return;
      }
    }

    setBusy(true);
    backupFirst();
    onRestoreWorkspace(createSeedWorkspaceData());
    setBusy(false);
    setMessage({
      tone: "success",
      text: "Sample data loaded. A backup of your previous workspace was downloaded.",
    });
  }

  async function startEmpty() {
    if (typeof window !== "undefined") {
      const confirmed = window.confirm(
        "Start empty? This REPLACES everything currently in the workspace with a blank one so you can enter real UCC data. Your OpenAI and Supabase settings and connections are kept. A backup file of the current workspace will be downloaded first.",
      );

      if (!confirmed) {
        return;
      }
    }

    setBusy(true);
    backupFirst();

    // A blank workspace, but keep configuration the owner has already set up
    // (AI keys, platform connections, and their name) so they are not forced
    // to reconnect after clearing content.
    const blank = createEmptyWorkspaceData();
    onRestoreWorkspace({
      ...blank,
      aiIntegration: workspaceData.aiIntegration,
      connections: workspaceData.connections,
      approverName: workspaceData.approverName,
    });
    setBusy(false);
    setMessage({
      tone: "success",
      text: "Workspace cleared to a blank slate. A backup of your previous workspace was downloaded. Your settings and connections were kept.",
    });
  }

  return (
    <Card>
      <CardHeader className="flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <SectionTitle
          icon={Database}
          kicker="Workspace"
          title="Sample data or your own data"
          description="Explore with the built-in demo content, or clear to a blank workspace to enter real UCC data. Both replace what is here now and download a backup first."
        />
        <Badge variant={isSample ? "info" : "success"}>
          {isSample ? "Sample data" : "Live data"}
        </Badge>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex flex-wrap gap-2">
          <Button disabled={busy} onClick={() => void loadSample()} size="sm" type="button">
            <Database className="h-4 w-4" />
            Load sample data
          </Button>
          <Button
            disabled={busy}
            onClick={() => void startEmpty()}
            size="sm"
            type="button"
            variant="outline"
          >
            <FileText className="h-4 w-4" />
            Start empty
          </Button>
        </div>
        <p className="text-xs leading-5 text-muted-foreground">
          The badge above shows which state you are in now.{" "}
          {isSample
            ? "You are looking at the demo content. Choose Start empty when you are ready to enter real data."
            : "You are working with your own data."}
        </p>
        {message ? (
          <p
            className={cn(
              "text-xs leading-5",
              message.tone === "success"
                ? "text-success-foreground"
                : "text-warning-foreground",
            )}
          >
            {message.text}
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}

// The live Metricool connect/sync flow, plus its review-and-apply and
// confirmation steps. Shared by Settings and Market Intelligence so both
// trigger the exact same real sync against the same connections list,
// instead of two independent copies of this wiring.
// The review/apply state behind the Metricool sync flow. A hook (not a
// component) because Settings also needs to feed a CSV-parsed result into
// the same pendingReview state from a sibling panel (CsvImportPanel).
function useMetricReviewFlow(
  onApplyMetrics: (
    metrics: PlatformDataMetrics[],
    approvedBy: string,
    source: { label: string; noteLabel: string; rangeLabel: string; editedCount: number },
  ) => void,
) {
  const [pendingReview, setPendingReview] = useState<PendingMetricReview | null>(null);
  const [approverName, setApproverName] = useState("");

  function handleRowChange(rowId: string, patch: Partial<PdfMetricReview>) {
    setPendingReview((current) =>
      current
        ? {
            ...current,
            rows: current.rows.map((row) =>
              row.id === rowId ? { ...row, ...patch, edited: true } : row,
            ),
          }
        : current,
    );
  }

  function handleApply() {
    if (!pendingReview) {
      return;
    }

    const approvedRows = pendingReview.rows.filter((row) => row.approved);

    onApplyMetrics(reviewRowsToApprovedMetrics(pendingReview.rows), approverName.trim(), {
      label: pendingReview.sourceLabel,
      noteLabel: pendingReview.noteLabel,
      rangeLabel: pendingReview.rangeLabel,
      editedCount: approvedRows.filter((row) => row.edited).length,
    });
    setPendingReview(null);
  }

  return {
    approverName,
    handleApply,
    handleRowChange,
    pendingReview,
    setApproverName,
    setPendingReview,
  };
}

function PlatformDataIntegrationPanel({
  apiKey,
  applyConfirmation,
  approverName,
  connections,
  model,
  pendingReview,
  onApply,
  onApproverNameChange,
  onConnectionsChange,
  onDiscardReview,
  onDismissApplyConfirmation,
  onRecordUsage,
  onRowChange,
  onSyncReview,
  onViewAppliedData,
}: {
  apiKey: string;
  applyConfirmation: { appliedPlatforms: AppliedPlatformSummary[]; label: string } | null;
  approverName: string;
  connections: PlatformConnection[];
  model: string;
  pendingReview: PendingMetricReview | null;
  onApply: () => void;
  onApproverNameChange: (approverName: string) => void;
  onConnectionsChange: (connections: PlatformConnection[]) => void;
  onDiscardReview: () => void;
  onDismissApplyConfirmation: () => void;
  onRecordUsage: (module: string, model: string, usage: OpenAiUsage) => void;
  onRowChange: (rowId: string, patch: Partial<PdfMetricReview>) => void;
  onSyncReview: (review: PendingMetricReview) => void;
  onViewAppliedData: (platform: Platform) => void;
}) {
  return (
    <>
      <ConnectionManagerPanel
        apiKey={apiKey}
        connections={connections}
        model={model}
        onConnectionsChange={onConnectionsChange}
        onRecordUsage={onRecordUsage}
        onSyncReview={(review) => {
          onDismissApplyConfirmation();
          onSyncReview(review);
        }}
      />
      {pendingReview ? (
        <MetricReviewPanel
          approverName={approverName}
          onApply={onApply}
          onApproverNameChange={onApproverNameChange}
          onDiscard={onDiscardReview}
          onRowChange={onRowChange}
          pending={pendingReview}
        />
      ) : null}
      {applyConfirmation ? (
        <ApplyConfirmationPanel
          appliedPlatforms={applyConfirmation.appliedPlatforms}
          label={applyConfirmation.label}
          onDismiss={onDismissApplyConfirmation}
          onViewAppliedData={onViewAppliedData}
        />
      ) : null}
    </>
  );
}

function SettingsWorkspaceView({
  aiIntegration,
  aiUsage,
  applyConfirmation,
  calendar,
  competitors,
  connections,
  onAiIntegrationChange,
  onApplyMetrics,
  onDismissApplyConfirmation,
  onRestoreWorkspace,
  workspaceData,
  onCalendarChange,
  onCompetitorsChange,
  onConnectionsChange,
  onRecordUsage,
  onRunSetupGuide,
  onUccChange,
  onViewAppliedData,
  sync,
  ucc,
}: {
  aiIntegration: AiIntegrationSettings;
  aiUsage: AiUsageEntry[];
  applyConfirmation: { appliedPlatforms: AppliedPlatformSummary[]; label: string } | null;
  calendar: CalendarItem[];
  competitors: Competitor[];
  connections: PlatformConnection[];
  onRestoreWorkspace: (workspace: MarketingWorkspaceData) => void;
  onRunSetupGuide: () => void;
  workspaceData: MarketingWorkspaceData;
  onAiIntegrationChange: (aiIntegration: AiIntegrationSettings) => void;
  onApplyMetrics: (
    metrics: PlatformDataMetrics[],
    approvedBy: string,
    source: { label: string; noteLabel: string; rangeLabel: string; editedCount: number },
  ) => void;
  onCalendarChange: (calendar: CalendarItem[]) => void;
  onCompetitorsChange: (competitors: Competitor[]) => void;
  onConnectionsChange: (connections: PlatformConnection[]) => void;
  onDismissApplyConfirmation: () => void;
  onRecordUsage: (module: string, model: string, usage: OpenAiUsage) => void;
  onUccChange: (ucc: UccStrategyData) => void;
  onViewAppliedData: (platform: Platform) => void;
  sync: WorkspaceSync;
  ucc: UccStrategyData;
}) {
  const [csvMessage, setCsvMessage] = useState("");
  const metricReview = useMetricReviewFlow(onApplyMetrics);

  return (
    <section className="space-y-4">
      <Card className="border-primary/40">
        <CardContent className="flex flex-wrap items-center justify-between gap-3 py-4">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <ListChecks className="h-5 w-5" />
            </span>
            <div>
              <p className="text-sm font-semibold">Interactive setup guide</p>
              <p className="text-xs leading-5 text-muted-foreground">
                Walk through connecting the app and entering your data, one step
                at a time. Safe to run again any time; it never deletes anything.
              </p>
            </div>
          </div>
          <Button onClick={onRunSetupGuide} size="sm" type="button">
            Run setup guide
          </Button>
        </CardContent>
      </Card>
      <AppearanceSettingsPanel />
      <WorkspaceDataModePanel
        sync={sync}
        workspaceData={workspaceData}
        onRestoreWorkspace={onRestoreWorkspace}
      />
      <SupabaseDatabasePanel sync={sync} />
      <BackupHistoryPanel
        sync={sync}
        workspaceData={workspaceData}
        onRestoreWorkspace={onRestoreWorkspace}
      />
      <AiIntegrationPanel
        aiIntegration={aiIntegration}
        aiUsage={aiUsage}
        onAiIntegrationChange={onAiIntegrationChange}
      />
      <PlatformDataIntegrationPanel
        apiKey={aiIntegration.apiKey}
        applyConfirmation={applyConfirmation}
        approverName={metricReview.approverName}
        connections={connections}
        model={resolveModelForTask(aiIntegration, "analysis")}
        pendingReview={metricReview.pendingReview}
        onApply={metricReview.handleApply}
        onApproverNameChange={metricReview.setApproverName}
        onConnectionsChange={onConnectionsChange}
        onDiscardReview={() => metricReview.setPendingReview(null)}
        onDismissApplyConfirmation={onDismissApplyConfirmation}
        onRecordUsage={onRecordUsage}
        onRowChange={metricReview.handleRowChange}
        onSyncReview={metricReview.setPendingReview}
        onViewAppliedData={onViewAppliedData}
      />
      <CsvImportPanel
        apiKey={aiIntegration.apiKey}
        calendar={calendar}
        competitors={competitors}
        model={resolveModelForTask(aiIntegration, "analysis")}
        platformPlaybook={workspaceData.platformPlaybook ?? createDefaultPlatformPlaybook()}
        onCalendarChange={onCalendarChange}
        onCompetitorsChange={onCompetitorsChange}
        onMetricoolPdfParsed={(result) => {
          if (result.ok) {
            metricReview.setPendingReview(result.pending);
            setCsvMessage("");
          } else {
            setCsvMessage(result.message);
          }
        }}
        onRecordUsage={onRecordUsage}
        onUccChange={onUccChange}
        ucc={ucc}
      />
      {csvMessage ? (
        <div className="rounded-md border border-warning-border bg-warning p-3 text-xs leading-5 text-warning-foreground">
          {csvMessage}
        </div>
      ) : null}
    </section>
  );
}

// Shown once approved metrics have been applied. Only offers a "View in
// Social Audit" link for a platform the data genuinely reached there, so
// nothing points at a screen that will show no change. KPI records are also
// updated but have no dedicated jump target, so that is noted as text.
function ApplyConfirmationPanel({
  appliedPlatforms,
  label,
  onDismiss,
  onViewAppliedData,
}: {
  appliedPlatforms: AppliedPlatformSummary[];
  label: string;
  onDismiss: () => void;
  onViewAppliedData: (platform: Platform) => void;
}) {
  return (
    <Card className="border-success-border">
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle>Applied: {label}</CardTitle>
            <CardDescription className="mt-2 leading-6">
              Jump straight to where this landed.
            </CardDescription>
          </div>
          <Button onClick={onDismiss} size="icon" type="button" variant="outline">
            <X className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {appliedPlatforms.length === 0 ? (
          <p className="text-sm leading-6 text-muted-foreground">
            No approved rows were applied.
          </p>
        ) : (
          appliedPlatforms.map((row) => (
            <div
              className="flex flex-wrap items-center justify-between gap-2 rounded-lg border bg-muted/20 p-3"
              key={row.platform}
            >
              <div className="flex flex-wrap items-center gap-2">
                <PlatformBadge platform={row.platform} />
                {row.label ? (
                  <span className="text-xs text-muted-foreground">{row.label}</span>
                ) : null}
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  onClick={() => onViewAppliedData(row.platform)}
                  size="sm"
                  type="button"
                  variant="outline"
                >
                  View in Social Audit
                </Button>
                {row.kpiUpdated ? (
                  <p className="text-xs leading-5 text-muted-foreground">
                    KPI record also updated (see Dashboard or Reports).
                  </p>
                ) : null}
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}

function CsvImportPanel({
  apiKey,
  calendar,
  competitors,
  model,
  platformPlaybook,
  onCalendarChange,
  onCompetitorsChange,
  onMetricoolPdfParsed,
  onRecordUsage,
  onUccChange,
  ucc,
}: {
  apiKey: string;
  calendar: CalendarItem[];
  competitors: Competitor[];
  model: string;
  platformPlaybook: PlatformPlaybook;
  onCalendarChange: (calendar: CalendarItem[]) => void;
  onCompetitorsChange: (competitors: Competitor[]) => void;
  onMetricoolPdfParsed: (
    result: { ok: true; pending: PendingMetricReview } | { ok: false; message: string },
  ) => void;
  onRecordUsage: (module: string, model: string, usage: OpenAiUsage) => void;
  onUccChange: (ucc: UccStrategyData) => void;
  ucc: UccStrategyData;
}) {
  const [importingMetricoolPdf, setImportingMetricoolPdf] = useState(false);

  async function importMetricoolReport(file: File) {
    if (!apiKey) {
      onMetricoolPdfParsed({
        ok: false,
        message: "Connect OpenAI in Settings to import a Metricool PDF report.",
      });
      return;
    }

    setImportingMetricoolPdf(true);

    try {
      const result = await importMetricoolPdf({ apiKey, file, model });

      if (!result.ok) {
        onMetricoolPdfParsed({ ok: false, message: result.message });
        return;
      }

      if (result.usage) {
        onRecordUsage("Metricool PDF import", result.model ?? model, result.usage);
      }

      onMetricoolPdfParsed({ ok: true, pending: result.pending });
    } finally {
      setImportingMetricoolPdf(false);
    }
  }

  async function importCsv(
    target:
      | "courses"
      | "campaigns"
      | "calendar"
      | "kpi"
      | "budget"
      | "competitors",
    files: FileList | null,
  ) {
    const file = files?.[0];

    if (!file) {
      return;
    }

    const rows = parseCsvRows(await file.text());

    if (target === "courses") {
      onUccChange({ ...ucc, courses: [...ucc.courses, ...rows.map(csvToCourse)] });
    }

    if (target === "campaigns") {
      onUccChange({
        ...ucc,
        campaigns: [...ucc.campaigns, ...rows.map((row) => csvToCampaign(row, ucc))],
      });
    }

    if (target === "calendar") {
      onCalendarChange([
        ...calendar,
        ...rows.map((row) => csvToCalendarItem(row, ucc, platformPlaybook)),
      ]);
    }

    if (target === "kpi") {
      onUccChange({
        ...ucc,
        kpiRecords: [...ucc.kpiRecords, ...rows.map((row) => csvToKpiRecord(row, ucc))],
      });
    }

    if (target === "budget") {
      onUccChange({
        ...ucc,
        budgetPlans: [...ucc.budgetPlans, ...rows.map((row) => csvToBudgetPlan(row, ucc))],
      });
    }

    if (target === "competitors") {
      onCompetitorsChange([...competitors, ...rows.map(csvToCompetitor)]);
    }
  }

  const targets = [
    ["courses", "Courses"],
    ["campaigns", "Campaigns"],
    ["calendar", "Content calendar"],
    ["kpi", "KPI results / leads"],
    ["budget", "Budget / resources"],
    ["competitors", "Competitor tracking"],
  ] as const;

  return (
    <Card>
      <CardHeader>
        <CardTitle>CSV Import</CardTitle>
        <CardDescription>
          Bring in existing Excel or Google Sheets data for core UCC planning tables.
          Expected headers are flexible: name, course, audience, platform/channel,
          campaign, owner, budget, leads, applications, status, URL, and notes.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {targets.map(([target, label]) => (
          <label
            className="flex cursor-pointer items-center justify-center gap-2 rounded-md border border-dashed bg-muted/30 px-3 py-4 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted"
            key={target}
          >
            <FileUp className="h-4 w-4" />
            Import {label}
            <input
              accept=".csv,text/csv"
              className="sr-only"
              onChange={(event) => {
                void importCsv(target, event.target.files);
                event.target.value = "";
              }}
              type="file"
            />
          </label>
        ))}
        <label
          className="flex cursor-pointer items-center justify-center gap-2 rounded-md border border-dashed bg-muted/30 px-3 py-4 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted"
          key="metricool"
        >
          <FileUp className="h-4 w-4" />
          {importingMetricoolPdf ? "Reading PDF with AI..." : "Import Metricool PDF"}
          <input
            accept=".pdf,application/pdf"
            className="sr-only"
            disabled={importingMetricoolPdf}
            onChange={(event) => {
              const file = event.target.files?.[0];

              if (file) {
                void importMetricoolReport(file);
              }

              event.target.value = "";
            }}
            type="file"
          />
        </label>
      </CardContent>
    </Card>
  );
}

function BrandSetupView({
  brand,
  onBrandChange,
}: {
  brand: BrandProfile;
  onBrandChange: <K extends keyof BrandProfile>(
    field: K,
    value: BrandProfile[K],
  ) => void;
}) {
  const [guidelineMessage, setGuidelineMessage] = useState<{
    tone: "success" | "error";
    text: string;
  } | null>(null);

  async function handleGuidelineFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file) {
      return;
    }

    if (!file.name.toLowerCase().endsWith(".pdf")) {
      onBrandChange("brandGuidelines", await file.text());
      setGuidelineMessage(null);
      return;
    }

    setGuidelineMessage(null);

    try {
      const formData = new FormData();
      formData.append("file", file);
      const response = await fetch(apiUrl("/api/compliance/extract"), {
        method: "POST",
        body: formData,
      });
      const result = (await response.json()) as
        | { ok: true; text: string; characters: number; truncated: boolean }
        | { ok: false; error: string };

      if (!result.ok) {
        setGuidelineMessage({ tone: "error", text: result.error });
        return;
      }

      onBrandChange("brandGuidelines", result.text);
      setGuidelineMessage({
        tone: "success",
        text: `Read ${formatNumber(result.characters)} characters from ${file.name}${
          result.truncated ? " (long document stored in shortened form)" : ""
        }.`,
      });
    } catch (error) {
      setGuidelineMessage({
        tone: "error",
        text: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return (
    <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
      <Card>
        <CardHeader>
          <SectionTitle
            icon={Settings2}
            kicker="Set up"
            title="Brand Setup"
            description="The calendar engine uses these fields to keep content tied to the brand, audience, offers, and goals."
          />
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Brand name">
              <Input
                value={brand.brandName}
                onChange={(event) => onBrandChange("brandName", event.target.value)}
              />
            </Field>
            <Field label="Website">
              <Input
                value={brand.website}
                onChange={(event) => onBrandChange("website", event.target.value)}
              />
            </Field>
            <Field label="Industry">
              <Input
                value={brand.industry}
                onChange={(event) => onBrandChange("industry", event.target.value)}
              />
            </Field>
            <Field label="Tone of voice">
              <Input
                value={brand.toneOfVoice}
                onChange={(event) =>
                  onBrandChange("toneOfVoice", event.target.value)
                }
              />
            </Field>
          </div>

          <Field label="Audience">
            <Textarea
              value={brand.audience}
              onChange={(event) => onBrandChange("audience", event.target.value)}
            />
          </Field>

          <Field label="Offer or programs">
            <Textarea
              value={brand.offers}
              onChange={(event) => onBrandChange("offers", event.target.value)}
            />
          </Field>

          <TextListField
            label="Key goals"
            value={brand.goals}
            onChange={(goals) => onBrandChange("goals", goals)}
          />
        </CardContent>
      </Card>

      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Brand Guidelines</CardTitle>
            <CardDescription>
              Paste notes, or upload a PDF, text, or Markdown guideline file.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <label className="flex cursor-pointer items-center justify-center gap-2 rounded-md border border-dashed bg-muted/30 px-3 py-4 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted">
              <PenLine className="h-4 w-4" />
              Upload guidelines
              <input
                accept=".pdf,.txt,.md,application/pdf"
                className="sr-only"
                onChange={handleGuidelineFile}
                type="file"
              />
            </label>
            {guidelineMessage ? (
              <p
                className={cn(
                  "text-xs leading-5",
                  guidelineMessage.tone === "error"
                    ? "text-warning-foreground"
                    : "text-muted-foreground",
                )}
              >
                {guidelineMessage.text}
              </p>
            ) : null}
            <Textarea
              className="min-h-52"
              value={brand.brandGuidelines}
              onChange={(event) =>
                onBrandChange("brandGuidelines", event.target.value)
              }
            />
          </CardContent>
        </Card>
      </div>
    </section>
  );
}

const goalTargetFields: Array<{
  key: keyof SocialGoalTargets;
  label: string;
  suffix?: string;
}> = [
  { key: "reach", label: "Reach" },
  { key: "engagementRate", label: "Engagement rate", suffix: "%" },
  { key: "clicks", label: "Clicks" },
  { key: "saves", label: "Saves" },
  { key: "shares", label: "Shares" },
  { key: "inquiries", label: "Inquiries" },
  { key: "followersGained", label: "Followers gained" },
  { key: "posts", label: "Posts" },
];

function SocialGoalSettingPanel({
  canEdit,
  socialGoals,
  onChange,
  onMonthlyTargetChange,
}: {
  canEdit: boolean;
  socialGoals: SocialGoalSettings;
  onChange: (patch: Partial<SocialGoalSettings>) => void;
  onMonthlyTargetChange: <K extends keyof SocialGoalTargets>(
    field: K,
    value: SocialGoalTargets[K],
  ) => void;
}) {
  function togglePriorityPlatform(platform: Platform) {
    const exists = socialGoals.priorityPlatforms.includes(platform);
    const nextPlatforms = exists
      ? socialGoals.priorityPlatforms.filter((item) => item !== platform)
      : [...socialGoals.priorityPlatforms, platform];

    onChange({ priorityPlatforms: nextPlatforms });
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
          <SectionTitle
            icon={Target}
            kicker="Goal setting"
            title="Social Media Growth Goal"
            description="Define the measurable objective that drives audit priorities, strategy, calendar generation, production copy, and performance review."
          />
          <Badge variant="info">{capitalize(socialGoals.funnelStage)}</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {!canEdit ? (
          <p className="rounded-md border bg-muted/20 p-3 text-xs leading-5 text-muted-foreground">
            Only the Marketing Manager role can set the marketing goal. Switch
            to Marketing Manager in the sidebar Role view to edit these
            fields.
          </p>
        ) : null}

        <div className="grid gap-4 lg:grid-cols-2">
          <Field label="Primary objective">
            <Textarea
              disabled={!canEdit}
              value={socialGoals.primaryObjective}
              onChange={(event) => onChange({ primaryObjective: event.target.value })}
            />
          </Field>
          <Field label="Target audience segment">
            <Textarea
              disabled={!canEdit}
              value={socialGoals.targetAudienceSegment}
              onChange={(event) =>
                onChange({ targetAudienceSegment: event.target.value })
              }
            />
          </Field>
        </div>

        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          <Field label="Campaign window">
            <Input
              disabled={!canEdit}
              value={socialGoals.campaignWindow}
              onChange={(event) => onChange({ campaignWindow: event.target.value })}
            />
          </Field>
          <Field label="Funnel stage">
            <NativeSelect
              disabled={!canEdit}
              value={socialGoals.funnelStage}
              onChange={(event) =>
                onChange({ funnelStage: event.target.value as FunnelStage })
              }
            >
              {funnelStages.map((stage) => (
                <option key={stage} value={stage}>
                  {capitalize(stage)}
                </option>
              ))}
            </NativeSelect>
          </Field>
        </div>

        <Field label="Conversion action">
          <Input
            disabled={!canEdit}
            value={socialGoals.conversionAction}
            onChange={(event) => onChange({ conversionAction: event.target.value })}
          />
        </Field>

        <div className="rounded-lg border bg-muted/20 p-3">
          <p className="text-sm font-medium">Priority platforms</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {platforms.map((platform) => {
              const selected = socialGoals.priorityPlatforms.includes(platform);

              return (
                <Button
                  disabled={!canEdit}
                  key={platform}
                  onClick={() => togglePriorityPlatform(platform)}
                  size="sm"
                  type="button"
                  variant={selected ? "default" : "outline"}
                >
                  {platform}
                </Button>
              );
            })}
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {goalTargetFields.map((field) => (
            <Field key={field.key} label={field.label}>
              <div className="relative">
                <Input
                  disabled={!canEdit}
                  min={0}
                  step={field.key === "engagementRate" ? "0.1" : "1"}
                  type="number"
                  value={socialGoals.monthlyTargets[field.key]}
                  onChange={(event) =>
                    onMonthlyTargetChange(field.key, toNumber(event.target.value))
                  }
                />
                {field.suffix ? (
                  <span className="pointer-events-none absolute right-3 top-2.5 text-sm text-muted-foreground">
                    {field.suffix}
                  </span>
                ) : null}
              </div>
            </Field>
          ))}
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <TextListField
            disabled={!canEdit}
            label="Content priorities"
            value={socialGoals.contentPriorities}
            onChange={(contentPriorities) => onChange({ contentPriorities })}
          />
          <div className="space-y-4">
            <Field label="Reporting cadence">
              <Input
                disabled={!canEdit}
                value={socialGoals.reportingCadence}
                onChange={(event) =>
                  onChange({ reportingCadence: event.target.value })
                }
              />
            </Field>
            <Field label="Goal notes">
              <Textarea
                disabled={!canEdit}
                value={socialGoals.notes}
                onChange={(event) => onChange({ notes: event.target.value })}
              />
            </Field>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// A platform has real audience data once any headline metric is non-zero.
// Those metrics are filled from the Metricool or CSV/PDF import approved in
// Settings, or typed by hand. When all are zero there is nothing real to show,
// so the audit reports "No data yet" rather than implying a genuine zero.
function auditHasData(audit: SocialAudit): boolean {
  return audit.followers > 0 || audit.averageReach > 0 || audit.engagementRate > 0;
}

function makeNewAudit(platform: Platform): SocialAudit {
  return {
    platform,
    url: "",
    followers: 0,
    averageReach: 0,
    engagementRate: 0,
    postingFrequency: "",
    scores: {
      profileCompleteness: 0,
      postingConsistency: 0,
      contentMix: 0,
      hookQuality: 0,
      ctaClarity: 0,
      visualConsistency: 0,
      engagementPerformance: 0,
    },
    notes: "",
  };
}

// The control that lets the owner add a platform to the audit. Without this a
// blank workspace could never start an audit, which stalled the whole setup.
function SocialAuditView({
  aiIntegration,
  auditInsights,
  audits,
  auditOverviewInsight,
  globalRole,
  highlightPlatform,
  socialGoals,
  ucc,
  onAuditInsightsChange,
  onAuditOverviewChange,
  onAuditsChange,
  onHighlightConsumed,
  onRecordUsage,
  onSocialGoalsChange,
}: {
  aiIntegration: AiIntegrationSettings;
  auditInsights: AuditInsight[];
  auditOverviewInsight: AuditOverviewInsight | null;
  audits: SocialAudit[];
  globalRole: Role;
  highlightPlatform?: Platform | null;
  socialGoals: SocialGoalSettings;
  ucc: UccStrategyData;
  onAuditInsightsChange: (auditInsights: AuditInsight[]) => void;
  onAuditOverviewChange: (auditOverviewInsight: AuditOverviewInsight | null) => void;
  onAuditsChange: (audits: SocialAudit[]) => void;
  onHighlightConsumed?: () => void;
  onRecordUsage: (module: string, model: string, usage: OpenAiUsage) => void;
  onSocialGoalsChange: (socialGoals: SocialGoalSettings) => void;
}) {
  const [selectedPlatform, setSelectedPlatform] = useState<Platform>(
    audits[0]?.platform ?? "TikTok",
  );
  // Which platform row is expanded for hand-editing its scores and notes.
  const [expandedPlatform, setExpandedPlatform] = useState<Platform | "">("");

  // Just arrived from "View in Social Audit": expand and scroll to the row,
  // then clear the highlight after a few seconds so it does not linger.
  useEffect(() => {
    if (!highlightPlatform) {
      return;
    }

    setExpandedPlatform(highlightPlatform);
    setSelectedPlatform(highlightPlatform);

    const scrollTimer = setTimeout(() => {
      document
        .getElementById(`audit-row-${highlightPlatform}`)
        ?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 50);
    const clearTimer = setTimeout(() => {
      onHighlightConsumed?.();
    }, 4000);

    return () => {
      clearTimeout(scrollTimer);
      clearTimeout(clearTimer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [highlightPlatform]);
  const [generatingPlatform, setGeneratingPlatform] = useState<Platform | "">("");
  const [recalcProgress, setRecalcProgress] = useState<Record<string, string>>({});
  const [recalcRunning, setRecalcRunning] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [generatingOverview, setGeneratingOverview] = useState(false);
  const [overviewError, setOverviewError] = useState("");
  // Local mirror so a sequential "Recalculate all" run does not lose earlier
  // platforms' results to stale prop closures between state updates.
  const insightsRef = useRef(auditInsights);
  insightsRef.current = auditInsights;

  const liveAi = isLiveAiEnabled(aiIntegration);
  const selectedAudit =
    audits.find((audit) => audit.platform === selectedPlatform) ?? audits[0];

  function buildAuditContext(audit: SocialAudit): AuditAiContext {
    return {
      platform: audit.platform,
      metrics: {
        followers: audit.followers,
        averageReach: audit.averageReach,
        engagementRate: audit.engagementRate,
        postingFrequency: audit.postingFrequency,
        scores: audit.scores as unknown as Record<string, number>,
        notes: audit.notes,
      },
      smartGoal: {
        primaryObjective: socialGoals.primaryObjective,
        conversionAction: socialGoals.conversionAction,
        funnelStage: socialGoals.funnelStage,
        isPriorityPlatform: socialGoals.priorityPlatforms.includes(audit.platform),
        monthlyTargets: socialGoals.monthlyTargets as unknown as Record<string, number>,
      },
      courses: ucc.courses
        .filter((course) => course.status !== "archived")
        .map((course) => ({ name: course.name, category: course.category })),
      audiences: ucc.audiences.map((audience) => ({
        name: audience.name,
        painPoints: audience.concerns,
      })),
    };
  }

  async function generateForPlatform(audit: SocialAudit): Promise<string> {
    const response = await fetch(apiUrl("/api/ai/audit"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        apiKey: aiIntegration.apiKey,
        model: resolveModelForTask(aiIntegration, "analysis"),
        context: buildAuditContext(audit),
      }),
    });
    const result = (await response.json()) as
      | { ok: true; draft: AuditAiDraft; usage?: OpenAiUsage; model?: string }
      | { ok: false; error: string };

    if (!result.ok) {
      return result.error;
    }

    const insight = auditDraftToInsight(result.draft, {
      platform: audit.platform,
      model: result.model ?? "unknown",
      inputSummary: `Metrics: ${formatNumber(audit.followers)} followers, ${formatNumber(
        audit.averageReach,
      )} avg reach, ${audit.engagementRate}% engagement.`,
    });
    onAuditInsightsChange(upsertAuditInsight(insightsRef.current, insight));

    if (result.usage) {
      onRecordUsage("Objectives audit", result.model ?? "unknown", result.usage);
    }

    return "";
  }

  async function generateOne(audit: SocialAudit) {
    setGeneratingPlatform(audit.platform);
    setErrorMessage("");

    try {
      const error = await generateForPlatform(audit);

      if (error) {
        setErrorMessage(error);
      }
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : String(error));
    } finally {
      setGeneratingPlatform("");
    }
  }

  async function recalculateAll() {
    setRecalcRunning(true);
    setErrorMessage("");
    setRecalcProgress({});

    for (const audit of audits) {
      setRecalcProgress((current) => ({ ...current, [audit.platform]: "generating" }));

      try {
        const error = await generateForPlatform(audit);
        setRecalcProgress((current) => ({
          ...current,
          [audit.platform]: error ? `failed: ${error}` : "done",
        }));
      } catch (error) {
        setRecalcProgress((current) => ({
          ...current,
          [audit.platform]: `failed: ${error instanceof Error ? error.message : String(error)}`,
        }));
      }
    }

    setRecalcRunning(false);
  }

  function buildWholeAuditContext(): WholeAuditAiContext {
    return {
      platforms: audits.map((audit) => ({
        platform: audit.platform,
        followers: audit.followers,
        averageReach: audit.averageReach,
        engagementRate: audit.engagementRate,
        postingFrequency: audit.postingFrequency,
        scores: audit.scores as unknown as Record<string, number>,
        notes: audit.notes,
        isPriorityPlatform: socialGoals.priorityPlatforms.includes(audit.platform),
      })),
      smartGoal: {
        primaryObjective: socialGoals.primaryObjective,
        conversionAction: socialGoals.conversionAction,
        funnelStage: socialGoals.funnelStage,
        monthlyTargets: socialGoals.monthlyTargets as unknown as Record<string, number>,
      },
      courses: ucc.courses
        .filter((course) => course.status !== "archived")
        .map((course) => ({ name: course.name, category: course.category })),
      audiences: ucc.audiences.map((audience) => ({
        name: audience.name,
        painPoints: audience.concerns,
      })),
    };
  }

  async function generateWholeAuditSummary() {
    setGeneratingOverview(true);
    setOverviewError("");

    try {
      const response = await fetch(apiUrl("/api/ai/audit"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          apiKey: aiIntegration.apiKey,
          model: resolveModelForTask(aiIntegration, "analysis"),
          mode: "whole",
          wholeContext: buildWholeAuditContext(),
        }),
      });
      const result = (await response.json()) as
        | { ok: true; draft: WholeAuditAiDraft; usage?: OpenAiUsage; model?: string }
        | { ok: false; error: string };

      if (!result.ok) {
        setOverviewError(result.error);
        return;
      }

      const overview = wholeAuditDraftToInsight(result.draft, {
        model: result.model ?? "unknown",
        inputSummary: `${audits.length} platform${audits.length === 1 ? "" : "s"} assessed together: ${audits
          .map((audit) => audit.platform)
          .join(", ")}.`,
        platformsCovered: audits.map((audit) => audit.platform),
      });
      onAuditOverviewChange(overview);

      if (result.usage) {
        onRecordUsage("Objectives audit overview", result.model ?? "unknown", result.usage);
      }
    } catch (error) {
      setOverviewError(error instanceof Error ? error.message : String(error));
    } finally {
      setGeneratingOverview(false);
    }
  }

  function setOverviewStatus(status: AuditOverviewInsight["status"]) {
    if (!auditOverviewInsight) {
      return;
    }

    onAuditOverviewChange({ ...auditOverviewInsight, status });
  }

  function setInsightStatus(id: string, status: AuditInsight["status"]) {
    onAuditInsightsChange(
      auditInsights.map((insight) =>
        insight.id === id ? { ...insight, status } : insight,
      ),
    );
  }

  function updateAudit(platform: Platform, updater: (audit: SocialAudit) => SocialAudit) {
    onAuditsChange(
      audits.map((audit) => (audit.platform === platform ? updater(audit) : audit)),
    );
  }

  function updateSocialGoals(patch: Partial<SocialGoalSettings>) {
    onSocialGoalsChange({ ...socialGoals, ...patch });
  }

  function updateMonthlyTarget<K extends keyof SocialGoalTargets>(
    field: K,
    value: SocialGoalTargets[K],
  ) {
    onSocialGoalsChange({
      ...socialGoals,
      monthlyTargets: {
        ...socialGoals.monthlyTargets,
        [field]: value,
      },
    });
  }

  if (!selectedAudit) {
    return (
      <section className="space-y-4">
        <SocialGoalSettingPanel
          canEdit={globalRole === "marketing manager"}
          socialGoals={socialGoals}
          onChange={updateSocialGoals}
          onMonthlyTargetChange={updateMonthlyTarget}
        />
        <Card>
          <CardHeader>
            <SectionTitle
              icon={SearchCheck}
              kicker="Plan"
              title="Start your social audit"
              description="Connect Metricool, or import a Metricool PDF report, in Integrations & Settings. A platform's Social Audit row is created automatically the first time real numbers arrive for it; there is no manual add step."
            />
          </CardHeader>
        </Card>
      </section>
    );
  }

  return (
    <section className="space-y-4">
      <SocialGoalSettingPanel
        canEdit={globalRole === "marketing manager"}
        socialGoals={socialGoals}
        onChange={updateSocialGoals}
        onMonthlyTargetChange={updateMonthlyTarget}
      />

      <Card>
        <CardHeader className="flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <SectionTitle
            icon={SearchCheck}
            kicker="Plan"
            title="Social Audit"
            description="Score the current platform presence across completeness, consistency, content mix, hooks, CTAs, visuals, and engagement."
          />
          <div className="flex flex-col items-stretch gap-2 sm:items-end">
            <Button
              disabled={!liveAi || recalcRunning}
              onClick={() => void recalculateAll()}
              size="sm"
              type="button"
              variant="outline"
            >
              <Sparkles className="h-4 w-4" />
              {recalcRunning ? "Recalculating" : "Recalculate all with AI"}
            </Button>
            {!liveAi ? (
              <p className="text-xs leading-5 text-muted-foreground">
                Connect OpenAI in Settings to recalculate scores with AI. You
                can also type the scores in by hand below.
              </p>
            ) : null}
          </div>
        </CardHeader>
        <CardContent>
          {Object.keys(recalcProgress).length > 0 ? (
            <div className="mb-3 space-y-1 rounded-lg border bg-muted/20 p-3">
              {audits.map((audit) => {
                const state = recalcProgress[audit.platform];

                if (!state) {
                  return null;
                }

                return (
                  <p className="text-xs leading-5" key={audit.platform}>
                    <span className="font-medium">{audit.platform}:</span>{" "}
                    <span
                      className={cn(
                        state.startsWith("failed") && "text-warning-foreground",
                        state === "done" && "text-success-foreground",
                      )}
                    >
                      {state}
                    </span>
                  </p>
                );
              })}
            </div>
          ) : null}

          {errorMessage ? (
            <div className="mb-3 rounded-md border border-warning-border bg-warning p-3 text-xs leading-5 text-warning-foreground">
              {errorMessage}
            </div>
          ) : null}

          <p className="mb-3 text-xs leading-5 text-muted-foreground">
            Numbers come from the Metricool or PDF data you approve in
            Integrations &amp; Settings, or you can type them in below. The
            Metricool API returns brand-level totals, so per-platform figures
            come from a Metricool PDF report the AI breaks down. Engagement and
            posting-consistency scores are derived
            from these numbers; the craft scores are set by hand. Where a
            platform has no data yet, it says so rather than showing a false
            zero.
          </p>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-left text-sm">
              <thead className="border-b text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="py-3 pr-4 font-medium">Platform</th>
                  <th className="py-3 pr-4 font-medium">Followers</th>
                  <th className="py-3 pr-4 font-medium">Impressions</th>
                  <th className="py-3 pr-4 font-medium">Avg reach</th>
                  <th className="py-3 pr-4 font-medium">Engagement %</th>
                  <th className="py-3 pr-4 font-medium">Frequency</th>
                  <th className="py-3 pr-4 font-medium">Score</th>
                  <th className="py-3 pr-4 font-medium">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {audits.map((audit) => {
                  const hasData = auditHasData(audit);
                  const isOpen = expandedPlatform === audit.platform;
                  const isJustUpdated = highlightPlatform === audit.platform;
                  const craftScoreFields = scoreFields.filter(
                    (field) =>
                      field.key !== "engagementPerformance" &&
                      field.key !== "postingConsistency",
                  );

                  return (
                    <Fragment key={audit.platform}>
                      <tr
                        className={cn(
                          isOpen && "bg-muted/40",
                          isJustUpdated && "ring-2 ring-inset ring-primary bg-primary/5",
                        )}
                        id={`audit-row-${audit.platform}`}
                      >
                        <td className="py-3 pr-4 align-top">
                          <div className="flex flex-wrap gap-1.5">
                            <PlatformBadge platform={audit.platform} />
                            {socialGoals.priorityPlatforms.includes(audit.platform) ? (
                              <Badge variant="success">Goal priority</Badge>
                            ) : null}
                          </div>
                          {!hasData ? (
                            <p className="mt-1 text-xs text-muted-foreground">
                              No data yet
                            </p>
                          ) : null}
                          {audit.lastMetricoolSyncAt ? (
                            <p className="mt-1 text-xs text-muted-foreground">
                              Updated from Metricool,{" "}
                              {formatMetricoolSyncStamp(audit.lastMetricoolSyncAt)}
                            </p>
                          ) : null}
                        </td>
                        <td className="py-2 pr-4 align-top">
                          <Input
                            className="w-28"
                            type="number"
                            value={audit.followers}
                            onChange={(event) =>
                              updateAudit(audit.platform, (row) => ({
                                ...row,
                                followers: toNumber(event.target.value),
                              }))
                            }
                          />
                        </td>
                        <td className="py-2 pr-4 align-top">
                          <Input
                            className="w-28"
                            type="number"
                            value={audit.impressions ?? ""}
                            placeholder="No data yet"
                            onChange={(event) =>
                              updateAudit(audit.platform, (row) => ({
                                ...row,
                                impressions: toNumber(event.target.value),
                              }))
                            }
                          />
                        </td>
                        <td className="py-2 pr-4 align-top">
                          <Input
                            className="w-28"
                            type="number"
                            value={audit.averageReach}
                            onChange={(event) =>
                              updateAudit(audit.platform, (row) => ({
                                ...row,
                                averageReach: toNumber(event.target.value),
                              }))
                            }
                          />
                        </td>
                        <td className="py-2 pr-4 align-top">
                          <Input
                            className="w-24"
                            step="0.1"
                            type="number"
                            value={audit.engagementRate}
                            onChange={(event) => {
                              const rate = toNumber(event.target.value);
                              updateAudit(audit.platform, (row) => ({
                                ...row,
                                engagementRate: rate,
                                scores: {
                                  ...row.scores,
                                  engagementPerformance:
                                    rate > 0
                                      ? scoreEngagementPerformance(rate)
                                      : 0,
                                },
                              }));
                            }}
                          />
                        </td>
                        <td className="py-2 pr-4 align-top">
                          <Input
                            className="w-32"
                            value={audit.postingFrequency}
                            onChange={(event) =>
                              updateAudit(audit.platform, (row) => ({
                                ...row,
                                postingFrequency: event.target.value,
                              }))
                            }
                          />
                        </td>
                        <td className="py-3 pr-4 align-top">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold">
                              {calculateAuditScore(audit)}%
                            </span>
                            <Progress className="w-20" value={calculateAuditScore(audit)} />
                          </div>
                        </td>
                        <td className="py-3 pr-4 align-top">
                          <Button
                            onClick={() =>
                              setExpandedPlatform(isOpen ? "" : audit.platform)
                            }
                            size="sm"
                            type="button"
                            variant="outline"
                          >
                            {isOpen ? "Close" : "Edit"}
                          </Button>
                        </td>
                      </tr>
                      {isOpen ? (
                        <tr className="bg-muted/20">
                          <td className="px-3 py-4" colSpan={7}>
                            <div className="space-y-4">
                              <Field label="Profile link">
                                <Input
                                  value={audit.url}
                                  onChange={(event) =>
                                    updateAudit(audit.platform, (row) => ({
                                      ...row,
                                      url: event.target.value,
                                    }))
                                  }
                                />
                              </Field>
                              <div className="grid gap-3 md:grid-cols-2">
                                {craftScoreFields.map((field) => (
                                  <ScoreField
                                    key={field.key}
                                    label={field.label}
                                    value={audit.scores[field.key]}
                                    onChange={(value) =>
                                      updateAudit(audit.platform, (row) => ({
                                        ...row,
                                        scores: { ...row.scores, [field.key]: value },
                                      }))
                                    }
                                  />
                                ))}
                              </div>
                              <p className="text-xs leading-5 text-muted-foreground">
                                Engagement performance ({audit.scores.engagementPerformance}/10)
                                and posting consistency ({audit.scores.postingConsistency}/10)
                                are derived from the numbers above and the
                                imported Metricool data, not edited by hand.
                              </p>
                              <Field label="Notes">
                                <Textarea
                                  value={audit.notes}
                                  onChange={(event) =>
                                    updateAudit(audit.platform, (row) => ({
                                      ...row,
                                      notes: event.target.value,
                                    }))
                                  }
                                />
                              </Field>
                              <div className="flex flex-wrap items-center gap-2">
                                <Button
                                  disabled={
                                    !liveAi ||
                                    generatingPlatform === audit.platform ||
                                    recalcRunning
                                  }
                                  onClick={() => void generateOne(audit)}
                                  size="sm"
                                  type="button"
                                  variant="outline"
                                >
                                  <Sparkles className="h-4 w-4" />
                                  {generatingPlatform === audit.platform
                                    ? "Generating"
                                    : "Generate AI recommendation"}
                                </Button>
                                {!liveAi ? (
                                  <span className="text-xs text-muted-foreground">
                                    Connect OpenAI in Settings to generate.
                                  </span>
                                ) : null}
                              </div>
                            </div>
                          </td>
                        </tr>
                      ) : null}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {(() => {
        const auditsWithData = audits.filter(auditHasData);
        const overallScore =
          audits.length > 0
            ? Math.round(
                audits.reduce((sum, row) => sum + calculateAuditScore(row), 0) /
                  audits.length,
              )
            : 0;
        const totalFollowers = auditsWithData.reduce(
          (sum, row) => sum + row.followers,
          0,
        );
        const avgEngagement =
          auditsWithData.length > 0
            ? roundOne(
                auditsWithData.reduce((sum, row) => sum + row.engagementRate, 0) /
                  auditsWithData.length,
              )
            : 0;
        const combinedIssues = Array.from(
          new Set(auditsWithData.flatMap((row) => getAuditIssues(row))),
        ).slice(0, 6);
        const combinedRecommendations = Array.from(
          new Set(
            auditsWithData.flatMap((row) =>
              buildGoalAwareAuditRecommendations(row, socialGoals),
            ),
          ),
        ).slice(0, 6);
        const platformsWithoutData = audits
          .filter((row) => !auditHasData(row))
          .map((row) => row.platform);
        const insightsByPlatform = audits
          .map((row) => ({
            platform: row.platform,
            insight: auditInsights.find((entry) => entry.platform === row.platform),
          }))
          .filter((row) => row.insight);

        return (
          <Card>
            <CardHeader className="flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
              <div>
                <CardTitle>Audit Output</CardTitle>
                <CardDescription>
                  An overall view across every platform in the audit: combined
                  score, real audience numbers, issues, and recommendations.
                </CardDescription>
              </div>
              <div className="flex flex-col items-stretch gap-2 sm:items-end">
                <Button
                  disabled={!liveAi || generatingOverview || audits.length === 0}
                  onClick={() => void generateWholeAuditSummary()}
                  size="sm"
                  type="button"
                  variant="outline"
                >
                  <Sparkles className="h-4 w-4" />
                  {generatingOverview
                    ? "Assessing the whole audit"
                    : "Generate whole-audit summary with AI"}
                </Button>
                {!liveAi ? (
                  <p className="text-xs leading-5 text-muted-foreground">
                    Connect OpenAI in Settings to generate one AI summary across
                    the whole audit.
                  </p>
                ) : null}
              </div>
            </CardHeader>
            <CardContent className="space-y-5">
              {overviewError ? (
                <div className="rounded-md border border-warning-border bg-warning p-3 text-xs leading-5 text-warning-foreground">
                  {overviewError}
                </div>
              ) : null}

              {auditOverviewInsight ? (
                <div className="space-y-3 rounded-lg border bg-muted/20 p-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge
                      variant={
                        auditOverviewInsight.status === "accepted"
                          ? "success"
                          : auditOverviewInsight.status === "dismissed"
                            ? "secondary"
                            : "warning"
                      }
                    >
                      {auditOverviewInsight.status === "accepted"
                        ? "Accepted"
                        : auditOverviewInsight.status === "dismissed"
                          ? "Dismissed"
                          : "AI draft, not yet accepted"}
                    </Badge>
                    <Badge variant="outline">
                      {auditOverviewInsight.confidenceLevel} confidence
                    </Badge>
                    {auditOverviewInsight.limitedData ? (
                      <Badge variant="secondary">Limited data</Badge>
                    ) : null}
                    <span className="text-xs text-muted-foreground">
                      Whole audit: {auditOverviewInsight.platformsCovered.join(", ")}
                    </span>
                  </div>
                  <p className="text-sm leading-6">{auditOverviewInsight.recommendation}</p>
                  {auditOverviewInsight.topStrengths.length > 0 ? (
                    <div>
                      <p className="text-xs font-semibold uppercase text-muted-foreground">
                        Strengths across the whole audit
                      </p>
                      <ul className="list-disc space-y-1 pl-4 text-sm leading-6">
                        {auditOverviewInsight.topStrengths.map((item) => (
                          <li key={item}>{item}</li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                  {auditOverviewInsight.topWeaknesses.length > 0 ? (
                    <div>
                      <p className="text-xs font-semibold uppercase text-muted-foreground">
                        Weaknesses across the whole audit
                      </p>
                      <ul className="list-disc space-y-1 pl-4 text-sm leading-6">
                        {auditOverviewInsight.topWeaknesses.map((item) => (
                          <li key={item}>{item}</li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                  {auditOverviewInsight.nextActions.length > 0 ? (
                    <div>
                      <p className="text-xs font-semibold uppercase text-muted-foreground">
                        Cross-platform next actions
                      </p>
                      <ul className="list-disc space-y-1 pl-4 text-sm leading-6">
                        {auditOverviewInsight.nextActions.map((action) => (
                          <li key={action}>{action}</li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                  <p className="text-xs leading-5 text-muted-foreground">
                    {formatDateTime(auditOverviewInsight.generatedAt)},{" "}
                    {auditOverviewInsight.model}. {auditOverviewInsight.inputSummary}
                  </p>
                  {auditOverviewInsight.status === "draft" ? (
                    <div className="flex flex-wrap gap-2">
                      <Button
                        onClick={() => setOverviewStatus("accepted")}
                        size="sm"
                        type="button"
                      >
                        <CheckCircle2 className="h-4 w-4" />
                        Accept
                      </Button>
                      <Button
                        onClick={() => setOverviewStatus("dismissed")}
                        size="sm"
                        type="button"
                        variant="outline"
                      >
                        Dismiss
                      </Button>
                    </div>
                  ) : null}
                </div>
              ) : (
                <p className="text-sm leading-6 text-muted-foreground">
                  No whole-audit AI summary yet. Generate one above to get a
                  single assessment reasoning across every platform together,
                  rather than one platform at a time.
                </p>
              )}

              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-lg border bg-muted/30 p-4">
                  <div className="flex items-center justify-between">
                    <Gauge className="h-5 w-5 text-primary" />
                    <span className="text-2xl font-semibold">{overallScore}%</span>
                  </div>
                  <Progress className="mt-3" value={overallScore} />
                  <p className="mt-2 text-xs leading-5 text-muted-foreground">
                    Average across {audits.length} platform
                    {audits.length === 1 ? "" : "s"} ({auditsWithData.length} with
                    data).
                  </p>
                </div>
                <div className="rounded-lg border bg-muted/20 p-4">
                  <p className="text-xs font-medium uppercase text-muted-foreground">
                    Total followers
                  </p>
                  <p className="mt-2 text-2xl font-semibold">
                    {auditsWithData.length > 0
                      ? formatNumber(totalFollowers)
                      : "No data yet"}
                  </p>
                  <p className="mt-2 text-xs text-muted-foreground">
                    From platforms with imported data.
                  </p>
                </div>
                <div className="rounded-lg border bg-muted/20 p-4">
                  <p className="text-xs font-medium uppercase text-muted-foreground">
                    Average engagement
                  </p>
                  <p className="mt-2 text-2xl font-semibold">
                    {auditsWithData.length > 0 ? `${avgEngagement}%` : "No data yet"}
                  </p>
                  <p className="mt-2 text-xs text-muted-foreground">
                    Across platforms with data.
                  </p>
                </div>
              </div>

              {platformsWithoutData.length > 0 ? (
                <p className="text-xs leading-5 text-muted-foreground">
                  No Metricool data yet for: {platformsWithoutData.join(", ")}.
                  Import in Integrations &amp; Settings, or type figures into the
                  table above.
                </p>
              ) : null}

              {auditsWithData.length > 0 ? (
                <>
                  <InsightList
                    title="Top issues across platforms"
                    items={combinedIssues}
                    variant="warning"
                  />
                  <InsightList
                    title={
                      liveAi
                        ? "Rule-based recommendations"
                        : `Rule-based recommendations (${OFFLINE_DRAFT_LABEL})`
                    }
                    items={combinedRecommendations}
                    variant="success"
                  />
                </>
              ) : (
                <p className="text-sm leading-6 text-muted-foreground">
                  Add real numbers to at least one platform to see combined
                  issues and recommendations across the whole audit.
                </p>
              )}

              <div className="space-y-3 rounded-lg border bg-muted/20 p-3">
                <p className="text-sm font-semibold">
                  AI recommendations by platform
                </p>
                {insightsByPlatform.length === 0 ? (
                  <p className="text-xs leading-5 text-muted-foreground">
                    No AI recommendations yet. Use Recalculate all with AI above,
                    or Generate on a platform row, to produce them.
                  </p>
                ) : (
                  insightsByPlatform.map(({ platform, insight }) =>
                    insight ? (
                      <div
                        className="space-y-2 rounded-md border bg-background p-3"
                        key={platform}
                      >
                        <div className="flex flex-wrap items-center gap-2">
                          <PlatformBadge platform={platform} />
                          <Badge
                            variant={
                              insight.status === "accepted"
                                ? "success"
                                : insight.status === "dismissed"
                                  ? "secondary"
                                  : "warning"
                            }
                          >
                            {insight.status === "accepted"
                              ? "Accepted"
                              : insight.status === "dismissed"
                                ? "Dismissed"
                                : "AI draft, not yet accepted"}
                          </Badge>
                          <Badge variant="outline">
                            {insight.confidenceLevel} confidence
                          </Badge>
                          {insight.limitedData ? (
                            <Badge variant="secondary">Limited data</Badge>
                          ) : null}
                        </div>
                        <p className="text-sm leading-6">{insight.recommendation}</p>
                        {insight.nextActions.length > 0 ? (
                          <ul className="list-disc space-y-1 pl-4 text-sm leading-6">
                            {insight.nextActions.map((action) => (
                              <li key={action}>{action}</li>
                            ))}
                          </ul>
                        ) : null}
                        <p className="text-xs leading-5 text-muted-foreground">
                          {formatDateTime(insight.generatedAt)}, {insight.model}.{" "}
                          {insight.inputSummary}
                        </p>
                        {insight.status === "draft" ? (
                          <div className="flex flex-wrap gap-2">
                            <Button
                              onClick={() => setInsightStatus(insight.id, "accepted")}
                              size="sm"
                              type="button"
                            >
                              <CheckCircle2 className="h-4 w-4" />
                              Accept
                            </Button>
                            <Button
                              onClick={() => setInsightStatus(insight.id, "dismissed")}
                              size="sm"
                              type="button"
                              variant="outline"
                            >
                              Dismiss
                            </Button>
                          </div>
                        ) : null}
                      </div>
                    ) : null,
                  )
                )}
              </div>
            </CardContent>
          </Card>
        );
      })()}
    </section>
  );
}

function buildGoalAwareAuditRecommendations(
  audit: SocialAudit,
  socialGoals: SocialGoalSettings,
) {
  const recommendations = getAuditRecommendations(audit);
  const isPriorityPlatform = socialGoals.priorityPlatforms.includes(audit.platform);

  if (!isPriorityPlatform) {
    return [
      ...recommendations,
      `Use ${audit.platform} as a support channel unless it directly advances ${socialGoals.primaryObjective}.`,
    ];
  }

  return [
    `Prioritize ${audit.platform} because it is tied to the ${socialGoals.funnelStage} goal: ${socialGoals.primaryObjective}`,
    `Optimize content toward ${socialGoals.primaryObjective}; CTA should drive: ${socialGoals.conversionAction}`,
    ...recommendations,
  ];
}

function CompetitorIntelligenceView({
  aiIntegration,
  brand,
  brief,
  competitorInsights,
  competitors,
  onCompetitorInsightsChange,
  onCompetitorsChange,
  onRecordUsage,
}: {
  aiIntegration: AiIntegrationSettings;
  brand: BrandProfile;
  brief: StrategyBrief;
  competitorInsights: CompetitorInsight[];
  competitors: Competitor[];
  onCompetitorInsightsChange: (competitorInsights: CompetitorInsight[]) => void;
  onCompetitorsChange: (competitors: Competitor[]) => void;
  onRecordUsage: (module: string, model: string, usage: OpenAiUsage) => void;
}) {
  const [analysing, setAnalysing] = useState(false);
  const [analyseError, setAnalyseError] = useState("");

  const liveAi = isLiveAiEnabled(aiIntegration);

  async function analyseWithAi() {
    setAnalysing(true);
    setAnalyseError("");

    try {
      const response = await fetch(apiUrl("/api/ai/competitors"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          apiKey: aiIntegration.apiKey,
          model: resolveModelForTask(aiIntegration, "analysis"),
          context: {
            ownPositioning: {
              brandName: brand.brandName,
              industry: brand.industry,
              toneOfVoice: brand.toneOfVoice,
              offers: brand.offers,
              goals: brand.goals,
            },
            briefSummary: {
              monthlyCampaignGoal: brief.monthlyCampaignGoal,
              contentPillars: brief.contentPillars,
              keyAnglesToOwn: brief.keyAnglesToOwn,
            },
            competitors: competitors.map((competitor) => ({
              id: competitor.id,
              name: competitor.name,
              website: competitor.website,
              platforms: competitor.platforms,
              contentFormats: competitor.contentFormats,
              tone: competitor.tone,
              postingFrequency: competitor.postingFrequency,
              observedStrengths: competitor.observedStrengths,
              contentGaps: competitor.contentGaps,
              whitespaceOpportunities: competitor.whitespaceOpportunities,
            })),
          } satisfies CompetitorAiContext,
        }),
      });
      const result = (await response.json()) as
        | { ok: true; draft: CompetitorAiDraft; usage?: OpenAiUsage; model?: string }
        | { ok: false; error: string };

      if (!result.ok) {
        setAnalyseError(result.error);
        return;
      }

      const insights = competitorDraftToInsights(result.draft, {
        competitors,
        model: result.model ?? "unknown",
      });

      // Replace previous drafts but keep everything already accepted.
      onCompetitorInsightsChange([
        ...competitorInsights.filter((insight) => insight.status === "accepted"),
        ...insights,
      ]);

      if (result.usage) {
        onRecordUsage("Competitor analysis", result.model ?? "unknown", result.usage);
      }
    } catch (error) {
      setAnalyseError(error instanceof Error ? error.message : String(error));
    } finally {
      setAnalysing(false);
    }
  }

  function acceptInsight(id: string) {
    onCompetitorInsightsChange(
      competitorInsights.map((insight) =>
        insight.id === id ? { ...insight, status: "accepted" } : insight,
      ),
    );
  }

  function dismissInsight(id: string) {
    onCompetitorInsightsChange(
      competitorInsights.filter((insight) => insight.id !== id),
    );
  }

  function updateCompetitor<K extends keyof Competitor>(
    id: string,
    field: K,
    value: Competitor[K],
  ) {
    onCompetitorsChange(
      competitors.map((competitor) =>
        competitor.id === id ? { ...competitor, [field]: value } : competitor,
      ),
    );
  }

  function addCompetitor() {
    if (competitors.length >= 6) {
      return;
    }

    onCompetitorsChange([
      ...competitors,
      {
        id: `competitor-${Date.now()}`,
        name: "New competitor",
        website: "",
        platforms: ["Instagram", "TikTok"],
        contentFormats: ["Carousels", "Short-form video"],
        tone: "Helpful and student-facing",
        postingFrequency: "3 posts/week",
        observedStrengths: ["Clear program visibility"],
        contentGaps: ["Needs parent-facing decision content"],
        whitespaceOpportunities: ["Own a more factual campus proof series."],
      },
    ]);
  }

  const whitespace = competitors.flatMap((competitor) =>
    competitor.whitespaceOpportunities.map((opportunity) => ({
      competitor: competitor.name,
      opportunity,
    })),
  );

  return (
    <section className="space-y-4">
      <Card>
        <CardHeader className="flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <SectionTitle
            icon={UsersRound}
            kicker="Plan"
            title="Competitor Intelligence"
            description="Track 3 to 6 competitors, their platform behavior, format choices, tone, frequency, strengths, and gaps."
          />
          <div className="flex flex-col items-stretch gap-2 sm:items-end">
            <div className="flex flex-wrap gap-2 sm:justify-end">
              <Button
                disabled={!liveAi || analysing || competitors.length === 0}
                onClick={() => void analyseWithAi()}
                size="sm"
                type="button"
                variant="outline"
              >
                <Sparkles className="h-4 w-4" />
                {analysing ? "Analysing" : "Analyse with AI"}
              </Button>
              <Button
                disabled={competitors.length >= 6}
                onClick={addCompetitor}
                size="sm"
                variant="outline"
              >
                <Plus className="h-4 w-4" />
                Add competitor
              </Button>
            </div>
            {!liveAi ? (
              <p className="text-xs leading-5 text-muted-foreground">
                Connect OpenAI in Settings to generate with AI.
              </p>
            ) : competitors.length === 0 ? (
              <p className="text-xs leading-5 text-muted-foreground">
                Add at least one competitor record first.
              </p>
            ) : null}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {analyseError ? (
            <div className="rounded-md border border-warning-border bg-warning p-3 text-xs leading-5 text-warning-foreground">
              {analyseError}
            </div>
          ) : null}

          {competitorInsights.length > 0 ? (
            <div className="space-y-3 rounded-lg border bg-muted/20 p-3">
              <p className="text-sm font-semibold">
                AI competitor insights. Accepted insights feed the Strategy
                Brief and campaign suggestions.
              </p>
              {competitors
                .filter((competitor) =>
                  competitorInsights.some(
                    (insight) => insight.competitorId === competitor.id,
                  ),
                )
                .map((competitor) => (
                  <div className="space-y-2" key={competitor.id}>
                    <p className="text-xs font-medium uppercase text-muted-foreground">
                      {competitor.name}
                    </p>
                    {competitorInsights
                      .filter((insight) => insight.competitorId === competitor.id)
                      .map((insight) => (
                        <div
                          className="flex flex-wrap items-start justify-between gap-2 rounded-md border bg-background p-3"
                          key={insight.id}
                        >
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-1.5">
                              <Badge variant="outline">{insight.kind}</Badge>
                              <Badge
                                variant={insight.status === "accepted" ? "success" : "warning"}
                              >
                                {insight.status === "accepted"
                                  ? "Accepted"
                                  : "AI draft"}
                              </Badge>
                            </div>
                            <p className="mt-2 text-sm leading-6">{insight.insight}</p>
                            <p className="mt-1 text-xs leading-5 text-muted-foreground">
                              {formatDateTime(insight.generatedAt)}, {insight.model}
                            </p>
                          </div>
                          <div className="flex flex-wrap gap-1.5">
                            {insight.status === "draft" ? (
                              <Button
                                onClick={() => acceptInsight(insight.id)}
                                size="sm"
                                type="button"
                              >
                                Accept
                              </Button>
                            ) : null}
                            <Button
                              onClick={() => dismissInsight(insight.id)}
                              size="sm"
                              type="button"
                              variant="outline"
                            >
                              {insight.status === "accepted" ? "Remove" : "Dismiss"}
                            </Button>
                          </div>
                        </div>
                      ))}
                  </div>
                ))}
            </div>
          ) : null}

          {competitors.length === 0 ? (
            <EmptyState
              action="Add 3 to 6 competitors"
              icon={UsersRound}
              title="No competitors tracked"
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[980px] text-left text-sm">
                <thead className="border-b text-xs uppercase text-muted-foreground">
                  <tr>
                    <th className="py-3 pr-4 font-medium">Competitor</th>
                    <th className="py-3 pr-4 font-medium">Platforms</th>
                    <th className="py-3 pr-4 font-medium">Formats</th>
                    <th className="py-3 pr-4 font-medium">Tone</th>
                    <th className="py-3 pr-4 font-medium">Frequency</th>
                    <th className="py-3 pr-4 font-medium">Observed strengths</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {competitors.map((competitor) => (
                    <tr key={competitor.id}>
                      <td className="min-w-[220px] py-3 pr-4 align-top">
                        <Input
                          className="mb-2"
                          value={competitor.name}
                          onChange={(event) =>
                            updateCompetitor(
                              competitor.id,
                              "name",
                              event.target.value,
                            )
                          }
                        />
                        <Input
                          value={competitor.website}
                          onChange={(event) =>
                            updateCompetitor(
                              competitor.id,
                              "website",
                              event.target.value,
                            )
                          }
                        />
                      </td>
                      <td className="min-w-[230px] py-3 pr-4 align-top">
                        <CompetitorPlatformsField
                          competitorId={competitor.id}
                          onChange={(id, value) =>
                            updateCompetitor(id, "platforms", value)
                          }
                          platforms={competitor.platforms}
                        />
                      </td>
                      <td className="min-w-[230px] py-3 pr-4 align-top">
                        <Textarea
                          value={listToText(competitor.contentFormats)}
                          onChange={(event) =>
                            updateCompetitor(
                              competitor.id,
                              "contentFormats",
                              textToList(event.target.value),
                            )
                          }
                        />
                      </td>
                      <td className="min-w-[190px] py-3 pr-4 align-top">
                        <Textarea
                          value={competitor.tone}
                          onChange={(event) =>
                            updateCompetitor(competitor.id, "tone", event.target.value)
                          }
                        />
                      </td>
                      <td className="min-w-[180px] py-3 pr-4 align-top">
                        <Input
                          value={competitor.postingFrequency}
                          onChange={(event) =>
                            updateCompetitor(
                              competitor.id,
                              "postingFrequency",
                              event.target.value,
                            )
                          }
                        />
                      </td>
                      <td className="min-w-[260px] py-3 pr-4 align-top">
                        <Textarea
                          value={listToText(competitor.observedStrengths)}
                          onChange={(event) =>
                            updateCompetitor(
                              competitor.id,
                              "observedStrengths",
                              textToList(event.target.value),
                            )
                          }
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Content Gaps</CardTitle>
            <CardDescription>
              Gaps observed in competitor publishing patterns.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {competitors.map((competitor) => (
              <InsightList
                items={competitor.contentGaps}
                key={competitor.id}
                title={competitor.name}
                variant="warning"
              />
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Whitespace Opportunities</CardTitle>
            <CardDescription>
              Themes the brand can own without copying competitor formats.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {whitespace.map((item, index) => (
              <div className="rounded-lg border bg-muted/20 p-3" key={index}>
                <Badge variant="info">{item.competitor}</Badge>
                <p className="mt-2 text-sm leading-6">{item.opportunity}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </section>
  );
}

// Platform Intelligence (Insights module): the per-platform playbook the
// calendar and copywriting engines actually use, as an AI-draft-then-Manager-
// approve workflow. A pending draft (AI-generated or hand-edited) is shown
// clearly and never overwrites the approved fields until the manager
// explicitly approves it, so the engines (wired via getApprovedPlaybookFields)
// never silently read unapproved content.
function PlatformIntelligenceView({
  aiIntegration,
  approverName,
  data,
  globalRole,
  onPlatformPlaybookChange,
  onRecordUsage,
}: {
  aiIntegration: AiIntegrationSettings;
  approverName: string;
  data: MarketingWorkspaceData;
  globalRole: Role;
  onPlatformPlaybookChange: (platformPlaybook: PlatformPlaybook) => void;
  onRecordUsage: (module: string, model: string, usage: OpenAiUsage) => void;
}) {
  const [generatingPlatform, setGeneratingPlatform] = useState<Platform | "">("");
  const [generatingAll, setGeneratingAll] = useState(false);
  const [genProgress, setGenProgress] = useState<Record<string, string>>({});
  const [errorMessage, setErrorMessage] = useState("");
  const playbook: PlatformPlaybook = data.platformPlaybook ?? createDefaultPlatformPlaybook();
  // Local mirror so a sequential "Generate all" run does not lose earlier
  // platforms' drafts to stale prop closures between state updates.
  const playbookRef = useRef(playbook);
  playbookRef.current = playbook;

  const liveAi = isLiveAiEnabled(aiIntegration);
  const canApprove = globalRole === "marketing manager";

  function buildContext(
    platform: Platform,
    entry: PlatformPlaybookEntry,
  ): PlatformPlaybookAiContext {
    const audit = data.audits.find((row) => row.platform === platform);
    const audiences = data.ucc.audiences.filter((audience) =>
      audience.recommendedChannels.includes(platform),
    );

    return {
      platform,
      brand: {
        name: data.brand.brandName,
        industry: data.brand.industry,
        toneOfVoice: data.brand.toneOfVoice,
        offers: data.brand.offers,
      },
      audit: {
        hasData: Boolean(audit && auditHasData(audit)),
        followers: audit?.followers ?? 0,
        averageReach: audit?.averageReach ?? 0,
        engagementRate: audit?.engagementRate ?? 0,
        score: audit ? calculateAuditScore(audit) : 0,
      },
      audiences: audiences.map((audience) => ({
        name: audience.name,
        languages: audience.languages,
        motivations: audience.motivations,
        painPoints: audience.concerns,
      })),
      acceptedTrends: acceptedTrendLines(data.trendInsights),
      acceptedCompetitorInsights: data.competitorInsights
        .filter((insight) => insight.status === "accepted")
        .map((insight) => `${insight.competitorName}: ${insight.insight}`),
      acceptedListeningInsights: data.listeningResults
        .filter((result) => result.status === "accepted")
        .map((result) => `${result.topic}: ${result.insight}`),
      currentPlaybook: entry.approved,
    };
  }

  function updatePlaybookEntry(
    platform: Platform,
    updater: (entry: PlatformPlaybookEntry) => PlatformPlaybookEntry,
  ) {
    const base = playbookRef.current;
    const next: PlatformPlaybook = { ...base, [platform]: updater(base[platform]) };
    playbookRef.current = next;
    onPlatformPlaybookChange(next);
  }

  async function generateForPlatform(platform: Platform): Promise<string> {
    const entry = playbookRef.current[platform];
    const response = await fetch(apiUrl("/api/ai/platform-playbook"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        apiKey: aiIntegration.apiKey,
        model: resolveModelForTask(aiIntegration, "analysis"),
        context: buildContext(platform, entry),
      }),
    });
    const result = (await response.json()) as
      | { ok: true; draft: PlatformPlaybookAiDraft; usage?: OpenAiUsage; model?: string }
      | { ok: false; error: string };

    if (!result.ok) {
      return result.error;
    }

    const fields = platformPlaybookDraftToFields(result.draft, entry.approved);
    updatePlaybookEntry(platform, (current) => ({
      ...current,
      draft: fields,
      draftSource: "ai",
      draftModel: result.model ?? "unknown",
      draftGeneratedAt: new Date().toISOString(),
    }));

    if (result.usage) {
      onRecordUsage("Platform playbook", result.model ?? "unknown", result.usage);
    }

    return "";
  }

  async function generateOne(platform: Platform) {
    setGeneratingPlatform(platform);
    setErrorMessage("");

    try {
      const error = await generateForPlatform(platform);

      if (error) {
        setErrorMessage(error);
      }
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : String(error));
    } finally {
      setGeneratingPlatform("");
    }
  }

  async function generateAll() {
    setGeneratingAll(true);
    setErrorMessage("");
    setGenProgress({});

    for (const platform of platforms) {
      if (playbookRef.current[platform].draft) {
        // Skip a platform with a pending draft so an in-progress review or
        // manual edit is never silently discarded.
        setGenProgress((current) => ({ ...current, [platform]: "skipped: pending draft" }));
        continue;
      }

      setGenProgress((current) => ({ ...current, [platform]: "generating" }));

      try {
        const error = await generateForPlatform(platform);
        setGenProgress((current) => ({
          ...current,
          [platform]: error ? `failed: ${error}` : "done",
        }));
      } catch (error) {
        setGenProgress((current) => ({
          ...current,
          [platform]: `failed: ${error instanceof Error ? error.message : String(error)}`,
        }));
      }
    }

    setGeneratingAll(false);
  }

  function startManualEdit(platform: Platform) {
    const entry = playbookRef.current[platform];

    if (entry.draft) {
      return;
    }

    updatePlaybookEntry(platform, (current) => ({
      ...current,
      draft: { ...current.approved },
      draftSource: "manual",
      draftModel: "",
      draftGeneratedAt: new Date().toISOString(),
    }));
  }

  function updateDraftField(
    platform: Platform,
    field: keyof PlatformPlaybookFields,
    value: string,
  ) {
    updatePlaybookEntry(platform, (entry) => ({
      ...entry,
      draft: { ...(entry.draft ?? entry.approved), [field]: value },
    }));
  }

  function discardDraft(platform: Platform) {
    updatePlaybookEntry(platform, (entry) => ({
      ...entry,
      draft: null,
      draftSource: "none",
      draftModel: "",
      draftGeneratedAt: "",
    }));
  }

  function approveDraft(platform: Platform) {
    updatePlaybookEntry(platform, (entry) => {
      if (!entry.draft) {
        return entry;
      }

      return {
        approved: entry.draft,
        approvedBy: approverName.trim() || "Marketing Manager",
        approvedAt: new Date().toISOString(),
        approvedSource: entry.draftSource === "ai" ? "ai" : "manual",
        draft: null,
        draftSource: "none",
        draftModel: "",
        draftGeneratedAt: "",
      };
    });
  }

  return (
    <section className="space-y-4">
      <Card>
        <CardHeader className="flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-secondary text-secondary-foreground">
              <Gauge className="h-5 w-5" />
            </div>
            <div>
              <CardTitle>Platform Intelligence</CardTitle>
              <CardDescription className="mt-2 leading-6">
                The per-platform playbook the calendar and copywriting engines
                actually use: role in the mix, voice, content style, call to
                action, posting time, and success metric. AI drafts a
                playbook here; only the Marketing Manager&apos;s approved
                version feeds those engines.
              </CardDescription>
            </div>
          </div>
          <div className="flex flex-col items-stretch gap-2 sm:items-end">
            <Button
              disabled={!liveAi || generatingAll}
              onClick={() => void generateAll()}
              size="sm"
              type="button"
              variant="outline"
            >
              <Sparkles className="h-4 w-4" />
              {generatingAll ? "Generating all" : "Generate all with AI"}
            </Button>
            {!liveAi ? (
              <p className="text-xs leading-5 text-muted-foreground">
                Connect OpenAI in Settings to generate with AI. You can still
                edit each playbook by hand below.
              </p>
            ) : null}
          </div>
        </CardHeader>
        {Object.keys(genProgress).length > 0 || errorMessage ? (
          <CardContent className="space-y-3">
            {Object.keys(genProgress).length > 0 ? (
              <div className="space-y-1 rounded-lg border bg-muted/20 p-3">
                {platforms.map((platform) => {
                  const state = genProgress[platform];

                  if (!state) {
                    return null;
                  }

                  return (
                    <p className="text-xs leading-5" key={platform}>
                      <span className="font-medium">{platform}:</span>{" "}
                      <span
                        className={cn(
                          state.startsWith("failed") && "text-warning-foreground",
                          state === "done" && "text-success-foreground",
                        )}
                      >
                        {state}
                      </span>
                    </p>
                  );
                })}
              </div>
            ) : null}
            {errorMessage ? (
              <div className="rounded-md border border-warning-border bg-warning p-3 text-xs leading-5 text-warning-foreground">
                {errorMessage}
              </div>
            ) : null}
          </CardContent>
        ) : null}
      </Card>

      <div className="grid gap-3 md:grid-cols-2">
        {platforms.map((platform) => {
          const entry = playbook[platform];
          const fields = entry.draft ?? entry.approved;
          const hasDraft = Boolean(entry.draft);
          const audited = data.audits.some((audit) => audit.platform === platform);
          const itemCount = data.calendar.filter((item) => item.platform === platform).length;

          return (
            <Card key={platform}>
              <CardContent className="space-y-3 pt-5">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <p className="text-sm font-semibold">{platform}</p>
                  <div className="flex flex-wrap gap-1.5">
                    <Badge variant={audited ? "success" : "secondary"}>
                      {audited ? "Audited" : "No audit yet"}
                    </Badge>
                    <Badge variant="outline">{itemCount} planned</Badge>
                  </div>
                </div>

                {hasDraft ? (
                  <Badge variant="warning">
                    {entry.draftSource === "ai"
                      ? "AI draft, not yet approved"
                      : "Manual edit, not yet approved"}
                  </Badge>
                ) : entry.approvedSource === "template" ? (
                  <Badge variant="secondary">Default template, not yet reviewed</Badge>
                ) : (
                  <Badge variant="success">
                    Approved
                    {entry.approvedBy ? ` by ${entry.approvedBy}` : ""}
                    {entry.approvedAt ? `, ${formatDateTime(entry.approvedAt)}` : ""}
                  </Badge>
                )}

                {hasDraft ? (
                  <div className="space-y-2 rounded-lg border bg-muted/20 p-3">
                    <PlaybookField
                      label="Role"
                      onChange={(value) => updateDraftField(platform, "role", value)}
                      value={fields.role}
                    />
                    <PlaybookField
                      label="Voice"
                      onChange={(value) => updateDraftField(platform, "persona", value)}
                      value={fields.persona}
                    />
                    <PlaybookField
                      label="Content"
                      multiline
                      onChange={(value) => updateDraftField(platform, "content", value)}
                      value={fields.content}
                    />
                    <div className="grid gap-2 sm:grid-cols-2">
                      <PlaybookField
                        label="Format"
                        onChange={(value) => updateDraftField(platform, "defaultFormat", value)}
                        value={fields.defaultFormat}
                      />
                      <PlaybookField
                        label="Best posting time"
                        onChange={(value) => updateDraftField(platform, "bestPostingTime", value)}
                        value={fields.bestPostingTime}
                      />
                    </div>
                    <PlaybookField
                      label="CTA"
                      onChange={(value) => updateDraftField(platform, "cta", value)}
                      value={fields.cta}
                    />
                    <PlaybookField
                      label="Measure"
                      onChange={(value) => updateDraftField(platform, "metrics", value)}
                      value={fields.metrics}
                    />
                    <PlaybookField
                      label="Guardrail"
                      multiline
                      onChange={(value) => updateDraftField(platform, "guardrail", value)}
                      value={fields.guardrail}
                    />

                    <div className="flex flex-wrap gap-2 pt-1">
                      <Button
                        disabled={!canApprove}
                        onClick={() => approveDraft(platform)}
                        size="sm"
                        type="button"
                      >
                        <CheckCircle2 className="h-4 w-4" />
                        Approve
                      </Button>
                      <Button
                        onClick={() => discardDraft(platform)}
                        size="sm"
                        type="button"
                        variant="outline"
                      >
                        Discard draft
                      </Button>
                    </div>
                    {!canApprove ? (
                      <p className="text-xs leading-5 text-muted-foreground">
                        Only the Marketing Manager role view can approve here.
                        This is a role-appropriate display setting, not secure
                        access control; there is no sign-in yet, so it does
                        not stop someone switching role views.
                      </p>
                    ) : null}
                  </div>
                ) : (
                  <div className="space-y-1 text-xs leading-5 text-muted-foreground">
                    <p>
                      <span className="font-medium text-foreground">Role:</span> {fields.role}.
                      Voice: {fields.persona}.
                    </p>
                    <p>
                      <span className="font-medium text-foreground">Content:</span>{" "}
                      {fields.content}
                    </p>
                    <p>
                      <span className="font-medium text-foreground">Format and time:</span>{" "}
                      {fields.defaultFormat}, best at {fields.bestPostingTime}.
                    </p>
                    <p>
                      <span className="font-medium text-foreground">CTA:</span> {fields.cta}
                    </p>
                    <p>
                      <span className="font-medium text-foreground">Measure:</span>{" "}
                      {fields.metrics}
                    </p>
                    <p>
                      <span className="font-medium text-foreground">Guardrail:</span>{" "}
                      {fields.guardrail}
                    </p>
                  </div>
                )}

                {!hasDraft ? (
                  <div className="flex flex-wrap gap-2">
                    <Button
                      disabled={!liveAi || generatingPlatform === platform || generatingAll}
                      onClick={() => void generateOne(platform)}
                      size="sm"
                      type="button"
                      variant="outline"
                    >
                      <Sparkles className="h-4 w-4" />
                      {generatingPlatform === platform ? "Generating" : "Generate with AI"}
                    </Button>
                    <Button
                      onClick={() => startManualEdit(platform)}
                      size="sm"
                      type="button"
                      variant="outline"
                    >
                      Edit
                    </Button>
                  </div>
                ) : null}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </section>
  );
}

function PlaybookField({
  label,
  multiline,
  onChange,
  value,
}: {
  label: string;
  multiline?: boolean;
  onChange: (value: string) => void;
  value: string;
}) {
  return (
    <label className="block">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      {multiline ? (
        <Textarea
          className="mt-1"
          onChange={(event) => onChange(event.target.value)}
          value={value}
        />
      ) : (
        <Input
          className="mt-1"
          onChange={(event) => onChange(event.target.value)}
          value={value}
        />
      )}
    </label>
  );
}

// A free-typing buffer for the competitor Platforms cell. Values are parsed
// into known Platform names only once typing pauses (on blur), not on every
// keystroke, so an unrecognised word being typed is not snapped away before
// the person has finished typing it. Only real Platform names or a known
// alias survive the parse; anything else is not kept, which is disclosed via
// the field's title and placeholder rather than silently vanishing with no
// explanation.
function CompetitorPlatformsField({
  competitorId,
  onChange,
  platforms,
}: {
  competitorId: string;
  onChange: (competitorId: string, platforms: Platform[]) => void;
  platforms: Platform[];
}) {
  const [text, setText] = useState(() => listToText(platforms));

  useEffect(() => {
    setText(listToText(platforms));
    // Only resync from the outside when the row itself changes (e.g. an AI
    // draft fills it in), not on every render, so typing is never overwritten
    // mid-keystroke by the parsed-and-reformatted value.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [competitorId]);

  return (
    <Textarea
      onBlur={() => onChange(competitorId, parsePlatformList(text))}
      onChange={(event) => setText(event.target.value)}
      placeholder="TikTok, Instagram, YouTube Shorts, LinkedIn, Facebook, X/Twitter, Threads"
      title="Only these platform names (or common aliases) are kept: TikTok, Instagram, YouTube Shorts, LinkedIn, Facebook, X/Twitter, Threads"
      value={text}
    />
  );
}

function StrategyBriefView({
  acceptedTrends,
  aiIntegration,
  audits,
  brand,
  brief,
  competitorInsights,
  listeningResults,
  platformPlaybook,
  socialGoals,
  ucc,
  onBriefChange,
  onRecordUsage,
}: {
  acceptedTrends: string[];
  aiIntegration: AiIntegrationSettings;
  audits: SocialAudit[];
  brand: BrandProfile;
  brief: StrategyBrief;
  competitorInsights: CompetitorInsight[];
  listeningResults: ListeningResult[];
  platformPlaybook: PlatformPlaybook;
  socialGoals: SocialGoalSettings;
  ucc: UccStrategyData;
  onBriefChange: (brief: StrategyBrief) => void;
  onRecordUsage: (module: string, model: string, usage: OpenAiUsage) => void;
}) {
  const [generating, setGenerating] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [aiDraftPending, setAiDraftPending] = useState(false);

  const liveAi = isLiveAiEnabled(aiIntegration);

  function updateBrief<K extends keyof StrategyBrief>(
    field: K,
    value: StrategyBrief[K],
  ) {
    onBriefChange({
      ...brief,
      [field]: value,
      approved: field === "approved" ? Boolean(value) : false,
      updatedAt: new Date().toISOString(),
    });
  }

  function approveBrief() {
    setAiDraftPending(false);
    updateBrief("approved", true);
  }

  function buildContext(): BriefAiContext {
    return {
      brand: {
        name: brand.brandName,
        industry: brand.industry,
        toneOfVoice: brand.toneOfVoice,
        audience: brand.audience,
        offers: brand.offers,
        goals: brand.goals,
        guidelines: brand.brandGuidelines,
      },
      courses: ucc.courses
        .filter((course) => course.status !== "archived")
        .map((course) => ({
          name: course.name,
          category: course.category,
          usp: course.usp ?? "",
          description: course.description ?? "",
          sellingPoints: course.sellingPoints ?? [],
          complianceNotes: course.complianceNotes,
        })),
      audiences: ucc.audiences.map((audience) => ({
        name: audience.name,
        goals: audience.motivations,
        painPoints: audience.concerns,
        interests: audience.interests ?? [],
        preferredChannels: audience.recommendedChannels ?? [],
      })),
      auditGoal: {
        primaryObjective: socialGoals.primaryObjective,
        conversionAction: socialGoals.conversionAction,
      },
      platformAnalytics: audits.map((audit) => ({
        platform: audit.platform,
        followers: audit.followers,
        averageReach: audit.averageReach,
        engagementRate: audit.engagementRate,
      })),
      acceptedCompetitorInsights: competitorInsights
        .filter((insight) => insight.status === "accepted")
        .map(
          (insight) =>
            `${insight.competitorName} (${insight.kind}): ${insight.insight}`,
        ),
      acceptedListeningInsights: listeningResults
        .filter((result) => result.status === "accepted")
        .map((result) => `${result.topic}: ${result.insight}`),
      acceptedTrends,
      platforms: [...platforms],
    };
  }

  async function generateBrief() {
    setGenerating(true);
    setErrorMessage("");

    try {
      const response = await fetch(apiUrl("/api/ai/brief"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          apiKey: aiIntegration.apiKey,
          model: resolveModelForTask(aiIntegration, "analysis"),
          context: buildContext(),
        }),
      });
      const result = (await response.json()) as
        | { ok: true; draft: BriefAiDraft; usage?: OpenAiUsage; model?: string }
        | { ok: false; error: string };

      if (!result.ok) {
        setErrorMessage(result.error);
        return;
      }

      const patch = briefDraftToPatch(result.draft, brief.platformStrategy, [
        ...platforms,
      ]);

      onBriefChange({
        ...brief,
        ...patch,
        approved: false,
        updatedAt: new Date().toISOString(),
      });
      setAiDraftPending(true);

      if (result.usage) {
        onRecordUsage("Strategy Brief", result.model ?? "unknown", result.usage);
      }
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : String(error));
    } finally {
      setGenerating(false);
    }
  }

  return (
    <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_380px]">
      <Card>
        <CardHeader className="flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <SectionTitle
            icon={ClipboardCheck}
            kicker="Plan"
            title="Strategic Narrative Brief"
            description="Generate a draft with AI or edit by hand, then approve before generating the calendar."
          />
          <div className="flex flex-col items-stretch gap-2 sm:items-end">
            <div className="flex flex-wrap gap-2 sm:justify-end">
              <Button
                disabled={!liveAi || generating}
                onClick={generateBrief}
                size="sm"
                type="button"
                variant="outline"
              >
                <Sparkles className="h-4 w-4" />
                {generating ? "Generating" : "Generate brief with AI"}
              </Button>
              <Button
                onClick={approveBrief}
                size="sm"
                type="button"
                variant={brief.approved ? "secondary" : "default"}
              >
                <CheckCircle2 className="h-4 w-4" />
                {brief.approved ? "Approved" : "Approve brief"}
              </Button>
            </div>
            {!liveAi ? (
              <p className="text-xs leading-5 text-muted-foreground">
                Connect OpenAI in Settings to generate with AI.
              </p>
            ) : null}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {aiDraftPending && !brief.approved ? (
            <div className="rounded-md border border-warning-border bg-warning p-3 text-xs leading-5 text-warning-foreground">
              AI draft, not yet approved. Review and edit any field below, then
              select Approve brief to make it the working brief.
            </div>
          ) : null}

          {errorMessage ? (
            <div className="rounded-md border border-warning-border bg-warning p-3 text-xs leading-5 text-warning-foreground">
              {errorMessage}
            </div>
          ) : null}
          <Field label="Monthly campaign goal">
            <Textarea
              value={brief.monthlyCampaignGoal}
              onChange={(event) =>
                updateBrief("monthlyCampaignGoal", event.target.value)
              }
            />
          </Field>

          <TextListField
            label="Audience pain points"
            value={brief.audiencePainPoints}
            onChange={(value) => updateBrief("audiencePainPoints", value)}
          />

          <TextListField
            label="Content pillars"
            value={brief.contentPillars}
            onChange={(value) => updateBrief("contentPillars", value)}
          />

          <div className="grid gap-3 md:grid-cols-2">
            {platforms.map((platform) => (
              <Field key={platform} label={`${platform} strategy`}>
                <Textarea
                  value={brief.platformStrategy[platform]}
                  onChange={(event) =>
                    updateBrief("platformStrategy", {
                      ...brief.platformStrategy,
                      [platform]: event.target.value,
                    })
                  }
                />
              </Field>
            ))}
          </div>

          <Field label="Content mix recommendation">
            <Textarea
              value={brief.contentMixRecommendation}
              onChange={(event) =>
                updateBrief("contentMixRecommendation", event.target.value)
              }
            />
          </Field>

          <Field label="Tone guidance">
            <Textarea
              value={brief.toneGuidance}
              onChange={(event) => updateBrief("toneGuidance", event.target.value)}
            />
          </Field>

          <TextListField
            label="Key angles to own"
            value={brief.keyAnglesToOwn}
            onChange={(value) => updateBrief("keyAnglesToOwn", value)}
          />

          <div className="rounded-lg border bg-muted/20 p-4">
            <p className="text-sm font-semibold">Strategy recommendation (Stage 6)</p>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">
              Proposed by AI as a draft. Every field is editable and stays a
              draft until you approve the brief.
            </p>
            <div className="mt-3 space-y-4">
              <TextListField
                label="Marketing objectives"
                value={brief.marketingObjectives ?? []}
                onChange={(value) => updateBrief("marketingObjectives", value)}
              />
              <TextListField
                label="Campaign ideas"
                value={brief.campaignIdeas ?? []}
                onChange={(value) => updateBrief("campaignIdeas", value)}
              />
              <Field label="Platform mix">
                <Textarea
                  value={brief.platformMix ?? ""}
                  onChange={(event) => updateBrief("platformMix", event.target.value)}
                />
              </Field>
              <Field label="Suggested budget direction">
                <Textarea
                  value={brief.suggestedBudget ?? ""}
                  onChange={(event) => updateBrief("suggestedBudget", event.target.value)}
                />
              </Field>
              <TextListField
                label="KPIs"
                value={brief.kpis ?? []}
                onChange={(value) => updateBrief("kpis", value)}
              />
              <Field label="Recommended timeline">
                <Textarea
                  value={brief.recommendedTimeline ?? ""}
                  onChange={(event) => updateBrief("recommendedTimeline", event.target.value)}
                />
              </Field>
              <TextListField
                label="Recommended resources"
                value={brief.recommendedResources ?? []}
                onChange={(value) => updateBrief("recommendedResources", value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-4">
        <GoalAlignmentCard socialGoals={socialGoals} />

        <Card>
          <CardHeader>
            <CardTitle>Brief Status</CardTitle>
            <CardDescription>
              Calendar generation is gated by approval.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Badge variant={brief.approved ? "success" : "warning"}>
              {brief.approved ? "Ready for calendar generation" : "Needs review"}
            </Badge>
            <p className="text-sm leading-6 text-muted-foreground">
              Last edited {formatDateTime(brief.updatedAt)}.
            </p>
            <Progress value={brief.approved ? 100 : 64} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Education Compliance</CardTitle>
            <CardDescription>Reminders included in calendar handoff.</CardDescription>
          </CardHeader>
          <CardContent>
            <TextListField
              label="Compliance reminders"
              value={brief.complianceReminders}
              onChange={(value) => updateBrief("complianceReminders", value)}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Platform Rulebook</CardTitle>
            <CardDescription>Native voice rules for each channel.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {platforms.map((platform) => {
              const rule = getApprovedPlaybookFields(platformPlaybook, platform);

              return (
                <div className="rounded-lg border bg-muted/20 p-3" key={platform}>
                  <div className="flex items-center justify-between gap-3">
                    <PlatformBadge platform={platform} />
                    <Badge variant="outline">{rule.persona}</Badge>
                  </div>
                  <p className="mt-2 text-xs leading-5 text-muted-foreground">
                    {rule.guardrail}
                  </p>
                </div>
              );
            })}
          </CardContent>
        </Card>
      </div>
    </section>
  );
}

function GoalAlignmentCard({ socialGoals }: { socialGoals: SocialGoalSettings }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Goal Alignment</CardTitle>
        <CardDescription>
          Pulled from Social Audit goal setting.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="rounded-lg border bg-muted/20 p-3">
          <p className="text-xs font-medium uppercase text-muted-foreground">
            Primary objective
          </p>
          <p className="mt-2 text-sm font-semibold leading-6">
            {socialGoals.primaryObjective}
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <GoalFact label="Funnel" value={capitalize(socialGoals.funnelStage)} />
          <GoalFact
            label="Target reach"
            value={formatNumber(socialGoals.monthlyTargets.reach)}
          />
          <GoalFact
            label="Target clicks"
            value={formatNumber(socialGoals.monthlyTargets.clicks)}
          />
        </div>
        <div className="flex flex-wrap gap-1.5">
          {socialGoals.priorityPlatforms.map((platform) => (
            <PlatformBadge key={platform} platform={platform} />
          ))}
        </div>
        <p className="text-xs leading-5 text-muted-foreground">
          Conversion action: {socialGoals.conversionAction}
        </p>
      </CardContent>
    </Card>
  );
}

function GoalFact({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border bg-muted/20 p-3">
      <p className="text-xs font-medium uppercase text-muted-foreground">{label}</p>
      <p className="mt-2 text-sm font-semibold leading-5">{value}</p>
    </div>
  );
}

function GoalImpactStrip({
  calendar,
  socialGoals,
  variant,
}: {
  calendar: CalendarItem[];
  socialGoals: SocialGoalSettings;
  variant: "calendar" | "production";
}) {
  const priorityItems = calendar.filter((item) =>
    socialGoals.priorityPlatforms.includes(item.platform),
  ).length;
  const goalCoverage =
    calendar.length > 0 ? Math.round((priorityItems / calendar.length) * 100) : 0;

  return (
    <div className="rounded-lg border bg-muted/20 p-3">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          <p className="text-sm font-semibold">
            {variant === "calendar" ? "Calendar goal lens" : "Production goal lens"}
          </p>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">
            {socialGoals.primaryObjective}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge variant="success">{goalCoverage}% priority platform coverage</Badge>
          <Badge variant="outline">{capitalize(socialGoals.funnelStage)}</Badge>
        </div>
      </div>
      <p className="mt-3 text-xs leading-5 text-muted-foreground">
        Conversion action: {socialGoals.conversionAction}
      </p>
    </div>
  );
}

function CalendarBuilderView({
  acceptedTrends,
  aiIntegration,
  brand,
  brief,
  calendar,
  externalRole,
  performanceResults,
  platformPlaybook,
  socialGoals,
  ucc,
  onCalendarChange,
  onOfferUndo,
  onRecordUsage,
  onReplaceCalendar,
}: {
  acceptedTrends: string[];
  aiIntegration: AiIntegrationSettings;
  brand: BrandProfile;
  brief: StrategyBrief;
  calendar: CalendarItem[];
  // The sidebar Role view selection. The Calendar follows it (Marketing
  // Manager sees everything), while the local Role dropdown still allows a
  // quick peek at another role's work without changing the sidebar.
  externalRole?: Role;
  performanceResults: PerformanceResult[];
  platformPlaybook: PlatformPlaybook;
  socialGoals: SocialGoalSettings;
  ucc: UccStrategyData;
  onCalendarChange: (calendar: CalendarItem[]) => void;
  onOfferUndo: (message: string, onExpire?: () => void) => void;
  onReplaceCalendar: (calendar: CalendarItem[], clearPerformance: boolean) => void;
  onRecordUsage: (module: string, model: string, usage: OpenAiUsage) => void;
}) {
  const [platformFilter, setPlatformFilter] = useState<"all" | Platform>("all");
  const [statusFilter, setStatusFilter] = useState<"all" | CalendarStatus>("all");
  const [viewMode, setViewMode] = useState<"calendar" | "list">("calendar");
  const [roleFilter, setRoleFilter] = useState<"all" | Role>(
    externalRole && externalRole !== "marketing manager" ? externalRole : "all",
  );
  const [generating, setGenerating] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [generationMode, setGenerationMode] = useState<"ai" | "offline" | null>(null);
  const [regeneratingItemId, setRegeneratingItemId] = useState("");

  useEffect(() => {
    if (externalRole) {
      setRoleFilter(externalRole === "marketing manager" ? "all" : externalRole);
    }
  }, [externalRole]);

  const liveAi = isLiveAiEnabled(aiIntegration);
  const hasPerformanceData = performanceResults.length > 0;
  const AI_CALENDAR_COUNT = 12;

  function confirmReplaceIfNeeded() {
    if (!hasPerformanceData || typeof window === "undefined") {
      return true;
    }

    return window.confirm(
      "Regenerating replaces the current calendar and clears the performance results already recorded against these items. Continue?",
    );
  }

  function buildCalendarContext(count: number, focus?: CalendarAiContext["focus"]): CalendarAiContext {
    return {
      brief: {
        monthlyCampaignGoal: brief.monthlyCampaignGoal,
        marketingObjectives: brief.marketingObjectives ?? [],
        campaignIdeas: brief.campaignIdeas ?? [],
        contentPillars: brief.contentPillars,
        platformMix: brief.platformMix ?? "",
        toneGuidance: brief.toneGuidance,
        keyAnglesToOwn: brief.keyAnglesToOwn,
      },
      // Approval gate (Module A2): only approved campaigns reach the
      // calendar generator's context.
      campaigns: ucc.campaigns.filter(isCampaignApproved).map((campaign) => ({
        name: campaign.name,
        objective: campaign.objective,
        platformMix: campaign.platformMix,
      })),
      courses: ucc.courses
        .filter((course) => course.status !== "archived")
        .map((course) => ({
          name: course.name,
          category: course.category,
          usp: course.usp ?? "",
          complianceNotes: course.complianceNotes ?? "",
        })),
      audiences: ucc.audiences.map((audience) => ({
        name: audience.name,
        goals: audience.motivations,
        painPoints: audience.concerns,
      })),
      platforms: [...platforms],
      count,
      focus,
      acceptedTrends,
    };
  }

  function runOfflineGenerate() {
    if (!confirmReplaceIfNeeded()) {
      return;
    }

    const items = generateCalendarFromBrief(
      brief,
      brand,
      calendar[0]?.date ?? "2026-07-01",
      socialGoals,
      ucc,
      platformPlaybook,
    );
    onReplaceCalendar(items, hasPerformanceData);
    setGenerationMode("offline");
    setErrorMessage("");
  }

  async function runAiGenerate() {
    if (!ucc.campaigns.some(isCampaignApproved)) {
      setErrorMessage(
        "Approve at least one campaign first. The AI calendar only plans content for approved campaigns.",
      );
      return;
    }

    if (!confirmReplaceIfNeeded()) {
      return;
    }

    setGenerating(true);
    setErrorMessage("");

    try {
      const response = await fetch(apiUrl("/api/ai/calendar"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          apiKey: aiIntegration.apiKey,
          model: resolveModelForTask(aiIntegration, "analysis"),
          context: buildCalendarContext(AI_CALENDAR_COUNT),
        }),
      });
      const result = (await response.json()) as
        | { ok: true; items: CalendarDraftItem[]; usage?: OpenAiUsage; model?: string }
        | { ok: false; error: string };

      if (!result.ok) {
        setErrorMessage(result.error);
        return;
      }

      const items = calendarDraftToItems(result.items, {
        startDate: calendar[0]?.date ?? "2026-07-01",
        campaigns: ucc.campaigns,
        platformPlaybook,
      });
      onReplaceCalendar(items, hasPerformanceData);
      setGenerationMode("ai");

      if (result.usage) {
        onRecordUsage("Content Calendar", result.model ?? "unknown", result.usage);
      }
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : String(error));
    } finally {
      setGenerating(false);
    }
  }
  // No item is open by default; the detail panel only opens when a calendar
  // item is double-clicked (or right after adding/duplicating one).
  const [selectedItemId, setSelectedItemId] = useState("");
  const defaultGoalPlatform =
    socialGoals.priorityPlatforms[0] ?? ("Instagram" as Platform);
  const [newCalendarItem, setNewCalendarItem] = useState({
    itemKind: "post" as CalendarItemKind,
    date: getNextCalendarDate(calendar),
    platform: defaultGoalPlatform,
    contentPillar:
      socialGoals.contentPriorities[0] ??
      brief.contentPillars[0] ??
      "Admissions Confidence",
    contentTopic: "",
    format: getApprovedPlaybookFields(platformPlaybook, defaultGoalPlatform).defaultFormat,
    campaignId: ucc.campaigns[0]?.id ?? "",
    courseId: ucc.courses[0]?.id ?? "",
    audienceId: ucc.audiences[0]?.id ?? "",
  });

  const visibleItems = calendar.filter((item) => {
    const platformMatch =
      platformFilter === "all" || item.platform === platformFilter;
    const statusMatch = statusFilter === "all" || item.status === statusFilter;
    const roleMatch = roleFilter === "all" || item.assignedRole === roleFilter;
    return platformMatch && statusMatch && roleMatch;
  });

  const selectedItem = calendar.find((item) => item.id === selectedItemId);

  function updateItem(id: string, patch: Partial<CalendarItem>) {
    onCalendarChange(
      calendar.map((item) =>
        item.id === id ? { ...item, ...sanitizeCalendarPatch(item, patch) } : item,
      ),
    );
  }

  function deleteItem(id: string) {
    if (typeof window !== "undefined") {
      const confirmed = window.confirm(
        "Delete this calendar item? You will have 10 seconds to undo.",
      );

      if (!confirmed) {
        return;
      }
    }

    const item = calendar.find((row) => row.id === id);

    onOfferUndo(
      `Calendar item "${item?.contentTopic ?? "Untitled"}" deleted.`,
    );
    onCalendarChange(calendar.filter((item) => item.id !== id));
  }

  function duplicateItem(id: string) {
    const source = calendar.find((item) => item.id === id);

    if (!source) {
      return;
    }

    const copyId = `copy-${Date.now()}`;
    const copy: CalendarItem = {
      ...source,
      id: copyId,
      status: "idea",
      approvalStage: "idea",
      finalCaption: "",
      finalAssetLink: "",
      publishedUrl: "",
      kpiResult: "",
      followUpAction: "",
    };
    onCalendarChange(sortCalendarItems([...calendar, copy]));
    setSelectedItemId(copyId);
  }

  function approveItem(id: string) {
    updateItem(id, { status: "approved", approvalStage: "calendar approved" });
  }

  function rejectItem(id: string) {
    updateItem(id, { status: "review", approvalStage: "revision" });
  }

  async function regenerateItem(id: string) {
    const item = calendar.find((row) => row.id === id);

    if (!item || !liveAi) {
      return;
    }

    setRegeneratingItemId(id);
    setErrorMessage("");

    try {
      const response = await fetch(apiUrl("/api/ai/calendar"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          apiKey: aiIntegration.apiKey,
          model: resolveModelForTask(aiIntegration, "analysis"),
          context: buildCalendarContext(1, {
            platform: item.platform,
            contentPillar: item.contentPillar,
            contentTopic: item.contentTopic,
            currentCaption: item.caption,
          }),
        }),
      });
      const result = (await response.json()) as
        | { ok: true; items: CalendarDraftItem[]; usage?: OpenAiUsage; model?: string }
        | { ok: false; error: string };

      if (!result.ok) {
        setErrorMessage(result.error);
        return;
      }

      const draft = result.items[0];

      if (draft) {
        updateItem(id, {
          ...calendarDraftToPatch(draft, platformPlaybook),
          status: "idea",
          approvalStage: "idea",
        });
      }

      if (result.usage) {
        onRecordUsage("Calendar item regenerate", result.model ?? "unknown", result.usage);
      }
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : String(error));
    } finally {
      setRegeneratingItemId("");
    }
  }

  function updateNewCalendarItem(patch: Partial<typeof newCalendarItem>) {
    setNewCalendarItem((current) => {
      const next = { ...current, ...patch };

      if (patch.platform || patch.itemKind) {
        next.format =
          next.itemKind === "event"
            ? "Event promotion"
            : getApprovedPlaybookFields(platformPlaybook, next.platform).defaultFormat;
      }

      return next;
    });
  }

  function addManagerCalendarItem() {
    const platform = newCalendarItem.platform;
    const playbook = getApprovedPlaybookFields(platformPlaybook, platform);
    const itemKind = newCalendarItem.itemKind;
    const contentTopic =
      newCalendarItem.contentTopic.trim() ||
      (itemKind === "event" ? "New campus event" : "New social post");
    const contentPillar =
      newCalendarItem.contentPillar.trim() ||
      brief.contentPillars[0] ||
      "Admissions Confidence";
    const format =
      newCalendarItem.format.trim() ||
      (itemKind === "event" ? "Event promotion" : playbook.defaultFormat);
    const itemId = `manager-${itemKind}-${Date.now()}`;
    const date = newCalendarItem.date || getNextCalendarDate(calendar);
    const nextItem: CalendarItem = {
      id: itemId,
      itemKind,
      date,
      platform,
      plannedDate: date,
      actualPostDate: "",
      campaignId: newCalendarItem.campaignId,
      courseId: newCalendarItem.courseId,
      audienceId: newCalendarItem.audienceId,
      contentPillar,
      contentTopic,
      format,
      hook:
        itemKind === "event"
          ? `What families should know before ${contentTopic.toLowerCase()}`
          : `${contentTopic}: proof before promise`,
      caption:
        itemKind === "event"
          ? `Save the date: ${contentTopic}. Share the practical details, who it is for, and what families can verify before they attend.`
          : "",
      visualDirection:
        itemKind === "event"
          ? "Use real venue, student, faculty, or parent-facing details. Keep date, time, place, and eligibility clear."
          : "Use a real proof moment connected to the selected pillar and platform.",
      cta:
        itemKind === "event"
          ? "Add this to your calendar or message admissions with questions."
          : playbook.cta,
      hashtags: ["#CollegePlanning", "#CampusLife", "#Admissions"],
      bestPostingTime: playbook.bestPostingTime,
      productionNotes: `Added by marketing manager from Calendar Builder. Confirm details, owner, approval path, and education compliance before scheduling.`,
      assignedRole: "marketing manager",
      owner: "Marketing Manager",
      reviewer: "Compliance Reviewer",
      dueDate: date,
      blocker: "",
      status: "idea",
      approvalStage: "idea",
      businessGoalConnection:
        itemKind === "event"
          ? `Supports ${socialGoals.primaryObjective} by giving families a dated action to complete: ${socialGoals.conversionAction}`
          : `Supports ${socialGoals.primaryObjective}. Conversion action: ${socialGoals.conversionAction}.`,
      complianceNote:
        "Keep event and program claims factual. Do not guarantee admission, jobs, salary, visas, or work eligibility.",
      videoScript: "",
      shotNotes:
        itemKind === "event"
          ? "Capture location, signage, staff welcome, student activity, proof detail, and a clear CTA frame."
          : "",
      finalCaption: "",
      finalAssetLink: "",
      publishedUrl: "",
      kpiResult: "",
      followUpAction: "",
    };

    onCalendarChange(sortCalendarItems([...calendar, nextItem]));
    setSelectedItemId(itemId);
    setPlatformFilter("all");
    setStatusFilter("all");
    setRoleFilter("all");
    setNewCalendarItem((current) => ({
      ...current,
      date: getNextCalendarDate([...calendar, nextItem]),
      contentTopic: "",
    }));
  }

  return (
    <section className="space-y-4">
      <Card>
        <CardHeader className="flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <SectionTitle
            icon={CalendarDays}
            kicker="Create"
            title="Calendar Builder"
            description={`${brand.brandName} has ${calendar.length} platform-native calendar items connected to the approved strategy brief.`}
          />
          <div className="flex flex-col items-stretch gap-2 sm:items-end">
            <div className="flex flex-wrap gap-2 sm:justify-end">
              <Button
                disabled={!brief.approved || !liveAi || generating}
                onClick={runAiGenerate}
                size="sm"
                type="button"
              >
                <Sparkles className="h-4 w-4" />
                {generating ? "Generating" : "Generate calendar with AI"}
              </Button>
              <Button
                disabled={!brief.approved || generating}
                onClick={runOfflineGenerate}
                size="sm"
                type="button"
                variant="outline"
              >
                <Wand2 className="h-4 w-4" />
                Generate offline
              </Button>
            </div>
            {brief.approved && !liveAi ? (
              <p className="text-xs leading-5 text-muted-foreground">
                Connect OpenAI in Settings to generate with AI.
              </p>
            ) : null}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {!brief.approved ? (
            <div className="rounded-lg border border-warning-border bg-warning p-4 text-sm text-warning-foreground">
              Approve a strategy brief first. The calendar is generated only
              after the brief is approved.
            </div>
          ) : null}

          {generationMode === "ai" ? (
            <div className="rounded-md border border-warning-border bg-warning p-3 text-xs leading-5 text-warning-foreground">
              AI draft, not yet approved. Edit, delete, duplicate, or regenerate
              any item, then approve each one. Nothing is approved or published
              automatically.
            </div>
          ) : null}

          {generationMode === "offline" ? (
            <div className="rounded-md border bg-muted/30 p-3 text-xs leading-5 text-muted-foreground">
              {OFFLINE_DRAFT_LABEL}. These items came from the
              template generator.
            </div>
          ) : null}

          {errorMessage ? (
            <div className="rounded-md border border-warning-border bg-warning p-3 text-xs leading-5 text-warning-foreground">
              {errorMessage}
            </div>
          ) : null}

          <GoalImpactStrip
            calendar={calendar}
            socialGoals={socialGoals}
            variant="calendar"
          />

          <div className="rounded-lg border bg-muted/20 p-3">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold">Marketing Manager Add</p>
                <p className="mt-1 text-xs leading-5 text-muted-foreground">
                  Add a one-off post or event directly into the shared calendar and
                  production workflow.
                </p>
              </div>
              <Badge variant="success">Manager owned</Badge>
            </div>
            <div className="grid gap-3 lg:grid-cols-[130px_150px_170px_minmax(0,1fr)_minmax(0,1fr)_150px]">
              <Field label="Type">
                <NativeSelect
                  value={newCalendarItem.itemKind}
                  onChange={(event) =>
                    updateNewCalendarItem({
                      itemKind: event.target.value as CalendarItemKind,
                    })
                  }
                >
                  {calendarItemKinds.map((itemKind) => (
                    <option key={itemKind} value={itemKind}>
                      {capitalize(itemKind)}
                    </option>
                  ))}
                </NativeSelect>
              </Field>
              <Field label="Date">
                <Input
                  type="date"
                  value={newCalendarItem.date}
                  onChange={(event) =>
                    updateNewCalendarItem({ date: event.target.value })
                  }
                />
              </Field>
              <Field label="Platform">
                <NativeSelect
                  value={newCalendarItem.platform}
                  onChange={(event) =>
                    updateNewCalendarItem({
                      platform: event.target.value as Platform,
                    })
                  }
                >
                  {platforms.map((platform) => (
                    <option key={platform} value={platform}>
                      {platform}
                    </option>
                  ))}
                </NativeSelect>
              </Field>
              <Field label="Pillar">
                <Input
                  value={newCalendarItem.contentPillar}
                  onChange={(event) =>
                    updateNewCalendarItem({ contentPillar: event.target.value })
                  }
                />
              </Field>
              <Field label="Topic or event">
                <Input
                  placeholder="Open house reminder, alumni panel, campus tour push..."
                  value={newCalendarItem.contentTopic}
                  onChange={(event) =>
                    updateNewCalendarItem({ contentTopic: event.target.value })
                  }
                />
              </Field>
              <Field label="Format">
                <Input
                  value={newCalendarItem.format}
                  onChange={(event) =>
                    updateNewCalendarItem({ format: event.target.value })
                  }
                />
              </Field>
            </div>
            <div className="mt-3 grid gap-3 lg:grid-cols-3">
              <Field label="Campaign">
                <NativeSelect
                  value={newCalendarItem.campaignId}
                  onChange={(event) =>
                    updateNewCalendarItem({ campaignId: event.target.value })
                  }
                >
                  {ucc.campaigns.map((campaign) => (
                    <option key={campaign.id} value={campaign.id}>
                      {campaign.name}
                    </option>
                  ))}
                </NativeSelect>
              </Field>
              <Field label="Course">
                <NativeSelect
                  value={newCalendarItem.courseId}
                  onChange={(event) =>
                    updateNewCalendarItem({ courseId: event.target.value })
                  }
                >
                  {ucc.courses.map((course) => (
                    <option key={course.id} value={course.id}>
                      {course.name}
                    </option>
                  ))}
                </NativeSelect>
              </Field>
              <Field label="Audience">
                <NativeSelect
                  value={newCalendarItem.audienceId}
                  onChange={(event) =>
                    updateNewCalendarItem({ audienceId: event.target.value })
                  }
                >
                  {ucc.audiences.map((audience) => (
                    <option key={audience.id} value={audience.id}>
                      {audience.name}
                    </option>
                  ))}
                </NativeSelect>
              </Field>
            </div>
            <Button
              className="mt-3 w-full sm:w-auto"
              onClick={addManagerCalendarItem}
              type="button"
            >
              <Plus className="h-4 w-4" />
              Add to calendar
            </Button>
          </div>

          <div className="grid gap-3 lg:grid-cols-3">
            <FilterField label="Platform" icon={Filter}>
              <NativeSelect
                value={platformFilter}
                onChange={(event) =>
                  setPlatformFilter(event.target.value as "all" | Platform)
                }
              >
                <option value="all">All platforms</option>
                {platforms.map((platform) => (
                  <option key={platform} value={platform}>
                    {platform}
                  </option>
                ))}
              </NativeSelect>
            </FilterField>
            <FilterField label="Status" icon={ClipboardCheck}>
              <NativeSelect
                value={statusFilter}
                onChange={(event) =>
                  setStatusFilter(event.target.value as "all" | CalendarStatus)
                }
              >
                <option value="all">All statuses</option>
                {statuses.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </NativeSelect>
            </FilterField>
            <FilterField label="Role" icon={UsersRound}>
              <NativeSelect
                value={roleFilter}
                onChange={(event) => setRoleFilter(event.target.value as "all" | Role)}
              >
                <option value="all">All roles</option>
                {roles.map((role) => (
                  <option key={role} value={role}>
                    {role}
                  </option>
                ))}
              </NativeSelect>
            </FilterField>
          </div>
        </CardContent>
      </Card>

      <div className="flex gap-2">
        <Button
          onClick={() => setViewMode("calendar")}
          size="sm"
          type="button"
          variant={viewMode === "calendar" ? "default" : "outline"}
        >
          Calendar view
        </Button>
        <Button
          onClick={() => setViewMode("list")}
          size="sm"
          type="button"
          variant={viewMode === "list" ? "default" : "outline"}
        >
          List view
        </Button>
      </div>

      <div className="space-y-4">
        {viewMode === "calendar" ? (
          <CalendarMonthGrid
            calendar={visibleItems}
            courses={ucc.courses}
            onMoveItemDate={(id, isoDate) =>
              updateItem(id, { date: isoDate, plannedDate: isoDate })
            }
            onOpenItem={setSelectedItemId}
            selectedItemId={selectedItem?.id}
          />
        ) : (
          <CalendarListView
            calendar={visibleItems}
            onApprove={approveItem}
            onDelete={deleteItem}
            onDuplicate={duplicateItem}
            onOpenItem={setSelectedItemId}
            onReject={rejectItem}
            selectedItemId={selectedItem?.id}
          />
        )}
      </div>

      {selectedItem ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={() => setSelectedItemId("")}
        >
          <div
            className="max-h-[85vh] w-full max-w-6xl overflow-y-auto rounded-lg border bg-background p-6 shadow-xl sm:p-8 lg:w-[70vw]"
            onClick={(event) => event.stopPropagation()}
          >
            <CalendarItemEditor
              item={selectedItem}
              liveAi={liveAi}
              regenerating={regeneratingItemId === selectedItem.id}
              onApprove={approveItem}
              onChange={updateItem}
              onClose={() => setSelectedItemId("")}
              onDelete={deleteItem}
              onDuplicate={duplicateItem}
              onRegenerate={regenerateItem}
              onReject={rejectItem}
              ucc={ucc}
            />
          </div>
        </div>
      ) : null}
    </section>
  );
}

function CalendarMonthGrid({
  calendar,
  courses,
  onMoveItemDate,
  onOpenItem,
  selectedItemId,
}: {
  calendar: CalendarItem[];
  courses: UccCourse[];
  onMoveItemDate: (id: string, isoDate: string) => void;
  onOpenItem: (id: string) => void;
  selectedItemId?: string;
}) {
  // Default to the month of the earliest item so a first visit still shows
  // existing content, but the month shown afterwards is genuinely navigable
  // to any past or future month, not just months that already have items.
  const [viewed, setViewed] = useState(() => {
    const sorted = [...calendar].sort((a, b) => a.date.localeCompare(b.date));
    const base = sorted.length > 0 ? parseIsoDate(sorted[0].date) : new Date();
    return { year: base.getFullYear(), month: base.getMonth() };
  });
  // Which day cell is currently being dragged over, so it can highlight as
  // the drop target. Cleared on drop, drag end, or leaving the cell.
  const [dragOverIso, setDragOverIso] = useState("");

  const monthLabel = new Intl.DateTimeFormat("en-US", {
    month: "long",
    year: "numeric",
  }).format(new Date(viewed.year, viewed.month, 1));
  const group = buildCalendarMonthGrid(calendar, viewed.year, viewed.month);

  function shiftMonth(delta: number) {
    setViewed((current) => {
      const next = new Date(current.year, current.month + delta, 1);
      return { year: next.getFullYear(), month: next.getMonth() };
    });
  }

  function goToToday() {
    const now = new Date();
    setViewed({ year: now.getFullYear(), month: now.getMonth() });
  }

  return (
    <Card>
      <CardHeader className="flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <CardTitle>Calendar View</CardTitle>
          <CardDescription>
            Month grid with each scheduled post or event shown inside its publishing date.
          </CardDescription>
        </div>
        <div className="flex items-center gap-2">
          <Button
            aria-label="Previous month"
            onClick={() => shiftMonth(-1)}
            size="icon"
            type="button"
            variant="outline"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="min-w-[150px] text-center text-sm font-semibold">
            {monthLabel}
          </span>
          <Button
            aria-label="Next month"
            onClick={() => shiftMonth(1)}
            size="icon"
            type="button"
            variant="outline"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button onClick={goToToday} size="sm" type="button" variant="outline">
            Today
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-2 md:grid-cols-5">
          {(["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"] as const).map(
            (day) => (
              <div className="rounded-lg border bg-muted/20 p-3" key={day}>
                <p className="text-xs font-medium uppercase text-muted-foreground">
                  {day}
                </p>
                <p className="mt-1 text-sm font-semibold">
                  {dailyPublishingRhythm[day].theme}
                </p>
                <p className="mt-1 text-xs leading-5 text-muted-foreground">
                  {dailyPublishingRhythm[day].goal}
                </p>
              </div>
            ),
          )}
        </div>

        {calendar.length === 0 ? (
          <EmptyState
            action="Adjust filters or generate a calendar."
            icon={CalendarDays}
            title="No calendar items to show"
          />
        ) : (
          <div className="rounded-lg border bg-card">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b p-4">
              <h3 className="text-base font-semibold">{monthLabel}</h3>
              <Badge variant="secondary">{group.items.length} items</Badge>
            </div>
            <div className="grid grid-cols-7 border-b bg-muted/20 text-center text-xs font-medium uppercase text-muted-foreground">
              {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
                <div className="border-r px-2 py-2 last:border-r-0" key={day}>
                  {day}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7">
              {group.cells.map((cell, cellIndex) => (
                <div
                  className={cn(
                    "min-h-36 border-r border-t p-2 last:border-r-0",
                    cellIndex % 7 === 6 && "border-r-0",
                    !cell.inMonth && "bg-muted/20 text-muted-foreground",
                    dragOverIso === cell.isoDate && "bg-primary/10 ring-2 ring-inset ring-primary",
                  )}
                  key={cell.isoDate}
                  onDragEnter={(event) => {
                    event.preventDefault();
                    setDragOverIso(cell.isoDate);
                  }}
                  onDragLeave={() => {
                    setDragOverIso((current) => (current === cell.isoDate ? "" : current));
                  }}
                  onDragOver={(event) => event.preventDefault()}
                  onDrop={(event) => {
                    event.preventDefault();
                    setDragOverIso("");
                    const id = event.dataTransfer.getData("text/plain");

                    if (id) {
                      onMoveItemDate(id, cell.isoDate);
                    }
                  }}
                >
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <span className="text-xs font-semibold">{cell.dayNumber}</span>
                    {cell.items.length > 0 ? (
                      <Badge variant="outline">{cell.items.length}</Badge>
                    ) : null}
                  </div>
                  <div className="space-y-2">
                    {cell.items.map((item) => (
                      <button
                        className={cn(
                          "w-full cursor-grab rounded-md border bg-background p-2 text-left transition-colors hover:border-primary active:cursor-grabbing",
                          selectedItemId === item.id && "border-primary bg-primary/5",
                        )}
                        draggable
                        key={item.id}
                        onDoubleClick={() => onOpenItem(item.id)}
                        onDragStart={(event) => {
                          event.dataTransfer.setData("text/plain", item.id);
                          event.dataTransfer.effectAllowed = "move";
                        }}
                        title="Double-click to open, or drag to another date"
                        type="button"
                      >
                        <div className="flex flex-wrap items-center gap-1">
                          <PlatformBadge platform={item.platform} />
                          <ItemKindBadge itemKind={item.itemKind ?? "post"} />
                          <StatusBadge status={item.status} />
                          <ComplianceBadge
                            item={item}
                            courseNotes={
                              courses.find((course) => course.id === item.courseId)
                                ?.complianceNotes ?? ""
                            }
                          />
                        </div>
                        <p className="mt-2 line-clamp-2 text-xs font-medium leading-4">
                          {item.contentTopic}
                        </p>
                        <p className="mt-1 text-xs leading-4 text-muted-foreground">
                          {item.bestPostingTime}
                        </p>
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function buildCalendarMonthGrid(calendar: CalendarItem[], year: number, month: number) {
  const monthItems = calendar.filter((item) => {
    const date = parseIsoDate(item.date);
    return date.getFullYear() === year && date.getMonth() === month;
  });

  const firstOfMonth = new Date(year, month, 1);
  const lastOfMonth = new Date(year, month + 1, 0);
  const firstGridDate = new Date(firstOfMonth);
  firstGridDate.setDate(firstGridDate.getDate() - firstOfMonth.getDay());
  const lastGridDate = new Date(lastOfMonth);
  lastGridDate.setDate(lastGridDate.getDate() + (6 - lastOfMonth.getDay()));

  const cells: Array<{
    dayNumber: number;
    inMonth: boolean;
    isoDate: string;
    items: CalendarItem[];
  }> = [];
  const cursor = new Date(firstGridDate);

  while (cursor <= lastGridDate) {
    const isoDate = formatIsoDate(cursor);
    cells.push({
      dayNumber: cursor.getDate(),
      inMonth: cursor.getMonth() === month,
      isoDate,
      items: monthItems.filter((item) => item.date === isoDate),
    });
    cursor.setDate(cursor.getDate() + 1);
  }

  return { items: monthItems, cells };
}

function CalendarListView({
  calendar,
  onApprove,
  onDelete,
  onDuplicate,
  onOpenItem,
  onReject,
  selectedItemId,
}: {
  calendar: CalendarItem[];
  onApprove: (id: string) => void;
  onDelete: (id: string) => void;
  onDuplicate: (id: string) => void;
  onOpenItem: (id: string) => void;
  onReject: (id: string) => void;
  selectedItemId?: string;
}) {
  const [sortBy, setSortBy] = useState<"date" | "platform" | "status" | "contentTopic">("date");

  const sortedItems = [...calendar].sort((a, b) => {
    if (sortBy === "platform") return a.platform.localeCompare(b.platform);
    if (sortBy === "status") return a.status.localeCompare(b.status);
    if (sortBy === "contentTopic") return a.contentTopic.localeCompare(b.contentTopic);
    return a.date.localeCompare(b.date);
  });

  return (
    <Card>
      <CardHeader className="flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <CardTitle>Calendar List</CardTitle>
          <CardDescription>
            Every item in one flat list, quick to scan. Follows the Platform,
            Status, and Role filters above.
          </CardDescription>
        </div>
        <label className="flex items-center gap-2 text-sm">
          <span className="whitespace-nowrap text-muted-foreground">Sort by</span>
          <NativeSelect
            value={sortBy}
            onChange={(event) =>
              setSortBy(event.target.value as typeof sortBy)
            }
          >
            <option value="date">Date</option>
            <option value="platform">Platform</option>
            <option value="status">Status</option>
            <option value="contentTopic">Content topic</option>
          </NativeSelect>
        </label>
      </CardHeader>
      <CardContent>
        {sortedItems.length === 0 ? (
          <EmptyState
            action="Adjust filters or generate a calendar."
            icon={CalendarDays}
            title="No calendar items to show"
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[980px] text-left text-sm">
              <thead className="border-b text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="py-3 pr-4 font-medium">Date</th>
                  <th className="py-3 pr-4 font-medium">Platform</th>
                  <th className="py-3 pr-4 font-medium">Topic</th>
                  <th className="py-3 pr-4 font-medium">Status</th>
                  <th className="py-3 pr-4 font-medium">Approval stage</th>
                  <th className="py-3 pr-4 font-medium">Role</th>
                  <th className="py-3 pr-4 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {sortedItems.map((item) => (
                  <tr
                    className={cn(selectedItemId === item.id && "bg-primary/5")}
                    key={item.id}
                  >
                    <td className="whitespace-nowrap py-3 pr-4">{item.date}</td>
                    <td className="py-3 pr-4">
                      <PlatformBadge platform={item.platform} />
                    </td>
                    <td className="min-w-[220px] py-3 pr-4">{item.contentTopic}</td>
                    <td className="py-3 pr-4">
                      <StatusBadge status={item.status} />
                    </td>
                    <td className="py-3 pr-4 text-xs text-muted-foreground">
                      {item.approvalStage}
                    </td>
                    <td className="py-3 pr-4 text-xs text-muted-foreground">
                      {item.assignedRole}
                    </td>
                    <td className="min-w-[280px] py-3 pr-4">
                      <div className="flex flex-wrap gap-1.5">
                        <Button
                          onClick={() => onOpenItem(item.id)}
                          size="sm"
                          type="button"
                          variant="outline"
                        >
                          Open
                        </Button>
                        <Button
                          onClick={() => onApprove(item.id)}
                          size="sm"
                          type="button"
                        >
                          Approve
                        </Button>
                        <Button
                          onClick={() => onReject(item.id)}
                          size="sm"
                          type="button"
                          variant="outline"
                        >
                          Reject
                        </Button>
                        <Button
                          onClick={() => onDuplicate(item.id)}
                          size="sm"
                          type="button"
                          variant="outline"
                        >
                          Duplicate
                        </Button>
                        <Button
                          onClick={() => onDelete(item.id)}
                          size="sm"
                          type="button"
                          variant="outline"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function CalendarItemEditor({
  item,
  liveAi,
  onApprove,
  onChange,
  onClose,
  onDelete,
  onDuplicate,
  onRegenerate,
  onReject,
  regenerating,
  ucc,
}: {
  item: CalendarItem;
  liveAi: boolean;
  onApprove: (id: string) => void;
  onChange: (id: string, patch: Partial<CalendarItem>) => void;
  onClose: () => void;
  onDelete: (id: string) => void;
  onDuplicate: (id: string) => void;
  onRegenerate: (id: string) => void;
  onReject: (id: string) => void;
  regenerating: boolean;
  ucc: UccStrategyData;
}) {

  const isApproved = item.approvalStage === "calendar approved" || item.status === "approved";

  return (
    <Card className="border-none shadow-none">
      <CardHeader className="flex-col gap-4 px-0 pt-0 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <CardTitle>{item.contentTopic || "Selected Item"}</CardTitle>
          <CardDescription>Every required calendar field is editable.</CardDescription>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant={isApproved ? "success" : "secondary"}>
            {isApproved ? "Approved" : "Draft, not approved"}
          </Badge>
          <Button onClick={onClose} size="icon" type="button" variant="outline">
            <X className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6 px-0">
        <div className="rounded-lg border bg-muted/20 p-4">
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => onApprove(item.id)} size="sm" type="button">
              <CheckCircle2 className="h-4 w-4" />
              Approve
            </Button>
            <Button onClick={() => onReject(item.id)} size="sm" type="button" variant="outline">
              Reject
            </Button>
            <Button
              disabled={!liveAi || regenerating}
              onClick={() => onRegenerate(item.id)}
              size="sm"
              type="button"
              variant="outline"
            >
              <Sparkles className="h-4 w-4" />
              {regenerating ? "Regenerating" : "Regenerate"}
            </Button>
            <Button onClick={() => onDuplicate(item.id)} size="sm" type="button" variant="outline">
              Duplicate
            </Button>
            <Button onClick={() => onDelete(item.id)} size="sm" type="button" variant="outline">
              <Trash2 className="h-4 w-4" />
              Delete
            </Button>
          </div>
          {!liveAi ? (
            <p className="mt-3 text-xs leading-5 text-muted-foreground">
              Connect OpenAI in Settings to regenerate a single item with AI.
            </p>
          ) : null}
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Field label="Type">
            <NativeSelect
              value={item.itemKind ?? "post"}
              onChange={(event) =>
                onChange(item.id, {
                  itemKind: event.target.value as CalendarItemKind,
                })
              }
            >
              {calendarItemKinds.map((itemKind) => (
                <option key={itemKind} value={itemKind}>
                  {capitalize(itemKind)}
                </option>
              ))}
            </NativeSelect>
          </Field>
          <Field label="Planned date">
            <Input
              type="date"
              value={item.plannedDate ?? item.date}
              onChange={(event) =>
                onChange(item.id, {
                  date: event.target.value,
                  plannedDate: event.target.value,
                })
              }
            />
          </Field>
          <Field label="Actual post date">
            <Input
              type="date"
              value={item.actualPostDate ?? ""}
              onChange={(event) =>
                onChange(item.id, { actualPostDate: event.target.value })
              }
            />
          </Field>
          <Field label="Best time">
            <Input
              value={item.bestPostingTime}
              onChange={(event) =>
                onChange(item.id, { bestPostingTime: event.target.value })
              }
            />
          </Field>
          <Field label="Platform">
            <NativeSelect
              value={item.platform}
              onChange={(event) =>
                onChange(item.id, { platform: event.target.value as Platform })
              }
            >
              {platforms.map((platform) => (
                <option key={platform} value={platform}>
                  {platform}
                </option>
              ))}
            </NativeSelect>
          </Field>
          <Field label="Status">
            <NativeSelect
              value={item.status}
              onChange={(event) =>
                onChange(item.id, { status: event.target.value as CalendarStatus })
              }
            >
              {statuses.map((status) => (
                <option
                  disabled={
                    (status === "posted" || status === "scheduled") &&
                    !canPublishCalendarItem(item)
                  }
                  key={status}
                  value={status}
                >
                  {status}
                </option>
              ))}
            </NativeSelect>
          </Field>
          <Field label="Approval stage">
            <NativeSelect
              value={item.approvalStage ?? "idea"}
              onChange={(event) =>
                onChange(item.id, {
                  approvalStage: event.target.value as ApprovalStage,
                })
              }
            >
              {approvalStages.map((stage) => (
                <option key={stage} value={stage}>
                  {stage}
                </option>
              ))}
            </NativeSelect>
          </Field>
          <Field label="Assigned role">
            <NativeSelect
              value={item.assignedRole}
              onChange={(event) =>
                onChange(item.id, { assignedRole: event.target.value as Role })
              }
            >
              {roles.map((role) => (
                <option key={role} value={role}>
                  {role}
                </option>
              ))}
            </NativeSelect>
          </Field>
          <Field label="Format">
            <Input
              value={item.format}
              onChange={(event) => onChange(item.id, { format: event.target.value })}
            />
          </Field>
        </div>

        {!canPublishCalendarItem(item) ? (
          <div className="rounded-md border border-warning-border bg-warning p-4 text-sm leading-6 text-warning-foreground">
            Publishing is locked until the approval stage reaches Published. Use
            Compliance Approved and Scheduled before the final publish gate.
          </div>
        ) : null}

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Field label="Owner">
            <Input
              value={item.owner ?? ""}
              onChange={(event) => onChange(item.id, { owner: event.target.value })}
            />
          </Field>
          <Field label="Reviewer">
            <Input
              value={item.reviewer ?? ""}
              onChange={(event) =>
                onChange(item.id, { reviewer: event.target.value })
              }
            />
          </Field>
          <Field label="Due date">
            <Input
              type="date"
              value={item.dueDate ?? item.plannedDate ?? item.date}
              onChange={(event) =>
                onChange(item.id, { dueDate: event.target.value })
              }
            />
          </Field>
          <Field label="Blocker">
            <Input
              value={item.blocker ?? ""}
              onChange={(event) =>
                onChange(item.id, { blocker: event.target.value })
              }
            />
          </Field>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Campaign">
            <NativeSelect
              value={item.campaignId ?? ""}
              onChange={(event) =>
                onChange(item.id, { campaignId: event.target.value })
              }
            >
              <option value="">Unassigned</option>
              {ucc.campaigns.map((campaign) => (
                <option key={campaign.id} value={campaign.id}>
                  {campaign.name}
                </option>
              ))}
            </NativeSelect>
          </Field>
          <Field label="Course">
            <NativeSelect
              value={item.courseId ?? ""}
              onChange={(event) =>
                onChange(item.id, { courseId: event.target.value })
              }
            >
              <option value="">Unassigned</option>
              {ucc.courses.map((course) => (
                <option key={course.id} value={course.id}>
                  {course.name}
                </option>
              ))}
            </NativeSelect>
          </Field>
          <Field label="Audience">
            <NativeSelect
              value={item.audienceId ?? ""}
              onChange={(event) =>
                onChange(item.id, { audienceId: event.target.value })
              }
            >
              <option value="">Unassigned</option>
              {ucc.audiences.map((audience) => (
                <option key={audience.id} value={audience.id}>
                  {audience.name}
                </option>
              ))}
            </NativeSelect>
          </Field>
        </div>

        <Field label="Content pillar">
          <Input
            value={item.contentPillar}
            onChange={(event) =>
              onChange(item.id, { contentPillar: event.target.value })
            }
          />
        </Field>
        <Field label="Content topic">
          <Input
            value={item.contentTopic}
            onChange={(event) =>
              onChange(item.id, { contentTopic: event.target.value })
            }
          />
        </Field>
        <Field label="Hook">
          <Textarea
            value={item.hook}
            onChange={(event) => onChange(item.id, { hook: event.target.value })}
          />
        </Field>
        <Field label="Caption or copy">
          <Textarea
            className="min-h-36"
            value={item.caption}
            onChange={(event) => onChange(item.id, { caption: event.target.value })}
          />
        </Field>
        <Field label="Final caption">
          <Textarea
            className="min-h-28"
            value={item.finalCaption ?? ""}
            onChange={(event) =>
              onChange(item.id, { finalCaption: event.target.value })
            }
          />
        </Field>
        <Field label="Visual direction">
          <Textarea
            value={item.visualDirection}
            onChange={(event) =>
              onChange(item.id, { visualDirection: event.target.value })
            }
          />
        </Field>
        <Field label="CTA">
          <Input
            value={item.cta}
            onChange={(event) => onChange(item.id, { cta: event.target.value })}
          />
        </Field>
        <Field label="Hashtags">
          <Textarea
            value={item.hashtags.join("\n")}
            onChange={(event) =>
              onChange(item.id, { hashtags: textToList(event.target.value) })
            }
          />
        </Field>
        <Field label="Production notes">
          <Textarea
            value={item.productionNotes}
            onChange={(event) =>
              onChange(item.id, { productionNotes: event.target.value })
            }
          />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Final asset link">
            <Input
              value={item.finalAssetLink ?? ""}
              onChange={(event) =>
                onChange(item.id, { finalAssetLink: event.target.value })
              }
            />
          </Field>
          <Field label="Published URL">
            <Input
              value={item.publishedUrl ?? ""}
              onChange={(event) =>
                onChange(item.id, { publishedUrl: event.target.value })
              }
            />
          </Field>
        </div>
        <Field label="Business goal connection">
          <Textarea
            value={item.businessGoalConnection}
            onChange={(event) =>
              onChange(item.id, { businessGoalConnection: event.target.value })
            }
          />
        </Field>
        <Field label="Compliance note">
          <Textarea
            value={item.complianceNote}
            onChange={(event) =>
              onChange(item.id, { complianceNote: event.target.value })
            }
          />
        </Field>
        <Field label="KPI result">
          <Textarea
            value={item.kpiResult ?? ""}
            onChange={(event) => onChange(item.id, { kpiResult: event.target.value })}
          />
        </Field>
        <Field label="Follow-up action">
          <Textarea
            value={item.followUpAction ?? ""}
            onChange={(event) =>
              onChange(item.id, { followUpAction: event.target.value })
            }
          />
        </Field>
        <Field label="Video script">
          <Textarea
            value={item.videoScript}
            onChange={(event) =>
              onChange(item.id, { videoScript: event.target.value })
            }
          />
        </Field>
        <Field label="Shot notes">
          <Textarea
            value={item.shotNotes}
            onChange={(event) => onChange(item.id, { shotNotes: event.target.value })}
          />
        </Field>
      </CardContent>
    </Card>
  );
}

function ContentProductionView({
  aiIntegration,
  brand,
  brief,
  calendar,
  externalRole,
  platformPlaybook,
  socialGoals,
  ucc,
  onCalendarChange,
  onRecordUsage,
  onUccChange,
}: {
  aiIntegration: AiIntegrationSettings;
  brand: BrandProfile;
  brief: StrategyBrief;
  calendar: CalendarItem[];
  // The sidebar Role view selection. The queue follows it, while the local
  // role buttons still allow a quick peek at another role's work.
  externalRole?: Role;
  platformPlaybook: PlatformPlaybook;
  socialGoals: SocialGoalSettings;
  ucc: UccStrategyData;
  onCalendarChange: (calendar: CalendarItem[]) => void;
  onRecordUsage: (module: string, model: string, usage: OpenAiUsage) => void;
  onUccChange: (ucc: UccStrategyData) => void;
}) {
  const [roleView, setRoleView] = useState<Role>(externalRole ?? "copywriter");

  useEffect(() => {
    if (externalRole) {
      setRoleView(externalRole);
    }
  }, [externalRole]);
  const [selectedItemId, setSelectedItemId] = useState(calendar[0]?.id ?? "");
  const [aiBusy, setAiBusy] = useState<"" | "copy" | "video-script" | "guidance" | "remix">("");
  const [guidance, setGuidance] = useState("");
  const [genMessage, setGenMessage] = useState<{ tone: "success" | "error" | "info"; text: string } | null>(null);

  const liveAi = isLiveAiEnabled(aiIntegration);

  async function aiGenerate(
    id: string,
    task: "copy" | "video-script",
    guidanceText: string,
    busyKey: "copy" | "video-script" | "guidance",
  ) {
    const item = calendar.find((row) => row.id === id);

    if (!item) {
      return;
    }

    setAiBusy(busyKey);
    setGenMessage(null);

    try {
      const campaign = ucc.campaigns.find((row) => row.id === item.campaignId) ?? null;
      const audience = ucc.audiences.find((row) => row.id === item.audienceId) ?? null;
      const rule = getApprovedPlaybookFields(platformPlaybook, item.platform);
      const response = await fetch(apiUrl("/api/ai/copy"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          apiKey: aiIntegration.apiKey,
          model: resolveModelForTask(aiIntegration, "analysis"),
          context: {
            item: {
              platform: item.platform,
              contentPillar: item.contentPillar,
              contentTopic: item.contentTopic,
              format: item.format,
              currentHook: item.hook,
              currentCaption: item.caption,
              currentVideoScript: item.videoScript,
              businessGoalConnection: item.businessGoalConnection,
            },
            campaign: campaign
              ? { name: campaign.name, objective: campaign.objective }
              : null,
            audience: audience
              ? {
                  name: audience.name,
                  languages: audience.languages,
                  painPoints: audience.concerns,
                  nurtureAngle: audience.nurtureAngle,
                }
              : null,
            brand: { name: brand.brandName, toneOfVoice: brand.toneOfVoice },
            platformRulebook: {
              role: rule.role,
              persona: rule.persona,
              content: rule.content,
              cta: rule.cta,
              defaultFormat: rule.defaultFormat,
              guardrail: rule.guardrail,
            },
            briefToneGuidance: brief.toneGuidance,
            task,
            guidance: guidanceText,
          } satisfies CopyAiContext,
        }),
      });
      const result = (await response.json()) as
        | { ok: true; draft: CopyAiDraft; usage?: OpenAiUsage; model?: string }
        | { ok: false; error: string };

      if (!result.ok) {
        setGenMessage({ tone: "error", text: result.error });
        return;
      }

      const patch = copyDraftToPatch(result.draft);
      updateItem(id, patch);
      onUccChange(
        appendAiOutputHistory(
          ucc,
          "ai-copywriting",
          buildAiOutputRecord({
            action:
              task === "video-script"
                ? "Generated video script with AI"
                : guidanceText
                  ? `Regenerated with guidance: ${guidanceText}`
                  : "Generated production copy with AI",
            item,
            output: patch,
          }),
        ),
      );
      setSelectedItemId(id);
      setGenMessage({
        tone: "success",
        text: "AI draft written to this item. It stays a draft until approved through the stage flow.",
      });

      if (result.usage) {
        onRecordUsage("Production copy", result.model ?? "unknown", result.usage);
      }
    } catch (error) {
      setGenMessage({
        tone: "error",
        text: error instanceof Error ? error.message : String(error),
      });
    } finally {
      setAiBusy("");
    }
  }

  // Content Remix (Module D2): adapt one manager-approved item for the other
  // platforms in its campaign's mix. Variants restart the approval path and
  // are compliance-checked the moment they arrive.
  async function remixItem(id: string) {
    const item = calendar.find((row) => row.id === id);

    if (!item || !canPublishCalendarItem(item)) {
      return;
    }

    const campaign = ucc.campaigns.find((row) => row.id === item.campaignId) ?? null;

    if (!campaign) {
      setGenMessage({
        tone: "error",
        text: "This item is not linked to a campaign, so there is no platform mix to remix into. Link it to a campaign first.",
      });
      return;
    }

    const targetPlatforms = campaign.platformMix.filter(
      (channel): channel is Platform =>
        (platforms as readonly string[]).includes(channel) && channel !== item.platform,
    );

    if (targetPlatforms.length === 0) {
      setGenMessage({
        tone: "error",
        text: `The campaign "${campaign.name}" has no other calendar platforms in its mix, so there is nothing to remix into.`,
      });
      return;
    }

    const audience = ucc.audiences.find((row) => row.id === item.audienceId) ?? null;

    setAiBusy("remix");
    setGenMessage(null);

    try {
      const response = await fetch(apiUrl("/api/ai/remix"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          apiKey: aiIntegration.apiKey,
          model: resolveModelForTask(aiIntegration, "analysis"),
          context: {
            source: {
              platform: item.platform,
              contentPillar: item.contentPillar,
              contentTopic: item.contentTopic,
              format: item.format,
              hook: item.hook,
              caption: item.caption,
              cta: item.cta,
              hashtags: item.hashtags,
              videoScript: item.videoScript,
              businessGoalConnection: item.businessGoalConnection,
            },
            targetPlatforms: targetPlatforms.map((platform) => {
              const rule = getApprovedPlaybookFields(platformPlaybook, platform);

              return {
                platform,
                rulebook: {
                  role: rule.role,
                  persona: rule.persona,
                  content: rule.content,
                  cta: rule.cta,
                  defaultFormat: rule.defaultFormat,
                  guardrail: rule.guardrail,
                },
              };
            }),
            audience: audience
              ? { name: audience.name, languages: audience.languages }
              : null,
            includeChinese: audience
              ? audienceIncludesChinese(audience.languages)
              : false,
            brand: { name: brand.brandName, toneOfVoice: brand.toneOfVoice },
          } satisfies RemixAiContext,
        }),
      });
      const result = (await response.json()) as
        | { ok: true; draft: RemixAiDraft; usage?: OpenAiUsage; model?: string }
        | { ok: false; error: string };

      if (!result.ok) {
        setGenMessage({ tone: "error", text: result.error });
        return;
      }

      const newItems = remixDraftToItems(result.draft, item, targetPlatforms).map(
        (variant) => {
          const flags = checkComplianceText(
            `${variant.hook}\n${variant.caption}\n${variant.cta}`,
          );

          return flags.length > 0
            ? {
                ...variant,
                blocker: `Compliance flags to resolve before approval: ${flags.join(" / ")}`,
              }
            : variant;
        },
      );

      if (newItems.length === 0) {
        setGenMessage({
          tone: "error",
          text: "The AI returned no usable variants for the target platforms. Try again.",
        });
        return;
      }

      onCalendarChange([...calendar, ...newItems]);

      const flagged = newItems.filter((row) => row.blocker).length;

      setGenMessage({
        tone: flagged > 0 ? "info" : "success",
        text:
          `${newItems.length} platform variant${newItems.length === 1 ? "" : "s"} created as drafts (${targetPlatforms.join(", ")}). ` +
          "Each starts at the beginning of the approval path. " +
          (flagged > 0
            ? `${flagged} came back with compliance flags written into the blocker field; fix the wording before approval.`
            : "The automatic compliance check found no flagged wording."),
      });

      if (result.usage) {
        onRecordUsage("Content Remix", result.model ?? "unknown", result.usage);
      }
    } catch (error) {
      setGenMessage({
        tone: "error",
        text: error instanceof Error ? error.message : String(error),
      });
    } finally {
      setAiBusy("");
    }
  }

  // Marketing Manager sees every item; every other role sees only the work
  // actually assigned to it, so a Graphic Designer (for example) only sees
  // their own queue rather than every item that happens to have some visual
  // direction text filled in.
  const roleItems = useMemo(() => {
    if (roleView === "marketing manager") {
      return calendar;
    }

    return calendar.filter((item) => item.assignedRole === roleView);
  }, [calendar, roleView]);

  const selectedItem =
    calendar.find((item) => item.id === selectedItemId) ?? calendar[0];

  function updateItem(id: string, patch: Partial<CalendarItem>) {
    onCalendarChange(
      calendar.map((item) =>
        item.id === id ? { ...item, ...sanitizeCalendarPatch(item, patch) } : item,
      ),
    );
  }

  // Regenerates copy for a calendar item, optionally overriding its platform
  // first (used to draft the same idea for a different platform).
  function generateCopy(id: string, platform?: Platform) {
    const itemIndex = calendar.findIndex((item) => item.id === id);
    const item = calendar[itemIndex];

    if (!item) {
      return;
    }

    const targetItem = platform
      ? {
          ...item,
          platform,
          bestPostingTime: getApprovedPlaybookFields(platformPlaybook, platform).bestPostingTime,
          format: getApprovedPlaybookFields(platformPlaybook, platform).defaultFormat,
        }
      : item;

    const copyOutput = generateCopywritingForItem(
      targetItem,
      brief,
      brand,
      itemIndex,
      socialGoals,
      platformPlaybook,
    );
    const generatedOutput = platform ? { ...targetItem, ...copyOutput } : copyOutput;

    updateItem(id, generatedOutput);
    onUccChange(
      appendAiOutputHistory(
        ucc,
        "ai-copywriting",
        buildAiOutputRecord({
          action: platform
            ? `Generated ${platform} platform copy`
            : "Generated selected platform copy",
          item: targetItem,
          output: generatedOutput,
        }),
      ),
    );
    setSelectedItemId(id);
  }

  function generateAllCopy() {
    const nextCalendar = calendar.map((item, index) => ({
        ...item,
        ...generateCopywritingForItem(
          item,
          brief,
          brand,
          index,
          socialGoals,
          platformPlaybook,
        ),
      }));
    const historyRecords = nextCalendar.slice(0, 6).map((item) =>
      buildAiOutputRecord({
        action: "Generated batch production copy",
        item,
        output: item,
      }),
    );

    onCalendarChange(nextCalendar);
    onUccChange(
      historyRecords.reduce(
        (nextUcc, record) => appendAiOutputHistory(nextUcc, "ai-copywriting", record),
        ucc,
      ),
    );
  }

  return (
    <section className="space-y-4">
      <Card>
        <CardHeader className="flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <SectionTitle
            icon={ListChecks}
            kicker="Create"
            title="Content Production View"
            description="Daily Content Master table, platform playbooks, copy generation, role handoffs, and approval tracking."
          />
          <Button
            disabled={!brief.approved || calendar.length === 0}
            onClick={() => {
              generateAllCopy();
              setGenMessage({
                tone: "info",
                text: `${OFFLINE_DRAFT_LABEL}. Template copy was written to every item. Use the AI buttons below for live copy on the selected item.`,
              });
            }}
            size="sm"
            variant="outline"
          >
            <Wand2 className="h-4 w-4" />
            Generate all copy (offline templates)
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          {!brief.approved ? (
            <div className="rounded-lg border border-warning-border bg-warning p-4 text-sm text-warning-foreground">
              Approve the strategy brief before generating production copy.
            </div>
          ) : null}
          <div className="flex flex-wrap items-center gap-2">
            {roles.map((role) => (
              <Button
                key={role}
                onClick={() => setRoleView(role)}
                size="sm"
                variant={roleView === role ? "default" : "outline"}
              >
                {roleLabel(role)}
              </Button>
            ))}
          </div>
          <GoalImpactStrip
            calendar={calendar}
            socialGoals={socialGoals}
            variant="production"
          />
        </CardContent>
      </Card>

      <ProductionCalendarSyncPanel
        calendar={calendar}
        onPatchItem={updateItem}
        onSelectItem={setSelectedItemId}
        selectedItemId={selectedItem?.id}
      />

      <PlatformPlaybookGuide platformPlaybook={platformPlaybook} />

      <DailyContentMasterTable
        brand={brand}
        brief={brief}
        calendar={roleItems}
        platformPlaybook={platformPlaybook}
        socialGoals={socialGoals}
        onGeneratePlatformCopy={generateCopy}
        onSelectItem={setSelectedItemId}
        onStatusChange={(id, status) => updateItem(id, { status })}
        selectedItemId={selectedItem?.id}
      />

      {selectedItem ? (
        <Card>
          <CardHeader>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <CardTitle>Generated Copy Workspace</CardTitle>
                <CardDescription>
                  Selected row: {selectedItem.date} / {selectedItem.platform} /{" "}
                  {selectedItem.contentTopic}
                </CardDescription>
              </div>
              <div className="flex flex-col items-stretch gap-2 sm:items-end">
                <div className="flex flex-wrap gap-2 sm:justify-end">
                  <Button
                    disabled={!brief.approved || !liveAi || aiBusy !== ""}
                    onClick={() => void aiGenerate(selectedItem.id, "copy", "", "copy")}
                    size="sm"
                    type="button"
                  >
                    <Sparkles className="h-4 w-4" />
                    {aiBusy === "copy" ? "Generating" : "Generate copy with AI"}
                  </Button>
                  <Button
                    disabled={!brief.approved || !liveAi || aiBusy !== ""}
                    onClick={() =>
                      void aiGenerate(selectedItem.id, "video-script", "", "video-script")
                    }
                    size="sm"
                    type="button"
                    variant="outline"
                  >
                    <Sparkles className="h-4 w-4" />
                    {aiBusy === "video-script" ? "Generating" : "Generate video script with AI"}
                  </Button>
                  <Button
                    disabled={!brief.approved}
                    onClick={() => {
                      generateCopy(selectedItem.id);
                      setGenMessage({
                        tone: "info",
                        text: liveAi
                          ? "Offline template copy written to this item. Use the AI buttons above for a live draft."
                          : `${OFFLINE_DRAFT_LABEL}. Template copy written to this item.`,
                      });
                    }}
                    size="sm"
                    type="button"
                    variant="outline"
                  >
                    <Wand2 className="h-4 w-4" />
                    Offline template copy
                  </Button>
                  <Button
                    disabled={
                      !liveAi || aiBusy !== "" || !canPublishCalendarItem(selectedItem)
                    }
                    onClick={() => void remixItem(selectedItem.id)}
                    size="sm"
                    type="button"
                    variant="outline"
                  >
                    <RefreshCcw className="h-4 w-4" />
                    {aiBusy === "remix" ? "Remixing" : "Remix for other platforms"}
                  </Button>
                </div>
                {!brief.approved ? (
                  <p className="text-xs leading-5 text-muted-foreground">
                    Approve the strategy brief first to enable copy and video
                    generation for this item.
                  </p>
                ) : null}
                {brief.approved && !liveAi ? (
                  <p className="text-xs leading-5 text-muted-foreground">
                    Connect OpenAI in Settings to generate with AI. Offline
                    template copy still works.
                  </p>
                ) : null}
                {liveAi && !canPublishCalendarItem(selectedItem) ? (
                  <p className="text-xs leading-5 text-muted-foreground">
                    Remix unlocks once this item is manager approved.
                  </p>
                ) : null}
              </div>
            </div>
          </CardHeader>
          <CardContent className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
            <div className="space-y-3 xl:col-span-2">
              {genMessage ? (
                <div
                  className={cn(
                    "rounded-md border p-3 text-xs leading-5",
                    genMessage.tone === "error"
                      ? "border-warning-border bg-warning text-warning-foreground"
                      : genMessage.tone === "success"
                        ? "border-success-border bg-success text-success-foreground"
                        : "bg-muted/30 text-muted-foreground",
                  )}
                >
                  {genMessage.text}
                </div>
              ) : null}
              <div className="flex flex-wrap items-end gap-2 rounded-lg border bg-muted/20 p-3">
                <div className="min-w-[240px] flex-1">
                  <Field label="Regenerate with guidance">
                    <Input
                      onChange={(event) => setGuidance(event.target.value)}
                      placeholder="e.g. more parent-reassuring, shorter, stronger proof"
                      value={guidance}
                    />
                  </Field>
                </div>
                <Button
                  disabled={!brief.approved || !liveAi || aiBusy !== "" || !guidance.trim()}
                  onClick={() =>
                    void aiGenerate(selectedItem.id, "copy", guidance.trim(), "guidance")
                  }
                  size="sm"
                  type="button"
                  variant="outline"
                >
                  <Sparkles className="h-4 w-4" />
                  {aiBusy === "guidance" ? "Revising" : "Regenerate with guidance"}
                </Button>
              </div>
            </div>
            <div className="space-y-3">
              <ProductionBlock
                eyebrow="Generated hook"
                primary={selectedItem.hook}
                secondary={selectedItem.caption}
              />
              {selectedItem.videoScript ? (
                <ProductionBlock
                  eyebrow="Video script"
                  primary={selectedItem.format}
                  secondary={`${selectedItem.videoScript}\n\nShot notes: ${selectedItem.shotNotes}`}
                />
              ) : null}
            </div>
            <div className="space-y-3">
              <ProductionBlock
                eyebrow="Playbook guide"
                primary={`${selectedItem.platform}: ${getApprovedPlaybookFields(platformPlaybook, selectedItem.platform).persona}`}
                secondary={`${getApprovedPlaybookFields(platformPlaybook, selectedItem.platform).role}\n${getApprovedPlaybookFields(platformPlaybook, selectedItem.platform).guardrail}\nMetric focus: ${getApprovedPlaybookFields(platformPlaybook, selectedItem.platform).metrics}`}
              />
              <ProductionBlock
                eyebrow="Visual and compliance"
                primary={selectedItem.visualDirection}
                secondary={`${selectedItem.productionNotes}\n\n${selectedItem.complianceNote}`}
              />
            </div>
          </CardContent>
        </Card>
      ) : null}

      {roleItems.length === 0 ? (
        <EmptyState
          action="Generate or assign calendar items"
          icon={ListChecks}
          title="No production tasks for this role"
        />
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {roleItems.map((item) => (
            <Card key={item.id}>
              <CardHeader>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <CardTitle>{item.contentTopic}</CardTitle>
                    <CardDescription>
                      {item.date} / {item.bestPostingTime}
                    </CardDescription>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    <PlatformBadge platform={item.platform} />
                    <ItemKindBadge itemKind={item.itemKind ?? "post"} />
                    <StatusBadge status={item.status} />
                    <ComplianceBadge
                      item={item}
                      courseNotes={
                        findCourse(ucc, item.courseId ?? "")?.complianceNotes ?? ""
                      }
                    />
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {roleView === "copywriter" ? (
                  <ProductionBlock
                    eyebrow="Caption or script"
                    primary={item.hook}
                    secondary={item.videoScript || item.caption}
                  />
                ) : null}

                {roleView === "graphic designer" ? (
                  <ProductionBlock
                    eyebrow="Visual brief"
                    primary={item.format}
                    secondary={`${item.visualDirection}\n\nHashtags: ${item.hashtags.join(" ")}`}
                  />
                ) : null}

                {roleView === "video editor" ? (
                  <ProductionBlock
                    eyebrow="Video handoff"
                    primary={item.hook}
                    secondary={`${item.videoScript}\n\nShot notes: ${item.shotNotes}`}
                  />
                ) : null}

                {roleView === "marketing manager" ? (
                  <div className="space-y-3">
                    <ProductionBlock
                      eyebrow="Approval focus"
                      primary={item.businessGoalConnection}
                      secondary={item.complianceNote}
                    />
                    <Field label="Status">
                      <NativeSelect
                        value={item.status}
                        onChange={(event) =>
                          updateItem(item.id, {
                            status: event.target.value as CalendarStatus,
                          })
                        }
                      >
                        {statuses.map((status) => (
                          <option
                            disabled={status === "posted" && !canPublishCalendarItem(item)}
                            key={status}
                            value={status}
                          >
                            {status}
                          </option>
                        ))}
                      </NativeSelect>
                    </Field>
                    {!canPublishCalendarItem(item) ? (
                      <p className="rounded-md border border-warning-border bg-warning p-3 text-xs leading-5 text-warning-foreground">
                        Publish is blocked until compliance approval reaches
                        Published.
                      </p>
                    ) : null}
                  </div>
                ) : null}

                <div className="rounded-lg border bg-muted/20 p-3">
                  <p className="text-xs font-medium uppercase text-muted-foreground">
                    Production notes
                  </p>
                  <p className="mt-2 text-sm leading-6">{item.productionNotes}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </section>
  );
}

function ProductionCalendarSyncPanel({
  calendar,
  onPatchItem,
  onSelectItem,
  selectedItemId,
}: {
  calendar: CalendarItem[];
  onPatchItem: (id: string, patch: Partial<CalendarItem>) => void;
  onSelectItem: (id: string) => void;
  selectedItemId?: string;
}) {
  const sortedCalendar = sortCalendarItems(calendar);
  const managerItems = calendar.filter(
    (item) => item.assignedRole === "marketing manager",
  ).length;
  const eventItems = calendar.filter((item) => item.itemKind === "event").length;
  const reviewItems = calendar.filter((item) =>
    ["review", "approved", "scheduled", "posted"].includes(item.status),
  ).length;

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <CardTitle>Calendar Sync</CardTitle>
            <CardDescription>
              Production is connected to the same calendar. Status and owner changes
              here update the Calendar Builder immediately.
            </CardDescription>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge variant="secondary">{calendar.length} total</Badge>
            <Badge variant="outline">{eventItems} events</Badge>
            <Badge variant="success">{reviewItems} in approval flow</Badge>
            <Badge variant="info">{managerItems} manager owned</Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {calendar.length === 0 ? (
          <EmptyState
            action="Add or generate calendar items to start production planning."
            icon={CalendarDays}
            title="No synced calendar items"
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[980px] text-left text-sm">
              <thead className="border-b text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="py-3 pr-4 font-medium">Date</th>
                  <th className="py-3 pr-4 font-medium">Type</th>
                  <th className="py-3 pr-4 font-medium">Platform</th>
                  <th className="py-3 pr-4 font-medium">Calendar item</th>
                  <th className="py-3 pr-4 font-medium">Owner</th>
                  <th className="py-3 pr-4 font-medium">Status</th>
                  <th className="py-3 pr-4 font-medium">Open</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {sortedCalendar.map((item) => (
                  <tr
                    className={cn(
                      "align-top transition-colors hover:bg-muted/40",
                      selectedItemId === item.id && "bg-primary/5",
                    )}
                    key={item.id}
                  >
                    <td className="whitespace-nowrap py-3 pr-4">
                      <span className="font-medium">{item.date}</span>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {item.bestPostingTime}
                      </p>
                    </td>
                    <td className="py-3 pr-4">
                      <ItemKindBadge itemKind={item.itemKind ?? "post"} />
                    </td>
                    <td className="py-3 pr-4">
                      <PlatformBadge platform={item.platform} />
                    </td>
                    <td className="min-w-[280px] py-3 pr-4">
                      <p className="font-medium leading-5">{item.contentTopic}</p>
                      <p className="mt-1 text-xs leading-5 text-muted-foreground">
                        {item.contentPillar} / {item.format}
                      </p>
                    </td>
                    <td className="min-w-[190px] py-3 pr-4">
                      <NativeSelect
                        value={item.assignedRole}
                        onChange={(event) =>
                          onPatchItem(item.id, {
                            assignedRole: event.target.value as Role,
                          })
                        }
                      >
                        {roles.map((role) => (
                          <option key={role} value={role}>
                            {roleLabel(role)}
                          </option>
                        ))}
                      </NativeSelect>
                    </td>
                    <td className="min-w-[170px] py-3 pr-4">
                      <NativeSelect
                        value={item.status}
                        onChange={(event) =>
                          onPatchItem(item.id, {
                            status: event.target.value as CalendarStatus,
                          })
                        }
                      >
                        {statuses.map((status) => (
                          <option key={status} value={status}>
                            {status}
                          </option>
                        ))}
                      </NativeSelect>
                    </td>
                    <td className="py-3 pr-4">
                      <Button
                        onClick={() => onSelectItem(item.id)}
                        size="sm"
                        type="button"
                        variant={selectedItemId === item.id ? "default" : "outline"}
                      >
                        Open
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function DailyContentMasterTable({
  brand,
  brief,
  calendar,
  platformPlaybook,
  socialGoals,
  onGeneratePlatformCopy,
  onSelectItem,
  onStatusChange,
  selectedItemId,
}: {
  brand: BrandProfile;
  brief: StrategyBrief;
  calendar: CalendarItem[];
  platformPlaybook: PlatformPlaybook;
  socialGoals: SocialGoalSettings;
  onGeneratePlatformCopy: (id: string, platform: Platform) => void;
  onSelectItem: (id: string) => void;
  onStatusChange: (id: string, status: CalendarStatus) => void;
  selectedItemId?: string;
}) {
  const [expandedItemId, setExpandedItemId] = useState(calendar[0]?.id ?? "");
  const [platformSelections, setPlatformSelections] = useState<
    Record<string, Platform>
  >({});

  useEffect(() => {
    if (selectedItemId) {
      setExpandedItemId(selectedItemId);
    }
  }, [selectedItemId]);

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <CardTitle>Daily Content Master</CardTitle>
            <CardDescription>
              Compact daily tracker. Open a row to choose a platform, review the
              playbook, and generate copy from the approved strategy brief.
            </CardDescription>
          </div>
          <Badge variant="info">{calendar.length} daily rows</Badge>
        </div>
      </CardHeader>
      <CardContent>
        {calendar.length === 0 ? (
          <EmptyState
            action="Generate the calendar before building the production tracker."
            icon={Table2}
            title="No master rows yet"
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[980px] text-left text-sm">
              <thead className="border-b text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="py-3 pr-4 font-medium">Date</th>
                  <th className="py-3 pr-4 font-medium">Day</th>
                  <th className="py-3 pr-4 font-medium">Goal</th>
                  <th className="py-3 pr-4 font-medium">Campaign</th>
                  <th className="py-3 pr-4 font-medium">Topic</th>
                  <th className="py-3 pr-4 font-medium">Status</th>
                  <th className="py-3 pr-4 font-medium">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {calendar.map((item, index) => {
                  const meta = getDailyContentMasterMeta(item, index, platformPlaybook);
                  const selected = selectedItemId === item.id;
                  const expanded = expandedItemId === item.id;
                  const selectedPlatform =
                    platformSelections[item.id] ?? item.platform;
                  const playbook = getApprovedPlaybookFields(platformPlaybook, selectedPlatform);

                  return (
                    <Fragment key={item.id}>
                      <tr
                        className={cn(
                          "cursor-pointer align-top transition-colors hover:bg-muted/40",
                          selected && "bg-primary/5",
                        )}
                        onClick={() => {
                          onSelectItem(item.id);
                          setExpandedItemId(expanded ? "" : item.id);
                        }}
                      >
                        <td className="whitespace-nowrap py-3 pr-4">{item.date}</td>
                        <td className="py-3 pr-4">
                          <Badge variant="secondary">{meta.day}</Badge>
                        </td>
                        <td className="min-w-[160px] py-3 pr-4">
                          <span className="font-medium">{meta.goal}</span>
                          <p className="mt-1 text-xs leading-5 text-muted-foreground">
                            {meta.theme}
                          </p>
                        </td>
                        <td className="min-w-[190px] py-3 pr-4">
                          {meta.campaign}
                        </td>
                        <td className="min-w-[300px] py-3 pr-4">
                          <div className="flex flex-wrap items-center gap-2">
                            <ItemKindBadge itemKind={item.itemKind ?? "post"} />
                            <p className="font-medium">{item.contentTopic}</p>
                          </div>
                          <p className="mt-1 text-xs leading-5 text-muted-foreground">
                            {item.contentPillar}
                          </p>
                        </td>
                        <td className="min-w-[150px] py-3 pr-4">
                          <NativeSelect
                            value={item.status}
                            onChange={(event) => {
                              event.stopPropagation();
                              onStatusChange(
                                item.id,
                                event.target.value as CalendarStatus,
                              );
                            }}
                            onClick={(event) => event.stopPropagation()}
                          >
                            {statuses.map((status) => (
                              <option key={status} value={status}>
                                {status}
                              </option>
                            ))}
                          </NativeSelect>
                        </td>
                        <td className="py-3 pr-4">
                          <Button size="sm" type="button" variant="outline">
                            {expanded ? "Close" : "Open"}
                          </Button>
                        </td>
                      </tr>
                      {expanded ? (
                        <tr key={`${item.id}-details`}>
                          <td className="bg-muted/20 p-4" colSpan={7}>
                            <div className="grid gap-4 xl:grid-cols-[320px_minmax(0,1fr)]">
                              <div className="space-y-3 rounded-lg border bg-card p-4">
                                <Field label="Choose platform">
                                  <NativeSelect
                                    value={selectedPlatform}
                                    onChange={(event) =>
                                      setPlatformSelections((current) => ({
                                        ...current,
                                        [item.id]: event.target.value as Platform,
                                      }))
                                    }
                                  >
                                    {platforms.map((platform) => (
                                      <option key={platform} value={platform}>
                                        {platform}
                                      </option>
                                    ))}
                                  </NativeSelect>
                                </Field>
                                <div className="rounded-lg border bg-muted/20 p-3">
                                  <div className="flex flex-wrap gap-2">
                                    <PlatformBadge platform={selectedPlatform} />
                                    <Badge variant="outline">{playbook.persona}</Badge>
                                  </div>
                                  <p className="mt-3 text-sm font-medium">
                                    {playbook.role}
                                  </p>
                                  <p className="mt-2 text-xs leading-5 text-muted-foreground">
                                    {playbook.content}
                                  </p>
                                  <p className="mt-2 text-xs leading-5">
                                    <span className="font-medium">Metric:</span>{" "}
                                    {playbook.metrics}
                                  </p>
                                </div>
                                <Button
                                  className="w-full"
                                  disabled={!brief.approved}
                                  onClick={() =>
                                    onGeneratePlatformCopy(item.id, selectedPlatform)
                                  }
                                  type="button"
                                >
                                  <Wand2 className="h-4 w-4" />
                                  Generate copy
                                </Button>
                              </div>

                              <div className="grid gap-3 lg:grid-cols-2">
                                <ProductionBlock
                                  eyebrow="Master brief"
                                  primary={`${brand.brandName} / ${meta.campaign}`}
                                  secondary={`Goal: ${meta.goal}\nTheme: ${meta.theme}\nStrategy: ${brief.monthlyCampaignGoal}\nConversion: ${socialGoals.conversionAction}`}
                                />
                                <ProductionBlock
                                  eyebrow="Content details"
                                  primary={item.contentTopic}
                                  secondary={`Type: ${capitalize(item.itemKind ?? "post")}\nPillar: ${item.contentPillar}\nFormat: ${item.format}\nOwner: ${roleLabel(item.assignedRole)}\nMetric: ${meta.metric}\nRepurpose: ${meta.repurpose}`}
                                />
                                <ProductionBlock
                                  eyebrow="Generated hook and CTA"
                                  primary={item.hook}
                                  secondary={`CTA: ${item.cta}`}
                                />
                                <ProductionBlock
                                  eyebrow="Caption or script"
                                  primary={selectedPlatform}
                                  secondary={
                                    item.videoScript && selectedPlatform === item.platform
                                      ? `${item.caption}\n\n${item.videoScript}`
                                      : item.caption
                                  }
                                />
                              </div>
                            </div>
                          </td>
                        </tr>
                      ) : null}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function PlatformPlaybookGuide({ platformPlaybook }: { platformPlaybook: PlatformPlaybook }) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-secondary text-secondary-foreground">
            <BookOpenText className="h-5 w-5" />
          </div>
          <div>
            <CardTitle>Platform Playbooks</CardTitle>
            <CardDescription className="mt-2 leading-6">
              Copywriting guardrails used by the generator so each platform has a
              native role, voice, content style, CTA, and success metric.
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {platforms.map((platform) => {
            const playbook = getApprovedPlaybookFields(platformPlaybook, platform);

            return (
              <div className="rounded-lg border bg-muted/20 p-3" key={platform}>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <PlatformBadge platform={platform} />
                  <Badge variant="outline">{playbook.persona}</Badge>
                </div>
                <p className="mt-3 text-sm font-medium leading-5">{playbook.role}</p>
                <p className="mt-2 text-xs leading-5 text-muted-foreground">
                  {playbook.content}
                </p>
                <div className="mt-3 space-y-2 text-xs leading-5">
                  <p>
                    <span className="font-medium">CTA:</span> {playbook.cta}
                  </p>
                  <p>
                    <span className="font-medium">Metric:</span> {playbook.metrics}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

function PerformanceLearningView({ data }: { data: MarketingWorkspaceData }) {
  const analytics = analyzePerformance(data);

  return (
    <section className="space-y-4">
      <Card>
        <CardHeader>
          <SectionTitle
            icon={TrendingUp}
            kicker="Review"
            title="Performance Learning Layer"
            description="Best-performing platform, pillar, hook, and weakest format, drawn from post results recorded so far."
          />
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <LearningMetric
            label="Best platform"
            value={analytics.topPlatform?.label ?? "No data"}
            detail={formatEfficiency(analytics.topPlatform?.averageEfficiency)}
          />
          <LearningMetric
            label="Best pillar"
            value={analytics.topPillar?.label ?? "No data"}
            detail={formatEfficiency(analytics.topPillar?.averageEfficiency)}
          />
          <LearningMetric
            label="Best hook"
            value={analytics.topHook?.item.hook ?? "No data"}
            detail={formatEfficiency(analytics.topHook?.efficiency)}
          />
          <LearningMetric
            label="Weak format"
            value={analytics.weakFormat?.label ?? "No data"}
            detail={formatEfficiency(analytics.weakFormat?.averageEfficiency)}
          />
        </CardContent>
      </Card>

      <GoalProgressPanel data={data} />
    </section>
  );
}

function GoalProgressPanel({ data }: { data: MarketingWorkspaceData }) {
  const progress = calculateGoalProgress(data);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Goal Progress</CardTitle>
        <CardDescription>
          Progress against the Social Audit goal targets.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {progress.map((item) => (
            <GoalProgressMetric
              key={item.label}
              label={item.label}
              value={item.value}
              target={item.target}
              percent={item.percent}
              suffix={item.suffix}
            />
          ))}
        </div>
        <div className="rounded-lg border bg-muted/20 p-3">
          <p className="text-xs font-medium uppercase text-muted-foreground">
            Conversion action
          </p>
          <p className="mt-2 text-sm leading-6">
            {data.socialGoals.conversionAction}
          </p>
          <p className="mt-2 text-xs leading-5 text-muted-foreground">
            Inquiry target: {formatNumber(data.socialGoals.monthlyTargets.inquiries)}.
            Track this as a manual conversion note until CRM/inquiry data is connected.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

function GoalProgressMetric({
  label,
  percent,
  suffix = "",
  target,
  value,
}: {
  label: string;
  percent: number;
  suffix?: string;
  target: number;
  value: number;
}) {
  return (
    <div className="rounded-lg border bg-muted/20 p-3">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-medium uppercase text-muted-foreground">{label}</p>
        <Badge variant={percent >= 100 ? "success" : percent >= 60 ? "info" : "secondary"}>
          {percent}%
        </Badge>
      </div>
      <p className="mt-2 text-sm font-semibold">
        {formatNumber(value)}
        {suffix}
      </p>
      <p className="mt-1 text-xs text-muted-foreground">
        Target {formatNumber(target)}
        {suffix}
      </p>
      <Progress className="mt-3" value={Math.min(percent, 100)} />
    </div>
  );
}

function calculateGoalProgress(data: MarketingWorkspaceData) {
  const totals = data.performanceResults.reduce(
    (sum, result) => ({
      reach: sum.reach + result.reach,
      clicks: sum.clicks + result.clicks,
      saves: sum.saves + result.saves,
      shares: sum.shares + result.shares,
      followersGained: sum.followersGained + result.followsGained,
      engagementActions:
        sum.engagementActions +
        result.engagement +
        result.comments +
        result.shares +
        result.saves +
        result.clicks,
    }),
    {
      reach: 0,
      clicks: 0,
      saves: 0,
      shares: 0,
      followersGained: 0,
      engagementActions: 0,
    },
  );
  const targets = data.socialGoals.monthlyTargets;
  const engagementRate =
    totals.reach > 0 ? roundOne((totals.engagementActions / totals.reach) * 100) : 0;

  return [
    buildProgressRow("Reach", totals.reach, targets.reach),
    buildProgressRow("Engagement rate", engagementRate, targets.engagementRate, "%"),
    buildProgressRow("Clicks", totals.clicks, targets.clicks),
    buildProgressRow("Saves", totals.saves, targets.saves),
    buildProgressRow("Shares", totals.shares, targets.shares),
    buildProgressRow("Followers gained", totals.followersGained, targets.followersGained),
    buildProgressRow("Posts", data.calendar.length, targets.posts),
  ];
}

function buildProgressRow(
  label: string,
  value: number,
  target: number,
  suffix = "",
) {
  return {
    label,
    value,
    target,
    suffix,
    percent: target > 0 ? Math.round((value / target) * 100) : 0,
  };
}

function ExportView({ data }: { data: MarketingWorkspaceData }) {
  const sheets = buildExportSheets(data);

  return (
    <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_380px]">
      <Card>
        <CardHeader>
          <SectionTitle
            icon={Download}
            kicker="Report"
            title="Export"
            description="Export production-ready planning data for calendars, platform owners, video production, weekly handoff, and performance review."
          />
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2">
          <Button onClick={() => downloadCsvPack(data)} variant="outline">
            <Download className="h-4 w-4" />
            Download CSV pack
          </Button>
          <Button onClick={() => downloadExcelWorkbook(data)}>
            <FileSpreadsheet className="h-4 w-4" />
            Download Excel workbook
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Sheets Included</CardTitle>
          <CardDescription>
            Excel opens as one workbook; CSV downloads each sheet separately.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {sheets.map((sheet) => (
            <div
              className="flex items-center justify-between gap-3 rounded-lg border bg-muted/20 p-3"
              key={sheet.name}
            >
              <div className="flex items-center gap-2">
                <Table2 className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium">{sheet.name}</span>
              </div>
              <Badge variant="secondary">{sheet.rows.length} rows</Badge>
            </div>
          ))}
        </CardContent>
      </Card>
    </section>
  );
}

function SectionTitle({
  description,
  icon: Icon,
  kicker,
  title,
}: {
  description: string;
  icon: LucideIcon;
  kicker: string;
  title: string;
}) {
  return (
    <div className="flex min-w-0 gap-3">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-secondary text-secondary-foreground">
        <Icon className="h-5 w-5" />
      </div>
      <div className="min-w-0">
        <Badge variant="outline">{kicker}</Badge>
        <CardTitle className="mt-2">{title}</CardTitle>
        <CardDescription className="mt-2 max-w-3xl leading-6">
          {description}
        </CardDescription>
      </div>
    </div>
  );
}

function Field({ children, label }: { children: ReactNode; label: string }) {
  return (
    <label className="block space-y-2">
      <span className="text-sm font-medium text-foreground">{label}</span>
      {children}
    </label>
  );
}

function FilterField({
  children,
  icon: Icon,
  label,
}: {
  children: ReactNode;
  icon: LucideIcon;
  label: string;
}) {
  return (
    <div className="rounded-lg border bg-muted/20 p-3">
      <div className="mb-2 flex items-center gap-2 text-sm font-medium">
        <Icon className="h-4 w-4 text-primary" />
        {label}
      </div>
      {children}
    </div>
  );
}

function TextListField({
  disabled,
  label,
  onChange,
  value,
}: {
  disabled?: boolean;
  label: string;
  onChange: (value: string[]) => void;
  value: string[];
}) {
  return (
    <Field label={label}>
      <Textarea
        disabled={disabled}
        value={listToText(value)}
        onChange={(event) => onChange(textToList(event.target.value))}
      />
    </Field>
  );
}

function ScoreField({
  label,
  onChange,
  value,
}: {
  label: string;
  onChange: (value: number) => void;
  value: number;
}) {
  return (
    <div className="rounded-lg border bg-muted/20 p-3">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-medium">{label}</p>
        <Input
          className="h-8 w-16"
          max={10}
          min={0}
          type="number"
          value={value}
          onChange={(event) => onChange(clamp(toNumber(event.target.value), 0, 10))}
        />
      </div>
      <Progress className="mt-3" value={value * 10} />
    </div>
  );
}

function InsightList({
  items,
  title,
  variant,
}: {
  items: string[];
  title: string;
  variant: BadgeVariant;
}) {
  return (
    <div className="space-y-2">
      <Badge variant={variant}>{title}</Badge>
      <div className="space-y-2">
        {items.map((item, index) => (
          <div
            className="rounded-lg border bg-muted/20 p-3 text-sm leading-6"
            key={`${item}-${index}`}
          >
            {item}
          </div>
        ))}
      </div>
    </div>
  );
}

function EmptyState({
  action,
  icon: Icon,
  title,
}: {
  action: string;
  icon: LucideIcon;
  title: string;
}) {
  return (
    <div className="flex min-h-48 flex-col items-center justify-center rounded-lg border border-dashed bg-muted/20 p-8 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-md bg-background text-primary">
        <Icon className="h-6 w-6" />
      </div>
      <h3 className="mt-4 text-base font-semibold">{title}</h3>
      <p className="mt-2 max-w-sm text-sm leading-6 text-muted-foreground">{action}</p>
    </div>
  );
}

function NativeSelect({
  children,
  className,
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={cn(
        "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring",
        className,
      )}
      {...props}
    >
      {children}
    </select>
  );
}

function PlatformBadge({ platform }: { platform: Platform }) {
  return (
    <Badge className={PLATFORM_BADGE_CLASS} variant="outline">
      {platform}
    </Badge>
  );
}

function ItemKindBadge({ itemKind }: { itemKind: CalendarItemKind }) {
  return (
    <Badge variant={itemKind === "event" ? "warning" : "secondary"}>
      {capitalize(itemKind)}
    </Badge>
  );
}

function StatusBadge({ status }: { status: CalendarStatus }) {
  return <Badge variant={statusVariant(status)}>{status}</Badge>;
}

function ProductionBlock({
  eyebrow,
  primary,
  secondary,
}: {
  eyebrow: string;
  primary: string;
  secondary: string;
}) {
  return (
    <div className="rounded-lg border bg-muted/20 p-3">
      <p className="text-xs font-medium uppercase text-muted-foreground">{eyebrow}</p>
      <p className="mt-2 text-sm font-semibold leading-6">{primary}</p>
      <p className="mt-2 whitespace-pre-line text-sm leading-6 text-muted-foreground">
        {secondary}
      </p>
    </div>
  );
}

function LearningMetric({
  detail,
  label,
  sample,
  value,
}: {
  detail: string;
  label: string;
  sample?: boolean;
  value: string;
}) {
  return (
    <div className="rounded-lg border bg-muted/20 p-3">
      <p className="text-xs font-medium uppercase text-muted-foreground">{label}</p>
      <p className="mt-2 line-clamp-2 text-sm font-semibold leading-5">
        {value}
        {sample ? <SampleTag /> : null}
      </p>
      <p className="mt-2 text-xs text-muted-foreground">{detail}</p>
    </div>
  );
}

// A small pill that marks a figure as demo content, so a sample number is
// never mistaken for a real UCC result. Shown only while the workspace is in
// sample mode; live data is never tagged.
function SampleTag() {
  return (
    <span className="ml-1.5 inline-flex items-center rounded-full border border-warning-border bg-warning px-1.5 py-0.5 align-middle text-[10px] font-semibold uppercase tracking-wide text-warning-foreground">
      Sample
    </span>
  );
}

function StatusLabel({
  status,
}: {
  status: string;
}) {
  const variant: BadgeVariant =
    status === "exceeded target"
      ? "success"
      : status === "on track"
        ? "info"
        : status === "needs attention"
          ? "warning"
          : status === "behind target"
            ? "warning"
            : status === "active"
              ? "success"
              : status === "completed"
                ? "secondary"
                : "outline";

  return <Badge variant={variant}>{status}</Badge>;
}

function getCampaignStatus(campaign: UccCampaign) {
  return getKpiStatusFromTarget(campaign.actualResults.leads, campaign.kpiTarget.leads);
}

function percentOf(value: number, target: number) {
  return target > 0 ? Math.round((value / target) * 100) : 0;
}

function getKpiStatusFromTarget(
  actual: number,
  target: number,
): UccKpiRecord["status"] {
  const progress = percentOf(actual, target);

  if (progress >= 115) {
    return "exceeded target";
  }

  if (progress >= 75) {
    return "on track";
  }

  if (progress >= 45) {
    return "needs attention";
  }

  return "behind target";
}

function buildPdfKpiRecommendation(
  metrics: PlatformDataMetrics,
  status: UccKpiRecord["status"],
) {
  if (metrics.leads <= 0 && (metrics.reach > 0 || metrics.impressions > 0)) {
    return `${metrics.platform} has reach from the approved PDF import, but no leads were detected. Review CTA clarity and landing-page tracking.`;
  }

  if (status === "exceeded target" || status === "on track") {
    return `${metrics.platform} is converting from approved PDF data. Repeat the strongest hook, keep proof content, and test a follow-up series.`;
  }

  return `${metrics.platform} is behind target from approved PDF data. Improve the hook, CTA, and proof asset before increasing spend.`;
}

function findCampaign(ucc: UccStrategyData, id: string) {
  return ucc.campaigns.find((campaign) => campaign.id === id);
}

function findCourse(ucc: UccStrategyData, id: string) {
  return ucc.courses.find((course) => course.id === id);
}

function findAudience(ucc: UccStrategyData, id: string) {
  return ucc.audiences.find((audience) => audience.id === id);
}

// All the wording on a calendar item that a manager would publish, joined so
// the rule checker can scan it as one block.
function complianceTextForItem(item: CalendarItem): string {
  return [item.contentTopic, item.hook, item.caption, item.cta, item.finalCaption]
    .filter((part) => typeof part === "string" && part.trim().length > 0)
    .join("\n");
}

// Small green/amber dot showing whether the rule-based compliance checker
// found risky wording on a card, so a manager sees it before opening the item.
// This never blocks or approves; it only surfaces what the checker already
// reports elsewhere in the app.
function ComplianceBadge({
  item,
  courseNotes = "",
}: {
  item: CalendarItem;
  courseNotes?: string;
}) {
  const flags = checkComplianceText(complianceTextForItem(item));
  const clear = flags.length === 0;
  const base = clear
    ? "Compliance check: no risky wording found."
    : `Compliance check: ${flags.length} thing${flags.length === 1 ? "" : "s"} to review before approval. ${flags.join(" / ")}`;
  // Surface the item's course compliance notes so they are considered at the
  // point of review, even without AI. These are the manager's own constraints,
  // not rule-checker output.
  const label = courseNotes.trim()
    ? `${base}\nCourse compliance notes to respect: ${courseNotes.trim()}`
    : base;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-[10px] font-medium",
        clear
          ? "border-success-border bg-success text-success-foreground"
          : "border-warning-border bg-warning text-warning-foreground",
      )}
      title={label}
    >
      <span
        className={cn(
          "h-1.5 w-1.5 rounded-full",
          clear ? "bg-success-foreground" : "bg-warning-foreground",
        )}
      />
      {clear ? "Compliance clear" : "Compliance check"}
    </span>
  );
}

function checkComplianceText(text: string) {
  const checks = [
    {
      pattern: /guarantee(d)?\s+(job|employment|career|work|salary|admission|visa|pass)/i,
      message: "Risky guarantee claim: avoid guaranteeing jobs, work, salary, admission, or visa outcomes.",
    },
    {
      pattern: /\b(100%|sure|confirmed)\s+(job|employment|admission|pass|visa|placement)/i,
      message: "Overcertainty risk: replace absolute claims with factual support/process language.",
    },
    {
      pattern: /\$\d+|salary|earn\s+\d+|high-paying/i,
      message: "Salary claim risk: salary outcomes need strong evidence and careful qualification.",
    },
    {
      pattern: /visa|work pass|work permit|permanent resident|PR\b/i,
      message: "Visa/work claim risk: keep immigration or work eligibility wording factual and non-promissory.",
    },
    {
      pattern: /best|number one|#1|top ranked|leading school/i,
      message: "Ranking/superiority risk: unsupported rankings or 'best' claims need verifiable proof.",
    },
    {
      pattern: /testimonial|life changing|success story/i,
      message: "Testimonial risk: avoid implying typical outcomes from individual stories.",
    },
    {
      // Social listening quotes are research evidence only (Module D3).
      pattern: /\b(u\/[a-z0-9_-]{3,}|r\/[a-z0-9_]{3,}|reddit|(said|posted|wrote|commented)\s+on\s+x\b)|["“][^"”]{8,}["”]\s*-?\s*@\w{2,}/i,
      message:
        "Private individual quote risk: this copy appears to quote or reference a social media user. Listening quotes are internal research evidence only; get consent or rewrite in your own words.",
    },
  ];

  return checks
    .filter((check) => check.pattern.test(text))
    .map((check) => check.message);
}

function parseCsvRows(csvText: string) {
  const rows = csvText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map(parseCsvLine);
  const headers = rows[0]?.map((header) => normalizeCsvHeader(header)) ?? [];

  return rows.slice(1).map((cells) =>
    headers.reduce<Record<string, string>>((record, header, index) => {
      record[header] = cells[index] ?? "";
      return record;
    }, {}),
  );
}

function parseCsvLine(line: string) {
  const cells: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    const nextChar = line[index + 1];

    if (char === "\"" && nextChar === "\"") {
      current += "\"";
      index += 1;
      continue;
    }

    if (char === "\"") {
      inQuotes = !inQuotes;
      continue;
    }

    if (char === "," && !inQuotes) {
      cells.push(current.trim());
      current = "";
      continue;
    }

    current += char;
  }

  cells.push(current.trim());
  return cells;
}

function normalizeCsvHeader(header: string) {
  return header.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
}

function readCsv(row: Record<string, string>, keys: string[], fallback = "") {
  return keys.map((key) => row[normalizeCsvHeader(key)]).find(Boolean) ?? fallback;
}

function csvToCourse(row: Record<string, string>): UccCourse {
  return {
    id: readCsv(row, ["id"], crypto.randomUUID()),
    name: readCsv(row, ["name", "course"], "Imported course"),
    category: (readCsv(row, ["category"], "Short courses") || "Short courses") as UccCourse["category"],
    audienceIds: textToList(readCsv(row, ["audiences", "audience_ids"])),
    courseProof: textToList(readCsv(row, ["proof", "course_proof"])),
    complianceNotes: readCsv(row, ["compliance", "compliance_notes"], "Review claims before publishing."),
    status: (readCsv(row, ["status"], "active") || "active") as UccCourse["status"],
  };
}

function csvToCampaign(row: Record<string, string>, ucc: UccStrategyData): UccCampaign {
  return {
    id: readCsv(row, ["id"], crypto.randomUUID()),
    name: readCsv(row, ["name", "campaign"], "Imported campaign"),
    objective: readCsv(row, ["objective"], "Imported campaign objective"),
    courseId: readCsv(row, ["course_id", "course"], ucc.courses[0]?.id ?? ""),
    audienceId: readCsv(row, ["audience_id", "audience"], ucc.audiences[0]?.id ?? ""),
    funnelStage: (readCsv(row, ["funnel", "funnel_stage"], "lead generation") || "lead generation") as FunnelStage,
    platformMix: textToList(readCsv(row, ["platforms", "channels", "platform_mix"])) as UccMarketingChannel[],
    startDate: readCsv(row, ["start", "start_date"], "2026-07-01"),
    endDate: readCsv(row, ["end", "end_date"], "2026-07-31"),
    owner: (readCsv(row, ["owner"], "marketing manager") || "marketing manager") as Role,
    budget: toNumber(readCsv(row, ["budget"], "0")),
    status: (readCsv(row, ["status"], "planning") || "planning") as UccCampaign["status"],
    kpiTarget: {
      reach: toNumber(readCsv(row, ["target_reach", "reach_target"], "0")),
      leads: toNumber(readCsv(row, ["target_leads", "leads_target"], "0")),
      applications: toNumber(readCsv(row, ["target_applications"], "0")),
      enrolments: toNumber(readCsv(row, ["target_enrolments"], "0")),
      costPerLead: toNumber(readCsv(row, ["cost_per_lead", "cpl"], "0")),
    },
    actualResults: {
      reach: toNumber(readCsv(row, ["actual_reach"], "0")),
      leads: toNumber(readCsv(row, ["actual_leads", "leads"], "0")),
      applications: toNumber(readCsv(row, ["applications"], "0")),
      enrolments: toNumber(readCsv(row, ["enrolments"], "0")),
      spend: toNumber(readCsv(row, ["spend"], "0")),
    },
  };
}

function csvToCalendarItem(
  row: Record<string, string>,
  ucc: UccStrategyData,
  platformPlaybook?: PlatformPlaybook,
): CalendarItem {
  const platform = (readCsv(row, ["platform"], "Instagram") || "Instagram") as Platform;
  const date = readCsv(row, ["planned_date", "date"], "2026-07-01");

  return {
    id: readCsv(row, ["id"], crypto.randomUUID()),
    itemKind: (readCsv(row, ["type", "item_kind"], "post") || "post") as CalendarItemKind,
    plannedDate: date,
    actualPostDate: readCsv(row, ["actual_post_date"], ""),
    date,
    platform,
    campaignId: readCsv(row, ["campaign_id", "campaign"], ucc.campaigns[0]?.id ?? ""),
    courseId: readCsv(row, ["course_id", "course"], ucc.courses[0]?.id ?? ""),
    audienceId: readCsv(row, ["audience_id", "audience"], ucc.audiences[0]?.id ?? ""),
    contentPillar: readCsv(row, ["pillar", "content_pillar"], "Course Proof"),
    contentTopic: readCsv(row, ["topic", "content_topic"], "Imported content item"),
    format: readCsv(
      row,
      ["format"],
      getApprovedPlaybookFields(platformPlaybook, platform).defaultFormat,
    ),
    hook: readCsv(row, ["hook"], "Proof-first UCC content hook"),
    caption: readCsv(row, ["caption", "copy"], ""),
    visualDirection: readCsv(row, ["visual_direction"], ""),
    cta: readCsv(row, ["cta"], "Submit an enquiry"),
    hashtags: textToList(readCsv(row, ["hashtags"])),
    bestPostingTime: readCsv(
      row,
      ["best_time", "best_posting_time"],
      getApprovedPlaybookFields(platformPlaybook, platform).bestPostingTime,
    ),
    productionNotes: readCsv(row, ["production_notes"], ""),
    assignedRole: (readCsv(row, ["owner", "assigned_role"], "marketing manager") || "marketing manager") as Role,
    owner: readCsv(row, ["owner_name", "staff_owner"], "Marketing Manager"),
    reviewer: readCsv(row, ["reviewer"], "Marketing Manager"),
    dueDate: readCsv(row, ["due_date"], date),
    blocker: readCsv(row, ["blocker"], ""),
    status: (readCsv(row, ["status"], "idea") || "idea") as CalendarStatus,
    approvalStage: (readCsv(row, ["approval", "approval_stage"], "idea") || "idea") as ApprovalStage,
    businessGoalConnection: readCsv(row, ["goal_connection"], "Imported item connected to UCC marketing objective."),
    complianceNote: readCsv(row, ["compliance_note"], "Review education claims before publishing."),
    videoScript: readCsv(row, ["video_script"], ""),
    shotNotes: readCsv(row, ["shot_notes"], ""),
    finalCaption: readCsv(row, ["final_caption"], ""),
    finalAssetLink: readCsv(row, ["asset_link", "final_asset_link"], ""),
    publishedUrl: readCsv(row, ["published_url"], ""),
    kpiResult: readCsv(row, ["kpi_result"], ""),
    followUpAction: readCsv(row, ["follow_up_action"], ""),
  };
}

function csvToKpiRecord(row: Record<string, string>, ucc: UccStrategyData): UccKpiRecord {
  return {
    id: readCsv(row, ["id"], crypto.randomUUID()),
    campaignId: readCsv(row, ["campaign_id", "campaign"], ucc.campaigns[0]?.id ?? ""),
    courseId: readCsv(row, ["course_id", "course"], ucc.courses[0]?.id ?? ""),
    channel: (readCsv(row, ["channel", "platform"], "Facebook") || "Facebook") as UccMarketingChannel,
    leads: toNumber(readCsv(row, ["leads"], "0")),
    agentEnquiries: toNumber(readCsv(row, ["agent_enquiries"], "0")),
    applications: toNumber(readCsv(row, ["applications"], "0")),
    campusTourBookings: toNumber(readCsv(row, ["campus_tour_bookings", "tours"], "0")),
    enrolments: toNumber(readCsv(row, ["enrolments"], "0")),
    spend: toNumber(readCsv(row, ["spend"], "0")),
    status: (readCsv(row, ["status"], "needs attention") || "needs attention") as UccKpiRecord["status"],
    recommendation: readCsv(row, ["recommendation"], "Review performance and add a next action."),
  };
}

function csvToBudgetPlan(row: Record<string, string>, ucc: UccStrategyData): UccBudgetPlan {
  const adBudget = toNumber(readCsv(row, ["ad_budget"], "0"));
  const printingCost = toNumber(readCsv(row, ["printing_cost"], "0"));
  const eventCost = toNumber(readCsv(row, ["event_cost"], "0"));
  const agentCost = toNumber(readCsv(row, ["agent_cost"], "0"));

  return {
    id: readCsv(row, ["id"], crypto.randomUUID()),
    campaignId: readCsv(row, ["campaign_id", "campaign"], ucc.campaigns[0]?.id ?? ""),
    adBudget,
    designerHours: toNumber(readCsv(row, ["designer_hours"], "0")),
    videoEditorHours: toNumber(readCsv(row, ["video_editor_hours"], "0")),
    copywriterHours: toNumber(readCsv(row, ["copywriter_hours"], "0")),
    staffAssigned: textToList(readCsv(row, ["staff", "staff_assigned"])),
    equipmentNeeded: textToList(readCsv(row, ["equipment", "equipment_needed"])),
    venue: readCsv(row, ["venue"], ""),
    printingCost,
    eventCost,
    agentCost,
    totalCost: toNumber(readCsv(row, ["total", "total_cost"], String(adBudget + printingCost + eventCost + agentCost))),
  };
}

function csvToCompetitor(row: Record<string, string>): Competitor {
  return {
    id: readCsv(row, ["id"], crypto.randomUUID()),
    name: readCsv(row, ["name", "competitor"], "Imported competitor"),
    website: readCsv(row, ["website", "url"], ""),
    platforms: textToList(readCsv(row, ["platforms"])).filter(isPlatform),
    contentFormats: textToList(readCsv(row, ["formats", "content_formats"])),
    tone: readCsv(row, ["tone"], ""),
    postingFrequency: readCsv(row, ["frequency", "posting_frequency"], ""),
    observedStrengths: textToList(readCsv(row, ["strengths", "observed_strengths"])),
    contentGaps: textToList(readCsv(row, ["gaps", "content_gaps"])),
    whitespaceOpportunities: textToList(readCsv(row, ["opportunities", "whitespace_opportunities"])),
  };
}

// Stage flow (Module B1): scheduling or publishing requires the approval
// stage to have reached Manager approved.
const STAGES_AT_OR_PAST_MANAGER_APPROVAL: ApprovalStage[] = [
  "manager approved",
  "scheduled",
  "published",
  "reported",
];

function canPublishCalendarItem(item: CalendarItem) {
  return STAGES_AT_OR_PAST_MANAGER_APPROVAL.includes(item.approvalStage ?? "idea");
}

function sanitizeCalendarPatch(
  item: CalendarItem,
  patch: Partial<CalendarItem>,
) {
  let nextPatch = patch;

  // Compliance Review interception: moving to "compliance approved" runs the
  // rule-based checker. Flags block the move unless the manager explicitly
  // overrides, and the override is logged on the item.
  if (
    nextPatch.approvalStage === "compliance approved" &&
    item.approvalStage !== "compliance approved"
  ) {
    const merged = { ...item, ...nextPatch };
    const flags = checkComplianceText(
      [merged.hook, merged.caption, merged.videoScript].join("\n"),
    );

    if (flags.length > 0 && typeof window !== "undefined") {
      const flagList = flags.map((flag) => `- ${flag}`).join("\n");
      const overridden = window.confirm(
        `Compliance flags found:\n\n${flagList}\n\nOverride and mark compliance approved anyway? The override will be logged on this item.`,
      );

      if (!overridden) {
        const { approvalStage: _blockedStage, ...rest } = nextPatch;
        nextPatch = {
          ...rest,
          blocker: `Compliance review blocked: ${flags.join(" ")}`,
        };
      } else {
        const existingNote = merged.complianceNote ? `${merged.complianceNote}\n` : "";
        nextPatch = {
          ...nextPatch,
          complianceNote: `${existingNote}Manager override on ${new Date().toISOString().slice(0, 10)}: compliance approved despite flags (${flags.join(" ")})`,
        };
      }
    }
  }

  // Rescheduling: an item already at or past Manager approved is moved to a
  // new date only after a confirm, so a manager is not silently rescheduling
  // already-approved work. The approval itself is kept either way; declining
  // just leaves the date as it was.
  if (
    typeof nextPatch.date === "string" &&
    nextPatch.date !== item.date &&
    canPublishCalendarItem(item) &&
    typeof window !== "undefined"
  ) {
    const confirmed = window.confirm(
      `This item is already ${item.approvalStage}. Moving its date to ${nextPatch.date} keeps the approval but reschedules already-approved work. Continue?`,
    );

    if (!confirmed) {
      const keptPatch = { ...nextPatch };
      delete keptPatch.date;
      delete keptPatch.plannedDate;
      nextPatch = keptPatch;
    }
  }

  if (
    (nextPatch.status === "posted" || nextPatch.status === "scheduled") &&
    !canPublishCalendarItem({ ...item, ...nextPatch })
  ) {
    return {
      ...nextPatch,
      status: item.status,
      blocker:
        nextPatch.blocker ||
        item.blocker ||
        "Blocked: the approval stage must reach Manager approved before this item can be scheduled or published.",
    };
  }

  return nextPatch;
}

function buildAiOutputRecord({
  action,
  item,
  output,
}: {
  action: string;
  item: CalendarItem;
  output: Partial<CalendarItem>;
}): UccAiOutputRecord {
  const flags = checkComplianceText(
    `${output.hook ?? ""}\n${output.caption ?? ""}\n${output.videoScript ?? ""}`,
  );

  return {
    id: crypto.randomUUID(),
    title: item.contentTopic,
    generatedAt: new Date().toISOString(),
    status: "draft",
    reviewer: item.reviewer ?? "Marketing Manager",
    complianceScore: flags.length > 0 ? Math.max(35, 82 - flags.length * 15) : 92,
    brandFitScore: 88,
    editHistory: [action, "Saved as draft for human review"],
    outputSummary: `${output.hook ?? item.hook} / ${item.platform}`,
  };
}

function appendAiOutputHistory(
  ucc: UccStrategyData,
  moduleId: string,
  record: UccAiOutputRecord,
) {
  return {
    ...ucc,
    aiModules: ucc.aiModules.map((module) =>
      module.id === moduleId
        ? {
            ...module,
            lastUsedDate: record.generatedAt.slice(0, 10),
            outputHistory: [record, ...(module.outputHistory ?? [])].slice(0, 12),
          }
        : module,
    ),
  };
}

type PlatformMetricsImportSource = {
  // Shown as the origin of the data, for example a PDF file name, a
  // Metricool CSV file name, or "Metricool API sync".
  label: string;
  // Short phrase used in audit and performance notes, for example
  // "PDF data import", "Metricool sync", or "Metricool CSV import".
  noteLabel: string;
  // Human-readable date range shown when there is no PDF upload record to
  // read a precise range from, for example "last 30 days".
  rangeLabel: string;
  // Only set for the PDF path, so the matching pdfDataSource.uploads record
  // can be looked up and marked as applied.
  uploadId?: string;
  // Count of approved rows the reviewer manually edited before applying,
  // for sources that are not a tracked PDF upload.
  editedCount?: number;
};

// What actually happened to one applied platform row, so the confirmation
// after approving a sync can offer only links that lead somewhere real: no
// "View in..." button for a screen the data never reached.
type AppliedPlatformSummary = {
  platform: Platform;
  label?: string;
  kpiUpdated: boolean;
};

function applyPlatformMetricsImport(
  current: MarketingWorkspaceData,
  platformMetrics: PlatformDataMetrics[],
  importedAt: string,
  approvedBy: string,
  source: PlatformMetricsImportSource,
): { workspace: MarketingWorkspaceData; appliedPlatforms: AppliedPlatformSummary[] } {
  const selectedUpload = source.uploadId
    ? current.pdfDataSource.uploads.find((upload) => upload.id === source.uploadId)
    : undefined;
  const sourceFileLabel = selectedUpload?.fileName ?? source.label;
  // Metricool (API sync or CSV import) gets a visible "last updated" tag on
  // the audit row; other sources (PDF reports) do not, since the request was
  // specifically to trace Metricool-sourced numbers.
  const isMetricoolSource = source.noteLabel.startsWith("Metricool");
  const existingAuditPlatforms = new Set(current.audits.map((audit) => audit.platform));
  const kpiUpdatedByPlatform = new Set<Platform>();
  const metricsByPlatform = new Map(
    platformMetrics.map((metrics) => [metrics.platform, metrics]),
  );

  function applyMetricsToAudit(
    audit: SocialAudit,
    metrics: PlatformDataMetrics,
  ): SocialAudit {
    const engagementActions =
      metrics.engagement +
      metrics.comments +
      metrics.shares +
      metrics.saves +
      metrics.clicks;
    const engagementRate =
      metrics.reach > 0
        ? roundOne((engagementActions / metrics.reach) * 100)
        : audit.engagementRate;
    const averageReach = getAverageMetric(metrics.reach || metrics.impressions, metrics.posts);

    return {
      ...audit,
      followers: metrics.followers || audit.followers,
      averageReach: averageReach || audit.averageReach,
      impressions: metrics.impressions || audit.impressions,
      engagementRate,
      postingFrequency:
        metrics.posts > 0
          ? `${metrics.posts} posts in PDF report range`
          : audit.postingFrequency,
      scores: {
        ...audit.scores,
        postingConsistency:
          metrics.posts > 0
            ? scorePostingConsistency(metrics.posts)
            : audit.scores.postingConsistency,
        engagementPerformance:
          engagementRate > 0
            ? scoreEngagementPerformance(engagementRate)
            : audit.scores.engagementPerformance,
      },
      lastMetricoolSyncAt: isMetricoolSource ? importedAt : audit.lastMetricoolSyncAt,
      notes: mergeImportNote(
        audit.notes,
        `${source.noteLabel} ${formatDateTime(importedAt)}: ${formatNumber(
          metrics.impressions,
        )} impressions, ${formatNumber(metrics.reach)} reach, ${formatNumber(
          engagementActions,
        )} engagement actions from ${sourceFileLabel}.`,
      ),
    };
  }

  const updatedExistingAudits = current.audits.map((audit) => {
    const metrics = metricsByPlatform.get(audit.platform);
    return metrics ? applyMetricsToAudit(audit, metrics) : audit;
  });
  // A platform a sync returns data for might not have a Social Audit row yet
  // (nothing else in this function ever creates one). Without this, that
  // platform's real, approved numbers would be silently dropped rather than
  // reaching the Social Audit screen at all.
  const newAudits = platformMetrics
    .filter((metrics) => !existingAuditPlatforms.has(metrics.platform))
    .map((metrics) => applyMetricsToAudit(makeNewAudit(metrics.platform), metrics));
  const nextAudits = [...updatedExistingAudits, ...newAudits];
  const performanceByItem = new Map(
    current.performanceResults.map((result) => [result.calendarItemId, result]),
  );
  const nextKpiRecords = [...current.ucc.kpiRecords];

  const rangeLabel = selectedUpload
    ? `${selectedUpload.startDate} to ${selectedUpload.endDate}`
    : source.rangeLabel;

  platformMetrics.forEach((metrics) => {
    const item = selectPdfReportCalendarItem(
      current,
      metrics.platform,
      selectedUpload?.startDate,
      selectedUpload?.endDate,
    );
    const campaign =
      findCampaign(current.ucc, item?.campaignId ?? "") ??
      current.ucc.campaigns.find((row) => row.platformMix.includes(metrics.platform)) ??
      current.ucc.campaigns[0];
    const course =
      findCourse(current.ucc, item?.courseId ?? "") ??
      findCourse(current.ucc, campaign?.courseId ?? "") ??
      current.ucc.courses[0];

    if (item) {
      performanceByItem.set(item.id, {
        calendarItemId: item.id,
        impressions: metrics.impressions,
        reach: metrics.reach,
        engagement: metrics.engagement,
        comments: metrics.comments,
        shares: metrics.shares,
        saves: metrics.saves,
        watchTime: metrics.watchTime,
        clicks: metrics.clicks,
        followsGained: metrics.followsGained,
        notes: `Approved ${source.noteLabel.toLowerCase()} aggregate for ${
          metrics.platform
        } from ${sourceFileLabel} covering ${rangeLabel}.`,
      });
    }

    if (campaign && course) {
      const recordIndex = nextKpiRecords.findIndex(
        (row) => row.campaignId === campaign.id && row.channel === metrics.platform,
      );
      const existingRecord = recordIndex >= 0 ? nextKpiRecords[recordIndex] : undefined;
      const leads = metrics.leads || existingRecord?.leads || 0;
      const status = getKpiStatusFromTarget(leads, campaign.kpiTarget.leads);
      const nextRecord: UccKpiRecord = {
        id:
          existingRecord?.id ??
          `kpi-pdf-${metrics.platform.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${Date.now()}`,
        campaignId: campaign.id,
        courseId: course.id,
        channel: metrics.platform,
        leads,
        agentEnquiries: existingRecord?.agentEnquiries ?? 0,
        applications: existingRecord?.applications ?? 0,
        campusTourBookings: existingRecord?.campusTourBookings ?? 0,
        enrolments: existingRecord?.enrolments ?? 0,
        spend: existingRecord?.spend ?? 0,
        status,
        recommendation: buildPdfKpiRecommendation(metrics, status),
      };

      if (recordIndex >= 0) {
        nextKpiRecords[recordIndex] = nextRecord;
      } else {
        nextKpiRecords.push(nextRecord);
      }

      kpiUpdatedByPlatform.add(metrics.platform);
    }
  });

  const summary =
    platformMetrics.length > 0
      ? `Applied ${platformMetrics.length} approved platform metric row${
          platformMetrics.length === 1 ? "" : "s"
        } from ${sourceFileLabel} to audit, KPI Tracker, and performance learning.`
      : `No recognised platform metrics were found from ${sourceFileLabel}.`;
  const approvedUploadRows =
    selectedUpload?.reviewMetrics?.filter((row) => row.approved) ?? [];
  const editedMetricCount = source.uploadId
    ? approvedUploadRows.filter((row) => row.edited).length
    : (source.editedCount ?? 0);

  const appliedPlatforms: AppliedPlatformSummary[] = platformMetrics.map((metrics) => ({
    platform: metrics.platform,
    label: metrics.label,
    kpiUpdated: kpiUpdatedByPlatform.has(metrics.platform),
  }));

  const workspace: MarketingWorkspaceData = {
    ...current,
    audits: nextAudits,
    ucc: {
      ...current.ucc,
      kpiRecords: nextKpiRecords,
    },
    performanceResults: [...performanceByItem.values()],
    pdfDataSource: {
      ...current.pdfDataSource,
      importLog: [
        {
          id: `import-log-${Date.now()}`,
          uploadId: source.uploadId ?? "",
          fileName: sourceFileLabel,
          uploadedAt: selectedUpload?.uploadedAt ?? importedAt,
          appliedAt: importedAt,
          approvedBy,
          extractedMetricCount: selectedUpload?.reviewMetrics?.length ?? platformMetrics.length,
          appliedMetricCount: platformMetrics.length,
          editedMetricCount,
          platforms: platformMetrics.map((metrics) => metrics.platform),
          summary,
        },
        ...(current.pdfDataSource.importLog ?? []),
      ],
      uploads: source.uploadId
        ? current.pdfDataSource.uploads.map((upload) =>
            upload.id === source.uploadId
              ? {
                  ...upload,
                  detectedMetricCount: platformMetrics.length,
                  detectedPlatforms: platformMetrics.map((metrics) => metrics.platform),
                  confidenceLevel: getPdfConfidenceLevel(upload.reviewMetrics ?? []),
                  approvalStatus: "applied",
                  approvedBy,
                  extractionMessage: summary,
                }
              : upload,
          )
        : current.pdfDataSource.uploads,
      lastImportedAt: importedAt,
      lastImportSummary: summary,
    },
  };

  return { workspace, appliedPlatforms };
}

function selectPdfReportCalendarItem(
  data: MarketingWorkspaceData,
  platform: Platform,
  startDate?: string,
  endDate?: string,
) {
  const platformItems = data.calendar.filter((item) => item.platform === platform);
  const inRange = platformItems.filter((item) =>
    isDateInRange(item.date, startDate ?? "", endDate ?? ""),
  );

  return (
    inRange.find((item) => item.status === "posted") ??
    inRange[0] ??
    platformItems.find((item) => item.status === "posted") ??
    platformItems[0]
  );
}

function isDateInRange(date: string, startDate: string, endDate: string) {
  return (!startDate || date >= startDate) && (!endDate || date <= endDate);
}

function getAverageMetric(total: number, posts: number) {
  if (total <= 0) {
    return 0;
  }

  return Math.round(total / Math.max(posts, 1));
}

function scorePostingConsistency(posts: number) {
  if (posts >= 20) {
    return 10;
  }

  if (posts >= 12) {
    return 8;
  }

  if (posts >= 8) {
    return 7;
  }

  if (posts >= 4) {
    return 6;
  }

  return 4;
}

function scoreEngagementPerformance(rate: number) {
  if (rate >= 7) {
    return 9;
  }

  if (rate >= 4) {
    return 8;
  }

  if (rate >= 2.5) {
    return 7;
  }

  if (rate >= 1) {
    return 5;
  }

  return 3;
}

function mergeImportNote(existing: string, note: string) {
  const cleanExisting = existing
    .split("\n")
    .filter((line) => !line.startsWith("PDF data import"))
    .join("\n")
    .trim();

  return [cleanExisting, note].filter(Boolean).join("\n");
}

function roundOne(value: number) {
  return Math.round(value * 10) / 10;
}

function listToText(value: string[]) {
  return value.join("\n");
}

function textToList(value: string) {
  return value
    .split(/\n|,/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function isPlatform(value: string): value is Platform {
  return platforms.includes(value as Platform);
}

// Common ways people write the seven known platforms, so a typed value like
// "Twitter", "IG", or "YouTube" is not silently discarded. Anything that still
// cannot be matched is dropped, but the common cases are preserved.
const PLATFORM_ALIASES: Record<string, Platform> = {
  tiktok: "TikTok",
  "tik tok": "TikTok",
  instagram: "Instagram",
  insta: "Instagram",
  ig: "Instagram",
  "youtube shorts": "YouTube Shorts",
  youtube: "YouTube Shorts",
  shorts: "YouTube Shorts",
  yt: "YouTube Shorts",
  linkedin: "LinkedIn",
  facebook: "Facebook",
  fb: "Facebook",
  "x/twitter": "X/Twitter",
  x: "X/Twitter",
  twitter: "X/Twitter",
  threads: "Threads",
};

// Parse a free-text list of platforms into known Platform values, tolerating
// case and common aliases, and de-duplicating while keeping order.
function parsePlatformList(text: string): Platform[] {
  const seen = new Set<Platform>();
  const result: Platform[] = [];
  for (const raw of textToList(text)) {
    const key = raw.trim().toLowerCase();
    const platform = isPlatform(raw) ? (raw as Platform) : PLATFORM_ALIASES[key];
    if (platform && !seen.has(platform)) {
      seen.add(platform);
      result.push(platform);
    }
  }
  return result;
}

function toNumber(value: string) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("en-US").format(value);
}

function parseIsoDate(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function formatIsoDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function getNextCalendarDate(calendar: CalendarItem[]) {
  if (calendar.length === 0) {
    return "2026-07-01";
  }

  const lastDate = sortCalendarItems(calendar).at(-1)?.date ?? "2026-07-01";
  const nextDate = parseIsoDate(lastDate);
  nextDate.setDate(nextDate.getDate() + 1);

  return formatIsoDate(nextDate);
}

function sortCalendarItems(calendar: CalendarItem[]) {
  return [...calendar].sort((a, b) => {
    const dateCompare = a.date.localeCompare(b.date);

    if (dateCompare !== 0) {
      return dateCompare;
    }

    return a.bestPostingTime.localeCompare(b.bestPostingTime);
  });
}

function capitalize(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function formatDateTime(value: string) {
  const date = new Date(value);

  // A blank or unset date (common in a fresh, empty workspace) would make
  // Intl.DateTimeFormat throw "Invalid time value" and crash the screen, so
  // fall back to a plain dash instead.
  if (!value || Number.isNaN(date.getTime())) {
    return "not yet";
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

// British-style day and 24-hour time for the "Updated from Metricool" tag on
// a Social Audit row, for example "10 Jul 11:05".
function formatMetricoolSyncStamp(value: string) {
  const date = new Date(value);

  if (!value || Number.isNaN(date.getTime())) {
    return "not yet";
  }

  const datePart = new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
  }).format(date);
  const timePart = new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);

  return `${datePart} ${timePart}`;
}

function formatEfficiency(value?: number) {
  if (value === undefined) {
    return "No score yet";
  }

  return `${Math.round(value * 1000) / 10}% action density`;
}

function roleLabel(role: Role) {
  return role.replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function statusVariant(status: CalendarStatus): BadgeVariant {
  const variants: Record<CalendarStatus, BadgeVariant> = {
    idea: "secondary",
    drafting: "info",
    design: "warning",
    review: "warning",
    approved: "success",
    scheduled: "success",
    posted: "outline",
  };

  return variants[status];
}

// Theme-neutral chip so the platform tag reads correctly on every theme.
const PLATFORM_BADGE_CLASS = "border-border bg-secondary text-secondary-foreground";

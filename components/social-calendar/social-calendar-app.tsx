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
  ClipboardCheck,
  Database,
  Download,
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
import { isLiveAiEnabled, resolveModelForTask } from "@/lib/ai-settings";
import {
  appendAiUsage,
  buildAiUsageEntry,
  monthlyAiUsageTotals,
} from "@/lib/ai-usage";
import type { OpenAiUsage } from "@/lib/openai-shared";
import {
  auditDraftToInsight,
  upsertAuditInsight,
  type AuditAiContext,
  type AuditAiDraft,
} from "@/lib/audit-ai";
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
import { upcomingSgMoments } from "@/lib/sg-marketing-moments";
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
import {
  deleteAssetFile,
  resolveSupabaseConfig,
  uploadAssetFile,
} from "@/lib/supabase-client";
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
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import {
  analyzePerformance,
  approvalStages,
  calculateAuditScore,
  calendarItemKinds,
  createSeedWorkspaceData,
  dailyPublishingRhythm,
  funnelStages,
  generateCalendarFromBrief,
  generateCopywritingForItem,
  getDailyContentMasterMeta,
  getAuditIssues,
  getAuditRecommendations,
  platformRules,
  platforms,
  roles,
  statuses,
  isCampaignApproved,
  type AiIntegrationSettings,
  type AiRecommendation,
  type AiUsageEntry,
  type AuditInsight,
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
  type PdfDataSourceSettings,
  type PdfMetricReview,
  type PdfReportUpload,
  type PerformanceResult,
  type Platform,
  type PlatformConnection,
  type Role,
  type SocialAudit,
  type SocialGoalSettings,
  type SocialGoalTargets,
  type StrategyBrief,
  type UccAsset,
  type UccAiModule,
  type UccAiOutputRecord,
  type UccAudience,
  type UccBudgetPlan,
  type UccCampaign,
  type UccCourse,
  type UccCourseCategory,
  type UccKpiRecord,
  type UccMarketingChannel,
  type UccStrategyData,
} from "@/lib/social-calendar-data";
import {
  buildPdfMetricReviewRows,
  countDetectedPdfMetrics,
  getPdfConfidenceLevel,
  metricLabel,
  parsePdfReportMetrics,
  pdfReviewMetricFields,
  reviewRowsToPlatformMetrics,
  type PendingMetricReview,
  type PlatformDataMetrics,
} from "@/lib/pdf-data-import";
import { parseMetricoolCsv } from "@/lib/metricool-csv";
import {
  ConnectionManagerPanel,
  MetricReviewPanel,
  reviewRowsToApprovedMetrics,
} from "@/components/social-calendar/connection-manager";
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
type PdfImportState = {
  status: "idle" | "loading" | "success" | "error";
  message: string;
};

type PdfExtractionResponse = {
  error?: string;
  extractedText?: string;
  textWasTrimmed?: boolean;
  pages?: number;
  method?: string;
  characters?: number;
  platformMetrics?: PlatformDataMetrics[];
  platformMetricCount?: number;
  summary?: string;
};

type ViewId =
  | "dashboard"
  | "objectives"
  | "courses"
  | "campaigns"
  | "platform"
  | "competitors"
  | "brief"
  | "calendar"
  | "production"
  | "assets"
  | "budget"
  | "kpi"
  | "compliance"
  | "reports"
  | "settings";

const navItems: Array<{
  id: ViewId;
  label: string;
  icon: LucideIcon;
}> = [
  { id: "dashboard", label: "Dashboard", icon: BarChart3 },
  { id: "objectives", label: "Objectives", icon: Target },
  { id: "courses", label: "Courses & Audiences", icon: GraduationCap },
  { id: "campaigns", label: "Campaigns", icon: ClipboardCheck },
  { id: "platform", label: "Platform Strategy", icon: Gauge },
  { id: "brief", label: "Strategy Brief", icon: SearchCheck },
  { id: "calendar", label: "Content Calendar", icon: CalendarDays },
  { id: "production", label: "Production Board", icon: ListChecks },
  { id: "assets", label: "Asset Library", icon: FileText },
  { id: "budget", label: "Budget & Resources", icon: FileSpreadsheet },
  { id: "competitors", label: "Competitors", icon: UsersRound },
  { id: "kpi", label: "KPI Tracker", icon: TrendingUp },
  { id: "compliance", label: "Compliance", icon: ShieldCheck },
  { id: "reports", label: "Reports", icon: Download },
  { id: "settings", label: "Settings", icon: Settings2 },
];

const scoreFields: Array<{ key: keyof AuditScores; label: string }> = [
  { key: "profileCompleteness", label: "Profile completeness" },
  { key: "postingConsistency", label: "Posting consistency" },
  { key: "contentMix", label: "Content mix" },
  { key: "hookQuality", label: "Hook quality" },
  { key: "ctaClarity", label: "CTA clarity" },
  { key: "visualConsistency", label: "Visual consistency" },
  { key: "engagementPerformance", label: "Engagement performance" },
];

export function SocialCalendarApp() {
  const [data, setData] = useState<MarketingWorkspaceData>(() =>
    createSeedWorkspaceData(),
  );
  const [activeView, setActiveView] = useState<ViewId>("dashboard");
  const [isHydrated, setIsHydrated] = useState(false);
  const [pdfImportState, setPdfImportState] = useState<PdfImportState>({
    status: "idle",
    message: "Upload a PDF analytics report to extract and apply real metrics.",
  });

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

  function updateWorkspace(
    updater: (current: MarketingWorkspaceData) => MarketingWorkspaceData,
  ) {
    setData((current) => ({
      ...updater(current),
      generatedAt: new Date().toISOString(),
    }));
  }

  function resetSampleData() {
    setData(localSocialCalendarRepository.reset());
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
    updateWorkspace((current) =>
      applyPlatformMetricsImport(
        current,
        metrics,
        new Date().toISOString(),
        approvedBy,
        source,
      ),
    );
  }

  async function addPdfReports(files: FileList | null) {
    if (!files?.length) {
      return;
    }

    const pdfFiles = Array.from(files).filter((file) =>
      file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf"),
    );

    if (pdfFiles.length === 0) {
      setPdfImportState({
        status: "error",
        message: "Upload PDF files only.",
      });
      return;
    }

    setPdfImportState({
      status: "loading",
      message: `Reading ${pdfFiles.length} PDF report${
        pdfFiles.length === 1 ? "" : "s"
      } and looking for reach, engagement, followers, clicks, saves, shares, comments, and post performance data.`,
    });

    const uploadedAt = new Date().toISOString();
    const defaultStartDate = data.pdfDataSource.uploads[0]?.startDate ?? "2026-07-01";
    const defaultEndDate = data.pdfDataSource.uploads[0]?.endDate ?? "2026-07-31";
    const uploads: PdfReportUpload[] = [];

    for (const [index, file] of pdfFiles.entries()) {
      const uploadId = `pdf-${Date.now()}-${index}`;
      const baseUpload = {
        id: uploadId,
        fileName: file.name,
        fileSize: file.size,
        uploadedAt,
        source: "Social analytics PDF report",
        startDate: defaultStartDate,
        endDate: defaultEndDate,
      };

      try {
        const formData = new FormData();
        formData.append("file", file);

        const response = await fetch("/api/pdf-data/extract", {
          method: "POST",
          body: formData,
        });
        const result = (await response.json()) as PdfExtractionResponse;

        if (!response.ok) {
          throw new Error(result.error ?? "The PDF could not be read.");
        }

        const platformMetrics = result.platformMetrics ?? [];
        const reviewMetrics = buildPdfMetricReviewRows(platformMetrics);
        const confidenceLevel = getPdfConfidenceLevel(reviewMetrics);
        const summary =
          result.summary ??
          `Extracted ${result.characters?.toLocaleString() ?? "some"} characters from this PDF.`;

        uploads.push({
          ...baseUpload,
          notes: summary,
          extractedText: result.extractedText ?? "",
          extractedAt: new Date().toISOString(),
          extractionStatus: "success",
          extractionMessage: summary,
          pageCount: result.pages,
          extractionMethod: result.method,
          detectedMetricCount: result.platformMetricCount ?? platformMetrics.length,
          detectedPlatforms: reviewMetrics.map((row) => row.platform),
          confidenceLevel,
          reviewMetrics,
          approvalStatus: platformMetrics.length > 0 ? "needs review" : "error",
          approvedBy: "",
          reviewedBy: "",
          warning:
            platformMetrics.length > 0
              ? ""
              : "No recognizable platform metrics were found. Review the extracted text and correct labels before applying.",
        });
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : "The PDF could not be read. Try exporting a text-based report.";

        uploads.push({
          ...baseUpload,
          notes: message,
          extractedText: "",
          extractionStatus: "error",
          extractionMessage: message,
          detectedMetricCount: 0,
          detectedPlatforms: [],
          confidenceLevel: "low",
          reviewMetrics: [],
          approvalStatus: "error",
          approvedBy: "",
          reviewedBy: "",
          warning: message,
        });
      }
    }

    const successfulUploads = uploads.filter(
      (upload) => upload.extractionStatus === "success",
    ).length;
    const failedUploads = uploads.length - successfulUploads;
    const failedUploadDetails = uploads
      .filter((upload) => upload.extractionStatus === "error")
      .map(
        (upload) =>
          `${upload.fileName}: ${
            upload.extractionMessage ?? "The PDF could not be read."
          }`,
      )
      .join(" ");
    const reviewMetricCount = uploads.reduce(
      (sum, upload) => sum + (upload.reviewMetrics?.length ?? 0),
      0,
    );
    const importSummary =
      successfulUploads === 0
        ? `Could not read ${failedUploads} PDF report${
            failedUploads === 1 ? "" : "s"
          }. ${failedUploadDetails}`
        : reviewMetricCount > 0
          ? `Read ${successfulUploads} PDF report${
              successfulUploads === 1 ? "" : "s"
            } and prepared ${reviewMetricCount} platform metric row${
              reviewMetricCount === 1 ? "" : "s"
            } for review. Approve the rows before applying them to KPI Tracker and Performance Learning.${
              failedUploads > 0
                ? ` ${failedUploads} file${
                    failedUploads === 1 ? "" : "s"
                  } could not be read. ${failedUploadDetails}`
                : ""
            }`
          : `Read ${successfulUploads} PDF report${
              successfulUploads === 1 ? "" : "s"
            }, but no recognizable platform metrics were found. Review the extracted text and re-apply after correcting labels if needed.${
              failedUploads > 0
                ? ` ${failedUploads} file${
                    failedUploads === 1 ? "" : "s"
                  } could not be read. ${failedUploadDetails}`
                : ""
            }`;

    updateWorkspace((current) => {
      return {
        ...current,
        pdfDataSource: {
          ...current.pdfDataSource,
          uploads: [...uploads, ...current.pdfDataSource.uploads],
          selectedUploadId: uploads[0]?.id ?? current.pdfDataSource.selectedUploadId,
          lastImportSummary: importSummary,
        },
      };
    });
    setPdfImportState({
      status: successfulUploads === 0 ? "error" : "success",
      message: importSummary,
    });
  }

  function applySelectedPdfReportData() {
    const selectedUpload = data.pdfDataSource.uploads.find(
      (upload) => upload.id === data.pdfDataSource.selectedUploadId,
    );

    if (!selectedUpload) {
      setPdfImportState({
        status: "error",
        message: "Upload and select a PDF report first.",
      });
      return;
    }

    const platformMetrics = parsePdfReportMetrics(selectedUpload.extractedText);
    const reviewMetrics =
      selectedUpload.reviewMetrics && selectedUpload.reviewMetrics.length > 0
        ? selectedUpload.reviewMetrics
        : buildPdfMetricReviewRows(platformMetrics);
    const approvedRows = reviewMetrics.filter((row) => row.approved);

    if (approvedRows.length === 0) {
      setPdfImportState({
        status: "error",
        message: "Approve at least one platform metric row before applying PDF data.",
      });
      return;
    }

    if (!selectedUpload.approvedBy?.trim()) {
      setPdfImportState({
        status: "error",
        message: "Add the person approving this PDF import before applying data.",
      });
      return;
    }

    const importedAt = new Date().toISOString();
    const approvedMetrics = reviewRowsToPlatformMetrics(approvedRows);

    updateWorkspace((current) =>
      applyPlatformMetricsImport(
        current,
        approvedMetrics,
        importedAt,
        selectedUpload.approvedBy ?? "Marketing Manager",
        {
          label: selectedUpload.fileName,
          noteLabel: "PDF data import",
          rangeLabel: `${selectedUpload.startDate} to ${selectedUpload.endDate}`,
          uploadId: selectedUpload.id,
        },
      ),
    );

    setPdfImportState({
      status: approvedMetrics.length > 0 ? "success" : "error",
      message:
        approvedMetrics.length > 0
          ? `Applied ${approvedMetrics.length} approved platform metric row${
              approvedMetrics.length === 1 ? "" : "s"
            } to KPI Tracker and Performance Learning.`
          : "No recognizable platform metrics were found. Paste text with platform names and metrics like impressions, reach, clicks, saves, comments, shares, followers, leads, and posts.",
    });
  }

  return (
    <main className="min-h-screen">
      <div className="mx-auto flex w-full max-w-[1560px] gap-0 px-4 py-4 sm:px-6 lg:gap-8 lg:px-8 lg:py-8">
        <aside className="sticky top-8 hidden h-[calc(100vh-4rem)] w-72 shrink-0 flex-col border-r pr-5 lg:flex">
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
            {navItems.map((item) => (
              <NavButton
                active={activeView === item.id}
                item={item}
                key={item.id}
                onClick={() => setActiveView(item.id)}
              />
            ))}
          </nav>

          <div className="mt-auto space-y-5 px-2">
            <Separator />
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
          <div className="sticky top-0 z-30 mb-5 border-b bg-background/95 py-3 backdrop-blur lg:hidden">
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
              <Button
                aria-label="Reset sample data"
                onClick={resetSampleData}
                size="icon"
                variant="outline"
              >
                <RefreshCcw className="h-4 w-4" />
              </Button>
            </div>
            <nav className="flex max-w-full gap-2 overflow-x-auto pb-1">
              {navItems.map((item) => {
                const Icon = item.icon;

                return (
                  <button
                    className={cn(
                      "flex h-10 shrink-0 items-center gap-2 rounded-md border px-3 text-sm font-medium transition-colors",
                      activeView === item.id
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border bg-card text-muted-foreground",
                    )}
                    key={item.id}
                    onClick={() => setActiveView(item.id)}
                    type="button"
                  >
                    <Icon className="h-4 w-4" />
                    {item.label}
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
                  UCC Marketing Strategy OS
                </h1>
                <p className="mt-2 max-w-4xl text-sm leading-6 text-muted-foreground sm:text-base">
                  {data.brand.brandName} objective-first marketing operations
                  workspace for digital, offline, campaign, content, budget, KPI,
                  compliance, and management reporting.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
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
                <Button onClick={resetSampleData} size="sm" variant="outline">
                  <RefreshCcw className="h-4 w-4" />
                  Reset sample
                </Button>
              </div>
            </header>

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

            <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <SummaryMetric
                icon={Target}
                label="Audit goal"
                value={data.socialGoals.northStarMetric}
                detail={data.socialGoals.primaryObjective}
              />
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

            {activeView === "dashboard" ? (
              <ManagementDashboardView data={data} />
            ) : null}

            {activeView === "objectives" ? (
              <SocialAuditView
                aiIntegration={data.aiIntegration}
                auditInsights={data.auditInsights}
                audits={data.audits}
                socialGoals={data.socialGoals}
                ucc={data.ucc}
                onAuditInsightsChange={(auditInsights) =>
                  updateWorkspace((current) => ({ ...current, auditInsights }))
                }
                onAuditsChange={(audits) =>
                  updateWorkspace((current) => ({ ...current, audits }))
                }
                onRecordUsage={recordAiUsage}
                onSocialGoalsChange={(socialGoals) =>
                  updateWorkspace((current) => ({ ...current, socialGoals }))
                }
              />
            ) : null}

            {activeView === "courses" ? (
              <CoursesAudiencesView
                ucc={data.ucc}
                onUccChange={(ucc) =>
                  updateWorkspace((current) => ({ ...current, ucc }))
                }
              />
            ) : null}

            {activeView === "campaigns" ? (
              <CampaignPlanningView
                aiIntegration={data.aiIntegration}
                auditInsights={data.auditInsights}
                brief={data.brief}
                campaignSuggestions={data.campaignSuggestions}
                competitorInsights={data.competitorInsights}
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
                ucc={data.ucc}
                onUccChange={(ucc) =>
                  updateWorkspace((current) => ({ ...current, ucc }))
                }
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
                aiIntegration={data.aiIntegration}
                audits={data.audits}
                brand={data.brand}
                brief={data.brief}
                competitorInsights={data.competitorInsights}
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
                aiIntegration={data.aiIntegration}
                audits={data.audits}
                brand={data.brand}
                brief={data.brief}
                calendar={data.calendar}
                performanceResults={data.performanceResults}
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

            {activeView === "assets" ? (
              <AssetLibraryView
                calendar={data.calendar}
                ucc={data.ucc}
                onUccChange={(ucc) =>
                  updateWorkspace((current) => ({ ...current, ucc }))
                }
              />
            ) : null}

            {activeView === "budget" ? (
              <BudgetResourcesView
                data={data}
                onAiRecommendationsChange={(aiRecommendations) =>
                  updateWorkspace((current) => ({ ...current, aiRecommendations }))
                }
                onRecordUsage={recordAiUsage}
                onUccChange={(ucc) =>
                  updateWorkspace((current) => ({ ...current, ucc }))
                }
              />
            ) : null}

            {activeView === "kpi" ? (
              <KpiTrackerView
                data={data}
                onAiRecommendationsChange={(aiRecommendations) =>
                  updateWorkspace((current) => ({ ...current, aiRecommendations }))
                }
                onPerformanceChange={(performanceResults) =>
                  updateWorkspace((current) => ({
                    ...current,
                    performanceResults,
                  }))
                }
                onRecordUsage={recordAiUsage}
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

            {activeView === "reports" ? <ReportsView data={data} /> : null}

            {activeView === "settings" ? (
              <SettingsWorkspaceView
                sync={sync}
                aiIntegration={data.aiIntegration}
                aiUsage={data.aiUsage}
                brand={data.brand}
                connections={data.connections}
                workspaceData={data}
                onRestoreWorkspace={(workspace) =>
                  setData(normalizeWorkspaceData(workspace))
                }
                importState={pdfImportState}
                pdfDataSource={data.pdfDataSource}
                ucc={data.ucc}
                competitors={data.competitors}
                calendar={data.calendar}
                onApplyMetrics={applyApprovedMetrics}
                onAiIntegrationChange={(aiIntegration) =>
                  updateWorkspace((current) => ({ ...current, aiIntegration }))
                }
                onConnectionsChange={(connections) =>
                  updateWorkspace((current) => ({ ...current, connections }))
                }
                onBrandChange={(field, value) =>
                  updateWorkspace((current) => ({
                    ...current,
                    brand: { ...current.brand, [field]: value },
                  }))
                }
                onPdfDataSourceChange={(field, value) =>
                  updateWorkspace((current) => ({
                    ...current,
                    pdfDataSource: { ...current.pdfDataSource, [field]: value },
                  }))
                }
                onPdfReportChange={(uploadId, patch) =>
                  updateWorkspace((current) => ({
                    ...current,
                    pdfDataSource: {
                      ...current.pdfDataSource,
                      uploads: current.pdfDataSource.uploads.map((upload) =>
                        upload.id === uploadId ? { ...upload, ...patch } : upload,
                      ),
                    },
                  }))
                }
                onPdfReportDelete={(uploadId) =>
                  updateWorkspace((current) => {
                    const uploads = current.pdfDataSource.uploads.filter(
                      (upload) => upload.id !== uploadId,
                    );

                    return {
                      ...current,
                      pdfDataSource: {
                        ...current.pdfDataSource,
                        uploads,
                        selectedUploadId:
                          current.pdfDataSource.selectedUploadId === uploadId
                            ? uploads[0]?.id ?? ""
                            : current.pdfDataSource.selectedUploadId,
                      },
                    };
                  })
                }
                onPdfReportUpload={addPdfReports}
                onPdfReportApply={applySelectedPdfReportData}
                onUccChange={(ucc) =>
                  updateWorkspace((current) => ({ ...current, ucc }))
                }
                onCompetitorsChange={(competitors) =>
                  updateWorkspace((current) => ({ ...current, competitors }))
                }
                onCalendarChange={(calendar) =>
                  updateWorkspace((current) => ({ ...current, calendar }))
                }
              />
            ) : null}
          </div>
        </section>
      </div>
    </main>
  );
}

function NavButton({
  active,
  item,
  onClick,
}: {
  active: boolean;
  item: (typeof navItems)[number];
  onClick: () => void;
}) {
  const Icon = item.icon;

  return (
    <button
      className={cn(
        "flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-left text-sm font-medium transition-colors",
        active
          ? "bg-primary text-primary-foreground"
          : "text-muted-foreground hover:bg-muted hover:text-foreground",
      )}
      onClick={onClick}
      type="button"
    >
      <Icon className="h-4 w-4 shrink-0" />
      <span>{item.label}</span>
    </button>
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

function ManagementDashboardView({ data }: { data: MarketingWorkspaceData }) {
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

  return (
    <section className="space-y-4">
      <Card>
        <CardHeader>
          <SectionTitle
            icon={BarChart3}
            kicker="Management"
            title="UCC Marketing Command Dashboard"
            description="Objective-first overview across campaigns, channels, budget, approvals, leads, applications, enrolments, and next actions."
          />
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <LearningMetric
            label="Active campaigns"
            value={String(data.ucc.campaigns.filter((item) => item.status === "active").length)}
            detail={`${data.ucc.campaigns.length} total campaigns`}
          />
          <LearningMetric
            label="Leads generated"
            value={formatNumber(totalLeads)}
            detail={`${formatNumber(data.ucc.kpiRecords.reduce((sum, row) => sum + row.applications, 0))} applications tracked`}
          />
          <LearningMetric
            label="Budget used"
            value={`${formatNumber(totalSpend)} / ${formatNumber(totalBudget)}`}
            detail="Actual spend versus planned campaign cost"
          />
          <LearningMetric
            label="Approval watch"
            value={String(delayedItems.length)}
            detail="Items in draft, review, or revision"
          />
        </CardContent>
      </Card>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_390px]">
        <Card>
          <CardHeader>
            <CardTitle>Objective Cascade</CardTitle>
            <CardDescription>
              Business objective to audience, course, platform, campaign, content,
              budget, KPI, actual result, and recommendation.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {data.ucc.campaigns.slice(0, 4).map((campaign) => {
              const course = findCourse(data.ucc, campaign.courseId);
              const audience = findAudience(data.ucc, campaign.audienceId);
              const budget = data.ucc.budgetPlans.find(
                (row) => row.campaignId === campaign.id,
              );
              const campaignKpis = data.ucc.kpiRecords.filter(
                (row) => row.campaignId === campaign.id,
              );

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
                    <p><span className="font-medium">Budget:</span> {formatNumber(budget?.totalCost ?? campaign.budget)}</p>
                  </div>
                  <p className="mt-3 text-xs leading-5 text-muted-foreground">
                    Recommendation: {campaignKpis[0]?.recommendation ?? "Add KPI results to generate the next action."}
                  </p>
                </div>
              );
            })}
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
                `${data.calendar.filter((item) => item.status === "posted" || item.approvalStage === "published").length} items posted or published`,
                `${delayedItems.length} items delayed or still in review`,
                `${strongKpis.length} channels on track or exceeding target`,
              ]}
              title="What happened"
              variant="info"
            />
            <InsightList
              items={[
                ...weakKpis.map((row) => row.recommendation),
                "Review Chinese-language proof content for PRC students and parents before the next campaign cycle.",
              ].slice(0, 4)}
              title="Next actions"
              variant="warning"
            />
          </CardContent>
        </Card>
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

function makeNewCourse(): UccCourse {
  return {
    id: `course-${Date.now()}`,
    name: "",
    category: "Full-time courses",
    audienceIds: [],
    courseProof: [],
    complianceNotes: "",
    status: "active",
    description: "",
    usp: "",
    duration: "",
    entryRequirements: "",
    fees: "",
    sellingPoints: [],
  };
}

function makeNewAudience(): UccAudience {
  return {
    id: `audience-${Date.now()}`,
    name: "",
    languages: [],
    motivations: [],
    concerns: [],
    recommendedChannels: [],
    nurtureAngle: "",
    interests: [],
    buyingJourney: "",
    decisionMakers: "",
  };
}

function courseStatusLabel(status: UccCourse["status"]) {
  return status.charAt(0).toUpperCase() + status.slice(1);
}

function CoursesAudiencesView({
  onUccChange,
  ucc,
}: {
  onUccChange: (ucc: UccStrategyData) => void;
  ucc: UccStrategyData;
}) {
  const [showArchived, setShowArchived] = useState(false);
  const [courseEditor, setCourseEditor] = useState<UccCourse | null>(null);
  const [audienceEditor, setAudienceEditor] = useState<UccAudience | null>(null);

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
        `Delete the course "${course.name || "Untitled"}"? This cannot be undone.`,
      );

      if (!confirmed) {
        return;
      }
    }

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
        `Delete the audience "${audience.name || "Untitled"}"? This cannot be undone.`,
      );

      if (!confirmed) {
        return;
      }
    }

    onUccChange({
      ...ucc,
      audiences: ucc.audiences.filter((row) => row.id !== audience.id),
    });
  }

  const liveCourses = ucc.courses.filter((course) => course.status !== "archived");
  const visibleCourses = showArchived ? ucc.courses : liveCourses;

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
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1040px] text-left text-sm">
                <thead className="border-b text-xs uppercase text-muted-foreground">
                  <tr>
                    <th className="py-3 pr-4 font-medium">Course</th>
                    <th className="py-3 pr-4 font-medium">Category</th>
                    <th className="py-3 pr-4 font-medium">Supporting evidence</th>
                    <th className="py-3 pr-4 font-medium">Compliance</th>
                    <th className="py-3 pr-4 font-medium">Status</th>
                    <th className="py-3 pr-4 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {visibleCourses.map((course) => (
                    <tr key={course.id}>
                      <td className="min-w-[220px] py-3 pr-4">
                        <Input
                          value={course.name}
                          onChange={(event) =>
                            updateCourse(course.id, { name: event.target.value })
                          }
                        />
                      </td>
                      <td className="min-w-[170px] py-3 pr-4">{course.category}</td>
                      <td className="min-w-[240px] py-3 pr-4">
                        <Textarea
                          value={course.courseProof.join("\n")}
                          onChange={(event) =>
                            updateCourse(course.id, {
                              courseProof: textToList(event.target.value),
                            })
                          }
                        />
                      </td>
                      <td className="min-w-[240px] py-3 pr-4">
                        <Textarea
                          value={course.complianceNotes}
                          onChange={(event) =>
                            updateCourse(course.id, {
                              complianceNotes: event.target.value,
                            })
                          }
                        />
                      </td>
                      <td className="min-w-[130px] py-3 pr-4">
                        {course.status === "archived" ? (
                          <Badge variant="secondary">Archived</Badge>
                        ) : (
                          <NativeSelect
                            value={course.status}
                            onChange={(event) =>
                              updateCourse(course.id, {
                                status: event.target.value as UccCourse["status"],
                              })
                            }
                          >
                            <option value="active">Active</option>
                            <option value="future">Future</option>
                            <option value="paused">Paused</option>
                          </NativeSelect>
                        )}
                      </td>
                      <td className="min-w-[240px] py-3 pr-4">
                        <div className="flex flex-wrap gap-1.5">
                          <Button
                            onClick={() => setCourseEditor(course)}
                            size="sm"
                            type="button"
                            variant="outline"
                          >
                            Edit
                          </Button>
                          {course.status === "archived" ? (
                            <Button
                              onClick={() => updateCourse(course.id, { status: "active" })}
                              size="sm"
                              type="button"
                              variant="outline"
                            >
                              <ArchiveRestore className="h-4 w-4" />
                              Unarchive
                            </Button>
                          ) : (
                            <Button
                              onClick={() => updateCourse(course.id, { status: "archived" })}
                              size="sm"
                              type="button"
                              variant="outline"
                            >
                              <Archive className="h-4 w-4" />
                              Archive
                            </Button>
                          )}
                          <Button
                            onClick={() => deleteCourse(course)}
                            size="sm"
                            type="button"
                            variant="outline"
                          >
                            <Trash2 className="h-4 w-4" />
                            Delete
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
  aiIntegration,
  auditInsights,
  brief,
  campaignSuggestions,
  competitorInsights,
  onCampaignSuggestionsChange,
  onRecordUsage,
  onUccChange,
  ucc,
}: {
  aiIntegration: AiIntegrationSettings;
  auditInsights: AuditInsight[];
  brief: StrategyBrief;
  campaignSuggestions: CampaignSuggestion[];
  competitorInsights: CompetitorInsight[];
  onCampaignSuggestionsChange: (campaignSuggestions: CampaignSuggestion[]) => void;
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
      const response = await fetch("/api/ai/campaigns", {
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
            courses: ucc.courses
              .filter((course) => course.status !== "archived")
              .map((course) => ({
                name: course.name,
                category: course.category,
                usp: course.usp ?? "",
              })),
            audiences: ucc.audiences.map((audience) => ({
              name: audience.name,
              goals: audience.motivations,
              painPoints: audience.concerns,
            })),
            existingCampaignNames: ucc.campaigns.map((campaign) => campaign.name),
            sgMoments: formatMomentsForPrompt(upcomingSgMoments(new Date())),
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
        `Delete the campaign "${campaign.name}"? This cannot be undone.`,
      );

      if (!confirmed) {
        return;
      }
    }

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

  const offlineActivities: Array<{
    channel: UccMarketingChannel;
    purpose: string;
    owner: Role;
    kpi: string;
  }> = [
    {
      channel: "Agent activity",
      purpose: "Recruit and enable agents with course proof packs and response workflow.",
      owner: "marketing manager",
      kpi: "Agent enquiries, qualified agents, referred applications",
    },
    {
      channel: "Campus visit",
      purpose: "Convert parent and student interest into verified campus tour bookings.",
      owner: "marketing manager",
      kpi: "Tour bookings, attended visits, applications after visit",
    },
    {
      channel: "Student event",
      purpose: "Capture authentic campus life, testimonials, and proof content.",
      owner: "video editor",
      kpi: "Reusable assets, student participation, event recap reach",
    },
    {
      channel: "Roadshow",
      purpose: "Build awareness and collect course-fit enquiries in high-intent locations.",
      owner: "marketing manager",
      kpi: "Leads, cost per lead, applications",
    },
    {
      channel: "Partnership",
      purpose: "Create B2B collaborations with schools, employers, and education partners.",
      owner: "marketing manager",
      kpi: "Partner meetings, MoUs, referred leads",
    },
    {
      channel: "Talk",
      purpose: "Position UCC around AI, English, business, and pathway education topics.",
      owner: "copywriter",
      kpi: "Registrations, attendance, follow-up enquiries",
    },
    {
      channel: "Flyers",
      purpose: "Support fairs, open house, school visits, and agent handoffs with factual proof.",
      owner: "graphic designer",
      kpi: "QR scans, enquiries, event sign-ups",
    },
    {
      channel: "Education fair",
      purpose: "Meet students, parents, agents, and partners in market-facing education moments.",
      owner: "marketing manager",
      kpi: "Leads, applications, partner enquiries",
    },
    {
      channel: "School visit",
      purpose: "Build trust with schools and introduce UCC course pathways without hard selling.",
      owner: "marketing manager",
      kpi: "School contacts, talk invites, student enquiries",
    },
    {
      channel: "Open house",
      purpose: "Convert interest into campus visits with transparent admissions and course proof.",
      owner: "marketing manager",
      kpi: "Bookings, attendance, applications",
    },
  ];

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

      <Card>
        <CardHeader>
          <CardTitle>Offline & Non-Digital Activation Board</CardTitle>
          <CardDescription>
            Campaign support for agent activities, campus visits, student events,
            roadshows, partnerships, talks, flyers, fairs, school visits, and open house.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[920px] text-left text-sm">
              <thead className="border-b text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="py-3 pr-4 font-medium">Activity</th>
                  <th className="py-3 pr-4 font-medium">Marketing purpose</th>
                  <th className="py-3 pr-4 font-medium">Owner</th>
                  <th className="py-3 pr-4 font-medium">KPI to track</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {offlineActivities.map((activity) => (
                  <tr key={activity.channel}>
                    <td className="min-w-[160px] py-3 pr-4 font-medium">
                      {activity.channel}
                    </td>
                    <td className="min-w-[340px] py-3 pr-4 text-muted-foreground">
                      {activity.purpose}
                    </td>
                    <td className="min-w-[160px] py-3 pr-4">{activity.owner}</td>
                    <td className="min-w-[280px] py-3 pr-4">{activity.kpi}</td>
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

function PlatformStrategyView({
  onUccChange,
  ucc,
}: {
  onUccChange: (ucc: UccStrategyData) => void;
  ucc: UccStrategyData;
}) {
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

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_420px]">
        <Card>
          <CardHeader>
            <CardTitle>Platform Data Integration</CardTitle>
            <CardDescription>
              Direct APIs are prepared where credentials are available; CSV/PDF
              import remains the fallback for manual or restricted platforms.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[920px] text-left text-sm">
                <thead className="border-b text-xs uppercase text-muted-foreground">
                  <tr>
                    <th className="py-3 pr-4 font-medium">Platform</th>
                    <th className="py-3 pr-4 font-medium">Mode</th>
                    <th className="py-3 pr-4 font-medium">Status</th>
                    <th className="py-3 pr-4 font-medium">Metrics</th>
                    <th className="py-3 pr-4 font-medium">Notes</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {ucc.connectors.map((connector) => (
                    <tr key={connector.id}>
                      <td className="py-3 pr-4 font-medium">{connector.platform}</td>
                      <td className="py-3 pr-4">{connector.mode}</td>
                      <td className="py-3 pr-4">
                        <Badge
                          variant={
                            connector.status === "ready"
                              ? "success"
                              : connector.status === "needs credentials"
                                ? "warning"
                                : "secondary"
                          }
                        >
                          {connector.status}
                        </Badge>
                      </td>
                      <td className="min-w-[260px] py-3 pr-4">
                        {connector.supportedMetrics.join(", ")}
                      </td>
                      <td className="min-w-[280px] py-3 pr-4 text-muted-foreground">
                        {connector.notes}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Marketing Calendar Intelligence</CardTitle>
            <CardDescription>
              Singapore holidays, school periods, intake windows, agent cycles,
              campus events, and shopping-date campaign moments.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
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
      </div>

      <AiSkillControlPanel
        modules={ucc.aiModules}
        onModulesChange={(aiModules) => onUccChange({ ...ucc, aiModules })}
      />
    </section>
  );
}

function AiSkillControlPanel({
  modules,
  onModulesChange,
}: {
  modules: UccAiModule[];
  onModulesChange: (modules: UccAiModule[]) => void;
}) {
  const [selectedModuleId, setSelectedModuleId] = useState(modules[0]?.id ?? "");
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
      <CardHeader>
        <SectionTitle
          icon={BookOpenText}
          kicker="AI QA"
          title="AI Skill Control Panel"
          description="Separate AI modules with input sources, output destinations, reviewer controls, risk level, guardrails, and saved output history."
        />
      </CardHeader>
      <CardContent className="space-y-4">
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
                    <NativeSelect
                      value={module.status}
                      onChange={(event) =>
                        updateModule(module.id, {
                          status: event.target.value as UccAiModule["status"],
                        })
                      }
                    >
                      <option value="active">Active</option>
                      <option value="disabled">Disabled</option>
                      <option value="needs setup">Needs Setup</option>
                    </NativeSelect>
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
                    <NativeSelect
                      value={module.reviewerRequired ? "yes" : "no"}
                      onChange={(event) =>
                        updateModule(module.id, {
                          reviewerRequired: event.target.value === "yes",
                        })
                      }
                    >
                      <option value="yes">Yes</option>
                      <option value="no">No</option>
                    </NativeSelect>
                  </td>
                  <td className="min-w-[130px] py-3 pr-4">
                    <NativeSelect
                      value={module.riskLevel}
                      onChange={(event) =>
                        updateModule(module.id, {
                          riskLevel: event.target.value as UccAiModule["riskLevel"],
                        })
                      }
                    >
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                    </NativeSelect>
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
      </CardContent>
    </Card>
  );
}

function AssetLibraryView({
  calendar,
  onUccChange,
  ucc,
}: {
  calendar: CalendarItem[];
  onUccChange: (ucc: UccStrategyData) => void;
  ucc: UccStrategyData;
}) {
  const [assetMessage, setAssetMessage] = useState<{
    tone: "success" | "error" | "info";
    text: string;
  } | null>(null);
  const [uploading, setUploading] = useState(false);

  const supabaseConfigured = Boolean(resolveSupabaseConfig().config);

  function updateAsset(id: string, patch: Partial<UccAsset>) {
    onUccChange({
      ...ucc,
      assets: ucc.assets.map((asset) =>
        asset.id === id ? { ...asset, ...patch } : asset,
      ),
    });
  }

  function guessAssetType(file: File): UccAsset["type"] {
    if (file.type.startsWith("image/")) {
      return "photo";
    }

    if (file.type.startsWith("video/")) {
      return "video";
    }

    return "campaign asset";
  }

  async function uploadFile(file: File) {
    const resolved = resolveSupabaseConfig();

    if (!resolved.config) {
      setAssetMessage({
        tone: "error",
        text: "Connect Supabase in Settings to upload files. You can still add link-only entries below.",
      });
      return;
    }

    setUploading(true);
    setAssetMessage(null);

    try {
      const { publicUrl, storagePath } = await uploadAssetFile(resolved.config, file);
      onUccChange({
        ...ucc,
        assets: [
          {
            id: `asset-${Date.now()}`,
            name: file.name,
            type: guessAssetType(file),
            courseId: "",
            campaignId: "",
            language: "English",
            status: "draft",
            url: publicUrl,
            usageNotes: "",
            storagePath,
            calendarItemId: "",
          },
          ...ucc.assets,
        ],
      });
      setAssetMessage({ tone: "success", text: `Uploaded ${file.name}.` });
    } catch (error) {
      setAssetMessage({
        tone: "error",
        text: `Upload failed: ${error instanceof Error ? error.message : String(error)}. If the bucket does not exist yet, create a public bucket named "assets" in Supabase Storage.`,
      });
    } finally {
      setUploading(false);
    }
  }

  function addLinkEntry() {
    onUccChange({
      ...ucc,
      assets: [
        {
          id: `asset-${Date.now()}`,
          name: "New link asset",
          type: "campaign asset",
          courseId: "",
          campaignId: "",
          language: "English",
          status: "draft",
          url: "",
          usageNotes: "",
          storagePath: "",
          calendarItemId: "",
        },
        ...ucc.assets,
      ],
    });
  }

  async function deleteAsset(asset: UccAsset) {
    if (typeof window !== "undefined") {
      const confirmed = window.confirm(
        `Delete the asset "${asset.name}"?${asset.storagePath ? " The stored file will also be removed from Supabase Storage." : ""} This cannot be undone.`,
      );

      if (!confirmed) {
        return;
      }
    }

    if (asset.storagePath) {
      const resolved = resolveSupabaseConfig();

      if (resolved.config) {
        try {
          await deleteAssetFile(resolved.config, asset.storagePath);
        } catch (error) {
          setAssetMessage({
            tone: "error",
            text: `The entry was removed, but deleting the stored file failed: ${
              error instanceof Error ? error.message : String(error)
            }`,
          });
        }
      }
    }

    onUccChange({
      ...ucc,
      assets: ucc.assets.filter((row) => row.id !== asset.id),
    });
  }

  function isImageAsset(asset: UccAsset) {
    return (
      asset.type === "photo" ||
      asset.type === "logo" ||
      asset.type === "course image" ||
      /\.(png|jpe?g|gif|webp|svg)(\?|$)/i.test(asset.url)
    );
  }

  return (
    <section className="space-y-4">
      <Card>
        <CardHeader className="flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <SectionTitle
            icon={FileText}
            kicker="Assets"
            title="Content Asset Library"
            description="Photos, videos, testimonials, course images, logos, templates, approved captions, and campaign assets."
          />
          <div className="flex flex-col items-stretch gap-2 sm:items-end">
            <div className="flex flex-wrap gap-2 sm:justify-end">
              <label
                className={cn(
                  "inline-flex h-9 cursor-pointer items-center gap-2 rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90",
                  (!supabaseConfigured || uploading) && "pointer-events-none opacity-50",
                )}
              >
                <FileUp className="h-4 w-4" />
                {uploading ? "Uploading" : "Upload file"}
                <input
                  className="sr-only"
                  disabled={!supabaseConfigured || uploading}
                  onChange={(event) => {
                    const file = event.target.files?.[0];

                    if (file) {
                      void uploadFile(file);
                    }

                    event.target.value = "";
                  }}
                  type="file"
                />
              </label>
              <Button onClick={addLinkEntry} size="sm" type="button" variant="outline">
                <Plus className="h-4 w-4" />
                Add link entry
              </Button>
            </div>
            {!supabaseConfigured ? (
              <p className="text-xs leading-5 text-muted-foreground">
                File upload needs Supabase connected in Settings. Link-only
                entries still work.
              </p>
            ) : null}
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {assetMessage ? (
            <div
              className={cn(
                "rounded-md border p-3 text-xs leading-5",
                assetMessage.tone === "error"
                  ? "border-warning-border bg-warning text-warning-foreground"
                  : assetMessage.tone === "success"
                    ? "border-success-border bg-success text-success-foreground"
                    : "bg-muted/30 text-muted-foreground",
              )}
            >
              {assetMessage.text}
            </div>
          ) : null}

          <div className="overflow-x-auto">
            <table className="w-full min-w-[1420px] text-left text-sm">
              <thead className="border-b text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="py-3 pr-4 font-medium">Preview</th>
                  <th className="py-3 pr-4 font-medium">Asset</th>
                  <th className="py-3 pr-4 font-medium">Type</th>
                  <th className="py-3 pr-4 font-medium">Language</th>
                  <th className="py-3 pr-4 font-medium">Status</th>
                  <th className="py-3 pr-4 font-medium">Campaign</th>
                  <th className="py-3 pr-4 font-medium">Calendar item</th>
                  <th className="py-3 pr-4 font-medium">Link</th>
                  <th className="py-3 pr-4 font-medium">Usage notes</th>
                  <th className="py-3 pr-4 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {ucc.assets.map((asset) => (
                  <tr key={asset.id}>
                    <td className="min-w-[90px] py-3 pr-4">
                      {isImageAsset(asset) && asset.url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          alt={asset.name}
                          className="h-14 w-14 rounded-md border object-cover"
                          src={asset.url}
                        />
                      ) : (
                        <div className="flex h-14 w-14 items-center justify-center rounded-md border bg-muted/30">
                          <FileText className="h-5 w-5 text-muted-foreground" />
                        </div>
                      )}
                    </td>
                    <td className="min-w-[220px] py-3 pr-4">
                      <Input
                        value={asset.name}
                        onChange={(event) =>
                          updateAsset(asset.id, { name: event.target.value })
                        }
                      />
                    </td>
                    <td className="min-w-[150px] py-3 pr-4">{asset.type}</td>
                    <td className="min-w-[140px] py-3 pr-4">{asset.language}</td>
                    <td className="min-w-[150px] py-3 pr-4">
                      <NativeSelect
                        value={asset.status}
                        onChange={(event) =>
                          updateAsset(asset.id, {
                            status: event.target.value as UccAsset["status"],
                          })
                        }
                      >
                        <option value="draft">Draft</option>
                        <option value="approved">Approved</option>
                        <option value="needs update">Needs update</option>
                      </NativeSelect>
                    </td>
                    <td className="min-w-[190px] py-3 pr-4">
                      <NativeSelect
                        value={asset.campaignId}
                        onChange={(event) =>
                          updateAsset(asset.id, { campaignId: event.target.value })
                        }
                      >
                        <option value="">Not linked</option>
                        {ucc.campaigns.map((campaign) => (
                          <option key={campaign.id} value={campaign.id}>
                            {campaign.name}
                          </option>
                        ))}
                      </NativeSelect>
                    </td>
                    <td className="min-w-[210px] py-3 pr-4">
                      <NativeSelect
                        value={asset.calendarItemId ?? ""}
                        onChange={(event) =>
                          updateAsset(asset.id, { calendarItemId: event.target.value })
                        }
                      >
                        <option value="">Not linked</option>
                        {calendar.map((item) => (
                          <option key={item.id} value={item.id}>
                            {item.date} {item.platform}: {item.contentTopic.slice(0, 30)}
                          </option>
                        ))}
                      </NativeSelect>
                    </td>
                    <td className="min-w-[200px] py-3 pr-4">
                      <Input
                        value={asset.url}
                        onChange={(event) =>
                          updateAsset(asset.id, { url: event.target.value })
                        }
                      />
                    </td>
                    <td className="min-w-[240px] py-3 pr-4">
                      <Textarea
                        value={asset.usageNotes}
                        onChange={(event) =>
                          updateAsset(asset.id, { usageNotes: event.target.value })
                        }
                      />
                    </td>
                    <td className="min-w-[110px] py-3 pr-4">
                      <Button
                        onClick={() => void deleteAsset(asset)}
                        size="sm"
                        type="button"
                        variant="outline"
                      >
                        <Trash2 className="h-4 w-4" />
                        Delete
                      </Button>
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
      const response = await fetch("/api/ai/insights", {
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
  onRecordUsage,
  onUccChange,
}: {
  data: MarketingWorkspaceData;
  onAiRecommendationsChange: (aiRecommendations: AiRecommendation[]) => void;
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
      `Delete the budget line for ${campaignName}? This cannot be undone from this screen.`,
    );

    if (!confirmed) {
      return;
    }

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
  onPerformanceChange,
  onRecordUsage,
}: {
  data: MarketingWorkspaceData;
  onAiRecommendationsChange: (aiRecommendations: AiRecommendation[]) => void;
  onPerformanceChange: (performanceResults: PerformanceResult[]) => void;
  onRecordUsage: (module: string, model: string, usage: OpenAiUsage) => void;
}) {
  return (
    <section className="space-y-4">
      <Card>
        <CardHeader>
          <SectionTitle
            icon={TrendingUp}
            kicker="KPI"
            title="KPI Versus Target Tracker"
            description="Campaign, course, platform, lead, application, enrolment, cost, conversion, and performance status tracking."
          />
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1120px] text-left text-sm">
              <thead className="border-b text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="py-3 pr-4 font-medium">Campaign</th>
                  <th className="py-3 pr-4 font-medium">Course</th>
                  <th className="py-3 pr-4 font-medium">Channel</th>
                  <th className="py-3 pr-4 font-medium">Leads</th>
                  <th className="py-3 pr-4 font-medium">Applications</th>
                  <th className="py-3 pr-4 font-medium">Tours</th>
                  <th className="py-3 pr-4 font-medium">Enrolments</th>
                  <th className="py-3 pr-4 font-medium">CPL</th>
                  <th className="py-3 pr-4 font-medium">Status</th>
                  <th className="py-3 pr-4 font-medium">Recommendation</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {data.ucc.kpiRecords.map((row) => (
                  <tr key={row.id}>
                    <td className="min-w-[220px] py-3 pr-4">
                      {findCampaign(data.ucc, row.campaignId)?.name}
                    </td>
                    <td className="min-w-[190px] py-3 pr-4">
                      {findCourse(data.ucc, row.courseId)?.category}
                    </td>
                    <td className="py-3 pr-4">{row.channel}</td>
                    <td className="py-3 pr-4">{row.leads}</td>
                    <td className="py-3 pr-4">{row.applications}</td>
                    <td className="py-3 pr-4">{row.campusTourBookings}</td>
                    <td className="py-3 pr-4">{row.enrolments}</td>
                    <td className="py-3 pr-4">{formatNumber(calculateCostPerLead(row))}</td>
                    <td className="py-3 pr-4">
                      <StatusLabel status={row.status} />
                    </td>
                    <td className="min-w-[320px] py-3 pr-4 text-muted-foreground">
                      {row.recommendation}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
      <AiRecommendationPanel
        buttonLabel="Generate insights with AI"
        data={data}
        explainer="The AI compares plan against actual results, cost per lead, and platform analytics, then drafts recommendations. Every one stays a draft until you accept or dismiss it."
        module="kpi"
        onAiRecommendationsChange={onAiRecommendationsChange}
        onRecordUsage={onRecordUsage}
        usageLabel="KPI insights"
      />
      <PerformanceLearningView data={data} onPerformanceChange={onPerformanceChange} />
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
      const response = await fetch("/api/compliance/extract", {
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
      const response = await fetch("/api/ai/compliance", {
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

function ReportsView({ data }: { data: MarketingWorkspaceData }) {
  const delayed = data.calendar.filter((item) =>
    ["drafting", "review", "revision"].includes(item.status) ||
    item.approvalStage === "revision",
  );
  const topRecommendations = data.ucc.kpiRecords.map((row) => row.recommendation);

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
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_380px]">
        <ExportView data={data} />
        <Card>
          <CardHeader>
            <CardTitle>Recommended Next Actions</CardTitle>
            <CardDescription>
              AI-style recommendations from actual KPI and performance data.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {topRecommendations.map((recommendation) => (
              <div className="rounded-lg border bg-muted/20 p-3 text-sm leading-6" key={recommendation}>
                {recommendation}
              </div>
            ))}
            <div className="rounded-lg border bg-muted/20 p-3 text-sm leading-6">
              Repurpose high-save English course content to Xiaohongshu and WeChat with Chinese parent proof.
            </div>
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

        {sync.lastError && testState !== "error" ? (
          <p className="text-xs leading-5 text-muted-foreground">
            Last sync note: {sync.lastError}
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}

function pickDefaultModels(models: string[]) {
  const excluded = /embed|whisper|tts|audio|dall|image|moderation|search|realtime|transcribe|speech/i;
  const candidates = models.filter(
    (model) => /gpt|^o\d|reason|chat/i.test(model) && !excluded.test(model),
  );
  const pool = candidates.length > 0 ? candidates : models;
  const cheapPattern = /mini|nano|small|lite|flash/i;
  const utility = pool.find((model) => cheapPattern.test(model)) ?? pool[0] ?? "";
  const analysis =
    pool.find((model) => model !== utility && !cheapPattern.test(model)) ??
    pool.find((model) => model !== utility) ??
    pool[0] ??
    "";

  return { analysis, utility };
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
      const response = await fetch("/api/openai/models", {
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

      const defaults = pickDefaultModels(result.models);
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

function SettingsWorkspaceView({
  aiIntegration,
  aiUsage,
  brand,
  calendar,
  competitors,
  connections,
  importState,
  onAiIntegrationChange,
  onApplyMetrics,
  onRestoreWorkspace,
  workspaceData,
  onBrandChange,
  onCalendarChange,
  onCompetitorsChange,
  onConnectionsChange,
  onPdfDataSourceChange,
  onPdfReportApply,
  onPdfReportChange,
  onPdfReportDelete,
  onPdfReportUpload,
  onUccChange,
  pdfDataSource,
  sync,
  ucc,
}: {
  aiIntegration: AiIntegrationSettings;
  aiUsage: AiUsageEntry[];
  brand: BrandProfile;
  calendar: CalendarItem[];
  competitors: Competitor[];
  connections: PlatformConnection[];
  importState: PdfImportState;
  onRestoreWorkspace: (workspace: MarketingWorkspaceData) => void;
  workspaceData: MarketingWorkspaceData;
  onAiIntegrationChange: (aiIntegration: AiIntegrationSettings) => void;
  onApplyMetrics: (
    metrics: PlatformDataMetrics[],
    approvedBy: string,
    source: { label: string; noteLabel: string; rangeLabel: string; editedCount: number },
  ) => void;
  onBrandChange: <K extends keyof BrandProfile>(
    field: K,
    value: BrandProfile[K],
  ) => void;
  onCalendarChange: (calendar: CalendarItem[]) => void;
  onCompetitorsChange: (competitors: Competitor[]) => void;
  onConnectionsChange: (connections: PlatformConnection[]) => void;
  onPdfDataSourceChange: <K extends keyof PdfDataSourceSettings>(
    field: K,
    value: PdfDataSourceSettings[K],
  ) => void;
  onPdfReportApply: () => void;
  onPdfReportChange: (uploadId: string, patch: Partial<PdfReportUpload>) => void;
  onPdfReportDelete: (uploadId: string) => void;
  onPdfReportUpload: (files: FileList | null) => void | Promise<void>;
  onUccChange: (ucc: UccStrategyData) => void;
  pdfDataSource: PdfDataSourceSettings;
  sync: WorkspaceSync;
  ucc: UccStrategyData;
}) {
  const [pendingReview, setPendingReview] = useState<PendingMetricReview | null>(null);
  const [approverName, setApproverName] = useState("");
  const [csvMessage, setCsvMessage] = useState("");

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

  return (
    <section className="space-y-4">
      <AppearanceSettingsPanel />
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
      <BrandSetupView
        brand={brand}
        importState={importState}
        pdfDataSource={pdfDataSource}
        onBrandChange={onBrandChange}
        onPdfDataSourceChange={onPdfDataSourceChange}
        onPdfReportApply={onPdfReportApply}
        onPdfReportChange={onPdfReportChange}
        onPdfReportDelete={onPdfReportDelete}
        onPdfReportUpload={onPdfReportUpload}
      />
      <ConnectionManagerPanel
        connections={connections}
        onConnectionsChange={onConnectionsChange}
        onSyncReview={setPendingReview}
      />
      {pendingReview ? (
        <MetricReviewPanel
          approverName={approverName}
          onApply={handleApply}
          onApproverNameChange={setApproverName}
          onDiscard={() => setPendingReview(null)}
          onRowChange={handleRowChange}
          pending={pendingReview}
        />
      ) : null}
      <CsvImportPanel
        calendar={calendar}
        competitors={competitors}
        onCalendarChange={onCalendarChange}
        onCompetitorsChange={onCompetitorsChange}
        onMetricoolCsvParsed={(result) => {
          if (result.ok) {
            setPendingReview(result.pending);
            setCsvMessage("");
          } else {
            setCsvMessage(result.message);
          }
        }}
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


function CsvImportPanel({
  calendar,
  competitors,
  onCalendarChange,
  onCompetitorsChange,
  onMetricoolCsvParsed,
  onUccChange,
  ucc,
}: {
  calendar: CalendarItem[];
  competitors: Competitor[];
  onCalendarChange: (calendar: CalendarItem[]) => void;
  onCompetitorsChange: (competitors: Competitor[]) => void;
  onMetricoolCsvParsed: (
    result: { ok: true; pending: PendingMetricReview } | { ok: false; message: string },
  ) => void;
  onUccChange: (ucc: UccStrategyData) => void;
  ucc: UccStrategyData;
}) {
  async function importMetricoolCsv(file: File) {
    const result = parseMetricoolCsv(await file.text());

    if (!result.ok) {
      onMetricoolCsvParsed({
        ok: false,
        message: `${result.error} Headers found in the file: ${
          result.foundHeaders.length > 0 ? result.foundHeaders.join(", ") : "none"
        }.`,
      });
      return;
    }

    onMetricoolCsvParsed({
      ok: true,
      pending: {
        rows: buildPdfMetricReviewRows(result.metrics, "metricool-csv"),
        sourceLabel: `Metricool CSV import (${file.name})`,
        noteLabel: "Metricool CSV import",
        rangeLabel: "the date range in the CSV export",
      },
    });
  }

  async function importCsv(
    target:
      | "courses"
      | "campaigns"
      | "calendar"
      | "kpi"
      | "budget"
      | "competitors"
      | "assets",
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
      onCalendarChange([...calendar, ...rows.map((row) => csvToCalendarItem(row, ucc))]);
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

    if (target === "assets") {
      onUccChange({ ...ucc, assets: [...ucc.assets, ...rows.map((row) => csvToAsset(row, ucc))] });
    }
  }

  const targets = [
    ["courses", "Courses"],
    ["campaigns", "Campaigns"],
    ["calendar", "Content calendar"],
    ["kpi", "KPI results / leads"],
    ["budget", "Budget / resources"],
    ["competitors", "Competitor tracking"],
    ["assets", "Asset library"],
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
          Import Metricool CSV
          <input
            accept=".csv,text/csv"
            className="sr-only"
            onChange={(event) => {
              const file = event.target.files?.[0];

              if (file) {
                void importMetricoolCsv(file);
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
  importState,
  pdfDataSource,
  onBrandChange,
  onPdfDataSourceChange,
  onPdfReportApply,
  onPdfReportChange,
  onPdfReportDelete,
  onPdfReportUpload,
}: {
  brand: BrandProfile;
  importState: PdfImportState;
  pdfDataSource: PdfDataSourceSettings;
  onBrandChange: <K extends keyof BrandProfile>(
    field: K,
    value: BrandProfile[K],
  ) => void;
  onPdfDataSourceChange: <K extends keyof PdfDataSourceSettings>(
    field: K,
    value: PdfDataSourceSettings[K],
  ) => void;
  onPdfReportApply: () => void;
  onPdfReportChange: (uploadId: string, patch: Partial<PdfReportUpload>) => void;
  onPdfReportDelete: (uploadId: string) => void;
  onPdfReportUpload: (files: FileList | null) => void | Promise<void>;
}) {
  const selectedUpload =
    pdfDataSource.uploads.find(
      (upload) => upload.id === pdfDataSource.selectedUploadId,
    ) ?? pdfDataSource.uploads[0];

  async function handleGuidelineFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    onBrandChange("brandGuidelines", await file.text());
  }

  function updatePdfReviewMetric(
    upload: PdfReportUpload,
    rowId: string,
    patch: Partial<PdfMetricReview>,
  ) {
    onPdfReportChange(upload.id, {
      reviewMetrics: (upload.reviewMetrics ?? []).map((row) =>
        row.id === rowId ? { ...row, ...patch, edited: true } : row,
      ),
    });
  }

  return (
    <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
      <Card>
        <CardHeader>
          <SectionTitle
            icon={Settings2}
            kicker="Step 1"
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
            <CardTitle>Brand Colors</CardTitle>
            <CardDescription>Editable swatches for template direction.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {brand.brandColors.map((color, index) => (
              <div className="flex items-center gap-3" key={`${color}-${index}`}>
                <input
                  aria-label={`Brand color ${index + 1}`}
                  className="h-10 w-12 rounded-md border bg-background"
                  onChange={(event) => {
                    const nextColors = [...brand.brandColors];
                    nextColors[index] = event.target.value;
                    onBrandChange("brandColors", nextColors);
                  }}
                  type="color"
                  value={color}
                />
                <Input
                  value={color}
                  onChange={(event) => {
                    const nextColors = [...brand.brandColors];
                    nextColors[index] = event.target.value;
                    onBrandChange("brandColors", nextColors);
                  }}
                />
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-secondary text-secondary-foreground">
                <FileUp className="h-5 w-5" />
              </div>
              <div>
                <CardTitle>PDF Data Reports</CardTitle>
                <CardDescription className="mt-2 leading-6">
                  Upload analytics PDF files to extract actual report metrics and
                  apply them into audit and performance learning.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <label
              className={cn(
                "flex cursor-pointer items-center justify-center gap-2 rounded-md border border-dashed bg-muted/30 px-3 py-4 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted",
                importState.status === "loading" && "cursor-wait opacity-70",
              )}
            >
              <FileUp className="h-4 w-4" />
              {importState.status === "loading"
                ? "Reading PDF reports"
                : "Upload PDF reports"}
              <input
                accept="application/pdf,.pdf"
                className="sr-only"
                disabled={importState.status === "loading"}
                multiple
                onChange={(event) => {
                  void onPdfReportUpload(event.target.files);
                  event.target.value = "";
                }}
                type="file"
              />
            </label>

            <div className="rounded-lg border border-info-border bg-info p-3 text-info-foreground">
              <div className="flex gap-2">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                <p className="text-xs leading-5">
                  The app reads text and tables from uploaded analytics PDFs, then
                  searches for reach, engagement, followers, comments, clicks,
                  saves, shares, watch time, and post counts. Some scanned PDFs may
                  still need a corrected text export.
                </p>
              </div>
            </div>

            {pdfDataSource.uploads.length === 0 ? (
              <EmptyState
                action="Upload a PDF analytics export to begin."
                icon={FileText}
                title="No PDF reports uploaded"
              />
            ) : (
              <div className="space-y-3">
                <Field label="Selected PDF report">
                  <NativeSelect
                    value={selectedUpload?.id ?? ""}
                    onChange={(event) =>
                      onPdfDataSourceChange("selectedUploadId", event.target.value)
                    }
                  >
                    {pdfDataSource.uploads.map((upload) => (
                      <option key={upload.id} value={upload.id}>
                        {upload.fileName}
                      </option>
                    ))}
                  </NativeSelect>
                </Field>

                {selectedUpload ? (
                  <div className="space-y-3 rounded-lg border bg-muted/20 p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold">
                          {selectedUpload.fileName}
                        </p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {formatFileSize(selectedUpload.fileSize)} / uploaded{" "}
                          {formatShortDate(selectedUpload.uploadedAt)}
                        </p>
                        <div className="mt-2 flex flex-wrap gap-2">
                          <Badge
                            variant={
                              selectedUpload.extractionStatus === "error"
                                ? "warning"
                                : selectedUpload.extractionStatus === "success"
                                  ? "success"
                                  : "secondary"
                            }
                          >
                            {selectedUpload.extractionStatus === "error"
                              ? "Needs review"
                              : selectedUpload.extractionStatus === "success"
                                ? "PDF read"
                                : "Uploaded"}
                          </Badge>
                          {selectedUpload.pageCount ? (
                            <Badge variant="outline">
                              {selectedUpload.pageCount} page
                              {selectedUpload.pageCount === 1 ? "" : "s"}
                            </Badge>
                          ) : null}
                          {selectedUpload.detectedMetricCount !== undefined ? (
                            <Badge variant="outline">
                              {selectedUpload.detectedMetricCount} metric set
                              {selectedUpload.detectedMetricCount === 1 ? "" : "s"}
                            </Badge>
                          ) : null}
                        </div>
                      </div>
                      <Button
                        onClick={() => onPdfReportDelete(selectedUpload.id)}
                        size="sm"
                        type="button"
                        variant="outline"
                      >
                        Remove
                      </Button>
                    </div>

                    <Field label="Report source">
                      <Input
                        value={selectedUpload.source}
                        onChange={(event) =>
                          onPdfReportChange(selectedUpload.id, {
                            source: event.target.value,
                          })
                        }
                      />
                    </Field>

                    <div className="grid gap-3 sm:grid-cols-2">
                      <Field label="Start date">
                        <Input
                          type="date"
                          value={selectedUpload.startDate}
                          onChange={(event) =>
                            onPdfReportChange(selectedUpload.id, {
                              startDate: event.target.value,
                            })
                          }
                        />
                      </Field>
                      <Field label="End date">
                        <Input
                          type="date"
                          value={selectedUpload.endDate}
                          onChange={(event) =>
                            onPdfReportChange(selectedUpload.id, {
                              endDate: event.target.value,
                            })
                          }
                        />
                      </Field>
                    </div>

                    {selectedUpload.extractionMessage ? (
                      <div className="rounded-md border bg-background p-3 text-xs leading-5 text-muted-foreground">
                        {selectedUpload.extractionMessage}
                      </div>
                    ) : null}

                    <Field label="Report notes">
                      <Textarea
                        value={selectedUpload.notes}
                        onChange={(event) =>
                          onPdfReportChange(selectedUpload.id, {
                            notes: event.target.value,
                          })
                        }
                      />
                    </Field>

                    <Field label="Extracted report text">
                      <Textarea
                        className="min-h-48"
                        placeholder="After upload, extracted PDF text appears here. You can correct labels like reach, engagement, saves, shares, clicks, comments, followers, and posts before re-applying."
                        value={selectedUpload.extractedText}
                        onChange={(event) =>
                          onPdfReportChange(selectedUpload.id, {
                            extractedText: event.target.value,
                          })
                        }
                      />
                    </Field>

                    <PdfImportReviewPanel
                      upload={selectedUpload}
                      onMetricChange={(rowId, patch) =>
                        updatePdfReviewMetric(selectedUpload, rowId, patch)
                      }
                      onUploadChange={(patch) =>
                        onPdfReportChange(selectedUpload.id, patch)
                      }
                    />

                    <Button
                      className="w-full"
                      disabled={
                        !selectedUpload.extractedText.trim() ||
                        !(selectedUpload.reviewMetrics ?? []).some(
                          (row) => row.approved,
                        )
                      }
                      onClick={onPdfReportApply}
                      type="button"
                    >
                      <FileText className="h-4 w-4" />
                      Apply approved data to KPI Tracker
                    </Button>
                  </div>
                ) : null}
              </div>
            )}

            <div className="rounded-lg border bg-muted/20 p-3">
              <Badge
                variant={
                  importState.status === "error"
                    ? "warning"
                    : importState.status === "success"
                      ? "success"
                      : "secondary"
                }
              >
                {pdfDataSource.lastImportedAt
                  ? `Last applied ${formatShortDate(pdfDataSource.lastImportedAt)}`
                  : "Not applied"}
              </Badge>
              <p className="mt-2 text-xs leading-5 text-muted-foreground">
                {importState.message || pdfDataSource.lastImportSummary}
              </p>
            </div>
          </CardContent>
        </Card>

        <PdfImportLogPanel pdfDataSource={pdfDataSource} />

        <Card>
          <CardHeader>
            <CardTitle>Brand Guidelines</CardTitle>
            <CardDescription>Paste notes or upload a text guideline file.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <label className="flex cursor-pointer items-center justify-center gap-2 rounded-md border border-dashed bg-muted/30 px-3 py-4 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted">
              <PenLine className="h-4 w-4" />
              Upload guidelines
              <input
                accept=".txt,.md,.csv"
                className="sr-only"
                onChange={handleGuidelineFile}
                type="file"
              />
            </label>
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

function PdfImportReviewPanel({
  onMetricChange,
  onUploadChange,
  upload,
}: {
  onMetricChange: (rowId: string, patch: Partial<PdfMetricReview>) => void;
  onUploadChange: (patch: Partial<PdfReportUpload>) => void;
  upload: PdfReportUpload;
}) {
  const rows = upload.reviewMetrics ?? [];
  const metricCount = countDetectedPdfMetrics(rows);
  const platformsDetected = rows.map((row) => row.platform);

  function refreshDetectedMetrics() {
    const refreshedRows = buildPdfMetricReviewRows(
      parsePdfReportMetrics(upload.extractedText),
    );

    onUploadChange({
      reviewMetrics: refreshedRows,
      detectedMetricCount: refreshedRows.length,
      detectedPlatforms: refreshedRows.map((row) => row.platform),
      confidenceLevel: getPdfConfidenceLevel(refreshedRows),
      approvalStatus: refreshedRows.length > 0 ? "needs review" : "error",
      warning:
        refreshedRows.length > 0
          ? ""
          : "No recognizable platform metrics were found after refreshing. Use a text-based export or OCR.",
    });
  }

  return (
    <div className="space-y-3 rounded-lg border bg-background p-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold">PDF Import Review</p>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">
            Review detected values before they update KPI Tracker and Performance
            Learning.
          </p>
        </div>
        <Badge
          variant={
            upload.confidenceLevel === "high"
              ? "success"
              : upload.confidenceLevel === "medium"
                ? "info"
                : "warning"
          }
        >
          {upload.confidenceLevel ?? "low"} confidence
        </Badge>
      </div>

      <Button
        disabled={!upload.extractedText.trim()}
        onClick={refreshDetectedMetrics}
        size="sm"
        type="button"
        variant="outline"
      >
        <RefreshCcw className="h-4 w-4" />
        Refresh detected metrics
      </Button>

      <div className="grid gap-2 text-xs leading-5 sm:grid-cols-3">
        <p>
          <span className="font-medium">Date range:</span> {upload.startDate} to{" "}
          {upload.endDate}
        </p>
        <p>
          <span className="font-medium">Platforms:</span>{" "}
          {platformsDetected.length > 0 ? platformsDetected.join(", ") : "None"}
        </p>
        <p>
          <span className="font-medium">Metrics:</span> {metricCount}
        </p>
      </div>

      {upload.warning ? (
        <div className="rounded-md border border-warning-border bg-warning p-3 text-xs leading-5 text-warning-foreground">
          {upload.warning}
        </div>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Reviewed by">
          <Input
            value={upload.reviewedBy ?? ""}
            onChange={(event) =>
              onUploadChange({ reviewedBy: event.target.value })
            }
          />
        </Field>
        <Field label="Approved by">
          <Input
            value={upload.approvedBy ?? ""}
            onChange={(event) =>
              onUploadChange({
                approvedBy: event.target.value,
                approvalStatus: event.target.value.trim()
                  ? "approved"
                  : "needs review",
              })
            }
          />
        </Field>
      </div>

      {rows.length === 0 ? (
        <EmptyState
          action="No platform metrics were detected. Check the extracted text, correct labels, or upload a text-based analytics export."
          icon={AlertTriangle}
          title="No review rows"
        />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1180px] text-left text-xs">
            <thead className="border-b uppercase text-muted-foreground">
              <tr>
                <th className="py-2 pr-3 font-medium">Apply</th>
                <th className="py-2 pr-3 font-medium">Platform</th>
                <th className="py-2 pr-3 font-medium">Confidence</th>
                {pdfReviewMetricFields.map((field) => (
                  <th className="py-2 pr-3 font-medium" key={field}>
                    {metricLabel(field)}
                  </th>
                ))}
                <th className="py-2 pr-3 font-medium">Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {rows.map((row) => (
                <tr key={row.id}>
                  <td className="py-2 pr-3">
                    <input
                      aria-label={`Approve ${row.platform} metrics`}
                      checked={row.approved}
                      onChange={(event) =>
                        onMetricChange(row.id, {
                          approved: event.target.checked,
                          edited: row.edited,
                        })
                      }
                      type="checkbox"
                    />
                  </td>
                  <td className="whitespace-nowrap py-2 pr-3 font-medium">
                    {row.platform}
                  </td>
                  <td className="whitespace-nowrap py-2 pr-3">
                    {row.confidence}%
                  </td>
                  {pdfReviewMetricFields.map((field) => (
                    <td className="min-w-[86px] py-2 pr-3" key={field}>
                      <Input
                        className="h-8"
                        type="number"
                        value={row[field]}
                        onChange={(event) =>
                          onMetricChange(row.id, {
                            [field]: toNumber(event.target.value),
                          } as Partial<PdfMetricReview>)
                        }
                      />
                    </td>
                  ))}
                  <td className="min-w-[240px] py-2 pr-3">
                    <Input
                      className="h-8"
                      value={row.notes}
                      onChange={(event) =>
                        onMetricChange(row.id, { notes: event.target.value })
                      }
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function PdfImportLogPanel({
  pdfDataSource,
}: {
  pdfDataSource: PdfDataSourceSettings;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>PDF Import Log</CardTitle>
        <CardDescription>
          Approved imports, edited values, applied metrics, and reviewer record.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {pdfDataSource.importLog.length === 0 ? (
          <p className="text-sm leading-6 text-muted-foreground">
            Approved PDF imports will appear here after review and apply.
          </p>
        ) : (
          pdfDataSource.importLog.slice(0, 6).map((entry) => (
            <div className="rounded-lg border bg-muted/20 p-3" key={entry.id}>
              <div className="flex flex-wrap items-start justify-between gap-2">
                <p className="text-sm font-semibold">{entry.fileName}</p>
                <Badge variant="success">{entry.appliedMetricCount} applied</Badge>
              </div>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">
                Approved by {entry.approvedBy} on {formatShortDate(entry.appliedAt)}
              </p>
              <p className="mt-2 text-xs leading-5">
                {entry.platforms.join(", ")} / {entry.editedMetricCount} edited row
                {entry.editedMetricCount === 1 ? "" : "s"}
              </p>
            </div>
          ))
        )}
      </CardContent>
    </Card>
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
  socialGoals,
  onChange,
  onMonthlyTargetChange,
}: {
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
        <div className="grid gap-4 lg:grid-cols-2">
          <Field label="Primary objective">
            <Textarea
              value={socialGoals.primaryObjective}
              onChange={(event) => onChange({ primaryObjective: event.target.value })}
            />
          </Field>
          <Field label="Target audience segment">
            <Textarea
              value={socialGoals.targetAudienceSegment}
              onChange={(event) =>
                onChange({ targetAudienceSegment: event.target.value })
              }
            />
          </Field>
        </div>

        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <Field label="Campaign window">
            <Input
              value={socialGoals.campaignWindow}
              onChange={(event) => onChange({ campaignWindow: event.target.value })}
            />
          </Field>
          <Field label="Funnel stage">
            <NativeSelect
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
          <Field label="North-star metric">
            <Input
              value={socialGoals.northStarMetric}
              onChange={(event) => onChange({ northStarMetric: event.target.value })}
            />
          </Field>
          <Field label="Goal owner">
            <NativeSelect
              value={socialGoals.owner}
              onChange={(event) => onChange({ owner: event.target.value as Role })}
            >
              {roles.map((role) => (
                <option key={role} value={role}>
                  {roleLabel(role)}
                </option>
              ))}
            </NativeSelect>
          </Field>
        </div>

        <Field label="Conversion action">
          <Input
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
            label="Content priorities"
            value={socialGoals.contentPriorities}
            onChange={(contentPriorities) => onChange({ contentPriorities })}
          />
          <div className="space-y-4">
            <Field label="Reporting cadence">
              <Input
                value={socialGoals.reportingCadence}
                onChange={(event) =>
                  onChange({ reportingCadence: event.target.value })
                }
              />
            </Field>
            <Field label="Goal notes">
              <Textarea
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

function SocialAuditView({
  aiIntegration,
  auditInsights,
  audits,
  socialGoals,
  ucc,
  onAuditInsightsChange,
  onAuditsChange,
  onRecordUsage,
  onSocialGoalsChange,
}: {
  aiIntegration: AiIntegrationSettings;
  auditInsights: AuditInsight[];
  audits: SocialAudit[];
  socialGoals: SocialGoalSettings;
  ucc: UccStrategyData;
  onAuditInsightsChange: (auditInsights: AuditInsight[]) => void;
  onAuditsChange: (audits: SocialAudit[]) => void;
  onRecordUsage: (module: string, model: string, usage: OpenAiUsage) => void;
  onSocialGoalsChange: (socialGoals: SocialGoalSettings) => void;
}) {
  const [selectedPlatform, setSelectedPlatform] = useState<Platform>(
    audits[0]?.platform ?? "TikTok",
  );
  const [generatingPlatform, setGeneratingPlatform] = useState<Platform | "">("");
  const [recalcProgress, setRecalcProgress] = useState<Record<string, string>>({});
  const [recalcRunning, setRecalcRunning] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
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
        northStarMetric: socialGoals.northStarMetric,
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
    const response = await fetch("/api/ai/audit", {
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
      )} avg reach, ${audit.engagementRate}% engagement. Goal: ${socialGoals.northStarMetric}.`,
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
      <EmptyState
        action="Add platforms to begin the audit"
        icon={SearchCheck}
        title="No social audit data yet"
      />
    );
  }

  return (
    <section className="space-y-4">
      <SocialGoalSettingPanel
        socialGoals={socialGoals}
        onChange={updateSocialGoals}
        onMonthlyTargetChange={updateMonthlyTarget}
      />

      <Card>
        <CardHeader className="flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <SectionTitle
            icon={SearchCheck}
            kicker="Step 2"
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
                Connect OpenAI in Settings to generate with AI.
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

          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px] text-left text-sm">
              <thead className="border-b text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="py-3 pr-4 font-medium">Platform</th>
                  <th className="py-3 pr-4 font-medium">Score</th>
                  <th className="py-3 pr-4 font-medium">Followers</th>
                  <th className="py-3 pr-4 font-medium">Avg reach</th>
                  <th className="py-3 pr-4 font-medium">Engagement</th>
                  <th className="py-3 pr-4 font-medium">Priority issue</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {audits.map((audit) => (
                  <tr
                    className={cn(
                      "cursor-pointer transition-colors hover:bg-muted/40",
                      selectedAudit.platform === audit.platform && "bg-muted/50",
                    )}
                    key={audit.platform}
                    onClick={() => setSelectedPlatform(audit.platform)}
                  >
                    <td className="py-3 pr-4">
                      <div className="flex flex-wrap gap-1.5">
                        <PlatformBadge platform={audit.platform} />
                        {socialGoals.priorityPlatforms.includes(audit.platform) ? (
                          <Badge variant="success">Goal priority</Badge>
                        ) : null}
                      </div>
                    </td>
                    <td className="py-3 pr-4">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold">{calculateAuditScore(audit)}%</span>
                        <Progress className="w-24" value={calculateAuditScore(audit)} />
                      </div>
                    </td>
                    <td className="py-3 pr-4">{formatNumber(audit.followers)}</td>
                    <td className="py-3 pr-4">{formatNumber(audit.averageReach)}</td>
                    <td className="py-3 pr-4">{audit.engagementRate}%</td>
                    <td className="max-w-[280px] py-3 pr-4 text-muted-foreground">
                      {getAuditIssues(audit)[0]}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,0.95fr)_minmax(360px,0.55fr)]">
        <Card>
          <CardHeader>
            <CardTitle>{selectedAudit.platform} Inputs</CardTitle>
            <CardDescription>
              Enter current links, performance data, and qualitative notes.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Field label="Profile link">
              <Input
                value={selectedAudit.url}
                onChange={(event) =>
                  updateAudit(selectedAudit.platform, (audit) => ({
                    ...audit,
                    url: event.target.value,
                  }))
                }
              />
            </Field>

            <div className="grid gap-3 md:grid-cols-4">
              <Field label="Followers">
                <Input
                  type="number"
                  value={selectedAudit.followers}
                  onChange={(event) =>
                    updateAudit(selectedAudit.platform, (audit) => ({
                      ...audit,
                      followers: toNumber(event.target.value),
                    }))
                  }
                />
              </Field>
              <Field label="Avg reach">
                <Input
                  type="number"
                  value={selectedAudit.averageReach}
                  onChange={(event) =>
                    updateAudit(selectedAudit.platform, (audit) => ({
                      ...audit,
                      averageReach: toNumber(event.target.value),
                    }))
                  }
                />
              </Field>
              <Field label="Engagement %">
                <Input
                  step="0.1"
                  type="number"
                  value={selectedAudit.engagementRate}
                  onChange={(event) =>
                    updateAudit(selectedAudit.platform, (audit) => ({
                      ...audit,
                      engagementRate: toNumber(event.target.value),
                    }))
                  }
                />
              </Field>
              <Field label="Frequency">
                <Input
                  value={selectedAudit.postingFrequency}
                  onChange={(event) =>
                    updateAudit(selectedAudit.platform, (audit) => ({
                      ...audit,
                      postingFrequency: event.target.value,
                    }))
                  }
                />
              </Field>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              {scoreFields.map((field) => (
                <ScoreField
                  key={field.key}
                  label={field.label}
                  value={selectedAudit.scores[field.key]}
                  onChange={(value) =>
                    updateAudit(selectedAudit.platform, (audit) => ({
                      ...audit,
                      scores: { ...audit.scores, [field.key]: value },
                    }))
                  }
                />
              ))}
            </div>

            <Field label="Notes">
              <Textarea
                value={selectedAudit.notes}
                onChange={(event) =>
                  updateAudit(selectedAudit.platform, (audit) => ({
                    ...audit,
                    notes: event.target.value,
                  }))
                }
              />
            </Field>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Audit Output</CardTitle>
            <CardDescription>
              Platform score, issues, and priority recommendations.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="rounded-lg border bg-muted/30 p-4">
              <div className="flex items-center justify-between">
                <Gauge className="h-5 w-5 text-primary" />
                <span className="text-2xl font-semibold">
                  {calculateAuditScore(selectedAudit)}%
                </span>
              </div>
              <Progress className="mt-4" value={calculateAuditScore(selectedAudit)} />
            </div>

            <InsightList
              title="Issues"
              items={getAuditIssues(selectedAudit)}
              variant="warning"
            />
            <InsightList
              title={
                liveAi
                  ? "Rule-based recommendations"
                  : "Rule-based recommendations (Offline draft, AI not connected)"
              }
              items={buildGoalAwareAuditRecommendations(
                selectedAudit,
                socialGoals,
              )}
              variant="success"
            />

            <div className="space-y-3 rounded-lg border bg-muted/20 p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-semibold">AI recommendation</p>
                <Button
                  disabled={!liveAi || generatingPlatform === selectedAudit.platform || recalcRunning}
                  onClick={() => void generateOne(selectedAudit)}
                  size="sm"
                  type="button"
                  variant="outline"
                >
                  <Sparkles className="h-4 w-4" />
                  {generatingPlatform === selectedAudit.platform
                    ? "Generating"
                    : "Generate AI recommendation"}
                </Button>
              </div>

              {(() => {
                const insight = auditInsights.find(
                  (row) => row.platform === selectedAudit.platform,
                );

                if (!insight) {
                  return (
                    <p className="text-xs leading-5 text-muted-foreground">
                      No AI recommendation yet for {selectedAudit.platform}.
                    </p>
                  );
                }

                return (
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
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
                    <p className="text-xs leading-5 text-muted-foreground">
                      Confidence: {insight.confidenceReason}
                    </p>
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
                );
              })()}
            </div>
          </CardContent>
        </Card>
      </div>
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
      `Use ${audit.platform} as a support channel unless it directly advances ${socialGoals.northStarMetric}.`,
    ];
  }

  return [
    `Prioritize ${audit.platform} because it is tied to the ${socialGoals.funnelStage} goal: ${socialGoals.primaryObjective}`,
    `Optimize content toward ${socialGoals.northStarMetric}; CTA should drive: ${socialGoals.conversionAction}`,
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
      const response = await fetch("/api/ai/competitors", {
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
            kicker="Step 3"
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
                        <Textarea
                          value={listToText(competitor.platforms)}
                          onChange={(event) =>
                            updateCompetitor(
                              competitor.id,
                              "platforms",
                              textToList(event.target.value).filter(isPlatform),
                            )
                          }
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

function StrategyBriefView({
  aiIntegration,
  audits,
  brand,
  brief,
  competitorInsights,
  socialGoals,
  ucc,
  onBriefChange,
  onRecordUsage,
}: {
  aiIntegration: AiIntegrationSettings;
  audits: SocialAudit[];
  brand: BrandProfile;
  brief: StrategyBrief;
  competitorInsights: CompetitorInsight[];
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
      })),
      auditGoal: {
        primaryObjective: socialGoals.primaryObjective,
        northStarMetric: socialGoals.northStarMetric,
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
      platforms: [...platforms],
    };
  }

  async function generateBrief() {
    setGenerating(true);
    setErrorMessage("");

    try {
      const response = await fetch("/api/ai/brief", {
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
            kicker="Step 4"
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
            {platforms.map((platform) => (
              <div className="rounded-lg border bg-muted/20 p-3" key={platform}>
                <div className="flex items-center justify-between gap-3">
                  <PlatformBadge platform={platform} />
                  <Badge variant="outline">{platformRules[platform].persona}</Badge>
                </div>
                <p className="mt-2 text-xs leading-5 text-muted-foreground">
                  {platformRules[platform].guardrail}
                </p>
              </div>
            ))}
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
          <GoalFact label="North-star" value={socialGoals.northStarMetric} />
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
          <Badge variant="info">{socialGoals.northStarMetric}</Badge>
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
  aiIntegration,
  audits,
  brand,
  brief,
  calendar,
  performanceResults,
  socialGoals,
  ucc,
  onCalendarChange,
  onRecordUsage,
  onReplaceCalendar,
}: {
  aiIntegration: AiIntegrationSettings;
  audits: SocialAudit[];
  brand: BrandProfile;
  brief: StrategyBrief;
  calendar: CalendarItem[];
  performanceResults: PerformanceResult[];
  socialGoals: SocialGoalSettings;
  ucc: UccStrategyData;
  onCalendarChange: (calendar: CalendarItem[]) => void;
  onReplaceCalendar: (calendar: CalendarItem[], clearPerformance: boolean) => void;
  onRecordUsage: (module: string, model: string, usage: OpenAiUsage) => void;
}) {
  const [platformFilter, setPlatformFilter] = useState<"all" | Platform>("all");
  const [statusFilter, setStatusFilter] = useState<"all" | CalendarStatus>("all");
  const [roleFilter, setRoleFilter] = useState<"all" | Role>("all");
  const [generating, setGenerating] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [generationMode, setGenerationMode] = useState<"ai" | "offline" | null>(null);
  const [regeneratingItemId, setRegeneratingItemId] = useState("");

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
        })),
      audiences: ucc.audiences.map((audience) => ({
        name: audience.name,
        goals: audience.motivations,
        painPoints: audience.concerns,
      })),
      platforms: [...platforms],
      count,
      focus,
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
      const response = await fetch("/api/ai/calendar", {
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
  const [selectedItemId, setSelectedItemId] = useState(calendar[0]?.id ?? "");
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
    format: platformRules[defaultGoalPlatform].defaultFormat,
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

  const selectedItem =
    calendar.find((item) => item.id === selectedItemId) ?? visibleItems[0] ?? calendar[0];

  function updateItem(id: string, patch: Partial<CalendarItem>) {
    onCalendarChange(
      calendar.map((item) =>
        item.id === id ? { ...item, ...sanitizeCalendarPatch(item, patch) } : item,
      ),
    );
  }

  function deleteItem(id: string) {
    if (typeof window !== "undefined") {
      const confirmed = window.confirm("Delete this calendar item? This cannot be undone.");

      if (!confirmed) {
        return;
      }
    }

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
      const response = await fetch("/api/ai/calendar", {
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
          ...calendarDraftToPatch(draft),
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

      if (patch.platform) {
        next.format =
          current.itemKind === "event"
            ? "Event promotion"
            : platformRules[patch.platform].defaultFormat;
      }

      if (patch.itemKind) {
        next.format =
          patch.itemKind === "event"
            ? "Event promotion"
            : platformRules[next.platform].defaultFormat;
      }

      return next;
    });
  }

  function addManagerCalendarItem() {
    const platform = newCalendarItem.platform;
    const playbook = platformRules[platform];
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
          : `Supports ${socialGoals.primaryObjective}. Primary KPI: ${socialGoals.northStarMetric}.`,
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
            kicker="Step 5"
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
              Offline draft, AI not connected. These items came from the
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

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_420px]">
        <div className="space-y-4">
          <CalendarMonthGrid
            calendar={visibleItems}
            onSelectItem={setSelectedItemId}
            selectedItemId={selectedItem?.id}
          />
        </div>

        <CalendarItemEditor
          item={selectedItem}
          liveAi={liveAi}
          regenerating={Boolean(selectedItem && regeneratingItemId === selectedItem.id)}
          onApprove={approveItem}
          onChange={updateItem}
          onDelete={deleteItem}
          onDuplicate={duplicateItem}
          onRegenerate={regenerateItem}
          onReject={rejectItem}
          ucc={ucc}
        />
      </div>
    </section>
  );
}

function CalendarMonthGrid({
  calendar,
  onSelectItem,
  selectedItemId,
}: {
  calendar: CalendarItem[];
  onSelectItem: (id: string) => void;
  selectedItemId?: string;
}) {
  const monthGroups = buildCalendarMonthGroups(calendar);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Calendar View</CardTitle>
        <CardDescription>
          Month grid with each scheduled post or event shown inside its publishing date.
        </CardDescription>
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
        ) : null}

        <div className="space-y-5">
          {monthGroups.map((group) => (
            <div className="rounded-lg border bg-card" key={group.key}>
              <div className="flex flex-wrap items-center justify-between gap-3 border-b p-4">
                <h3 className="text-base font-semibold">{group.label}</h3>
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
                    )}
                    key={`${group.key}-${cell.isoDate}`}
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
                            "w-full rounded-md border bg-background p-2 text-left transition-colors hover:border-primary",
                            selectedItemId === item.id && "border-primary bg-primary/5",
                          )}
                          key={item.id}
                          onClick={() => onSelectItem(item.id)}
                          type="button"
                        >
                          <div className="flex flex-wrap items-center gap-1">
                            <PlatformBadge platform={item.platform} />
                            <ItemKindBadge itemKind={item.itemKind ?? "post"} />
                            <StatusBadge status={item.status} />
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
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function buildCalendarMonthGroups(calendar: CalendarItem[]) {
  const sortedItems = [...calendar].sort((a, b) => a.date.localeCompare(b.date));
  const groups = new Map<
    string,
    {
      key: string;
      label: string;
      year: number;
      month: number;
      items: CalendarItem[];
    }
  >();

  sortedItems.forEach((item) => {
    const date = parseIsoDate(item.date);
    const key = `${date.getFullYear()}-${date.getMonth()}`;
    const existing = groups.get(key);

    if (existing) {
      existing.items.push(item);
      return;
    }

    groups.set(key, {
      key,
      label: new Intl.DateTimeFormat("en-US", {
        month: "long",
        year: "numeric",
      }).format(date),
      year: date.getFullYear(),
      month: date.getMonth(),
      items: [item],
    });
  });

  return [...groups.values()].map((group) => {
    const firstOfMonth = new Date(group.year, group.month, 1);
    const lastOfMonth = new Date(group.year, group.month + 1, 0);
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
        inMonth: cursor.getMonth() === group.month,
        isoDate,
        items: group.items.filter((item) => item.date === isoDate),
      });
      cursor.setDate(cursor.getDate() + 1);
    }

    return {
      ...group,
      cells,
    };
  });
}

function CalendarItemEditor({
  item,
  liveAi,
  onApprove,
  onChange,
  onDelete,
  onDuplicate,
  onRegenerate,
  onReject,
  regenerating,
  ucc,
}: {
  item?: CalendarItem;
  liveAi: boolean;
  onApprove: (id: string) => void;
  onChange: (id: string, patch: Partial<CalendarItem>) => void;
  onDelete: (id: string) => void;
  onDuplicate: (id: string) => void;
  onRegenerate: (id: string) => void;
  onReject: (id: string) => void;
  regenerating: boolean;
  ucc: UccStrategyData;
}) {
  if (!item) {
    return (
      <EmptyState
        action="Generate the calendar to edit items"
        icon={CalendarDays}
        title="No calendar item selected"
      />
    );
  }

  const isApproved = item.approvalStage === "calendar approved" || item.status === "approved";

  return (
    <Card className="xl:sticky xl:top-8">
      <CardHeader>
        <CardTitle>Selected Item</CardTitle>
        <CardDescription>Every required calendar field is editable.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-lg border bg-muted/20 p-3">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={isApproved ? "success" : "secondary"}>
              {isApproved ? "Approved" : "Draft, not approved"}
            </Badge>
          </div>
          <div className="mt-3 flex flex-wrap gap-1.5">
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
            <p className="mt-2 text-xs leading-5 text-muted-foreground">
              Connect OpenAI in Settings to regenerate a single item with AI.
            </p>
          ) : null}
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
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
          <div className="rounded-md border border-warning-border bg-warning p-3 text-xs leading-5 text-warning-foreground">
            Publishing is locked until the approval stage reaches Published. Use
            Compliance Approved and Scheduled before the final publish gate.
          </div>
        ) : null}

        <div className="grid gap-3 sm:grid-cols-2">
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

        <div className="grid gap-3 sm:grid-cols-3">
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
        <div className="grid gap-3 sm:grid-cols-2">
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
  socialGoals: SocialGoalSettings;
  ucc: UccStrategyData;
  onCalendarChange: (calendar: CalendarItem[]) => void;
  onRecordUsage: (module: string, model: string, usage: OpenAiUsage) => void;
  onUccChange: (ucc: UccStrategyData) => void;
}) {
  const [roleView, setRoleView] = useState<Role>("copywriter");
  const [selectedItemId, setSelectedItemId] = useState(calendar[0]?.id ?? "");
  const [aiBusy, setAiBusy] = useState<"" | "copy" | "video-script" | "guidance">("");
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
      const rule = platformRules[item.platform];
      const response = await fetch("/api/ai/copy", {
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

  const roleItems = useMemo(() => {
    if (roleView === "video editor") {
      return calendar.filter((item) => item.videoScript || item.shotNotes);
    }

    if (roleView === "marketing manager") {
      return calendar;
    }

    return calendar.filter((item) =>
      roleView === "copywriter"
        ? item.caption || item.videoScript
        : item.visualDirection,
    );
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

  function generateCopy(id: string) {
    const itemIndex = calendar.findIndex((item) => item.id === id);
    const item = calendar[itemIndex];

    if (!item) {
      return;
    }

    const generatedOutput = generateCopywritingForItem(
      item,
      brief,
      brand,
      itemIndex,
      socialGoals,
    );

    updateItem(id, generatedOutput);
    onUccChange(
      appendAiOutputHistory(
        ucc,
        "ai-copywriting",
        buildAiOutputRecord({
          action: "Generated selected platform copy",
          item,
          output: generatedOutput,
        }),
      ),
    );
    setSelectedItemId(id);
  }

  function generateCopyForPlatform(id: string, platform: Platform) {
    const itemIndex = calendar.findIndex((item) => item.id === id);
    const item = calendar[itemIndex];

    if (!item) {
      return;
    }

    const platformItem = {
      ...item,
      platform,
      bestPostingTime: platformRules[platform].bestPostingTime,
      format: platformRules[platform].defaultFormat,
    };

    const generatedOutput = {
      ...platformItem,
      ...generateCopywritingForItem(
        platformItem,
        brief,
        brand,
        itemIndex,
        socialGoals,
      ),
    };

    updateItem(id, generatedOutput);
    onUccChange(
      appendAiOutputHistory(
        ucc,
        "ai-copywriting",
        buildAiOutputRecord({
          action: `Generated ${platform} platform copy`,
          item: platformItem,
          output: generatedOutput,
        }),
      ),
    );
    setSelectedItemId(id);
  }

  function generateAllCopy() {
    const nextCalendar = calendar.map((item, index) => ({
        ...item,
        ...generateCopywritingForItem(item, brief, brand, index, socialGoals),
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
            kicker="Step 7"
            title="Content Production View"
            description="Daily Content Master table, platform playbooks, copy generation, role handoffs, and approval tracking."
          />
          <Button
            disabled={!brief.approved || calendar.length === 0}
            onClick={() => {
              generateAllCopy();
              setGenMessage({
                tone: "info",
                text: "Offline draft, AI not connected. Template copy was written to every item. Use the AI buttons below for live copy on the selected item.",
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

      <PlatformPlaybookGuide />

      <DailyContentMasterTable
        brand={brand}
        brief={brief}
        calendar={calendar}
        socialGoals={socialGoals}
        onGeneratePlatformCopy={generateCopyForPlatform}
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
                        text: "Offline draft, AI not connected. Template copy written to this item.",
                      });
                    }}
                    size="sm"
                    type="button"
                    variant="outline"
                  >
                    <Wand2 className="h-4 w-4" />
                    Offline template copy
                  </Button>
                </div>
                {!liveAi ? (
                  <p className="text-xs leading-5 text-muted-foreground">
                    Connect OpenAI in Settings to generate with AI.
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
                primary={`${selectedItem.platform}: ${platformRules[selectedItem.platform].persona}`}
                secondary={`${platformRules[selectedItem.platform].role}\n${platformRules[selectedItem.platform].guardrail}\nMetric focus: ${platformRules[selectedItem.platform].metrics}`}
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
  socialGoals,
  onGeneratePlatformCopy,
  onSelectItem,
  onStatusChange,
  selectedItemId,
}: {
  brand: BrandProfile;
  brief: StrategyBrief;
  calendar: CalendarItem[];
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
                  const meta = getDailyContentMasterMeta(item, index);
                  const selected = selectedItemId === item.id;
                  const expanded = expandedItemId === item.id;
                  const selectedPlatform =
                    platformSelections[item.id] ?? item.platform;
                  const playbook = platformRules[selectedPlatform];

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
                                  secondary={`Goal: ${meta.goal}\nTheme: ${meta.theme}\nStrategy: ${brief.monthlyCampaignGoal}\nKPI: ${socialGoals.northStarMetric}\nConversion: ${socialGoals.conversionAction}`}
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

function PlatformPlaybookGuide() {
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
            const playbook = platformRules[platform];

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

function PerformanceLearningView({
  data,
  onPerformanceChange,
}: {
  data: MarketingWorkspaceData;
  onPerformanceChange: (performanceResults: PerformanceResult[]) => void;
}) {
  const [selectedItemId, setSelectedItemId] = useState(data.calendar[0]?.id ?? "");
  const analytics = analyzePerformance(data);
  const selectedItem = data.calendar.find((item) => item.id === selectedItemId);
  const selectedResult =
    data.performanceResults.find(
      (result) => result.calendarItemId === selectedItemId,
    ) ?? emptyPerformanceResult(selectedItemId);

  function updateResult(patch: Partial<PerformanceResult>) {
    const nextResult = { ...selectedResult, ...patch };
    const exists = data.performanceResults.some(
      (result) => result.calendarItemId === selectedItemId,
    );

    onPerformanceChange(
      exists
        ? data.performanceResults.map((result) =>
            result.calendarItemId === selectedItemId ? nextResult : result,
          )
        : [...data.performanceResults, nextResult],
    );
  }

  return (
    <section className="space-y-4">
      <Card>
        <CardHeader>
          <SectionTitle
            icon={TrendingUp}
            kicker="Step 8"
            title="Performance Learning Layer"
            description="Enter post results, then repeat, improve, or stop content based on platform, hook, pillar, and format signals."
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

      <div className="grid gap-4 xl:grid-cols-[420px_minmax(0,1fr)]">
        <Card>
          <CardHeader>
            <CardTitle>Post Result Entry</CardTitle>
            <CardDescription>
              Add impressions, reach, engagement, clicks, watch time, and follows.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Field label="Calendar item">
              <NativeSelect
                value={selectedItemId}
                onChange={(event) => setSelectedItemId(event.target.value)}
              >
                {data.calendar.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.date} / {item.platform} / {item.contentTopic}
                  </option>
                ))}
              </NativeSelect>
            </Field>

            {selectedItem ? (
              <div className="rounded-lg border bg-muted/30 p-3">
                <p className="text-sm font-medium">{selectedItem.hook}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {selectedItem.contentPillar} / {selectedItem.format}
                </p>
              </div>
            ) : null}

            <div className="grid gap-3 sm:grid-cols-2">
              {[
                "impressions",
                "reach",
                "engagement",
                "comments",
                "shares",
                "saves",
                "watchTime",
                "clicks",
                "followsGained",
              ].map((field) => (
                <Field key={field} label={metricLabel(field)}>
                  <Input
                    type="number"
                    value={selectedResult[field as keyof PerformanceResult] as number}
                    onChange={(event) =>
                      updateResult({
                        [field]: toNumber(event.target.value),
                      } as Partial<PerformanceResult>)
                    }
                  />
                </Field>
              ))}
            </div>

            <Field label="Notes">
              <Textarea
                value={selectedResult.notes}
                onChange={(event) => updateResult({ notes: event.target.value })}
              />
            </Field>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-3">
            <RecommendationColumn
              items={analytics.repeat.map((row) => row.item.contentTopic)}
              title="Repeat"
              variant="success"
            />
            <RecommendationColumn
              items={analytics.improve.map((row) => row.item.contentTopic)}
              title="Improve"
              variant="warning"
            />
            <RecommendationColumn
              items={analytics.stop.map((row) => row.item.contentTopic)}
              title="Stop"
              variant="outline"
            />
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Performance Review</CardTitle>
              <CardDescription>
                Joined post results with platform, hook, pillar, and format.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {analytics.rows.length === 0 ? (
                <EmptyState
                  action="Enter post results to unlock learning"
                  icon={BarChart3}
                  title="No performance results yet"
                />
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[980px] text-left text-sm">
                    <thead className="border-b text-xs uppercase text-muted-foreground">
                      <tr>
                        <th className="py-3 pr-4 font-medium">Post</th>
                        <th className="py-3 pr-4 font-medium">Platform</th>
                        <th className="py-3 pr-4 font-medium">Pillar</th>
                        <th className="py-3 pr-4 font-medium">Reach</th>
                        <th className="py-3 pr-4 font-medium">Saves</th>
                        <th className="py-3 pr-4 font-medium">Clicks</th>
                        <th className="py-3 pr-4 font-medium">Learning score</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {analytics.rows.map(({ item, result, efficiency }) => (
                        <tr key={item.id}>
                          <td className="max-w-[260px] py-3 pr-4">
                            {item.contentTopic}
                          </td>
                          <td className="py-3 pr-4">
                            <PlatformBadge platform={item.platform} />
                          </td>
                          <td className="py-3 pr-4">{item.contentPillar}</td>
                          <td className="py-3 pr-4">{formatNumber(result.reach)}</td>
                          <td className="py-3 pr-4">{formatNumber(result.saves)}</td>
                          <td className="py-3 pr-4">{formatNumber(result.clicks)}</td>
                          <td className="py-3 pr-4">{formatEfficiency(efficiency)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  );
}

function GoalProgressPanel({ data }: { data: MarketingWorkspaceData }) {
  const progress = calculateGoalProgress(data);

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <CardTitle>Goal Progress</CardTitle>
            <CardDescription>
              Progress against the Social Audit goal targets.
            </CardDescription>
          </div>
          <Badge variant="info">{data.socialGoals.northStarMetric}</Badge>
        </div>
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
            kicker="Step 9"
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
  label,
  onChange,
  value,
}: {
  label: string;
  onChange: (value: string[]) => void;
  value: string[];
}) {
  return (
    <Field label={label}>
      <Textarea
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
    <Badge className={platformBadgeClass(platform)} variant="outline">
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
  value,
}: {
  detail: string;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-lg border bg-muted/20 p-3">
      <p className="text-xs font-medium uppercase text-muted-foreground">{label}</p>
      <p className="mt-2 line-clamp-2 text-sm font-semibold leading-5">{value}</p>
      <p className="mt-2 text-xs text-muted-foreground">{detail}</p>
    </div>
  );
}

function RecommendationColumn({
  items,
  title,
  variant,
}: {
  items: string[];
  title: string;
  variant: BadgeVariant;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between gap-2">
          {title}
          <Badge variant={variant}>{items.length}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {items.length === 0 ? (
          <p className="text-sm leading-6 text-muted-foreground">
            Add more post results for this recommendation.
          </p>
        ) : (
          items.map((item) => (
            <div className="rounded-lg border bg-muted/20 p-3 text-sm" key={item}>
              {item}
            </div>
          ))
        )}
      </CardContent>
    </Card>
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
  const target = campaign.kpiTarget.leads;
  const actual = campaign.actualResults.leads;
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

function percentOf(value: number, target: number) {
  return target > 0 ? Math.round((value / target) * 100) : 0;
}

function calculateCostPerLead(row: UccKpiRecord) {
  return row.leads > 0 ? Math.round(row.spend / row.leads) : 0;
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
    id: readCsv(row, ["id"], `course-${Date.now()}-${Math.random().toString(16).slice(2)}`),
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
    id: readCsv(row, ["id"], `campaign-${Date.now()}-${Math.random().toString(16).slice(2)}`),
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

function csvToCalendarItem(row: Record<string, string>, ucc: UccStrategyData): CalendarItem {
  const platform = (readCsv(row, ["platform"], "Instagram") || "Instagram") as Platform;
  const date = readCsv(row, ["planned_date", "date"], "2026-07-01");

  return {
    id: readCsv(row, ["id"], `calendar-${Date.now()}-${Math.random().toString(16).slice(2)}`),
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
    format: readCsv(row, ["format"], platformRules[platform]?.defaultFormat ?? "Post"),
    hook: readCsv(row, ["hook"], "Proof-first UCC content hook"),
    caption: readCsv(row, ["caption", "copy"], ""),
    visualDirection: readCsv(row, ["visual_direction"], ""),
    cta: readCsv(row, ["cta"], "Submit an enquiry"),
    hashtags: textToList(readCsv(row, ["hashtags"])),
    bestPostingTime: readCsv(row, ["best_time", "best_posting_time"], platformRules[platform]?.bestPostingTime ?? "10:00 AM"),
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
    id: readCsv(row, ["id"], `kpi-${Date.now()}-${Math.random().toString(16).slice(2)}`),
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
    id: readCsv(row, ["id"], `budget-${Date.now()}-${Math.random().toString(16).slice(2)}`),
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
    id: readCsv(row, ["id"], `competitor-${Date.now()}-${Math.random().toString(16).slice(2)}`),
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

function csvToAsset(row: Record<string, string>, ucc: UccStrategyData): UccAsset {
  return {
    id: readCsv(row, ["id"], `asset-${Date.now()}-${Math.random().toString(16).slice(2)}`),
    name: readCsv(row, ["name", "asset"], "Imported asset"),
    type: (readCsv(row, ["type"], "campaign asset") || "campaign asset") as UccAsset["type"],
    courseId: readCsv(row, ["course_id", "course"], ucc.courses[0]?.id ?? ""),
    campaignId: readCsv(row, ["campaign_id", "campaign"], ucc.campaigns[0]?.id ?? ""),
    language: (readCsv(row, ["language"], "English") || "English") as UccAsset["language"],
    status: (readCsv(row, ["status"], "draft") || "draft") as UccAsset["status"],
    url: readCsv(row, ["url", "link"], ""),
    usageNotes: readCsv(row, ["notes", "usage_notes"], ""),
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
    id: `ai-output-${Date.now()}-${Math.random().toString(16).slice(2)}`,
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

function applyPlatformMetricsImport(
  current: MarketingWorkspaceData,
  platformMetrics: PlatformDataMetrics[],
  importedAt: string,
  approvedBy: string,
  source: PlatformMetricsImportSource,
): MarketingWorkspaceData {
  const selectedUpload = source.uploadId
    ? current.pdfDataSource.uploads.find((upload) => upload.id === source.uploadId)
    : undefined;
  const sourceFileLabel = selectedUpload?.fileName ?? source.label;
  const metricsByPlatform = new Map(
    platformMetrics.map((metrics) => [metrics.platform, metrics]),
  );
  const nextAudits = current.audits.map((audit) => {
    const metrics = metricsByPlatform.get(audit.platform);

    if (!metrics) {
      return audit;
    }

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
      notes: mergeImportNote(
        audit.notes,
        `${source.noteLabel} ${formatDateTime(importedAt)}: ${formatNumber(
          metrics.impressions,
        )} impressions, ${formatNumber(metrics.reach)} reach, ${formatNumber(
          engagementActions,
        )} engagement actions from ${sourceFileLabel}.`,
      ),
    };
  });
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

  return {
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

function emptyPerformanceResult(calendarItemId: string): PerformanceResult {
  return {
    calendarItemId,
    impressions: 0,
    reach: 0,
    engagement: 0,
    comments: 0,
    shares: 0,
    saves: 0,
    watchTime: 0,
    clicks: 0,
    followsGained: 0,
    notes: "",
  };
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

function formatFileSize(bytes: number) {
  if (bytes < 1024) {
    return `${bytes} B`;
  }

  if (bytes < 1024 * 1024) {
    return `${Math.round(bytes / 102.4) / 10} KB`;
  }

  return `${Math.round(bytes / 1024 / 102.4) / 10} MB`;
}

function formatShortDate(value: string) {
  const date = value.includes("T") ? new Date(value) : new Date(`${value}T00:00:00`);

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
  }).format(date);
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
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

function platformBadgeClass(platform: Platform) {
  // Theme-neutral chip so the platform tag reads correctly on every theme.
  const tone = "border-border bg-secondary text-secondary-foreground";
  const classes: Record<Platform, string> = {
    TikTok: tone,
    Instagram: tone,
    "YouTube Shorts": tone,
    LinkedIn: tone,
    Facebook: tone,
    "X/Twitter": tone,
    Threads: tone,
  };

  return classes[platform];
}

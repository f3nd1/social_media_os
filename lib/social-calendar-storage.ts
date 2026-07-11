import {
  approvalStages,
  createDefaultPlatformPlaybook,
  createDefaultSetupGuide,
  createSeedWorkspaceData,
  platforms,
  type ApprovalStage,
  type MarketingWorkspaceData,
  type PlatformPlaybook,
  type SetupGuideProgress,
} from "@/lib/social-calendar-data";

const STORAGE_KEY = "social-calendar-intelligence-os:v1";

export type SocialCalendarRepository = {
  load: () => MarketingWorkspaceData;
  save: (data: MarketingWorkspaceData) => void;
  reset: () => MarketingWorkspaceData;
};

export const localSocialCalendarRepository: SocialCalendarRepository = {
  load() {
    if (typeof window === "undefined") {
      return createSeedWorkspaceData();
    }

    const storedValue = window.localStorage.getItem(STORAGE_KEY);

    if (!storedValue) {
      const seed = createSeedWorkspaceData();
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(seed));
      return seed;
    }

    try {
      const parsed = JSON.parse(storedValue) as MarketingWorkspaceData;
      return normalizeWorkspaceData(parsed);
    } catch {
      const seed = createSeedWorkspaceData();
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(seed));
      return seed;
    }
  },

  save(data) {
    if (typeof window === "undefined") {
      return;
    }

    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  },

  reset() {
    const seed = createSeedWorkspaceData();

    if (typeof window !== "undefined") {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(seed));
    }

    return seed;
  },
};

export function normalizeWorkspaceData(data: MarketingWorkspaceData) {
  const seed = createSeedWorkspaceData();
  const shouldUseUccSeed = isLegacySeedBrand(data.brand?.brandName);
  const brand = shouldUseUccSeed ? seed.brand : { ...seed.brand, ...data.brand };
  const socialGoals = shouldUseUccSeed ? seed.socialGoals : data.socialGoals;
  const brief = shouldUseUccSeed ? seed.brief : data.brief;
  const calendar = shouldUseUccSeed ? seed.calendar : data.calendar;

  return {
    ...seed,
    ...data,
    version: 1,
    brand,
    socialGoals: {
      ...seed.socialGoals,
      ...socialGoals,
      monthlyTargets: {
        ...seed.socialGoals.monthlyTargets,
        ...socialGoals?.monthlyTargets,
      },
      priorityPlatforms: Array.isArray(socialGoals?.priorityPlatforms)
        ? socialGoals.priorityPlatforms
        : seed.socialGoals.priorityPlatforms,
      contentPriorities: Array.isArray(socialGoals?.contentPriorities)
        ? socialGoals.contentPriorities
        : seed.socialGoals.contentPriorities,
    },
    ucc: {
      ...seed.ucc,
      ...data.ucc,
      // Courses are fully user-managed (add/edit/delete), so a saved courses
      // array is authoritative. This lets a deleted course stay deleted rather
      // than being re-injected from the seed on every load.
      courses: Array.isArray(data.ucc?.courses)
        ? data.ucc.courses
        : seed.ucc.courses,
      audiences: Array.isArray(data.ucc?.audiences)
        ? data.ucc.audiences
        : seed.ucc.audiences,
      campaigns: Array.isArray(data.ucc?.campaigns)
        ? data.ucc.campaigns
        : seed.ucc.campaigns,
      budgetPlans: Array.isArray(data.ucc?.budgetPlans)
        ? data.ucc.budgetPlans
        : seed.ucc.budgetPlans,
      events: mergeSeedRecords(seed.ucc.events, data.ucc?.events),
      connectors: mergeSeedRecords(seed.ucc.connectors, data.ucc?.connectors),
      aiModules: mergeSeedRecords(seed.ucc.aiModules, data.ucc?.aiModules).map(
        (module) => normalizeAiModule(module, seed.ucc.aiModules),
      ),
      kpiRecords: Array.isArray(data.ucc?.kpiRecords)
        ? data.ucc.kpiRecords
        : seed.ucc.kpiRecords,
    },
    pdfDataSource: {
      ...seed.pdfDataSource,
      ...data.pdfDataSource,
      uploads: Array.isArray(data.pdfDataSource?.uploads)
        ? data.pdfDataSource.uploads.map(normalizePdfUpload)
        : seed.pdfDataSource.uploads,
      importLog: Array.isArray(data.pdfDataSource?.importLog)
        ? data.pdfDataSource.importLog
        : seed.pdfDataSource.importLog,
    },
    brief: { ...seed.brief, ...brief },
    audits: Array.isArray(data.audits) ? data.audits : seed.audits,
    connections: Array.isArray(data.connections) ? data.connections : [],
    aiIntegration: {
      ...seed.aiIntegration,
      ...(data.aiIntegration ?? {}),
    },
    aiUsage: Array.isArray(data.aiUsage) ? data.aiUsage : [],
    auditInsights: Array.isArray(data.auditInsights) ? data.auditInsights : [],
    campaignSuggestions: Array.isArray(data.campaignSuggestions)
      ? data.campaignSuggestions
      : [],
    competitorInsights: Array.isArray(data.competitorInsights)
      ? data.competitorInsights
      : [],
    complianceDocs: Array.isArray(data.complianceDocs) ? data.complianceDocs : [],
    aiRecommendations: Array.isArray(data.aiRecommendations)
      ? data.aiRecommendations
      : [],
    weeklyReport:
      data.weeklyReport && typeof data.weeklyReport === "object"
        ? data.weeklyReport
        : null,
    trendInsights: Array.isArray(data.trendInsights)
      ? data.trendInsights.map((trend) => ({
          ...trend,
          sources: Array.isArray(trend.sources) ? trend.sources : [],
        }))
      : [],
    listeningResults: Array.isArray(data.listeningResults)
      ? data.listeningResults.map((result) => ({
          ...result,
          quotes: Array.isArray(result.quotes) ? result.quotes : [],
          status:
            result.status === "accepted" || result.status === "dismissed"
              ? result.status
              : ("new" as const),
        }))
      : [],
    approvalsLog: Array.isArray(data.approvalsLog) ? data.approvalsLog : [],
    approverName: typeof data.approverName === "string" ? data.approverName : "",
    datasetMode: (data.datasetMode === "live" ? "live" : "sample") as "sample" | "live",
    firstRunChecklistDismissed: Boolean(data.firstRunChecklistDismissed),
    welcomeDismissed: Boolean(data.welcomeDismissed),
    guidedSetupActive: Boolean(data.guidedSetupActive),
    dismissedHelpScreens: Array.isArray(data.dismissedHelpScreens)
      ? data.dismissedHelpScreens
      : [],
    setupGuide: normalizeSetupGuide(data.setupGuide),
    platformPlaybook: normalizePlatformPlaybook(data.platformPlaybook),
    competitors: Array.isArray(data.competitors)
      ? data.competitors
      : seed.competitors,
    calendar: Array.isArray(calendar)
      ? calendar.map((item) => ({
          ...item,
          itemKind: item.itemKind ?? "post",
          plannedDate: item.plannedDate ?? item.date,
          actualPostDate: item.actualPostDate ?? "",
          campaignId: item.campaignId ?? "",
          courseId: item.courseId ?? "",
          audienceId: item.audienceId ?? "",
          owner: item.owner ?? roleLabelForStorage(item.assignedRole ?? "marketing manager"),
          reviewer: item.reviewer ?? "Marketing Manager",
          dueDate: item.dueDate ?? item.plannedDate ?? item.date,
          blocker: item.blocker ?? "",
          approvalStage: normalizeApprovalStage(item.approvalStage),
          finalCaption: item.finalCaption ?? "",
          finalAssetLink: item.finalAssetLink ?? "",
          publishedUrl: item.publishedUrl ?? "",
          kpiResult: item.kpiResult ?? "",
          followUpAction: item.followUpAction ?? "",
        }))
      : seed.calendar,
    performanceResults: Array.isArray(data.performanceResults)
      ? data.performanceResults
      : seed.performanceResults,
  };
}

function isLegacySeedBrand(brandName?: string) {
  return ["Northstar College", "Northstar Career College"].includes(
    brandName ?? "",
  );
}

function normalizeAiModule<T extends { id: string }>(module: T, seedModules: T[]) {
  const seedModule = seedModules.find((seed) => seed.id === module.id);

  return {
    ...seedModule,
    ...module,
  };
}

function normalizePdfUpload(
  upload: MarketingWorkspaceData["pdfDataSource"]["uploads"][number],
) {
  return {
    ...upload,
    detectedPlatforms: upload.detectedPlatforms ?? [],
    confidenceLevel: upload.confidenceLevel ?? "low",
    reviewMetrics: upload.reviewMetrics ?? [],
    approvalStatus: upload.approvalStatus ?? "needs review",
    approvedBy: upload.approvedBy ?? "",
    reviewedBy: upload.reviewedBy ?? "",
    warning: upload.warning ?? "",
  };
}

function normalizeApprovalStage(stage: unknown): ApprovalStage {
  if (stage === "draft") {
    return "idea";
  }

  if (stage === "approved" || stage === "compliance check") {
    return "compliance approved";
  }

  if (stage === "design/video") {
    return "design/video approved";
  }

  if (
    typeof stage === "string" &&
    approvalStages.includes(stage as ApprovalStage)
  ) {
    return stage as ApprovalStage;
  }

  return "idea";
}

// Upgrade any saved setup-guide progress to the current shape with safe
// defaults. Older saves have no setupGuide at all, so they get a fresh,
// inactive one and the guide simply does not open.
// Fills in any missing platform (an old save, a corrupt entry, or a platform
// added after the save was made) with the template default, so the workspace
// always has a complete playbook and the engines never read undefined.
function normalizePlatformPlaybook(raw: PlatformPlaybook | undefined): PlatformPlaybook {
  const fallback = createDefaultPlatformPlaybook();

  if (!raw || typeof raw !== "object") {
    return fallback;
  }

  const merged = { ...fallback };

  for (const platform of platforms) {
    const entry = raw[platform];

    if (entry && typeof entry === "object" && entry.approved) {
      merged[platform] = entry;
    }
  }

  return merged;
}

function normalizeSetupGuide(raw: SetupGuideProgress | undefined): SetupGuideProgress {
  if (!raw || typeof raw !== "object") {
    return createDefaultSetupGuide();
  }

  const welcomeChoice =
    raw.welcomeChoice === "sample" || raw.welcomeChoice === "own"
      ? raw.welcomeChoice
      : undefined;
  const analyticsChoice =
    raw.analyticsChoice === "metricool" || raw.analyticsChoice === "csv"
      ? raw.analyticsChoice
      : undefined;

  return {
    active: Boolean(raw.active),
    completed: Boolean(raw.completed),
    stepIndex:
      typeof raw.stepIndex === "number" && raw.stepIndex >= 0
        ? Math.floor(raw.stepIndex)
        : 0,
    skipped: Array.isArray(raw.skipped)
      ? raw.skipped.filter((key): key is string => typeof key === "string")
      : [],
    welcomeChoice,
    supabaseTested: Boolean(raw.supabaseTested),
    openAiTested: Boolean(raw.openAiTested),
    analyticsChoice,
    complianceAcknowledged: Boolean(raw.complianceAcknowledged),
  };
}

function roleLabelForStorage(role: string) {
  return role
    .split(" ")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function mergeSeedRecords<T extends { id: string }>(
  seedRecords: T[],
  storedRecords: unknown,
) {
  if (!Array.isArray(storedRecords)) {
    return seedRecords;
  }

  const storedTypedRecords = storedRecords as T[];
  const storedById = new Map(
    storedTypedRecords.map((record) => [record.id, record] as const),
  );
  const mergedSeedRecords = seedRecords.map((record) => ({
    ...record,
    ...storedById.get(record.id),
  }));
  const customRecords = storedTypedRecords.filter(
    (record) => !seedRecords.some((seedRecord) => seedRecord.id === record.id),
  );

  return [...mergedSeedRecords, ...customRecords];
}

export const platforms = [
  "TikTok",
  "Instagram",
  "YouTube Shorts",
  "LinkedIn",
  "Facebook",
  "X/Twitter",
  "Threads",
] as const;

export type Platform = (typeof platforms)[number];

export const roles = [
  "copywriter",
  "graphic designer",
  "video editor",
  "marketing manager",
] as const;

export type Role = (typeof roles)[number];

export const statuses = [
  "idea",
  "drafting",
  "design",
  "review",
  "approved",
  "scheduled",
  "posted",
] as const;

export type CalendarStatus = (typeof statuses)[number];

export const calendarItemKinds = ["post", "event"] as const;

export type CalendarItemKind = (typeof calendarItemKinds)[number];

export const approvalStages = [
  "idea",
  "objective approved",
  "strategy approved",
  "calendar approved",
  "copy approved",
  "design/video approved",
  "compliance approved",
  "revision",
  "scheduled",
  "published",
  "reported",
] as const;

export type ApprovalStage = (typeof approvalStages)[number];

export const funnelStages = [
  "awareness",
  "engagement",
  "lead generation",
  "conversion",
  "retention",
] as const;

export type FunnelStage = (typeof funnelStages)[number];

export type BrandProfile = {
  brandName: string;
  website: string;
  industry: string;
  audience: string;
  offers: string;
  toneOfVoice: string;
  brandColors: string[];
  goals: string[];
  brandGuidelines: string;
};

export type AuditScores = {
  profileCompleteness: number;
  postingConsistency: number;
  contentMix: number;
  hookQuality: number;
  ctaClarity: number;
  visualConsistency: number;
  engagementPerformance: number;
};

export type SocialAudit = {
  platform: Platform;
  url: string;
  followers: number;
  averageReach: number;
  engagementRate: number;
  postingFrequency: string;
  scores: AuditScores;
  notes: string;
};

export type SocialGoalTargets = {
  reach: number;
  engagementRate: number;
  clicks: number;
  saves: number;
  shares: number;
  inquiries: number;
  followersGained: number;
  posts: number;
};

export type SocialGoalSettings = {
  primaryObjective: string;
  campaignWindow: string;
  funnelStage: FunnelStage;
  targetAudienceSegment: string;
  priorityPlatforms: Platform[];
  northStarMetric: string;
  conversionAction: string;
  monthlyTargets: SocialGoalTargets;
  contentPriorities: string[];
  reportingCadence: string;
  owner: Role;
  notes: string;
};

export type UccCourseCategory =
  | "Full-time courses"
  | "Short courses"
  | "English courses"
  | "AI courses"
  | "Business courses"
  | "Hospitality courses"
  | "Future Master pathway"
  | "ATO-related courses";

export type UccAudienceSegment =
  | "PRC students"
  | "Parents"
  | "Adult learners"
  | "Working adults"
  | "International students"
  | "Agents"
  | "Partners"
  | "Employers"
  | "Chinese-speaking audiences";

export type UccMarketingChannel =
  | Platform
  | "Xiaohongshu"
  | "WeChat"
  | "Education fair"
  | "Open house"
  | "Campus visit"
  | "Student event"
  | "School visit"
  | "Roadshow"
  | "Agent activity"
  | "Partnership"
  | "Partnership talk"
  | "Talk"
  | "Flyers";

export type UccCourse = {
  id: string;
  name: string;
  category: UccCourseCategory;
  audienceIds: string[];
  courseProof: string[];
  complianceNotes: string;
  status: "active" | "future" | "paused" | "archived";
  // Added for full course management (Stage 2). Optional so existing seed and
  // saved courses upgrade without a rewrite; the editor defaults them.
  description?: string;
  usp?: string;
  duration?: string;
  entryRequirements?: string;
  fees?: string;
  sellingPoints?: string[];
};

export type UccAudience = {
  id: string;
  // Widened from UccAudienceSegment to string so managers can add new
  // segments. Existing seed values remain valid strings.
  name: string;
  languages: string[];
  motivations: string[];
  concerns: string[];
  recommendedChannels: UccMarketingChannel[];
  nurtureAngle: string;
  // Added for full audience management (Stage 3). Optional for the same
  // upgrade-safe reason as the new course fields.
  interests?: string[];
  buyingJourney?: string;
  decisionMakers?: string;
};

export type UccCampaign = {
  id: string;
  name: string;
  objective: string;
  courseId: string;
  audienceId: string;
  funnelStage: FunnelStage;
  platformMix: UccMarketingChannel[];
  startDate: string;
  endDate: string;
  owner: Role;
  budget: number;
  status: "planning" | "active" | "paused" | "completed";
  kpiTarget: {
    reach: number;
    leads: number;
    applications: number;
    enrolments: number;
    costPerLead: number;
  };
  actualResults: {
    reach: number;
    leads: number;
    applications: number;
    enrolments: number;
    spend: number;
  };
};

export type UccBudgetPlan = {
  id: string;
  campaignId: string;
  adBudget: number;
  designerHours: number;
  videoEditorHours: number;
  copywriterHours: number;
  staffAssigned: string[];
  equipmentNeeded: string[];
  venue: string;
  printingCost: number;
  eventCost: number;
  agentCost: number;
  totalCost: number;
};

export type UccAsset = {
  id: string;
  name: string;
  type: "photo" | "video" | "testimonial" | "course image" | "logo" | "template" | "caption" | "campaign asset";
  courseId: string;
  campaignId: string;
  language: "English" | "Chinese" | "Bilingual";
  status: "draft" | "approved" | "needs update";
  url: string;
  usageNotes: string;
};

export type UccMarketingEvent = {
  id: string;
  name: string;
  date: string;
  type: "public holiday" | "school period" | "marketing event" | "intake" | "campus event";
  audienceIds: string[];
  campaignOpportunity: string;
};

export type UccPlatformConnector = {
  id: string;
  platform: UccMarketingChannel;
  mode: "direct API" | "CSV/PDF import" | "manual";
  status: "ready" | "needs credentials" | "manual import only";
  supportedMetrics: string[];
  lastSync: string;
  notes: string;
};

export type UccAiModule = {
  id: string;
  name: string;
  purpose: string;
  input: string;
  requiredInputs: string[];
  logic: string;
  output: string;
  expectedOutputFormat: string;
  humanApprovalStep: string;
  errorHandling: string;
  complianceGuardrails: string[];
  status: "active" | "disabled" | "needs setup";
  inputSource: string;
  outputDestination: string;
  lastUsedDate: string;
  reviewerRequired: boolean;
  riskLevel: "low" | "medium" | "high";
  outputHistory: UccAiOutputRecord[];
};

export type UccAiOutputRecord = {
  id: string;
  title: string;
  generatedAt: string;
  status: "draft" | "in review" | "approved" | "rejected";
  reviewer: string;
  complianceScore: number;
  brandFitScore: number;
  editHistory: string[];
  outputSummary: string;
  approvedAt?: string;
};

export type UccKpiRecord = {
  id: string;
  campaignId: string;
  courseId: string;
  channel: UccMarketingChannel;
  leads: number;
  agentEnquiries: number;
  applications: number;
  campusTourBookings: number;
  enrolments: number;
  spend: number;
  status: "on track" | "needs attention" | "behind target" | "exceeded target";
  recommendation: string;
};

export type UccStrategyData = {
  courses: UccCourse[];
  audiences: UccAudience[];
  campaigns: UccCampaign[];
  budgetPlans: UccBudgetPlan[];
  assets: UccAsset[];
  events: UccMarketingEvent[];
  connectors: UccPlatformConnector[];
  aiModules: UccAiModule[];
  kpiRecords: UccKpiRecord[];
};

export type Competitor = {
  id: string;
  name: string;
  website: string;
  platforms: Platform[];
  contentFormats: string[];
  tone: string;
  postingFrequency: string;
  observedStrengths: string[];
  contentGaps: string[];
  whitespaceOpportunities: string[];
};

export type StrategyBrief = {
  monthlyCampaignGoal: string;
  audiencePainPoints: string[];
  contentPillars: string[];
  platformStrategy: Record<Platform, string>;
  contentMixRecommendation: string;
  toneGuidance: string;
  keyAnglesToOwn: string[];
  complianceReminders: string[];
  approved: boolean;
  updatedAt: string;
  // Stage 6 strategy outputs. Optional so existing saved briefs upgrade
  // without a rewrite; populated by the live AI draft and editable by hand.
  marketingObjectives?: string[];
  campaignIdeas?: string[];
  platformMix?: string;
  suggestedBudget?: string;
  kpis?: string[];
  recommendedTimeline?: string;
  recommendedResources?: string[];
};

export type CalendarItem = {
  id: string;
  itemKind?: CalendarItemKind;
  plannedDate?: string;
  actualPostDate?: string;
  date: string;
  platform: Platform;
  campaignId?: string;
  courseId?: string;
  audienceId?: string;
  contentPillar: string;
  contentTopic: string;
  format: string;
  hook: string;
  caption: string;
  visualDirection: string;
  cta: string;
  hashtags: string[];
  bestPostingTime: string;
  productionNotes: string;
  assignedRole: Role;
  owner?: string;
  reviewer?: string;
  dueDate?: string;
  blocker?: string;
  status: CalendarStatus;
  approvalStage?: ApprovalStage;
  businessGoalConnection: string;
  complianceNote: string;
  videoScript: string;
  shotNotes: string;
  finalCaption?: string;
  finalAssetLink?: string;
  publishedUrl?: string;
  kpiResult?: string;
  followUpAction?: string;
};

export type PerformanceResult = {
  calendarItemId: string;
  impressions: number;
  reach: number;
  engagement: number;
  comments: number;
  shares: number;
  saves: number;
  watchTime: number;
  clicks: number;
  followsGained: number;
  notes: string;
};

export type PdfReportUpload = {
  id: string;
  fileName: string;
  fileSize: number;
  uploadedAt: string;
  source: string;
  startDate: string;
  endDate: string;
  notes: string;
  extractedText: string;
  extractedAt?: string;
  extractionStatus?: "pending" | "success" | "error";
  extractionMessage?: string;
  pageCount?: number;
  extractionMethod?: string;
  detectedMetricCount?: number;
  detectedPlatforms?: Platform[];
  confidenceLevel?: "low" | "medium" | "high";
  reviewMetrics?: PdfMetricReview[];
  approvalStatus?: "needs review" | "approved" | "applied" | "error";
  approvedBy?: string;
  reviewedBy?: string;
  warning?: string;
};

export type PdfMetricReview = {
  id: string;
  platform: Platform;
  followers: number;
  impressions: number;
  reach: number;
  engagement: number;
  comments: number;
  shares: number;
  saves: number;
  watchTime: number;
  clicks: number;
  followsGained: number;
  leads: number;
  posts: number;
  confidence: number;
  approved: boolean;
  edited: boolean;
  notes: string;
};

export type PdfImportLogEntry = {
  id: string;
  uploadId: string;
  fileName: string;
  uploadedAt: string;
  appliedAt: string;
  approvedBy: string;
  extractedMetricCount: number;
  appliedMetricCount: number;
  editedMetricCount: number;
  platforms: Platform[];
  summary: string;
};

export type PdfDataSourceSettings = {
  uploads: PdfReportUpload[];
  importLog: PdfImportLogEntry[];
  selectedUploadId: string;
  lastImportedAt: string;
  lastImportSummary: string;
};

export const connectionSources = [
  "metricool",
  "facebook",
  "instagram",
  "tiktok",
  "linkedin",
  "youtube",
  "x",
  "threads",
  "xiaohongshu",
  "wechat",
] as const;

export type ConnectionSource = (typeof connectionSources)[number];

export type ConnectionMode = "direct API" | "CSV/PDF import";

export type ConnectionStatus =
  | "connected"
  | "needs credentials"
  | "error"
  | "manual import";

export type PlatformConnection = {
  id: string;
  source: ConnectionSource;
  accountLabel: string;
  mode: ConnectionMode;
  status: ConnectionStatus;
  credentials: Record<string, string>;
  lastSyncAt: string;
  lastError: string;
  createdAt: string;
};

export type CredentialFieldSpec = {
  key: string;
  label: string;
  helper: string;
  secret: boolean;
};

// OpenAI connection for the app's AI features. Stored in workspace state so it
// syncs to Supabase when configured. Named aiIntegration to avoid confusion
// with the existing ucc.aiModules governance table.
export type AiIntegrationSettings = {
  enabled: boolean;
  apiKey: string;
  analysisModel: string;
  utilityModel: string;
};

export function createDefaultAiIntegration(): AiIntegrationSettings {
  return {
    enabled: false,
    apiKey: "",
    analysisModel: "",
    utilityModel: "",
  };
}

export const CONNECTION_SOURCE_LABELS: Record<ConnectionSource, string> = {
  metricool: "Metricool",
  facebook: "Facebook",
  instagram: "Instagram",
  tiktok: "TikTok",
  linkedin: "LinkedIn",
  youtube: "YouTube",
  x: "X / Twitter",
  threads: "Threads",
  xiaohongshu: "Xiaohongshu",
  wechat: "WeChat",
};

// Aggregators sit apart from single platforms in the source picker.
export const CONNECTION_AGGREGATOR_SOURCES: ConnectionSource[] = ["metricool"];

// Only sources in this list have a real Test / Sync implementation.
// Every other source stores credentials for later but is honest that the
// sync engine and live test are not built yet.
export const CONNECTION_IMPLEMENTED_SOURCES: ConnectionSource[] = ["metricool"];

export const CONNECTION_AVAILABLE_MODES: Record<ConnectionSource, ConnectionMode[]> = {
  metricool: ["direct API", "CSV/PDF import"],
  facebook: ["direct API", "CSV/PDF import"],
  instagram: ["direct API", "CSV/PDF import"],
  tiktok: ["direct API", "CSV/PDF import"],
  linkedin: ["direct API", "CSV/PDF import"],
  youtube: ["direct API", "CSV/PDF import"],
  x: ["direct API", "CSV/PDF import"],
  threads: ["direct API", "CSV/PDF import"],
  xiaohongshu: ["CSV/PDF import"],
  wechat: ["CSV/PDF import"],
};

// Note kept for the two China-market channels, matching the guidance already
// shown in Settings before this connection manager existed.
export const CONNECTION_MANUAL_ONLY_NOTE: Partial<Record<ConnectionSource, string>> = {
  xiaohongshu:
    "Use exported analytics for PRC student and parent content until direct access is configured.",
  wechat:
    "Use WeChat export/import for Chinese parent and agent nurturing reports.",
};

export const CONNECTION_CREDENTIAL_FIELDS: Record<ConnectionSource, CredentialFieldSpec[]> = {
  metricool: [
    {
      key: "apiToken",
      label: "API token",
      helper: "Metricool > Settings > API access. Copy the token shown there.",
      secret: true,
    },
    {
      key: "userId",
      label: "User ID",
      helper: "Shown next to your account name in Metricool > Settings > API access.",
      secret: false,
    },
    {
      key: "blogId",
      label: "Blog ID",
      helper: "Open the brand in Metricool. The number in the URL after /app/ is the blog ID.",
      secret: false,
    },
  ],
  facebook: [
    { key: "appId", label: "App ID", helper: "Meta for Developers > your app > Settings > Basic.", secret: false },
    { key: "appSecret", label: "App Secret", helper: "Meta for Developers > your app > Settings > Basic.", secret: true },
    { key: "accountId", label: "Page or Account ID", helper: "Meta Business Suite > Page settings, or Graph API Explorer.", secret: false },
    { key: "accessToken", label: "Access Token", helper: "Generated in Graph API Explorer or your app's token tool.", secret: true },
  ],
  instagram: [
    { key: "appId", label: "App ID", helper: "Meta for Developers > your app > Settings > Basic.", secret: false },
    { key: "appSecret", label: "App Secret", helper: "Meta for Developers > your app > Settings > Basic.", secret: true },
    { key: "accountId", label: "Page or Account ID", helper: "The Instagram business account ID linked to your Facebook Page.", secret: false },
    { key: "accessToken", label: "Access Token", helper: "Generated in Graph API Explorer with Instagram permissions.", secret: true },
  ],
  threads: [
    { key: "appId", label: "App ID", helper: "Meta for Developers > your app > Settings > Basic.", secret: false },
    { key: "appSecret", label: "App Secret", helper: "Meta for Developers > your app > Settings > Basic.", secret: true },
    { key: "accountId", label: "Page or Account ID", helper: "The Threads account ID linked to your Meta app.", secret: false },
    { key: "accessToken", label: "Access Token", helper: "Generated with Threads API permissions.", secret: true },
  ],
  youtube: [
    { key: "apiKey", label: "API key", helper: "Google Cloud Console > APIs & Services > Credentials.", secret: true },
    { key: "channelId", label: "Channel ID", helper: "YouTube Studio > Settings > Channel > Advanced settings.", secret: false },
  ],
  linkedin: [
    { key: "clientId", label: "Client ID", helper: "LinkedIn Developer Portal > your app > Auth.", secret: false },
    { key: "clientSecret", label: "Client Secret", helper: "LinkedIn Developer Portal > your app > Auth.", secret: true },
    { key: "organisationId", label: "Organisation ID", helper: "LinkedIn Page admin view, in the page URL.", secret: false },
    { key: "accessToken", label: "Access Token", helper: "Generated after OAuth using your app's client credentials.", secret: true },
  ],
  tiktok: [
    { key: "clientKey", label: "Client Key", helper: "TikTok for Developers > your app > Basic Information.", secret: false },
    { key: "clientSecret", label: "Client Secret", helper: "TikTok for Developers > your app > Basic Information.", secret: true },
    { key: "accessToken", label: "Access Token", helper: "Generated after OAuth using your app's client credentials.", secret: true },
  ],
  x: [
    { key: "apiKey", label: "API Key", helper: "X Developer Portal > your app > Keys and tokens.", secret: false },
    { key: "apiSecret", label: "API Secret", helper: "X Developer Portal > your app > Keys and tokens.", secret: true },
    { key: "bearerToken", label: "Bearer Token", helper: "X Developer Portal > your app > Keys and tokens.", secret: true },
  ],
  xiaohongshu: [],
  wechat: [],
};

export type MarketingWorkspaceData = {
  version: number;
  generatedAt: string;
  brand: BrandProfile;
  socialGoals: SocialGoalSettings;
  ucc: UccStrategyData;
  pdfDataSource: PdfDataSourceSettings;
  audits: SocialAudit[];
  competitors: Competitor[];
  brief: StrategyBrief;
  calendar: CalendarItem[];
  performanceResults: PerformanceResult[];
  connections: PlatformConnection[];
  aiIntegration: AiIntegrationSettings;
};

export const platformRules: Record<
  Platform,
  {
    role: string;
    persona: string;
    content: string;
    cta: string;
    metrics: string;
    defaultFormat: string;
    bestPostingTime: string;
    guardrail: string;
  }
> = {
  TikTok: {
    role: "Main growth engine",
    persona: "funny friend",
    content: "Student humor, practical skits, English struggles, campus life, POV videos",
    cta: "Follow for more student life, study, and career-planning survival tips.",
    metrics: "Watch time, shares, follows, profile visits",
    defaultFormat: "Short-form script",
    bestPostingTime: "7:30 PM",
    guardrail:
      "Open fast, keep the language casual, and end with a comment prompt.",
  },
  Instagram: {
    role: "Aspiration and community building",
    persona: "cool senior",
    content: "Aesthetic carousels, reels, student life, practical tips, confidence-building",
    cta: "Save this, share this, follow for your college planning chapter.",
    metrics: "Saves, shares, profile visits, follower growth",
    defaultFormat: "Carousel or reel",
    bestPostingTime: "11:45 AM",
    guardrail:
      "Make it visual, relatable, and saveable without sounding like an ad.",
  },
  "YouTube Shorts": {
    role: "Search and discovery engine",
    persona: "storyteller",
    content: "Explainers, study tips, student decision stories, mini documentaries",
    cta: "Subscribe for more student decision stories.",
    metrics: "Retention, subscribers, views, search traffic",
    defaultFormat: "SEO short",
    bestPostingTime: "6:15 PM",
    guardrail:
      "Use a searchable title, a clear first sentence, and a simple story arc.",
  },
  LinkedIn: {
    role: "B2B authority and thought leadership",
    persona: "industry mentor",
    content: "Education insight, program proof, faculty expertise, partner and parent trust",
    cta: "Share your perspective or connect with the admissions team.",
    metrics: "Impressions, profile visits, partner enquiries, comments",
    defaultFormat: "Professional text post",
    bestPostingTime: "8:40 AM",
    guardrail:
      "Keep it practical and human, with proof-based education language.",
  },
  Facebook: {
    role: "Trust, parent reassurance, community memory",
    persona: "reassuring parent/community voice",
    content: "Events, student highlights, parent-friendly updates, community stories",
    cta: "Share with a family planning their next education step.",
    metrics: "Comments, shares, reactions, messages",
    defaultFormat: "Community post",
    bestPostingTime: "7:00 PM",
    guardrail:
      "Answer the parent question directly and avoid pressure or guarantees.",
  },
  "X/Twitter": {
    role: "Quick ideas, education updates, student humor",
    persona: "quick-witted commentator",
    content: "Fast thoughts, education commentary, AI observations, student-life one-liners",
    cta: "What would you add?",
    metrics: "Reposts, replies, profile visits",
    defaultFormat: "Concise post",
    bestPostingTime: "9:20 AM",
    guardrail: "Lead with the useful point and remove soft filler.",
  },
  Threads: {
    role: "Daily conversation and relatability",
    persona: "campus group chat",
    content: "Funny observations, campus thoughts, student diary lines, everyday questions",
    cta: "Future students, settle this.",
    metrics: "Replies, reposts, profile visits",
    defaultFormat: "Conversational thread",
    bestPostingTime: "12:25 PM",
    guardrail:
      "Sound like a person starting a useful hallway conversation.",
  },
};

export const dailyPublishingRhythm = {
  Monday: {
    theme: "Identity",
    goal: "Build recognition",
    angle: "Show who the student is becoming and why the brand matters.",
  },
  Tuesday: {
    theme: "Education",
    goal: "Teach a decision skill",
    angle: "Make one confusing choice easier with a practical explanation.",
  },
  Wednesday: {
    theme: "Entertainment",
    goal: "Increase reach",
    angle: "Use a relatable student moment to earn attention without hard selling.",
  },
  Thursday: {
    theme: "Discovery",
    goal: "Build aspiration",
    angle: "Reveal something useful about programs, campus, or student support.",
  },
  Friday: {
    theme: "Community",
    goal: "Create conversation",
    angle: "Invite students, parents, alumni, or staff into a shared moment.",
  },
  Saturday: {
    theme: "Community",
    goal: "Create conversation",
    angle: "Invite practical questions and lightweight weekend engagement.",
  },
  Sunday: {
    theme: "Identity",
    goal: "Build recognition",
    angle: "Set up the next week with a calm planning prompt.",
  },
} as const;

const weeklyCampaignThemes = [
  "Your College Chapter Begins",
  "Confidence Through Skills",
  "AI Made Simple",
  "Life Beyond the Classroom",
  "Meet the Future Builders",
  "Skills for the Future",
  "Hidden Campus Support",
  "Community Week",
  "Study Smart",
  "Building Your Career",
  "Innovation in Action",
  "Why This Campus",
  "Looking Back, Moving Forward",
];

export function getDailyContentMasterMeta(item: CalendarItem, index: number) {
  const date = new Date(`${item.date}T00:00:00`);
  const dayName = date.toLocaleDateString("en-US", { weekday: "long" }) as
    | keyof typeof dailyPublishingRhythm;
  const rhythm = dailyPublishingRhythm[dayName] ?? dailyPublishingRhythm.Monday;
  const weekNumber = Math.floor(index / 7) + 1;
  const campaign = weeklyCampaignThemes[(weekNumber - 1) % weeklyCampaignThemes.length];
  const playbook = platformRules[item.platform];

  return {
    week: `W${weekNumber}`,
    day: dayName.slice(0, 3),
    theme: rhythm.theme,
    goal: rhythm.goal,
    campaign,
    rhythmAngle: rhythm.angle,
    metric: playbook.metrics,
    repurpose: buildRepurposePlan(item.platform),
  };
}

export function generateCopywritingForItem(
  item: CalendarItem,
  brief: StrategyBrief,
  brand: BrandProfile,
  index: number,
  socialGoals?: SocialGoalSettings,
): Partial<CalendarItem> {
  const meta = getDailyContentMasterMeta(item, index);
  const playbook = platformRules[item.platform];
  const painPoint =
    brief.audiencePainPoints[index % Math.max(brief.audiencePainPoints.length, 1)] ??
    "Students and parents need a clearer next step.";
  const keyAngle =
    brief.keyAnglesToOwn[index % Math.max(brief.keyAnglesToOwn.length, 1)] ??
    "Good education choices become easier when families can inspect the proof.";
  const platformStrategy = brief.platformStrategy[item.platform];
  const proofLine = item.businessGoalConnection || keyAngle;
  const goalLine = socialGoals
    ? `Social goal: ${socialGoals.primaryObjective} KPI: ${socialGoals.northStarMetric}. Conversion: ${socialGoals.conversionAction}.`
    : "";
  const complianceLine =
    "Keep this proof-based: no guaranteed admission, job, salary, visa, or work claims.";
  const hook = buildGeneratedHook(item, meta);
  const cta = buildGeneratedCta(item, playbook);
  const caption = buildGeneratedCaption({
    brand,
    brief,
    complianceLine,
    cta,
    hook,
    item,
    keyAngle,
    meta,
    painPoint,
    platformStrategy,
    playbook,
    proofLine,
    goalLine,
  });
  const isVideo =
    item.platform === "TikTok" || item.platform === "YouTube Shorts" ||
    item.format.toLowerCase().includes("video") ||
    item.format.toLowerCase().includes("reel");

  return {
    hook,
    caption,
    cta,
    format: item.format || playbook.defaultFormat,
    visualDirection: buildGeneratedVisualDirection(item, meta, playbook),
    productionNotes: [
      `Daily rhythm: ${meta.theme} / ${meta.goal}.`,
      `Platform playbook: ${playbook.role}; voice is ${playbook.persona}.`,
      platformStrategy,
      goalLine,
      complianceLine,
    ]
      .filter(Boolean)
      .join("\n"),
    videoScript: isVideo
      ? buildGeneratedVideoScript(item, hook, cta, proofLine, playbook)
      : item.videoScript,
    shotNotes: isVideo
      ? `Capture one human opener, one proof detail, one campus/program cutaway, and one CTA frame. Keep edits native to ${item.platform}.`
      : item.shotNotes,
    complianceNote: complianceLine,
  };
}

function buildRepurposePlan(platform: Platform) {
  const plans: Record<Platform, string> = {
    TikTok: "Turn into IG Reel, YouTube Short, Threads prompt, and X one-liner.",
    Instagram: "Turn carousel points into TikTok checklist, Facebook parent post, and LinkedIn proof post.",
    "YouTube Shorts": "Turn script into TikTok cutdown, IG Reel, and searchable FAQ post.",
    LinkedIn: "Turn into Facebook parent explainer, Instagram proof carousel, and X insight thread.",
    Facebook: "Turn into Instagram carousel, LinkedIn trust post, and Threads conversation starter.",
    "X/Twitter": "Turn into Threads prompt, LinkedIn opener, and carousel first slide.",
    Threads: "Turn strongest reply into X post, TikTok prompt, and Instagram story question.",
  };

  return plans[platform];
}

function buildGeneratedHook(
  item: CalendarItem,
  meta: ReturnType<typeof getDailyContentMasterMeta>,
) {
  if (item.platform === "TikTok") {
    return `POV: ${item.contentTopic.toLowerCase()} is the thing nobody explained before tour day.`;
  }

  if (item.platform === "Instagram") {
    return `${item.contentTopic}, but make it saveable.`;
  }

  if (item.platform === "YouTube Shorts") {
    return `${item.contentTopic}: a quick guide for students and parents`;
  }

  if (item.platform === "LinkedIn") {
    return `${item.contentTopic}: what education marketing should prove, not promise.`;
  }

  if (item.platform === "Facebook") {
    return `For families asking about ${item.contentTopic.toLowerCase()}, start here.`;
  }

  if (item.platform === "X/Twitter") {
    return `${item.contentTopic}: ask for proof, not slogans.`;
  }

  return `${meta.theme} thought: ${item.contentTopic.toLowerCase()}.`;
}

function buildGeneratedCta(
  item: CalendarItem,
  playbook: (typeof platformRules)[Platform],
) {
  if (item.cta && item.cta.length > 8) {
    return item.cta;
  }

  return playbook.cta;
}

function buildGeneratedCaption({
  brand,
  brief,
  complianceLine,
  cta,
  hook,
  item,
  keyAngle,
  meta,
  painPoint,
  platformStrategy,
  playbook,
  proofLine,
  goalLine,
}: {
  brand: BrandProfile;
  brief: StrategyBrief;
  complianceLine: string;
  cta: string;
  hook: string;
  item: CalendarItem;
  keyAngle: string;
  meta: ReturnType<typeof getDailyContentMasterMeta>;
  painPoint: string;
  platformStrategy: string;
  playbook: (typeof platformRules)[Platform];
  proofLine: string;
  goalLine: string;
}) {
  const sharedLines = {
    campaignGoal: `Goal: ${brief.monthlyCampaignGoal}`,
    pain: `Audience tension: ${painPoint}`,
    proof: `Proof angle: ${proofLine}`,
    owned: `Angle to own: ${keyAngle}`,
    rhythm: `${meta.theme} post for ${meta.campaign}: ${meta.rhythmAngle}`,
    guide: `Playbook: ${playbook.persona}; ${playbook.content}.`,
    strategy: platformStrategy ? `Platform strategy: ${platformStrategy}` : "",
    goal: goalLine,
  };

  switch (item.platform) {
    case "TikTok":
      return `${hook}\n\nFast beats:\n1. Student says the confusing part out loud.\n2. Cut to the real proof: ${proofLine}\n3. Show the next step without pressure.\n\n${sharedLines.goal}\n${cta}\n\n${complianceLine}`;
    case "Instagram":
      return `${hook}\n\nSlide plan:\n1. The question students are really asking\n2. ${painPoint}\n3. What to inspect: ${proofLine}\n4. What this means for ${brand.brandName}\n5. Saveable checklist\n\n${sharedLines.goal}\n${cta}\n\n${complianceLine}`;
    case "YouTube Shorts":
      return `${hook}\n\nOpening: "Before you choose a college, check this first."\nMiddle: ${sharedLines.pain}\nProof: ${proofLine}\nClose: ${cta}\n\n${sharedLines.strategy}\n${sharedLines.goal}\n${complianceLine}`;
    case "LinkedIn":
      return `${hook}\n\nFamilies do not need louder claims. They need clearer evidence.\n\n${sharedLines.pain}\n\n${sharedLines.proof}\n\n${sharedLines.goal}\n\nFor ${brand.brandName}, the useful marketing move is simple: explain the support, show the process, and keep the copy factual.\n\n${cta}`;
    case "Facebook":
      return `${hook}\n\nChoosing a college is easier when families can see the steps clearly.\n\n${painPoint}\n\nA practical proof point to ask about: ${proofLine}\n\n${sharedLines.goal}\n${cta}\n\n${complianceLine}`;
    case "X/Twitter":
      return `${hook}\n\n${proofLine}\n\n${sharedLines.goal}\n${cta}`;
    case "Threads":
      return `${hook}\n\n${sharedLines.rhythm}\n\nThe useful proof is not a big promise. It is something students and families can see, ask about, or compare: ${proofLine}\n\n${sharedLines.goal}\n${cta}`;
  }
}

function buildGeneratedVisualDirection(
  item: CalendarItem,
  meta: ReturnType<typeof getDailyContentMasterMeta>,
  playbook: (typeof platformRules)[Platform],
) {
  return `${meta.theme} visual system: lead with a real student, parent, faculty, or campus proof moment. Match ${item.platform} as ${playbook.persona}. Use brand colors sparingly, keep text readable, and make the proof inspectable.`;
}

function buildGeneratedVideoScript(
  item: CalendarItem,
  hook: string,
  cta: string,
  proofLine: string,
  playbook: (typeof platformRules)[Platform],
) {
  return `0-3s: ${hook}\n3-10s: Name the student or parent question in plain language.\n10-22s: Show the proof: ${proofLine}\n22-30s: Bring it back to the next practical step.\nClose: ${cta}\nVoice: ${playbook.persona}.`;
}

function buildBusinessGoalConnection(
  baseConnection: string,
  socialGoals?: SocialGoalSettings,
) {
  if (!socialGoals) {
    return baseConnection;
  }

  return `${baseConnection} Goal link: ${socialGoals.primaryObjective} Primary KPI: ${socialGoals.northStarMetric}. Conversion action: ${socialGoals.conversionAction}`;
}

const seedBrand: BrandProfile = {
  brandName: "United Ceres College",
  website: "https://ucc.example.edu.sg",
  industry: "Singapore private education and training provider",
  audience:
    "PRC students, parents, working adults, international students, agents, partners, employers, and Chinese-speaking audiences comparing Singapore education pathways.",
  offers:
    "Full-time courses, short courses, English courses, AI courses, business courses, hospitality courses, Future Master pathway, ATO-related courses, campus visits, agent partnerships, and open house events.",
  toneOfVoice:
    "Clear, credible, proof-based, bilingual-ready, practical, and student-first. Avoid hype, fear, and guaranteed outcome language.",
  brandColors: ["#0F766E", "#E11D48", "#1E293B", "#F8FAFC"],
  goals: [
    "Increase qualified course enquiries and campus tour bookings",
    "Grow PRC student and parent awareness through Chinese-language channels",
    "Build agent and partner pipeline with proof-based B2B content",
    "Improve course-level lead quality and enrolment conversion tracking",
  ],
  brandGuidelines:
    "Use real UCC campus, course, trainer, student, and partner proof. Keep English and Chinese messaging factual. Never promise employment, visas, salary outcomes, admission certainty, rankings, or guaranteed course outcomes. Show steps, support, eligibility, and evidence.",
};

const seedPdfDataSource: PdfDataSourceSettings = {
  uploads: [],
  importLog: [],
  selectedUploadId: "",
  lastImportedAt: "",
  lastImportSummary: "No PDF report data has been applied yet.",
};

const seedSocialGoals: SocialGoalSettings = {
  primaryObjective:
    "Increase qualified UCC course enquiries, campus tour bookings, and agent partner leads across digital and offline channels.",
  campaignWindow: "2026 H2 intake and agent recruitment cycle",
  funnelStage: "lead generation",
  targetAudienceSegment:
    "PRC students, Chinese-speaking parents, working adults, international students, and education agents evaluating Singapore study pathways.",
  priorityPlatforms: ["TikTok", "Instagram", "Facebook", "LinkedIn"],
  northStarMetric: "Qualified enquiries and campus tour bookings",
  conversionAction: "Submit an enquiry, book a campus visit, or contact UCC admissions/agent team.",
  monthlyTargets: {
    reach: 180000,
    engagementRate: 4.5,
    clicks: 1200,
    saves: 850,
    shares: 500,
    inquiries: 260,
    followersGained: 900,
    posts: 30,
  },
  contentPriorities: [
    "Course Proof",
    "Student Pathway",
    "Parent Trust",
    "Agent Enablement",
  ],
  reportingCadence: "Weekly Monday review with a monthly learning summary",
  owner: "marketing manager",
  notes:
    "Prioritize proof-based English and Chinese marketing that turns attention into enquiries without unsupported employment, salary, visa, admission, or ranking claims.",
};

const seedUccStrategy: UccStrategyData = {
  courses: [
    {
      id: "course-full-time",
      name: "Full-time Diploma and Pathway Courses",
      category: "Full-time courses",
      audienceIds: ["aud-prc", "aud-international", "aud-parents"],
      courseProof: ["Full-time study structure", "Campus learning support", "Clear admissions steps"],
      complianceNotes: "Do not imply guaranteed admission, visa approval, employment, or transfer outcomes.",
      status: "active",
    },
    {
      id: "course-short",
      name: "Short Courses and Skills Workshops",
      category: "Short courses",
      audienceIds: ["aud-working-adults", "aud-adult-learners"],
      courseProof: ["Short duration", "Practical skills focus", "Flexible upskilling use case"],
      complianceNotes: "Avoid overpromising immediate career change or salary uplift.",
      status: "active",
    },
    {
      id: "course-english",
      name: "English Language Courses",
      category: "English courses",
      audienceIds: ["aud-prc", "aud-parents", "aud-international"],
      courseProof: ["Language placement support", "Classroom practice", "Progress-focused learning"],
      complianceNotes: "Avoid guaranteed English score, admission, or migration outcome claims.",
      status: "active",
    },
    {
      id: "course-ai",
      name: "AI Literacy and Applied AI Courses",
      category: "AI courses",
      audienceIds: ["aud-working-adults", "aud-employers", "aud-partners"],
      courseProof: ["Practical AI tasks", "Workplace scenarios", "Responsible AI use"],
      complianceNotes: "Avoid unsupported claims that AI courses guarantee jobs or promotions.",
      status: "active",
    },
    {
      id: "course-business",
      name: "Business and Management Courses",
      category: "Business courses",
      audienceIds: ["aud-adult-learners", "aud-working-adults", "aud-partners"],
      courseProof: ["Case-based learning", "Business communication practice", "Operational skills"],
      complianceNotes: "Keep career and employer relevance factual and evidence-based.",
      status: "active",
    },
    {
      id: "course-hospitality",
      name: "Hospitality Courses",
      category: "Hospitality courses",
      audienceIds: ["aud-prc", "aud-international", "aud-employers"],
      courseProof: ["Service scenarios", "Operations practice", "Hospitality communication skills"],
      complianceNotes: "Do not promise placement, salary, or specific employer outcomes.",
      status: "active",
    },
    {
      id: "course-master-pathway",
      name: "Future Master Pathway",
      category: "Future Master pathway",
      audienceIds: ["aud-prc", "aud-parents", "aud-agents"],
      courseProof: ["Pathway explanation", "Entry requirement guidance", "Academic planning support"],
      complianceNotes: "Use conditional language and avoid guaranteed progression or admission claims.",
      status: "future",
    },
    {
      id: "course-ato",
      name: "ATO-related Courses",
      category: "ATO-related courses",
      audienceIds: ["aud-working-adults", "aud-employers", "aud-partners"],
      courseProof: ["Regulatory alignment notes", "Training process clarity", "Professional use case"],
      complianceNotes: "Keep accreditation, eligibility, and regulatory wording exact and verifiable.",
      status: "active",
    },
  ],
  audiences: [
    {
      id: "aud-prc",
      name: "PRC students",
      languages: ["Chinese", "English"],
      motivations: ["Singapore study pathway", "English improvement", "International exposure"],
      concerns: ["Trust", "Course legitimacy", "Visa/work misunderstanding", "Parent approval"],
      recommendedChannels: ["Xiaohongshu", "WeChat", "TikTok", "YouTube Shorts"],
      nurtureAngle: "Chinese-language proof, campus life, and clear step-by-step admissions guidance.",
    },
    {
      id: "aud-parents",
      name: "Parents",
      languages: ["Chinese", "English"],
      motivations: ["Safety", "Credibility", "Clear pathway", "Student support"],
      concerns: ["Cost", "Outcome claims", "Student wellbeing", "Accommodation and support"],
      recommendedChannels: ["WeChat", "Facebook", "Open house", "Education fair"],
      nurtureAngle: "Reassuring proof, factual process, and calm comparison content.",
    },
    {
      id: "aud-adult-learners",
      name: "Adult learners",
      languages: ["English", "Chinese"],
      motivations: ["Upskilling", "Flexible learning", "Confidence"],
      concerns: ["Time", "Course relevance", "Cost"],
      recommendedChannels: ["Facebook", "LinkedIn", "YouTube Shorts", "Roadshow"],
      nurtureAngle: "Practical skills, scheduling clarity, and low-pressure course fit content.",
    },
    {
      id: "aud-working-adults",
      name: "Working adults",
      languages: ["English", "Chinese"],
      motivations: ["Career resilience", "AI and business skills", "Professional credibility"],
      concerns: ["Return on time", "Employer relevance", "Workload"],
      recommendedChannels: ["LinkedIn", "Facebook", "Partnership talk", "TikTok"],
      nurtureAngle: "Workplace scenarios, skill proof, and employer-relevant examples.",
    },
    {
      id: "aud-international",
      name: "International students",
      languages: ["English"],
      motivations: ["Singapore experience", "Study pathway", "Campus support"],
      concerns: ["Admissions process", "Living costs", "Documentation"],
      recommendedChannels: ["Instagram", "YouTube Shorts", "Education fair", "Open house"],
      nurtureAngle: "Student journey content with clear admissions and campus visit CTAs.",
    },
    {
      id: "aud-agents",
      name: "Agents",
      languages: ["English", "Chinese"],
      motivations: ["Reliable partner", "Clear course material", "Fast response"],
      concerns: ["Proof packs", "Process clarity", "Lead follow-up"],
      recommendedChannels: ["LinkedIn", "WeChat", "Agent activity", "Partnership talk"],
      nurtureAngle: "Agent kits, course proof, response workflow, and partner onboarding clarity.",
    },
    {
      id: "aud-partners",
      name: "Partners",
      languages: ["English", "Chinese"],
      motivations: ["Collaboration", "Credible training partner", "Event value"],
      concerns: ["Brand fit", "Operational clarity", "Audience quality"],
      recommendedChannels: ["LinkedIn", "Partnership talk", "Education fair"],
      nurtureAngle: "Professional proof, collaboration outcomes, and operational readiness.",
    },
    {
      id: "aud-employers",
      name: "Employers",
      languages: ["English"],
      motivations: ["Skills pipeline", "Training partnership", "Workplace relevance"],
      concerns: ["Course quality", "Student readiness", "Evidence"],
      recommendedChannels: ["LinkedIn", "Partnership talk", "Roadshow"],
      nurtureAngle: "Proof-based employer relevance without promising employment outcomes.",
    },
  ],
  campaigns: [
    {
      id: "campaign-ai",
      name: "AI Course Campaign",
      objective: "Generate working adult and employer enquiries for applied AI courses.",
      courseId: "course-ai",
      audienceId: "aud-working-adults",
      funnelStage: "lead generation",
      platformMix: ["LinkedIn", "TikTok", "YouTube Shorts", "Facebook"],
      startDate: "2026-07-08",
      endDate: "2026-08-18",
      owner: "marketing manager",
      budget: 5200,
      status: "active",
      kpiTarget: { reach: 90000, leads: 120, applications: 35, enrolments: 18, costPerLead: 43 },
      actualResults: { reach: 38400, leads: 54, applications: 14, enrolments: 5, spend: 2180 },
    },
    {
      id: "campaign-agent",
      name: "Agent Recruitment Campaign",
      objective: "Build a qualified agent pipeline with proof packs and onboarding content.",
      courseId: "course-master-pathway",
      audienceId: "aud-agents",
      funnelStage: "conversion",
      platformMix: ["LinkedIn", "WeChat", "Agent activity", "Partnership talk"],
      startDate: "2026-07-15",
      endDate: "2026-09-12",
      owner: "marketing manager",
      budget: 6800,
      status: "planning",
      kpiTarget: { reach: 40000, leads: 60, applications: 20, enrolments: 0, costPerLead: 80 },
      actualResults: { reach: 9600, leads: 12, applications: 4, enrolments: 0, spend: 980 },
    },
    {
      id: "campaign-open-house",
      name: "Open House Campaign",
      objective: "Drive campus visit bookings for PRC families and international students.",
      courseId: "course-full-time",
      audienceId: "aud-parents",
      funnelStage: "lead generation",
      platformMix: ["WeChat", "Xiaohongshu", "Facebook", "Open house", "Education fair"],
      startDate: "2026-08-01",
      endDate: "2026-09-05",
      owner: "marketing manager",
      budget: 7600,
      status: "planning",
      kpiTarget: { reach: 120000, leads: 180, applications: 55, enrolments: 22, costPerLead: 42 },
      actualResults: { reach: 0, leads: 0, applications: 0, enrolments: 0, spend: 0 },
    },
    {
      id: "campaign-english",
      name: "English Course Campaign",
      objective: "Promote English course pathways with bilingual parent-safe messaging.",
      courseId: "course-english",
      audienceId: "aud-prc",
      funnelStage: "engagement",
      platformMix: ["Xiaohongshu", "WeChat", "YouTube Shorts", "Instagram"],
      startDate: "2026-07-20",
      endDate: "2026-08-31",
      owner: "copywriter",
      budget: 4300,
      status: "active",
      kpiTarget: { reach: 85000, leads: 100, applications: 28, enrolments: 15, costPerLead: 45 },
      actualResults: { reach: 21600, leads: 31, applications: 8, enrolments: 3, spend: 1375 },
    },
  ],
  budgetPlans: [
    {
      id: "budget-ai",
      campaignId: "campaign-ai",
      adBudget: 3200,
      designerHours: 18,
      videoEditorHours: 24,
      copywriterHours: 16,
      staffAssigned: ["Marketing Manager", "AI Trainer", "Video Editor"],
      equipmentNeeded: ["Wireless mic", "Classroom screen", "Tripod"],
      venue: "AI classroom",
      printingCost: 200,
      eventCost: 600,
      agentCost: 0,
      totalCost: 5200,
    },
    {
      id: "budget-agent",
      campaignId: "campaign-agent",
      adBudget: 1800,
      designerHours: 16,
      videoEditorHours: 10,
      copywriterHours: 18,
      staffAssigned: ["Marketing Manager", "Admissions Lead"],
      equipmentNeeded: ["Partner deck", "Course proof pack"],
      venue: "Partner meeting room",
      printingCost: 500,
      eventCost: 1500,
      agentCost: 3000,
      totalCost: 6800,
    },
    {
      id: "budget-open-house",
      campaignId: "campaign-open-house",
      adBudget: 3600,
      designerHours: 20,
      videoEditorHours: 18,
      copywriterHours: 14,
      staffAssigned: ["Marketing Manager", "Admissions Team", "Student Ambassadors"],
      equipmentNeeded: ["Directional signage", "Camera", "Registration tablet"],
      venue: "UCC campus",
      printingCost: 900,
      eventCost: 2600,
      agentCost: 500,
      totalCost: 7600,
    },
  ],
  assets: [
    {
      id: "asset-campus-tour",
      name: "Approved Campus Tour Photo Set",
      type: "photo",
      courseId: "course-full-time",
      campaignId: "campaign-open-house",
      language: "Bilingual",
      status: "approved",
      url: "https://assets.example.edu.sg/ucc-campus-tour",
      usageNotes: "Use for open house, parent trust, and PRC student posts.",
    },
    {
      id: "asset-ai-demo",
      name: "AI Classroom Demo Clips",
      type: "video",
      courseId: "course-ai",
      campaignId: "campaign-ai",
      language: "English",
      status: "approved",
      url: "https://assets.example.edu.sg/ucc-ai-demo",
      usageNotes: "Avoid implying job guarantees; focus on practical AI task examples.",
    },
    {
      id: "asset-agent-kit",
      name: "Agent Course Proof Pack",
      type: "campaign asset",
      courseId: "course-master-pathway",
      campaignId: "campaign-agent",
      language: "Bilingual",
      status: "draft",
      url: "https://assets.example.edu.sg/ucc-agent-proof-pack",
      usageNotes: "Needs compliance review before external distribution.",
    },
  ],
  events: [
    {
      id: "event-cny",
      name: "Chinese New Year",
      date: "2026-02-17",
      type: "public holiday",
      audienceIds: ["aud-prc", "aud-parents"],
      campaignOpportunity: "Family decision content and Chinese-language greetings without hard selling.",
    },
    {
      id: "event-hari-raya",
      name: "Hari Raya",
      date: "2026-03-21",
      type: "public holiday",
      audienceIds: ["aud-international", "aud-parents"],
      campaignOpportunity: "Community and campus culture content.",
    },
    {
      id: "event-dragon-boat",
      name: "Dragon Boat Festival",
      date: "2026-06-19",
      type: "marketing event",
      audienceIds: ["aud-prc", "aud-parents"],
      campaignOpportunity: "Cultural relevance and parent/community posts.",
    },
    {
      id: "event-mid-autumn",
      name: "Mid-Autumn Festival",
      date: "2026-09-25",
      type: "marketing event",
      audienceIds: ["aud-prc", "aud-parents", "aud-agents"],
      campaignOpportunity: "Chinese parent nurturing, student-family connection, and bilingual proof content.",
    },
    {
      id: "event-deepavali",
      name: "Deepavali",
      date: "2026-11-08",
      type: "public holiday",
      audienceIds: ["aud-international", "aud-adult-learners"],
      campaignOpportunity: "Community, cultural inclusion, and campus life content.",
    },
    {
      id: "event-christmas",
      name: "Christmas",
      date: "2026-12-25",
      type: "public holiday",
      audienceIds: ["aud-international", "aud-parents", "aud-working-adults"],
      campaignOpportunity: "Year-end recap, next intake reminders, and warm community posts.",
    },
    {
      id: "event-school-period-q3",
      name: "Singapore School Term / Planning Period",
      date: "2026-07-01",
      type: "school period",
      audienceIds: ["aud-parents", "aud-prc", "aud-international"],
      campaignOpportunity: "Parent planning, course comparison, and campus visit content.",
    },
    {
      id: "event-open-house",
      name: "UCC Open House Period",
      date: "2026-08-22",
      type: "campus event",
      audienceIds: ["aud-prc", "aud-parents", "aud-international"],
      campaignOpportunity: "Campus visit, course proof, and admissions Q&A campaign anchor.",
    },
    {
      id: "event-education-fair",
      name: "Education Fair Push",
      date: "2026-09-12",
      type: "marketing event",
      audienceIds: ["aud-prc", "aud-international", "aud-agents", "aud-parents"],
      campaignOpportunity: "Lead capture, fair follow-up, agent handoff, and course-fit content.",
    },
    {
      id: "event-agent-recruitment",
      name: "Agent Recruitment Period",
      date: "2026-09-21",
      type: "marketing event",
      audienceIds: ["aud-agents", "aud-partners"],
      campaignOpportunity: "Partner proof packs, onboarding webinar, and agent response workflow.",
    },
    {
      id: "event-campus-life",
      name: "Campus Event Content Window",
      date: "2026-10-03",
      type: "campus event",
      audienceIds: ["aud-prc", "aud-international", "aud-parents"],
      campaignOpportunity: "Collect photos, student stories, video clips, and event recap assets.",
    },
    {
      id: "event-1111",
      name: "11.11 Campaign Window",
      date: "2026-11-11",
      type: "marketing event",
      audienceIds: ["aud-prc", "aud-adult-learners"],
      campaignOpportunity: "Use deadline and course-fit prompts without discount-led hard selling.",
    },
    {
      id: "event-1212",
      name: "12.12 Campaign Window",
      date: "2026-12-12",
      type: "marketing event",
      audienceIds: ["aud-prc", "aud-working-adults"],
      campaignOpportunity: "Year-end planning, short course, and next intake reminders.",
    },
    {
      id: "event-intake-q1",
      name: "Next Student Intake Period",
      date: "2027-01-05",
      type: "intake",
      audienceIds: ["aud-prc", "aud-parents", "aud-international", "aud-working-adults"],
      campaignOpportunity: "Admissions checklist, course fit content, campus tour follow-up, and application reminders.",
    },
  ],
  connectors: [
    {
      id: "connector-meta",
      platform: "Facebook",
      mode: "direct API",
      status: "needs credentials",
      supportedMetrics: ["reach", "engagement", "comments", "shares", "clicks", "leads"],
      lastSync: "",
      notes: "Connect Meta/Instagram APIs when app credentials and permissions are available.",
    },
    {
      id: "connector-instagram",
      platform: "Instagram",
      mode: "direct API",
      status: "needs credentials",
      supportedMetrics: ["reach", "impressions", "saves", "shares", "comments", "followers", "profile visits"],
      lastSync: "",
      notes: "Use Instagram Graph API where the business account and permissions are available.",
    },
    {
      id: "connector-tiktok",
      platform: "TikTok",
      mode: "direct API",
      status: "needs credentials",
      supportedMetrics: ["views", "watch time", "comments", "shares", "profile visits"],
      lastSync: "",
      notes: "Use direct API where account access permits; CSV/PDF import remains available.",
    },
    {
      id: "connector-linkedin",
      platform: "LinkedIn",
      mode: "direct API",
      status: "needs credentials",
      supportedMetrics: ["impressions", "clicks", "engagement", "followers", "leads"],
      lastSync: "",
      notes: "Recommended for agents, partners, employers, and B2B reporting.",
    },
    {
      id: "connector-youtube",
      platform: "YouTube Shorts",
      mode: "direct API",
      status: "needs credentials",
      supportedMetrics: ["views", "watch time", "likes", "comments", "shares", "subscribers", "clicks"],
      lastSync: "",
      notes: "Use YouTube Analytics API for Shorts performance and searchable education content.",
    },
    {
      id: "connector-x-twitter",
      platform: "X/Twitter",
      mode: "direct API",
      status: "needs credentials",
      supportedMetrics: ["impressions", "engagement", "replies", "reposts", "clicks", "followers"],
      lastSync: "",
      notes: "Use X API where access tier and account permissions allow reporting.",
    },
    {
      id: "connector-threads",
      platform: "Threads",
      mode: "direct API",
      status: "needs credentials",
      supportedMetrics: ["views", "likes", "replies", "reposts", "quotes", "followers"],
      lastSync: "",
      notes: "Use Meta/Threads API access where available; otherwise import manual analytics.",
    },
    {
      id: "connector-xhs",
      platform: "Xiaohongshu",
      mode: "CSV/PDF import",
      status: "manual import only",
      supportedMetrics: ["views", "saves", "comments", "shares", "followers"],
      lastSync: "",
      notes: "Use exported analytics for PRC student and parent content until direct access is configured.",
    },
    {
      id: "connector-wechat",
      platform: "WeChat",
      mode: "CSV/PDF import",
      status: "manual import only",
      supportedMetrics: ["article reads", "shares", "follows", "enquiries"],
      lastSync: "",
      notes: "Use WeChat export/import for Chinese parent and agent nurturing reports.",
    },
  ],
  aiModules: [
    {
      id: "ai-content-strategy",
      name: "Strategy AI",
      purpose: "Turn business objectives into a clear monthly strategy direction before campaign or content work starts.",
      input: "Objective, audience, course, competitor gap, platform mix",
      requiredInputs: ["Marketing objective", "Target audience", "Course/category", "Competitor gap", "Priority platforms"],
      logic: "Map funnel stage to content pillars, proof points, campaign rhythm, and CTA",
      output: "Content strategy brief and pillar recommendations",
      expectedOutputFormat: "Approved strategy brief with goal, audience pain points, pillars, platform strategy, angles, and compliance reminders.",
      humanApprovalStep: "Marketing manager approves the strategy brief before calendar generation.",
      errorHandling: "If objective, audience, or course is missing, return a setup warning instead of generating content.",
      complianceGuardrails: ["No guaranteed outcomes", "Use proof-based claims", "Keep education decisions factual"],
      status: "active",
      inputSource: "Objectives, Courses & Audiences, Competitor Intelligence",
      outputDestination: "Strategy Brief",
      lastUsedDate: "2026-07-03",
      reviewerRequired: true,
      riskLevel: "medium",
      outputHistory: [
        {
          id: "hist-strategy-brief",
          title: "July UCC monthly strategy brief",
          generatedAt: "2026-07-03T09:00:00.000Z",
          status: "approved",
          reviewer: "Marketing Manager",
          complianceScore: 92,
          brandFitScore: 88,
          editHistory: ["Draft generated from social goals", "Compliance language tightened", "Approved for calendar planning"],
          outputSummary: "Campus proof, course-fit guidance, and parent-safe lead generation strategy.",
          approvedAt: "2026-07-03T09:30:00.000Z",
        },
      ],
    },
    {
      id: "ai-copywriting",
      name: "Copywriting AI",
      purpose: "Create platform-native captions, hooks, CTAs, and variants from the approved strategy brief and playbooks.",
      input: "Approved strategy, platform playbook, course proof, compliance rules",
      requiredInputs: ["Approved strategy brief", "Platform playbook", "Course proof", "Audience", "Compliance reminders"],
      logic: "Generate platform-native English or Chinese copy without hard-selling",
      output: "Caption, hook, CTA, hashtags, and variations",
      expectedOutputFormat: "Draft hook, caption or script, CTA, hashtags, compliance note, and final-copy field for review.",
      humanApprovalStep: "Copy reviewer approves the final caption before design/video production.",
      errorHandling: "If the strategy brief is not approved, block generation and ask for approval first.",
      complianceGuardrails: ["No unsupported rankings", "No job, salary, admission, visa, or work guarantee", "Avoid hard-selling"],
      status: "active",
      inputSource: "Strategy Brief, Platform Playbooks, Calendar Item",
      outputDestination: "Production Board and Content Calendar",
      lastUsedDate: "2026-07-03",
      reviewerRequired: true,
      riskLevel: "high",
      outputHistory: [
        {
          id: "hist-copy-ai-course",
          title: "AI course LinkedIn proof post",
          generatedAt: "2026-07-03T10:00:00.000Z",
          status: "in review",
          reviewer: "Copy Lead",
          complianceScore: 86,
          brandFitScore: 90,
          editHistory: ["Draft generated", "CTA softened to enquiry language"],
          outputSummary: "LinkedIn mentor-style post about practical AI learning proof.",
        },
      ],
    },
    {
      id: "ai-calendar",
      name: "Calendar Planning AI",
      purpose: "Schedule content from the approved objective cascade across platforms, campaigns, deadlines, and resource capacity.",
      input: "Campaign timeline, events, priority platforms, resources",
      requiredInputs: ["Approved objective", "Campaign timeline", "Events", "Priority platforms", "Resource limits"],
      logic: "Schedule content around intake periods, holidays, and production capacity",
      output: "Calendar plan with owners, stages, and deadlines",
      expectedOutputFormat: "30-day calendar with planned date, platform, campaign, course, audience, owner, due date, approval stage, and KPI target.",
      humanApprovalStep: "Marketing manager approves the calendar before production starts.",
      errorHandling: "If campaign dates or owners are missing, mark affected items as needs setup.",
      complianceGuardrails: ["Follow objective-first workflow", "Respect human approval gates", "Do not overfill team capacity"],
      status: "active",
      inputSource: "Objectives, Campaigns, Platform Strategy, Budget & Resources",
      outputDestination: "Content Calendar",
      lastUsedDate: "2026-07-03",
      reviewerRequired: true,
      riskLevel: "medium",
      outputHistory: [],
    },
    {
      id: "ai-competitor",
      name: "Competitor Research AI",
      purpose: "Summarize competitor behavior and turn observed gaps into content opportunities.",
      input: "Competitor formats, hooks, offers, posting frequency, audience response",
      requiredInputs: ["Competitor name", "Platforms", "Formats", "Tone", "Observed strengths", "Content gaps"],
      logic: "Find gaps, repeated patterns, and whitespace opportunities",
      output: "Competitor matrix and content opportunity list",
      expectedOutputFormat: "Competitor comparison matrix, gaps, whitespace opportunities, and recommended response themes.",
      humanApprovalStep: "Marketing manager reviews competitor notes before they influence campaign direction.",
      errorHandling: "If competitor evidence is thin, label the recommendation as low confidence.",
      complianceGuardrails: ["Do not copy competitor claims", "Use observed evidence only", "Avoid disparaging competitors"],
      status: "active",
      inputSource: "Competitor Intelligence",
      outputDestination: "Competitor Intelligence and Strategy Brief",
      lastUsedDate: "",
      reviewerRequired: true,
      riskLevel: "medium",
      outputHistory: [],
    },
    {
      id: "ai-compliance",
      name: "Compliance Checker AI",
      purpose: "Flag risky education marketing claims before copy, campaigns, or assets are approved.",
      input: "Caption, script, landing page copy, testimonial, course claim",
      requiredInputs: ["Draft copy", "Course proof", "Claim context", "Audience", "Destination platform"],
      logic: "Flag risky education marketing claims and suggest factual rewrites",
      output: "Risk labels, flagged phrases, safer copy suggestions",
      expectedOutputFormat: "Risk flags, compliance score, safer rewrite notes, and approval recommendation.",
      humanApprovalStep: "Compliance reviewer approves before scheduling or publishing.",
      errorHandling: "If claims cannot be verified, mark the output high risk and block publishing.",
      complianceGuardrails: ["Flag employment guarantee", "Flag salary claims", "Flag visa/work claims", "Flag admission or outcome guarantees", "Flag unsupported rankings and testimonials"],
      status: "active",
      inputSource: "Content Calendar, Production Board, Compliance Checker",
      outputDestination: "Compliance Checker and Calendar approval stage",
      lastUsedDate: "2026-07-03",
      reviewerRequired: true,
      riskLevel: "high",
      outputHistory: [
        {
          id: "hist-compliance-risk",
          title: "Visa/work wording review",
          generatedAt: "2026-07-03T10:20:00.000Z",
          status: "approved",
          reviewer: "Compliance Reviewer",
          complianceScore: 94,
          brandFitScore: 82,
          editHistory: ["Flagged work-pass wording", "Rewritten as factual admissions guidance", "Approved after review"],
          outputSummary: "Replaced risky visa/work implication with process-based wording.",
          approvedAt: "2026-07-03T10:45:00.000Z",
        },
      ],
    },
    {
      id: "ai-video",
      name: "Video Script AI",
      purpose: "Create short-form scripts and shot notes that match platform playbooks and available proof assets.",
      input: "Course proof, audience pain point, platform, CTA",
      requiredInputs: ["Course proof", "Audience pain point", "Platform", "Format", "CTA", "Available asset"],
      logic: "Build short-form scripts with opening, proof, visual beats, and CTA",
      output: "Video script, shot list, voiceover, and edit notes",
      expectedOutputFormat: "Opening hook, scene beats, voiceover, shot list, edit notes, CTA, and compliance note.",
      humanApprovalStep: "Video reviewer approves the script before filming/editing.",
      errorHandling: "If no proof asset exists, return a shot request instead of inventing proof.",
      complianceGuardrails: ["No exaggerated outcomes", "Use real campus/course proof", "Avoid unsupported student claims"],
      status: "active",
      inputSource: "Calendar Item, Asset Library, Platform Playbooks",
      outputDestination: "Production Board",
      lastUsedDate: "",
      reviewerRequired: true,
      riskLevel: "medium",
      outputHistory: [],
    },
    {
      id: "ai-kpi",
      name: "KPI Analysis AI",
      purpose: "Compare targets with actual data from manual entry, CSV imports, and approved PDF imports.",
      input: "Targets, actual results, platform metrics, course-level results",
      requiredInputs: ["KPI targets", "Actual results", "Platform metrics", "Campaign", "Course"],
      logic: "Compare plan versus actual and explain variance",
      output: "On-track status and next-action recommendations",
      expectedOutputFormat: "Status label, variance explanation, course/platform impact, and next action.",
      humanApprovalStep: "Marketing manager reviews KPI conclusions before management reporting.",
      errorHandling: "If actual data is missing, return a data-needed warning instead of assuming performance.",
      complianceGuardrails: ["Use actual data only", "Do not infer enrolments without records", "Label missing data clearly"],
      status: "active",
      inputSource: "KPI Tracker, PDF Imports, Performance Learning",
      outputDestination: "KPI Tracker and Reports",
      lastUsedDate: "2026-07-03",
      reviewerRequired: true,
      riskLevel: "medium",
      outputHistory: [],
    },
    {
      id: "ai-budget",
      name: "Budget and Resource Planning AI",
      purpose: "Estimate resource load, cost pressure, and bottlenecks for campaigns and offline activations.",
      input: "Campaign scope, assets, staff, venue, channel mix, KPI target",
      requiredInputs: ["Campaign scope", "Platform mix", "Staff assigned", "Assets", "Venue", "KPI target"],
      logic: "Estimate budget, resource load, and bottlenecks",
      output: "Budget/resource plan with risk notes",
      expectedOutputFormat: "Budget table, team hours, equipment, venue, offline costs, total cost, and risk notes.",
      humanApprovalStep: "Marketing manager reviews resource plan before campaign activation.",
      errorHandling: "If cost or owner fields are missing, mark the plan needs setup.",
      complianceGuardrails: ["Show assumptions clearly", "Separate planned from actual cost", "Do not hide resource gaps"],
      status: "active",
      inputSource: "Campaigns, Asset Library, Budget & Resources",
      outputDestination: "Budget & Resources",
      lastUsedDate: "",
      reviewerRequired: true,
      riskLevel: "low",
      outputHistory: [],
    },
    {
      id: "ai-campaign",
      name: "Campaign Planning AI",
      purpose: "Convert a UCC objective into a multi-channel campaign plan with owners and measurable outcomes.",
      input: "Objective, course, audience, events, channel mix, budget",
      requiredInputs: ["Objective", "Course", "Audience", "Events", "Channel mix", "Budget"],
      logic: "Convert business objective into multi-channel campaign plan",
      output: "Campaign plan with timeline, content pieces, KPI target, and owner",
      expectedOutputFormat: "Campaign objective, audience, course, platform mix, timeline, content pieces, budget, KPI target, and owner.",
      humanApprovalStep: "Marketing manager approves the campaign before calendar scheduling.",
      errorHandling: "If objective/audience/course is incomplete, keep campaign in planning status.",
      complianceGuardrails: ["Tie content to business goals", "Avoid hard-selling", "Keep course claims proof-based"],
      status: "active",
      inputSource: "Objectives, Courses & Audiences, Campaigns",
      outputDestination: "Campaigns and Content Calendar",
      lastUsedDate: "",
      reviewerRequired: true,
      riskLevel: "medium",
      outputHistory: [],
    },
    {
      id: "ai-multilingual",
      name: "Multilingual English/Chinese AI",
      purpose: "Create or localize content for English and Chinese audiences without direct translation errors.",
      input: "English or Chinese brief, audience, compliance notes, platform",
      requiredInputs: ["Source brief", "Target language", "Audience", "Platform", "Compliance notes"],
      logic: "Localize meaning and tone instead of direct translating",
      output: "English, Chinese, or bilingual content variants",
      expectedOutputFormat: "English, Chinese, or bilingual variants with audience notes and compliance reminders.",
      humanApprovalStep: "Bilingual reviewer approves before Chinese-language publishing or agent distribution.",
      errorHandling: "If reviewer or target language is missing, mark output needs setup.",
      complianceGuardrails: ["Avoid direct translation of claims", "Keep parent messaging factual", "Review Chinese wording for visa/work implications"],
      status: "needs setup",
      inputSource: "Strategy Brief, Asset Library, Platform Playbooks",
      outputDestination: "Production Board and Asset Library",
      lastUsedDate: "",
      reviewerRequired: true,
      riskLevel: "high",
      outputHistory: [],
    },
    {
      id: "ai-performance-recommendation",
      name: "Performance Recommendation AI",
      purpose: "Turn actual results into repeat, improve, stop, repurpose, CTA, and nurture recommendations.",
      input: "Approved KPI results, platform performance, post results, course outcomes",
      requiredInputs: ["Actual KPI records", "Performance results", "Campaign", "Course", "Platform"],
      logic: "Identify strong formats, weak formats, conversion gaps, and next actions from actual data",
      output: "Repeat/improve/stop recommendations with rationale",
      expectedOutputFormat: "Recommendation, evidence source, impacted audience/course/platform, and action owner.",
      humanApprovalStep: "Marketing manager approves recommendations before they change campaign direction.",
      errorHandling: "If there is no actual data, return a data-needed warning and do not guess.",
      complianceGuardrails: ["Use actual results only", "Do not overstate causation", "Separate lead performance from enrolment performance"],
      status: "active",
      inputSource: "KPI Tracker and Performance Learning",
      outputDestination: "Reports and Dashboard",
      lastUsedDate: "2026-07-03",
      reviewerRequired: true,
      riskLevel: "medium",
      outputHistory: [],
    },
  ],
  kpiRecords: [
    {
      id: "kpi-ai-linkedin",
      campaignId: "campaign-ai",
      courseId: "course-ai",
      channel: "LinkedIn",
      leads: 26,
      agentEnquiries: 0,
      applications: 8,
      campusTourBookings: 5,
      enrolments: 3,
      spend: 820,
      status: "on track",
      recommendation: "Turn AI trainer proof into a weekly LinkedIn series and add stronger enquiry CTA.",
    },
    {
      id: "kpi-english-xhs",
      campaignId: "campaign-english",
      courseId: "course-english",
      channel: "Xiaohongshu",
      leads: 18,
      agentEnquiries: 2,
      applications: 5,
      campusTourBookings: 7,
      enrolments: 2,
      spend: 460,
      status: "needs attention",
      recommendation: "Add more Chinese parent proof content and clarify English placement process.",
    },
    {
      id: "kpi-agent-wechat",
      campaignId: "campaign-agent",
      courseId: "course-master-pathway",
      channel: "WeChat",
      leads: 12,
      agentEnquiries: 9,
      applications: 4,
      campusTourBookings: 0,
      enrolments: 0,
      spend: 320,
      status: "behind target",
      recommendation: "Create a stronger agent proof pack and schedule partner follow-up calls.",
    },
  ],
};

const seedBrief: StrategyBrief = {
  monthlyCampaignGoal:
    "Turn undecided students and cautious parents into campus tour bookings by showing practical proof of student support, program fit, and career preparation.",
  audiencePainPoints: [
    "Students feel pressure to choose a course before they understand daily college life.",
    "Parents want proof that tuition leads to real skills, not just glossy promises.",
    "Transfer students need a clear path without feeling behind.",
    "Applicants are confused by deadlines, documents, scholarships, and program differences.",
  ],
  contentPillars: [
    "Campus Proof",
    "Career Path Clarity",
    "Student Life Reality",
    "Admissions Confidence",
  ],
  platformStrategy: {
    TikTok:
      "Use student POV clips, quick myth-busting, and comments as research prompts for admissions questions.",
    Instagram:
      "Use carousels, reels, and campus visuals that feel saveable for students comparing choices.",
    "YouTube Shorts":
      "Use searchable student decision stories and concise explainers for course fit and campus tour intent.",
    LinkedIn:
      "Show faculty, curriculum, employer-aligned projects, and alumni proof without making outcome guarantees.",
    Facebook:
      "Serve parents and community members with reassuring posts about process, safety, support, and factual next steps.",
    "X/Twitter":
      "Publish sharp planning tips, deadline reminders, and myth corrections that can be scanned quickly.",
    Threads:
      "Start casual conversations about choosing courses, asking better questions, and lowering application anxiety.",
  },
  contentMixRecommendation:
    "40% proof and demonstrations, 25% student-life relatability, 20% admissions guidance, 15% community trust. Use video for campus proof, carousel for comparison, text for parent reassurance, and short posts for deadline clarity.",
  toneGuidance:
    "Warm, candid, and factual. Be the helpful senior who tells the truth, the mentor who explains tradeoffs, and the admissions guide who makes the next step clear.",
  keyAnglesToOwn: [
    "Course choice is easier when students can see the work, not just the brochure.",
    "Good college planning is a family conversation with facts on the table.",
    "Career preparation starts with projects, mentors, and habits, not guarantees.",
    "A campus visit should answer practical questions before enrollment pressure begins.",
  ],
  complianceReminders: [
    "Avoid guaranteed outcomes.",
    "Avoid unsupported employment or salary claims.",
    "Avoid misleading student visa or work claims.",
    "Keep copy factual, proof-based, and easy to verify.",
  ],
  approved: true,
  updatedAt: "2026-06-27T00:00:00.000Z",
};

type TopicSeed = {
  pillar: string;
  topic: string;
  angle: string;
  proof: string;
  audience: string;
  ctaFocus: string;
  goalConnection: string;
};

const topicSeeds: TopicSeed[] = [
  {
    pillar: "Admissions Confidence",
    topic: "How to compare colleges without getting sold to",
    angle: "Use a five-question campus tour checklist before making any decision.",
    proof: "Admissions advisors share the exact questions they wish families asked earlier.",
    audience: "Parents and final-year students",
    ctaFocus: "Download the campus tour checklist",
    goalConnection: "Supports campus tour bookings with practical planning value.",
  },
  {
    pillar: "Campus Proof",
    topic: "What a real IT lab session looks like",
    angle: "Show the workbench, the brief, and the student output in one fast walkthrough.",
    proof: "Applied AI and business students build a simple booking flow in class.",
    audience: "Tech-curious students",
    ctaFocus: "Book a lab walkthrough",
    goalConnection: "Moves program interest from vague curiosity to tour intent.",
  },
  {
    pillar: "Student Life Reality",
    topic: "First-week things nobody puts in the brochure",
    angle: "Normalize the small practical questions students are shy to ask.",
    proof: "Student council answers questions about rooms, food, commute, and schedules.",
    audience: "Incoming students",
    ctaFocus: "Ask a first-week question",
    goalConnection: "Builds trust by reducing student anxiety before inquiry.",
  },
  {
    pillar: "Career Path Clarity",
    topic: "Hospitality projects that teach real guest experience",
    angle: "Explain how a service-design class turns manners into measurable skills.",
    proof: "Students practice check-in scripts, complaint handling, and service recovery.",
    audience: "Hospitality applicants and parents",
    ctaFocus: "See the hospitality studio on tour",
    goalConnection: "Connects program content to practical skill-building.",
  },
  {
    pillar: "Admissions Confidence",
    topic: "Scholarship questions parents should ask early",
    angle: "Make aid conversations calmer by separating eligibility, deadlines, and documents.",
    proof: "Admissions team lists the documents that slow applications down most often.",
    audience: "Parents",
    ctaFocus: "Request a scholarship checklist",
    goalConnection: "Creates qualified admissions inquiries with realistic next steps.",
  },
  {
    pillar: "Campus Proof",
    topic: "Digital media critique day",
    angle: "Show how feedback improves a student poster from rough layout to clearer message.",
    proof: "Faculty gives notes on hierarchy, readability, and audience fit.",
    audience: "Creative students",
    ctaFocus: "Join the next open studio visit",
    goalConnection: "Shows teaching quality without relying on abstract claims.",
  },
  {
    pillar: "Student Life Reality",
    topic: "Commuter-friendly campus routines",
    angle: "Give students a realistic morning plan instead of pretending college is effortless.",
    proof: "Current students share lockers, study corners, and best arrival windows.",
    audience: "Commuter students and parents",
    ctaFocus: "Save the student routine guide",
    goalConnection: "Improves save rates through concrete student-life utility.",
  },
  {
    pillar: "Career Path Clarity",
    topic: "What makes a portfolio useful before graduation",
    angle: "A portfolio is proof of practice, not a magic job promise.",
    proof: "Program leads show sample project categories students can build over time.",
    audience: "Career-focused applicants",
    ctaFocus: "Ask about portfolio-building courses",
    goalConnection: "Links career preparation to factual curriculum proof.",
  },
  {
    pillar: "Admissions Confidence",
    topic: "Transfer student document map",
    angle: "Reduce overwhelm by turning requirements into a simple sequence.",
    proof: "Registrar explains which documents need original copies and which can be prepared first.",
    audience: "Transfer students",
    ctaFocus: "Message admissions for a transfer checklist",
    goalConnection: "Captures high-intent inquiries from transfer applicants.",
  },
  {
    pillar: "Campus Proof",
    topic: "One classroom, three kinds of student support",
    angle: "Show coaching, peer practice, and faculty feedback in a single class moment.",
    proof: "Student support team and faculty coordinate on class presentations.",
    audience: "Parents and undecided students",
    ctaFocus: "Tour a live class observation slot",
    goalConnection: "Builds parent confidence in support systems.",
  },
  {
    pillar: "Student Life Reality",
    topic: "What students wish they brought on campus tour day",
    angle: "Make tour prep feel friendly, specific, and low-pressure.",
    proof: "Tour guides list water, ID, commute buffer, and questions to bring.",
    audience: "Tour-ready families",
    ctaFocus: "Reserve a tour schedule",
    goalConnection: "Turns social saves into tour bookings.",
  },
  {
    pillar: "Career Path Clarity",
    topic: "The difference between a course name and a career direction",
    angle: "Help students compare the skills inside programs, not just the labels.",
    proof: "Academic advisors map three programs to sample projects and student strengths.",
    audience: "Undecided students comparing course pathways",
    ctaFocus: "Take the program-fit conversation",
    goalConnection: "Supports inquiry quality by clarifying program fit.",
  },
  {
    pillar: "Admissions Confidence",
    topic: "Application mistakes that cause delays",
    angle: "A calm, factual list of avoidable errors beats last-minute panic.",
    proof: "Admissions team highlights mismatched names, missing signatures, and unclear scans.",
    audience: "Applicants and parents",
    ctaFocus: "Check your application list",
    goalConnection: "Reduces friction for qualified applications.",
  },
  {
    pillar: "Campus Proof",
    topic: "Faculty office hours are not just for emergencies",
    angle: "Position support as a normal habit, not a rescue plan.",
    proof: "Faculty explain how students use office hours for project feedback.",
    audience: "Students who worry about falling behind",
    ctaFocus: "Ask about support during a campus visit",
    goalConnection: "Builds trust around student retention and support.",
  },
  {
    pillar: "Student Life Reality",
    topic: "A day in the life of a first-year digital media student",
    angle: "Show a grounded schedule with class, critique, lunch, and commute.",
    proof: "Student ambassador shares a real Tuesday schedule.",
    audience: "Creative applicants",
    ctaFocus: "Save this before choosing a course",
    goalConnection: "Makes the student experience concrete and shareable.",
  },
  {
    pillar: "Career Path Clarity",
    topic: "What parents can ask about internships without asking for guarantees",
    angle: "Shift from promised outcomes to support structures and requirements.",
    proof: "Career services explains partner conversations, readiness coaching, and eligibility checks.",
    audience: "Parents",
    ctaFocus: "Bring these questions to tour day",
    goalConnection: "Keeps career copy compliant while still useful.",
  },
  {
    pillar: "Admissions Confidence",
    topic: "Deadline map for July intake",
    angle: "Give families one clean view of inquiry, document, tour, and enrollment steps.",
    proof: "Admissions calendar is translated into a weekly planning list.",
    audience: "Applicants",
    ctaFocus: "Book the earliest open advising slot",
    goalConnection: "Moves deadline-aware audiences toward a clear action.",
  },
  {
    pillar: "Campus Proof",
    topic: "Library and study spaces that students actually use",
    angle: "Show where students work between classes, not just the prettiest room.",
    proof: "Student ambassadors point out quiet zones, group tables, and printing support.",
    audience: "Parents and commuters",
    ctaFocus: "Visit the study spaces on tour",
    goalConnection: "Strengthens campus visit motivation with practical proof.",
  },
  {
    pillar: "Student Life Reality",
    topic: "How to ask for help without feeling embarrassed",
    angle: "Make student support feel normal and accessible.",
    proof: "Guidance team shares the most common first questions they receive.",
    audience: "Anxious incoming students",
    ctaFocus: "Send one question before your visit",
    goalConnection: "Encourages low-friction conversations with admissions.",
  },
  {
    pillar: "Career Path Clarity",
    topic: "Student projects parents can understand",
    angle: "Translate project work into plain-language skills.",
    proof: "Faculty explain how a booking app, event plan, and brand poster show different skills.",
    audience: "Parents",
    ctaFocus: "Ask to see student project examples",
    goalConnection: "Improves parent trust in practical program value.",
  },
  {
    pillar: "Admissions Confidence",
    topic: "What happens after someone submits an inquiry",
    angle: "Demystify the next steps so the CTA feels safe and transparent.",
    proof: "Admissions outlines response time, advising call, tour options, and document guidance.",
    audience: "Inquiry-ready families",
    ctaFocus: "Submit a program question",
    goalConnection: "Reduces hesitation around lead capture.",
  },
  {
    pillar: "Campus Proof",
    topic: "The open house route in 30 seconds",
    angle: "Preview the campus path so visitors know what they will see.",
    proof: "Tour route includes admissions desk, labs, library, studios, and student support.",
    audience: "Tour-ready students",
    ctaFocus: "Pick an open house slot",
    goalConnection: "Directly supports campus tour attendance.",
  },
  {
    pillar: "Student Life Reality",
    topic: "Student budget questions worth asking",
    angle: "Be practical about daily costs without turning it into financial advice.",
    proof: "Students list typical transport, meals, printing, and project materials to ask about.",
    audience: "Parents and students",
    ctaFocus: "Bring this list to advising",
    goalConnection: "Builds credibility through transparent planning support.",
  },
  {
    pillar: "Career Path Clarity",
    topic: "How a hospitality student practices problem solving",
    angle: "Show a classroom scenario where service recovery is practiced step by step.",
    proof: "Faculty uses roleplay to teach listening, response options, and documentation.",
    audience: "Hospitality applicants",
    ctaFocus: "Tour the training room",
    goalConnection: "Shows skill development in a way families can inspect.",
  },
  {
    pillar: "Admissions Confidence",
    topic: "Questions to ask before choosing a course pathway",
    angle: "Help students compare interest, workload, and next-step course options.",
    proof: "Advisors answer the most common course pathway questions.",
    audience: "Course pathway applicants",
    ctaFocus: "Book a course pathway advising chat",
    goalConnection: "Builds qualified pathway inquiries.",
  },
  {
    pillar: "Campus Proof",
    topic: "Behind the scenes of student presentation day",
    angle: "Show preparation, feedback, and reflection rather than just final applause.",
    proof: "Students rehearse, receive notes, and revise before presenting.",
    audience: "Parents and students",
    ctaFocus: "Ask about presentation-based learning",
    goalConnection: "Provides proof of learning process and support.",
  },
  {
    pillar: "Student Life Reality",
    topic: "How students choose organizations without overloading their week",
    angle: "Normalize choosing one meaningful activity first.",
    proof: "Student affairs shares a realistic org fair planning tip.",
    audience: "Incoming first-years",
    ctaFocus: "Save the first-month campus checklist",
    goalConnection: "Supports student-life confidence and saves.",
  },
  {
    pillar: "Career Path Clarity",
    topic: "What to look for in a practical curriculum",
    angle: "Give families a checklist for projects, feedback, equipment, and support.",
    proof: "Academic team maps each checklist item to inspectable campus proof.",
    audience: "Parents",
    ctaFocus: "Use the checklist on tour day",
    goalConnection: "Connects content back to tour quality and decision support.",
  },
  {
    pillar: "Admissions Confidence",
    topic: "The one thing to prepare before an advising call",
    angle: "A better question beats a perfect script.",
    proof: "Advisors suggest bringing a short list of interests, concerns, and schedule constraints.",
    audience: "Applicants",
    ctaFocus: "Schedule a 15-minute advising call",
    goalConnection: "Moves engaged prospects toward admissions conversation.",
  },
  {
    pillar: "Campus Proof",
    topic: "Student support desk questions in plain English",
    angle: "Turn a vague support promise into exact examples.",
    proof: "Support staff list advising, records, guidance, and campus navigation help.",
    audience: "Parents and students",
    ctaFocus: "Ask support questions during the visit",
    goalConnection: "Strengthens proof for families evaluating support quality.",
  },
];

export function calculateAuditScore(audit: SocialAudit) {
  const values = Object.values(audit.scores);
  const average = values.reduce((sum, score) => sum + score, 0) / values.length;
  return Math.round(average * 10);
}

export function getAuditIssues(audit: SocialAudit) {
  const labels: Record<keyof AuditScores, string> = {
    profileCompleteness: "Profile completeness needs clearer proof and links.",
    postingConsistency: "Posting rhythm is not predictable enough for the audience.",
    contentMix: "Content mix is too narrow for the full decision journey.",
    hookQuality: "Opening hooks are not specific enough to stop the scroll.",
    ctaClarity: "Calls to action need a cleaner next step.",
    visualConsistency: "Visual system needs tighter color, type, and layout control.",
    engagementPerformance: "Engagement is below the current audience potential.",
  };

  const issues = Object.entries(audit.scores)
    .filter(([, score]) => score < 7)
    .sort(([, scoreA], [, scoreB]) => scoreA - scoreB)
    .map(([key]) => labels[key as keyof AuditScores]);

  return issues.length > 0
    ? issues
    : ["Platform is in a healthy range; keep testing content-specific improvements."];
}

export function getAuditRecommendations(audit: SocialAudit) {
  const recommendations: Record<keyof AuditScores, string> = {
    profileCompleteness:
      "Add program links, campus tour CTA, proof points, and parent-safe language to the profile.",
    postingConsistency:
      "Commit to a visible weekly rhythm with two proof posts, one guidance post, and one student-life post.",
    contentMix:
      "Balance proof, student reality, admissions help, and parent trust instead of posting only announcements.",
    hookQuality:
      "Rewrite hooks around a specific student or parent question before writing the caption.",
    ctaClarity:
      "Use one action per post: book a tour, ask a question, save a checklist, or request advising.",
    visualConsistency:
      "Create reusable templates for program proof, admissions guidance, and student POV content.",
    engagementPerformance:
      "Repeat posts with saves, questions, and campus-tour intent; pause formats with low completion or comments.",
  };

  return Object.entries(audit.scores)
    .sort(([, scoreA], [, scoreB]) => scoreA - scoreB)
    .slice(0, 3)
    .map(([key]) => recommendations[key as keyof AuditScores]);
}

export function generateCalendarFromBrief(
  brief: StrategyBrief,
  brand: BrandProfile,
  startDate = "2026-07-01",
  socialGoals?: SocialGoalSettings,
): CalendarItem[] {
  const statusCycle: CalendarStatus[] = [
    "approved",
    "scheduled",
    "drafting",
    "design",
    "review",
    "idea",
    "scheduled",
  ];

  const platformCycle =
    socialGoals?.priorityPlatforms.length
      ? socialGoals.priorityPlatforms
      : platforms;
  const pillarCycle =
    socialGoals?.contentPriorities.length
      ? socialGoals.contentPriorities
      : brief.contentPillars;

  return topicSeeds.slice(0, 30).map((topic, index) => {
    const platform = platformCycle[index % platformCycle.length];
    const date = addDays(startDate, index);
    const rule = platformRules[platform];
    const contentPillar =
      pillarCycle.find((pillar) => pillar === topic.pillar) ??
      pillarCycle[index % Math.max(pillarCycle.length, 1)] ??
      topic.pillar;
    const platformCopy = buildPlatformNativeCopy(platform, topic, brand);

    return {
      id: `day-${String(index + 1).padStart(2, "0")}`,
      itemKind: "post",
      plannedDate: date,
      actualPostDate: "",
      date,
      platform,
      campaignId: socialGoals ? seedUccStrategy.campaigns[index % seedUccStrategy.campaigns.length]?.id : "",
      courseId: socialGoals ? seedUccStrategy.courses[index % seedUccStrategy.courses.length]?.id : "",
      audienceId: socialGoals ? seedUccStrategy.audiences[index % seedUccStrategy.audiences.length]?.id : "",
      contentPillar,
      contentTopic: topic.topic,
      format: platformCopy.format,
      hook: platformCopy.hook,
      caption: platformCopy.caption,
      visualDirection: platformCopy.visualDirection,
      cta: platformCopy.cta,
      hashtags: platformCopy.hashtags,
      bestPostingTime: rule.bestPostingTime,
      productionNotes: platformCopy.productionNotes,
      assignedRole: platformCopy.assignedRole,
      owner: roleLabelForSeed(platformCopy.assignedRole),
      reviewer: "Marketing Manager",
      dueDate: date,
      blocker: "",
      status: statusCycle[index % statusCycle.length],
      approvalStage:
        statusCycle[index % statusCycle.length] === "posted"
          ? "published"
          : statusCycle[index % statusCycle.length] === "scheduled"
            ? "scheduled"
            : statusCycle[index % statusCycle.length] === "approved"
              ? "compliance approved"
              : "idea",
      businessGoalConnection: buildBusinessGoalConnection(
        topic.goalConnection,
        socialGoals,
      ),
      complianceNote:
        "Keep claims factual. Do not guarantee admission, jobs, salary, visas, or work eligibility.",
      videoScript: platformCopy.videoScript,
      shotNotes: platformCopy.shotNotes,
      finalCaption: "",
      finalAssetLink: "",
      publishedUrl: "",
      kpiResult: "",
      followUpAction: "",
    };
  });
}

function roleLabelForSeed(role: Role) {
  return role
    .split(" ")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function createSeedWorkspaceData(): MarketingWorkspaceData {
  const calendar = generateCalendarFromBrief(seedBrief, seedBrand, "2026-07-01", seedSocialGoals);

  return {
    version: 1,
    generatedAt: "2026-06-27T00:00:00.000Z",
    brand: seedBrand,
    socialGoals: seedSocialGoals,
    ucc: seedUccStrategy,
    pdfDataSource: seedPdfDataSource,
    audits: seedAudits,
    competitors: seedCompetitors,
    brief: seedBrief,
    calendar,
    performanceResults: buildSeedPerformance(calendar),
    connections: [],
    aiIntegration: createDefaultAiIntegration(),
  };
}

export function analyzePerformance(data: MarketingWorkspaceData) {
  const rows = data.performanceResults
    .map((result) => {
      const item = data.calendar.find(
        (calendarItem) => calendarItem.id === result.calendarItemId,
      );

      if (!item) {
        return null;
      }

      const actions =
        result.engagement +
        result.comments * 2 +
        result.shares * 3 +
        result.saves * 3 +
        result.clicks * 4 +
        result.followsGained * 6;
      const efficiency = result.reach > 0 ? actions / result.reach : 0;

      return {
        item,
        result,
        actions,
        efficiency,
      };
    })
    .filter((row): row is NonNullable<typeof row> => Boolean(row));

  const topPlatform = topGroup(rows, (row) => row.item.platform);
  const topPillar = topGroup(rows, (row) => row.item.contentPillar);
  const weakFormat = bottomGroup(rows, (row) => row.item.format);
  const topHook = [...rows].sort((a, b) => b.efficiency - a.efficiency)[0];

  return {
    rows,
    topPlatform,
    topPillar,
    weakFormat,
    topHook,
    repeat: rows
      .filter((row) => row.efficiency >= 0.12)
      .sort((a, b) => b.efficiency - a.efficiency)
      .slice(0, 3),
    improve: rows
      .filter((row) => row.efficiency >= 0.06 && row.efficiency < 0.12)
      .sort((a, b) => b.efficiency - a.efficiency)
      .slice(0, 3),
    stop: rows
      .filter((row) => row.efficiency < 0.06)
      .sort((a, b) => a.efficiency - b.efficiency)
      .slice(0, 3),
  };
}

function topGroup<T>(
  rows: Array<{ efficiency: number; result: PerformanceResult; item: CalendarItem }>,
  getKey: (row: { item: CalendarItem; result: PerformanceResult }) => T,
) {
  const grouped = groupPerformance(rows, getKey);
  return grouped.sort((a, b) => b.averageEfficiency - a.averageEfficiency)[0];
}

function bottomGroup<T>(
  rows: Array<{ efficiency: number; result: PerformanceResult; item: CalendarItem }>,
  getKey: (row: { item: CalendarItem; result: PerformanceResult }) => T,
) {
  const grouped = groupPerformance(rows, getKey);
  return grouped.sort((a, b) => a.averageEfficiency - b.averageEfficiency)[0];
}

function groupPerformance<T>(
  rows: Array<{ efficiency: number; result: PerformanceResult; item: CalendarItem }>,
  getKey: (row: { item: CalendarItem; result: PerformanceResult }) => T,
) {
  const grouped = new Map<string, { total: number; count: number; reach: number }>();

  rows.forEach((row) => {
    const key = String(getKey(row));
    const current = grouped.get(key) ?? { total: 0, count: 0, reach: 0 };
    grouped.set(key, {
      total: current.total + row.efficiency,
      count: current.count + 1,
      reach: current.reach + row.result.reach,
    });
  });

  return [...grouped.entries()].map(([label, value]) => ({
    label,
    averageEfficiency: value.count > 0 ? value.total / value.count : 0,
    reach: value.reach,
    posts: value.count,
  }));
}

function buildPlatformNativeCopy(
  platform: Platform,
  topic: TopicSeed,
  brand: BrandProfile,
) {
  switch (platform) {
    case "TikTok":
      return {
        format: "25-second student POV video",
        hook: `POV: you are choosing a college and ${topic.topic.toLowerCase()} suddenly matters.`,
        caption: `POV: the brochure gave you the headline, but this is the part you actually needed.\n\n${topic.angle}\n\nQuick script: show the question, show the campus proof, then ask viewers what they want to inspect before tour day.`,
        visualDirection:
          "Handheld vertical clips, quick text overlays, student face-to-camera, campus proof cutaways, natural light.",
        cta: `Comment "tour" if you want the ${topic.ctaFocus.toLowerCase()}.`,
        hashtags: ["#CollegeTok", "#CampusTour", "#StudentLife", "#UCCSingapore"],
        productionNotes:
          "Keep cuts under two seconds. Add captions on-screen. End with a comment-bait question, not a sales push.",
        assignedRole: "video editor" as Role,
        videoScript: `0-3s: "${topic.topic}" text hook over campus clip.\n3-10s: Student says what they were confused about.\n10-18s: Show proof: ${topic.proof}\n18-25s: Ask viewers what they want to check on tour day.`,
        shotNotes:
          "Use one student narrator, two proof cutaways, one admissions desk shot, and one closing campus walkway clip.",
      };
    case "Instagram":
      return {
        format: "Saveable carousel",
        hook: `${topic.topic}, but make it actually useful.`,
        caption: `Save this before your next college visit.\n\n${topic.angle}\n\nProof to look for: ${topic.proof}\n\nNo pressure, no vague promises. Just better questions before a big decision.`,
        visualDirection:
          "Seven-slide carousel with clean teal and orange accents, real campus photos, checklist layout, and one student quote card.",
        cta: topic.ctaFocus,
        hashtags: ["#CollegePlanning", "#CampusVisit", "#StudentTips", "#StudyInSingapore"],
        productionNotes:
          "Design for saves: slide 1 hook, slides 2-5 checklist, slide 6 proof, slide 7 low-pressure CTA.",
        assignedRole: "graphic designer" as Role,
        videoScript: "",
        shotNotes: "Use bright campus photos and one simple checklist graphic per slide.",
      };
    case "YouTube Shorts":
      return {
        format: "SEO-friendly YouTube Short",
        hook: `College Tour Checklist: ${topic.topic}`,
        caption: `${topic.topic} can feel vague until you know what to inspect.\n\nOpening line: "Before you choose a college, ask this one practical question."\n\n${topic.angle} ${topic.proof}`,
        visualDirection:
          "Vertical explainer with searchable title card, campus b-roll, advisor voiceover, and clear subtitles.",
        cta: `${topic.ctaFocus} with UCC admissions.`,
        hashtags: ["#CollegeTour", "#CollegeAdmissions", "#StudentAdvice", "#CampusGuide"],
        productionNotes:
          "Use title keywords in the first two seconds. Keep voiceover factual and specific.",
        assignedRole: "video editor" as Role,
        videoScript: `Title card: "${topic.topic}"\nOpening: "Before you choose a college, ask this one practical question."\nMiddle: ${topic.angle}\nProof: ${topic.proof}\nClose: "Bring this to your next campus tour."`,
        shotNotes:
          "Capture title card, advisor desk shot, related facility b-roll, and checklist close-up.",
      };
    case "LinkedIn":
      return {
        format: "Professional proof post",
        hook: `${topic.topic}: a practical admissions conversation, not a promise.`,
        caption: `Families do not need louder claims. They need better evidence.\n\nAt ${brand.brandName}, this month's admissions conversations are centered on one practical question: ${topic.angle}\n\nA useful proof point: ${topic.proof}\n\nFor education marketing teams, this is the line to hold: explain the support, show the process, and avoid guaranteed outcome language.`,
        visualDirection:
          "Faculty or admissions photo with a sober pull quote and one proof-based checklist.",
        cta: topic.ctaFocus,
        hashtags: ["#EducationMarketing", "#HigherEducation", "#Admissions", "#StudentSupport"],
        productionNotes:
          "Keep the first three lines strong. Use factual support language and avoid inflated career claims.",
        assignedRole: "copywriter" as Role,
        videoScript: "",
        shotNotes: "Use a faculty, advisor, or program lead image rather than generic campus scenery.",
      };
    case "Facebook":
      return {
        format: "Parent-friendly community post",
        hook: `For families asking about ${topic.topic.toLowerCase()}: start here.`,
        caption: `Choosing a college is easier when the next question is clear.\n\n${topic.angle}\n\nWhen you visit, ask to see this proof: ${topic.proof}\n\nOur team can walk families through the steps calmly and factually, without pressure or promises.`,
        visualDirection:
          "Warm campus photo with students and advisor in a real setting, plus a plain-language checklist graphic.",
        cta: topic.ctaFocus,
        hashtags: ["#ParentGuide", "#CollegePlanning", "#CampusTour"],
        productionNotes:
          "Write for parents and guardians. Keep the CTA reassuring and process-based.",
        assignedRole: "copywriter" as Role,
        videoScript: "",
        shotNotes: "Use a calm group image. Avoid overly staged celebration photos.",
      };
    case "X/Twitter":
      return {
        format: "Short planning post",
        hook: `${topic.topic}: ask for proof, not slogans.`,
        caption: `${topic.topic}: ask for proof, not slogans.\n\nCheck this: ${topic.angle}\n\nProof to request: ${topic.proof}\n\nNext step: ${topic.ctaFocus}.`,
        visualDirection:
          "Optional single image: clean checklist crop with high contrast and no tiny text.",
        cta: topic.ctaFocus,
        hashtags: ["#CollegePlanning", "#Admissions"],
        productionNotes:
          "Keep under 240 characters when possible. Cut adjectives before cutting facts.",
        assignedRole: "marketing manager" as Role,
        videoScript: "",
        shotNotes: "If image is used, export as 16:9 with one checklist point only.",
      };
    case "Threads":
      return {
        format: "Conversational thread",
        hook: `Tiny college decision tip: ${topic.topic.toLowerCase()}.`,
        caption: `Tiny college decision tip: ${topic.topic.toLowerCase()}.\n\n${topic.angle}\n\nThe proof you want is not a big promise. It is something you can see, ask about, or compare: ${topic.proof}\n\nWhat would you ask on tour day?`,
        visualDirection:
          "Casual campus snapshot or no image. Let the post feel like a useful conversation starter.",
        cta: "Reply with the question you would bring to campus.",
        hashtags: ["#CollegeLife", "#CampusQuestions"],
        productionNotes:
          "Keep it relaxed. Invite replies and avoid sounding like a campaign announcement.",
        assignedRole: "copywriter" as Role,
        videoScript: "",
        shotNotes: "Use one candid campus image only if it adds context.",
      };
  }
}

const seedAudits: SocialAudit[] = [
  {
    platform: "TikTok",
    url: "https://tiktok.com/@northstarapplied",
    followers: 18400,
    averageReach: 9200,
    engagementRate: 6.8,
    postingFrequency: "4 posts/week",
    scores: {
      profileCompleteness: 7,
      postingConsistency: 8,
      contentMix: 6,
      hookQuality: 8,
      ctaClarity: 5,
      visualConsistency: 7,
      engagementPerformance: 8,
    },
    notes:
      "Strong reach on student POV clips, but too many comments ask for admissions links.",
  },
  {
    platform: "Instagram",
    url: "https://instagram.com/northstarapplied",
    followers: 26300,
    averageReach: 6100,
    engagementRate: 3.9,
    postingFrequency: "5 posts/week",
    scores: {
      profileCompleteness: 8,
      postingConsistency: 7,
      contentMix: 6,
      hookQuality: 6,
      ctaClarity: 6,
      visualConsistency: 8,
      engagementPerformance: 6,
    },
    notes:
      "Aesthetic is recognizable, but carousels need stronger first-slide tension.",
  },
  {
    platform: "YouTube Shorts",
    url: "https://youtube.com/@northstarapplied",
    followers: 5200,
    averageReach: 3400,
    engagementRate: 2.4,
    postingFrequency: "2 shorts/week",
    scores: {
      profileCompleteness: 6,
      postingConsistency: 5,
      contentMix: 5,
      hookQuality: 6,
      ctaClarity: 5,
      visualConsistency: 6,
      engagementPerformance: 5,
    },
    notes:
      "Search potential is underused; titles need program and admissions keywords.",
  },
  {
    platform: "LinkedIn",
    url: "https://linkedin.com/school/northstar-applied",
    followers: 9100,
    averageReach: 2800,
    engagementRate: 2.1,
    postingFrequency: "3 posts/week",
    scores: {
      profileCompleteness: 8,
      postingConsistency: 6,
      contentMix: 7,
      hookQuality: 7,
      ctaClarity: 6,
      visualConsistency: 7,
      engagementPerformance: 6,
    },
    notes:
      "Faculty and curriculum proof performs better than ceremony announcements.",
  },
  {
    platform: "Facebook",
    url: "https://facebook.com/northstarapplied",
    followers: 41800,
    averageReach: 11800,
    engagementRate: 4.7,
    postingFrequency: "6 posts/week",
    scores: {
      profileCompleteness: 8,
      postingConsistency: 8,
      contentMix: 7,
      hookQuality: 6,
      ctaClarity: 7,
      visualConsistency: 7,
      engagementPerformance: 7,
    },
    notes:
      "Parent comments are strong. Keep answering process questions directly.",
  },
  {
    platform: "X/Twitter",
    url: "https://x.com/northstarapplied",
    followers: 3100,
    averageReach: 950,
    engagementRate: 1.4,
    postingFrequency: "1 post/day",
    scores: {
      profileCompleteness: 6,
      postingConsistency: 7,
      contentMix: 5,
      hookQuality: 5,
      ctaClarity: 5,
      visualConsistency: 6,
      engagementPerformance: 4,
    },
    notes:
      "Good for reminders, but posts need sharper admissions usefulness.",
  },
  {
    platform: "Threads",
    url: "https://threads.net/@northstarapplied",
    followers: 7600,
    averageReach: 2600,
    engagementRate: 3.2,
    postingFrequency: "4 posts/week",
    scores: {
      profileCompleteness: 7,
      postingConsistency: 6,
      contentMix: 6,
      hookQuality: 7,
      ctaClarity: 6,
      visualConsistency: 6,
      engagementPerformance: 6,
    },
    notes:
      "Question-led posts get replies; announcements go quiet.",
  },
];

const seedCompetitors: Competitor[] = [
  {
    id: "competitor-1",
    name: "MetroTech Institute",
    website: "https://metrotech.example.edu",
    platforms: ["TikTok", "Instagram", "Facebook"],
    contentFormats: ["Student POV reels", "Lab demos", "Open house reminders"],
    tone: "Energetic and youth-led",
    postingFrequency: "Daily short-form, 3 carousels/week",
    observedStrengths: [
      "Fast hooks on TikTok",
      "Clear open house CTAs",
      "Strong student ambassador presence",
    ],
    contentGaps: [
      "Few parent-facing explanations",
      "Limited compliance language around career outcomes",
    ],
    whitespaceOpportunities: [
      "Own parent trust content with proof-based posts.",
      "Explain course fit with calmer, more practical decision tools.",
    ],
  },
  {
    id: "competitor-2",
    name: "Harborview College",
    website: "https://harborview.example.edu",
    platforms: ["Facebook", "LinkedIn", "Instagram"],
    contentFormats: ["Alumni features", "Event albums", "Faculty posts"],
    tone: "Established and formal",
    postingFrequency: "4 posts/week",
    observedStrengths: [
      "Strong parent comments on Facebook",
      "Credible faculty presence",
      "Detailed program announcements",
    ],
    contentGaps: [
      "Visual identity feels dated",
      "Student-life content is mostly ceremonial",
    ],
    whitespaceOpportunities: [
      "Show daily student routines with modern visuals.",
      "Translate formal program copy into student-friendly comparisons.",
    ],
  },
  {
    id: "competitor-3",
    name: "BrightPath Academy",
    website: "https://brightpath.example.edu",
    platforms: ["TikTok", "YouTube Shorts", "Threads"],
    contentFormats: ["Myth-busting shorts", "Q&A clips", "Student interviews"],
    tone: "Playful and direct",
    postingFrequency: "5 shorts/week",
    observedStrengths: [
      "High comments on admissions myths",
      "Strong YouTube search packaging",
      "Casual student voice",
    ],
    contentGaps: [
      "Few concrete campus proof points",
      "Light parent content",
    ],
    whitespaceOpportunities: [
      "Pair student humor with inspectable campus evidence.",
      "Create parent-safe versions of high-performing student questions.",
    ],
  },
  {
    id: "competitor-4",
    name: "Eastbridge Skills College",
    website: "https://eastbridge.example.edu",
    platforms: ["Facebook", "Instagram", "X/Twitter"],
    contentFormats: ["Deadline reminders", "Scholarship posts", "Program graphics"],
    tone: "Helpful but announcement-heavy",
    postingFrequency: "1-2 posts/day",
    observedStrengths: [
      "Consistent deadline visibility",
      "Clear scholarship reminders",
      "Responsive Facebook comments",
    ],
    contentGaps: [
      "Low storytelling depth",
      "Repeated captions across platforms",
    ],
    whitespaceOpportunities: [
      "Make each platform sound native instead of syndicated.",
      "Turn reminders into decision-support content.",
    ],
  },
];

function buildSeedPerformance(calendar: CalendarItem[]): PerformanceResult[] {
  const sample = [
    [0, 18400, 11200, 720, 82, 104, 236, 0, 188, 34],
    [1, 12600, 7400, 410, 28, 82, 191, 0, 142, 22],
    [2, 22100, 13800, 980, 146, 118, 210, 4820, 196, 41],
    [3, 7900, 4100, 198, 34, 46, 88, 0, 72, 10],
    [4, 16800, 9300, 520, 61, 76, 154, 0, 211, 28],
    [5, 4200, 1900, 96, 16, 24, 31, 0, 42, 5],
    [6, 7100, 3600, 210, 44, 32, 61, 0, 58, 8],
    [7, 9800, 5300, 305, 19, 54, 132, 0, 121, 14],
    [8, 8400, 3900, 184, 22, 35, 64, 0, 97, 9],
    [9, 23200, 14100, 1040, 188, 132, 225, 5230, 244, 52],
    [10, 15200, 8600, 610, 53, 98, 244, 0, 176, 25],
    [11, 3900, 1500, 70, 8, 13, 18, 0, 21, 2],
  ];

  return sample.map(
    ([
      index,
      impressions,
      reach,
      engagement,
      comments,
      shares,
      saves,
      watchTime,
      clicks,
      followsGained,
    ]) => ({
      calendarItemId: calendar[index]?.id ?? "day-01",
      impressions,
      reach,
      engagement,
      comments,
      shares,
      saves,
      watchTime,
      clicks,
      followsGained,
      notes:
        index === 2 || index === 9
          ? "Strong comments came from students asking for tour proof and program details."
          : "Track whether saves convert into inquiry or tour actions.",
    }),
  );
}

function addDays(startDate: string, days: number) {
  const [year, month, day] = startDate.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day + days));
  return date.toISOString().slice(0, 10);
}

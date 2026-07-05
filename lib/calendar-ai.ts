// Prompt building and output mapping for the live AI Content Calendar
// (Stage 8). Mirrors lib/brief-ai.ts. Pure helpers shared by the client (to
// build context) and the server route (to build the prompt). No network here.

import {
  platformRules,
  platforms,
  roles,
  type CalendarItem,
  type Platform,
  type Role,
  type UccCampaign,
} from "@/lib/social-calendar-data";

export type CalendarAiContext = {
  brief: {
    monthlyCampaignGoal: string;
    marketingObjectives: string[];
    campaignIdeas: string[];
    contentPillars: string[];
    platformMix: string;
    toneGuidance: string;
    keyAnglesToOwn: string[];
  };
  campaigns: Array<{ name: string; objective: string; platformMix: string[] }>;
  courses: Array<{
    name: string;
    category: string;
    usp: string;
    complianceNotes: string;
  }>;
  audiences: Array<{ name: string; goals: string[]; painPoints: string[] }>;
  platforms: Platform[];
  // How many items to produce. 1 with a focus item means "regenerate one".
  count: number;
  focus?: {
    platform: string;
    contentPillar: string;
    contentTopic: string;
    currentCaption: string;
  };
  // Trend Radar cards the manager accepted (Module D1). Optional so older
  // callers keep working.
  acceptedTrends?: string[];
};

// The JSON shape the model must return per item. Status and approval are set
// by the app to draft values, never by the model, so they are not requested.
export type CalendarDraftItem = {
  campaign: string;
  platform: string;
  objective: string;
  contentPillar: string;
  contentTopic: string;
  hook: string;
  format: string;
  caption: string;
  cta: string;
  hashtags: string[];
  owner: string;
  assets: string;
  notes: string;
};

export function buildCalendarSystemPrompt(): string {
  return [
    "You are a senior education marketing content planner for a private college.",
    "You draft social content calendar items for a human Marketing Manager to review and approve. You never approve, schedule, or publish anything yourself.",
    "Compliance is mandatory. Keep every caption and hook factual and proof-based. Never promise or imply guaranteed employment, salary figures, visa or immigration outcomes, admission certainty, rankings, or guaranteed course outcomes. Prefer language about steps, support, eligibility, and evidence.",
    "Each course in the context may carry its own complianceNotes. When you write an item about a course, respect that course's complianceNotes as binding constraints.",
    "Use British spelling. Do not use em dashes. Refer to teaching staff as teachers, never instructors.",
    "Return only a single JSON object of the requested shape. Do not include any commentary outside the JSON.",
  ].join(" ");
}

export function buildCalendarUserPrompt(context: CalendarAiContext): string {
  const itemShape = {
    campaign: "string, one of the campaign names in context or empty",
    platform: `string, one of: ${context.platforms.join(", ")}`,
    objective: "string, how this item supports a marketing objective",
    contentPillar: "string",
    contentTopic: "string, a short title",
    hook: "string",
    format: "string, for example Reel, Carousel, Short, Thread",
    caption: "string, factual and compliant",
    cta: "string",
    hashtags: ["string"],
    owner: "string, the responsible role, using teacher not instructor",
    assets: "string, the visual direction or assets needed",
    notes: "string, production notes",
  };

  const instruction = context.focus
    ? [
        "Rewrite a single, stronger calendar item to replace this one:",
        JSON.stringify(context.focus, null, 2),
        "Keep it on the same platform unless another is clearly better.",
      ].join("\n")
    : `Produce ${context.count} varied calendar items across the platforms, balanced roughly according to the platform mix.`;

  return [
    instruction,
    "",
    "CONTEXT (approved brief and the manager's real workspace data):",
    JSON.stringify(
      {
        brief: context.brief,
        campaigns: context.campaigns,
        courses: context.courses,
        audiences: context.audiences,
        acceptedTrends: context.acceptedTrends ?? [],
      },
      null,
      2,
    ),
    "",
    'Return JSON of the form { "items": [ item, ... ] } where each item is:',
    JSON.stringify(itemShape, null, 2),
    "",
    "Keep every item practical, factual, and compliant. Tie each item to a content pillar and a marketing objective.",
  ].join("\n");
}

function addDaysIso(startDate: string, days: number): string {
  const [year, month, day] = startDate.split("-").map(Number);
  const date = new Date(year, (month || 1) - 1, day || 1);
  date.setDate(date.getDate() + days);
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function roleLabel(role: Role): string {
  return role
    .split(" ")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function matchPlatform(value: string): Platform {
  const found = platforms.find(
    (platform) => platform.toLowerCase() === value?.toLowerCase().trim(),
  );
  return found ?? "Instagram";
}

function matchRole(owner: string, platform: Platform): Role {
  const lower = (owner ?? "").toLowerCase();
  const direct = roles.find((role) => lower.includes(role));

  if (direct) {
    return direct;
  }

  if (/video|film|reel|short/.test(lower)) {
    return "video editor";
  }

  if (/design|graphic|visual/.test(lower)) {
    return "graphic designer";
  }

  if (platform === "TikTok" || platform === "YouTube Shorts") {
    return "video editor";
  }

  return "copywriter";
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value
    .map((item) => (typeof item === "string" ? item : String(item ?? "")))
    .filter((item) => item.trim().length > 0);
}

function findCampaignByName(
  name: string,
  campaigns: UccCampaign[],
): UccCampaign | undefined {
  return campaigns.find(
    (campaign) => campaign.name.toLowerCase() === name?.toLowerCase().trim(),
  );
}

// Build the shared content fields from a single AI draft item. Used both when
// creating fresh items and when regenerating an existing one.
function draftContentFields(draft: CalendarDraftItem, platform: Platform) {
  const rule = platformRules[platform];
  return {
    contentPillar: draft.contentPillar?.trim() || "Admissions Confidence",
    contentTopic: draft.contentTopic?.trim() || "New social post",
    format: draft.format?.trim() || rule.defaultFormat,
    hook: draft.hook?.trim() || "",
    caption: draft.caption?.trim() || "",
    cta: draft.cta?.trim() || rule.cta,
    hashtags: asStringArray(draft.hashtags),
    visualDirection: draft.assets?.trim() || "Use a real proof moment for this pillar and platform.",
    productionNotes: draft.notes?.trim() || "",
    businessGoalConnection: draft.objective?.trim() || "",
  };
}

// Map a full AI draft into complete CalendarItem drafts. Every item is forced
// to a draft state (status idea, approval stage idea) so the manager approves.
export function calendarDraftToItems(
  drafts: CalendarDraftItem[],
  options: { startDate: string; campaigns: UccCampaign[] },
): CalendarItem[] {
  return drafts.map((draft, index) => {
    const platform = matchPlatform(draft.platform);
    const rule = platformRules[platform];
    const date = addDaysIso(options.startDate, index);
    const assignedRole = matchRole(draft.owner, platform);
    const content = draftContentFields(draft, platform);
    // An AI item belongs to a campaign (matched by name); a campaign already
    // targets a course, so the item inherits that course link. This is what
    // lets per-item course context and compliance work downstream.
    const campaign = findCampaignByName(draft.campaign, options.campaigns);

    return {
      id: `ai-cal-${Date.now()}-${index}`,
      itemKind: "post",
      plannedDate: date,
      actualPostDate: "",
      date,
      platform,
      campaignId: campaign?.id ?? "",
      courseId: campaign?.courseId ?? "",
      audienceId: "",
      ...content,
      bestPostingTime: rule.bestPostingTime,
      assignedRole,
      owner: draft.owner?.trim() || roleLabel(assignedRole),
      reviewer: "Marketing Manager",
      dueDate: date,
      blocker: "",
      status: "idea",
      approvalStage: "idea",
      complianceNote:
        "Keep claims factual. Do not guarantee admission, jobs, salary, visas, work eligibility, or rankings.",
      videoScript: "",
      shotNotes: "",
      finalCaption: "",
      finalAssetLink: "",
      publishedUrl: "",
      kpiResult: "",
      followUpAction: "",
    };
  });
}

// Content-only patch for regenerating one existing item, keeping its id, date,
// platform links, and approval state untouched.
export function calendarDraftToPatch(draft: CalendarDraftItem): Partial<CalendarItem> {
  const platform = matchPlatform(draft.platform);
  return draftContentFields(draft, platform);
}

// Prompt building and mapping for Content Remix (Module D2).
// Pure helpers, no network. Remix takes one approved item and drafts
// platform-native variants for the other platforms in the campaign's mix;
// every variant restarts the approval path from the beginning.

import type { CalendarItem, Platform } from "@/lib/social-calendar-data";

export type RemixAiContext = {
  source: {
    platform: string;
    contentPillar: string;
    contentTopic: string;
    format: string;
    hook: string;
    caption: string;
    cta: string;
    hashtags: string[];
    videoScript: string;
    businessGoalConnection: string;
  };
  targetPlatforms: Array<{
    platform: string;
    rulebook: {
      role: string;
      persona: string;
      content: string;
      cta: string;
      defaultFormat: string;
      guardrail: string;
    };
  }>;
  audience: { name: string; languages: string[] } | null;
  includeChinese: boolean;
  brand: { name: string; toneOfVoice: string };
};

export type RemixAiDraft = {
  variants: Array<{
    platform: string;
    format: string;
    hook: string;
    caption: string;
    cta: string;
    visualDirection: string;
    hashtags: string[];
    chineseCaption?: string;
  }>;
};

export function buildRemixSystemPrompt(): string {
  return [
    "You adapt one approved social media post for a private college in Singapore into native versions for other platforms.",
    "Each variant must genuinely fit its platform's rulebook (role, persona, content style, CTA style), not just copy the text across.",
    "Keep the same underlying message, proof points, and business goal as the source item. Do not invent new claims, statistics, offers, or outcomes.",
    "When includeChinese is true, also provide chineseCaption: the same message in natural simplified Chinese for prospective students and parents. Otherwise omit it.",
    "Compliance is mandatory: never promise or imply guaranteed employment, salary figures, visa outcomes, admission certainty, rankings, or guaranteed course outcomes. Use conditional language for pathways.",
    "Use British spelling in English copy. Do not use em dashes. Refer to teaching staff as teachers, never instructors.",
    "Every variant is a draft for human review and approval; nothing you produce is final.",
    "Return only a single JSON object matching the requested shape.",
  ].join(" ");
}

export function buildRemixUserPrompt(context: RemixAiContext): string {
  const shape = {
    variants: [
      {
        platform: "string, exactly one of the target platform names",
        format: "string, a native format for that platform",
        hook: "string",
        caption: "string, the full caption in English",
        cta: "string",
        visualDirection: "string, what the designer or video editor should make",
        hashtags: ["string, without the # sign"],
        chineseCaption:
          "string, simplified Chinese version of the caption; only when includeChinese is true",
      },
    ],
  };

  return [
    "Create one native variant for EACH target platform below, from this approved source item.",
    "",
    "SOURCE ITEM (already approved by the manager):",
    JSON.stringify(context.source, null, 2),
    "",
    "TARGET PLATFORMS AND THEIR RULEBOOKS:",
    JSON.stringify(context.targetPlatforms, null, 2),
    "",
    "AUDIENCE AND BRAND:",
    JSON.stringify(
      {
        audience: context.audience,
        includeChinese: context.includeChinese,
        brand: context.brand,
      },
      null,
      2,
    ),
    "",
    "Return a JSON object with exactly this shape:",
    JSON.stringify(shape, null, 2),
  ].join("\n");
}

// Whether any audience language points at Chinese-speaking families.
export function audienceIncludesChinese(languages: string[]): boolean {
  return languages.some((language) => /chinese|mandarin|中文/i.test(language));
}

// Map the remix draft into new draft calendar items. Only variants for the
// allowed target platforms survive; everything restarts at the beginning of
// the approval path (idea + drafting), never inheriting the source's
// approval.
export function remixDraftToItems(
  draft: RemixAiDraft,
  source: CalendarItem,
  allowedPlatforms: Platform[],
): CalendarItem[] {
  const rows = Array.isArray(draft.variants) ? draft.variants : [];
  const stamp = Date.now();

  return rows
    .filter(
      (variant): variant is RemixAiDraft["variants"][number] =>
        Boolean(variant?.caption?.trim()) &&
        allowedPlatforms.includes(variant.platform as Platform),
    )
    .map((variant, index) => ({
      id: `remix-${stamp}-${index}`,
      itemKind: source.itemKind ?? "post",
      date: source.date,
      plannedDate: source.plannedDate ?? source.date,
      actualPostDate: "",
      platform: variant.platform as Platform,
      campaignId: source.campaignId ?? "",
      courseId: source.courseId ?? "",
      audienceId: source.audienceId ?? "",
      contentPillar: source.contentPillar,
      contentTopic: source.contentTopic,
      format: variant.format?.trim() || source.format,
      hook: variant.hook?.trim() ?? "",
      caption: variant.chineseCaption?.trim()
        ? `${variant.caption.trim()}\n\n${variant.chineseCaption.trim()}`
        : variant.caption.trim(),
      visualDirection: variant.visualDirection?.trim() ?? source.visualDirection,
      cta: variant.cta?.trim() ?? source.cta,
      hashtags: Array.isArray(variant.hashtags)
        ? variant.hashtags.filter(Boolean)
        : source.hashtags,
      bestPostingTime: source.bestPostingTime,
      productionNotes: `Remixed with AI from the approved ${source.platform} item "${source.contentTopic}". Needs its own review and approval.`,
      assignedRole: "copywriter" as const,
      owner: source.owner ?? "",
      reviewer: source.reviewer ?? "Marketing Manager",
      dueDate: source.dueDate ?? source.date,
      blocker: "",
      status: "drafting" as const,
      approvalStage: "idea" as const,
      businessGoalConnection: source.businessGoalConnection,
      complianceNote: source.complianceNote,
      videoScript: "",
      shotNotes: "",
      finalCaption: "",
      finalAssetLink: "",
      publishedUrl: "",
      kpiResult: "",
      followUpAction: "",
    }));
}

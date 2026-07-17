// Prompt building and output mapping for AI production copy (Module B1).
// Pure helpers, no network.

import { COMPLIANCE_PROMPT_RULE } from "@/lib/compliance-ai";
import {
  PLATFORM_CONTENT_RULES,
  platforms,
  type CalendarItem,
} from "@/lib/social-calendar-data";

export type CopyAiContext = {
  item: {
    platform: string;
    contentPillar: string;
    contentTopic: string;
    format: string;
    currentHook: string;
    currentCaption: string;
    currentVideoScript: string;
    businessGoalConnection: string;
  };
  campaign: { name: string; objective: string } | null;
  audience: {
    name: string;
    languages: string[];
    painPoints: string[];
    nurtureAngle: string;
  } | null;
  brand: { name: string; toneOfVoice: string };
  platformRulebook: {
    role: string;
    persona: string;
    content: string;
    cta: string;
    defaultFormat: string;
    guardrail: string;
  };
  briefToneGuidance: string;
  // "copy" writes the full set; "video-script" focuses on script and shots.
  task: "copy" | "video-script";
  // Free-text direction from the manager for a revision pass.
  guidance: string;
};

export type CopyAiDraft = {
  hook: string;
  caption: string;
  cta: string;
  hashtags: string[];
  visualDirection: string;
  productionNotes: string;
  videoScript: string;
  shotNotes: string;
  carouselOutline: string;
  storyboardFrames: string;
  youtubeBrief: string;
  tiktokDuetStitch: string;
  trendingAudioNote: string;
};

export function buildCopySystemPrompt(): string {
  return [
    "You are a senior education marketing copywriter for a private college in Singapore.",
    "You draft platform-native content for a human production team; every output is a draft that a Marketing Manager must approve. You never approve, schedule, or publish.",
    "Write in the platform's native voice using the rulebook provided: TikTok and YouTube Shorts scripts need a spoken hook, numbered beats, and a clear CTA; LinkedIn is proof-based and professional; Instagram is saveable and visual; Facebook is parent-facing and reassuring.",
    // Universal craft rules adapted from Darthflute/social-calendar-skill (MIT License).
    "Hooks never open with 'We', 'Our', or the college's name; lead with the student's or parent's world first.",
    "Never use the words 'leverage', 'synergy', 'excited to announce', 'game-changing', 'seamless', or 'robust'.",
    "One idea, one hook, one call to action per item. Follow the PLATFORM RULES in the context exactly, including caption length and hashtag conventions.",
    "Bilingual rule: when the audience languages include Chinese, the caption must contain the English version first, then a simplified Chinese version of the same message after it. Otherwise write English only.",
    COMPLIANCE_PROMPT_RULE + " Use conditional language for pathways.",
    "Use British spelling. Do not use em dashes. Refer to teaching staff as teachers, never instructors.",
    "Return only a single JSON object matching the requested shape.",
  ].join(" ");
}

export function buildCopyUserPrompt(context: CopyAiContext): string {
  const shape = {
    hook: "string",
    caption: "string, factual and compliant, bilingual when required",
    cta: "string",
    hashtags: ["string, 3 to 6 entries"],
    visualDirection: "string, what the designer or videographer should show",
    productionNotes: "string, practical notes for the production team",
    videoScript:
      "string, spoken script with hook, numbered beats, and CTA for video formats; empty string for non-video items",
    shotNotes: "string, shot list notes for video formats; empty string otherwise",
    carouselOutline:
      "string, slide-by-slide copy (Slide 1: ..., Slide 2: ...) ONLY when the item's format is a carousel; the first slide must work alone as a hook and the last slide carries the CTA; empty string otherwise",
    storyboardFrames:
      "string, frame-by-frame plan (Frame 1: ..., one idea per frame, 7 frames maximum, include at least one interactive element such as a poll or question sticker) ONLY when the item's format is a Stories sequence; empty string otherwise",
    youtubeBrief:
      "string, ONLY when the item's platform is YouTube Shorts: a search-optimised title under 60 characters containing the target keyword, then a one-line thumbnail brief, then the first two description lines; empty string otherwise",
    tiktokDuetStitch:
      "string, ONLY when the item's platform is TikTok: a Duet or Stitch opportunity (which post or trend to react to, and the angle); empty string otherwise",
    trendingAudioNote:
      "string, ONLY when the item's platform is TikTok: where to place trending audio and the kind of sound that fits; empty string otherwise",
  };

  const instruction =
    context.task === "video-script"
      ? "Write or rewrite the video script and shot notes for this item. Refresh the other fields only if they clearly improve."
      : "Write the full production copy set for this item.";

  const platform = platforms.find(
    (candidate) => candidate.toLowerCase() === context.item.platform.toLowerCase().trim(),
  );

  return [
    instruction,
    context.guidance
      ? `The manager's direction for this revision: ${context.guidance}`
      : "",
    "",
    "CONTEXT (the manager's real workspace data):",
    JSON.stringify(context, null, 2),
    "",
    platform
      ? `PLATFORM RULES for ${platform}: ${PLATFORM_CONTENT_RULES[platform]}`
      : "",
    "",
    "Return a JSON object with exactly this shape:",
    JSON.stringify(shape, null, 2),
  ]
    .filter(Boolean)
    .join("\n");
}

function asString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

// Map the AI draft onto the calendar item as a content-only patch. Approval
// stage and status are never touched here: the output stays a draft inside
// the existing approval flow.
export function copyDraftToPatch(draft: CopyAiDraft): Partial<CalendarItem> {
  const patch: Partial<CalendarItem> = {};
  const hook = asString(draft.hook);
  const caption = asString(draft.caption);
  const cta = asString(draft.cta);
  const visualDirection = asString(draft.visualDirection);
  const productionNotes = asString(draft.productionNotes);
  const videoScript = asString(draft.videoScript);
  const shotNotes = asString(draft.shotNotes);
  const carouselOutline = asString(draft.carouselOutline);
  const storyboardFrames = asString(draft.storyboardFrames);
  const youtubeBrief = asString(draft.youtubeBrief);
  const tiktokDuetStitch = asString(draft.tiktokDuetStitch);
  const trendingAudioNote = asString(draft.trendingAudioNote);

  if (hook) patch.hook = hook;
  if (caption) patch.caption = caption;
  if (cta) patch.cta = cta;
  if (visualDirection) patch.visualDirection = visualDirection;
  if (productionNotes) patch.productionNotes = productionNotes;
  if (videoScript) patch.videoScript = videoScript;
  if (shotNotes) patch.shotNotes = shotNotes;
  if (carouselOutline) patch.carouselOutline = carouselOutline;
  if (storyboardFrames) patch.storyboardFrames = storyboardFrames;
  if (youtubeBrief) patch.youtubeBrief = youtubeBrief;
  if (tiktokDuetStitch) patch.tiktokDuetStitch = tiktokDuetStitch;
  if (trendingAudioNote) patch.trendingAudioNote = trendingAudioNote;

  if (Array.isArray(draft.hashtags)) {
    const hashtags = draft.hashtags
      .map((tag) => (typeof tag === "string" ? tag.trim() : ""))
      .filter(Boolean)
      .slice(0, 6);

    if (hashtags.length > 0) {
      patch.hashtags = hashtags;
    }
  }

  return patch;
}

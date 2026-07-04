// Prompt building and output mapping for AI production copy (Module B1).
// Pure helpers, no network.

import type { CalendarItem } from "@/lib/social-calendar-data";

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
};

export function buildCopySystemPrompt(): string {
  return [
    "You are a senior education marketing copywriter for a private college in Singapore.",
    "You draft platform-native content for a human production team; every output is a draft that a Marketing Manager must approve. You never approve, schedule, or publish.",
    "Write in the platform's native voice using the rulebook provided: TikTok and YouTube Shorts scripts need a spoken hook, numbered beats, and a clear CTA; LinkedIn is proof-based and professional; Instagram is saveable and visual; Facebook is parent-facing and reassuring.",
    "Bilingual rule: when the audience languages include Chinese, the caption must contain the English version first, then a simplified Chinese version of the same message after it. Otherwise write English only.",
    "Compliance is mandatory. Keep every claim factual and proof-based. Never promise or imply guaranteed employment, salary figures, visa or immigration outcomes, admission certainty, rankings, or guaranteed course outcomes. Use conditional language for pathways.",
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
  };

  const instruction =
    context.task === "video-script"
      ? "Write or rewrite the video script and shot notes for this item. Refresh the other fields only if they clearly improve."
      : "Write the full production copy set for this item.";

  return [
    instruction,
    context.guidance
      ? `The manager's direction for this revision: ${context.guidance}`
      : "",
    "",
    "CONTEXT (the manager's real workspace data):",
    JSON.stringify(context, null, 2),
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

  if (hook) patch.hook = hook;
  if (caption) patch.caption = caption;
  if (cta) patch.cta = cta;
  if (visualDirection) patch.visualDirection = visualDirection;
  if (productionNotes) patch.productionNotes = productionNotes;
  if (videoScript) patch.videoScript = videoScript;
  if (shotNotes) patch.shotNotes = shotNotes;

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

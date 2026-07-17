// Prompt building and output mapping for the Platform Intelligence AI
// playbook draft (Platform Intelligence screen). Pure helpers, no network.

import { COMPLIANCE_PROMPT_RULE } from "@/lib/compliance-ai";
import {
  PLATFORM_CONTENT_RULES,
  type Platform,
  type PlatformPlaybookFields,
} from "@/lib/social-calendar-data";

export type PlatformPlaybookAiContext = {
  platform: Platform;
  brand: {
    name: string;
    industry: string;
    toneOfVoice: string;
    offers: string;
  };
  audit: {
    hasData: boolean;
    followers: number;
    averageReach: number;
    engagementRate: number;
    score: number;
  };
  // Audiences whose recommended channels include this platform, so the
  // playbook can reflect who is actually being reached here.
  audiences: Array<{
    name: string;
    languages: string[];
    motivations: string[];
    painPoints: string[];
  }>;
  acceptedTrends: string[];
  acceptedCompetitorInsights: string[];
  acceptedListeningInsights: string[];
  // The current approved playbook, so the model refines it rather than
  // inventing an unrelated voice each time.
  currentPlaybook: PlatformPlaybookFields;
};

export type PlatformPlaybookAiDraft = PlatformPlaybookFields;

export function buildPlatformPlaybookSystemPrompt(): string {
  return [
    "You are a senior social media strategist for a private college in Singapore.",
    "You produce one platform playbook as a draft for a human Marketing Manager to review, edit, and approve. You never approve or publish anything yourself.",
    "Ground the playbook in the context provided: the brand, the platform's real audit numbers where present, the audiences who actually use this platform, and any accepted research signals. Do not invent facts not supported by the context.",
    "The playbook has seven fields: role (this platform's job in the marketing mix), persona (the voice), content (typical content types), defaultFormat (the usual post format), bestPostingTime (a single time of day, for example '7:30 PM'), cta (a standard call to action), metrics (what success looks like on this platform), and guardrail (a one-line compliance-aware voice reminder for whoever writes copy for this platform).",
    COMPLIANCE_PROMPT_RULE + " The guardrail and cta fields must follow the same rule.",
    "Use British spelling. Do not use em dashes. Refer to teaching staff as teachers, never instructors.",
    "Return only a single JSON object matching the requested shape.",
  ].join(" ");
}

export function buildPlatformPlaybookUserPrompt(context: PlatformPlaybookAiContext): string {
  const shape = {
    role: "string, one short line",
    persona: "string, two or three words describing the voice",
    content: "string, the typical content types on this platform",
    defaultFormat: "string, the usual post format",
    bestPostingTime: "string, a single time of day",
    cta: "string, a standard call to action",
    metrics: "string, the metrics that show success here",
    guardrail: "string, one line of compliance-aware voice guidance",
  };

  return [
    `Draft the ${context.platform} playbook for the college's marketing team.`,
    "",
    "CONTEXT (the manager's real workspace data):",
    JSON.stringify(context, null, 2),
    "",
    // Platform craft rules adapted from Darthflute/social-calendar-skill (MIT License).
    `PLATFORM RULES for ${context.platform} (the playbook must be consistent with these):`,
    PLATFORM_CONTENT_RULES[context.platform],
    "",
    "Return a JSON object with exactly this shape:",
    JSON.stringify(shape, null, 2),
  ].join("\n");
}

export function platformPlaybookDraftToFields(
  draft: PlatformPlaybookAiDraft,
  fallback: PlatformPlaybookFields,
): PlatformPlaybookFields {
  const clean = (value: unknown, previous: string) =>
    typeof value === "string" && value.trim() ? value.trim() : previous;

  return {
    role: clean(draft.role, fallback.role),
    persona: clean(draft.persona, fallback.persona),
    content: clean(draft.content, fallback.content),
    defaultFormat: clean(draft.defaultFormat, fallback.defaultFormat),
    bestPostingTime: clean(draft.bestPostingTime, fallback.bestPostingTime),
    cta: clean(draft.cta, fallback.cta),
    metrics: clean(draft.metrics, fallback.metrics),
    guardrail: clean(draft.guardrail, fallback.guardrail),
  };
}

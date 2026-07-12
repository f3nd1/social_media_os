// Small shared helpers so AI features can consistently decide whether to make
// a live OpenAI call or fall back to the offline rule-based drafts, and which
// model to use for a given task. Pure functions, no UI, no network.

import type { AiIntegrationSettings } from "@/lib/social-calendar-data";

export type AiTaskKind = "analysis" | "utility";

// Live AI is only used when the user has switched it on AND a key is saved.
// Any other state means every AI feature stays on the offline templates.
export function isLiveAiEnabled(ai: AiIntegrationSettings | undefined): boolean {
  return Boolean(ai?.enabled && ai.apiKey.trim());
}

// The label features show when they produce an offline draft, so it is always
// obvious the AI was not connected for that output.
export const OFFLINE_DRAFT_LABEL = "Offline draft, AI not connected";

// Resolve the model id for a task. Analysis covers the heavier features
// (strategy, campaign ideas, compliance review, copywriting, calendar
// drafting); utility covers lighter work (reading images, condensing text).
// Returns an empty string when live AI is off or no model is chosen, which the
// caller treats as "use the offline draft".
export function resolveModelForTask(
  ai: AiIntegrationSettings | undefined,
  task: AiTaskKind,
): string {
  if (!isLiveAiEnabled(ai) || !ai) {
    return "";
  }

  const model = task === "analysis" ? ai.analysisModel : ai.utilityModel;

  // Fall back to the analysis model if a utility model was never chosen, so a
  // light task still runs rather than silently dropping to offline.
  return model.trim() || ai.analysisModel.trim();
}

// Pick a sensible pair of models from whatever the key can access: a cheaper
// one for light tasks and a stronger one for analysis. Used by both the
// Settings panel and the setup guide, so they suggest the same thing.
export function suggestModels(models: string[]): { analysis: string; utility: string } {
  const excluded =
    /embed|whisper|tts|audio|dall|image|moderation|search|realtime|transcribe|speech/i;
  const candidates = models.filter(
    (model) => /gpt|^o\d|reason|chat/i.test(model) && !excluded.test(model),
  );
  const pool = candidates.length > 0 ? candidates : models;
  const cheap = /mini|nano|small|lite|flash/i;
  const utility = pool.find((model) => cheap.test(model)) ?? pool[0] ?? "";
  const analysis =
    pool.find((model) => model !== utility && !cheap.test(model)) ??
    pool.find((model) => model !== utility) ??
    pool[0] ??
    "";
  return { analysis, utility };
}

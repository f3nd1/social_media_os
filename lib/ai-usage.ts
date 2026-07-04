// AI usage meter helpers. Token counts come from OpenAI's own usage figures
// returned by each route; cost is estimated only when the user has set prices
// for the model in Settings, otherwise it stays null and the UI shows tokens
// only. Pure functions, no network.

import type {
  AiIntegrationSettings,
  AiUsageEntry,
} from "@/lib/social-calendar-data";
import type { OpenAiUsage } from "@/lib/openai-shared";

const MAX_USAGE_ENTRIES = 500;

export function buildAiUsageEntry({
  module,
  model,
  usage,
  aiIntegration,
}: {
  module: string;
  model: string;
  usage: OpenAiUsage;
  aiIntegration: AiIntegrationSettings;
}): AiUsageEntry {
  const prices = aiIntegration.modelPrices?.[model];
  const estimatedCost = prices
    ? (usage.promptTokens / 1_000_000) * prices.inPerMillion +
      (usage.completionTokens / 1_000_000) * prices.outPerMillion
    : null;

  return {
    id: `usage-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
    date: new Date().toISOString(),
    module,
    model,
    promptTokens: usage.promptTokens,
    completionTokens: usage.completionTokens,
    estimatedCost,
  };
}

export function appendAiUsage(
  list: AiUsageEntry[],
  entry: AiUsageEntry,
): AiUsageEntry[] {
  return [entry, ...list].slice(0, MAX_USAGE_ENTRIES);
}

export type MonthlyAiUsageTotals = {
  calls: number;
  promptTokens: number;
  completionTokens: number;
  // Sum of the entries that have a cost; null when no entry this month has one.
  estimatedCost: number | null;
  uncostedCalls: number;
};

export function monthlyAiUsageTotals(
  list: AiUsageEntry[],
  now = new Date(),
): MonthlyAiUsageTotals {
  const monthKey = `${now.getFullYear()}-${now.getMonth()}`;
  const monthEntries = list.filter((entry) => {
    const date = new Date(entry.date);
    return `${date.getFullYear()}-${date.getMonth()}` === monthKey;
  });

  const costed = monthEntries.filter((entry) => entry.estimatedCost !== null);

  return {
    calls: monthEntries.length,
    promptTokens: monthEntries.reduce((sum, entry) => sum + entry.promptTokens, 0),
    completionTokens: monthEntries.reduce(
      (sum, entry) => sum + entry.completionTokens,
      0,
    ),
    estimatedCost:
      costed.length > 0
        ? costed.reduce((sum, entry) => sum + (entry.estimatedCost ?? 0), 0)
        : null,
    uncostedCalls: monthEntries.length - costed.length,
  };
}

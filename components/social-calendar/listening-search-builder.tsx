"use client";

// The Social Listening search builder. Split out of listening-workspace.tsx
// purely to keep both files inside the repo's ~600 line ceiling: this is the
// presentational half, and every piece of state it drives still lives in the
// workspace so the search call has one owner.
//
// Country, language and content-type selects are deliberately absent.
// /api/social-listening accepts a topic, the ticked sources, a recency window
// and an analysis type, and nothing else, so those controls would render fine
// and change nothing about the search. The disclosure says so in as many words
// rather than leaving a manager to discover it.

import { ChevronDown, Loader2, SearchCheck } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  LISTENING_ANALYSIS_OPTIONS,
  SUGGESTED_LISTENING_TOPICS,
  type ListeningAnalysisType,
} from "@/lib/listening-ai";
import {
  LISTENING_RECENCY_OPTIONS,
  type ListeningRecency,
} from "@/lib/listening-patterns";
import {
  LISTENING_SOURCES,
  listeningSourceLabels,
  type ListeningSourceId,
} from "@/lib/listening-sources";
import { cn } from "@/lib/utils";

export type ListeningStatusFilter = "active" | "all" | "accepted" | "archived";

function Labelled({ children, label }: { children: React.ReactNode; label: string }) {
  return (
    <label className="block space-y-1">
      <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </span>
      {children}
    </label>
  );
}

function Select({ children, ...props }: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className="flex h-9 w-full rounded-md border border-input bg-background px-2 text-sm outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring"
      {...props}
    >
      {children}
    </select>
  );
}

export function ListeningSearchBuilder({
  advancedOpen,
  analysisType,
  archivedCount,
  availableSources,
  busy,
  discoverProgress,
  elapsed,
  error,
  liveAi,
  onCancel,
  onRun,
  onSourcesChange,
  recency,
  selectedSources,
  setAdvancedOpen,
  setAnalysisType,
  setRecency,
  setStatusFilter,
  setTopic,
  statusFilter,
  toggleSource,
  topic,
}: {
  advancedOpen: boolean;
  analysisType: ListeningAnalysisType;
  archivedCount: number;
  availableSources: ListeningSourceId[];
  busy: boolean;
  discoverProgress: { done: number; total: number } | null;
  elapsed: number;
  error: string;
  liveAi: boolean;
  onCancel: () => void;
  onRun: () => void;
  onSourcesChange: (sources: string[]) => void;
  recency: ListeningRecency;
  selectedSources: ListeningSourceId[];
  setAdvancedOpen: (open: boolean) => void;
  setAnalysisType: (value: ListeningAnalysisType) => void;
  setRecency: (value: ListeningRecency) => void;
  setStatusFilter: (value: ListeningStatusFilter) => void;
  setTopic: (value: string) => void;
  statusFilter: ListeningStatusFilter;
  toggleSource: (id: ListeningSourceId) => void;
  topic: string;
}) {
  // Which of the ticked sources actually bill. Named rather than totalled: the
  // route reports its own OpenAI token usage after the fact and ScrapeCreators
  // reports its own credits, so any single number printed before a run would be
  // a guess dressed up as a quote.
  const paidSources = listeningSourceLabels(
    selectedSources.filter((id) => id !== "reddit" && id !== "web"),
  );

  return (
  <div className="space-y-3 border-b bg-muted/10 p-3">
    <div className="grid gap-2 md:grid-cols-[minmax(0,1fr)_10rem_10rem_auto] md:items-end">
      <Labelled label="Search topic">
        <Input
          onChange={(event) => setTopic(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && liveAi && !busy) {
              onRun();
            }
          }}
          placeholder="What are people discussing?"
          value={topic}
        />
      </Labelled>
      <Labelled label="Posted within">
        <Select
          onChange={(event) => setRecency(event.target.value as ListeningRecency)}
          value={recency}
        >
          {LISTENING_RECENCY_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </Select>
      </Labelled>
      <Labelled label="Analysis type">
        <Select
          onChange={(event) => setAnalysisType(event.target.value as ListeningAnalysisType)}
          value={analysisType}
        >
          {LISTENING_ANALYSIS_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </Select>
      </Labelled>
      <div className="flex gap-2">
        <Button
          disabled={!liveAi || busy}
          onClick={onRun}
          size="sm"
          type="button"
        >
          <SearchCheck className="h-4 w-4" />
          {busy ? "Researching" : "Run search"}
        </Button>
        {busy ? (
          <Button
            onClick={onCancel}
            size="sm"
            type="button"
            variant="outline"
          >
            Cancel
          </Button>
        ) : null}
      </div>
    </div>

    {/* Sources. Kept in the open rather than behind Advanced: they decide
        both what is searched and what it costs. */}
    <div className="flex flex-wrap items-center gap-1.5">
      <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
        Sources
      </span>
      {LISTENING_SOURCES.map((option) => {
        const usable = availableSources.includes(option.id);
        const active = usable && selectedSources.includes(option.id);

        return (
          <button
            aria-pressed={active}
            className={cn(
              "rounded-full border px-2.5 py-1 text-[11px] font-medium transition",
              !usable && "cursor-not-allowed border-dashed opacity-50",
              usable && active && "border-primary bg-primary text-primary-foreground",
              usable && !active && "hover:bg-muted",
            )}
            disabled={!usable}
            key={option.id}
            onClick={() => toggleSource(option.id)}
            title={usable ? undefined : option.missingKeyReason}
            type="button"
          >
            {option.label}
          </button>
        );
      })}
      <button
        className="ml-1 text-[11px] underline underline-offset-2 text-muted-foreground hover:text-foreground"
        onClick={() => onSourcesChange([...availableSources])}
        type="button"
      >
        All
      </button>
      <button
        className="text-[11px] underline underline-offset-2 text-muted-foreground hover:text-foreground"
        onClick={() => onSourcesChange([])}
        type="button"
      >
        None
      </button>
    </div>

    {/* Suggested topics, compact rather than a panel of their own. */}
    <div className="flex flex-wrap items-center gap-1.5">
      <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
        Try
      </span>
      {SUGGESTED_LISTENING_TOPICS.map((entry) => (
        <button
          className="rounded-full border bg-background px-2.5 py-1 text-[11px] transition hover:bg-muted"
          key={entry}
          onClick={() => setTopic(entry)}
          type="button"
        >
          {entry}
        </button>
      ))}
    </div>

    <div className="flex flex-wrap items-center justify-between gap-2">
      <button
        aria-controls="listening-advanced"
        aria-expanded={advancedOpen}
        className="inline-flex items-center gap-1 text-[11px] font-medium text-muted-foreground hover:text-foreground"
        onClick={() => setAdvancedOpen(!advancedOpen)}
        type="button"
      >
        Advanced filters
        <ChevronDown className={cn("h-3.5 w-3.5 transition", advancedOpen && "rotate-180")} />
      </button>
      <p className="text-[11px] text-muted-foreground">
        {selectedSources.length === 0
          ? "No sources ticked, so a run would do nothing."
          : paidSources.length > 0
            ? `Each run spends OpenAI tokens and ScrapeCreators credits on ${paidSources.join(", ")}.`
            : "Each run spends OpenAI tokens. No paid sources are ticked."}
      </p>
    </div>

    {advancedOpen ? (
      <div className="grid gap-2 border-t pt-3 sm:grid-cols-2 lg:grid-cols-3" id="listening-advanced">
        <Labelled label="Show">
          <Select
            onChange={(event) =>
              setStatusFilter(event.target.value as typeof statusFilter)
            }
            value={statusFilter}
          >
            <option value="active">Active findings</option>
            <option value="accepted">Accepted only</option>
            <option value="archived">Archived only ({archivedCount})</option>
            <option value="all">Everything</option>
          </Select>
        </Labelled>
        <p className="text-[11px] leading-5 text-muted-foreground sm:col-span-1 lg:col-span-2">
          Country, language and content-type filters are not offered here.
          The search sends a topic, the ticked sources, the window and the
          analysis type, and nothing else, so a filter for those would
          change nothing about what comes back.
        </p>
      </div>
    ) : null}

    {selectedSources.length === 0 ? (
      <p className="text-xs leading-5 text-warning-foreground">
        Pick at least one source to search.
      </p>
    ) : null}

    {!liveAi ? (
      <p className="text-xs leading-5 text-muted-foreground">
        Connect OpenAI in Settings to run social listening.
      </p>
    ) : null}

    {busy ? (
      <p
        aria-live="polite"
        className="flex items-center gap-2 text-xs leading-5 text-muted-foreground"
      >
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
        Searching {listeningSourceLabels(selectedSources).join(", ")}
        {"... "}
        {elapsed}s elapsed. Fetching real posts takes a minute or two before
        the analysis starts.
        {discoverProgress
          ? ` ${discoverProgress.done} of ${discoverProgress.total} searches finished.`
          : ""}
      </p>
    ) : null}

    {error ? (
      <div className="rounded-md border border-warning-border bg-warning p-2 text-xs leading-5 text-warning-foreground">
        {error}
      </div>
    ) : null}
    </div>
  );
}

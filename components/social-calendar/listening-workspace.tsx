"use client";

// Insights > Social Listening, as one tabbed workspace instead of the old
// vertical stack of Account Research, topic search, Trending Now, Discover and
// every expanded finding on a single very long page.
//
// Lifted out of social-calendar-app.tsx rather than rewritten: the search call,
// its cancel handling, the Discover run loop and the saved-result shape are the
// same code that was there before, so nothing about the data or the API moved.
//
// Two things the approved prototype shows are deliberately absent, because the
// pipeline does not produce them and inventing them would put fabricated
// numbers in front of a manager:
//   - a per-finding relevance percentage. Nothing in /api/social-listening
//     scores relevance, so there is no figure to show.
//   - country, language and content-type filters. The route accepts topic,
//     sources, recency and analysis type only; a dropdown that changed nothing
//     would be a lie about what the search can do.

import { useEffect, useRef, useState } from "react";

import { AccountResearchPanel } from "@/components/social-calendar/account-research-panel";
import { ListeningDiscoverTab } from "@/components/social-calendar/listening-discover-tab";
import { ListeningFindings } from "@/components/social-calendar/listening-findings";
import {
  ListeningSearchBuilder,
  type ListeningStatusFilter,
} from "@/components/social-calendar/listening-search-builder";
import { TrendingNowPanel } from "@/components/social-calendar/trending-now-panel";
import { Badge } from "@/components/ui/badge";
import { isLiveAiEnabled, resolveModelForTask } from "@/lib/ai-settings";
import { apiUrl } from "@/lib/base-path";
import { DISCOVERY_DEFAULT_SELECTION, suggestDiscoveryTopics } from "@/lib/discover-topics";
import type { ListeningAnalysisType } from "@/lib/listening-ai";
import {
  DEFAULT_LISTENING_RECENCY,
  type ListeningRecency,
} from "@/lib/listening-patterns";
import {
  availableListeningSources,
  resolveListeningSources,
  type ListeningSourceId,
} from "@/lib/listening-sources";
import type { OpenAiUsage } from "@/lib/openai-shared";
import type {
  AccountFinding,
  ListeningResult,
  MarketingWorkspaceData,
} from "@/lib/social-calendar-data";
import { cn, readJsonResponse } from "@/lib/utils";

type TabId = "search" | "account" | "trending" | "discover";

const TABS: Array<{ id: TabId; label: string }> = [
  { id: "search", label: "Search" },
  { id: "account", label: "Account Research" },
  { id: "trending", label: "Trending" },
  { id: "discover", label: "Discover" },
];

// Session-scoped so the tab survives moving away and back within one visit,
// without becoming a sticky preference that outlives the browser session.
const TAB_KEY = "ucc:listening-tab";

export function SocialListeningWorkspace({
  data,
  onAccountFindingsChange,
  onDeleteAccountFinding,
  onDeleteListeningResults,
  onListeningResultsChange,
  onListeningSourcesChange,
  onNavigate,
  onOpenRecord,
  onRecordUsage,
}: {
  data: MarketingWorkspaceData;
  onAccountFindingsChange: (findings: AccountFinding[]) => void;
  onDeleteAccountFinding: (id: string, subject: string) => void;
  onDeleteListeningResults: (ids: string[]) => void;
  onListeningResultsChange: (listeningResults: ListeningResult[]) => void;
  onListeningSourcesChange: (listeningSources: string[]) => void;
  onNavigate: (view: "brief" | "campaigns" | "platformIntel" | "signals") => void;
  // Jumps to the workspace record a Discover topic was derived from.
  onOpenRecord: (view: "courses" | "competitors", elementId: string) => void;
  onRecordUsage: (module: string, model: string, usage: OpenAiUsage) => void;
}) {
  const [tab, setTab] = useState<TabId>("search");
  const [topic, setTopic] = useState("");
  const [analysisType, setAnalysisType] = useState<ListeningAnalysisType>("quick");
  const [recency, setRecency] = useState<ListeningRecency>(DEFAULT_LISTENING_RECENCY);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<ListeningStatusFilter>("active");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [elapsed, setElapsed] = useState(0);
  const [discoverProgress, setDiscoverProgress] = useState<{ done: number; total: number } | null>(
    null,
  );

  const abortRef = useRef<AbortController | null>(null);
  const cancelledRef = useRef(false);
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);

  // Restore the tab chosen earlier in this browser session.
  useEffect(() => {
    const stored = sessionStorage.getItem(TAB_KEY);

    if (stored && TABS.some((entry) => entry.id === stored)) {
      setTab(stored as TabId);
    }
  }, []);

  useEffect(() => {
    sessionStorage.setItem(TAB_KEY, tab);
  }, [tab]);

  // A search fetches real posts before any analysis starts, so a minute of
  // apparently nothing is normal. Counting seconds up is honest in a way a fake
  // percentage would not be: the sources do not report progress.
  useEffect(() => {
    if (!busy) {
      setElapsed(0);
      return;
    }

    const startedAt = Date.now();
    const timer = setInterval(() => setElapsed(Math.round((Date.now() - startedAt) / 1000)), 1000);

    return () => clearInterval(timer);
  }, [busy]);

  const liveAi = isLiveAiEnabled(data.aiIntegration);
  const availableSources = availableListeningSources(data.aiIntegration);
  const selectedSources = resolveListeningSources(data.listeningSources, availableSources);
  const discoveryTopics = suggestDiscoveryTopics(data);

  function toggleSource(id: ListeningSourceId) {
    onListeningSourcesChange(
      selectedSources.includes(id)
        ? selectedSources.filter((current) => current !== id)
        : [...selectedSources, id],
    );
  }

  // One search. Unchanged from the previous implementation, including the
  // readJsonResponse call that turns a proxy timeout's HTML error page into a
  // real status rather than "Unexpected token '<'".
  async function searchTopic(searchFor: string): Promise<ListeningResult | null> {
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const response = await fetch(apiUrl("/api/social-listening"), {
        method: "POST",
        signal: controller.signal,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          apiKey: data.aiIntegration.apiKey,
          youtubeApiKey: data.aiIntegration.youtubeApiKey ?? "",
          scrapeCreatorsApiKey: data.aiIntegration.scrapeCreatorsApiKey ?? "",
          sources: selectedSources,
          recency,
          model: resolveModelForTask(data.aiIntegration, "analysis"),
          searchModel: resolveModelForTask(data.aiIntegration, "utility"),
          topic: searchFor,
          analysisType,
        }),
      });

      const result = await readJsonResponse<
        | {
            ok: true;
            insight: string;
            quotes: Array<{ text: string; source: string; url: string }>;
            sourcesCovered: string;
            dateRange: string;
            patterns?: ListeningResult["patterns"];
            recency?: string;
            usage?: OpenAiUsage;
            model?: string;
          }
        | { ok: false; error: string }
      >(
        response,
        "complete the search",
        "Searching every source at once can run past the time limit. Try a narrower topic, or search again.",
      );

      if (!result.ok) {
        setError(result.error);
        return null;
      }

      if (result.usage) {
        onRecordUsage("Social listening", result.model ?? "unknown", result.usage);
      }

      return {
        id: `listen-${Date.now()}-${Math.round(Math.random() * 1e6)}`,
        topic: searchFor,
        analysisType,
        insight: result.insight,
        quotes: result.quotes,
        sourcesCovered: result.sourcesCovered,
        dateRange: result.dateRange,
        model: result.model ?? "unknown",
        generatedAt: new Date().toISOString(),
        status: "new",
        patterns: result.patterns,
        recency: result.recency,
      };
    } catch (caught) {
      // A cancel is a choice, not a failure, so it must not read like one.
      if (caught instanceof DOMException && caught.name === "AbortError") {
        setError(
          "Search cancelled. The server may still finish that run in the background; its result is discarded.",
        );
        return null;
      }

      setError(caught instanceof Error ? caught.message : String(caught));
      return null;
    } finally {
      abortRef.current = null;
    }
  }

  function saveResults(entries: ListeningResult[]) {
    if (entries.length === 0) {
      return;
    }

    onListeningResultsChange([...entries, ...data.listeningResults].slice(0, 20));
  }

  // Shared by the topic box, Trending's "Research this" and Discover, so every
  // route into a search goes through exactly the same code path.
  async function runTopics(topics: string[]) {
    const wanted = topics.map((entry) => entry.trim()).filter(Boolean);

    if (wanted.length === 0) {
      setError("Enter a topic first, or pick one of the suggested topics.");
      return;
    }

    if (selectedSources.length === 0) {
      setError("Pick at least one source to search.");
      return;
    }

    setBusy(true);
    setError("");
    setTab("search");

    if (wanted.length > 1) {
      setDiscoverProgress({ done: 0, total: wanted.length });
    }

    const found: ListeningResult[] = [];

    try {
      // Sequential on purpose: each search already fans out across every ticked
      // source and the server has a per-run timeout budget, so firing several
      // at once is the reliable way to make all of them time out together.
      for (const [index, entry] of wanted.entries()) {
        const result = await searchTopic(entry);

        if (result) {
          found.push(result);
        }

        if (wanted.length > 1) {
          setDiscoverProgress({ done: index + 1, total: wanted.length });
        }

        // A cancel stops the whole run, and what was already found is kept.
        if (cancelledRef.current) {
          break;
        }
      }
    } finally {
      saveResults(found);
      cancelledRef.current = false;
      setDiscoverProgress(null);
      setBusy(false);
    }
  }

  function setStatus(ids: string[], status: NonNullable<ListeningResult["status"]>) {
    onListeningResultsChange(
      data.listeningResults.map((row) => (ids.includes(row.id) ? { ...row, status } : row)),
    );
  }

  const archivedCount = data.listeningResults.filter((row) => row.status === "dismissed").length;
  const shown = data.listeningResults.filter((row) => {
    if (statusFilter === "all") {
      return true;
    }

    if (statusFilter === "accepted") {
      return row.status === "accepted";
    }

    if (statusFilter === "archived") {
      return row.status === "dismissed";
    }

    return row.status !== "dismissed";
  });

  function onTabKeyDown(event: React.KeyboardEvent, index: number) {
    const last = TABS.length - 1;
    const next =
      event.key === "ArrowRight"
        ? index === last
          ? 0
          : index + 1
        : event.key === "ArrowLeft"
          ? index === 0
            ? last
            : index - 1
          : event.key === "Home"
            ? 0
            : event.key === "End"
              ? last
              : -1;

    if (next < 0) {
      return;
    }

    event.preventDefault();
    setTab(TABS[next].id);
    tabRefs.current[next]?.focus();
  }

  return (
    <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
      <div className="border-b bg-muted/30 px-3 pt-3">
        <div aria-label="Social Listening sections" className="flex flex-wrap gap-1" role="tablist">
          {TABS.map((entry, index) => (
            <button
              aria-controls={`listening-panel-${entry.id}`}
              aria-selected={tab === entry.id}
              className={cn(
                "rounded-t-md px-3 py-2 text-xs font-semibold transition",
                tab === entry.id
                  ? "bg-background text-foreground shadow-[inset_0_-2px_0_hsl(var(--primary))]"
                  : "text-muted-foreground hover:bg-background/60",
              )}
              id={`listening-tab-${entry.id}`}
              key={entry.id}
              onClick={() => setTab(entry.id)}
              onKeyDown={(event) => onTabKeyDown(event, index)}
              ref={(node) => {
                tabRefs.current[index] = node;
              }}
              role="tab"
              tabIndex={tab === entry.id ? 0 : -1}
              type="button"
            >
              {entry.label}
            </button>
          ))}
        </div>
      </div>

      {/* SEARCH */}
      <div
        aria-labelledby="listening-tab-search"
        hidden={tab !== "search"}
        id="listening-panel-search"
        role="tabpanel"
      >
        <ListeningSearchBuilder
          advancedOpen={advancedOpen}
          analysisType={analysisType}
          archivedCount={archivedCount}
          availableSources={availableSources}
          busy={busy}
          discoverProgress={discoverProgress}
          elapsed={elapsed}
          error={error}
          liveAi={liveAi}
          onCancel={() => {
            cancelledRef.current = true;
            abortRef.current?.abort();
          }}
          onRun={() => void runTopics([topic])}
          onSourcesChange={onListeningSourcesChange}
          recency={recency}
          selectedSources={selectedSources}
          setAdvancedOpen={setAdvancedOpen}
          setAnalysisType={setAnalysisType}
          setRecency={setRecency}
          setStatusFilter={setStatusFilter}
          setTopic={setTopic}
          statusFilter={statusFilter}
          toggleSource={toggleSource}
          topic={topic}
        />

        <div className="space-y-2 p-3">
          {statusFilter === "active" && archivedCount > 0 ? (
            <p className="text-[11px] leading-5 text-muted-foreground">
              {archivedCount} archived{" "}
              {archivedCount === 1 ? "finding is" : "findings are"} hidden.{" "}
              <button
                className="underline underline-offset-2 hover:text-foreground"
                onClick={() => setStatusFilter("archived")}
                type="button"
              >
                Show archived
              </button>
              . They stay in the approvals log either way.
            </p>
          ) : statusFilter !== "active" ? (
            <p className="text-[11px] leading-5 text-muted-foreground">
              Filtered view.{" "}
              <button
                className="underline underline-offset-2 hover:text-foreground"
                onClick={() => setStatusFilter("active")}
                type="button"
              >
                Back to active findings
              </button>
            </p>
          ) : null}
          <ListeningFindings
            busy={busy}
            onDelete={onDeleteListeningResults}
            onNavigate={onNavigate}
            onStatusChange={setStatus}
            results={shown}
          />
        </div>
      </div>

      {/* ACCOUNT RESEARCH */}
      <div
        aria-labelledby="listening-tab-account"
        hidden={tab !== "account"}
        id="listening-panel-account"
        role="tabpanel"
      >
        <div className="p-3">
          <AccountResearchPanel
            apiKey={data.aiIntegration.scrapeCreatorsApiKey ?? ""}
            findings={data.accountFindings ?? []}
            onDeleteFinding={onDeleteAccountFinding}
            onFindingsChange={onAccountFindingsChange}
          />
        </div>
      </div>

      {/* TRENDING */}
      <div
        aria-labelledby="listening-tab-trending"
        hidden={tab !== "trending"}
        id="listening-panel-trending"
        role="tabpanel"
      >
        <div className="space-y-3 p-3">
          <div className="rounded-lg border border-dashed bg-muted/20 p-3">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline">Raw source data</Badge>
              <p className="text-xs font-medium">Unfiltered, and not scored for relevance to UCC</p>
            </div>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">
              This is YouTube&rsquo;s own global Shorts trending chart exactly as
              the vendor returns it. Nothing here is ranked, filtered or scored
              against UCC&rsquo;s courses or market: no such scoring exists in
              this app, so a &ldquo;relevant to UCC&rdquo; view would be a number
              made up on the spot. Read it as a lead list, judge relevance
              yourself, and use Research this to turn anything promising into a
              real search. Nothing here reaches the Signal Board on its own.
            </p>
          </div>
          <TrendingNowPanel
            busy={busy}
            onResearch={(entry) => {
              setTopic(entry);
              void runTopics([entry]);
            }}
            scrapeCreatorsApiKey={data.aiIntegration.scrapeCreatorsApiKey ?? ""}
          />
        </div>
      </div>

      {/* DISCOVER */}
      <div
        aria-labelledby="listening-tab-discover"
        hidden={tab !== "discover"}
        id="listening-panel-discover"
        role="tabpanel"
      >
        <div className="p-3">
          <ListeningDiscoverTab
            busy={busy}
            canRun={liveAi}
            onOpenRecord={onOpenRecord}
            onRunTopics={(entries) => void runTopics(entries)}
            progress={discoverProgress}
            topics={discoveryTopics.slice(0, Math.max(DISCOVERY_DEFAULT_SELECTION, 8))}
          />
        </div>
      </div>
    </div>
  );
}

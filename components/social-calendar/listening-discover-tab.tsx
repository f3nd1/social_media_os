"use client";

// Discover: a search-generation workspace, not a second results block.
//
// Every topic offered here is read out of the workspace the college already
// filled in (courses, audience concerns, competitors) by suggestDiscoveryTopics.
// Nothing is invented. The one thing this screen adds over the old inline
// version is a draft stage: picking items produces editable query drafts that
// cost nothing, and credits are only spent when a draft is actually run.

import { useState } from "react";

import { ExternalLink, SearchCheck, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { discoverySourceTarget, type DiscoveryTopic } from "@/lib/discover-topics";

type Draft = { id: string; topic: string };

// The three kinds suggestDiscoveryTopics actually produces, recovered from the
// "why" string it already writes. Grouping is presentational only: no topic is
// reclassified and none is dropped.
function groupOf(why: string): string {
  if (why.startsWith("Course:")) {
    return "Courses";
  }

  if (why.startsWith("Competitor:")) {
    return "Competitors";
  }

  if (why.startsWith("Concern")) {
    return "Audience concerns";
  }

  return "Other";
}

export function ListeningDiscoverTab({
  busy,
  canRun,
  onOpenRecord,
  onRunTopics,
  progress,
  topics,
}: {
  busy: boolean;
  canRun: boolean;
  // Opens the workspace record this topic was read out of.
  onOpenRecord: (view: "courses" | "competitors", elementId: string) => void;
  onRunTopics: (topics: string[]) => void;
  progress: { done: number; total: number } | null;
  topics: DiscoveryTopic[];
}) {
  const [picked, setPicked] = useState<string[]>([]);
  const [drafts, setDrafts] = useState<Draft[]>([]);

  const groups = Array.from(new Set(topics.map((entry) => groupOf(entry.why))));

  function generate() {
    const next = topics
      .filter((entry) => picked.includes(entry.id))
      .map((entry) => ({ id: entry.id, topic: entry.topic }));

    // Merge rather than replace, so a second pass over another group does not
    // silently throw away drafts already edited.
    setDrafts((current) => [
      ...current,
      ...next.filter((entry) => !current.some((row) => row.id === entry.id)),
    ]);
    setPicked([]);
  }

  if (topics.length === 0) {
    return (
      <div className="rounded-lg border border-dashed p-6 text-center">
        <p className="text-sm font-medium">Nothing to suggest yet</p>
        <p className="mx-auto mt-1 max-w-md text-xs leading-5 text-muted-foreground">
          Discover reads its topics from your own courses, audience concerns and
          competitors. Add one of those and suggestions appear here.
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)]">
      <div className="rounded-lg border">
        <div className="border-b bg-muted/30 px-3 py-2">
          <p className="text-sm font-semibold">Pick what to research</p>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">
            Read from your own records. Creating drafts costs nothing.
          </p>
        </div>
        <div className="space-y-3 p-3">
          {groups.map((group) => (
            <fieldset className="rounded-md border p-2" key={group}>
              <legend className="px-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                {group}
              </legend>
              {topics
                .filter((entry) => groupOf(entry.why) === group)
                .map((entry) => (
                  <label
                    className="flex items-start gap-2 px-1 py-1 text-xs leading-5"
                    key={entry.id}
                  >
                    <input
                      checked={picked.includes(entry.id)}
                      className="mt-1 h-3.5 w-3.5 shrink-0"
                      onChange={() =>
                        setPicked((current) =>
                          current.includes(entry.id)
                            ? current.filter((id) => id !== entry.id)
                            : [...current, entry.id],
                        )
                      }
                      type="checkbox"
                    />
                    <span className="min-w-0">
                      {entry.topic}
                      <span className="ml-1 text-muted-foreground">{entry.why}</span>
                      {/* The "why" says which record this came from; this goes
                          and opens it. Rendered as a button rather than an
                          anchor because the app navigates by view state, not
                          by url, so there is no href that would work. */}
                      <button
                        className="ml-1 inline-flex items-center gap-0.5 align-baseline text-primary underline underline-offset-2 hover:no-underline"
                        onClick={(event) => {
                          // The label sits inside the checkbox's <label>, so
                          // without this the link would also tick the box.
                          event.preventDefault();
                          event.stopPropagation();
                          const target = discoverySourceTarget(entry.source);
                          onOpenRecord(target.view, target.elementId);
                        }}
                        title={
                          entry.source.kind === "audience"
                            ? "A concern is one entry in an audience's pain points, not a record of its own, so this opens the audience that raised it"
                            : undefined
                        }
                        type="button"
                      >
                        {discoverySourceTarget(entry.source).label}
                        <ExternalLink className="h-3 w-3" />
                      </button>
                    </span>
                  </label>
                ))}
            </fieldset>
          ))}

          <Button
            disabled={picked.length === 0}
            onClick={generate}
            size="sm"
            type="button"
          >
            Create {picked.length || ""} search {picked.length === 1 ? "draft" : "drafts"}
          </Button>
        </div>
      </div>

      <div className="rounded-lg border">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b bg-muted/30 px-3 py-2">
          <div>
            <p className="text-sm font-semibold">Search drafts</p>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">
              Edit before running. No credits are spent until you run one.
            </p>
          </div>
          <span className="rounded-full border bg-background px-2 py-0.5 text-[10px] font-medium">
            {drafts.length} {drafts.length === 1 ? "draft" : "drafts"}
          </span>
        </div>

        <div className="space-y-2 p-3">
          {drafts.length === 0 ? (
            <p className="rounded-md border border-dashed p-4 text-center text-xs leading-5 text-muted-foreground">
              No drafts yet. Pick topics on the left and create drafts to review
              them here.
            </p>
          ) : (
            drafts.map((draft) => (
              <div className="rounded-md border bg-muted/20 p-2" key={draft.id}>
                <label className="block">
                  <span className="sr-only">Search topic</span>
                  <Input
                    onChange={(event) =>
                      setDrafts((current) =>
                        current.map((row) =>
                          row.id === draft.id ? { ...row, topic: event.target.value } : row,
                        ),
                      )
                    }
                    value={draft.topic}
                  />
                </label>
                <div className="mt-2 flex flex-wrap gap-2">
                  <Button
                    disabled={!canRun || busy || !draft.topic.trim()}
                    onClick={() => onRunTopics([draft.topic.trim()])}
                    size="sm"
                    type="button"
                  >
                    <SearchCheck className="h-4 w-4" />
                    Run this search
                  </Button>
                  <Button
                    className="text-destructive hover:bg-destructive/10"
                    onClick={() =>
                      setDrafts((current) => current.filter((row) => row.id !== draft.id))
                    }
                    size="sm"
                    type="button"
                    variant="ghost"
                  >
                    <Trash2 className="h-4 w-4" />
                    Remove
                  </Button>
                </div>
              </div>
            ))
          )}

          {drafts.length > 1 ? (
            <div className="flex flex-wrap items-center gap-2 border-t pt-2">
              <Button
                disabled={!canRun || busy}
                onClick={() =>
                  onRunTopics(drafts.map((row) => row.topic.trim()).filter(Boolean))
                }
                size="sm"
                type="button"
                variant="outline"
              >
                Run all {drafts.length} searches
              </Button>
              <span className="text-xs leading-5 text-muted-foreground">
                Each draft is one full search across the sources and window set
                on the Search tab, so this spends credits once per draft.
              </span>
            </div>
          ) : null}

          {progress ? (
            <p aria-live="polite" className="text-xs leading-5 text-muted-foreground">
              {progress.done} of {progress.total} finished. Cancel stops after the
              current one and keeps what it found.
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}

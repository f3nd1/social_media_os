"use client";

// Social Listening findings workspace: the compact master-detail replacement
// for the old full-width stack of expanded result cards.
//
// One honesty note that shapes this whole file. In this app a search run and a
// finding are the SAME record: /api/social-listening fetches real posts and
// returns exactly one synthesised insight plus the quotes it rests on, saved as
// one ListeningResult. There is no per-finding entity underneath a run, and
// there is no relevance score, tag or reviewer note anywhere in the data model.
// So this list shows real runs and the detail pane shows that run's real
// insight and evidence. Nothing here renders a percentage, a score or a tag
// that the pipeline did not actually produce.

import { useEffect, useId, useRef, useState } from "react";

import { ExternalLink, Loader2, Trash2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { ListeningResult } from "@/lib/social-calendar-data";
import { cn, formatDisplayDate } from "@/lib/utils";

// Status as the data model actually holds it. "dismissed" has always been
// surfaced as "Archived" on this screen, so that wording is kept rather than
// adding a second control that would write the same value under a new name.
function statusLabel(status: ListeningResult["status"]): string {
  return status === "accepted" ? "Accepted" : status === "dismissed" ? "Archived" : "New";
}

// Colour is never the only signal: every pill carries its word, and the dot is
// a redundant cue rather than the meaning itself.
function StatusPill({ status }: { status: ListeningResult["status"] }) {
  const label = statusLabel(status);

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
        status === "accepted" && "border-success-border bg-success text-success-foreground",
        status === "dismissed" && "border-input bg-muted text-muted-foreground",
        (!status || status === "new") && "border-input bg-background text-foreground",
      )}
    >
      <span
        aria-hidden
        className={cn(
          "h-1.5 w-1.5 rounded-full",
          status === "accepted" && "bg-success-foreground",
          status === "dismissed" && "bg-muted-foreground",
          (!status || status === "new") && "bg-foreground",
        )}
      />
      {label}
    </span>
  );
}

// An accessible confirmation. Native window.confirm was already used for the
// single delete, but it cannot state a bulk count alongside the audit warning
// in a way that reads well, and the brief asks for a real dialog: Escape to
// close, focus moved in on open and returned to the trigger on close.
function ConfirmDialog({
  body,
  confirmLabel,
  onCancel,
  onConfirm,
  title,
}: {
  body: string;
  confirmLabel: string;
  onCancel: () => void;
  onConfirm: () => void;
  title: string;
}) {
  const headingId = useId();
  const bodyId = useId();
  const confirmRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    confirmRef.current?.focus();

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onCancel();
      }
    }

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onCancel]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 p-4"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onCancel();
        }
      }}
    >
      <div
        aria-describedby={bodyId}
        aria-labelledby={headingId}
        aria-modal="true"
        className="w-full max-w-md rounded-lg border bg-background p-4 shadow-lg"
        role="dialog"
      >
        <h2 className="text-base font-semibold" id={headingId}>
          {title}
        </h2>
        <p className="mt-2 text-xs leading-5 text-muted-foreground" id={bodyId}>
          {body}
        </p>
        <div className="mt-4 flex flex-wrap justify-end gap-2">
          <Button onClick={onCancel} size="sm" type="button" variant="outline">
            Cancel
          </Button>
          <Button
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            onClick={onConfirm}
            ref={confirmRef}
            size="sm"
            type="button"
          >
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}

export function ListeningFindings({
  busy,
  onDelete,
  onNavigate,
  onStatusChange,
  results,
}: {
  busy: boolean;
  // Deletes for real, including the approvals-log purge. The caller does not
  // re-confirm: this component owns the confirmation so it can state the count.
  onDelete: (ids: string[]) => void;
  onNavigate: (view: "brief" | "campaigns" | "platformIntel" | "signals") => void;
  onStatusChange: (ids: string[], status: NonNullable<ListeningResult["status"]>) => void;
  results: ListeningResult[];
}) {
  const [activeId, setActiveId] = useState<string>("");
  const [picked, setPicked] = useState<string[]>([]);
  const [confirming, setConfirming] = useState<{ ids: string[] } | null>(null);
  // Where focus goes back to when the dialog closes.
  const deleteTriggerRef = useRef<HTMLElement | null>(null);

  // Keep the selection honest when the list changes underneath it, for example
  // after a delete or when the archived filter is toggled.
  const visibleIds = results.map((row) => row.id);
  const selected = picked.filter((id) => visibleIds.includes(id));
  const active = results.find((row) => row.id === activeId) ?? results[0] ?? null;

  function toggle(id: string) {
    setPicked((current) =>
      current.includes(id) ? current.filter((row) => row !== id) : [...current, id],
    );
  }

  function closeDialog() {
    setConfirming(null);
    // Focus return, so a keyboard user is not dropped at the top of the page.
    deleteTriggerRef.current?.focus();
    deleteTriggerRef.current = null;
  }

  // Accepted findings are live strategy inputs feeding the brief, campaigns and
  // the playbook, so they are never deletable in one click. Archiving first is
  // the deliberate second step.
  const blockedByAccepted = (ids: string[]) =>
    results.filter((row) => ids.includes(row.id) && row.status === "accepted");

  function requestDelete(ids: string[], trigger: HTMLElement | null) {
    deleteTriggerRef.current = trigger;
    setConfirming({ ids });
  }

  if (results.length === 0) {
    return (
      <div className="rounded-lg border border-dashed p-6 text-center">
        <p className="text-sm font-medium">No findings yet</p>
        <p className="mx-auto mt-1 max-w-md text-xs leading-5 text-muted-foreground">
          Run a search above to fetch real public posts. Every finding keeps its
          evidence links so any claim can be checked.
        </p>
      </div>
    );
  }

  const blocked = confirming ? blockedByAccepted(confirming.ids) : [];
  const deletable = confirming
    ? confirming.ids.filter((id) => !blocked.some((row) => row.id === id))
    : [];

  return (
    <div className="overflow-hidden rounded-lg border">
      {/* Bulk toolbar, shown only once something is ticked. */}
      {selected.length > 0 ? (
        <div className="flex flex-wrap items-center gap-2 border-b bg-muted/40 p-2">
          <span aria-live="polite" className="text-xs font-medium">
            {selected.length} selected
          </span>
          <Button
            disabled={busy}
            onClick={() => {
              onStatusChange(selected, "dismissed");
              setPicked([]);
            }}
            size="sm"
            type="button"
            variant="outline"
          >
            Archive
          </Button>
          <Button
            className="text-destructive hover:bg-destructive/10"
            disabled={busy}
            onClick={(event) => requestDelete(selected, event.currentTarget)}
            size="sm"
            type="button"
            variant="ghost"
          >
            <Trash2 className="h-4 w-4" />
            Delete
          </Button>
          <Button
            className="ml-auto"
            onClick={() => setPicked([])}
            size="sm"
            type="button"
            variant="ghost"
          >
            Clear
          </Button>
        </div>
      ) : null}

      {/* Master-detail on desktop, stacked on narrow screens. */}
      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,22rem)_minmax(0,1fr)]">
        <div className="max-h-[28rem] overflow-y-auto border-b lg:max-h-[38rem] lg:border-b-0 lg:border-r">
          <div className="sticky top-0 z-10 flex items-center gap-2 border-b bg-muted/60 px-3 py-2 backdrop-blur">
            <input
              aria-label="Select all findings"
              checked={selected.length === results.length && results.length > 0}
              className="h-3.5 w-3.5"
              onChange={(event) =>
                setPicked(event.target.checked ? visibleIds : [])
              }
              type="checkbox"
            />
            <span className="text-xs text-muted-foreground">
              {results.length} {results.length === 1 ? "finding" : "findings"}
            </span>
          </div>

          <ul className="divide-y">
            {results.map((row) => (
              <li key={row.id}>
                <div
                  className={cn(
                    "flex gap-2 px-3 py-2.5 transition",
                    active?.id === row.id
                      ? "bg-background shadow-[inset_3px_0_0_hsl(var(--primary))]"
                      : "hover:bg-muted/40",
                  )}
                >
                  <input
                    aria-label={`Select finding: ${row.topic}`}
                    checked={selected.includes(row.id)}
                    className="mt-1 h-3.5 w-3.5 shrink-0"
                    onChange={() => toggle(row.id)}
                    type="checkbox"
                  />
                  <button
                    className="min-w-0 flex-1 text-left"
                    onClick={() => setActiveId(row.id)}
                    type="button"
                  >
                    <p className="truncate text-xs font-semibold">{row.topic}</p>
                    <p className="mt-1 line-clamp-2 text-[11px] leading-4 text-muted-foreground">
                      {row.insight}
                    </p>
                    <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                      <StatusPill status={row.status} />
                      <span className="text-[10px] text-muted-foreground">
                        {formatDisplayDate(row.generatedAt)}
                      </span>
                      <span className="text-[10px] text-muted-foreground">
                        {row.quotes.length} quotes
                      </span>
                    </div>
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </div>

        {/* Detail */}
        {active ? (
          <div className="max-h-[38rem] overflow-y-auto bg-background p-4">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
              Selected finding
            </p>
            <h3 className="mt-1 text-base font-semibold leading-6">{active.topic}</h3>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <StatusPill status={active.status} />
              <Badge variant="outline">{active.analysisType}</Badge>
              <span className="text-[11px] text-muted-foreground">
                {formatDisplayDate(active.generatedAt)}
              </span>
              {active.recency ? (
                <span className="text-[11px] text-muted-foreground">{active.recency}</span>
              ) : null}
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              <Button
                disabled={busy || active.status === "accepted"}
                onClick={() => onStatusChange([active.id], "accepted")}
                size="sm"
                type="button"
              >
                {active.status === "accepted"
                  ? "Accepted as strategy input"
                  : "Accept as strategy input"}
              </Button>
              <Button
                disabled={busy || active.status === "dismissed"}
                onClick={() => onStatusChange([active.id], "dismissed")}
                size="sm"
                type="button"
                variant="outline"
              >
                Archive
              </Button>
              {/* Delete stays visible on any finding that is not an accepted
                  strategy input, rather than only appearing after archiving.
                  The old two-step existed because delete was an inline button
                  with no confirmation; the dialog now states exactly what is
                  lost, and hiding delete behind a filter change would make it
                  the obscure control the brief asks us not to build. Accepted
                  findings are still refused outright. */}
              {active.status === "accepted" ? (
                <span className="self-center text-[11px] text-muted-foreground">
                  Archive first to enable delete
                </span>
              ) : (
                <Button
                  className="text-destructive hover:bg-destructive/10"
                  disabled={busy}
                  onClick={(event) => requestDelete([active.id], event.currentTarget)}
                  size="sm"
                  type="button"
                  variant="ghost"
                >
                  <Trash2 className="h-4 w-4" />
                  Delete permanently
                </Button>
              )}
            </div>

            <div className="mt-5">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                Extracted summary
              </p>
              <p className="mt-2 whitespace-pre-wrap rounded-md border bg-muted/20 p-3 text-sm leading-6">
                {active.insight}
              </p>
            </div>

            <div className="mt-5">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                Evidence: real posts this rests on
              </p>
              <div className="mt-2 space-y-2">
                {active.quotes.map((quote, index) => (
                  <div
                    className="rounded-md border bg-muted/20 p-2 text-xs leading-5"
                    key={`${active.id}-quote-${index}`}
                  >
                    <p className="italic">&ldquo;{quote.text}&rdquo;</p>
                    <p className="mt-1 text-muted-foreground">
                      {quote.source}
                      {" / "}
                      <a
                        className="inline-flex items-center gap-1 underline underline-offset-2"
                        href={quote.url}
                        rel="noreferrer"
                        target="_blank"
                      >
                        Open original source
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {active.patterns && active.patterns.hashtags.length > 0 ? (
              <div className="mt-5 rounded-md border bg-muted/20 p-3">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Patterns in our own search sample
                </p>
                <p className="mt-1 text-xs leading-5 text-muted-foreground">
                  Counted across the {active.patterns.postCount} posts this search
                  returned. This is our sample, not platform-wide trend data, and
                  it is far too small to say what is trending on any platform.
                  {active.patterns.undated > 0
                    ? ` ${active.patterns.undated} of them carried no date, so they were kept rather than assumed to be outside the window.`
                    : ""}
                </p>
                <p className="mt-2 text-xs leading-5">
                  <span className="font-medium">Tags seen more than once:</span>{" "}
                  {active.patterns.hashtags.map((tag) => `#${tag.tag} (${tag.count})`).join(", ")}
                </p>
                {active.patterns.sourceMix.length > 0 ? (
                  <p className="mt-1 text-xs leading-5">
                    <span className="font-medium">Where they came from:</span>{" "}
                    {active.patterns.sourceMix
                      .map((entry) => `${entry.source} (${entry.count})`)
                      .join(", ")}
                  </p>
                ) : null}
              </div>
            ) : null}

            <div className="mt-5">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                Workflow
              </p>
              {active.status === "accepted" ? (
                <div className="mt-2 rounded-md border border-success-border bg-success p-3">
                  <p className="text-xs font-medium leading-5 text-success-foreground">
                    Accepted. This finding now feeds Strategy Brief generation,
                    Campaign suggestions, and the Platform Intelligence playbook
                    as internal research, and appears on the Signal Board. Quotes
                    are never used as copy.
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <Button onClick={() => onNavigate("signals")} size="sm" type="button" variant="outline">
                      Signal Board
                    </Button>
                    <Button onClick={() => onNavigate("brief")} size="sm" type="button" variant="outline">
                      Strategy Brief
                    </Button>
                    <Button onClick={() => onNavigate("campaigns")} size="sm" type="button" variant="outline">
                      Campaigns
                    </Button>
                    <Button
                      onClick={() => onNavigate("platformIntel")}
                      size="sm"
                      type="button"
                      variant="outline"
                    >
                      Platform Intelligence
                    </Button>
                  </div>
                </div>
              ) : (
                <p className="mt-2 rounded-md border bg-muted/20 p-3 text-xs leading-5 text-muted-foreground">
                  {active.status === "dismissed"
                    ? "Archived. The approvals log still records this decision, and it no longer feeds any AI context."
                    : "Not yet accepted. Accepted findings feed Strategy Brief generation, Campaign suggestions, and the Platform Intelligence playbook as internal research signals."}
                </p>
              )}
            </div>

            <p className="mt-4 text-xs leading-5 text-muted-foreground">
              Covered: {active.sourcesCovered}. Analysed by {active.model}.
              Research evidence only; do not copy quotes into marketing content.
            </p>
          </div>
        ) : (
          <div className="grid place-items-center p-8 text-center text-xs text-muted-foreground">
            Select a finding to read its summary and evidence.
          </div>
        )}
      </div>

      {busy ? (
        <p
          aria-live="polite"
          className="flex items-center gap-2 border-t bg-muted/30 px-3 py-2 text-xs text-muted-foreground"
        >
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          Working
        </p>
      ) : null}

      {confirming ? (
        <ConfirmDialog
          body={
            blocked.length > 0
              ? `${blocked.length} of these ${blocked.length === 1 ? "is" : "are"} accepted as a strategy input and will not be deleted. Archive ${blocked.length === 1 ? "it" : "them"} first if you really mean to remove ${blocked.length === 1 ? "it" : "them"}. ${
                  deletable.length > 0
                    ? `The other ${deletable.length} will be deleted permanently, including their approvals-log entries.`
                    : "Nothing will be deleted."
                }`
              : `${deletable.length} ${deletable.length === 1 ? "finding" : "findings"} will be deleted permanently. This also removes their entries from the approvals log, so the record of them being accepted or archived disappears too. To keep the audit trail, use Archive instead.`
          }
          confirmLabel={
            deletable.length === 0
              ? "Nothing to delete"
              : `Delete ${deletable.length} ${deletable.length === 1 ? "finding" : "findings"}`
          }
          onCancel={closeDialog}
          onConfirm={() => {
            if (deletable.length > 0) {
              onDelete(deletable);
              setPicked([]);
            }
            closeDialog();
          }}
          title={
            confirming.ids.length === 1 ? "Delete this finding?" : `Delete ${confirming.ids.length} findings?`
          }
        />
      ) : null}
    </div>
  );
}

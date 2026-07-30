"use client";

// The Signal Board. One place to see every finding a manager has already
// accepted, whichever module produced it, and where each one goes next.
//
// Read-only by design. Accept and dismiss stay on the module screens, so this
// board cannot become a second approval path that bypasses the approvals log.
// Every row links back to the screen that owns it.

import { useMemo, useState } from "react";

import { ArrowRight, ClipboardCheck, Radar } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
  SIGNAL_HOME_VIEW,
  collectSignals,
  pendingByModule,
  type SignalModule,
  type SignalView,
} from "@/lib/signal-board";
import type { MarketingWorkspaceData } from "@/lib/social-calendar-data";
import { formatDisplayDate } from "@/lib/utils";

const FILTERS: Array<{ id: SignalModule | "all"; label: string }> = [
  { id: "all", label: "All modules" },
  { id: "Platform Audit", label: "Platform Audit" },
  { id: "Competitor Intelligence", label: "Competitor Intelligence" },
  { id: "Trend Radar", label: "Trend Radar" },
  { id: "Social Listening", label: "Social Listening" },
  { id: "Account Research", label: "Account Research" },
];

export function SignalBoardPanel({
  data,
  onNavigate,
}: {
  data: MarketingWorkspaceData;
  // "reports" is the Performance Review screen, which is where the approvals
  // log panel actually lives. The one destination here that is not a signal's
  // own module.
  onNavigate: (view: SignalView | "reports") => void;
}) {
  const [filter, setFilter] = useState<SignalModule | "all">("all");

  const signals = useMemo(() => collectSignals(data), [data]);
  const pending = useMemo(() => pendingByModule(data), [data]);

  const shown = filter === "all" ? signals : signals.filter((row) => row.module === filter);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <Radar className="h-5 w-5" />
            <p className="text-sm font-semibold">Signal Board</p>
            <Badge variant="outline">Read only</Badge>
          </div>
          <p className="text-xs leading-5 text-muted-foreground">
            Every finding you have accepted, from all five intelligence modules,
            with what it feeds next. Accepting and dismissing stay on the module
            screens so the approvals log keeps one record of each decision. The
            reach shown on each card means the finding is available to those
            generators the next time they run, not that they have run.
          </p>
        </CardHeader>

        <CardContent className="space-y-3">
          <div className="flex flex-wrap gap-2">
            {FILTERS.map((entry) => {
              const count =
                entry.id === "all"
                  ? signals.length
                  : signals.filter((row) => row.module === entry.id).length;

              return (
                <button
                  className={`rounded-full border px-3 py-1 text-xs font-medium transition ${
                    filter === entry.id
                      ? "border-primary bg-primary text-primary-foreground"
                      : "hover:bg-muted"
                  }`}
                  key={entry.id}
                  onClick={() => setFilter(entry.id)}
                  type="button"
                >
                  {entry.label} ({count})
                </button>
              );
            })}
          </div>

          {pending.length > 0 ? (
            <div className="rounded-md border border-warning-border bg-warning p-3 text-xs leading-5 text-warning-foreground">
              <p className="font-medium">Waiting on your decision</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {pending.map((row) => (
                  <Button
                    key={row.module}
                    onClick={() => onNavigate(SIGNAL_HOME_VIEW[row.module])}
                    size="sm"
                    variant="outline"
                  >
                    {row.module}: {row.count}
                    <ArrowRight className="ml-1 h-3 w-3" />
                  </Button>
                ))}
              </div>
            </div>
          ) : null}

          {shown.length === 0 ? (
            <p className="rounded-md border border-dashed p-4 text-xs leading-5 text-muted-foreground">
              {signals.length === 0
                ? "Nothing accepted yet. Run a platform audit, competitor observation, trend scan or listening search, then accept what is worth keeping and it appears here."
                : "No accepted findings from this module yet."}
            </p>
          ) : null}

          <div className="space-y-2">
            {shown.map((row) => (
              <div className="rounded-lg border p-3" key={row.id}>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="outline">{row.module}</Badge>
                  <p className="text-sm font-medium">{row.title}</p>
                </div>
                <p className="mt-1 text-xs leading-5 text-muted-foreground">
                  {row.detail}
                </p>
                <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  <span>Available to: {row.reaches.join(", ")}</span>
                  <span aria-hidden>·</span>
                  <span>{row.dateLabel} {formatDisplayDate(row.generatedAt)}</span>
                  {row.source ? (
                    <>
                      <span aria-hidden>·</span>
                      <span>{row.source}</span>
                    </>
                  ) : null}
                  <Button
                    className="h-6 px-2"
                    onClick={() => onNavigate(row.view)}
                    size="sm"
                    variant="ghost"
                  >
                    Open source module
                  </Button>
                </div>
              </div>
            ))}
          </div>

          <Button
            onClick={() => onNavigate("reports")}
            size="sm"
            variant="outline"
          >
            <ClipboardCheck className="mr-1 h-3 w-3" />
            See who decided and when, in the approvals log
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

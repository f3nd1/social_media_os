"use client";

// Read-only Changelog screen. It reads public/changelog.json (generated from
// git history at build/dev time by scripts/generate-changelog.mjs) and renders
// it in plain language: search, date range, a running count, and per-day
// groups of commit cards with collapsible descriptions and file lists. Nothing
// here edits anything; it is a display of what was built and when.

import { useEffect, useMemo, useState } from "react";
import { FileClock, GitCommitHorizontal, Search } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { PaginationControls } from "@/components/social-calendar/pagination-controls";
import { apiUrl } from "@/lib/base-path";

type ChangeType = "Modified" | "Added" | "Deleted" | "Renamed" | "Copied";

type ChangelogFile = { path: string; changeType: ChangeType };

type ChangelogCommit = {
  hash: string;
  shortHash: string;
  author: string;
  date: string;
  subject: string;
  body: string;
  files: ChangelogFile[];
};

type ChangelogPayload = {
  generatedAt?: string;
  commits?: ChangelogCommit[];
};

type LoadState = "loading" | "ready" | "empty" | "error";

// DD MMMM YYYY, for example 09 July 2026.
const DAY_FORMAT = new Intl.DateTimeFormat("en-GB", {
  day: "2-digit",
  month: "long",
  year: "numeric",
});

const TIME_FORMAT = new Intl.DateTimeFormat("en-GB", {
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

function formatDay(iso: string): string {
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? "Unknown date" : DAY_FORMAT.format(date);
}

function formatTime(iso: string): string {
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? "" : TIME_FORMAT.format(date);
}

// The From/To filters are plain calendar days; compare on the YYYY-MM-DD part
// so a commit on the boundary day is always included.
function isoDay(iso: string): string {
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? "" : date.toISOString().slice(0, 10);
}

const CHANGE_BADGE: Record<ChangeType, string> = {
  Added: "success",
  Deleted: "warning",
  Modified: "info",
  Renamed: "secondary",
  Copied: "secondary",
};

export function ChangelogView() {
  const [commits, setCommits] = useState<ChangelogCommit[]>([]);
  const [state, setState] = useState<LoadState>("loading");
  const [query, setQuery] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [page, setPage] = useState(1);

  // Any filter change resets to the first page, so a narrowed result set never
  // strands the reader on a page that no longer exists.
  useEffect(() => {
    setPage(1);
  }, [query, fromDate, toDate]);

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        const response = await fetch(apiUrl("/changelog.json"), {
          cache: "no-store",
        });
        if (!response.ok) {
          throw new Error(`Request failed with ${response.status}`);
        }
        const payload = (await response.json()) as ChangelogPayload;
        if (!active) return;
        const rows = Array.isArray(payload.commits) ? payload.commits : [];
        setCommits(rows);
        setState(rows.length > 0 ? "ready" : "empty");
      } catch {
        if (!active) return;
        setState("error");
      }
    }

    void load();
    return () => {
      active = false;
    };
  }, []);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return commits.filter((commit) => {
      if (needle) {
        const haystack = `${commit.subject}\n${commit.body}`.toLowerCase();
        if (!haystack.includes(needle)) return false;
      }
      const day = isoDay(commit.date);
      if (fromDate && day && day < fromDate) return false;
      if (toDate && day && day > toDate) return false;
      return true;
    });
  }, [commits, query, fromDate, toDate]);

  const PAGE_SIZE = 20;
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pagedCommits = useMemo(
    () => filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE),
    [filtered, safePage],
  );

  // Group the current page's commits by DD MMMM YYYY, preserving the newest-first
  // order that git log already returns.
  const groups = useMemo(() => {
    const order: string[] = [];
    const byDay = new Map<string, ChangelogCommit[]>();
    for (const commit of pagedCommits) {
      const day = formatDay(commit.date);
      if (!byDay.has(day)) {
        byDay.set(day, []);
        order.push(day);
      }
      byDay.get(day)!.push(commit);
    }
    return order.map((day) => ({ day, items: byDay.get(day)! }));
  }, [pagedCommits]);

  return (
    <section className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-secondary text-secondary-foreground">
              <FileClock className="h-5 w-5" />
            </div>
            <div>
              <CardTitle>Changelog</CardTitle>
              <CardDescription className="mt-2 leading-6">
                Every change, straight from git history. Dates show as
                DD MMMM YYYY.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_auto_auto]">
            <label className="relative block">
              <span className="sr-only">Search changes</span>
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="pl-9"
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search by subject or description"
                type="search"
                value={query}
              />
            </label>
            <label className="flex items-center gap-2 text-sm text-muted-foreground">
              <span className="whitespace-nowrap">From</span>
              <Input
                className="w-auto"
                max={toDate || undefined}
                onChange={(event) => setFromDate(event.target.value)}
                type="date"
                value={fromDate}
              />
            </label>
            <label className="flex items-center gap-2 text-sm text-muted-foreground">
              <span className="whitespace-nowrap">To</span>
              <Input
                className="w-auto"
                min={fromDate || undefined}
                onChange={(event) => setToDate(event.target.value)}
                type="date"
                value={toDate}
              />
            </label>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="info">
              {filtered.length} change{filtered.length === 1 ? "" : "s"}
            </Badge>
            {(query || fromDate || toDate) && filtered.length !== commits.length ? (
              <button
                className="text-xs text-muted-foreground underline underline-offset-2"
                onClick={() => {
                  setQuery("");
                  setFromDate("");
                  setToDate("");
                }}
                type="button"
              >
                Clear filters
              </button>
            ) : null}
          </div>
        </CardContent>
      </Card>

      {state === "loading" ? (
        <Card>
          <CardContent className="py-8 text-center text-sm text-muted-foreground">
            Loading the changelog.
          </CardContent>
        </Card>
      ) : null}

      {state === "error" ? (
        <Card>
          <CardContent className="py-8 text-center text-sm leading-6 text-muted-foreground">
            The changelog data has not been generated in this environment. It is
            written from git history on every build and dev start. Run{" "}
            <code className="rounded bg-muted px-1">npm run changelog</code> to
            create it.
          </CardContent>
        </Card>
      ) : null}

      {state === "empty" ? (
        <Card>
          <CardContent className="py-8 text-center text-sm text-muted-foreground">
            No changes recorded yet.
          </CardContent>
        </Card>
      ) : null}

      {state === "ready" && groups.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-sm text-muted-foreground">
            No changes match your search or date range.
          </CardContent>
        </Card>
      ) : null}

      {state === "ready"
        ? groups.map((group) => (
            <div className="space-y-3" key={group.day}>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-semibold">{group.day}</h2>
                <Badge variant="secondary">
                  {group.items.length} change
                  {group.items.length === 1 ? "" : "s"}
                </Badge>
              </div>
              <div className="space-y-3">
                {group.items.map((commit) => (
                  <ChangelogCard commit={commit} key={commit.hash} />
                ))}
              </div>
            </div>
          ))
        : null}

      {state === "ready" ? (
        <PaginationControls
          onPageChange={setPage}
          page={safePage}
          totalPages={totalPages}
        />
      ) : null}
    </section>
  );
}

function ChangelogCard({ commit }: { commit: ChangelogCommit }) {
  const time = formatTime(commit.date);

  return (
    <Card>
      <CardContent className="space-y-3 pt-5">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-sm font-semibold leading-6">{commit.subject}</p>
            <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
              <span>{formatDay(commit.date)}</span>
              {time ? <span>at {time}</span> : null}
              <span aria-hidden="true">|</span>
              <span>{commit.author}</span>
            </p>
          </div>
          <span className="inline-flex items-center gap-1 rounded-md border bg-muted/40 px-2 py-0.5 font-mono text-xs">
            <GitCommitHorizontal className="h-3.5 w-3.5" />
            {commit.shortHash}
          </span>
        </div>

        {commit.body ? (
          <details className="group rounded-md border bg-muted/20">
            <summary className="cursor-pointer list-none px-3 py-2 text-xs font-medium text-muted-foreground">
              <span className="group-open:hidden">Show description</span>
              <span className="hidden group-open:inline">Hide description</span>
            </summary>
            <p className="whitespace-pre-wrap px-3 pb-3 text-sm leading-6">
              {commit.body}
            </p>
          </details>
        ) : null}

        {commit.files.length > 0 ? (
          <details className="group rounded-md border bg-muted/20">
            <summary className="cursor-pointer list-none px-3 py-2 text-xs font-medium text-muted-foreground">
              {commit.files.length} file{commit.files.length === 1 ? "" : "s"}{" "}
              changed
              <span className="ml-1 group-open:hidden">(show)</span>
              <span className="ml-1 hidden group-open:inline">(hide)</span>
            </summary>
            <ul className="space-y-1 px-3 pb-3">
              {commit.files.map((file) => (
                <li
                  className="flex items-center justify-between gap-2 text-xs"
                  key={`${commit.hash}:${file.path}`}
                >
                  <span className="min-w-0 truncate font-mono">{file.path}</span>
                  <Badge
                    variant={
                      (CHANGE_BADGE[file.changeType] ??
                        "secondary") as "success" | "warning" | "info" | "secondary"
                    }
                  >
                    {file.changeType}
                  </Badge>
                </li>
              ))}
            </ul>
          </details>
        ) : null}
      </CardContent>
    </Card>
  );
}

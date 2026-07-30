"use client";

// Account research (ScrapeCreators). Lookup rather than listening: this answers
// "how big is this competitor, who are the Singapore creators in this space,
// and what are people saying under this post", where Social Listening answers
// "what is being said about a topic".
//
// Every lookup here spends a real credit, so three things are non-negotiable in
// this UI: say what a call cost, say plainly when a reply came from cache and
// cost nothing, and never show a fabricated number. A count the API did not
// return is shown as "not reported", never as zero.

import { useState } from "react";

import { Loader2, SearchCheck } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  ACCOUNT_ENDPOINTS,
  COMMENT_ENDPOINTS,
  CREATOR_FOLLOWER_BANDS,
  CREATOR_SORT_OPTIONS,
  accountFindingSummary,
  commentsFindingSummary,
  companyFindingSummary,
  creatorsFindingSummary,
  type AccountPlatform,
  type AccountSnapshot,
  type CommentPlatform,
  type CommentResult,
  type CompanySnapshot,
  type CreatorResult,
} from "@/lib/scrapecreators";
import type { AccountFinding } from "@/lib/social-calendar-data";
import { apiUrl } from "@/lib/base-path";
import { formatDisplayDate, readJsonResponse } from "@/lib/utils";

type Mode = "account" | "company" | "creators" | "comments";

const MODES: Array<{ id: Mode; label: string; blurb: string }> = [
  {
    id: "account",
    label: "Account",
    blurb:
      "Follower count, bio and post count for one account. Repeat lookups within the cache window cost nothing.",
  },
  {
    id: "company",
    label: "LinkedIn company",
    blurb:
      "Employee count, industry, specialities, and the similar-pages list, which is the closest thing the API has to competitor discovery.",
  },
  {
    id: "creators",
    label: "Singapore creators",
    blurb:
      "Finds TikTok creators by Singapore audience without needing to know their handles first. The only endpoint here that discovers rather than looks up.",
  },
  {
    id: "comments",
    label: "Post comments",
    blurb:
      "What people actually ask under a post. Internal research evidence only, never marketing copy.",
  },
];

type Credits = { charged: number | null; remaining: number | null };

// ponytail: oldest saved lookups past this are dropped, and the UI says so.
// Raise it (or move saved lookups out of the workspace document) if anyone
// ever needs a longer history than this.
const SAVED_CAP = 50;

// A count the API did not return must never render as 0.
function countLabel(value: number | null): string {
  return typeof value === "number" ? value.toLocaleString("en-GB") : "not reported";
}

export function AccountResearchPanel({
  apiKey,
  findings,
  onFindingsChange,
}: {
  apiKey: string;
  findings: AccountFinding[];
  onFindingsChange: (findings: AccountFinding[]) => void;
}) {
  const [mode, setMode] = useState<Mode>("account");
  const [platform, setPlatform] = useState<AccountPlatform>("tiktok");
  const [commentPlatform, setCommentPlatform] = useState<CommentPlatform>("tiktok");
  const [identifier, setIdentifier] = useState("");
  const [sortBy, setSortBy] = useState<string>("engagement");
  const [followerBand, setFollowerBand] = useState<string>("");
  const [running, setRunning] = useState(false);
  const [error, setError] = useState("");
  const [credits, setCredits] = useState<Credits | null>(null);
  const [account, setAccount] = useState<AccountSnapshot | null>(null);
  const [company, setCompany] = useState<CompanySnapshot | null>(null);
  const [creators, setCreators] = useState<CreatorResult[]>([]);
  const [comments, setComments] = useState<CommentResult[]>([]);

  const hasKey = Boolean(apiKey.trim());
  const saved = findings.filter((finding) => finding.status === "accepted");
  const active = MODES.find((entry) => entry.id === mode);
  const needsIdentifier = mode !== "creators";
  const endpoint = ACCOUNT_ENDPOINTS[platform];

  // Saving is the decision. Account research is a factual lookup, not an AI
  // recommendation, so there is no draft step to accept: choosing to keep a
  // result is itself the approval, and it is logged as one.
  function saveFinding(kind: AccountFinding["kind"], subject: string, summary: string) {
    onFindingsChange(
      [
        {
          id: `finding-${Date.now()}`,
          kind,
          subject,
          summary,
          status: "accepted" as const,
          savedAt: new Date().toISOString(),
          source: "ScrapeCreators",
        },
        ...findings,
      ].slice(0, SAVED_CAP),
    );
  }

  // Marked dismissed rather than deleted, so the approvals log can see the
  // decision when it diffs the workspace. A deleted row is invisible to that
  // diff, which would lose the record of the removal.
  function removeFinding(id: string) {
    onFindingsChange(
      findings.map((finding) =>
        finding.id === id ? { ...finding, status: "dismissed" as const } : finding,
      ),
    );
  }

  function clearResults() {
    setAccount(null);
    setCompany(null);
    setCreators([]);
    setComments([]);
    setCredits(null);
  }

  async function run() {
    if (needsIdentifier && !identifier.trim()) {
      setError("Enter a handle or url first.");
      return;
    }

    setRunning(true);
    setError("");
    clearResults();

    try {
      const response = await fetch(apiUrl("/api/scrapecreators"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          apiKey,
          action: mode,
          platform: mode === "comments" ? commentPlatform : platform,
          identifier: identifier.trim(),
          sortBy,
          followerBand,
        }),
      });

      const result = await readJsonResponse<
        | ({ ok: true; credits: Credits } & {
            account?: AccountSnapshot;
            company?: CompanySnapshot;
            creators?: CreatorResult[];
            comments?: CommentResult[];
          })
        | { ok: false; error: string }
      >(response, "complete the lookup", "Try again in a moment.");

      if (!result.ok) {
        setError(result.error);
        return;
      }

      setCredits(result.credits);
      setAccount(result.account ?? null);
      setCompany(result.company ?? null);
      setCreators(result.creators ?? []);
      setComments(result.comments ?? []);

      if (
        !result.account &&
        !result.company &&
        (result.creators?.length ?? 0) === 0 &&
        (result.comments?.length ?? 0) === 0
      ) {
        setError("The lookup succeeded but returned nothing usable. Check the handle or url.");
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : String(caught));
    } finally {
      setRunning(false);
    }
  }

  return (
    <Card>
      <CardHeader className="flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <SearchCheck className="h-5 w-5" />
          <p className="text-sm font-semibold">Account research</p>
          <Badge variant="outline">Costs credits</Badge>
        </div>
        <p className="text-xs leading-5 text-muted-foreground">
          Looks up real accounts and posts through ScrapeCreators. Each lookup
          spends one credit unless it comes back from cache, and the cost is
          shown with every result. Findings here are internal research, never
          marketing copy.
        </p>
      </CardHeader>

      <CardContent className="space-y-3">
        {!hasKey ? (
          <div className="rounded-md border border-warning-border bg-warning p-3 text-xs leading-5 text-warning-foreground">
            Add a ScrapeCreators API key in Settings to use account research.
          </div>
        ) : null}

        <div className="flex flex-wrap gap-2">
          {MODES.map((entry) => (
            <button
              className={`rounded-full border px-3 py-1 text-xs font-medium transition ${
                mode === entry.id
                  ? "border-primary bg-primary text-primary-foreground"
                  : "hover:bg-muted"
              }`}
              key={entry.id}
              onClick={() => {
                setMode(entry.id);
                setError("");
                clearResults();
              }}
              type="button"
            >
              {entry.label}
            </button>
          ))}
        </div>

        <p className="text-xs leading-5 text-muted-foreground">{active?.blurb}</p>

        <div className="flex flex-wrap items-end gap-2 rounded-lg border bg-muted/20 p-3">
          {mode === "account" ? (
            <label className="block space-y-1">
              <span className="text-xs font-medium">Platform</span>
              <select
                className="h-9 rounded-md border bg-background px-2 text-sm"
                onChange={(event) => setPlatform(event.target.value as AccountPlatform)}
                value={platform}
              >
                {(Object.keys(ACCOUNT_ENDPOINTS) as AccountPlatform[]).map((id) => (
                  <option key={id} value={id}>
                    {ACCOUNT_ENDPOINTS[id].label}
                  </option>
                ))}
              </select>
            </label>
          ) : null}

          {mode === "comments" ? (
            <label className="block space-y-1">
              <span className="text-xs font-medium">Platform</span>
              <select
                className="h-9 rounded-md border bg-background px-2 text-sm"
                onChange={(event) => setCommentPlatform(event.target.value as CommentPlatform)}
                value={commentPlatform}
              >
                {(Object.keys(COMMENT_ENDPOINTS) as CommentPlatform[]).map((id) => (
                  <option key={id} value={id}>
                    {COMMENT_ENDPOINTS[id].label}
                  </option>
                ))}
              </select>
            </label>
          ) : null}

          {mode === "creators" ? (
            <>
              <label className="block space-y-1">
                <span className="text-xs font-medium">Rank by</span>
                <select
                  className="h-9 rounded-md border bg-background px-2 text-sm"
                  onChange={(event) => setSortBy(event.target.value)}
                  value={sortBy}
                >
                  {CREATOR_SORT_OPTIONS.map((option) => (
                    <option key={option} value={option}>
                      {option.replace("_", " ")}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block space-y-1">
                <span className="text-xs font-medium">Follower size</span>
                <select
                  className="h-9 rounded-md border bg-background px-2 text-sm"
                  onChange={(event) => setFollowerBand(event.target.value)}
                  value={followerBand}
                >
                  <option value="">Any</option>
                  {CREATOR_FOLLOWER_BANDS.map((band) => (
                    <option key={band} value={band}>
                      {band}
                    </option>
                  ))}
                </select>
              </label>
            </>
          ) : null}

          {needsIdentifier ? (
            <label className="block min-w-[240px] flex-1 space-y-1">
              <span className="text-xs font-medium">
                {mode === "company"
                  ? "LinkedIn company page url"
                  : mode === "comments"
                    ? "Post url"
                    : `Handle or url (${endpoint.inputHint})`}
              </span>
              <Input
                onChange={(event) => setIdentifier(event.target.value)}
                placeholder={
                  mode === "company"
                    ? "https://www.linkedin.com/company/..."
                    : mode === "comments"
                      ? "https://www.tiktok.com/@someone/video/..."
                      : endpoint.inputHint
                }
                value={identifier}
              />
            </label>
          ) : null}

          <Button
            disabled={!hasKey || running}
            onClick={() => void run()}
            size="sm"
            type="button"
          >
            {running ? <Loader2 className="h-4 w-4 animate-spin" /> : <SearchCheck className="h-4 w-4" />}
            {running ? "Looking up" : "Look up"}
          </Button>
        </div>

        {error ? (
          <div className="rounded-md border border-warning-border bg-warning p-3 text-xs leading-5 text-warning-foreground">
            {error}
          </div>
        ) : null}

        {credits ? (
          <p className="text-xs leading-5 text-muted-foreground">
            {credits.charged === 0
              ? "Served from cache, no credit charged."
              : `Cost ${credits.charged ?? "an unreported number of"} credit${credits.charged === 1 ? "" : "s"}.`}
            {typeof credits.remaining === "number"
              ? ` ${credits.remaining.toLocaleString("en-GB")} remaining.`
              : ""}
          </p>
        ) : null}

        {account ? (
          <div className="space-y-1 rounded-lg border p-3">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-sm font-semibold">{account.name || account.handle}</p>
              {account.verified ? <Badge variant="secondary">Verified</Badge> : null}
              {account.cached ? <Badge variant="outline">From cache</Badge> : null}
            </div>
            <p className="text-xs text-muted-foreground">
              {ACCOUNT_ENDPOINTS[account.platform].label}
              {account.handle ? ` / @${account.handle}` : ""}
            </p>
            {account.bio ? <p className="text-sm leading-6">{account.bio}</p> : null}
            <p className="text-xs leading-5">
              <span className="font-medium">Followers:</span> {countLabel(account.followers)}
              {" · "}
              <span className="font-medium">Posts:</span> {countLabel(account.posts)}
            </p>
            <p className="text-xs text-muted-foreground">
              Captured {formatDisplayDate(account.capturedAt)}. A single point in time: the API
              has no follower history, so a trend needs repeat lookups saved over weeks.
            </p>
            <Button
              onClick={() =>
                saveFinding(
                  "account",
                  `${ACCOUNT_ENDPOINTS[account.platform].label} ${account.handle ? `@${account.handle}` : account.name}`,
                  accountFindingSummary(account),
                )
              }
              size="sm"
              variant="outline"
            >
              Save to Signal Board
            </Button>
          </div>
        ) : null}

        {company ? (
          <div className="space-y-1 rounded-lg border p-3">
            <p className="text-sm font-semibold">{company.name}</p>
            <p className="text-xs leading-5">
              <span className="font-medium">Employees:</span> {countLabel(company.employeeCount)}
              {company.industry ? ` · ${company.industry}` : ""}
              {company.headquarters ? ` · ${company.headquarters}` : ""}
              {company.founded ? ` · founded ${company.founded}` : ""}
            </p>
            {company.description ? (
              <p className="text-sm leading-6">{company.description}</p>
            ) : null}
            {company.specialities.length > 0 ? (
              <p className="text-xs leading-5">
                <span className="font-medium">Specialities:</span>{" "}
                {company.specialities.slice(0, 10).join(", ")}
              </p>
            ) : null}
            {company.similarPages.length > 0 ? (
              <p className="text-xs leading-5">
                <span className="font-medium">Similar pages, worth checking as competitors:</span>{" "}
                {company.similarPages.slice(0, 8).map((page) => page.name).join(", ")}
              </p>
            ) : null}
            <p className="text-xs text-muted-foreground">
              LinkedIn reports employee count, not followers, and none of its endpoints cache, so
              every refresh costs a credit.
            </p>
            <Button
              onClick={() =>
                saveFinding(
                  "company",
                  `LinkedIn company ${company.name}`,
                  companyFindingSummary(company),
                )
              }
              size="sm"
              variant="outline"
            >
              Save to Signal Board
            </Button>
          </div>
        ) : null}

        {creators.length > 0 ? (
          <div className="space-y-2">
            <p className="text-xs font-medium uppercase text-muted-foreground">
              {creators.length} Singapore creators
            </p>
            {creators.slice(0, 20).map((creator) => (
              <div className="rounded-md border p-2 text-xs leading-5" key={creator.handle}>
                <a
                  className="font-medium underline underline-offset-2"
                  href={creator.url}
                  rel="noreferrer"
                  target="_blank"
                >
                  {creator.name || creator.handle}
                </a>{" "}
                <span className="text-muted-foreground">@{creator.handle}</span>
                <br />
                Followers {countLabel(creator.followers)}
                {" · "}Engagement{" "}
                {typeof creator.engagementRate === "number"
                  ? `${creator.engagementRate}%`
                  : "not reported"}
                {" · "}Average views {countLabel(creator.averageViews)}
              </div>
            ))}
            <Button
              onClick={() =>
                saveFinding(
                  "creators",
                  `Singapore TikTok creators, ranked by ${sortBy.replace("_", " ")}`,
                  creatorsFindingSummary(creators),
                )
              }
              size="sm"
              variant="outline"
            >
              Save to Signal Board
            </Button>
          </div>
        ) : null}

        {comments.length > 0 ? (
          <div className="space-y-2">
            <p className="text-xs font-medium uppercase text-muted-foreground">
              {comments.length} comments, research evidence only
            </p>
            {comments.slice(0, 30).map((comment, index) => (
              <div
                className="rounded-md border bg-muted/20 p-2 text-xs leading-5"
                key={`${comment.author}-${index}`}
              >
                <p className="italic">&ldquo;{comment.text}&rdquo;</p>
                <p className="mt-1 text-muted-foreground">
                  {comment.author || "unknown"}
                  {typeof comment.likes === "number" ? ` · ${comment.likes} likes` : ""}
                </p>
              </div>
            ))}
            <p className="text-xs leading-5 text-muted-foreground">
              These are real people writing in public. Use them to understand what prospective
              students ask, never as copy in UCC content.
            </p>
            <Button
              onClick={() =>
                saveFinding(
                  "comments",
                  `Comments on ${identifier.trim()}`,
                  commentsFindingSummary(comments),
                )
              }
              size="sm"
              variant="outline"
            >
              Save to Signal Board
            </Button>
          </div>
        ) : null}
        {saved.length > 0 ? (
          <div className="space-y-2 rounded-lg border bg-muted/20 p-3">
            <p className="text-xs font-medium uppercase text-muted-foreground">
              {saved.length} saved {saved.length === 1 ? "lookup" : "lookups"}
            </p>
            <p className="text-xs leading-5 text-muted-foreground">
              These appear on the Signal Board and are available to the Strategy
              Brief, Campaigns and Platform Intelligence generators. Every save
              and removal is recorded in the approvals log. Figures are the ones
              the API returned on the day they were saved, not live values.
            </p>
            {saved.map((finding) => (
              <div className="rounded-md border bg-background p-2" key={finding.id}>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-xs font-medium">{finding.subject}</p>
                  <Button
                    className="h-6 px-2"
                    onClick={() => removeFinding(finding.id)}
                    size="sm"
                    variant="ghost"
                  >
                    Remove
                  </Button>
                </div>
                <p className="text-xs leading-5 text-muted-foreground">{finding.summary}</p>
                <p className="text-xs text-muted-foreground">
                  Saved {formatDisplayDate(finding.savedAt)} from {finding.source}
                </p>
              </div>
            ))}
            {saved.length >= SAVED_CAP ? (
              <p className="text-xs leading-5 text-muted-foreground">
                At the {SAVED_CAP} saved lookup limit. Saving another drops the oldest.
              </p>
            ) : null}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

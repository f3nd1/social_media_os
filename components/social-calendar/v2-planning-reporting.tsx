"use client";

// New v2 tabs for Planning and Reporting: Content Pillars, Campaign Reports,
// Platform Reports, Executive Dashboard, and Learnings. Every figure is
// aggregated from data already in the workspace (brief, calendar, campaigns,
// KPI records, performance results). Empty states say so honestly instead of
// showing placeholder numbers.

import {
  BarChart3,
  BookOpenText,
  ClipboardCheck,
  Gauge,
  ListChecks,
  Plus,
  Trash2,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  analyzePerformance,
  isCampaignApproved,
  platforms,
  type ContentPillar,
  type MarketingWorkspaceData,
} from "@/lib/social-calendar-data";

const numberFormat = new Intl.NumberFormat("en-GB");
const fmt = (value: number) => numberFormat.format(value);

function ViewHeader({
  icon: Icon,
  title,
  description,
}: {
  icon: typeof Gauge;
  title: string;
  description: string;
}) {
  return (
    <CardHeader>
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-secondary text-secondary-foreground">
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <CardTitle>{title}</CardTitle>
          <CardDescription className="mt-2 leading-6">{description}</CardDescription>
        </div>
      </div>
    </CardHeader>
  );
}

export function ContentPillarsView({
  data,
  onContentPillarsChange,
}: {
  data: MarketingWorkspaceData;
  onContentPillarsChange: (contentPillars: ContentPillar[]) => void;
}) {
  const pillars = data.ucc.contentPillars;
  const pillarNames = pillars.map((pillar) => pillar.name);
  const pillarsInUse = Array.from(
    new Set(data.calendar.map((item) => item.contentPillar).filter(Boolean)),
  );
  const extraPillarNames = pillarsInUse.filter(
    (name) => !pillarNames.includes(name),
  );

  function addPillar() {
    onContentPillarsChange([
      ...pillars,
      {
        id: `pillar-${Date.now()}-${Math.random().toString(16).slice(2)}`,
        name: "New pillar",
        description: "",
      },
    ]);
  }

  function updatePillar(id: string, patch: Partial<Omit<ContentPillar, "id">>) {
    onContentPillarsChange(
      pillars.map((pillar) => (pillar.id === id ? { ...pillar, ...patch } : pillar)),
    );
  }

  function deletePillar(pillar: ContentPillar) {
    if (typeof window !== "undefined") {
      const confirmed = window.confirm(
        `Delete the pillar "${pillar.name}"? Calendar items already using this pillar keep the name as text; they are not changed or deleted.`,
      );

      if (!confirmed) {
        return;
      }
    }

    onContentPillarsChange(pillars.filter((row) => row.id !== pillar.id));
  }

  return (
    <section className="space-y-4">
      <Card>
        <CardHeader className="flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-secondary text-secondary-foreground">
              <ListChecks className="h-5 w-5" />
            </div>
            <div>
              <CardTitle>Content Pillars</CardTitle>
              <CardDescription className="mt-2 leading-6">
                The recurring themes the calendar and copywriting AI actually
                use. Add, edit, or delete pillars here; the Strategy Brief and
                every downstream prompt follow this same list.
              </CardDescription>
            </div>
          </div>
          <Button onClick={addPillar} size="sm" type="button" variant="outline">
            <Plus className="h-4 w-4" />
            Add pillar
          </Button>
        </CardHeader>
        <CardContent className="space-y-3">
          {pillars.length === 0 ? (
            <p className="text-sm leading-6 text-muted-foreground">
              No pillars yet. Add one above to get started.
            </p>
          ) : (
            <div className="grid gap-3 md:grid-cols-2">
              {pillars.map((pillar) => {
                const items = data.calendar.filter(
                  (item) => item.contentPillar === pillar.name,
                );
                const share =
                  data.calendar.length > 0
                    ? Math.round((items.length / data.calendar.length) * 100)
                    : 0;
                const pillarPlatforms = Array.from(
                  new Set(items.map((item) => item.platform)),
                );
                const campaigns = Array.from(
                  new Set(
                    items
                      .map(
                        (item) =>
                          data.ucc.campaigns.find(
                            (campaign) => campaign.id === item.campaignId,
                          )?.name,
                      )
                      .filter(Boolean),
                  ),
                ) as string[];

                return (
                  <div
                    className="space-y-3 rounded-lg border bg-muted/20 p-4"
                    key={pillar.id}
                  >
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <Input
                        className="max-w-[220px] font-semibold"
                        onChange={(event) =>
                          updatePillar(pillar.id, { name: event.target.value })
                        }
                        value={pillar.name}
                      />
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">
                          {items.length} item{items.length === 1 ? "" : "s"} ({share}%)
                        </Badge>
                        <Button
                          onClick={() => deletePillar(pillar)}
                          size="sm"
                          type="button"
                          variant="outline"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    <Textarea
                      className="text-xs"
                      onChange={(event) =>
                        updatePillar(pillar.id, { description: event.target.value })
                      }
                      placeholder="Description: what this pillar covers and why it matters."
                      value={pillar.description}
                    />
                    <p className="text-xs leading-5 text-muted-foreground">
                      {items.length === 0
                        ? "No calendar items use this pillar yet."
                        : `Platforms: ${pillarPlatforms.join(", ")}.` +
                          (campaigns.length > 0
                            ? ` Campaigns: ${campaigns.join(", ")}.`
                            : " Not linked to a campaign yet.")}
                    </p>
                  </div>
                );
              })}
            </div>
          )}
          {extraPillarNames.length > 0 ? (
            <div className="rounded-lg border border-warning-border bg-warning p-3 text-xs leading-5 text-warning-foreground">
              Also used on the calendar but not in this list: {extraPillarNames.join(", ")}.
              Add a pillar above with the same name to bring it under management.
            </div>
          ) : null}
        </CardContent>
      </Card>
    </section>
  );
}

export function CampaignReportsView({ data }: { data: MarketingWorkspaceData }) {
  return (
    <section className="space-y-4">
      <Card>
        <ViewHeader
          icon={ClipboardCheck}
          title="Campaign Reports"
          description="One report per campaign: budget against spend, and KPI targets against the results recorded in the KPI Tracker."
        />
        <CardContent className="space-y-3">
          {data.ucc.campaigns.length === 0 ? (
            <p className="text-sm leading-6 text-muted-foreground">
              No campaigns yet. Create one in Planning and its report appears
              here as results are recorded.
            </p>
          ) : (
            data.ucc.campaigns.map((campaign) => {
              const records = data.ucc.kpiRecords.filter(
                (row) => row.campaignId === campaign.id,
              );
              const leads = records.reduce((sum, row) => sum + row.leads, 0);
              const applications = records.reduce(
                (sum, row) => sum + row.applications,
                0,
              );
              const enrolments = records.reduce(
                (sum, row) => sum + row.enrolments,
                0,
              );
              const spend = campaign.actualResults.spend;

              return (
                <div className="rounded-lg border bg-muted/20 p-4" key={campaign.id}>
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-semibold">{campaign.name}</p>
                      <p className="mt-1 text-xs leading-5 text-muted-foreground">
                        {campaign.objective}
                      </p>
                    </div>
                    <Badge
                      variant={isCampaignApproved(campaign) ? "success" : "warning"}
                    >
                      {isCampaignApproved(campaign) ? "Approved" : "Draft"}
                    </Badge>
                  </div>
                  <div className="mt-3 grid gap-2 text-xs leading-5 sm:grid-cols-2 lg:grid-cols-4">
                    <p>
                      <span className="font-medium">Budget:</span> {fmt(spend)} spent
                      of {fmt(campaign.budget)}
                    </p>
                    <p>
                      <span className="font-medium">Leads:</span> {fmt(leads)} of{" "}
                      {fmt(campaign.kpiTarget.leads)} target
                    </p>
                    <p>
                      <span className="font-medium">Applications:</span>{" "}
                      {fmt(applications)} of {fmt(campaign.kpiTarget.applications)}
                    </p>
                    <p>
                      <span className="font-medium">Enrolments:</span>{" "}
                      {fmt(enrolments)} of {fmt(campaign.kpiTarget.enrolments)}
                    </p>
                  </div>
                  {records.length === 0 ? (
                    <p className="mt-2 text-xs leading-5 text-muted-foreground">
                      No KPI results recorded for this campaign yet.
                    </p>
                  ) : null}
                </div>
              );
            })
          )}
        </CardContent>
      </Card>
    </section>
  );
}

export function PlatformReportsView({ data }: { data: MarketingWorkspaceData }) {
  const analytics = analyzePerformance(data);

  return (
    <section className="space-y-4">
      <Card>
        <ViewHeader
          icon={Gauge}
          title="Platform Reports"
          description="One report per platform, aggregated from recorded post results and the platform audits. Platforms with no data yet say so."
        />
        <CardContent className="grid gap-3 md:grid-cols-2">
          {platforms.map((platform) => {
            const rows = analytics.rows.filter(
              (row) => row.item.platform === platform,
            );
            const audit = data.audits.find((row) => row.platform === platform);
            const totals = rows.reduce(
              (sum, row) => ({
                impressions: sum.impressions + row.result.impressions,
                reach: sum.reach + row.result.reach,
                engagement: sum.engagement + row.result.engagement,
                clicks: sum.clicks + row.result.clicks,
              }),
              { impressions: 0, reach: 0, engagement: 0, clicks: 0 },
            );

            return (
              <div className="rounded-lg border bg-muted/20 p-4" key={platform}>
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-semibold">{platform}</p>
                  <Badge variant={rows.length > 0 ? "info" : "secondary"}>
                    {rows.length} post{rows.length === 1 ? "" : "s"} with results
                  </Badge>
                </div>
                {rows.length > 0 ? (
                  <div className="mt-2 grid grid-cols-2 gap-1 text-xs leading-5 text-muted-foreground">
                    <p>Impressions: {fmt(totals.impressions)}</p>
                    <p>Reach: {fmt(totals.reach)}</p>
                    <p>Engagement: {fmt(totals.engagement)}</p>
                    <p>Clicks: {fmt(totals.clicks)}</p>
                  </div>
                ) : (
                  <p className="mt-2 text-xs leading-5 text-muted-foreground">
                    No recorded post results on this platform yet.
                  </p>
                )}
                {audit ? (
                  <p className="mt-2 text-xs leading-5 text-muted-foreground">
                    Audit baseline: {fmt(audit.followers)} followers,{" "}
                    {audit.engagementRate}% engagement rate.
                  </p>
                ) : null}
              </div>
            );
          })}
        </CardContent>
      </Card>
    </section>
  );
}

export function ExecutiveDashboardView({
  data,
  health,
}: {
  data: MarketingWorkspaceData;
  health: { score: number; parts: string[] };
}) {
  const analytics = analyzePerformance(data);
  const strongKpis = data.ucc.kpiRecords.filter(
    (row) => row.status === "on track" || row.status === "exceeded target",
  );
  const weakKpis = data.ucc.kpiRecords.filter(
    (row) => row.status === "behind target" || row.status === "needs attention",
  );
  const awaitingCampaigns = data.ucc.campaigns.filter(
    (campaign) => !isCampaignApproved(campaign),
  ).length;
  const itemsInReview = data.calendar.filter((item) =>
    ["drafting", "review", "revision"].includes(item.status),
  ).length;

  const wins = [
    ...strongKpis.map((row) => `${row.channel} is ${row.status} for ${fmt(row.leads)} leads`),
    ...(analytics.topPlatform
      ? [`Best performing platform so far: ${analytics.topPlatform.label}`]
      : []),
    ...(analytics.topPillar
      ? [`Strongest content pillar: ${analytics.topPillar.label}`]
      : []),
  ].slice(0, 5);
  const risks = [
    ...weakKpis.map((row) => `${row.channel}: ${row.recommendation}`),
    ...(itemsInReview > 0
      ? [`${itemsInReview} content items sitting in draft, review, or revision`]
      : []),
    ...(awaitingCampaigns > 0
      ? [`${awaitingCampaigns} campaigns not yet approved`]
      : []),
  ].slice(0, 5);
  const nextActions = [
    ...(!data.brief.approved ? ["Approve the monthly strategy brief"] : []),
    ...(awaitingCampaigns > 0 ? ["Review and approve waiting campaigns"] : []),
    ...(itemsInReview > 0 ? ["Clear the production review queue"] : []),
    ...(data.performanceResults.length === 0
      ? ["Record post results so reports rest on outcomes"]
      : []),
  ].slice(0, 4);

  return (
    <section className="space-y-4">
      <Card>
        <ViewHeader
          icon={BarChart3}
          title="Executive Dashboard"
          description="The leadership summary: overall health, what is winning, what is at risk, and the next decisions. Every line is derived from workspace data."
        />
        <CardContent className="space-y-4">
          <div className="rounded-lg border bg-muted/20 p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Marketing health
            </p>
            <p className="mt-1 text-3xl font-semibold">{health.score}%</p>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">
              Computed from {health.parts.join(", ")}.
            </p>
          </div>
          <div className="grid gap-3 md:grid-cols-3">
            <div className="rounded-lg border p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-success-foreground">
                Key wins
              </p>
              {wins.length > 0 ? (
                <ul className="mt-2 space-y-1 text-xs leading-5">
                  {wins.map((win) => (
                    <li key={win}>{win}</li>
                  ))}
                </ul>
              ) : (
                <p className="mt-2 text-xs leading-5 text-muted-foreground">
                  No recorded wins yet; add KPI and post results.
                </p>
              )}
            </div>
            <div className="rounded-lg border p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-warning-foreground">
                Risks
              </p>
              {risks.length > 0 ? (
                <ul className="mt-2 space-y-1 text-xs leading-5">
                  {risks.map((risk) => (
                    <li key={risk}>{risk}</li>
                  ))}
                </ul>
              ) : (
                <p className="mt-2 text-xs leading-5 text-muted-foreground">
                  Nothing flagged right now.
                </p>
              )}
            </div>
            <div className="rounded-lg border p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Next actions
              </p>
              {nextActions.length > 0 ? (
                <ul className="mt-2 space-y-1 text-xs leading-5">
                  {nextActions.map((action) => (
                    <li key={action}>{action}</li>
                  ))}
                </ul>
              ) : (
                <p className="mt-2 text-xs leading-5 text-muted-foreground">
                  All caught up: strategy approved, campaigns approved, queue
                  clear.
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </section>
  );
}

export function LearningsView({
  acceptedActions,
  data,
}: {
  acceptedActions: string[];
  data: MarketingWorkspaceData;
}) {
  const analytics = analyzePerformance(data);
  const line = (row: (typeof analytics.rows)[number]) =>
    `${row.item.contentTopic} (${row.item.platform}, learning score ${Math.round(row.efficiency * 1000) / 10}%)`;

  return (
    <section className="space-y-4">
      <Card>
        <ViewHeader
          icon={BookOpenText}
          title="Learnings"
          description="What worked, what did not, and the suggestions you accepted. Accepted research signals and insights genuinely feed the AI's context for the next strategy and campaigns."
        />
        <CardContent className="grid gap-3 md:grid-cols-3">
          <div className="rounded-lg border p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-success-foreground">
              What worked (repeat)
            </p>
            {analytics.repeat.length > 0 ? (
              <ul className="mt-2 space-y-1 text-xs leading-5">
                {analytics.repeat.map((row) => (
                  <li key={row.item.id}>{line(row)}</li>
                ))}
              </ul>
            ) : (
              <p className="mt-2 text-xs leading-5 text-muted-foreground">
                No high performers identified yet; record post results first.
              </p>
            )}
          </div>
          <div className="rounded-lg border p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-warning-foreground">
              What underperformed (improve or stop)
            </p>
            {analytics.improve.length + analytics.stop.length > 0 ? (
              <ul className="mt-2 space-y-1 text-xs leading-5">
                {[...analytics.improve, ...analytics.stop].map((row) => (
                  <li key={row.item.id}>{line(row)}</li>
                ))}
              </ul>
            ) : (
              <p className="mt-2 text-xs leading-5 text-muted-foreground">
                Nothing flagged yet.
              </p>
            )}
          </div>
          <div className="rounded-lg border p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Accepted suggestions in force
            </p>
            {acceptedActions.length > 0 ? (
              <ul className="mt-2 space-y-1 text-xs leading-5">
                {acceptedActions.slice(0, 6).map((action) => (
                  <li key={action}>{action}</li>
                ))}
              </ul>
            ) : (
              <p className="mt-2 text-xs leading-5 text-muted-foreground">
                Nothing accepted yet. Accept audit, competitor, trend, or
                listening suggestions and they carry into future AI drafts.
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </section>
  );
}

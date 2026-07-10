"use client";

// New v2 tabs for Foundation and Insights: Team and Seasonal Intelligence.
// Both are read-only composition views over data that already exists in the
// workspace (roles and their real workloads, and the Singapore marketing
// calendar). Nothing here invents numbers or duplicates another module's
// workflow. Platform Intelligence lives in social-calendar-app.tsx alongside
// its sibling AI-draft-then-approve views (Social Audit, Competitors).

import { CalendarDays, UsersRound } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  roles,
  type MarketingWorkspaceData,
  type Role,
} from "@/lib/social-calendar-data";
import {
  SG_MARKETING_MOMENTS,
  sgMomentNudges,
} from "@/lib/sg-marketing-moments";

const ROLE_BRIEF: Record<Role, string> = {
  "marketing manager":
    "Full strategic visibility: every module, every approval, and the final say on strategies, campaigns, and content.",
  copywriter:
    "Captions, scripts, and copy tasks on the Production Queue, with the platform playbook voice for each item.",
  "graphic designer":
    "Design tasks on the Production Queue: visual briefs, formats, and hashtags for each assigned item.",
  "video editor":
    "Video tasks on the Production Queue: scripts, shot notes, and hand-offs for filming and editing.",
};

export function TeamView({ data }: { data: MarketingWorkspaceData }) {
  const openByRole = (role: Role) =>
    data.calendar.filter(
      (item) => item.assignedRole === role && item.status !== "posted",
    ).length;

  return (
    <section className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-secondary text-secondary-foreground">
              <UsersRound className="h-5 w-5" />
            </div>
            <div>
              <CardTitle>Team</CardTitle>
              <CardDescription className="mt-2 leading-6">
                The four working roles and what each one sees. Workload counts
                are live from the production calendar. Use the Role view
                switcher in the sidebar to see the app as each role does.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-2">
          {roles.map((role) => {
            const open = openByRole(role);

            return (
              <div className="rounded-lg border bg-muted/20 p-4" key={role}>
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-semibold capitalize">{role}</p>
                  <Badge variant={open > 0 ? "info" : "secondary"}>
                    {open} open item{open === 1 ? "" : "s"}
                  </Badge>
                </div>
                <p className="mt-2 text-xs leading-5 text-muted-foreground">
                  {ROLE_BRIEF[role]}
                </p>
              </div>
            );
          })}
        </CardContent>
      </Card>
      <p className="text-xs leading-5 text-muted-foreground">
        Sign-in and per-person accounts do not exist yet; roles are working
        views, not access control. The approver name on decisions is still
        free text.
      </p>
    </section>
  );
}

export function SeasonalIntelligenceView() {
  const nudges = sgMomentNudges(new Date());
  const openOrSoon = new Set(nudges.map((nudge) => nudge.moment.id));
  const monthName = (month: number) =>
    new Intl.DateTimeFormat("en-GB", { month: "short" }).format(
      new Date(2026, month - 1, 1),
    );

  return (
    <section className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-secondary text-secondary-foreground">
              <CalendarDays className="h-5 w-5" />
            </div>
            <div>
              <CardTitle>Seasonal Intelligence</CardTitle>
              <CardDescription className="mt-2 leading-6">
                The Singapore marketing calendar that times AI campaign and
                calendar suggestions: intakes, results season, festivals,
                holidays, and shopping moments. Day counts are computed from
                today, never invented.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {nudges.length > 0 ? (
            <div className="rounded-lg border border-info-border bg-info p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-info-foreground">
                Open now or opening soon
              </p>
              <ul className="mt-1 space-y-1">
                {nudges.map((nudge) => (
                  <li className="text-sm leading-6 text-info-foreground" key={nudge.moment.id}>
                    {nudge.message} {nudge.moment.relevance}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
          <div className="grid gap-3 md:grid-cols-2">
            {SG_MARKETING_MOMENTS.map((moment) => (
              <div className="rounded-lg border bg-muted/20 p-4" key={moment.id}>
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-semibold">{moment.name}</p>
                  <Badge
                    variant={openOrSoon.has(moment.id) ? "success" : "outline"}
                  >
                    {monthName(moment.startMonth)}
                    {moment.startMonth === moment.endMonth
                      ? ""
                      : ` to ${monthName(moment.endMonth)}`}
                  </Badge>
                </div>
                <p className="mt-2 text-xs leading-5 text-muted-foreground">
                  {moment.relevance}
                </p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </section>
  );
}

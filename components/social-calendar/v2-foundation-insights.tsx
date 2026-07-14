"use client";

// The v2 Team tab: a read-only composition view over data that already
// exists in the workspace (roles and their real workloads). Nothing here
// invents numbers or duplicates another module's workflow. Platform
// Intelligence lives in social-calendar-app.tsx alongside its sibling
// AI-draft-then-approve views (Social Audit, Competitors).

import { UsersRound } from "lucide-react";

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

// The Signal Board (Task 4, point 2). One read-only view of every finding a
// manager has already accepted, whichever module produced it, plus the honest
// answer to "where does this actually go next?".
//
// Pure projection, no network and no state of its own: it reads the same
// collections the modules already own. Accepting or dismissing still happens
// on the module screen, so this board can never become a second approval
// path. That matters, because the approvals log is derived by diffing the
// workspace and a parallel decision surface here would be a second place to
// forget the audit trail.

import type { MarketingWorkspaceData } from "@/lib/social-calendar-data";

export type SignalModule =
  | "Platform Audit"
  | "Competitor Intelligence"
  | "Trend Radar"
  | "Social Listening";

// Where an accepted finding of each kind genuinely reaches. Every entry below
// was read off the call sites in social-calendar-app.tsx, not assumed from the
// module name, because this is exactly the claim a manager would rely on:
//
//   auditInsights       -> campaign-ai (acceptedAuditInsights), report-ai
//                          (acceptedInsights, via buildReportContext)
//   competitorInsights  -> brief-ai, campaign-ai, platform-playbook-ai
//   trendInsights       -> brief-ai, campaign-ai, calendar-ai,
//                          platform-playbook-ai (all four via
//                          acceptedTrendLines)
//   listeningResults    -> brief-ai, campaign-ai, platform-playbook-ai
//
// "Available to" rather than "used by": acceptance puts the finding in the
// context those generators read the next time they run. It does not mean any
// of them has run.
export const SIGNAL_REACH: Record<SignalModule, string[]> = {
  "Platform Audit": ["Campaigns", "Reports"],
  "Competitor Intelligence": ["Strategy Brief", "Campaigns", "Platform Intelligence"],
  "Trend Radar": ["Strategy Brief", "Campaigns", "Calendar", "Platform Intelligence"],
  "Social Listening": ["Strategy Brief", "Campaigns", "Platform Intelligence"],
};

// The screen that owns each kind of finding, so the board can send the user
// back to the place where it can be dismissed or regenerated. These are ViewId
// values, declared as their own union rather than imported: ViewId lives in the
// app component, and a pure lib should not depend on the UI. The union is still
// checked against the real ViewId, because the board passes it to setActiveView
// and a typo here fails the build there.
export type SignalView = "objectives" | "competitors" | "platform" | "listening";

export const SIGNAL_HOME_VIEW: Record<SignalModule, SignalView> = {
  "Platform Audit": "objectives",
  "Competitor Intelligence": "competitors",
  "Trend Radar": "platform",
  "Social Listening": "listening",
};

// Prose form of the reach list, shared with the approvals log so the two
// surfaces cannot drift apart: "A, B and C".
export function reachSentence(module: SignalModule): string {
  const reaches = SIGNAL_REACH[module];

  if (reaches.length < 2) {
    return reaches[0] ?? "";
  }

  return `${reaches.slice(0, -1).join(", ")} and ${reaches[reaches.length - 1]}`;
}

export type Signal = {
  id: string;
  module: SignalModule;
  view: SignalView;
  title: string;
  detail: string;
  // When the AI produced it. Deliberately NOT called "accepted at": no
  // collection records the time of the human decision, and inventing one from
  // the generation time would be a fabricated audit trail. The approvals log
  // is where the real decision time and decider live.
  generatedAt: string;
  model: string;
  reaches: string[];
};

function signal(
  module: SignalModule,
  row: { id: string; generatedAt: string; model: string },
  title: string,
  detail: string,
): Signal {
  return {
    id: `${SIGNAL_HOME_VIEW[module]}-${row.id}`,
    module,
    view: SIGNAL_HOME_VIEW[module],
    title,
    detail,
    generatedAt: row.generatedAt,
    model: row.model,
    reaches: SIGNAL_REACH[module],
  };
}

export function collectSignals(data: MarketingWorkspaceData): Signal[] {
  const signals: Signal[] = [
    ...(data.auditInsights ?? [])
      .filter((row) => row.status === "accepted")
      .map((row) => signal("Platform Audit", row, row.platform, row.recommendation)),

    ...(data.competitorInsights ?? [])
      .filter((row) => row.status === "accepted")
      .map((row) =>
        signal(
          "Competitor Intelligence",
          row,
          `${row.competitorName} (${row.kind})`,
          row.insight,
        ),
      ),

    ...(data.trendInsights ?? [])
      .filter((row) => row.status === "accepted")
      .map((row) => signal("Trend Radar", row, row.title, row.whyItMatters)),

    // Listening rows start at "new", not "draft", and status is optional on
    // older saves. Only an explicit "accepted" counts, so an old save never
    // silently promotes itself onto the board.
    ...(data.listeningResults ?? [])
      .filter((row) => row.status === "accepted")
      .map((row) => signal("Social Listening", row, row.topic, row.insight)),
  ];

  // Newest first. An unparseable or missing generatedAt sorts last rather than
  // throwing off the whole order.
  return signals.sort((a, b) => {
    const left = Date.parse(a.generatedAt);
    const right = Date.parse(b.generatedAt);

    if (Number.isNaN(left) && Number.isNaN(right)) {
      return 0;
    }

    if (Number.isNaN(left)) {
      return 1;
    }

    if (Number.isNaN(right)) {
      return -1;
    }

    return right - left;
  });
}

// Count of findings still waiting on a human decision per module, so the board
// can point at the screens that need attention without duplicating their UI.
export function pendingByModule(
  data: MarketingWorkspaceData,
): Array<{ module: SignalModule; count: number }> {
  return [
    {
      module: "Platform Audit" as const,
      count: (data.auditInsights ?? []).filter((row) => row.status === "draft").length,
    },
    {
      module: "Competitor Intelligence" as const,
      count: (data.competitorInsights ?? []).filter((row) => row.status === "draft")
        .length,
    },
    {
      module: "Trend Radar" as const,
      count: (data.trendInsights ?? []).filter((row) => row.status === "draft").length,
    },
    {
      module: "Social Listening" as const,
      count: (data.listeningResults ?? []).filter(
        (row) => (row.status ?? "new") === "new",
      ).length,
    },
  ].filter((row) => row.count > 0);
}

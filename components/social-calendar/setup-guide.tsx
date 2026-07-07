"use client";

// The interactive setup guide. One resumable guide that walks a non-technical
// owner from an empty workspace to a working content calendar, one step at a
// time. Part A connects the technical services (Supabase, OpenAI, analytics)
// with real live tests, and Part B captures the owner's own data by handing
// off to the existing screens. A step only turns green once its connection
// genuinely responds, so nobody finishes with a broken setup.
//
// Progress lives in the workspace (data.setupGuide), so the guide is
// resumable and every green tick survives a reload.

import { useState } from "react";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Check,
  Database,
  GraduationCap,
  ListChecks,
  Plug,
  ShieldCheck,
  Sparkles,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { apiUrl } from "@/lib/base-path";
import type {
  AiIntegrationSettings,
  BrandProfile,
  MarketingWorkspaceData,
  PlatformConnection,
  SetupGuideProgress,
  SocialAudit,
  StrategyBrief,
  UccStrategyData,
} from "@/lib/social-calendar-data";
import type { OpenAiUsage } from "@/lib/openai-shared";
import {
  resolveSupabaseConfig,
  saveSupabaseConfig,
} from "@/lib/supabase-client";
import type { WorkspaceSync } from "@/components/social-calendar/use-workspace-sync";
import {
  AudienceStepBody,
  AuditStepBody,
  BrandStepBody,
  BriefStepBody,
  CourseStepBody,
} from "@/components/social-calendar/setup-guide-data-steps";

type SetupNavView =
  | "dashboard"
  | "brand"
  | "settings"
  | "courses"
  | "objectives"
  | "brief"
  | "calendar";

type SetupGuideProps = {
  data: MarketingWorkspaceData;
  sync: WorkspaceSync;
  // When true the guide is the whole page (dedicated full-screen wizard), so
  // it uses a larger progress bar and an explicit Exit guide control.
  fullScreen?: boolean;
  onPatch: (patch: Partial<SetupGuideProgress>) => void;
  onExit: () => void;
  onFinish: () => void;
  onLoadSample: () => void;
  onNavigate: (view: SetupNavView) => void;
  onAiIntegrationChange: (next: AiIntegrationSettings) => void;
  onConnectionsChange: (next: PlatformConnection[]) => void;
  onUpdateBrand: (patch: Partial<BrandProfile>) => void;
  onUccChange: (next: UccStrategyData) => void;
  onAuditsChange: (next: SocialAudit[]) => void;
  onBriefChange: (next: StrategyBrief) => void;
  onRecordUsage: (module: string, model: string, usage: OpenAiUsage) => void;
};

const STEP_KEYS = [
  "welcome",
  "supabase",
  "openai",
  "analytics",
  "compliance",
  "brand",
  "course",
  "audience",
  "audit",
  "brief",
] as const;

type StepKey = (typeof STEP_KEYS)[number];

const TOTAL_STEPS = STEP_KEYS.length;
// Part A "Connect" is steps 1 to 4 (welcome is an unnumbered intro); Part B
// "Your data" is steps 5 to 9. The two counts are shown separately.
const CONNECT_STEPS = 4;
const DATA_STEPS = 5;

// Pick a sensible pair of models from whatever the key can access: a cheaper
// one for light tasks and a stronger one for analysis. Mirrors the Settings
// panel's selection so the guide suggests the same thing.
function suggestModels(models: string[]) {
  const excluded =
    /embed|whisper|tts|audio|dall|image|moderation|search|realtime|transcribe|speech/i;
  const candidates = models.filter(
    (model) => /gpt|^o\d|reason|chat/i.test(model) && !excluded.test(model),
  );
  const pool = candidates.length > 0 ? candidates : models;
  const cheap = /mini|nano|small|lite|flash/i;
  const utility = pool.find((model) => cheap.test(model)) ?? pool[0] ?? "";
  const analysis =
    pool.find((model) => model !== utility && !cheap.test(model)) ??
    pool.find((model) => model !== utility) ??
    pool[0] ??
    "";
  return { analysis, utility };
}

type TestState = "idle" | "testing" | "ok" | "error";

export function SetupGuide({
  data,
  sync,
  fullScreen = false,
  onPatch,
  onExit,
  onFinish,
  onLoadSample,
  onNavigate,
  onAiIntegrationChange,
  onConnectionsChange,
  onUpdateBrand,
  onUccChange,
  onAuditsChange,
  onBriefChange,
  onRecordUsage,
}: SetupGuideProps) {
  const guide: SetupGuideProgress =
    data.setupGuide ?? { active: true, completed: false, stepIndex: 0, skipped: [] };
  const step = Math.min(Math.max(guide.stepIndex, 0), TOTAL_STEPS);
  const stepKey: StepKey | "finish" =
    step >= TOTAL_STEPS ? "finish" : STEP_KEYS[step];

  // Local input state for the technical steps. Prefilled from what is already
  // saved so a resume shows the owner's earlier entries.
  const savedSupabase = resolveSupabaseConfig().config;
  const existingMetricool = data.connections.find(
    (connection) => connection.source === "metricool",
  );
  const [sbUrl, setSbUrl] = useState(savedSupabase?.url ?? "");
  const [sbKey, setSbKey] = useState(savedSupabase?.anonKey ?? "");
  const [sbState, setSbState] = useState<TestState>("idle");
  const [sbMsg, setSbMsg] = useState("");

  const [oaKey, setOaKey] = useState(data.aiIntegration.apiKey ?? "");
  const [oaState, setOaState] = useState<TestState>("idle");
  const [oaMsg, setOaMsg] = useState("");

  const [mcToken, setMcToken] = useState(existingMetricool?.credentials.apiToken ?? "");
  const [mcUser, setMcUser] = useState(existingMetricool?.credentials.userId ?? "");
  const [mcBlog, setMcBlog] = useState(existingMetricool?.credentials.blogId ?? "");
  const [mcState, setMcState] = useState<TestState>("idle");
  const [mcMsg, setMcMsg] = useState("");

  function isDone(key: StepKey): boolean {
    switch (key) {
      case "welcome":
        return guide.welcomeChoice === "own";
      case "supabase":
        return Boolean(guide.supabaseTested);
      case "openai":
        return Boolean(guide.openAiTested);
      case "analytics":
        return Boolean(guide.analyticsChoice);
      case "compliance":
        return Boolean(guide.complianceAcknowledged);
      case "brand":
        return data.brand.brandName.trim().length > 0;
      case "course":
        return data.ucc.courses.some((course) => course.status !== "archived");
      case "audience":
        return data.ucc.audiences.length > 0;
      case "audit":
        return data.audits.length > 0;
      case "brief":
        return data.brief.approved;
      default:
        return false;
    }
  }

  function goTo(nextStep: number) {
    onPatch({ stepIndex: Math.max(0, Math.min(nextStep, TOTAL_STEPS)) });
  }

  function skip(key: StepKey) {
    onPatch({
      skipped: guide.skipped.includes(key) ? guide.skipped : [...guide.skipped, key],
      stepIndex: Math.min(step + 1, TOTAL_STEPS),
    });
  }

  async function handleSupabaseTest() {
    if (!sbUrl.trim() || !sbKey.trim()) {
      setSbState("error");
      setSbMsg("Enter both the Project URL and the anon key first.");
      return;
    }

    setSbState("testing");
    setSbMsg("");
    const result = await sync.testConnection({
      url: sbUrl.trim(),
      anonKey: sbKey.trim(),
    });

    if (result.ok) {
      saveSupabaseConfig({ url: sbUrl.trim(), anonKey: sbKey.trim() });
      onPatch({ supabaseTested: true });
      setSbState("ok");
      setSbMsg(
        "Connected. The workspace_state table is reachable and your details are saved. Cloud sync becomes active the next time the app loads.",
      );
    } else {
      onPatch({ supabaseTested: false });
      setSbState("error");
      setSbMsg(result.error ?? "Connection failed.");
    }
  }

  async function handleOpenAiTest() {
    if (!oaKey.trim()) {
      setOaState("error");
      setOaMsg("Enter an OpenAI API key first.");
      return;
    }

    setOaState("testing");
    setOaMsg("");

    try {
      const response = await fetch(apiUrl("/api/openai/models"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ apiKey: oaKey.trim() }),
      });
      const result = (await response.json()) as
        | { ok: true; models: string[] }
        | { ok: false; error: string };

      if (!result.ok) {
        onPatch({ openAiTested: false });
        setOaState("error");
        setOaMsg(result.error);
        return;
      }

      const picks = suggestModels(result.models);
      onAiIntegrationChange({
        ...data.aiIntegration,
        apiKey: oaKey.trim(),
        enabled: true,
        analysisModel: data.aiIntegration.analysisModel || picks.analysis,
        utilityModel: data.aiIntegration.utilityModel || picks.utility,
      });
      onPatch({ openAiTested: true });
      setOaState("ok");
      setOaMsg(
        `Connected. Suggested "${data.aiIntegration.analysisModel || picks.analysis}" for deeper analysis and "${data.aiIntegration.utilityModel || picks.utility}" for lighter tasks. You can change these in Settings.`,
      );
    } catch (error) {
      onPatch({ openAiTested: false });
      setOaState("error");
      setOaMsg(error instanceof Error ? error.message : String(error));
    }
  }

  function upsertMetricool(mode: PlatformConnection["mode"], status: PlatformConnection["status"]) {
    const directCreds = {
      apiToken: mcToken.trim(),
      userId: mcUser.trim(),
      blogId: mcBlog.trim(),
    };
    const base: PlatformConnection = existingMetricool ?? {
      id: `connection-${Date.now()}`,
      source: "metricool",
      accountLabel: "UCC Metricool",
      mode,
      status,
      credentials: {},
      lastSyncAt: "",
      lastError: "",
      createdAt: new Date().toISOString(),
    };
    const next: PlatformConnection = {
      ...base,
      mode,
      status,
      credentials: mode === "direct API" ? directCreds : base.credentials,
      lastError: "",
    };
    onConnectionsChange(
      existingMetricool
        ? data.connections.map((connection) =>
            connection.id === existingMetricool.id ? next : connection,
          )
        : [...data.connections, next],
    );
  }

  async function handleMetricoolTest() {
    if (!mcToken.trim() || !mcUser.trim() || !mcBlog.trim()) {
      setMcState("error");
      setMcMsg("Enter the API token, User ID, and Blog ID first.");
      return;
    }

    setMcState("testing");
    setMcMsg("");

    try {
      const response = await fetch(apiUrl("/api/metricool"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "test",
          credentials: {
            apiToken: mcToken.trim(),
            userId: mcUser.trim(),
            blogId: mcBlog.trim(),
          },
        }),
      });
      const result = (await response.json()) as
        | { ok: true; accountLabel: string }
        | { ok: false; error: string; status?: number };

      if (!result.ok) {
        setMcState("error");
        setMcMsg(result.error);
        return;
      }

      upsertMetricool("direct API", "connected");
      onPatch({ analyticsChoice: "metricool" });
      setMcState("ok");
      setMcMsg(`Connected. Metricool account: ${result.accountLabel}.`);
    } catch (error) {
      setMcState("error");
      setMcMsg(error instanceof Error ? error.message : String(error));
    }
  }

  function chooseCsv() {
    upsertMetricool("CSV/PDF import", "manual import");
    onPatch({ analyticsChoice: "csv" });
    setMcState("ok");
    setMcMsg(
      "Set to use CSV import. You can upload a Metricool CSV export on the Connections panel in Settings any time.",
    );
  }

  // Two separate counts. Part A "Connect" is steps 1 to 4, Part B "Your data"
  // is steps 5 to 9, welcome is an intro and finish is the end.
  const inPartA = step >= 1 && step <= CONNECT_STEPS;
  const inPartB = step >= CONNECT_STEPS + 1 && step <= CONNECT_STEPS + DATA_STEPS;
  const partLabel =
    stepKey === "welcome"
      ? "Welcome"
      : inPartA
        ? "Connect"
        : inPartB
          ? "Your data"
          : "Done";
  const countLabel = inPartA
    ? `Connect: step ${step} of ${CONNECT_STEPS}`
    : inPartB
      ? `Your data: step ${step - CONNECT_STEPS} of ${DATA_STEPS}`
      : stepKey === "welcome"
        ? "Choose how to begin"
        : "All steps complete";
  const progressValue = inPartA
    ? (step / CONNECT_STEPS) * 100
    : inPartB
      ? ((step - CONNECT_STEPS) / DATA_STEPS) * 100
      : stepKey === "finish"
        ? 100
        : 0;

  return (
    <Card className="border-primary/40">
      <CardHeader className="gap-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <ListChecks className="h-5 w-5" />
            </span>
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Setup guide / {partLabel}
              </p>
              <p className="text-sm font-semibold">{countLabel}</p>
            </div>
          </div>
          <Button onClick={onExit} size="sm" type="button" variant="outline">
            {fullScreen ? "Exit guide" : "Save and close"}
          </Button>
        </div>
        <Progress className={fullScreen ? "h-3" : undefined} value={progressValue} />
      </CardHeader>
      <CardContent className="space-y-4">
        {stepKey === "brand" ? <PartASummary guide={guide} /> : null}

        {stepKey === "welcome" ? (
          <WelcomeStep
            onExploreSample={onLoadSample}
            onSetUpOwn={() => onPatch({ welcomeChoice: "own", stepIndex: 1 })}
          />
        ) : null}

        {stepKey === "supabase" ? (
          <StepShell
            done={isDone("supabase")}
            icon={Database}
            title="Connect your database (Supabase)"
            plain="Supabase saves your work to the cloud so it is safe and follows you between devices. This is optional: without it, everything still works and stays on this browser."
          >
            <div className="grid gap-3 md:grid-cols-2">
              <LabelledInput
                label="Project URL"
                onChange={setSbUrl}
                placeholder="https://your-project.supabase.co"
                value={sbUrl}
              />
              <LabelledInput
                label="Anon / publishable key"
                onChange={setSbKey}
                placeholder="Paste the anon public key"
                type="password"
                value={sbKey}
              />
            </div>
            <p className="rounded-md border border-warning-border bg-warning p-2 text-xs leading-5 text-warning-foreground">
              Use only the anon / publishable key, never the service_role key.
            </p>
            <TestRow
              busy={sbState === "testing"}
              label="Test connection"
              onTest={() => void handleSupabaseTest()}
            />
            <TestMessage state={sbState} message={sbMsg} />
          </StepShell>
        ) : null}

        {stepKey === "openai" ? (
          <StepShell
            done={isDone("openai")}
            icon={Sparkles}
            title="Connect AI (OpenAI)"
            plain="An OpenAI key lets the app draft strategy, copy, and calendars for you. The AI only ever suggests drafts; you always approve. Without a key, the app uses simpler offline drafts."
          >
            <LabelledInput
              label="OpenAI API key"
              onChange={setOaKey}
              placeholder="sk-..."
              type="password"
              value={oaKey}
            />
            <TestRow
              busy={oaState === "testing"}
              label="Test and suggest models"
              onTest={() => void handleOpenAiTest()}
            />
            <TestMessage state={oaState} message={oaMsg} />
          </StepShell>
        ) : null}

        {stepKey === "analytics" ? (
          <StepShell
            done={isDone("analytics")}
            icon={Plug}
            title="Connect analytics (Metricool)"
            plain="Metricool brings in your real social numbers. Test it to check the connection, or choose CSV import if you would rather upload exported files. This is optional."
          >
            <div className="grid gap-3 md:grid-cols-3">
              <LabelledInput label="API token" onChange={setMcToken} type="password" value={mcToken} />
              <LabelledInput label="User ID" onChange={setMcUser} value={mcUser} />
              <LabelledInput label="Blog ID" onChange={setMcBlog} value={mcBlog} />
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                disabled={mcState === "testing"}
                onClick={() => void handleMetricoolTest()}
                size="sm"
                type="button"
                variant="outline"
              >
                {mcState === "testing" ? "Testing" : "Test Metricool"}
              </Button>
              <Button onClick={chooseCsv} size="sm" type="button" variant="outline">
                I will use CSV instead
              </Button>
            </div>
            <TestMessage state={mcState} message={mcMsg} />
          </StepShell>
        ) : null}

        {stepKey === "compliance" ? (
          <ComplianceStep
            acknowledged={Boolean(guide.complianceAcknowledged)}
            onAcknowledge={() => onPatch({ complianceAcknowledged: true })}
          />
        ) : null}

        {stepKey === "brand" ? (
          <StepShell
            done={isDone("brand")}
            icon={GraduationCap}
            title="Set up your brand"
            plain="Your brand name and voice guide every piece of content the app makes. Fill them in here."
          >
            <BrandStepBody
              brand={data.brand}
              onOpenFull={() => onNavigate("brand")}
              onUpdateBrand={onUpdateBrand}
            />
          </StepShell>
        ) : null}

        {stepKey === "course" ? (
          <StepShell
            done={isDone("course")}
            icon={GraduationCap}
            title="Add your courses"
            plain="Courses are what you market. Add at least one here; you can add several."
          >
            <CourseStepBody
              onOpenFull={() => onNavigate("courses")}
              onUccChange={onUccChange}
              ucc={data.ucc}
            />
          </StepShell>
        ) : null}

        {stepKey === "audience" ? (
          <StepShell
            done={isDone("audience")}
            icon={GraduationCap}
            title="Add your audiences"
            plain="Audiences are who you market to, so the app can tailor the message. Add at least one."
          >
            <AudienceStepBody
              onOpenFull={() => onNavigate("courses")}
              onUccChange={onUccChange}
              ucc={data.ucc}
            />
          </StepShell>
        ) : null}

        {stepKey === "audit" ? (
          <StepShell
            done={isDone("audit")}
            icon={ShieldCheck}
            title="Record a quick audit"
            plain="An audit notes where a platform stands today so progress is measurable. Add one platform to start; refine the numbers later."
          >
            <AuditStepBody
              audits={data.audits}
              onAuditsChange={onAuditsChange}
              onOpenFull={() => onNavigate("objectives")}
            />
          </StepShell>
        ) : null}

        {stepKey === "brief" ? (
          <StepShell
            done={isDone("brief")}
            icon={ShieldCheck}
            title="Approve a strategy brief"
            plain="The brief turns everything above into a plan. Generate a draft or type one, then approve it to unlock the calendar."
          >
            <BriefStepBody
              data={data}
              onBriefChange={onBriefChange}
              onOpenFull={() => onNavigate("brief")}
              onRecordUsage={onRecordUsage}
            />
          </StepShell>
        ) : null}

        {stepKey === "finish" ? (
          <FinishStep
            guide={guide}
            onGenerate={onFinish}
            onClose={onExit}
          />
        ) : null}

        {stepKey !== "welcome" && stepKey !== "finish" ? (
          <StepFooter
            canAdvance={stepKey !== "compliance" || Boolean(guide.complianceAcknowledged)}
            canSkip={stepKey !== "compliance"}
            done={isDone(stepKey)}
            isLast={step === TOTAL_STEPS - 1}
            nextLabel={inPartB ? "Save and next" : "Next step"}
            onBack={step > 0 ? () => goTo(step - 1) : undefined}
            onNext={() => goTo(step + 1)}
            onSkip={() => skip(stepKey)}
          />
        ) : null}
      </CardContent>
    </Card>
  );
}

function WelcomeStep({
  onExploreSample,
  onSetUpOwn,
}: {
  onExploreSample: () => void;
  onSetUpOwn: () => void;
}) {
  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold">Welcome. Let us get you set up.</h3>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
          This short guide connects the app and captures your data, one step at
          a time. The AI only ever suggests drafts; you always review and
          approve, so you stay in control. Every step can be skipped, and you
          can close the guide and come back to it any time from Settings.
        </p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <button
          className="flex flex-col items-start gap-2 rounded-lg border p-4 text-left transition-colors hover:bg-muted/40"
          onClick={onExploreSample}
          type="button"
        >
          <span className="flex h-10 w-10 items-center justify-center rounded-md bg-secondary text-secondary-foreground">
            <Database className="h-5 w-5" />
          </span>
          <span className="text-sm font-semibold">Explore with sample data</span>
          <span className="text-xs leading-5 text-muted-foreground">
            Fill the app with a ready-made example so you can click around first.
            You can clear it later and run this guide again.
          </span>
        </button>
        <button
          className="flex flex-col items-start gap-2 rounded-lg border border-primary/50 p-4 text-left transition-colors hover:bg-primary/5"
          onClick={onSetUpOwn}
          type="button"
        >
          <span className="flex h-10 w-10 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <ListChecks className="h-5 w-5" />
          </span>
          <span className="text-sm font-semibold">Set up my own, step by step</span>
          <span className="text-xs leading-5 text-muted-foreground">
            Connect your services and enter your real United Ceres College data,
            guided all the way to a working content calendar.
          </span>
        </button>
      </div>
    </div>
  );
}

function ComplianceStep({
  acknowledged,
  onAcknowledge,
}: {
  acknowledged: boolean;
  onAcknowledge: () => void;
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <span className="flex h-9 w-9 items-center justify-center rounded-md bg-secondary text-secondary-foreground">
          <ShieldCheck className="h-5 w-5" />
        </span>
        <h3 className="text-base font-semibold">A quick word on compliance</h3>
      </div>
      <p className="text-sm leading-6 text-muted-foreground">
        This one is short but important, so it cannot be skipped. Marketing for
        education in Singapore must stay factual.
      </p>
      <ul className="list-disc space-y-1.5 pl-5 text-sm leading-6">
        <li>
          Never promise guaranteed jobs, employment, salary, visas, admission,
          rankings, or course outcomes.
        </li>
        <li>The AI only ever writes drafts. It never publishes or approves.</li>
        <li>A human always reviews and approves before anything counts.</li>
        <li>
          Social listening quotes are internal research evidence only, never
          marketing copy.
        </li>
      </ul>
      <p className="text-sm leading-6 text-muted-foreground">
        The app checks wording against these rules for you, but the final
        judgement is always yours.
      </p>
      <Button
        disabled={acknowledged}
        onClick={onAcknowledge}
        size="sm"
        type="button"
      >
        {acknowledged ? (
          <>
            <Check className="h-4 w-4" />
            Understood
          </>
        ) : (
          "I understand"
        )}
      </Button>
    </div>
  );
}

function PartASummary({ guide }: { guide: SetupGuideProgress }) {
  const rows: Array<{ label: string; state: "connected" | "skipped" | "attention"; detail: string }> = [
    {
      label: "Supabase",
      state: guide.supabaseTested
        ? "connected"
        : guide.skipped.includes("supabase")
          ? "skipped"
          : "attention",
      detail: guide.supabaseTested ? "Connected" : guide.skipped.includes("supabase") ? "Skipped" : "Needs attention",
    },
    {
      label: "OpenAI",
      state: guide.openAiTested
        ? "connected"
        : guide.skipped.includes("openai")
          ? "skipped"
          : "attention",
      detail: guide.openAiTested ? "Connected" : guide.skipped.includes("openai") ? "Skipped" : "Needs attention",
    },
    {
      label: "Analytics",
      state:
        guide.analyticsChoice === "metricool"
          ? "connected"
          : guide.analyticsChoice === "csv"
            ? "connected"
            : guide.skipped.includes("analytics")
              ? "skipped"
              : "attention",
      detail:
        guide.analyticsChoice === "metricool"
          ? "Connected (Metricool)"
          : guide.analyticsChoice === "csv"
            ? "Using CSV import"
            : guide.skipped.includes("analytics")
              ? "Skipped"
              : "Needs attention",
    },
    {
      label: "Compliance",
      state: guide.complianceAcknowledged ? "connected" : "attention",
      detail: guide.complianceAcknowledged ? "Read" : "Needs attention",
    },
  ];

  return (
    <div className="rounded-lg border bg-muted/20 p-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Part A summary
      </p>
      <div className="mt-2 grid gap-2 sm:grid-cols-2">
        {rows.map((row) => (
          <div className="flex items-center justify-between gap-2 text-sm" key={row.label}>
            <span className="font-medium">{row.label}</span>
            <Badge
              variant={
                row.state === "connected"
                  ? "success"
                  : row.state === "skipped"
                    ? "secondary"
                    : "warning"
              }
            >
              {row.detail}
            </Badge>
          </div>
        ))}
      </div>
    </div>
  );
}

function FinishStep({
  guide,
  onClose,
  onGenerate,
}: {
  guide: SetupGuideProgress;
  onClose: () => void;
  onGenerate: () => void;
}) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <span className="flex h-10 w-10 items-center justify-center rounded-md bg-success text-success-foreground">
          <Check className="h-5 w-5" />
        </span>
        <div>
          <h3 className="text-lg font-semibold">You are ready to go</h3>
          <p className="text-sm leading-6 text-muted-foreground">
            {guide.completed
              ? "You have finished the guide before. Run it again any time from Settings."
              : "Everything is set up or skipped. The next thing is to generate your first content calendar."}
          </p>
        </div>
      </div>
      <PartASummary guide={guide} />
      <div className="flex flex-wrap gap-2">
        <Button onClick={onGenerate} type="button">
          Generate my first content calendar
        </Button>
        <Button onClick={onClose} size="sm" type="button" variant="outline">
          Close guide
        </Button>
      </div>
    </div>
  );
}

function StepShell({
  children,
  done,
  icon: Icon,
  plain,
  title,
}: {
  children: React.ReactNode;
  done: boolean;
  icon: typeof Database;
  plain: string;
  title: string;
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-2">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-secondary text-secondary-foreground">
            <Icon className="h-5 w-5" />
          </span>
          <div>
            <h3 className="text-base font-semibold">{title}</h3>
            <p className="mt-1 max-w-2xl text-sm leading-6 text-muted-foreground">
              {plain}
            </p>
          </div>
        </div>
        <DoneBadge done={done} />
      </div>
      {children}
    </div>
  );
}

function DoneBadge({ done }: { done: boolean }) {
  return done ? (
    <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-success-border bg-success px-2 py-0.5 text-xs font-medium text-success-foreground">
      <Check className="h-3.5 w-3.5" />
      Done
    </span>
  ) : (
    <span className="inline-flex shrink-0 items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium text-muted-foreground">
      Not done yet
    </span>
  );
}

function LabelledInput({
  label,
  onChange,
  placeholder,
  type,
  value,
}: {
  label: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
  value: string;
}) {
  return (
    <label className="block space-y-1.5">
      <span className="text-sm font-medium text-foreground">{label}</span>
      <Input
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        type={type}
        value={value}
      />
    </label>
  );
}

function TestRow({
  busy,
  label,
  onTest,
}: {
  busy: boolean;
  label: string;
  onTest: () => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      <Button disabled={busy} onClick={onTest} size="sm" type="button" variant="outline">
        {busy ? "Testing" : label}
      </Button>
    </div>
  );
}

function TestMessage({ state, message }: { state: TestState; message: string }) {
  if (!message) {
    return null;
  }

  return (
    <div
      className={cn(
        "flex items-start gap-2 rounded-md border p-2 text-xs leading-5",
        state === "ok"
          ? "border-success-border bg-success text-success-foreground"
          : state === "error"
            ? "border-warning-border bg-warning text-warning-foreground"
            : "text-muted-foreground",
      )}
    >
      {state === "ok" ? (
        <Check className="mt-0.5 h-3.5 w-3.5 shrink-0" />
      ) : state === "error" ? (
        <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
      ) : null}
      <span>{message}</span>
    </div>
  );
}

function StepFooter({
  canAdvance,
  canSkip,
  done,
  isLast,
  nextLabel,
  onBack,
  onNext,
  onSkip,
}: {
  canAdvance: boolean;
  canSkip: boolean;
  done: boolean;
  isLast: boolean;
  nextLabel: string;
  onBack?: () => void;
  onNext: () => void;
  onSkip: () => void;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 border-t pt-3">
      <div>
        {onBack ? (
          <Button onClick={onBack} size="sm" type="button" variant="outline">
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
        ) : null}
      </div>
      <div className="flex flex-wrap gap-2">
        {canSkip && !done ? (
          <Button onClick={onSkip} size="sm" type="button" variant="outline">
            Skip for now
          </Button>
        ) : null}
        <Button disabled={!canAdvance} onClick={onNext} size="sm" type="button">
          {isLast ? "Finish" : nextLabel}
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

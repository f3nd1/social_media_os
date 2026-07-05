"use client";

// The inline field bodies for Part B of the setup guide ("Your data"). Each
// one lets the owner complete a data step WITHOUT leaving the guide: the real
// input fields live here and every change writes straight to the workspace,
// the same as if it were typed on the full screen. Each body also offers a
// small optional "Open the full screen" link; because the guide stays mounted
// above every screen, using it never strands the user.

import { useState, type ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import {
  platforms,
  type BrandProfile,
  type MarketingWorkspaceData,
  type Platform,
  type SocialAudit,
  type StrategyBrief,
  type UccAudience,
  type UccCourse,
  type UccCourseCategory,
  type UccMarketingChannel,
  type UccStrategyData,
} from "@/lib/social-calendar-data";
import { isLiveAiEnabled, resolveModelForTask } from "@/lib/ai-settings";
import {
  briefDraftToPatch,
  type BriefAiContext,
  type BriefAiDraft,
} from "@/lib/brief-ai";
import type { OpenAiUsage } from "@/lib/openai-shared";

const COURSE_CATEGORY_OPTIONS: UccCourseCategory[] = [
  "Full-time courses",
  "Short courses",
  "English courses",
  "AI courses",
  "Business courses",
  "Hospitality courses",
  "Future Master pathway",
  "ATO-related courses",
];

const AUDIENCE_CHANNEL_OPTIONS: UccMarketingChannel[] = [
  "Instagram",
  "TikTok",
  "YouTube Shorts",
  "LinkedIn",
  "Facebook",
  "X/Twitter",
  "Threads",
  "Xiaohongshu",
  "WeChat",
];

// Local factory functions, matching the ones the full screens use, so a course,
// audience, or audit created in the guide has the exact same shape.
function makeGuideCourse(name: string, category: UccCourseCategory): UccCourse {
  return {
    id: `course-${Date.now()}`,
    name,
    category,
    audienceIds: [],
    courseProof: [],
    complianceNotes: "",
    status: "active",
    description: "",
    usp: "",
    duration: "",
    entryRequirements: "",
    fees: "",
    sellingPoints: [],
  };
}

function makeGuideAudience(
  name: string,
  channel: UccMarketingChannel | "",
): UccAudience {
  return {
    id: `audience-${Date.now()}`,
    name,
    languages: [],
    motivations: [],
    concerns: [],
    recommendedChannels: channel ? [channel] : [],
    nurtureAngle: "",
    interests: [],
    buyingJourney: "",
    decisionMakers: "",
  };
}

function makeGuideAudit(platform: Platform): SocialAudit {
  return {
    platform,
    url: "",
    followers: 0,
    averageReach: 0,
    engagementRate: 0,
    postingFrequency: "",
    scores: {
      profileCompleteness: 0,
      postingConsistency: 0,
      contentMix: 0,
      hookQuality: 0,
      ctaClarity: 0,
      visualConsistency: 0,
      engagementPerformance: 0,
    },
    notes: "",
  };
}

// ----- shared little pieces -------------------------------------------------

function GuideField({
  label,
  onChange,
  placeholder,
  value,
}: {
  label: string;
  onChange: (value: string) => void;
  placeholder?: string;
  value: string;
}) {
  return (
    <label className="block space-y-1.5">
      <span className="text-sm font-medium text-foreground">{label}</span>
      <Input
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        value={value}
      />
    </label>
  );
}

function GuideSelect({
  label,
  onChange,
  options,
  value,
}: {
  label: string;
  onChange: (value: string) => void;
  options: readonly string[];
  value: string;
}) {
  return (
    <label className="block space-y-1.5">
      <span className="text-sm font-medium text-foreground">{label}</span>
      <select
        className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
        onChange={(event) => onChange(event.target.value)}
        value={value}
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </label>
  );
}

function OpenFullLink({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      className="text-xs leading-5 text-muted-foreground underline underline-offset-2 hover:text-foreground"
      onClick={onClick}
      type="button"
    >
      {label}
    </button>
  );
}

function AddedList({ items, label }: { items: string[]; label: string }) {
  return (
    <div className="rounded-md border bg-muted/20 p-2">
      <p className="text-xs font-semibold">{label}</p>
      <ul className="mt-1 flex flex-wrap gap-1.5">
        {items.map((item, index) => (
          <li
            className="rounded-full border border-success-border bg-success px-2 py-0.5 text-xs text-success-foreground"
            key={`${item}-${index}`}
          >
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}

function StepMessage({ tone, children }: { tone: "info" | "error"; children: ReactNode }) {
  return (
    <p
      className={cn(
        "text-xs leading-5",
        tone === "error" ? "text-warning-foreground" : "text-muted-foreground",
      )}
    >
      {children}
    </p>
  );
}

// ----- the five step bodies -------------------------------------------------

export function BrandStepBody({
  brand,
  onOpenFull,
  onUpdateBrand,
}: {
  brand: BrandProfile;
  onOpenFull: () => void;
  onUpdateBrand: (patch: Partial<BrandProfile>) => void;
}) {
  return (
    <div className="space-y-3">
      <div className="grid gap-3 md:grid-cols-2">
        <GuideField
          label="Brand name"
          onChange={(value) => onUpdateBrand({ brandName: value })}
          placeholder="e.g. United Ceres College"
          value={brand.brandName}
        />
        <GuideField
          label="Tone of voice"
          onChange={(value) => onUpdateBrand({ toneOfVoice: value })}
          placeholder="e.g. warm, factual, encouraging"
          value={brand.toneOfVoice}
        />
        <GuideField
          label="Website (optional)"
          onChange={(value) => onUpdateBrand({ website: value })}
          placeholder="https://"
          value={brand.website}
        />
        <GuideField
          label="Industry (optional)"
          onChange={(value) => onUpdateBrand({ industry: value })}
          placeholder="e.g. Private education"
          value={brand.industry}
        />
      </div>
      <OpenFullLink label="Open the full Brand screen" onClick={onOpenFull} />
    </div>
  );
}

export function CourseStepBody({
  onOpenFull,
  onUccChange,
  ucc,
}: {
  onOpenFull: () => void;
  onUccChange: (ucc: UccStrategyData) => void;
  ucc: UccStrategyData;
}) {
  const [name, setName] = useState("");
  const [category, setCategory] = useState<UccCourseCategory>("Full-time courses");
  const liveCourses = ucc.courses.filter((course) => course.status !== "archived");

  function addCourse() {
    if (!name.trim()) {
      return;
    }

    onUccChange({
      ...ucc,
      courses: [...ucc.courses, makeGuideCourse(name.trim(), category)],
    });
    setName("");
  }

  return (
    <div className="space-y-3">
      <div className="grid gap-3 md:grid-cols-2">
        <GuideField
          label="Course name"
          onChange={setName}
          placeholder="e.g. Diploma in Business"
          value={name}
        />
        <GuideSelect
          label="Category"
          onChange={(value) => setCategory(value as UccCourseCategory)}
          options={COURSE_CATEGORY_OPTIONS}
          value={category}
        />
      </div>
      <Button disabled={!name.trim()} onClick={addCourse} size="sm" type="button">
        Add course
      </Button>
      {liveCourses.length > 0 ? (
        <AddedList
          items={liveCourses.map((course) => course.name || "Untitled course")}
          label={`Courses added (${liveCourses.length})`}
        />
      ) : (
        <StepMessage tone="info">Add at least one course to continue.</StepMessage>
      )}
      <OpenFullLink
        label="Open the full Courses & Audiences screen"
        onClick={onOpenFull}
      />
    </div>
  );
}

export function AudienceStepBody({
  onOpenFull,
  onUccChange,
  ucc,
}: {
  onOpenFull: () => void;
  onUccChange: (ucc: UccStrategyData) => void;
  ucc: UccStrategyData;
}) {
  const [name, setName] = useState("");
  const [channel, setChannel] = useState<UccMarketingChannel | "">("");

  function addAudience() {
    if (!name.trim()) {
      return;
    }

    onUccChange({
      ...ucc,
      audiences: [...ucc.audiences, makeGuideAudience(name.trim(), channel)],
    });
    setName("");
  }

  return (
    <div className="space-y-3">
      <div className="grid gap-3 md:grid-cols-2">
        <GuideField
          label="Audience name"
          onChange={setName}
          placeholder="e.g. PRC parents, school leavers"
          value={name}
        />
        <GuideSelect
          label="Main channel (optional)"
          onChange={(value) => setChannel(value as UccMarketingChannel | "")}
          options={["", ...AUDIENCE_CHANNEL_OPTIONS]}
          value={channel}
        />
      </div>
      <Button disabled={!name.trim()} onClick={addAudience} size="sm" type="button">
        Add audience
      </Button>
      {ucc.audiences.length > 0 ? (
        <AddedList
          items={ucc.audiences.map((audience) => audience.name || "Untitled audience")}
          label={`Audiences added (${ucc.audiences.length})`}
        />
      ) : (
        <StepMessage tone="info">Add at least one audience to continue.</StepMessage>
      )}
      <OpenFullLink
        label="Open the full Courses & Audiences screen"
        onClick={onOpenFull}
      />
    </div>
  );
}

export function AuditStepBody({
  audits,
  onAuditsChange,
  onOpenFull,
}: {
  audits: SocialAudit[];
  onAuditsChange: (audits: SocialAudit[]) => void;
  onOpenFull: () => void;
}) {
  const available = platforms.filter(
    (platform) => !audits.some((audit) => audit.platform === platform),
  );
  const [choice, setChoice] = useState<Platform>(available[0] ?? platforms[0]);

  function addAudit() {
    if (audits.some((audit) => audit.platform === choice)) {
      return;
    }

    onAuditsChange([...audits, makeGuideAudit(choice)]);
    const nextAvailable = available.filter((platform) => platform !== choice);
    setChoice(nextAvailable[0] ?? platforms[0]);
  }

  return (
    <div className="space-y-3">
      {available.length > 0 ? (
        <div className="flex flex-wrap items-end gap-3">
          <div className="min-w-[200px] flex-1">
            <GuideSelect
              label="Platform to record"
              onChange={(value) => setChoice(value as Platform)}
              options={available}
              value={choice}
            />
          </div>
          <Button onClick={addAudit} size="sm" type="button">
            Add audit
          </Button>
        </div>
      ) : (
        <StepMessage tone="info">
          Every platform already has an audit. You can refine the numbers on the
          full Objectives screen.
        </StepMessage>
      )}
      {audits.length > 0 ? (
        <AddedList
          items={audits.map((audit) => audit.platform)}
          label={`Audits started (${audits.length})`}
        />
      ) : (
        <StepMessage tone="info">
          Add one platform to start. It records a baseline you can refine later;
          no numbers are invented.
        </StepMessage>
      )}
      <OpenFullLink label="Open the full Objectives screen" onClick={onOpenFull} />
    </div>
  );
}

export function BriefStepBody({
  data,
  onBriefChange,
  onOpenFull,
  onRecordUsage,
}: {
  data: MarketingWorkspaceData;
  onBriefChange: (brief: StrategyBrief) => void;
  onOpenFull: () => void;
  onRecordUsage: (module: string, model: string, usage: OpenAiUsage) => void;
}) {
  const { aiIntegration, brief } = data;
  const liveAi = isLiveAiEnabled(aiIntegration);
  const [goal, setGoal] = useState(brief.monthlyCampaignGoal);
  const [pillarsText, setPillarsText] = useState(brief.contentPillars.join("\n"));
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ tone: "info" | "error"; text: string } | null>(
    null,
  );

  const pillars = pillarsText
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  const canApprove = goal.trim().length > 0 && pillars.length > 0;

  function buildContext(): BriefAiContext {
    return {
      brand: {
        name: data.brand.brandName,
        industry: data.brand.industry,
        toneOfVoice: data.brand.toneOfVoice,
        audience: data.brand.audience,
        offers: data.brand.offers,
        goals: data.brand.goals,
        guidelines: data.brand.brandGuidelines,
      },
      courses: data.ucc.courses
        .filter((course) => course.status !== "archived")
        .map((course) => ({
          name: course.name,
          category: course.category,
          usp: course.usp ?? "",
          description: course.description ?? "",
          sellingPoints: course.sellingPoints ?? [],
          complianceNotes: course.complianceNotes,
        })),
      audiences: data.ucc.audiences.map((audience) => ({
        name: audience.name,
        goals: audience.motivations,
        painPoints: audience.concerns,
        interests: audience.interests ?? [],
      })),
      auditGoal: {
        primaryObjective: data.socialGoals.primaryObjective,
        northStarMetric: data.socialGoals.northStarMetric,
        conversionAction: data.socialGoals.conversionAction,
      },
      platformAnalytics: data.audits.map((audit) => ({
        platform: audit.platform,
        followers: audit.followers,
        averageReach: audit.averageReach,
        engagementRate: audit.engagementRate,
      })),
      acceptedCompetitorInsights: (data.competitorInsights ?? [])
        .filter((insight) => insight.status === "accepted")
        .map((insight) => `${insight.competitorName} (${insight.kind}): ${insight.insight}`),
      acceptedListeningInsights: (data.listeningResults ?? [])
        .filter((result) => result.status === "accepted")
        .map((result) => `${result.topic}: ${result.insight}`),
      platforms: [...platforms],
    };
  }

  // A plain starter draft built from what the owner has already entered. It is
  // honestly a template they can edit, never presented as AI output.
  function useStarterDraft() {
    const firstCourse = data.ucc.courses.find((course) => course.status !== "archived");
    const firstAudience = data.ucc.audiences[0];
    const objective =
      data.socialGoals.primaryObjective || "grow enquiries and enrolments";
    const subject = firstCourse?.name || data.brand.brandName || "your courses";
    const who = firstAudience?.name || "your priority audience";

    setGoal(`Over the next month, ${objective} for ${subject} among ${who}.`);
    setPillarsText(
      [
        "Proof and outcomes (facts, not promises)",
        "Student and teacher stories",
        "Course guidance and how to apply",
      ].join("\n"),
    );
    setMessage({
      tone: "info",
      text: "Starter draft filled in from your details. Edit it, then approve.",
    });
  }

  async function generateWithAi() {
    setBusy(true);
    setMessage(null);

    try {
      const response = await fetch("/api/ai/brief", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          apiKey: aiIntegration.apiKey,
          model: resolveModelForTask(aiIntegration, "analysis"),
          context: buildContext(),
        }),
      });
      const result = (await response.json()) as
        | { ok: true; draft: BriefAiDraft; usage?: OpenAiUsage; model?: string }
        | { ok: false; error: string };

      if (!result.ok) {
        setMessage({ tone: "error", text: result.error });
        return;
      }

      const patch = briefDraftToPatch(result.draft, brief.platformStrategy, [
        ...platforms,
      ]);
      if (typeof patch.monthlyCampaignGoal === "string") {
        setGoal(patch.monthlyCampaignGoal);
      }
      if (Array.isArray(patch.contentPillars)) {
        setPillarsText(patch.contentPillars.join("\n"));
      }
      onBriefChange({
        ...brief,
        ...patch,
        approved: false,
        updatedAt: new Date().toISOString(),
      });
      setMessage({
        tone: "info",
        text: "AI draft ready. Review it, edit anything, then approve.",
      });

      if (result.usage) {
        onRecordUsage("Strategy Brief", result.model ?? "unknown", result.usage);
      }
    } catch (error) {
      setMessage({
        tone: "error",
        text: error instanceof Error ? error.message : String(error),
      });
    } finally {
      setBusy(false);
    }
  }

  function approve() {
    onBriefChange({
      ...brief,
      monthlyCampaignGoal: goal.trim(),
      contentPillars: pillars,
      approved: true,
      updatedAt: new Date().toISOString(),
    });
    setMessage({ tone: "info", text: "Brief approved. This unlocks the calendar." });
  }

  return (
    <div className="space-y-3">
      <label className="block space-y-1.5">
        <span className="text-sm font-medium text-foreground">Monthly campaign goal</span>
        <Input
          onChange={(event) => setGoal(event.target.value)}
          placeholder="What should this month achieve?"
          value={goal}
        />
      </label>
      <label className="block space-y-1.5">
        <span className="text-sm font-medium text-foreground">
          Content pillars (one per line)
        </span>
        <Textarea
          onChange={(event) => setPillarsText(event.target.value)}
          placeholder={"Proof and outcomes\nStudent stories\nCourse guidance"}
          rows={4}
          value={pillarsText}
        />
      </label>

      <div className="flex flex-wrap gap-2">
        {liveAi ? (
          <Button
            disabled={busy}
            onClick={() => void generateWithAi()}
            size="sm"
            type="button"
            variant="outline"
          >
            {busy ? "Generating" : "Generate with AI"}
          </Button>
        ) : null}
        <Button onClick={useStarterDraft} size="sm" type="button" variant="outline">
          Use a starter draft
        </Button>
        <Button disabled={!canApprove || brief.approved} onClick={approve} size="sm" type="button">
          {brief.approved ? "Approved" : "Approve brief"}
        </Button>
      </div>

      {!liveAi ? (
        <StepMessage tone="info">
          AI is not connected, so type the goal and pillars yourself or use a
          starter draft, then approve. Nothing is blocked.
        </StepMessage>
      ) : null}
      {message ? <StepMessage tone={message.tone}>{message.text}</StepMessage> : null}
      <OpenFullLink label="Open the full Strategy Brief screen" onClick={onOpenFull} />
    </div>
  );
}

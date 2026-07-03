"use client";

import { useState, type FormEvent, type ReactNode } from "react";
import {
  ArrowRight,
  Boxes,
  Brain,
  ClipboardCheck,
  Layers3,
  Loader2,
  Network,
  Sparkles,
  Target,
  UsersRound,
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
  defaultContentEngineInput,
  type ContentEngineInput,
  type ContentEngineOutput,
  type ContentEngineRun,
} from "@/lib/content-engine";
import { cn } from "@/lib/utils";

const flowSteps = [
  { label: "Business Goal", icon: Target },
  { label: "Audience Insight", icon: UsersRound },
  { label: "Content Angle", icon: Brain },
  { label: "Series Opportunity", icon: Layers3 },
  { label: "Platform Adaptation", icon: Network },
  { label: "Content Execution", icon: ClipboardCheck },
];

export function ContentEngineFlow() {
  const [input, setInput] = useState<ContentEngineInput>(defaultContentEngineInput);
  const [run, setRun] = useState<ContentEngineRun | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsGenerating(true);
    setError(null);

    try {
      const response = await fetch("/api/content-engine/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(input),
      });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error || "Generation failed.");
      }

      setRun(payload as ContentEngineRun);
    } catch (generationError) {
      setError(
        generationError instanceof Error
          ? generationError.message
          : "Generation failed.",
      );
    } finally {
      setIsGenerating(false);
    }
  }

  return (
    <section className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <CardTitle>Content Engine Flow</CardTitle>
              <CardDescription>
                Business Goal to Content Execution, stored as structured outputs.
              </CardDescription>
            </div>
            {run?.persisted ? (
              <Badge variant="success">Saved to Supabase</Badge>
            ) : (
              <Badge variant="secondary">Server generated</Badge>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-2 md:grid-cols-3 xl:grid-cols-6">
            {flowSteps.map((step, index) => {
              const Icon = step.icon;
              return (
                <div
                  className="flex min-w-0 items-center gap-2 rounded-lg border bg-muted/20 p-3"
                  key={step.label}
                >
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-background text-primary">
                    <Icon className="h-4 w-4" />
                  </span>
                  <span className="min-w-0 flex-1 text-sm font-medium leading-5">
                    {step.label}
                  </span>
                  {index < flowSteps.length - 1 ? (
                    <ArrowRight className="hidden h-4 w-4 text-muted-foreground xl:block" />
                  ) : null}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 xl:grid-cols-[minmax(360px,0.78fr)_minmax(0,1.22fr)]">
        <StrategyInputForm
          input={input}
          isGenerating={isGenerating}
          onInputChange={setInput}
          onSubmit={handleSubmit}
        />
        <GeneratedOutputs error={error} isGenerating={isGenerating} output={run?.output} />
      </div>
    </section>
  );
}

function StrategyInputForm({
  input,
  isGenerating,
  onInputChange,
  onSubmit,
}: {
  input: ContentEngineInput;
  isGenerating: boolean;
  onInputChange: (input: ContentEngineInput) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  function updateField(field: keyof ContentEngineInput, value: string) {
    onInputChange({ ...input, [field]: value });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Strategy Input</CardTitle>
        <CardDescription>Core inputs for the Content Engine run.</CardDescription>
      </CardHeader>
      <CardContent>
        <form className="space-y-4" onSubmit={onSubmit}>
          <FieldGroup label="Business goal">
            <Textarea
              value={input.businessGoal}
              onChange={(event) => updateField("businessGoal", event.target.value)}
              required
            />
          </FieldGroup>

          <div className="grid gap-3 sm:grid-cols-2">
            <FieldGroup label="Brand">
              <Input
                value={input.brandName}
                onChange={(event) => updateField("brandName", event.target.value)}
                required
              />
            </FieldGroup>
            <FieldGroup label="Funnel stage">
              <Input
                value={input.funnelStage}
                onChange={(event) => updateField("funnelStage", event.target.value)}
                required
              />
            </FieldGroup>
          </div>

          <FieldGroup label="Product or offer">
            <Textarea
              value={input.productOffer}
              onChange={(event) => updateField("productOffer", event.target.value)}
              required
            />
          </FieldGroup>

          <FieldGroup label="Audience segment">
            <Textarea
              value={input.audienceSegment}
              onChange={(event) => updateField("audienceSegment", event.target.value)}
              required
            />
          </FieldGroup>

          <FieldGroup label="Audience insight">
            <Textarea
              value={input.audienceInsight}
              onChange={(event) => updateField("audienceInsight", event.target.value)}
              required
            />
          </FieldGroup>

          <FieldGroup label="Customer pain">
            <Textarea
              value={input.customerPain}
              onChange={(event) => updateField("customerPain", event.target.value)}
              required
            />
          </FieldGroup>

          <FieldGroup label="Proof points">
            <Textarea
              value={input.proofPoints}
              onChange={(event) => updateField("proofPoints", event.target.value)}
            />
          </FieldGroup>

          <div className="grid gap-3 sm:grid-cols-2">
            <FieldGroup label="Platforms">
              <Input
                value={input.platforms}
                onChange={(event) => updateField("platforms", event.target.value)}
                required
              />
            </FieldGroup>
            <FieldGroup label="Primary CTA">
              <Input
                value={input.primaryCta}
                onChange={(event) => updateField("primaryCta", event.target.value)}
                required
              />
            </FieldGroup>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <FieldGroup label="Tone">
              <Input
                value={input.tone}
                onChange={(event) => updateField("tone", event.target.value)}
              />
            </FieldGroup>
            <FieldGroup label="Constraints">
              <Input
                value={input.constraints}
                onChange={(event) => updateField("constraints", event.target.value)}
              />
            </FieldGroup>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <FieldGroup label="Due date">
              <Input
                type="date"
                value={input.dueDate}
                onChange={(event) => updateField("dueDate", event.target.value)}
                required
              />
            </FieldGroup>
            <FieldGroup label="Publish date">
              <Input
                type="date"
                value={input.publishDate}
                onChange={(event) => updateField("publishDate", event.target.value)}
                required
              />
            </FieldGroup>
          </div>

          <Button className="w-full" disabled={isGenerating} type="submit">
            {isGenerating ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Sparkles className="h-4 w-4" />
            )}
            Generate Content Engine
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

function FieldGroup({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <label className="block space-y-2">
      <span className="text-sm font-medium">{label}</span>
      {children}
    </label>
  );
}

function GeneratedOutputs({
  error,
  isGenerating,
  output,
}: {
  error: string | null;
  isGenerating: boolean;
  output?: ContentEngineOutput;
}) {
  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Generation Error</CardTitle>
          <CardDescription>{error}</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (isGenerating) {
    return (
      <Card className="min-h-[520px]">
        <CardContent className="flex h-full min-h-[520px] items-center justify-center p-6">
          <div className="text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-md bg-secondary text-secondary-foreground">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
            <p className="mt-4 text-sm font-medium">Generating structured output</p>
            <p className="mt-2 text-sm text-muted-foreground">
              The server is connecting strategy, audience, angles, series, platforms,
              and execution cards.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!output) {
    return (
      <Card className="min-h-[520px]">
        <CardContent className="flex h-full min-h-[520px] items-center justify-center p-6">
          <div className="max-w-sm text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-md bg-secondary text-secondary-foreground">
              <Boxes className="h-6 w-6" />
            </div>
            <h2 className="mt-5 text-lg font-semibold">No generated run yet</h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Generated blueprints, angles, adaptations, and cards will appear here.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <BlueprintCard
        description={output.brandBlueprint.promise}
        items={[
          ["Positioning", output.brandBlueprint.positioning],
          ["Voice", output.brandBlueprint.voice],
          ["Proof", output.brandBlueprint.proofPoints.join(" / ")],
          ["Guardrails", output.brandBlueprint.guardrails.join(" / ")],
        ]}
        title="Brand Blueprint"
      />
      <BlueprintCard
        description={output.audienceBlueprint.coreInsight}
        items={[
          ["Segment", output.audienceBlueprint.segment],
          ["Pains", output.audienceBlueprint.pains.join(" / ")],
          ["Outcomes", output.audienceBlueprint.desiredOutcomes.join(" / ")],
          ["Triggers", output.audienceBlueprint.buyingTriggers.join(" / ")],
        ]}
        title="Audience Blueprint"
      />
      <CollectionCard
        items={output.contentAngles.map((angle) => ({
          title: angle.title,
          body: angle.premise,
          meta: [angle.funnelStage, angle.hook, angle.proof],
        }))}
        title="Content Angles"
      />
      <CollectionCard
        items={output.seriesIdeas.map((series) => ({
          title: series.name,
          body: series.premise,
          meta: [series.cadence, series.successMetric, ...series.episodeIdeas],
        }))}
        title="Series Ideas"
      />
      <CollectionCard
        items={output.platformAdaptations.map((adaptation) => ({
          title: adaptation.platform,
          body: adaptation.adaptationNotes,
          meta: [
            adaptation.format,
            adaptation.hookStyle,
            adaptation.cta,
            adaptation.productionNotes,
          ],
        }))}
        title="Platform Adaptations"
      />
      <ContentCards cards={output.contentCards} />
    </div>
  );
}

function BlueprintCard({
  description,
  items,
  title,
}: {
  description: string;
  items: Array<[string, string]>;
  title: string;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-3">
        {items.map(([label, value]) => (
          <div className="rounded-lg border bg-muted/20 p-3" key={label}>
            <p className="text-xs font-medium uppercase text-muted-foreground">
              {label}
            </p>
            <p className="mt-1 text-sm leading-6">{value}</p>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function CollectionCard({
  items,
  title,
}: {
  items: Array<{ title: string; body: string; meta: string[] }>;
  title: string;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-3">
        {items.map((item) => (
          <div className="rounded-lg border bg-muted/20 p-3" key={item.title}>
            <p className="text-sm font-semibold">{item.title}</p>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">{item.body}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {item.meta.filter(Boolean).slice(0, 6).map((meta, index) => (
                <Badge key={`${meta}-${index}`} variant="outline">
                  {meta}
                </Badge>
              ))}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function ContentCards({ cards }: { cards: ContentEngineOutput["contentCards"] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Content Cards</CardTitle>
        <CardDescription>Execution-ready content records.</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-3">
        {cards.map((card) => (
          <div className="rounded-lg border bg-card p-4" key={`${card.title}-${card.platform}`}>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="font-semibold leading-5">{card.title}</p>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  {card.brief}
                </p>
              </div>
              <Badge className="w-fit" variant="info">
                {card.platform}
              </Badge>
            </div>
            <div className="mt-4 grid gap-2 text-sm md:grid-cols-2">
              <CardMeta label="Goal" value={card.businessGoal} />
              <CardMeta label="Audience" value={card.audience} />
              <CardMeta label="Angle" value={card.angle} />
              <CardMeta label="Series" value={card.series} />
              <CardMeta label="Owner" value={card.ownerRole} />
              <CardMeta label="Dates" value={`${card.dueDate} -> ${card.publishDate}`} />
            </div>
            <div className="mt-4 rounded-lg border bg-muted/20 p-3">
              <p className="text-sm font-medium">{card.hook}</p>
              <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
                {card.outline.map((line) => (
                  <li className="leading-6" key={line}>
                    {line}
                  </li>
                ))}
              </ul>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {[card.funnelStage, card.status, card.cta, ...card.metricsToWatch].map(
                (item, index) => (
                  <Badge
                    className={cn(item === card.status && "border-emerald-200")}
                    key={`${item}-${index}`}
                    variant={item === card.status ? "success" : "secondary"}
                  >
                    {item}
                  </Badge>
                ),
              )}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function CardMeta({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md bg-muted/30 px-3 py-2">
      <p className="text-xs font-medium uppercase text-muted-foreground">{label}</p>
      <p className="mt-1 leading-5">{value}</p>
    </div>
  );
}

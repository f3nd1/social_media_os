export type ContentEngineInput = {
  businessGoal: string;
  brandName: string;
  productOffer: string;
  audienceSegment: string;
  audienceInsight: string;
  customerPain: string;
  proofPoints: string;
  platforms: string;
  funnelStage: string;
  primaryCta: string;
  tone: string;
  constraints: string;
  dueDate: string;
  publishDate: string;
};

export type ContentEngineOutput = {
  brandBlueprint: {
    positioning: string;
    promise: string;
    voice: string;
    proofPoints: string[];
    guardrails: string[];
  };
  audienceBlueprint: {
    segment: string;
    coreInsight: string;
    pains: string[];
    desiredOutcomes: string[];
    objections: string[];
    buyingTriggers: string[];
  };
  contentAngles: Array<{
    title: string;
    premise: string;
    hook: string;
    tension: string;
    proof: string;
    funnelStage: string;
  }>;
  seriesIdeas: Array<{
    name: string;
    premise: string;
    cadence: string;
    episodeIdeas: string[];
    successMetric: string;
  }>;
  platformAdaptations: Array<{
    platform: string;
    format: string;
    adaptationNotes: string;
    hookStyle: string;
    cta: string;
    productionNotes: string;
  }>;
  contentCards: Array<{
    title: string;
    platform: string;
    funnelStage: string;
    businessGoal: string;
    audience: string;
    angle: string;
    series: string;
    ownerRole: string;
    status: string;
    dueDate: string;
    publishDate: string;
    brief: string;
    hook: string;
    outline: string[];
    cta: string;
    metricsToWatch: string[];
  }>;
};

export type ContentEngineRun = {
  id?: string;
  input: ContentEngineInput;
  output: ContentEngineOutput;
  model?: string;
  openaiResponseId?: string;
  persisted?: boolean;
};

export const contentEngineOutputSchema = {
  type: "object",
  additionalProperties: false,
  required: [
    "brandBlueprint",
    "audienceBlueprint",
    "contentAngles",
    "seriesIdeas",
    "platformAdaptations",
    "contentCards",
  ],
  properties: {
    brandBlueprint: {
      type: "object",
      additionalProperties: false,
      required: ["positioning", "promise", "voice", "proofPoints", "guardrails"],
      properties: {
        positioning: { type: "string" },
        promise: { type: "string" },
        voice: { type: "string" },
        proofPoints: {
          type: "array",
          minItems: 3,
          maxItems: 6,
          items: { type: "string" },
        },
        guardrails: {
          type: "array",
          minItems: 3,
          maxItems: 6,
          items: { type: "string" },
        },
      },
    },
    audienceBlueprint: {
      type: "object",
      additionalProperties: false,
      required: [
        "segment",
        "coreInsight",
        "pains",
        "desiredOutcomes",
        "objections",
        "buyingTriggers",
      ],
      properties: {
        segment: { type: "string" },
        coreInsight: { type: "string" },
        pains: {
          type: "array",
          minItems: 3,
          maxItems: 6,
          items: { type: "string" },
        },
        desiredOutcomes: {
          type: "array",
          minItems: 3,
          maxItems: 6,
          items: { type: "string" },
        },
        objections: {
          type: "array",
          minItems: 2,
          maxItems: 5,
          items: { type: "string" },
        },
        buyingTriggers: {
          type: "array",
          minItems: 2,
          maxItems: 5,
          items: { type: "string" },
        },
      },
    },
    contentAngles: {
      type: "array",
      minItems: 4,
      maxItems: 6,
      items: {
        type: "object",
        additionalProperties: false,
        required: ["title", "premise", "hook", "tension", "proof", "funnelStage"],
        properties: {
          title: { type: "string" },
          premise: { type: "string" },
          hook: { type: "string" },
          tension: { type: "string" },
          proof: { type: "string" },
          funnelStage: { type: "string" },
        },
      },
    },
    seriesIdeas: {
      type: "array",
      minItems: 3,
      maxItems: 5,
      items: {
        type: "object",
        additionalProperties: false,
        required: ["name", "premise", "cadence", "episodeIdeas", "successMetric"],
        properties: {
          name: { type: "string" },
          premise: { type: "string" },
          cadence: { type: "string" },
          episodeIdeas: {
            type: "array",
            minItems: 4,
            maxItems: 8,
            items: { type: "string" },
          },
          successMetric: { type: "string" },
        },
      },
    },
    platformAdaptations: {
      type: "array",
      minItems: 3,
      maxItems: 8,
      items: {
        type: "object",
        additionalProperties: false,
        required: [
          "platform",
          "format",
          "adaptationNotes",
          "hookStyle",
          "cta",
          "productionNotes",
        ],
        properties: {
          platform: { type: "string" },
          format: { type: "string" },
          adaptationNotes: { type: "string" },
          hookStyle: { type: "string" },
          cta: { type: "string" },
          productionNotes: { type: "string" },
        },
      },
    },
    contentCards: {
      type: "array",
      minItems: 4,
      maxItems: 8,
      items: {
        type: "object",
        additionalProperties: false,
        required: [
          "title",
          "platform",
          "funnelStage",
          "businessGoal",
          "audience",
          "angle",
          "series",
          "ownerRole",
          "status",
          "dueDate",
          "publishDate",
          "brief",
          "hook",
          "outline",
          "cta",
          "metricsToWatch",
        ],
        properties: {
          title: { type: "string" },
          platform: { type: "string" },
          funnelStage: { type: "string" },
          businessGoal: { type: "string" },
          audience: { type: "string" },
          angle: { type: "string" },
          series: { type: "string" },
          ownerRole: { type: "string" },
          status: { type: "string" },
          dueDate: { type: "string" },
          publishDate: { type: "string" },
          brief: { type: "string" },
          hook: { type: "string" },
          outline: {
            type: "array",
            minItems: 3,
            maxItems: 7,
            items: { type: "string" },
          },
          cta: { type: "string" },
          metricsToWatch: {
            type: "array",
            minItems: 3,
            maxItems: 6,
            items: { type: "string" },
          },
        },
      },
    },
  },
} as const;

export const defaultContentEngineInput: ContentEngineInput = {
  businessGoal: "Increase qualified demo requests for the new content operations offer.",
  brandName: "Content Operating System",
  productOffer: "A SaaS dashboard that helps lean marketing teams plan, produce, publish, and learn from content.",
  audienceSegment: "B2B marketing leaders at growing teams with inconsistent content operations.",
  audienceInsight: "They know content should compound, but daily production pressure keeps strategy, execution, and learning disconnected.",
  customerPain: "Campaign ideas get scattered across docs, reviews stall, and performance learnings rarely make it back into planning.",
  proofPoints: "Centralized strategy, connected content calendar, production visibility, performance intelligence.",
  platforms: "LinkedIn, newsletter, blog, webinar clips",
  funnelStage: "Consideration",
  primaryCta: "Book a content operations audit",
  tone: "Clear, strategic, practical, confident",
  constraints: "Avoid hype. Make ideas specific enough for a production team to use this week.",
  dueDate: "2026-07-02",
  publishDate: "2026-07-08",
};

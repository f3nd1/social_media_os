// Prompt building and output types for the AI compliance reviewer (Module B3).
// Pure helpers, no network.

// The single compliance sentence embedded in every AI system prompt. One
// exported constant so the wording cannot drift between features again;
// task-specific suffixes are appended at each call site where they add
// real meaning.
export const COMPLIANCE_PROMPT_RULE =
  "Compliance is mandatory. Keep every claim factual and proof-based. Never promise or imply guaranteed employment, salary figures, visa or immigration outcomes, admission certainty, rankings, or guaranteed course outcomes.";

export type ComplianceAiContext = {
  // "single" reviews one piece of copy; "calendar" reviews a batch of
  // unapproved calendar captions in one call.
  mode: "single" | "calendar";
  content: string;
  calendarItems: Array<{ id: string; topic: string; platform: string; text: string }>;
  guidelineDocs: Array<{ name: string; excerpt: string }>;
  // Per-course compliance notes the manager typed on the Courses screen, so the
  // reviewer weighs each course's own constraints, not just the built-in rules.
  courseComplianceNotes: Array<{ course: string; notes: string }>;
};

export type ComplianceFlag = {
  sentence: string;
  rule: string;
  suggestedRevision: string;
};

export type ComplianceAiDraft = {
  score: number;
  riskLevel: "low" | "medium" | "high";
  summary: string;
  flags: ComplianceFlag[];
  calendarFindings: Array<{
    id: string;
    topic: string;
    riskLevel: "low" | "medium" | "high";
    issues: string[];
  }>;
};

export const BUILT_IN_COMPLIANCE_RULES = [
  "Never promise or imply guaranteed employment, jobs, or career outcomes.",
  "Never state or imply salary figures or earnings outcomes.",
  "Never promise or imply visa, immigration, work pass, or permanent residency outcomes.",
  "Never promise or imply guaranteed admission, enrolment, or examination passes.",
  "Never claim rankings or superiority (best, number one, top) without verifiable proof.",
  "Individual testimonials must not imply typical or guaranteed outcomes.",
  "Pathway claims (degree progression, university transfer) must use conditional language and state eligibility requirements.",
  "All course, fee, and duration claims must be factual and verifiable.",
  "Quotes from private individuals must not be used in marketing content without consent.",
] as const;

export function buildComplianceSystemPrompt(): string {
  return [
    "You are the compliance reviewer for a private college's marketing in Singapore.",
    "You review marketing copy against the built-in education marketing rules and the college's own uploaded guideline documents. You produce findings as drafts for a human Marketing Manager, who alone decides what to change. You never edit anything yourself.",
    "Score strictly: 90 to 100 means clean, 70 to 89 minor wording risks, 40 to 69 material risks needing revision, below 40 serious violations.",
    "For every flagged sentence, quote the exact sentence, name the specific rule it breaks (from the built-in rules or a named uploaded document), and offer a compliant suggested revision that keeps the marketing intent.",
    "Do not invent violations; if the content is clean, say so with an empty flags list.",
    "Use British spelling. Do not use em dashes. Refer to teaching staff as teachers, never instructors.",
    "Return only a single JSON object matching the requested shape.",
  ].join(" ");
}

export function buildComplianceUserPrompt(context: ComplianceAiContext): string {
  const shape = {
    score: "number, 0 to 100",
    riskLevel: "low | medium | high",
    summary: "string, one or two sentences",
    flags: [
      {
        sentence: "string, the exact offending sentence",
        rule: "string, the specific rule broken and its source",
        suggestedRevision: "string, a compliant rewrite",
      },
    ],
    calendarFindings: [
      {
        id: "string, the calendar item id from context (calendar mode only)",
        topic: "string",
        riskLevel: "low | medium | high",
        issues: ["string"],
      },
    ],
  };

  const instruction =
    context.mode === "calendar"
      ? "Review every calendar item in calendarItems. Fill calendarFindings with one entry per item that has issues (omit clean items), and set score, riskLevel, summary, and flags for the batch overall."
      : "Review the single piece of content. Fill flags for each problem sentence and leave calendarFindings empty.";

  return [
    instruction,
    "",
    "BUILT-IN EDUCATION MARKETING RULES:",
    BUILT_IN_COMPLIANCE_RULES.map((rule, index) => `${index + 1}. ${rule}`).join("\n"),
    "",
    context.guidelineDocs.length > 0
      ? `UPLOADED GUIDELINE DOCUMENTS (excerpts, may be truncated):\n${context.guidelineDocs
          .map((doc) => `--- ${doc.name} ---\n${doc.excerpt}`)
          .join("\n\n")}`
      : "No guideline documents uploaded; use the built-in rules.",
    "",
    context.courseComplianceNotes.length > 0
      ? `COURSE-SPECIFIC COMPLIANCE NOTES (from the college's own course records; treat as binding for content about that course):\n${context.courseComplianceNotes
          .map((entry) => `- ${entry.course}: ${entry.notes}`)
          .join("\n")}`
      : "No course-specific compliance notes recorded.",
    "",
    context.mode === "calendar"
      ? `CALENDAR ITEMS TO REVIEW:\n${JSON.stringify(context.calendarItems, null, 2)}`
      : `CONTENT TO REVIEW:\n${context.content}`,
    "",
    "Return a JSON object with exactly this shape:",
    JSON.stringify(shape, null, 2),
  ].join("\n");
}

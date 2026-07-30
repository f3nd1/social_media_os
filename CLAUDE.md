# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Product

UCC Marketing OS: a marketing operations platform for United Ceres College. Version 1.0.

Core principle: AI recommends, humans decide. AI never publishes or approves. Never auto-publish, auto-approve, or bypass a manager approval gate in any code path. Every AI output arrives as a draft with accept/reject controls, and every decision is written to the append-only approvals log.

## Stack

Next.js 15 (App Router), React 19, TypeScript, Tailwind CSS 3.4, npm, Supabase (client-side, anon key). Node.js 20 or newer (the sc-research dependency requires 20; the app itself needs 18.18+).

## Commands

- Install dependencies: `npm install`
- Run the dev server: `npm run dev` (http://localhost:3000)
- Production build: `npm run build`
- Lint: `npm run lint`

## Architecture

- One workspace document (`MarketingWorkspaceData` in `lib/social-calendar-data.ts`) holds all state. It is localStorage-first (`social-calendar-intelligence-os:v1`) and syncs to the Supabase `workspace_state` table via `components/social-calendar/use-workspace-sync.ts`. Version-history snapshots live in the SAME `workspace_state` table as rows with prefixed ids (`ucc-default:snapshot:<timestamp>`); there is no separate snapshots table.
- CRITICAL: `normalizeWorkspaceData` in `lib/social-calendar-storage.ts` runs on every local load AND every cloud pull. Any new field on the workspace type MUST be optional-safe and given a default there, or old local/cloud data will crash the app.
- Most UI lives in `components/social-calendar/social-calendar-app.tsx` (legacy single-file layout; split new work into lib files and keep new files under roughly 600 lines).
- AI feature pattern: data model type in `lib/social-calendar-data.ts`, then a pure lib file with prompt builders and output mappers (no network), then an `/api/ai/*` route calling `callOpenAiJson` from `lib/openai-shared.ts`, then UI wiring gated on `isLiveAiEnabled`/`resolveModelForTask` with loading states, honest error text, and `onRecordUsage` feeding the AI usage meter. The analysis model handles heavy reasoning, the utility model light tasks.
- Offline fallbacks must be labelled "Offline draft, AI not connected". Never present a placeholder as a real result.
- Approval gates: calendar items pass through `approvalStages` including "manager approved"; `sanitizeCalendarPatch` and `canPublishCalendarItem` enforce the gate and compliance interception. The approvals log (`lib/approvals-log.ts`) derives entries centrally by diffing workspace updates inside `updateWorkspace`.
- Server subprocess routes (`/api/pdf-data/extract` python, `/api/compliance/extract` python, `/api/social-listening` node + sc-research, plus optional python 3.12 + last30days) work in a Node server environment; serverless deployment needs a hosted worker for them.
- Optional subprocess dependencies must degrade silently, never error. `/api/social-listening` skips the whole last30days source group when it is not installed, because deploys are manual and the code goes live before the droplet is provisioned. See `docs/last30days-setup.md`.
- Seven runnable checks, no test framework, each guarding a mapping that fails silently rather than loudly. `npm run check:listening` guards the parser for last30days' JSON export, which belongs to an external project, so an upstream schema change breaks noisily instead of quietly yielding no evidence. `npm run check:scrapecreators` guards the per-platform field mapping, where every platform names its follower count differently and reading the wrong one returns null rather than an error. `npm run check:patterns` guards the recency arithmetic and hashtag counting. `npm run check:storage` guards the quota shedding, `npm run check:approvals` guards the approvals log derivation, `npm run check:signals` guards the Signal Board projection and its downstream reach claims, and `npm run check:discover` guards the Discover topic derivation. Run all seven before committing anything that touches social listening.
- Social listening spans several files: `lib/listening-ai.ts` (prompts, post shape), `lib/last30days.ts` (external tool export), `lib/listening-sources.ts` (which sources a run searches), `lib/listening-patterns.ts` (recency and sample counts), `lib/scrapecreators.ts` (account lookup), with the screens in `components/social-calendar/social-calendar-app.tsx` (`SocialListeningPanel`) and `account-research-panel.tsx`.
- Never report a number the API did not return. A missing count is "not reported", never 0, and counts over fetched posts are labelled as our own sample, never as platform-wide data.
- Trend Radar uses the OpenAI Responses API web search (`callOpenAiWebSearch`); trends without genuine citations are dropped server-side.

## Conventions

- UK/British spelling in all UI copy and comments.
- Use "teacher", not "instructor".
- No em dashes in any output (code, copy, comments, or chat).
- Every marketing activity must link to a measurable objective.
- Compliance: no guaranteed employment, salary, visa, admission, ranking, or outcome claims anywhere in copy or generated content. These rules are also embedded in every AI system prompt and the rule-based checker (`checkComplianceText`).
- Social listening quotes are internal research evidence only, never marketing copy.

## Code rules

- No single new file over roughly 600 lines. Split social-calendar-app.tsx by module when practical.
- Explain each change in plain English before writing code.
- When asked for file contents, give full-file replacements, not fragments.
- Commits go to `main` in small logical steps; run `npm run build` before every commit.

# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Product

UCC Marketing OS: a marketing operations platform for United Ceres College.

Core principle: AI recommends, humans decide. AI never publishes or approves. Never auto-publish, auto-approve, or bypass a manager approval gate in any code path.

## Stack

Next.js 15, React 19, TypeScript, Tailwind CSS 3.4, npm, Supabase.

## Commands

- Install dependencies: `npm install`
- Run the dev server: `npm run dev` (http://localhost:3000)
- Production build: `npm run build`
- Lint: `npm run lint`

Requires Node.js 18.18 or newer.

## Conventions

- UK/British spelling in all UI copy and comments.
- Use "teacher", not "instructor".
- No em dashes in any output (code, copy, comments, or chat).
- Every marketing activity must link to a measurable objective.
- Compliance: no guaranteed employment, salary, visa, admission, or outcome claims anywhere in copy or generated content.

## Code rules

- No single file over roughly 600 lines. Split social-calendar-app.tsx by module.
- Explain each change in plain English before writing code.
- When asked for file contents, give full-file replacements, not fragments.

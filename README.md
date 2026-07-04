# UCC Marketing Strategy OS

A responsive Next.js web app for United Ceres College marketing operations. The app starts from business objectives and cascades into audiences, courses, platform strategy, campaigns, content planning, budget and resource planning, approval workflow, KPI tracking, compliance checking, reporting, and continuous performance improvement.

## What It Includes

- Objective-first workflow: objective -> audience -> course -> platform -> campaign -> content pillar -> calendar -> budget/resources -> KPI target -> actual results -> recommendation
- UCC course database for full-time, short, English, AI, business, hospitality, Future Master pathway, and ATO-related courses
- Audience database for PRC students, parents, adult learners, working adults, international students, agents, partners, employers, and Chinese-speaking audiences
- Platform-to-audience matching for TikTok, Instagram, YouTube Shorts, LinkedIn, Facebook, X/Twitter, Threads, Xiaohongshu, WeChat, fairs, roadshows, school visits, open house, partnerships, talks, flyers, and agent activities
- Campaign planning for course, audience, platform mix, timeline, owner, budget, KPI targets, actual results, and campaign status
- Offline activation board for agent work, campus visits, student events, roadshows, partnerships, talks, flyers, fairs, school visits, and open house
- Singapore marketing calendar intelligence with public holidays, cultural moments, school periods, intake periods, fairs, campus events, agent recruitment periods, 11.11, and 12.12
- Strategic narrative brief approval before content generation
- 30-day calendar builder with manager-added posts/events, true calendar view, filters, plan-vs-actual fields, approval stage, final asset link, published URL, KPI result, and follow-up action
- Production board with role-based views, platform playbooks, Daily Content Master, and strategy-brief-based copy generation
- KPI tracker for reach, leads, agent enquiries, applications, campus tours, cost per lead, conversion, enrolments, platform performance, campaign performance, and course-level performance
- Education marketing compliance checker for employment, salary, visa/work, admission, outcome, ranking, testimonial, and career-result risk
- Asset library for photos, videos, testimonials, course images, logos, templates, approved captions, and campaign assets
- English and Chinese planning support through audience, asset, campaign, and AI module data
- Live data connector settings for direct APIs where platform credentials and permissions are available, with CSV/PDF import fallback
- AI Skill Control Panel with separated strategy, calendar, copywriting, video, compliance, competitor, KPI, budget/resource, multilingual, campaign, and performance recommendation modules
- AI output review history with draft status, reviewer, compliance score, brand fit score, edit history, and approval actions
- CSV imports for courses, campaigns, calendar, KPI/leads, budget/resources, competitors, and assets
- PDF analytics upload, text/table extraction, metric parsing, editable import review, approval log, audit updates, KPI Tracker updates, and performance learning
- CSV pack export and Excel-compatible workbook export with UCC planning sheets
- Local storage persistence structured so a future Supabase adapter can replace the repository layer

## App Structure

```txt
app/
  layout.tsx                         Page metadata and root shell
  page.tsx                           App entry point
  api/pdf-data/extract/route.ts       Local PDF extraction and metric parsing endpoint
components/
  social-calendar/
    social-calendar-app.tsx          Main Strategy OS UI and reusable view components
  ui/                                Shared card, button, input, textarea, badge, progress primitives
lib/
  social-calendar-data.ts            Types, UCC seed data, generation, audit and performance logic
  pdf-data-import.ts                 PDF report metric text and table parser
  social-calendar-export.ts          CSV and Excel workbook export builders
  social-calendar-storage.ts         Local-storage repository adapter
scripts/
  extract_pdf_text.py                Local PDF text/table extraction helper
```

## Main Screens

- `Dashboard`: management summary, objective cascade, weekly snapshot, budget, approvals, and recommendations
- `Objectives`: social audit plus comprehensive goal/KPI settings that influence strategy, calendar, production, and reporting
- `Courses & Audiences`: UCC course database, proof points, compliance notes, and audience-channel matching
- `Campaigns`: campaign matrix, target vs actual tracking, and offline/non-digital activation board
- `Platform Strategy`: platform connectors, audience matching, marketing events, and AI Skill Control Panel
- `Strategy Brief`: monthly narrative brief and approval gate
- `Content Calendar`: calendar view, manager-added posts/events, plan-vs-actual fields, approval stage, final caption, asset, URL, KPI, and follow-up action
- `Production Board`: role-based workflow, platform playbooks, Daily Content Master, copywriting generator, and handoff views
- `Asset Library`: editable asset table for campaign and course materials
- `Budget & Resources`: campaign budget, team hours, staff, equipment, venue, printing, event, agent, and total cost
- `Competitors`: competitor tracking, content gaps, and whitespace opportunities
- `KPI Tracker`: planned targets versus actual results plus performance learning
- `Compliance`: education marketing risk checker and calendar watchlist
- `Reports`: weekly management reporting and exports
- `Settings`: brand setup, PDF analytics upload, platform connector settings, and CSV imports

## Run Locally

```bash
pnpm install
pnpm dev
```

Then open the local URL printed by Next.js, usually:

```txt
http://localhost:3000
```

## Build And Check

```bash
pnpm lint
pnpm build
```

## Import And Export

CSV import supports these main tables:

- Courses
- Campaigns
- Content calendar
- KPI results / leads
- Budget / resources
- Competitor tracking
- Asset library

The Excel-compatible workbook export includes:

- Overview
- Full Calendar
- Platform Sheets
- Video Scripts
- Weekly Handoff
- Performance Review
- Courses
- Audiences
- Campaigns
- Budget Resources
- Asset Library
- UCC KPI Tracker
- AI Skill Control
- PDF Import Log

The CSV export downloads the same sheet set as individual CSV files.

## Data And API Notes

The app persists to browser local storage through `localSocialCalendarRepository`. The shape is typed in `lib/social-calendar-data.ts`, so Supabase can be added later by implementing the same load/save/reset repository contract.

Live platform API rows are included for Facebook/Meta, Instagram, TikTok, LinkedIn, YouTube Shorts, X/Twitter, Threads, Xiaohongshu, and WeChat. Direct sync requires valid platform developer credentials, account permissions, and API access. Until those are available, use CSV/PDF import or manual entry.

The PDF report workflow stores PDF metadata and extracted text locally, not API credentials. It reads text and tables from analytics PDF reports, detects platform metrics, and sends the values to a review screen before applying. Users can edit detected values, approve rows, identify the reviewer/approver, then apply approved data to Social Audit, KPI Tracker, and Performance Learning. Scanned image-only PDFs show a warning that OCR or a text-based export is needed.

Recognized metrics include followers, impressions/views, reach, engagement/interactions, comments/replies, shares/reposts, saves/bookmarks, watch time, clicks, follows gained, leads, and post counts.

## QA Notes

PDF import was tested with three local QA files:

- Text-based analytics PDF: passed, extracted Instagram and LinkedIn metrics
- Table-heavy analytics PDF: passed, extracted TikTok, YouTube Shorts, and Facebook metrics
- Scanned/image-only PDF: passed warning path, returned a clear OCR/text-export message

AI skills are separated into controlled modules. Each module stores purpose, required inputs, expected output format, human approval step, error handling, compliance guardrails, status, input source, output destination, last used date, reviewer requirement, risk level, and saved output history.

## Compliance Guardrails

Education marketing compliance reminders are built into the strategy brief, calendar items, and compliance checker:

- Avoid guaranteed employment, salary, admission, visa, work, and course outcome claims
- Avoid unsupported rankings and superiority claims
- Avoid misleading testimonials
- Keep copy factual, proof-based, and tied to verified course details

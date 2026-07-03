# Supabase Schema

The initial schema lives in:

`supabase/migrations/20260625000000_initial_content_os_schema.sql`

It includes the requested core tables:

- `companies`
- `brands`
- `audiences`
- `competitors`
- `content_pillars`
- `content_angles`
- `series`
- `content_items`
- `production_tasks`
- `calendar_posts`
- `performance_metrics`
- `users`
- `team_roles`

It also adds the support tables needed to make every `content_items` row connect cleanly to the required operating dimensions:

- `business_goals`
- `platforms`
- `funnel_stages`
- `content_statuses`

Each `content_items` row requires:

- `business_goal_id`
- `audience_id`
- `content_angle_id`
- `series_id`
- `platform_id`
- `funnel_stage_id`
- `owner_id`
- `status_id`
- `due_date`
- `publish_date`

Performance data connects back through `performance_metrics.content_item_id`, allowing each content item to have many metric snapshots by platform and date.

Generated Content Engine flows are stored in:

- `content_engine_runs`

That table stores the strategy input, each structured output section, the full generated JSON, the OpenAI response id, and the model used.

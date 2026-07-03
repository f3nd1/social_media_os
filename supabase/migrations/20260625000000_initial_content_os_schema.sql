-- Content Operating System initial Supabase schema.
-- This migration defines the core multi-company content operations model.

create extension if not exists pgcrypto;
create extension if not exists citext;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table public.companies (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  website_url text,
  industry text,
  timezone text not null default 'UTC',
  settings jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  company_id uuid not null references public.companies(id) on delete cascade,
  full_name text not null,
  email citext not null,
  avatar_url text,
  status text not null default 'active'
    check (status in ('active', 'invited', 'disabled')),
  last_seen_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (email),
  unique (company_id, id)
);

create table public.team_roles (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  user_id uuid not null,
  role_name text not null,
  workspace text not null default 'all'
    check (
      workspace in (
        'all',
        'strategy',
        'content_engine',
        'production_hub',
        'content_calendar',
        'marketing_intelligence'
      )
    ),
  permissions jsonb not null default '{}'::jsonb,
  assigned_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (company_id, id),
  unique (company_id, user_id, role_name, workspace),
  foreign key (company_id, user_id)
    references public.users(company_id, id)
    on delete cascade,
  foreign key (company_id, assigned_by)
    references public.users(company_id, id)
    on delete restrict
);

create table public.brands (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  name text not null,
  slug text not null,
  positioning text,
  voice_guidelines text,
  primary_color text,
  website_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (company_id, id),
  unique (company_id, slug)
);

create table public.audiences (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  brand_id uuid,
  name text not null,
  segment text,
  persona_summary text,
  pains text[] not null default '{}',
  goals text[] not null default '{}',
  buying_triggers text[] not null default '{}',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (company_id, id),
  unique (company_id, brand_id, name),
  foreign key (company_id, brand_id)
    references public.brands(company_id, id)
    on delete cascade
);

create table public.competitors (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  brand_id uuid not null,
  name text not null,
  website_url text,
  social_profiles jsonb not null default '{}'::jsonb,
  positioning_notes text,
  strengths text[] not null default '{}',
  weaknesses text[] not null default '{}',
  watch_priority text not null default 'medium'
    check (watch_priority in ('low', 'medium', 'high')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (company_id, id),
  unique (company_id, brand_id, name),
  foreign key (company_id, brand_id)
    references public.brands(company_id, id)
    on delete cascade
);

create table public.business_goals (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  brand_id uuid,
  name text not null,
  goal_type text not null,
  target_value numeric(14, 2),
  target_unit text,
  starts_on date,
  ends_on date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (company_id, id),
  unique (company_id, brand_id, name),
  foreign key (company_id, brand_id)
    references public.brands(company_id, id)
    on delete cascade,
  check (ends_on is null or starts_on is null or ends_on >= starts_on)
);

create table public.platforms (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  name text not null,
  slug text not null,
  channel_type text not null default 'social',
  url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (company_id, id),
  unique (company_id, slug)
);

create table public.funnel_stages (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  name text not null,
  slug text not null,
  position integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (company_id, id),
  unique (company_id, slug)
);

create table public.content_statuses (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  name text not null,
  slug text not null,
  position integer not null default 0,
  is_terminal boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (company_id, id),
  unique (company_id, slug)
);

create table public.content_pillars (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  brand_id uuid not null,
  name text not null,
  slug text not null,
  description text,
  priority integer not null default 0,
  owner_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (company_id, id),
  unique (company_id, brand_id, slug),
  foreign key (company_id, brand_id)
    references public.brands(company_id, id)
    on delete cascade,
  foreign key (company_id, owner_id)
    references public.users(company_id, id)
    on delete restrict
);

create table public.content_angles (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  content_pillar_id uuid not null,
  audience_id uuid,
  name text not null,
  angle_type text,
  hook text,
  promise text,
  proof_points text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (company_id, id),
  unique (company_id, content_pillar_id, name),
  foreign key (company_id, content_pillar_id)
    references public.content_pillars(company_id, id)
    on delete cascade,
  foreign key (company_id, audience_id)
    references public.audiences(company_id, id)
    on delete restrict
);

create table public.series (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  brand_id uuid not null,
  content_pillar_id uuid,
  primary_audience_id uuid,
  owner_id uuid,
  name text not null,
  slug text not null,
  premise text,
  cadence text,
  starts_on date,
  ends_on date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (company_id, id),
  unique (company_id, brand_id, slug),
  foreign key (company_id, brand_id)
    references public.brands(company_id, id)
    on delete cascade,
  foreign key (company_id, content_pillar_id)
    references public.content_pillars(company_id, id)
    on delete restrict,
  foreign key (company_id, primary_audience_id)
    references public.audiences(company_id, id)
    on delete restrict,
  foreign key (company_id, owner_id)
    references public.users(company_id, id)
    on delete restrict,
  check (ends_on is null or starts_on is null or ends_on >= starts_on)
);

create table public.content_items (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  brand_id uuid not null,
  business_goal_id uuid not null,
  audience_id uuid not null,
  content_angle_id uuid not null,
  series_id uuid not null,
  platform_id uuid not null,
  funnel_stage_id uuid not null,
  owner_id uuid not null,
  status_id uuid not null,
  title text not null,
  slug text,
  summary text,
  format text not null default 'post',
  brief text,
  draft_url text,
  asset_url text,
  due_date date not null,
  publish_date date not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (company_id, id),
  unique (company_id, slug),
  foreign key (company_id, brand_id)
    references public.brands(company_id, id)
    on delete restrict,
  foreign key (company_id, business_goal_id)
    references public.business_goals(company_id, id)
    on delete restrict,
  foreign key (company_id, audience_id)
    references public.audiences(company_id, id)
    on delete restrict,
  foreign key (company_id, content_angle_id)
    references public.content_angles(company_id, id)
    on delete restrict,
  foreign key (company_id, series_id)
    references public.series(company_id, id)
    on delete restrict,
  foreign key (company_id, platform_id)
    references public.platforms(company_id, id)
    on delete restrict,
  foreign key (company_id, funnel_stage_id)
    references public.funnel_stages(company_id, id)
    on delete restrict,
  foreign key (company_id, owner_id)
    references public.users(company_id, id)
    on delete restrict,
  foreign key (company_id, status_id)
    references public.content_statuses(company_id, id)
    on delete restrict
);

create table public.production_tasks (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  content_item_id uuid not null,
  assigned_to uuid,
  created_by uuid,
  title text not null,
  description text,
  task_type text not null default 'production',
  status text not null default 'todo'
    check (status in ('todo', 'in_progress', 'blocked', 'review', 'done')),
  priority text not null default 'medium'
    check (priority in ('low', 'medium', 'high', 'urgent')),
  starts_at timestamptz,
  due_at timestamptz,
  completed_at timestamptz,
  dependencies jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (company_id, id),
  foreign key (company_id, content_item_id)
    references public.content_items(company_id, id)
    on delete cascade,
  foreign key (company_id, assigned_to)
    references public.users(company_id, id)
    on delete restrict,
  foreign key (company_id, created_by)
    references public.users(company_id, id)
    on delete restrict,
  check (due_at is null or starts_at is null or due_at >= starts_at)
);

create table public.calendar_posts (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  content_item_id uuid not null,
  platform_id uuid not null,
  scheduled_at timestamptz not null,
  published_at timestamptz,
  caption text,
  post_url text,
  status text not null default 'scheduled'
    check (status in ('draft', 'scheduled', 'published', 'failed', 'canceled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (company_id, id),
  foreign key (company_id, content_item_id)
    references public.content_items(company_id, id)
    on delete cascade,
  foreign key (company_id, platform_id)
    references public.platforms(company_id, id)
    on delete restrict
);

create table public.performance_metrics (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  content_item_id uuid not null,
  calendar_post_id uuid,
  platform_id uuid not null,
  metric_date date not null,
  impressions integer not null default 0 check (impressions >= 0),
  reach integer not null default 0 check (reach >= 0),
  engagement_count integer not null default 0 check (engagement_count >= 0),
  likes integer not null default 0 check (likes >= 0),
  comments integer not null default 0 check (comments >= 0),
  shares integer not null default 0 check (shares >= 0),
  saves integer not null default 0 check (saves >= 0),
  clicks integer not null default 0 check (clicks >= 0),
  conversions integer not null default 0 check (conversions >= 0),
  spend numeric(14, 2) not null default 0 check (spend >= 0),
  revenue numeric(14, 2) not null default 0 check (revenue >= 0),
  engagement_rate numeric(8, 4),
  click_through_rate numeric(8, 4),
  conversion_rate numeric(8, 4),
  notes text,
  source text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (company_id, id),
  unique (company_id, content_item_id, platform_id, metric_date),
  foreign key (company_id, content_item_id)
    references public.content_items(company_id, id)
    on delete cascade,
  foreign key (company_id, calendar_post_id)
    references public.calendar_posts(company_id, id)
    on delete restrict,
  foreign key (company_id, platform_id)
    references public.platforms(company_id, id)
    on delete restrict
);

comment on table public.content_items is
  'Core content record. Every row is required to connect to a business goal, audience, content angle, series, platform, funnel stage, owner, status, due date, and publish date.';

comment on table public.performance_metrics is
  'Performance metric snapshots connected to content_items. A content item can have many metric rows across platforms and dates.';

create index companies_slug_idx on public.companies(slug);
create index users_company_id_idx on public.users(company_id);
create index team_roles_company_user_idx on public.team_roles(company_id, user_id);
create index brands_company_id_idx on public.brands(company_id);
create index audiences_company_brand_idx on public.audiences(company_id, brand_id);
create index competitors_company_brand_idx on public.competitors(company_id, brand_id);
create index business_goals_company_brand_idx on public.business_goals(company_id, brand_id);
create index content_pillars_company_brand_idx on public.content_pillars(company_id, brand_id);
create index content_angles_company_pillar_idx on public.content_angles(company_id, content_pillar_id);
create index series_company_brand_idx on public.series(company_id, brand_id);
create index content_items_company_status_idx on public.content_items(company_id, status_id);
create index content_items_company_owner_idx on public.content_items(company_id, owner_id);
create index content_items_publish_date_idx on public.content_items(company_id, publish_date);
create index production_tasks_content_item_idx on public.production_tasks(company_id, content_item_id);
create index production_tasks_assigned_to_idx on public.production_tasks(company_id, assigned_to);
create index calendar_posts_scheduled_at_idx on public.calendar_posts(company_id, scheduled_at);
create index calendar_posts_content_item_idx on public.calendar_posts(company_id, content_item_id);
create index performance_metrics_content_item_idx on public.performance_metrics(company_id, content_item_id);
create index performance_metrics_metric_date_idx on public.performance_metrics(company_id, metric_date);

create trigger set_companies_updated_at
before update on public.companies
for each row execute function public.set_updated_at();

create trigger set_users_updated_at
before update on public.users
for each row execute function public.set_updated_at();

create trigger set_team_roles_updated_at
before update on public.team_roles
for each row execute function public.set_updated_at();

create trigger set_brands_updated_at
before update on public.brands
for each row execute function public.set_updated_at();

create trigger set_audiences_updated_at
before update on public.audiences
for each row execute function public.set_updated_at();

create trigger set_competitors_updated_at
before update on public.competitors
for each row execute function public.set_updated_at();

create trigger set_business_goals_updated_at
before update on public.business_goals
for each row execute function public.set_updated_at();

create trigger set_platforms_updated_at
before update on public.platforms
for each row execute function public.set_updated_at();

create trigger set_funnel_stages_updated_at
before update on public.funnel_stages
for each row execute function public.set_updated_at();

create trigger set_content_statuses_updated_at
before update on public.content_statuses
for each row execute function public.set_updated_at();

create trigger set_content_pillars_updated_at
before update on public.content_pillars
for each row execute function public.set_updated_at();

create trigger set_content_angles_updated_at
before update on public.content_angles
for each row execute function public.set_updated_at();

create trigger set_series_updated_at
before update on public.series
for each row execute function public.set_updated_at();

create trigger set_content_items_updated_at
before update on public.content_items
for each row execute function public.set_updated_at();

create trigger set_production_tasks_updated_at
before update on public.production_tasks
for each row execute function public.set_updated_at();

create trigger set_calendar_posts_updated_at
before update on public.calendar_posts
for each row execute function public.set_updated_at();

create trigger set_performance_metrics_updated_at
before update on public.performance_metrics
for each row execute function public.set_updated_at();

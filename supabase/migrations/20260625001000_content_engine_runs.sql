-- Stores generated Content Engine strategy flows and sectioned outputs.

create table public.content_engine_runs (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references public.companies(id) on delete cascade,
  created_by uuid references auth.users(id) on delete set null,
  input jsonb not null,
  brand_blueprint jsonb not null,
  audience_blueprint jsonb not null,
  content_angles jsonb not null,
  series_ideas jsonb not null,
  platform_adaptations jsonb not null,
  content_cards jsonb not null,
  full_output jsonb not null,
  openai_response_id text,
  model text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.content_engine_runs is
  'Generated Content Engine flow outputs from business goal through content execution.';

create index content_engine_runs_company_idx
  on public.content_engine_runs(company_id, created_at desc);

create trigger set_content_engine_runs_updated_at
before update on public.content_engine_runs
for each row execute function public.set_updated_at();

-- Workspace snapshot history for the backup panel (Module E1).
-- Keeps rolling versions of the whole workspace document so an accidental
-- overwrite through the open policy can be rolled back.
--
-- This is a SEPARATE table from workspace_state. Running it does not touch or
-- change workspace_state, so your live data is safe.
--
-- Run this in the Supabase SQL editor. It is safe to run more than once. The
-- open anon policies match the workspace_state table's trust model, accepted
-- for this prototype until authentication lands.

create table if not exists public.workspace_snapshots (
  id uuid primary key default gen_random_uuid(),
  workspace_id text not null default 'ucc-default',
  data jsonb not null,
  created_at timestamptz not null default now()
);

create index if not exists workspace_snapshots_created_idx
  on public.workspace_snapshots (workspace_id, created_at desc);

alter table public.workspace_snapshots enable row level security;

drop policy if exists "anon read snapshots" on public.workspace_snapshots;
create policy "anon read snapshots" on public.workspace_snapshots
  for select using (true);

drop policy if exists "anon insert snapshots" on public.workspace_snapshots;
create policy "anon insert snapshots" on public.workspace_snapshots
  for insert with check (true);

drop policy if exists "anon delete snapshots" on public.workspace_snapshots;
create policy "anon delete snapshots" on public.workspace_snapshots
  for delete using (true);

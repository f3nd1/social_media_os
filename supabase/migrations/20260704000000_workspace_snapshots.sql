-- Workspace snapshot history for the backup panel (Module E1).
-- Keeps rolling versions of the whole workspace document so an accidental
-- overwrite through the open policy can be rolled back.
--
-- Run this in the Supabase SQL editor. The open anon policies match the
-- workspace_state table's trust model, accepted for this prototype until
-- authentication lands.

create table public.workspace_snapshots (
  id uuid primary key default gen_random_uuid(),
  workspace_id text not null default 'ucc-default',
  data jsonb not null,
  created_at timestamptz not null default now()
);

create index workspace_snapshots_created_idx
  on public.workspace_snapshots (workspace_id, created_at desc);

alter table public.workspace_snapshots enable row level security;

create policy "anon read snapshots" on public.workspace_snapshots
  for select using (true);

create policy "anon insert snapshots" on public.workspace_snapshots
  for insert with check (true);

create policy "anon delete snapshots" on public.workspace_snapshots
  for delete using (true);

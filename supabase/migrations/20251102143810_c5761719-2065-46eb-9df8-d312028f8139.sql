-- 1) توسيع جدول التعارضات
alter table public.conflicts
  add column if not exists confidence numeric check (confidence between 0 and 1),
  add column if not exists suggested_action text,
  add column if not exists suggested_change jsonb,
  add column if not exists requires_consent boolean default false,
  add column if not exists decided_by uuid,
  add column if not exists applied_event_patch jsonb,
  add column if not exists undo_patch jsonb,
  add column if not exists notification_id bigint;

create index if not exists idx_conflicts_owner_status on public.conflicts(owner_id, status);

-- 2) سجل أفعال الأوتوبilot
create table if not exists public.autopilot_actions (
  id bigserial primary key,
  owner_id uuid not null,
  conflict_id bigint not null,
  action text not null,
  suggested_action text,
  confidence numeric,
  patch_before jsonb,
  patch_after jsonb,
  undo_token text unique,
  applied_at timestamptz not null default now()
);

alter table public.autopilot_actions enable row level security;

create policy autopilot_actions_rw on public.autopilot_actions
  for all
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

create index if not exists idx_autopilot_owner on public.autopilot_actions(owner_id, conflict_id);
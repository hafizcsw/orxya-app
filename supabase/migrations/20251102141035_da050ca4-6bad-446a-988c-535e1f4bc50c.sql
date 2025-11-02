-- Add retry management columns to events table
alter table public.events
  add column if not exists retry_count int not null default 0,
  add column if not exists next_retry_at timestamptz null,
  add column if not exists last_error text;

-- Indexes for retry queue
create index if not exists idx_events_pending_retry
  on public.events(pending_push, next_retry_at);

create index if not exists idx_events_owner_pending
  on public.events(owner_id, pending_push);

-- Push log table for diagnostics
create table if not exists public.push_log (
  id bigserial primary key,
  owner_id uuid not null,
  event_id uuid not null,
  attempted_at timestamptz not null default now(),
  status text not null check (status in ('ok','failed')),
  error text null
);

-- Enable RLS on push_log
alter table public.push_log enable row level security;

-- Policy for push_log
do $$
begin
  if not exists (
    select 1 from pg_policies 
    where schemaname='public' 
    and tablename='push_log' 
    and policyname='push_log_select_own'
  ) then
    create policy push_log_select_own 
      on public.push_log
      for select 
      using (owner_id = auth.uid());
  end if;
end$$;
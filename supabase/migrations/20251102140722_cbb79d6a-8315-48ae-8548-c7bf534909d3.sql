-- Enable write-back to Google Calendar (optional per user)
alter table public.profiles
  add column if not exists calendar_writeback boolean not null default false;

-- Track write-back status in events table
alter table public.events
  add column if not exists last_push_status text,
  add column if not exists last_push_at timestamptz,
  add column if not exists pending_push boolean not null default false,
  add column if not exists version int not null default 0;

-- Index for external events
create index if not exists idx_events_owner_external 
  on public.events(owner_id, external_source, external_calendar_id, external_event_id);

-- Index for pending pushes
create index if not exists idx_events_pending_push 
  on public.events(owner_id, pending_push) 
  where pending_push = true;
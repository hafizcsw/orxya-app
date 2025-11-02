-- Performance indexes for calendar queries
create index if not exists idx_events_owner_start 
  on public.events(owner_id, starts_at);

create index if not exists idx_events_owner_end 
  on public.events(owner_id, ends_at);
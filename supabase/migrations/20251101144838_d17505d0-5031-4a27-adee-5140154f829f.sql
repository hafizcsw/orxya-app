-- Block 15: Events, Conflicts, External Accounts + RLS
-- Extension pg_trgm (للبحث النصي إن احتجنا لاحقًا)
create extension if not exists pg_trgm;

-- EVENTS table
create table if not exists events (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  source_id text default 'local',
  external_event_id text,
  external_etag text,
  last_write_origin text check (last_write_origin in ('ai','user','sync')) default 'user',
  is_ai_created boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists idx_events_owner_starts on events(owner_id, starts_at);
create unique index if not exists ux_events_owner_src_eid on events(owner_id, source_id, external_event_id) 
  where external_event_id is not null;

-- TASKS link to events
alter table tasks add column if not exists event_id uuid references events(id) on delete set null;
create index if not exists idx_tasks_event on tasks(event_id);

-- CONFLICTS table
create table if not exists conflicts (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  date_iso date not null,
  prayer_name text not null,
  prayer_start timestamptz not null,
  prayer_end timestamptz not null,
  object_kind text check (object_kind in ('event','task')) not null,
  object_id uuid not null,
  overlap_min int not null,
  status text check (status in ('open','proposed','resolved','dismissed')) default 'open',
  resolution text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists idx_conflicts_owner_date on conflicts(owner_id, date_iso);
create index if not exists idx_conflicts_owner_status on conflicts(owner_id, status);

-- EXTERNAL ACCOUNTS (OAuth tokens مشفّرة)
create table if not exists external_accounts (
  owner_id uuid not null references auth.users(id) on delete cascade,
  provider text not null check (provider in ('google','microsoft')),
  scopes text[] not null,
  access_token_enc bytea not null,
  refresh_token_enc bytea,
  expires_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  primary key (owner_id, provider)
);

-- LOCATION SAMPLES (اختياري - للتتبع)
create table if not exists location_samples (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  latitude numeric not null,
  longitude numeric not null,
  accuracy_m numeric,
  recorded_at timestamptz default now()
);

create index if not exists idx_location_samples_owner on location_samples(owner_id, recorded_at desc);

-- RLS Policies
alter table events enable row level security;
alter table conflicts enable row level security;
alter table external_accounts enable row level security;
alter table location_samples enable row level security;

create policy "events_owner_rw" on events 
  for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());

create policy "conflicts_owner_rw" on conflicts 
  for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());

create policy "external_accounts_owner_rw" on external_accounts 
  for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());

create policy "location_samples_owner_rw" on location_samples 
  for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());
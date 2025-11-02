-- 18.0 ENUMs
do $$
begin
  if not exists (select 1 from pg_type where typname = 'ai_role') then
    create type ai_role as enum ('system','user','assistant','tool');
  end if;
end
$$;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'ai_action_status') then
    create type ai_action_status as enum ('queued','running','done','failed');
  end if;
end
$$;

-- 18.1 جلسات ومحادثات
create table if not exists ai_sessions_v2 (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null,
  title text default 'Assistant',
  persona text default 'orchestrator',
  created_at timestamptz default now(),
  last_active_at timestamptz default now()
);

create index if not exists idx_ai_sessions_v2_owner on ai_sessions_v2(owner_id);
alter table ai_sessions_v2 enable row level security;

drop policy if exists ai_sessions_v2_is_owner on ai_sessions_v2;
create policy ai_sessions_v2_is_owner on ai_sessions_v2
  for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());

create table if not exists ai_messages_v2 (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references ai_sessions_v2(id) on delete cascade,
  role text not null,
  content jsonb not null,
  token_count int,
  created_at timestamptz default now()
);

create index if not exists idx_ai_messages_v2_session on ai_messages_v2(session_id, created_at);
alter table ai_messages_v2 enable row level security;

drop policy if exists ai_messages_v2_is_owner on ai_messages_v2;
create policy ai_messages_v2_is_owner on ai_messages_v2
  for all using (
    session_id in (select id from ai_sessions_v2 where owner_id = auth.uid())
  );

-- 18.2 طابور أفعال AI
create table if not exists ai_action_queue (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null,
  session_id uuid references ai_sessions_v2(id) on delete set null,
  action_type text not null,
  payload jsonb not null,
  status text default 'queued',
  error text,
  run_at timestamptz default now(),
  created_at timestamptz default now(),
  finished_at timestamptz
);

create index if not exists idx_ai_action_owner_status on ai_action_queue(owner_id, status, run_at);
alter table ai_action_queue enable row level security;

drop policy if exists ai_action_is_owner on ai_action_queue;
create policy ai_action_is_owner on ai_action_queue
  for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());

-- 18.3 موافقات الصلاحيات
create table if not exists ai_consent (
  owner_id uuid not null,
  scope text not null,
  granted boolean not null default false,
  granted_at timestamptz,
  expires_at timestamptz,
  metadata jsonb,
  primary key(owner_id, scope)
);

alter table ai_consent enable row level security;

drop policy if exists ai_consent_is_owner on ai_consent;
create policy ai_consent_is_owner on ai_consent
  for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());

-- 18.4 فهارس بحث
create index if not exists idx_ai_messages_v2_content_gin on ai_messages_v2 using gin (content jsonb_path_ops);
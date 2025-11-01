-- ai_sessions: محادثات الوكيل
create table if not exists public.ai_sessions (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  title text,
  is_archived boolean not null default false,
  created_at timestamptz not null default now(),
  last_activity timestamptz not null default now()
);

alter table public.ai_sessions enable row level security;

create index if not exists idx_ai_sessions_owner on public.ai_sessions(owner_id);
create index if not exists idx_ai_sessions_last on public.ai_sessions(last_activity desc);

-- RLS policies for ai_sessions
create policy ai_sessions_sel on public.ai_sessions
  for select using (owner_id = auth.uid());
create policy ai_sessions_ins on public.ai_sessions
  for insert with check (owner_id = auth.uid());
create policy ai_sessions_upd on public.ai_sessions
  for update using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy ai_sessions_del on public.ai_sessions
  for delete using (owner_id = auth.uid());

-- ai_messages: سجل الرسائل والأدوات
create table if not exists public.ai_messages (
  id bigserial primary key,
  session_id uuid not null references public.ai_sessions(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('system','user','assistant','tool')),
  content jsonb not null,
  created_at timestamptz not null default now()
);

alter table public.ai_messages enable row level security;

create index if not exists idx_ai_messages_session on public.ai_messages(session_id, created_at);
create index if not exists idx_ai_messages_owner on public.ai_messages(owner_id);

-- RLS policies for ai_messages
create policy ai_messages_sel on public.ai_messages
  for select using (owner_id = auth.uid());
create policy ai_messages_ins on public.ai_messages
  for insert with check (owner_id = auth.uid());
create policy ai_messages_del on public.ai_messages
  for delete using (owner_id = auth.uid());

-- Add tags to events if not exists
alter table public.events
  add column if not exists tags text[] default '{}';

create index if not exists idx_events_owner_time on public.events(owner_id, starts_at);
create index if not exists idx_events_tags on public.events using gin (tags);
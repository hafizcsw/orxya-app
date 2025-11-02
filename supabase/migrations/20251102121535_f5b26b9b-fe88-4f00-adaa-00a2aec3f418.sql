-- Block 21: Planner Agent - Schema

-- جدول خيوط المحادثة
create table if not exists agent_threads (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null,
  kind text not null check (kind in ('planner')),
  title text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_agent_threads_owner 
  on agent_threads(owner_id, updated_at desc);

-- جدول رسائل المحادثة
create table if not exists agent_messages (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null references agent_threads(id) on delete cascade,
  owner_id uuid not null,
  role text not null check (role in ('user','assistant','tool')),
  content jsonb not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_agent_msgs_thread 
  on agent_messages(thread_id, created_at asc);

-- RLS
alter table agent_threads enable row level security;
alter table agent_messages enable row level security;

create policy "Users can view their own threads"
  on agent_threads for select
  using (owner_id = auth.uid());

create policy "Users can manage their own threads"
  on agent_threads for all
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

create policy "Users can view their own messages"
  on agent_messages for select
  using (owner_id = auth.uid());

create policy "Users can insert their own messages"
  on agent_messages for insert
  with check (owner_id = auth.uid());

-- Feature flags للـ Agent
insert into feature_flags (key, enabled, pilot_user_ids)
values 
  ('agent.planner_enabled', false, '{}')
on conflict (key) do nothing;
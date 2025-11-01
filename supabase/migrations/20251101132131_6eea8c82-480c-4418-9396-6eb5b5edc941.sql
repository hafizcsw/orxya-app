-- Block 13: Projects & Tasks tables with RLS

-- Create projects table
create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null,
  title text not null,
  status text not null default 'Active',
  priority text default 'High',
  target text,
  deadline date,
  next_action text,
  notes text,
  created_at timestamptz default now()
);

-- Create tasks table
create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null,
  project_id uuid not null,
  title text not null,
  status text not null default 'todo',
  order_pos numeric not null default 0,
  due_date date,
  created_at timestamptz default now()
);

-- Enable RLS
alter table public.projects enable row level security;
alter table public.tasks enable row level security;

-- Projects policies
do $$
begin
  if not exists (select 1 from pg_policies where tablename='projects' and policyname='prj_sel') then
    create policy prj_sel on public.projects for select using (owner_id = auth.uid());
  end if;
  if not exists (select 1 from pg_policies where tablename='projects' and policyname='prj_ins') then
    create policy prj_ins on public.projects for insert with check (owner_id = auth.uid());
  end if;
  if not exists (select 1 from pg_policies where tablename='projects' and policyname='prj_upd') then
    create policy prj_upd on public.projects for update using (owner_id = auth.uid());
  end if;
  if not exists (select 1 from pg_policies where tablename='projects' and policyname='prj_del') then
    create policy prj_del on public.projects for delete using (owner_id = auth.uid());
  end if;
end $$;

-- Tasks policies
do $$
begin
  if not exists (select 1 from pg_policies where tablename='tasks' and policyname='tsk_sel') then
    create policy tsk_sel on public.tasks for select using (owner_id = auth.uid());
  end if;
  if not exists (select 1 from pg_policies where tablename='tasks' and policyname='tsk_ins') then
    create policy tsk_ins on public.tasks for insert with check (owner_id = auth.uid());
  end if;
  if not exists (select 1 from pg_policies where tablename='tasks' and policyname='tsk_upd') then
    create policy tsk_upd on public.tasks for update using (owner_id = auth.uid());
  end if;
  if not exists (select 1 from pg_policies where tablename='tasks' and policyname='tsk_del') then
    create policy tsk_del on public.tasks for delete using (owner_id = auth.uid());
  end if;
end $$;

-- Indexes
create index if not exists ix_tasks_owner_project on public.tasks(owner_id, project_id);
create index if not exists ix_tasks_order on public.tasks(project_id, status, order_pos);
create index if not exists ix_projects_owner on public.projects(owner_id);

-- Additional prayer_times indexes (confirmation)
create unique index if not exists ux_prayer_times_owner_date on public.prayer_times(owner_id, date_iso);
create index if not exists ix_prayer_times_date on public.prayer_times(date_iso);
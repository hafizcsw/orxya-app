-- === CORE TABLES ===
create table if not exists profiles (
  id uuid primary key default auth.uid(),
  full_name text,
  tz text default 'Asia/Dubai',
  created_at timestamptz default now()
);

create table if not exists projects (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null,
  title text not null,
  target text,
  deadline date,
  priority text check (priority in ('Critical','High','Medium','Low')) default 'High',
  status text default 'Active',
  next_action text,
  notes text,
  created_at timestamptz default now()
);

create table if not exists daily_logs (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null,
  log_date date not null,
  work_hours numeric(4,1) default 0,
  study_hours numeric(4,1) default 0,
  mma_hours numeric(4,1) default 0,
  walk_min int default 0,
  project_focus text,
  weight_kg numeric(5,2),
  notes text,
  created_at timestamptz default now()
);

create table if not exists finance_entries (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null,
  entry_date date not null,
  category text,
  type text check (type in ('income','spend')) not null,
  amount_usd numeric(12,2) not null,
  source text,
  note text,
  created_at timestamptz default now()
);

create table if not exists sales (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null,
  sale_date date not null,
  type text check (type in ('scholarship','villa','other')),
  item text,
  qty int default 1,
  price_usd numeric(12,2) default 0,
  profit_usd numeric(12,2) default 0,
  created_at timestamptz default now()
);

create table if not exists prayer_times (
  day date primary key,
  fajr time,
  sunrise time,
  dhuhr time,
  asr time,
  maghrib time,
  isha time
);

-- === AI & OPS ===
create table if not exists command_audit (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null,
  command_type text not null,
  idempotency_key text unique,
  payload jsonb not null,
  result jsonb,
  created_at timestamptz default now()
);

create table if not exists notifications (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null,
  label text,
  rrule text,
  time_local time,
  enabled boolean default true,
  created_at timestamptz default now()
);

-- === INDEXES ===
create index if not exists idx_projects_owner on projects(owner_id);
create index if not exists idx_projects_deadline on projects(deadline);
create index if not exists idx_daily_logs_owner_date on daily_logs(owner_id, log_date);
create index if not exists idx_finance_entries_owner_date on finance_entries(owner_id, entry_date);
create index if not exists idx_sales_owner_date on sales(owner_id, sale_date);
create index if not exists idx_notifications_owner on notifications(owner_id);
create index if not exists idx_audit_idem on command_audit(idempotency_key);
create index if not exists idx_audit_owner_created on command_audit(owner_id, created_at);

-- === RLS ENABLE ===
alter table profiles enable row level security;
alter table projects enable row level security;
alter table daily_logs enable row level security;
alter table finance_entries enable row level security;
alter table sales enable row level security;
alter table command_audit enable row level security;
alter table notifications enable row level security;

-- === RLS POLICIES ===
create policy "profiles owner read/write"
on profiles for all
using (id = auth.uid()) with check (id = auth.uid());

create policy "owner read/write projects"
on projects for all
using (owner_id = auth.uid()) with check (owner_id = auth.uid());

create policy "owner read/write daily_logs"
on daily_logs for all
using (owner_id = auth.uid()) with check (owner_id = auth.uid());

create policy "owner read/write finance_entries"
on finance_entries for all
using (owner_id = auth.uid()) with check (owner_id = auth.uid());

create policy "owner read/write sales"
on sales for all
using (owner_id = auth.uid()) with check (owner_id = auth.uid());

create policy "owner read/write audit"
on command_audit for all
using (owner_id = auth.uid()) with check (owner_id = auth.uid());

create policy "owner read/write notifications"
on notifications for all
using (owner_id = auth.uid()) with check (owner_id = auth.uid());
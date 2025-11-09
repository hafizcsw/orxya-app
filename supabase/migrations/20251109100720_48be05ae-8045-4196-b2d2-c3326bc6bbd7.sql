-- AI Intelligence Layer Tables (Fixed v2)

-- 1) pgvector for embeddings
create extension if not exists vector;

-- 2) signals_daily table for health/activity metrics
create table if not exists public.signals_daily (
  id bigserial primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  date date not null,
  metric text not null,
  source text,
  value numeric,
  extra jsonb,
  created_at timestamptz default now(),
  unique (user_id, date, metric, source)
);
alter table public.signals_daily enable row level security;

drop policy if exists "signals_daily_rw_own" on public.signals_daily;
create policy "signals_daily_rw_own"
on public.signals_daily for all
using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- 3) user_metrics_baseline for HRV baselines
create table if not exists public.user_metrics_baseline (
  id bigserial primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  metric text not null,
  source text,
  n_days int,
  avg numeric,
  stddev numeric,
  updated_at timestamptz default now(),
  unique (user_id, metric, source)
);
alter table public.user_metrics_baseline enable row level security;

drop policy if exists "user_metrics_baseline_rw_own" on public.user_metrics_baseline;
create policy "user_metrics_baseline_rw_own"
on public.user_metrics_baseline for all
using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- 4) signals_raw for health data ingestion
create table if not exists public.signals_raw (
  id bigserial primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  metric text not null,
  source text not null,
  start_at timestamptz not null,
  end_at timestamptz not null,
  value numeric not null,
  inserted_at timestamptz default now()
);
alter table public.signals_raw enable row level security;

drop policy if exists "signals_raw_rw_own" on public.signals_raw;
create policy "signals_raw_rw_own"
on public.signals_raw for all
using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- 5) AI policy embeddings
create table if not exists public.ai_policy_embeddings (
  policy_id bigint primary key,
  embedding vector(1536),
  updated_at timestamptz default now()
);
alter table public.ai_policy_embeddings enable row level security;

drop policy if exists "ai_policy_emb_select_auth" on public.ai_policy_embeddings;
create policy "ai_policy_emb_select_auth"
on public.ai_policy_embeddings for select using (auth.role() = 'authenticated');

-- 6) AI cache
create table if not exists public.ai_cache (
  cache_key text primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  payload jsonb not null,
  created_at timestamptz default now(),
  expires_at timestamptz not null
);
alter table public.ai_cache enable row level security;

drop policy if exists "ai_cache_rw_own" on public.ai_cache;
create policy "ai_cache_rw_own"
on public.ai_cache for all
using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- 7) AI calls log
create table if not exists public.ai_calls_log (
  id bigserial primary key,
  user_id uuid references public.profiles(id) on delete cascade,
  route text not null,
  model text,
  tokens_in int,
  tokens_out int,
  cost_usd numeric(10,4),
  latency_ms int,
  cached boolean default false,
  created_at timestamptz default now()
);
alter table public.ai_calls_log enable row level security;

drop policy if exists "ai_calls_log_select_own" on public.ai_calls_log;
create policy "ai_calls_log_select_own"
on public.ai_calls_log for select using (auth.uid() = user_id);

-- 8) AI quota
create table if not exists public.ai_quota (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  daily_calls_limit int not null default 50,
  daily_calls_used int not null default 0,
  window_start date not null default current_date
);
alter table public.ai_quota enable row level security;

drop policy if exists "ai_quota_rw_own" on public.ai_quota;
create policy "ai_quota_rw_own"
on public.ai_quota for all
using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- 9) Calendar events mirror
create table if not exists public.calendar_events_mirror (
  id bigserial primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  provider text not null check (provider in ('google')),
  external_id text not null,
  start_at timestamptz not null,
  end_at timestamptz not null,
  summary text,
  meta jsonb,
  updated_at timestamptz default now(),
  unique (user_id, provider, external_id)
);
alter table public.calendar_events_mirror enable row level security;

drop policy if exists "calendar_mirror_rw_own" on public.calendar_events_mirror;
create policy "calendar_mirror_rw_own"
on public.calendar_events_mirror for all
using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Indexes
create index if not exists idx_calendar_mirror_time on public.calendar_events_mirror(user_id, start_at, end_at);
create index if not exists idx_signals_daily_lookup on public.signals_daily(user_id, date, metric);
create index if not exists idx_signals_raw_user_time on public.signals_raw(user_id, start_at);

-- Helper function to increment AI quota
create or replace function public.increment_ai_quota(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.ai_quota
  set daily_calls_used = daily_calls_used + 1
  where user_id = p_user_id;
  
  if not found then
    insert into public.ai_quota (user_id, daily_calls_used)
    values (p_user_id, 1);
  end if;
end;
$$;
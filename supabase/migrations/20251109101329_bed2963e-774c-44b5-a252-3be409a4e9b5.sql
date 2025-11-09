-- Order 6: Nutrition/Health UX + Onboarding Tables

-- user_metrics_baseline table
create table if not exists public.user_metrics_baseline (
  user_id uuid not null references public.profiles(id) on delete cascade,
  metric text not null,
  source text not null,
  n_days int not null default 0,
  avg double precision,
  stddev double precision,
  updated_at timestamptz default now(),
  primary key (user_id, metric, source)
);

alter table public.user_metrics_baseline enable row level security;

drop policy if exists "user_metrics_baseline_rw_own" on public.user_metrics_baseline;
create policy "user_metrics_baseline_rw_own"
on public.user_metrics_baseline for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

-- meals_log table
create table if not exists public.meals_log (
  id bigserial primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  occurred_at timestamptz not null default now(),
  input_text text not null,
  quantity text,
  kcal int,
  carbs_g int,
  fat_g int,
  protein_g int,
  confidence real,
  source_db text,
  meta jsonb,
  created_at timestamptz default now()
);

alter table public.meals_log enable row level security;

drop policy if exists "meals_log_rw_own" on public.meals_log;
create policy "meals_log_rw_own"
on public.meals_log for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

-- Index for faster date-based queries
create index if not exists idx_meals_log_user_date 
on public.meals_log(user_id, occurred_at desc);
-- profiles: إضافة أعمدة إعدادات
alter table if exists public.profiles
  add column if not exists full_name text,
  add column if not exists currency text default 'USD'::text,
  add column if not exists timezone text default 'Asia/Dubai'::text,
  add column if not exists telemetry_enabled boolean default true;

-- فهارس خفيفة
create index if not exists idx_profiles_uid on public.profiles (id);
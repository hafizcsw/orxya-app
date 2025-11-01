-- Patch 18 - Profile UI preferences
alter table public.profiles
  add column if not exists theme_pref text check (theme_pref in ('light','dark','system')) default 'system',
  add column if not exists density_pref text check (density_pref in ('comfortable','compact')) default 'comfortable',
  add column if not exists accent_color text default '#0ea5e9';

create index if not exists idx_profiles_theme on public.profiles(theme_pref);
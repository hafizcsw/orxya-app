-- 1) Store Google calendars list for each user
create table if not exists public.external_calendars (
  id bigserial primary key,
  owner_id uuid not null,
  provider text not null default 'google',
  calendar_id text not null,
  calendar_name text not null,
  access_role text,
  primary_flag boolean not null default false,
  color text,
  selected boolean not null default false,
  synced_at timestamptz not null default now(),
  unique (owner_id, provider, calendar_id)
);

alter table public.external_calendars enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies 
    where schemaname='public' 
    and tablename='external_calendars' 
    and policyname='external_calendars_select_own'
  ) then
    create policy external_calendars_select_own 
      on public.external_calendars
      for select 
      using (owner_id = auth.uid());
  end if;
end$$;

create index if not exists idx_extc_owner 
  on public.external_calendars(owner_id, provider);

-- 2) Calendar mapping for different event kinds
create table if not exists public.calendar_mapping (
  id bigserial primary key,
  owner_id uuid not null,
  kind text not null,
  provider text not null default 'google',
  calendar_id text not null,
  unique (owner_id, kind)
);

alter table public.calendar_mapping enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies 
    where schemaname='public' 
    and tablename='calendar_mapping' 
    and policyname='calendar_mapping_crud_own'
  ) then
    create policy calendar_mapping_crud_own 
      on public.calendar_mapping
      for all
      using (owner_id = auth.uid()) 
      with check (owner_id = auth.uid());
  end if;
end$$;

create index if not exists idx_cmap_owner_kind 
  on public.calendar_mapping(owner_id, kind);

-- 3) Default calendar settings in profiles
alter table public.profiles
  add column if not exists default_calendar_provider text,
  add column if not exists default_calendar_id text,
  add column if not exists default_calendar_name text;

-- 4) Trigger to auto-fill calendar_id on new events
create or replace function public.fn_events_fill_calendar()
returns trigger language plpgsql as $$
declare
  dest text;
begin
  if new.external_calendar_id is not null then
    return new;
  end if;

  -- Try mapping by kind from meta
  if new.meta is not null and new.meta ? 'kind' then
    select calendar_id into dest
    from public.calendar_mapping
    where owner_id = new.owner_id
      and kind = (new.meta->>'kind')
    limit 1;
  end if;

  -- Fallback to default calendar
  if dest is null then
    select default_calendar_id into dest
    from public.profiles 
    where id = new.owner_id;
  end if;

  if dest is not null then
    new.external_source := coalesce(new.external_source, 'google');
    new.external_calendar_id := dest;
  end if;

  return new;
end$$;

drop trigger if exists trg_events_fill_calendar on public.events;
create trigger trg_events_fill_calendar
  before insert on public.events
  for each row 
  execute function public.fn_events_fill_calendar();
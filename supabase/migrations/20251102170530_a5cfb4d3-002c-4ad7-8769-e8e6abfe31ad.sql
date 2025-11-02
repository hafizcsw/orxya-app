-- 2.1 Extensions
create extension if not exists pg_trgm;

-- 2.2 Events table enhancements
alter table events add column if not exists source text check (source in ('local','external','ai')) default 'local';
alter table events add column if not exists ai_confidence numeric check (ai_confidence between 0 and 1);
alter table events add column if not exists is_all_day boolean default false;
alter table events add column if not exists notify_channel text[] default '{}';
alter table events add column if not exists deleted_at timestamptz;

-- 2.3 Conflicts enhancements
alter table conflicts add column if not exists severity text check (severity in ('info','warn','block')) default 'warn';
alter table conflicts add column if not exists conflict_date date;
alter table conflicts add column if not exists slot_name text;

-- Indexes for performance
create index if not exists idx_conflicts_owner_status on conflicts(owner_id, status);
create index if not exists idx_conflicts_date on conflicts(conflict_date);
create index if not exists idx_events_owner_time on events(owner_id, starts_at, ends_at);
create index if not exists idx_events_title_trgm on events using gin (title gin_trgm_ops);
create index if not exists idx_events_status on events(status) where deleted_at is null;

-- 2.4 Trigger function for conflict refresh
create or replace function fn_refresh_conflicts_for_date(p_owner uuid, p_date date)
returns void language plpgsql as $$
begin
  raise notice 'refresh request queued for %, %', p_owner, p_date;
end $$;

create or replace function trg_events_conflicts_refresh()
returns trigger language plpgsql as $$
declare d date;
begin
  if new.starts_at is not null then
    d := (new.starts_at at time zone 'UTC')::date;
    perform fn_refresh_conflicts_for_date(new.owner_id, d);
  end if;
  return new;
end $$;

drop trigger if exists events_conflicts_refresh on events;
create trigger events_conflicts_refresh
after insert or update of starts_at, ends_at, deleted_at on events
for each row execute function trg_events_conflicts_refresh();
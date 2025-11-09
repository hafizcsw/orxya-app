-- Order 7: Security & Compliance Layer
-- RLS Status Views, Audit Log, Privacy Consents

begin;

-- 1) Security schema for admin views
create schema if not exists sec;

-- 2) RLS status view for all public tables
create or replace view sec.rls_status as
select
  n.nspname as schema,
  c.relname as table,
  c.relrowsecurity as rls_enabled,
  exists (
    select 1 from pg_policies p
    where p.schemaname = n.nspname and p.tablename = c.relname
  ) as has_policy
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where c.relkind = 'r' and n.nspname = 'public'
order by 1,2;

-- 3) Tables with user_id (candidates for self-ownership policy)
create or replace view sec.user_tables as
select c.relname as table_name
from pg_class c
join pg_namespace n on n.oid=c.relnamespace
where c.relkind='r'
  and n.nspname='public'
  and exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name=c.relname and column_name='user_id'
  );

-- 4) Audit log table
create table if not exists public.audit_log (
  id bigserial primary key,
  at timestamptz not null default now(),
  user_id uuid,
  action text not null,
  table_name text not null,
  row_pk text,
  details jsonb
);

alter table public.audit_log enable row level security;

drop policy if exists audit_read_own on public.audit_log;
create policy audit_read_own on public.audit_log
for select using (auth.uid() = user_id);

drop policy if exists audit_block_mut on public.audit_log;
create policy audit_block_mut on public.audit_log
for all using (false) with check (false);

-- 5) Audit trigger function
create or replace function sec.audit_row()
returns trigger language plpgsql security definer set search_path=public, pg_temp as $$
begin
  insert into public.audit_log(user_id, action, table_name, row_pk, details)
  values (
    auth.uid(), 
    tg_op, 
    tg_table_name,
    coalesce((case when tg_op in ('INSERT','UPDATE') then new.id::text else old.id::text end), null),
    jsonb_build_object(
      'new', case when tg_op in ('INSERT','UPDATE') then to_jsonb(new) - 'input_text' else null end,
      'old', case when tg_op = 'UPDATE' then to_jsonb(old) - 'input_text' when tg_op='DELETE' then to_jsonb(old) - 'input_text' else null end
    )
  );
  return coalesce(new, old);
end $$;

-- 6) Privacy consents table
create table if not exists public.privacy_consents (
  id bigserial primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  consent_type text not null,
  granted boolean not null,
  at timestamptz not null default now(),
  meta jsonb
);

alter table public.privacy_consents enable row level security;

drop policy if exists privacy_consents_rw_own on public.privacy_consents;
create policy privacy_consents_rw_own on public.privacy_consents
for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- 7) Attach audit triggers to sensitive tables
drop trigger if exists tr_audit_fin on public.financial_events;
create trigger tr_audit_fin after insert or update or delete on public.financial_events
for each row execute function sec.audit_row();

drop trigger if exists tr_audit_sig on public.signals_daily;
create trigger tr_audit_sig after insert or update or delete on public.signals_daily
for each row execute function sec.audit_row();

drop trigger if exists tr_audit_meals on public.meals_log;
create trigger tr_audit_meals after insert or update or delete on public.meals_log
for each row execute function sec.audit_row();

drop trigger if exists tr_audit_events on public.events;
create trigger tr_audit_events after insert or update or delete on public.events
for each row execute function sec.audit_row();

commit;
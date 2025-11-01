-- Block 16: تحديثات على الجداول لدعم location-update و conflict-check

-- إضافة أعمدة للـ location_samples
alter table location_samples 
  add column if not exists source text default 'client',
  add column if not exists sampled_at timestamptz default now();

-- تحديث الفهرس
drop index if exists idx_location_samples_owner;
create index if not exists idx_location_samples_owner_sampled 
  on location_samples(owner_id, sampled_at desc);

-- إضافة أعمدة للـ conflicts
alter table conflicts 
  add column if not exists severity text check (severity in ('hard','soft')) default 'hard',
  add column if not exists buffer_min integer default 30,
  add column if not exists suggested_start_iso timestamptz,
  add column if not exists event_id uuid references events(id) on delete cascade;

-- تحديث object_id ليكون nullable (لأننا سنستخدم event_id بدلاً منه)
alter table conflicts alter column object_id drop not null;

-- إضافة unique constraint لمنع التكرار
create unique index if not exists ux_conflicts_owner_event_date_prayer 
  on conflicts(owner_id, event_id, date_iso, prayer_name) 
  where event_id is not null;

-- إضافة أعمدة للـ events
alter table events 
  add column if not exists duration_min integer default 30,
  add column if not exists description text;

-- إضافة أعمدة للـ profiles (location_updated_at)
alter table profiles 
  add column if not exists location_updated_at timestamptz;

-- تحديث المواقع الموجودة
update profiles 
set location_updated_at = created_at 
where location_updated_at is null and (latitude is not null or longitude is not null);
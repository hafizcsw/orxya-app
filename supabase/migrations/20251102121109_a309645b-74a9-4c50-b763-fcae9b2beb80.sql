-- Block 20: Unified Alarms - Schema Updates

-- تحديثات profiles للتحكم بالتنبيهات
alter table if exists profiles
  add column if not exists dnd_enabled boolean default false,
  add column if not exists dnd_start time,
  add column if not exists dnd_end time,
  add column if not exists respect_prayer boolean default true,
  add column if not exists wa_opt_in boolean default false,
  add column if not exists wa_phone text;

-- تحديث جدول notifications ليصبح موحداً
alter table if exists notifications
  add column if not exists channel text check (channel in ('local','wa')) default 'local',
  add column if not exists status text check (status in ('scheduled','sent','failed','canceled','skipped')) default 'scheduled',
  add column if not exists scheduled_at timestamptz,
  add column if not exists title text,
  add column if not exists body text,
  add column if not exists entity_type text check (entity_type in ('event','task')),
  add column if not exists entity_id uuid,
  add column if not exists priority int default 0,
  add column if not exists mute_while_prayer boolean default true,
  add column if not exists payload jsonb,
  add column if not exists error text,
  add column if not exists sent_at timestamptz;

-- فهارس لتحسين الأداء
create index if not exists idx_notifications_due 
  on notifications(owner_id, status, scheduled_at);

create index if not exists idx_notifications_channel 
  on notifications(channel, status, scheduled_at);

-- جدول feature flags للتحكم بالميزات
create table if not exists feature_flags (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  enabled boolean default false,
  pilot_user_ids uuid[] default '{}',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- RLS على feature_flags - للقراءة فقط للجميع، للتحديث للمشرفين فقط
alter table feature_flags enable row level security;

create policy "Anyone can read feature flags"
  on feature_flags for select
  using (true);

-- إدراج flag التنبيهات
insert into feature_flags (key, enabled, pilot_user_ids)
values ('automation.notify_enabled', false, '{}')
on conflict (key) do nothing;
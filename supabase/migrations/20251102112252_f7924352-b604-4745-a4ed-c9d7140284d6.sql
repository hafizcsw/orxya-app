-- Block 16: فهارس وقيود للأداء ومنع التكرار

-- تسريع استعلامات الموقع بالأحدث أولاً
create index if not exists idx_location_samples_owner_ts
  on location_samples (owner_id, sampled_at desc);

-- تعارضات: إضافة أعمدة prayer_name و date_iso إن لم تكن موجودة
alter table conflicts
  add column if not exists prayer_name text,
  add column if not exists date_iso date;

-- منع تكرار نفس التعارض لنفس (user,event,prayer,date)
create unique index if not exists uq_conflicts_owner_event_prayer_date
  on conflicts(owner_id, event_id, prayer_name, date_iso)
  where status = 'open';

-- للأحداث: تسريع استعلامات النطاق الزمني
create index if not exists idx_events_owner_time
  on events(owner_id, starts_at, ends_at);

-- مواقيت الصلاة: تسريع الجلب اليومي
create index if not exists idx_prayer_times_owner_date
  on prayer_times(owner_id, date_iso);
-- إضافة أعمدة Google Calendar write-back
alter table if exists events
  add column if not exists google_event_id text,
  add column if not exists google_calendar_id text,
  add column if not exists sync_to_google boolean default false,
  add column if not exists last_google_sync_at timestamptz;

-- فهرس لتسريع البحث عن الأحداث المرتبطة بـ Google
create index if not exists idx_events_google 
  on events(owner_id, google_event_id) 
  where google_event_id is not null;

-- فهرس للأحداث المفعّلة للمزامنة
create index if not exists idx_events_sync_to_google 
  on events(owner_id, sync_to_google) 
  where sync_to_google = true;
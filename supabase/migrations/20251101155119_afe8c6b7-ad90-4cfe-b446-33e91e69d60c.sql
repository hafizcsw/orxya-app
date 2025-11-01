-- Patch 21 - Calendar performance indexes

-- نطاق زمني سريع للأحداث
create index if not exists idx_events_owner_start_end on public.events(owner_id, starts_at, ends_at);

-- للصلاة حسب التاريخ/المالك  
create index if not exists idx_prayer_times_owner_date on public.prayer_times(owner_id, date_iso);

-- للتعارضات
create index if not exists idx_conflicts_owner_date on public.conflicts(owner_id, date_iso, status);

-- تسريع استعلامات الشهر/الأسبوع
create index if not exists idx_events_owner_ends on public.events(owner_id, ends_at);

-- للتقاط التعارضات سريعًا حسب اليوم/النوع
create index if not exists idx_conflicts_owner_date on public.conflicts(owner_id, date_iso);
create index if not exists idx_conflicts_event on public.conflicts(event_id);
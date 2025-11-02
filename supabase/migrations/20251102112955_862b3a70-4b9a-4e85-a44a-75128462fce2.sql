-- Block 18: تكامل التقاويم الخارجية (Google/Outlook)

-- events: دعم مصدر خارجي + دلائل التزامن
alter table events
  add column if not exists external_id text,
  add column if not exists external_calendar_id text,
  add column if not exists external_etag text,
  add column if not exists external_event_id text;

-- منع تكرار نفس الحدث لنفس المالك والمصدر
create unique index if not exists uq_events_owner_source_ext
  on events(owner_id, source_id, external_id)
  where external_id is not null;

-- external_accounts: دعم مزامنة تفاضلية
alter table external_accounts
  add column if not exists account_email text,
  add column if not exists last_sync_at timestamptz,
  add column if not exists primary_calendar_id text;
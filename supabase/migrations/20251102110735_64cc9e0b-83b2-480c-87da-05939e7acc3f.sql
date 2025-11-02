-- View لإضافة conflict_level لكل حدث
CREATE OR REPLACE VIEW vw_events_with_conflicts AS
SELECT
  e.*,
  COALESCE((
    SELECT COUNT(*) 
    FROM conflicts c
    WHERE c.owner_id = e.owner_id
      AND c.event_id = e.id
      AND c.status = 'open'
  ), 0)::int AS conflict_level
FROM events e;

-- فهارس لتسريع التقاطع الزمني وجلب الأسبوع
CREATE INDEX IF NOT EXISTS idx_events_owner_time 
  ON events(owner_id, starts_at, ends_at);

CREATE INDEX IF NOT EXISTS idx_conflicts_owner_event 
  ON conflicts(owner_id, event_id) 
  WHERE status = 'open';
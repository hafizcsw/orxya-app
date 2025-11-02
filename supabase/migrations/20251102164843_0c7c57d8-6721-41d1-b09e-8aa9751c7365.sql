-- Patch 16.1 (Part 2 - Complete): Severity enum and conflict tracking
-- Drop ALL dependent views first

DROP VIEW IF EXISTS vw_events_with_conflicts CASCADE;
DROP VIEW IF EXISTS vw_events_conflicts CASCADE;
DROP VIEW IF EXISTS vw_productivity_daily CASCADE;

-- Now safe to alter events table
ALTER TABLE events 
  ALTER COLUMN starts_at TYPE timestamptz USING starts_at AT TIME ZONE 'UTC',
  ALTER COLUMN ends_at TYPE timestamptz USING ends_at AT TIME ZONE 'UTC';

-- Create severity enum
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'conflict_severity') THEN
    CREATE TYPE conflict_severity AS ENUM ('low', 'medium', 'high');
  END IF;
END$$;

-- Add tracking column
ALTER TABLE conflicts
  ADD COLUMN IF NOT EXISTS last_checked_at timestamptz DEFAULT now();

-- Convert severity to enum
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'conflicts' 
    AND column_name = 'severity' 
    AND data_type = 'text'
  ) THEN
    ALTER TABLE conflicts ADD COLUMN severity_temp conflict_severity;
    
    UPDATE conflicts 
    SET severity_temp = CASE 
      WHEN severity IN ('low') THEN 'low'::conflict_severity
      WHEN severity IN ('medium') THEN 'medium'::conflict_severity
      WHEN severity IN ('high', 'hard') THEN 'high'::conflict_severity
      ELSE 'medium'::conflict_severity
    END;
    
    ALTER TABLE conflicts DROP COLUMN severity;
    ALTER TABLE conflicts RENAME COLUMN severity_temp TO severity;
  END IF;
END$$;

-- Recreate all views
CREATE OR REPLACE VIEW vw_events_with_conflicts AS
SELECT 
  e.*,
  COALESCE((
    SELECT COUNT(*)::int 
    FROM conflicts c 
    WHERE c.event_id = e.id 
    AND c.status != 'resolved'
  ), 0) AS conflict_level
FROM events e;

CREATE OR REPLACE VIEW vw_events_conflicts AS
SELECT 
  e.id,
  e.owner_id,
  e.title,
  e.description,
  e.starts_at,
  e.ends_at,
  e.source_id,
  e.tags,
  e.created_at,
  e.updated_at,
  COALESCE((
    SELECT COUNT(*)::int 
    FROM conflicts c 
    WHERE c.event_id = e.id 
    AND c.resolved_at IS NULL
  ), 0) AS conflict_open_count,
  ARRAY(
    SELECT c.prayer_name 
    FROM conflicts c 
    WHERE c.event_id = e.id 
    AND c.resolved_at IS NULL
  ) AS conflict_prayers
FROM events e;

CREATE OR REPLACE VIEW vw_productivity_daily AS
SELECT
  owner_id,
  DATE(starts_at) AS day_utc,
  COUNT(*) AS events_total,
  COUNT(*) FILTER (WHERE is_ai_created = true) AS ai_events
FROM events
GROUP BY owner_id, DATE(starts_at);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_conflicts_severity 
  ON conflicts(owner_id, severity, resolved_at) 
  WHERE resolved_at IS NULL;

-- Comments
COMMENT ON COLUMN conflicts.severity IS 'Severity based on proximity to prayer time and overlap duration';
COMMENT ON COLUMN conflicts.last_checked_at IS 'Last time this conflict was evaluated';
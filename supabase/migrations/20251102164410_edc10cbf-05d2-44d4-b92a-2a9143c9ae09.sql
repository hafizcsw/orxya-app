-- Patch 16.1: Custom Prayer Buffers + Conflict Resolution Tracking

-- Add custom prayer buffers to profiles (JSONB for flexible per-prayer settings)
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS prayer_buffers JSONB DEFAULT '{
  "fajr": {"pre": 10, "post": 20},
  "dhuhr": {"pre": 10, "post": 20},
  "asr": {"pre": 10, "post": 20},
  "maghrib": {"pre": 10, "post": 20},
  "isha": {"pre": 10, "post": 20},
  "jumuah": {"pre": 30, "post": 45}
}'::jsonb;

-- Add resolved_at timestamp to conflicts for tracking when conflicts are automatically resolved
ALTER TABLE conflicts 
ADD COLUMN IF NOT EXISTS resolved_at TIMESTAMPTZ;

-- Add index for performance on resolved conflicts queries
CREATE INDEX IF NOT EXISTS idx_conflicts_resolved_at 
ON conflicts(owner_id, resolved_at) 
WHERE resolved_at IS NOT NULL;

-- Add index for active conflicts (status + date for conflict checking)
CREATE INDEX IF NOT EXISTS idx_conflicts_active 
ON conflicts(owner_id, status, date_iso) 
WHERE status = 'open';

-- Add comment for documentation
COMMENT ON COLUMN profiles.prayer_buffers IS 'Custom pre/post buffers in minutes for each prayer time. Jumuah has extended buffers for Friday prayer.';
COMMENT ON COLUMN conflicts.resolved_at IS 'Timestamp when the conflict was automatically resolved (event removed/moved outside prayer window)';
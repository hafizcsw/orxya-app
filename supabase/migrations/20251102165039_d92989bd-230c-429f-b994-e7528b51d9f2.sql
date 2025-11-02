-- Block 17: Google Calendar Integration - Database Schema

-- Add fields to events table for external calendar integration
ALTER TABLE events
  ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'local',
  ADD COLUMN IF NOT EXISTS ext_id TEXT,
  ADD COLUMN IF NOT EXISTS etag TEXT,
  ADD COLUMN IF NOT EXISTS all_day BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS location TEXT,
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'confirmed';

-- Unique constraint: owner + source + external_id (prevents duplicate imports)
CREATE UNIQUE INDEX IF NOT EXISTS uq_events_owner_source_ext
  ON events(owner_id, source, ext_id)
  WHERE source IS NOT NULL AND ext_id IS NOT NULL;

-- Performance index for time-based queries
CREATE INDEX IF NOT EXISTS idx_events_owner_time
  ON events(owner_id, starts_at, ends_at)
  WHERE starts_at IS NOT NULL;

-- Expand external_accounts table
ALTER TABLE external_accounts
  ADD COLUMN IF NOT EXISTS provider TEXT DEFAULT 'google',
  ADD COLUMN IF NOT EXISTS access_token TEXT,
  ADD COLUMN IF NOT EXISTS refresh_token TEXT,
  ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS scope TEXT,
  ADD COLUMN IF NOT EXISTS ext_user_id TEXT,
  ADD COLUMN IF NOT EXISTS sync_token TEXT,
  ADD COLUMN IF NOT EXISTS last_sync_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS next_sync_after TIMESTAMPTZ;

-- Index for external accounts lookup
CREATE INDEX IF NOT EXISTS idx_extacc_owner_provider
  ON external_accounts(owner_id, provider);

-- Add status column if not exists (might be 'provider' from before)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'external_accounts' 
    AND column_name = 'status'
  ) THEN
    ALTER TABLE external_accounts ADD COLUMN status TEXT DEFAULT 'disconnected';
  END IF;
END$$;

-- Comments
COMMENT ON COLUMN events.source IS 'Source of the event: local, google, outlook, etc.';
COMMENT ON COLUMN events.ext_id IS 'External calendar event ID for sync';
COMMENT ON COLUMN events.etag IS 'ETag for change detection in external calendars';
COMMENT ON COLUMN events.all_day IS 'Whether this is an all-day event';
COMMENT ON COLUMN external_accounts.sync_token IS 'Token for incremental sync (Google Calendar syncToken)';
COMMENT ON COLUMN external_accounts.next_sync_after IS 'Earliest time for next sync (rate limiting)';
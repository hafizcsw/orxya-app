-- Patch 16.C: Location Update + Conflict Check DB Schema

-- 1. Add prayer buffer fields to profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS prayer_prebuffer_min  smallint DEFAULT 5,
  ADD COLUMN IF NOT EXISTS prayer_postbuffer_min smallint DEFAULT 15;

-- 2. Add location fields to events (for future location-based conflicts)
ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS location_lat numeric,
  ADD COLUMN IF NOT EXISTS location_lon numeric;

-- 3. Performance indexes
CREATE INDEX IF NOT EXISTS idx_events_owner_time
  ON public.events(owner_id, starts_at, ends_at);

CREATE INDEX IF NOT EXISTS idx_location_samples_owner_time
  ON public.location_samples(owner_id, sampled_at DESC);

-- 4. GIS index for events location (for future proximity checks)
CREATE INDEX IF NOT EXISTS idx_events_geo
  ON public.events USING gist (point(location_lon, location_lat))
  WHERE location_lat IS NOT NULL AND location_lon IS NOT NULL;
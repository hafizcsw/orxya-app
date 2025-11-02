-- Add indexes for AI conflict resolution optimization
create index if not exists idx_prayer_times_owner_date
  on public.prayer_times(owner_id, date_iso);

-- Add index for conflict type filtering (if not exists)
create index if not exists idx_conflicts_prayer
  on public.conflicts(owner_id, prayer_name) where status = 'open';
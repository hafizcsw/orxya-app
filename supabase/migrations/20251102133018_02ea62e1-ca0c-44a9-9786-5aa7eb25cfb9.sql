-- استعلام اليوم أسرع (العمود الصحيح هو date_iso)
CREATE INDEX IF NOT EXISTS idx_conflicts_owner_date
  ON public.conflicts(owner_id, date_iso DESC);
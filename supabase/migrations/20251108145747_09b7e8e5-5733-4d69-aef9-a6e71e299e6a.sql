-- Create sync_logs table for tracking integration syncs
CREATE TABLE IF NOT EXISTS public.sync_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  provider TEXT NOT NULL,
  sync_type TEXT NOT NULL CHECK (sync_type IN ('manual', 'auto')),
  status TEXT NOT NULL CHECK (status IN ('success', 'error', 'partial')),
  items_added INTEGER DEFAULT 0,
  items_updated INTEGER DEFAULT 0,
  items_skipped INTEGER DEFAULT 0,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.sync_logs ENABLE ROW LEVEL SECURITY;

-- Users can view their own sync logs
CREATE POLICY "Users can view their own sync logs"
  ON public.sync_logs
  FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own sync logs
CREATE POLICY "Users can insert their own sync logs"
  ON public.sync_logs
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Create index for faster queries
CREATE INDEX idx_sync_logs_user_created ON public.sync_logs(user_id, created_at DESC);
CREATE INDEX idx_sync_logs_provider ON public.sync_logs(provider, created_at DESC);
-- Add optional fields for event details if not exists
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_schema = 'public' 
                 AND table_name = 'events' 
                 AND column_name = 'color') THEN
    ALTER TABLE public.events ADD COLUMN color TEXT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_schema = 'public' 
                 AND table_name = 'events' 
                 AND column_name = 'notes') THEN
    ALTER TABLE public.events ADD COLUMN notes TEXT;
  END IF;
END $$;

-- Create index for tags if it doesn't exist
CREATE INDEX IF NOT EXISTS idx_events_tags ON public.events USING GIN(tags);
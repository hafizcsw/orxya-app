-- Enable RLS on prayer_times table
ALTER TABLE public.prayer_times ENABLE ROW LEVEL SECURITY;

-- Create policy to allow anyone to read prayer times (public data)
CREATE POLICY "Anyone can read prayer times"
ON public.prayer_times
FOR SELECT
TO public
USING (true);
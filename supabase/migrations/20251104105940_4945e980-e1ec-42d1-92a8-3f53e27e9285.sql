-- جدول صفحات المواعيد
CREATE TABLE IF NOT EXISTS public.appointment_pages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  slug TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  durations INTEGER[] DEFAULT ARRAY[30, 45, 60],
  availability_window JSONB DEFAULT '{"start": "09:00", "end": "18:00"}'::jsonb,
  buffer_minutes JSONB DEFAULT '{"before": 10, "after": 10}'::jsonb,
  max_per_day INTEGER DEFAULT 8,
  timezone TEXT DEFAULT 'Asia/Dubai',
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, slug)
);

-- جدول الحجوزات
CREATE TABLE IF NOT EXISTS public.appointment_bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  page_id UUID NOT NULL REFERENCES public.appointment_pages(id) ON DELETE CASCADE,
  event_id UUID REFERENCES public.events(id) ON DELETE SET NULL,
  guest_name TEXT NOT NULL,
  guest_email TEXT NOT NULL,
  start_at TIMESTAMPTZ NOT NULL,
  end_at TIMESTAMPTZ NOT NULL,
  status TEXT DEFAULT 'confirmed',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.appointment_pages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointment_bookings ENABLE ROW LEVEL SECURITY;

-- RLS Policies for appointment_pages
CREATE POLICY "Users manage their appointment pages"
  ON public.appointment_pages FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Anyone can view active pages"
  ON public.appointment_pages FOR SELECT
  USING (active = true);

-- RLS Policies for appointment_bookings
CREATE POLICY "Users view bookings for their pages"
  ON public.appointment_bookings FOR SELECT
  USING (
    page_id IN (
      SELECT id FROM public.appointment_pages WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Anyone can create bookings"
  ON public.appointment_bookings FOR INSERT
  WITH CHECK (true);

-- Indexes for performance
CREATE INDEX idx_appointment_pages_user_slug ON public.appointment_pages(user_id, slug);
CREATE INDEX idx_appointment_pages_active ON public.appointment_pages(active) WHERE active = true;
CREATE INDEX idx_appointment_bookings_page ON public.appointment_bookings(page_id);
CREATE INDEX idx_appointment_bookings_time ON public.appointment_bookings(start_at, end_at);

-- Trigger for updated_at
CREATE TRIGGER update_appointment_pages_updated_at
  BEFORE UPDATE ON public.appointment_pages
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
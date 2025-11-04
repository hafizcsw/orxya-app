-- المرحلة 1: تحديث جدول profiles بالإعدادات الجديدة
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS language TEXT DEFAULT 'ar',
ADD COLUMN IF NOT EXISTS country_code TEXT DEFAULT 'AE',
ADD COLUMN IF NOT EXISTS date_format TEXT DEFAULT 'DD/MM/YYYY',
ADD COLUMN IF NOT EXISTS time_format TEXT DEFAULT '12h',
ADD COLUMN IF NOT EXISTS week_start_day INTEGER DEFAULT 6,
ADD COLUMN IF NOT EXISTS show_declined_events BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS show_weekends BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS show_week_numbers BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS default_event_duration INTEGER DEFAULT 60,
ADD COLUMN IF NOT EXISTS default_task_list_id UUID,
ADD COLUMN IF NOT EXISTS working_hours_start TIME DEFAULT '09:00',
ADD COLUMN IF NOT EXISTS working_hours_end TIME DEFAULT '17:00',
ADD COLUMN IF NOT EXISTS working_days JSONB DEFAULT '[1,2,3,4,5]',
ADD COLUMN IF NOT EXISTS show_prayer_times_on_calendar BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS auto_add_google_meet BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS keyboard_shortcuts_enabled BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS show_event_colors BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS reduce_brightness_past_events BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS default_notification_time INTEGER DEFAULT 10,
ADD COLUMN IF NOT EXISTS enable_sound_notifications BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS enable_desktop_notifications BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS enable_email_notifications BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS notification_sound TEXT DEFAULT 'default';

-- المرحلة 2: إنشاء جدول task_lists
CREATE TABLE IF NOT EXISTS task_lists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL,
  title TEXT NOT NULL,
  color TEXT,
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE task_lists ENABLE ROW LEVEL SECURITY;

-- RLS policies for task_lists
CREATE POLICY "Users can manage their own task lists"
ON task_lists
FOR ALL
USING (owner_id = auth.uid())
WITH CHECK (owner_id = auth.uid());

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_task_lists_owner ON task_lists(owner_id);

-- المرحلة 3: إنشاء جدول tasks المحسّن
CREATE TABLE IF NOT EXISTS user_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL,
  list_id UUID REFERENCES task_lists(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  due_date DATE,
  due_time TIME,
  completed BOOLEAN DEFAULT false,
  completed_at TIMESTAMPTZ,
  priority INTEGER DEFAULT 0,
  position INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE user_tasks ENABLE ROW LEVEL SECURITY;

-- RLS policies for user_tasks
CREATE POLICY "Users can manage their own tasks"
ON user_tasks
FOR ALL
USING (owner_id = auth.uid())
WITH CHECK (owner_id = auth.uid());

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_tasks_owner ON user_tasks(owner_id);
CREATE INDEX IF NOT EXISTS idx_user_tasks_list ON user_tasks(list_id);
CREATE INDEX IF NOT EXISTS idx_user_tasks_due_date ON user_tasks(due_date);

-- Trigger to update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_task_lists_updated_at BEFORE UPDATE ON task_lists
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_tasks_updated_at BEFORE UPDATE ON user_tasks
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
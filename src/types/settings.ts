export interface UserSettings {
  // General Settings
  language: string;
  country_code: string;
  timezone: string;
  currency: string;
  
  // Time & Date Settings
  date_format: string;
  time_format: '12h' | '24h';
  week_start_day: number; // 0=Sunday, 6=Saturday
  
  // View Settings
  show_declined_events: boolean;
  show_weekends: boolean;
  show_week_numbers: boolean;
  show_event_colors: boolean;
  reduce_brightness_past_events: boolean;
  show_prayer_times_on_calendar: boolean;
  
  // Event Settings
  default_event_duration: number; // minutes
  auto_add_google_meet: boolean;
  
  // Working Hours
  working_hours_start: string; // HH:MM format
  working_hours_end: string;
  working_days: number[]; // [1,2,3,4,5] = Mon-Fri
  
  // Notification Settings
  default_notification_time: number; // minutes before event
  enable_sound_notifications: boolean;
  enable_desktop_notifications: boolean;
  enable_email_notifications: boolean;
  notification_sound: string;
  
  // Task Settings
  default_task_list_id: string | null;
  
  // Prayer Settings
  respect_prayer: boolean;
  prayer_method: string;
  prayer_pre_buffer_min: number;
  prayer_post_buffer_min: number;
  prayer_buffers: Record<string, { pre: number; post: number }>;
  
  // Location
  latitude: number | null;
  longitude: number | null;
  allow_location: boolean;
  
  // Other
  keyboard_shortcuts_enabled: boolean;
  telemetry_enabled: boolean;
  theme_pref: string;
  accent_color: string;
}

export type SettingsSection = 
  | 'general'
  | 'view'
  | 'notifications'
  | 'events'
  | 'tasks'
  | 'location'
  | 'prayer'
  | 'integrations'
  | 'privacy'
  | 'calendar-parity';

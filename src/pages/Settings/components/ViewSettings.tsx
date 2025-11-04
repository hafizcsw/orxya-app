import { useSettings } from '@/contexts/SettingsContext';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';

const dateFormats = [
  { value: 'DD/MM/YYYY', label: '31/12/2024' },
  { value: 'MM/DD/YYYY', label: '12/31/2024' },
  { value: 'YYYY-MM-DD', label: '2024-12-31' },
];

const timeFormats = [
  { value: '12h', label: '12 ساعة (1:00 م)' },
  { value: '24h', label: '24 ساعة (13:00)' },
];

const weekStartDays = [
  { value: 0, label: 'الأحد' },
  { value: 1, label: 'الإثنين' },
  { value: 6, label: 'السبت' },
];

export function ViewSettings() {
  const { settings, updateSettings } = useSettings();

  if (!settings) return null;

  return (
    <div className="space-y-0">
      <div className="py-4 border-b border-[#dadce0] dark:border-[#5f6368]">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <h3 className="text-sm font-medium text-[#3c4043] dark:text-[#e8eaed]">تنسيق التاريخ</h3>
            <p className="text-xs text-[#5f6368] dark:text-[#9aa0a6] mt-0.5">Date format</p>
          </div>
          <Select value={settings.date_format} onValueChange={(value) => updateSettings({ date_format: value })}>
            <SelectTrigger className="w-[200px] h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="z-[100]">
              {dateFormats.map((format) => (
                <SelectItem key={format.value} value={format.value}>
                  {format.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="py-4 border-b border-[#dadce0] dark:border-[#5f6368]">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <h3 className="text-sm font-medium text-[#3c4043] dark:text-[#e8eaed]">تنسيق الوقت</h3>
            <p className="text-xs text-[#5f6368] dark:text-[#9aa0a6] mt-0.5">Time format</p>
          </div>
          <Select value={settings.time_format} onValueChange={(value: '12h' | '24h') => updateSettings({ time_format: value })}>
            <SelectTrigger className="w-[200px] h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="z-[100]">
              {timeFormats.map((format) => (
                <SelectItem key={format.value} value={format.value}>
                  {format.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="py-4 border-b border-[#dadce0] dark:border-[#5f6368]">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <h3 className="text-sm font-medium text-[#3c4043] dark:text-[#e8eaed]">بداية الأسبوع</h3>
            <p className="text-xs text-[#5f6368] dark:text-[#9aa0a6] mt-0.5">Week starts on</p>
          </div>
          <Select value={settings.week_start_day.toString()} onValueChange={(value) => updateSettings({ week_start_day: parseInt(value) })}>
            <SelectTrigger className="w-[200px] h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="z-[100]">
              {weekStartDays.map((day) => (
                <SelectItem key={day.value} value={day.value.toString()}>
                  {day.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="py-4 border-b border-[#dadce0] dark:border-[#5f6368]">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <h3 className="text-sm font-medium text-[#3c4043] dark:text-[#e8eaed]">إظهار عطلة نهاية الأسبوع</h3>
            <p className="text-xs text-[#5f6368] dark:text-[#9aa0a6] mt-0.5">Show weekends</p>
          </div>
          <Switch
            checked={settings.show_weekends}
            onCheckedChange={(checked) => updateSettings({ show_weekends: checked })}
            className="h-5 w-9 data-[state=checked]:bg-[#1a73e8]"
          />
        </div>
      </div>

      <div className="py-4 border-b border-[#dadce0] dark:border-[#5f6368]">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <h3 className="text-sm font-medium text-[#3c4043] dark:text-[#e8eaed]">إظهار أرقام الأسابيع</h3>
            <p className="text-xs text-[#5f6368] dark:text-[#9aa0a6] mt-0.5">Show week numbers</p>
          </div>
          <Switch
            checked={settings.show_week_numbers}
            onCheckedChange={(checked) => updateSettings({ show_week_numbers: checked })}
            className="h-5 w-9 data-[state=checked]:bg-[#1a73e8]"
          />
        </div>
      </div>

      <div className="py-4 border-b border-[#dadce0] dark:border-[#5f6368]">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <h3 className="text-sm font-medium text-[#3c4043] dark:text-[#e8eaed]">إظهار الأحداث المرفوضة</h3>
            <p className="text-xs text-[#5f6368] dark:text-[#9aa0a6] mt-0.5">Show declined events</p>
          </div>
          <Switch
            checked={settings.show_declined_events}
            onCheckedChange={(checked) => updateSettings({ show_declined_events: checked })}
            className="h-5 w-9 data-[state=checked]:bg-[#1a73e8]"
          />
        </div>
      </div>

      <div className="py-4 border-b border-[#dadce0] dark:border-[#5f6368]">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <h3 className="text-sm font-medium text-[#3c4043] dark:text-[#e8eaed]">إظهار ألوان الأحداث</h3>
            <p className="text-xs text-[#5f6368] dark:text-[#9aa0a6] mt-0.5">Show event colors</p>
          </div>
          <Switch
            checked={settings.show_event_colors}
            onCheckedChange={(checked) => updateSettings({ show_event_colors: checked })}
            className="h-5 w-9 data-[state=checked]:bg-[#1a73e8]"
          />
        </div>
      </div>

      <div className="py-4 border-b border-[#dadce0] dark:border-[#5f6368]">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <h3 className="text-sm font-medium text-[#3c4043] dark:text-[#e8eaed]">تخفيف سطوع الأحداث الماضية</h3>
            <p className="text-xs text-[#5f6368] dark:text-[#9aa0a6] mt-0.5">Reduce brightness of past events</p>
          </div>
          <Switch
            checked={settings.reduce_brightness_past_events}
            onCheckedChange={(checked) => updateSettings({ reduce_brightness_past_events: checked })}
            className="h-5 w-9 data-[state=checked]:bg-[#1a73e8]"
          />
        </div>
      </div>

      <div className="py-4">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <h3 className="text-sm font-medium text-[#3c4043] dark:text-[#e8eaed]">إظهار أوقات الصلاة</h3>
            <p className="text-xs text-[#5f6368] dark:text-[#9aa0a6] mt-0.5">Show prayer times on calendar</p>
          </div>
          <Switch
            checked={settings.show_prayer_times_on_calendar}
            onCheckedChange={(checked) => updateSettings({ show_prayer_times_on_calendar: checked })}
            className="h-5 w-9 data-[state=checked]:bg-[#1a73e8]"
          />
        </div>
      </div>
    </div>
  );
}

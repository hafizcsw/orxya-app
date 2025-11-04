import { useSettings } from '@/contexts/SettingsContext';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';

const durations = [
  { value: 15, label: '15 دقيقة' },
  { value: 30, label: '30 دقيقة' },
  { value: 60, label: 'ساعة واحدة' },
  { value: 90, label: 'ساعة ونصف' },
  { value: 120, label: 'ساعتان' },
];

export function EventSettings() {
  const { settings, updateSettings } = useSettings();

  if (!settings) return null;

  return (
    <div className="space-y-0">
      <div className="py-4 border-b border-[#dadce0] dark:border-[#5f6368]">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <h3 className="text-sm font-medium text-[#3c4043] dark:text-[#e8eaed]">المدة الافتراضية للحدث</h3>
            <p className="text-xs text-[#5f6368] dark:text-[#9aa0a6] mt-0.5">Default event duration</p>
          </div>
          <Select
            value={settings.default_event_duration.toString()}
            onValueChange={(value) => updateSettings({ default_event_duration: parseInt(value) })}
          >
            <SelectTrigger className="w-[200px] h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="z-[100]">
              {durations.map((duration) => (
                <SelectItem key={duration.value} value={duration.value.toString()}>
                  {duration.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="py-4 border-b border-[#dadce0] dark:border-[#5f6368]">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <h3 className="text-sm font-medium text-[#3c4043] dark:text-[#e8eaed]">بداية ساعات العمل</h3>
            <p className="text-xs text-[#5f6368] dark:text-[#9aa0a6] mt-0.5">Work hours start</p>
          </div>
          <Input
            type="time"
            value={settings.working_hours_start}
            onChange={(e) => updateSettings({ working_hours_start: e.target.value })}
            className="w-[200px] h-9"
          />
        </div>
      </div>

      <div className="py-4 border-b border-[#dadce0] dark:border-[#5f6368]">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <h3 className="text-sm font-medium text-[#3c4043] dark:text-[#e8eaed]">نهاية ساعات العمل</h3>
            <p className="text-xs text-[#5f6368] dark:text-[#9aa0a6] mt-0.5">Work hours end</p>
          </div>
          <Input
            type="time"
            value={settings.working_hours_end}
            onChange={(e) => updateSettings({ working_hours_end: e.target.value })}
            className="w-[200px] h-9"
          />
        </div>
      </div>

      <div className="py-4 border-b border-[#dadce0] dark:border-[#5f6368]">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <h3 className="text-sm font-medium text-[#3c4043] dark:text-[#e8eaed]">إضافة Google Meet تلقائيًا</h3>
            <p className="text-xs text-[#5f6368] dark:text-[#9aa0a6] mt-0.5">Add Google Meet automatically</p>
          </div>
          <Switch
            checked={settings.auto_add_google_meet}
            onCheckedChange={(checked) => updateSettings({ auto_add_google_meet: checked })}
            className="h-5 w-9 data-[state=checked]:bg-[#1a73e8]"
          />
        </div>
      </div>

      <div className="py-4">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <h3 className="text-sm font-medium text-[#3c4043] dark:text-[#e8eaed]">اختصارات لوحة المفاتيح</h3>
            <p className="text-xs text-[#5f6368] dark:text-[#9aa0a6] mt-0.5">Keyboard shortcuts</p>
          </div>
          <Switch
            checked={settings.keyboard_shortcuts_enabled}
            onCheckedChange={(checked) => updateSettings({ keyboard_shortcuts_enabled: checked })}
            className="h-5 w-9 data-[state=checked]:bg-[#1a73e8]"
          />
        </div>
      </div>
    </div>
  );
}

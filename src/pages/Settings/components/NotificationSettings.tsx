import { useSettings } from '@/contexts/SettingsContext';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';

const notificationTimes = [
  { value: 0, label: 'وقت الحدث' },
  { value: 5, label: '5 دقائق قبل' },
  { value: 10, label: '10 دقائق قبل' },
  { value: 15, label: '15 دقيقة قبل' },
  { value: 30, label: '30 دقيقة قبل' },
  { value: 60, label: 'ساعة قبل' },
];

export function NotificationSettings() {
  const { settings, updateSettings } = useSettings();

  if (!settings) return null;

  return (
    <div className="space-y-0">
      <div className="py-4 border-b border-[#dadce0] dark:border-[#5f6368]">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <h3 className="text-sm font-medium text-[#3c4043] dark:text-[#e8eaed]">الوقت الافتراضي للتنبيه</h3>
            <p className="text-xs text-[#5f6368] dark:text-[#9aa0a6] mt-0.5">Default notification time</p>
          </div>
          <Select
            value={settings.default_notification_time.toString()}
            onValueChange={(value) => updateSettings({ default_notification_time: parseInt(value) })}
          >
            <SelectTrigger className="w-[200px] h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="z-[100]">
              {notificationTimes.map((time) => (
                <SelectItem key={time.value} value={time.value.toString()}>
                  {time.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="py-4 border-b border-[#dadce0] dark:border-[#5f6368]">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <h3 className="text-sm font-medium text-[#3c4043] dark:text-[#e8eaed]">تنبيهات الصوت</h3>
            <p className="text-xs text-[#5f6368] dark:text-[#9aa0a6] mt-0.5">Sound notifications</p>
          </div>
          <Switch
            checked={settings.enable_sound_notifications}
            onCheckedChange={(checked) => updateSettings({ enable_sound_notifications: checked })}
            className="h-5 w-9 data-[state=checked]:bg-[#1a73e8]"
          />
        </div>
      </div>

      <div className="py-4 border-b border-[#dadce0] dark:border-[#5f6368]">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <h3 className="text-sm font-medium text-[#3c4043] dark:text-[#e8eaed]">تنبيهات سطح المكتب</h3>
            <p className="text-xs text-[#5f6368] dark:text-[#9aa0a6] mt-0.5">Desktop notifications</p>
          </div>
          <Switch
            checked={settings.enable_desktop_notifications}
            onCheckedChange={(checked) => updateSettings({ enable_desktop_notifications: checked })}
            className="h-5 w-9 data-[state=checked]:bg-[#1a73e8]"
          />
        </div>
      </div>

      <div className="py-4">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <h3 className="text-sm font-medium text-[#3c4043] dark:text-[#e8eaed]">تنبيهات البريد الإلكتروني</h3>
            <p className="text-xs text-[#5f6368] dark:text-[#9aa0a6] mt-0.5">Email notifications</p>
          </div>
          <Switch
            checked={settings.enable_email_notifications}
            onCheckedChange={(checked) => updateSettings({ enable_email_notifications: checked })}
            className="h-5 w-9 data-[state=checked]:bg-[#1a73e8]"
          />
        </div>
      </div>
    </div>
  );
}

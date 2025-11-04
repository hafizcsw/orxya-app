import { useSettings } from '@/contexts/SettingsContext';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

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

  const handleSave = async () => {
    toast.success('تم حفظ إعدادات التنبيهات بنجاح');
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold text-foreground mb-2">إعدادات التنبيهات</h2>
        <p className="text-sm text-muted-foreground">إدارة كيفية تلقي التنبيهات والتذكيرات</p>
      </div>

      <Card className="p-6 space-y-6">
        <div className="space-y-3">
          <Label htmlFor="defaultNotification">الوقت الافتراضي للتنبيه</Label>
          <Select
            value={settings.default_notification_time.toString()}
            onValueChange={(value) => updateSettings({ default_notification_time: parseInt(value) })}
          >
            <SelectTrigger id="defaultNotification">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {notificationTimes.map((time) => (
                <SelectItem key={time.value} value={time.value.toString()}>
                  {time.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label>تنبيهات الصوت</Label>
            <p className="text-sm text-muted-foreground">تشغيل صوت عند التنبيهات</p>
          </div>
          <Switch
            checked={settings.enable_sound_notifications}
            onCheckedChange={(checked) => updateSettings({ enable_sound_notifications: checked })}
          />
        </div>

        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label>تنبيهات سطح المكتب</Label>
            <p className="text-sm text-muted-foreground">إظهار تنبيهات على سطح المكتب</p>
          </div>
          <Switch
            checked={settings.enable_desktop_notifications}
            onCheckedChange={(checked) => updateSettings({ enable_desktop_notifications: checked })}
          />
        </div>

        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label>تنبيهات البريد الإلكتروني</Label>
            <p className="text-sm text-muted-foreground">إرسال تنبيهات عبر البريد</p>
          </div>
          <Switch
            checked={settings.enable_email_notifications}
            onCheckedChange={(checked) => updateSettings({ enable_email_notifications: checked })}
          />
        </div>
      </Card>

      <div className="flex justify-end">
        <Button onClick={handleSave}>حفظ التغييرات</Button>
      </div>
    </div>
  );
}

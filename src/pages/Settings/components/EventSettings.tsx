import { useSettings } from '@/contexts/SettingsContext';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

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

  const handleSave = async () => {
    toast.success('تم حفظ إعدادات الأحداث بنجاح');
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold text-foreground mb-2">إعدادات الأحداث</h2>
        <p className="text-sm text-muted-foreground">تخصيص إنشاء وإدارة الأحداث</p>
      </div>

      <Card className="p-6 space-y-6">
        <div className="space-y-3">
          <Label htmlFor="defaultDuration">المدة الافتراضية للحدث</Label>
          <Select
            value={settings.default_event_duration.toString()}
            onValueChange={(value) => updateSettings({ default_event_duration: parseInt(value) })}
          >
            <SelectTrigger id="defaultDuration">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {durations.map((duration) => (
                <SelectItem key={duration.value} value={duration.value.toString()}>
                  {duration.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-3">
          <Label htmlFor="workStart">بداية ساعات العمل</Label>
          <Input
            id="workStart"
            type="time"
            value={settings.working_hours_start}
            onChange={(e) => updateSettings({ working_hours_start: e.target.value })}
          />
        </div>

        <div className="space-y-3">
          <Label htmlFor="workEnd">نهاية ساعات العمل</Label>
          <Input
            id="workEnd"
            type="time"
            value={settings.working_hours_end}
            onChange={(e) => updateSettings({ working_hours_end: e.target.value })}
          />
        </div>

        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label>إضافة Google Meet تلقائيًا</Label>
            <p className="text-sm text-muted-foreground">إضافة رابط اجتماع للأحداث الجديدة</p>
          </div>
          <Switch
            checked={settings.auto_add_google_meet}
            onCheckedChange={(checked) => updateSettings({ auto_add_google_meet: checked })}
          />
        </div>

        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label>اختصارات لوحة المفاتيح</Label>
            <p className="text-sm text-muted-foreground">تفعيل اختصارات لوحة المفاتيح</p>
          </div>
          <Switch
            checked={settings.keyboard_shortcuts_enabled}
            onCheckedChange={(checked) => updateSettings({ keyboard_shortcuts_enabled: checked })}
          />
        </div>
      </Card>

      <div className="flex justify-end">
        <Button onClick={handleSave}>حفظ التغييرات</Button>
      </div>
    </div>
  );
}

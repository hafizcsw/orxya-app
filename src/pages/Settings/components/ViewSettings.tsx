import { useSettings } from '@/contexts/SettingsContext';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

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

  const handleSave = async () => {
    toast.success('تم حفظ إعدادات العرض بنجاح');
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold text-foreground mb-2">إعدادات العرض</h2>
        <p className="text-sm text-muted-foreground">تخصيص كيفية عرض التقويم والأحداث</p>
      </div>

      <Card className="p-6 space-y-6">
        <div className="space-y-3">
          <Label htmlFor="dateFormat">تنسيق التاريخ</Label>
          <Select
            value={settings.date_format}
            onValueChange={(value) => updateSettings({ date_format: value })}
          >
            <SelectTrigger id="dateFormat">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {dateFormats.map((format) => (
                <SelectItem key={format.value} value={format.value}>
                  {format.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-3">
          <Label htmlFor="timeFormat">تنسيق الوقت</Label>
          <Select
            value={settings.time_format}
            onValueChange={(value: '12h' | '24h') => updateSettings({ time_format: value })}
          >
            <SelectTrigger id="timeFormat">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {timeFormats.map((format) => (
                <SelectItem key={format.value} value={format.value}>
                  {format.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-3">
          <Label htmlFor="weekStart">بداية الأسبوع</Label>
          <Select
            value={settings.week_start_day.toString()}
            onValueChange={(value) => updateSettings({ week_start_day: parseInt(value) })}
          >
            <SelectTrigger id="weekStart">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {weekStartDays.map((day) => (
                <SelectItem key={day.value} value={day.value.toString()}>
                  {day.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label>إظهار عطلة نهاية الأسبوع</Label>
            <p className="text-sm text-muted-foreground">عرض السبت والأحد في التقويم</p>
          </div>
          <Switch
            checked={settings.show_weekends}
            onCheckedChange={(checked) => updateSettings({ show_weekends: checked })}
          />
        </div>

        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label>إظهار أرقام الأسابيع</Label>
            <p className="text-sm text-muted-foreground">عرض رقم الأسبوع في السنة</p>
          </div>
          <Switch
            checked={settings.show_week_numbers}
            onCheckedChange={(checked) => updateSettings({ show_week_numbers: checked })}
          />
        </div>

        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label>إظهار الأحداث المرفوضة</Label>
            <p className="text-sm text-muted-foreground">عرض الأحداث التي رفضتها</p>
          </div>
          <Switch
            checked={settings.show_declined_events}
            onCheckedChange={(checked) => updateSettings({ show_declined_events: checked })}
          />
        </div>

        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label>إظهار ألوان الأحداث</Label>
            <p className="text-sm text-muted-foreground">استخدام الألوان لتمييز الأحداث</p>
          </div>
          <Switch
            checked={settings.show_event_colors}
            onCheckedChange={(checked) => updateSettings({ show_event_colors: checked })}
          />
        </div>

        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label>تخفيف سطوع الأحداث الماضية</Label>
            <p className="text-sm text-muted-foreground">جعل الأحداث الماضية أقل وضوحًا</p>
          </div>
          <Switch
            checked={settings.reduce_brightness_past_events}
            onCheckedChange={(checked) => updateSettings({ reduce_brightness_past_events: checked })}
          />
        </div>

        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label>إظهار أوقات الصلاة</Label>
            <p className="text-sm text-muted-foreground">عرض أوقات الصلاة في التقويم</p>
          </div>
          <Switch
            checked={settings.show_prayer_times_on_calendar}
            onCheckedChange={(checked) => updateSettings({ show_prayer_times_on_calendar: checked })}
          />
        </div>
      </Card>

      <div className="flex justify-end">
        <Button onClick={handleSave}>حفظ التغييرات</Button>
      </div>
    </div>
  );
}

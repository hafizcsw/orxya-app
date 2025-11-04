import { useSettings } from '@/contexts/SettingsContext';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

const calculationMethods = [
  { value: 'MWL', label: 'رابطة العالم الإسلامي' },
  { value: 'ISNA', label: 'الجمعية الإسلامية لأمريكا الشمالية' },
  { value: 'Egypt', label: 'الهيئة المصرية العامة للمساحة' },
  { value: 'Makkah', label: 'أم القرى، مكة المكرمة' },
  { value: 'Karachi', label: 'جامعة العلوم الإسلامية، كراتشي' },
  { value: 'Dubai', label: 'دبي' },
];

export function PrayerSettings() {
  const { settings, updateSettings } = useSettings();

  if (!settings) return null;

  const handleSave = async () => {
    toast.success('تم حفظ إعدادات الصلاة بنجاح');
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold text-foreground mb-2">إعدادات الصلاة</h2>
        <p className="text-sm text-muted-foreground">تخصيص أوقات الصلاة والتنبيهات</p>
      </div>

      <Card className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label>احترام أوقات الصلاة</Label>
            <p className="text-sm text-muted-foreground">عدم جدولة أحداث أثناء الصلاة</p>
          </div>
          <Switch
            checked={settings.respect_prayer}
            onCheckedChange={(checked) => updateSettings({ respect_prayer: checked })}
          />
        </div>

        {settings.respect_prayer && (
          <>
            <div className="space-y-3">
              <Label htmlFor="prayerMethod">طريقة الحساب</Label>
              <Select
                value={settings.prayer_method}
                onValueChange={(value) => updateSettings({ prayer_method: value })}
              >
                <SelectTrigger id="prayerMethod">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {calculationMethods.map((method) => (
                    <SelectItem key={method.value} value={method.value}>
                      {method.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-3">
                <Label htmlFor="prePrayer">قبل الصلاة (دقائق)</Label>
                <Input
                  id="prePrayer"
                  type="number"
                  min="0"
                  max="60"
                  value={settings.prayer_pre_buffer_min}
                  onChange={(e) => updateSettings({ prayer_pre_buffer_min: parseInt(e.target.value) || 5 })}
                />
              </div>

              <div className="space-y-3">
                <Label htmlFor="postPrayer">بعد الصلاة (دقائق)</Label>
                <Input
                  id="postPrayer"
                  type="number"
                  min="0"
                  max="60"
                  value={settings.prayer_post_buffer_min}
                  onChange={(e) => updateSettings({ prayer_post_buffer_min: parseInt(e.target.value) || 15 })}
                />
              </div>
            </div>
          </>
        )}
      </Card>

      <div className="flex justify-end">
        <Button onClick={handleSave}>حفظ التغييرات</Button>
      </div>
    </div>
  );
}

import { useSettings } from '@/contexts/SettingsContext';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

const languages = [
  { value: 'ar', label: 'العربية' },
  { value: 'en', label: 'English' },
];

const countries = [
  { value: 'AE', label: 'الإمارات' },
  { value: 'SA', label: 'السعودية' },
  { value: 'EG', label: 'مصر' },
  { value: 'US', label: 'الولايات المتحدة' },
];

const timezones = [
  { value: 'Asia/Dubai', label: 'دبي (UTC+4)' },
  { value: 'Asia/Riyadh', label: 'الرياض (UTC+3)' },
  { value: 'Africa/Cairo', label: 'القاهرة (UTC+2)' },
  { value: 'America/New_York', label: 'نيويورك (UTC-5)' },
];

const currencies = [
  { value: 'AED', label: 'درهم إماراتي (AED)' },
  { value: 'SAR', label: 'ريال سعودي (SAR)' },
  { value: 'EGP', label: 'جنيه مصري (EGP)' },
  { value: 'USD', label: 'دولار أمريكي (USD)' },
];

export function GeneralSettings() {
  const { settings, updateSettings } = useSettings();

  if (!settings) return null;

  const handleSave = async () => {
    toast.success('تم حفظ الإعدادات بنجاح');
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold text-foreground mb-2">الإعدادات العامة</h2>
        <p className="text-sm text-muted-foreground">إدارة اللغة والموقع والإعدادات الأساسية</p>
      </div>

      <Card className="p-6 space-y-6">
        <div className="space-y-3">
          <Label htmlFor="language">اللغة</Label>
          <Select
            value={settings.language}
            onValueChange={(value) => updateSettings({ language: value })}
          >
            <SelectTrigger id="language">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {languages.map((lang) => (
                <SelectItem key={lang.value} value={lang.value}>
                  {lang.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-3">
          <Label htmlFor="country">الدولة</Label>
          <Select
            value={settings.country_code}
            onValueChange={(value) => updateSettings({ country_code: value })}
          >
            <SelectTrigger id="country">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {countries.map((country) => (
                <SelectItem key={country.value} value={country.value}>
                  {country.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-3">
          <Label htmlFor="timezone">المنطقة الزمنية</Label>
          <Select
            value={settings.timezone}
            onValueChange={(value) => updateSettings({ timezone: value })}
          >
            <SelectTrigger id="timezone">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {timezones.map((tz) => (
                <SelectItem key={tz.value} value={tz.value}>
                  {tz.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-3">
          <Label htmlFor="currency">العملة</Label>
          <Select
            value={settings.currency}
            onValueChange={(value) => updateSettings({ currency: value })}
          >
            <SelectTrigger id="currency">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {currencies.map((curr) => (
                <SelectItem key={curr.value} value={curr.value}>
                  {curr.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </Card>

      <div className="flex justify-end">
        <Button onClick={handleSave}>حفظ التغييرات</Button>
      </div>
    </div>
  );
}

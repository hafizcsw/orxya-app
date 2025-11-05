import { useSettings } from '@/contexts/SettingsContext';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useTranslation } from 'react-i18next';

const languages = [
  { value: 'ar', label: 'العربية 🇸🇦' },
  { value: 'en', label: 'English 🇬🇧' },
  { value: 'es', label: 'Español 🇪🇸' },
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
  const { t } = useTranslation('settings');

  if (!settings) return null;

  const handleLanguageChange = async (value: string) => {
    // Dynamic import to avoid circular dependency
    const { default: i18n } = await import('@/i18n');
    await updateSettings({ language: value });
    await i18n.changeLanguage(value);
  };

  return (
    <div className="space-y-0">
      <div className="py-4 border-b border-[#dadce0] dark:border-[#5f6368]">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <h3 className="text-sm font-medium text-[#3c4043] dark:text-[#e8eaed]">اللغة</h3>
            <p className="text-xs text-[#5f6368] dark:text-[#9aa0a6] mt-0.5">Language</p>
          </div>
          <Select value={settings.language} onValueChange={handleLanguageChange}>
            <SelectTrigger className="w-[200px] h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="z-[100]">
              {languages.map((lang) => (
                <SelectItem key={lang.value} value={lang.value}>
                  {lang.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="py-4 border-b border-[#dadce0] dark:border-[#5f6368]">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <h3 className="text-sm font-medium text-[#3c4043] dark:text-[#e8eaed]">الدولة</h3>
            <p className="text-xs text-[#5f6368] dark:text-[#9aa0a6] mt-0.5">Country</p>
          </div>
          <Select value={settings.country_code} onValueChange={(value) => updateSettings({ country_code: value })}>
            <SelectTrigger className="w-[200px] h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="z-[100]">
              {countries.map((country) => (
                <SelectItem key={country.value} value={country.value}>
                  {country.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="py-4 border-b border-[#dadce0] dark:border-[#5f6368]">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <h3 className="text-sm font-medium text-[#3c4043] dark:text-[#e8eaed]">المنطقة الزمنية</h3>
            <p className="text-xs text-[#5f6368] dark:text-[#9aa0a6] mt-0.5">Timezone</p>
          </div>
          <Select value={settings.timezone} onValueChange={(value) => updateSettings({ timezone: value })}>
            <SelectTrigger className="w-[200px] h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="z-[100]">
              {timezones.map((tz) => (
                <SelectItem key={tz.value} value={tz.value}>
                  {tz.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="py-4">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <h3 className="text-sm font-medium text-[#3c4043] dark:text-[#e8eaed]">العملة</h3>
            <p className="text-xs text-[#5f6368] dark:text-[#9aa0a6] mt-0.5">Currency</p>
          </div>
          <Select value={settings.currency} onValueChange={(value) => updateSettings({ currency: value })}>
            <SelectTrigger className="w-[200px] h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="z-[100]">
              {currencies.map((curr) => (
                <SelectItem key={curr.value} value={curr.value}>
                  {curr.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
}

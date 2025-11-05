import { useState } from 'react';
import { useSettings } from '@/contexts/SettingsContext';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useTranslation } from 'react-i18next';
import { Capacitor } from '@capacitor/core';
import { useToast } from '@/hooks/use-toast';
import { wakeWordManager } from '@/lib/wake-word-manager';

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
  const { toast } = useToast();
  const [picovoiceKey, setPicovoiceKey] = useState('');
  const [wakeWordSensitivity, setSensitivity] = useState(0.5);

  if (!settings) return null;

  const testWakeWord = async () => {
    if (!Capacitor.isNativePlatform()) {
      toast({
        title: "⚠️ غير متاح",
        description: "Wake Word يعمل فقط على التطبيق الأصلي",
        variant: "destructive",
      });
      return;
    }

    if (!picovoiceKey.trim()) {
      toast({
        title: "⚠️ خطأ",
        description: "الرجاء إدخال Picovoice Access Key",
        variant: "destructive",
      });
      return;
    }

    const success = await wakeWordManager.start({
      accessKey: picovoiceKey,
      keyword: 'BUMBLEBEE',
      sensitivity: wakeWordSensitivity,
      onDetected: () => {
        toast({
          title: "✅ نجح!",
          description: "تم الكشف عن Wake Word بنجاح",
        });
        wakeWordManager.stop();
      }
    });

    if (success) {
      toast({
        title: "🎙️ جاري الاستماع",
        description: "قل 'BUMBLEBEE' للاختبار",
      });
    } else {
      toast({
        title: "❌ فشل",
        description: "تأكد من Access Key والصلاحيات",
        variant: "destructive",
      });
    }
  };

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

      <div className="py-4 border-b border-[#dadce0] dark:border-[#5f6368]">
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

      {/* Wake Word Settings - Native Only */}
      {Capacitor.isNativePlatform() && (
        <>
          <div className="py-4 mt-6 border-t-2 border-primary/20">
            <h2 className="text-base font-semibold text-[#3c4043] dark:text-[#e8eaed] mb-4">
              ⚡ الأوامر الصوتية (Wake Word)
            </h2>
          </div>

          <div className="py-4 border-b border-[#dadce0] dark:border-[#5f6368]">
            <div className="space-y-3">
              <div>
                <h3 className="text-sm font-medium text-[#3c4043] dark:text-[#e8eaed]">Picovoice Access Key</h3>
                <p className="text-xs text-[#5f6368] dark:text-[#9aa0a6] mt-0.5 mb-2">
                  احصل عليه من console.picovoice.ai
                </p>
                <Input
                  type="password"
                  value={picovoiceKey}
                  onChange={(e) => setPicovoiceKey(e.target.value)}
                  placeholder="px_xxxxxxxxxxxxxxxx"
                  className="h-9"
                />
              </div>
            </div>
          </div>

          <div className="py-4 border-b border-[#dadce0] dark:border-[#5f6368]">
            <div className="space-y-3">
              <div>
                <h3 className="text-sm font-medium text-[#3c4043] dark:text-[#e8eaed]">
                  حساسية الكشف: {wakeWordSensitivity.toFixed(1)}
                </h3>
                <p className="text-xs text-[#5f6368] dark:text-[#9aa0a6] mt-0.5 mb-2">
                  منخفضة = أقل حساسية (أقل أخطاء)، عالية = أكثر حساسية
                </p>
                <Slider
                  value={[wakeWordSensitivity]}
                  onValueChange={([v]) => setSensitivity(v)}
                  min={0}
                  max={1}
                  step={0.1}
                  className="py-2"
                />
              </div>
            </div>
          </div>

          <div className="py-4">
            <Button 
              onClick={testWakeWord}
              className="w-full"
              disabled={!picovoiceKey.trim()}
            >
              🎙️ اختبار Wake Word
            </Button>
            <p className="text-xs text-[#5f6368] dark:text-[#9aa0a6] mt-2 text-center">
              سيستمع لكلمة "BUMBLEBEE" كاختبار
            </p>
          </div>
        </>
      )}
    </div>
  );
}

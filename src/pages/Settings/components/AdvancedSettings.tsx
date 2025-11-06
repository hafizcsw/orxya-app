import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useUser } from '@/lib/auth';
import { getDeviceLocation } from '@/native/geo';
import { setTelemetryOn } from '@/lib/telemetry';
import { toast } from 'sonner';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { MapPin, DollarSign, Globe, Moon, Activity } from 'lucide-react';
import { motion } from 'framer-motion';

const tzGuess = Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Dubai';

export function AdvancedSettings() {
  const { user } = useUser();
  const [loading, setLoading] = useState(false);
  const [currency, setCurrency] = useState('USD');
  const [timezone, setTimezone] = useState(tzGuess);
  const [prayerMethod, setPrayerMethod] = useState('MWL');
  const [latitude, setLatitude] = useState<string>('');
  const [longitude, setLongitude] = useState<string>('');
  const [telemetry, setTelemetry] = useState(true);
  const [allowLocation, setAllowLocation] = useState(false);

  const tzList = useMemo(() => [
    'Asia/Dubai', 'UTC', 'Europe/Helsinki', 'Europe/London', 
    'Asia/Riyadh', 'Africa/Cairo', 'Asia/Doha', 'Asia/Kolkata',
    'America/New_York', 'America/Los_Angeles', 'Europe/Paris',
    'Asia/Tokyo', 'Australia/Sydney'
  ], []);

  useEffect(() => {
    (async () => {
      if (!user) return;
      const { data } = await supabase
        .from('profiles')
        .select('currency, timezone, prayer_method, latitude, longitude, telemetry_enabled, allow_location')
        .eq('id', user.id)
        .maybeSingle();
      
      if (data) {
        setCurrency(data.currency ?? 'USD');
        setTimezone(data.timezone ?? tzGuess);
        setPrayerMethod(data.prayer_method ?? 'MWL');
        setLatitude(data.latitude?.toString() ?? '');
        setLongitude(data.longitude?.toString() ?? '');
        setTelemetry(!!data.telemetry_enabled);
        setTelemetryOn(!!data.telemetry_enabled);
        setAllowLocation(!!data.allow_location);
      }
    })();
  }, [user?.id, tzGuess]);

  async function saveSettings() {
    if (!user) return;
    setLoading(true);
    try {
      const { error } = await supabase.from('profiles').update({
        currency,
        timezone,
        prayer_method: prayerMethod,
        latitude: latitude ? parseFloat(latitude) : null,
        longitude: longitude ? parseFloat(longitude) : null,
        telemetry_enabled: telemetry,
        allow_location: allowLocation,
      }).eq('id', user.id);
      
      if (error) throw error;
      setTelemetryOn(telemetry);
      toast.success('تم حفظ الإعدادات بنجاح');
    } catch (e: any) {
      toast.error(e?.message ?? 'فشل حفظ الإعدادات');
    } finally {
      setLoading(false);
    }
  }

  async function captureLocation() {
    setLoading(true);
    try {
      const loc = await getDeviceLocation();
      if (loc) {
        setLatitude(loc.lat.toString());
        setLongitude(loc.lon.toString());
        toast.success('تم التقاط الموقع بنجاح');
      } else {
        toast.error('فشل التقاط الموقع');
      }
    } catch (e: any) {
      toast.error(e?.message ?? 'فشل التقاط الموقع');
    } finally {
      setLoading(false);
    }
  }

  if (!user) {
    return (
      <div className="text-center text-muted-foreground p-8">
        يرجى تسجيل الدخول لعرض الإعدادات
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold text-foreground mb-2">
          الإعدادات المتقدمة
        </h2>
        <p className="text-sm text-muted-foreground">
          إدارة إعدادات النظام المتقدمة والتفضيلات
        </p>
      </div>

      {/* Currency Settings */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <Card className="p-6 space-y-4">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-full bg-green-500/10 flex items-center justify-center">
              <DollarSign className="w-5 h-5 text-green-500" />
            </div>
            <div>
              <h3 className="font-semibold">العملة</h3>
              <p className="text-xs text-muted-foreground">اختر العملة الافتراضية</p>
            </div>
          </div>
          
          <label className="block space-y-2">
            <span className="text-sm font-medium">العملة المفضلة</span>
            <select 
              className="w-full px-3 py-2 rounded-lg border border-input bg-background text-foreground" 
              value={currency} 
              onChange={e => setCurrency(e.target.value)}
            >
              <option value="USD">USD - دولار أمريكي</option>
              <option value="AED">AED - درهم إماراتي</option>
              <option value="SAR">SAR - ريال سعودي</option>
              <option value="EGP">EGP - جنيه مصري</option>
              <option value="EUR">EUR - يورو</option>
              <option value="GBP">GBP - جنيه إسترليني</option>
            </select>
          </label>
        </Card>
      </motion.div>

      {/* Timezone Settings */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <Card className="p-6 space-y-4">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center">
              <Globe className="w-5 h-5 text-blue-500" />
            </div>
            <div>
              <h3 className="font-semibold">المنطقة الزمنية</h3>
              <p className="text-xs text-muted-foreground">ضبط المنطقة الزمنية للتقويم</p>
            </div>
          </div>
          
          <label className="block space-y-2">
            <span className="text-sm font-medium">المنطقة الزمنية</span>
            <select 
              className="w-full px-3 py-2 rounded-lg border border-input bg-background text-foreground" 
              value={timezone} 
              onChange={e => setTimezone(e.target.value)}
            >
              {tzList.map(tz => (
                <option key={tz} value={tz}>{tz}</option>
              ))}
            </select>
          </label>
        </Card>
      </motion.div>

      {/* Prayer Settings */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <Card className="p-6 space-y-4">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-full bg-purple-500/10 flex items-center justify-center">
              <Moon className="w-5 h-5 text-purple-500" />
            </div>
            <div>
              <h3 className="font-semibold">طريقة حساب الصلاة</h3>
              <p className="text-xs text-muted-foreground">اختر طريقة حساب أوقات الصلاة</p>
            </div>
          </div>
          
          <label className="block space-y-2">
            <span className="text-sm font-medium">الطريقة</span>
            <select 
              className="w-full px-3 py-2 rounded-lg border border-input bg-background text-foreground" 
              value={prayerMethod} 
              onChange={e => setPrayerMethod(e.target.value)}
            >
              <option value="MWL">رابطة العالم الإسلامي</option>
              <option value="ISNA">الجمعية الإسلامية لأمريكا الشمالية</option>
              <option value="Egypt">الهيئة المصرية العامة للمساحة</option>
              <option value="Makkah">جامعة أم القرى، مكة</option>
              <option value="Karachi">جامعة العلوم الإسلامية، كراتشي</option>
            </select>
          </label>
        </Card>
      </motion.div>

      {/* Location Settings */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
      >
        <Card className="p-6 space-y-4">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-full bg-orange-500/10 flex items-center justify-center">
              <MapPin className="w-5 h-5 text-orange-500" />
            </div>
            <div>
              <h3 className="font-semibold">الموقع الجغرافي</h3>
              <p className="text-xs text-muted-foreground">تحديد موقعك لحساب أوقات الصلاة</p>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-3">
            <label className="block space-y-2">
              <span className="text-sm font-medium">خط العرض</span>
              <input 
                className="w-full px-3 py-2 rounded-lg border border-input bg-background text-foreground" 
                value={latitude} 
                onChange={e => setLatitude(e.target.value)} 
                placeholder="25.2048"
                type="number"
                step="any"
              />
            </label>
            <label className="block space-y-2">
              <span className="text-sm font-medium">خط الطول</span>
              <input 
                className="w-full px-3 py-2 rounded-lg border border-input bg-background text-foreground" 
                value={longitude} 
                onChange={e => setLongitude(e.target.value)} 
                placeholder="55.2708"
                type="number"
                step="any"
              />
            </label>
          </div>

          <Button 
            variant="outline"
            className="w-full"
            onClick={captureLocation}
            disabled={loading}
          >
            <MapPin className="w-4 h-4 mr-2" />
            التقاط الموقع الحالي
          </Button>

          <label className="flex items-center gap-3 cursor-pointer p-3 rounded-lg hover:bg-muted/50 transition-colors">
            <input 
              type="checkbox" 
              className="w-4 h-4 rounded border-input" 
              checked={allowLocation} 
              onChange={e => setAllowLocation(e.target.checked)} 
            />
            <div className="flex-1">
              <span className="text-sm font-medium">السماح بتتبع الموقع</span>
              <p className="text-xs text-muted-foreground">السماح للتطبيق بالوصول إلى موقعك</p>
            </div>
          </label>
        </Card>
      </motion.div>

      {/* Analytics Settings */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
      >
        <Card className="p-6 space-y-4">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-full bg-cyan-500/10 flex items-center justify-center">
              <Activity className="w-5 h-5 text-cyan-500" />
            </div>
            <div>
              <h3 className="font-semibold">التحليلات</h3>
              <p className="text-xs text-muted-foreground">إدارة بيانات الاستخدام</p>
            </div>
          </div>
          
          <label className="flex items-center gap-3 cursor-pointer p-3 rounded-lg hover:bg-muted/50 transition-colors">
            <input 
              type="checkbox" 
              className="w-4 h-4 rounded border-input" 
              checked={telemetry} 
              onChange={e => setTelemetry(e.target.checked)} 
            />
            <div className="flex-1">
              <span className="text-sm font-medium">تفعيل التحليلات</span>
              <p className="text-xs text-muted-foreground">المساعدة في تحسين التطبيق بإرسال بيانات الاستخدام</p>
            </div>
          </label>
        </Card>
      </motion.div>

      {/* Save Button */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
      >
        <Button 
          onClick={saveSettings}
          disabled={loading}
          className="w-full"
          size="lg"
        >
          {loading ? 'جاري الحفظ...' : 'حفظ جميع الإعدادات'}
        </Button>
      </motion.div>
    </div>
  );
}

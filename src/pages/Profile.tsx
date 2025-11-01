import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useUser } from '@/lib/auth';
import { setTelemetryOn, track } from '@/lib/telemetry';
import { flushQueueOnce } from '@/lib/sync';
import { getQueued } from '@/lib/localdb/dexie';
import { rescheduleAllFromDB, ensureNotificationPerms } from '@/lib/notify';
import { getDeviceLocation } from '@/native/geo';

const tzGuess = Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Dubai';

export default function Profile() {
  const { user } = useUser();
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const [fullName, setFullName] = useState('');
  const [currency, setCurrency] = useState('USD');
  const [timezone, setTimezone] = useState(tzGuess);
  const [telemetry, setTelemetry] = useState(true);
  const [pendingCount, setPendingCount] = useState<number>(0);
  const [prayerMethod, setPrayerMethod] = useState('MWL');
  const [latitude, setLatitude] = useState<string>('');
  const [longitude, setLongitude] = useState<string>('');

  const tzList = useMemo(() => [
    'Asia/Dubai', 'UTC', 'Europe/Helsinki', 'Europe/London', 
    'Asia/Riyadh', 'Africa/Cairo', 'Asia/Doha', 'Asia/Kolkata'
  ], []);

  useEffect(() => {
    (async () => {
      if (!user) return;
      const { data } = await supabase
        .from('profiles')
        .select('full_name,currency,timezone,telemetry_enabled,prayer_method,latitude,longitude')
        .eq('id', user.id)
        .maybeSingle();
      if (data) {
        setFullName(data.full_name ?? '');
        setCurrency(data.currency ?? 'USD');
        setTimezone(data.timezone ?? tzGuess);
        setTelemetry(!!data.telemetry_enabled);
        setTelemetryOn(!!data.telemetry_enabled);
        setPrayerMethod(data.prayer_method ?? 'MWL');
        setLatitude(data.latitude?.toString() ?? '');
        setLongitude(data.longitude?.toString() ?? '');
      }
      const q = await getQueued();
      setPendingCount(q.length);
    })();
  }, [user?.id, tzGuess]);

  async function save() {
    if (!user) return;
    setLoading(true); 
    setErr(null); 
    setMsg(null);
    try {
      const { error } = await supabase.from('profiles').upsert({
        id: user.id,
        full_name: fullName || null,
        currency,
        timezone,
        telemetry_enabled: telemetry,
        prayer_method: prayerMethod,
        latitude: latitude ? parseFloat(latitude) : null,
        longitude: longitude ? parseFloat(longitude) : null
      });
      if (error) throw error;
      setTelemetryOn(telemetry);
      setMsg('تم الحفظ ✅');
      track('profile_saved', { currency, timezone, telemetry, prayerMethod });
    } catch (e: any) {
      setErr(e?.message ?? 'تعذّر الحفظ');
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
        setMsg('تم الحصول على الموقع ✅');
      } else {
        setErr('تعذر الحصول على الموقع');
      }
    } catch (e: any) {
      setErr(e?.message ?? 'خطأ في الموقع');
    } finally {
      setLoading(false);
    }
  }

  if (!user) {
    return (
      <div className="container mx-auto p-4">
        <div className="text-center text-muted-foreground">
          سجّل الدخول لعرض الإعدادات.
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 space-y-6">
      <h1 className="text-3xl font-bold">حسابي</h1>

      <div className="grid md:grid-cols-2 gap-6">
        {/* البيانات الأساسية */}
        <div className="rounded-2xl border border-border p-6 bg-card space-y-4">
          <div className="text-sm text-muted-foreground font-medium">البيانات الأساسية</div>
          
          <label className="block space-y-2">
            <span className="text-sm font-medium">الاسم</span>
            <input 
              className="w-full px-3 py-2 rounded-lg border border-input bg-background text-foreground" 
              value={fullName} 
              onChange={e => setFullName(e.target.value)} 
              placeholder="اسمك"
            />
          </label>

          <label className="block space-y-2">
            <span className="text-sm font-medium">العملة</span>
            <select 
              className="w-full px-3 py-2 rounded-lg border border-input bg-background text-foreground" 
              value={currency} 
              onChange={e => setCurrency(e.target.value)}
            >
              <option>USD</option>
              <option>AED</option>
              <option>SAR</option>
              <option>EGP</option>
              <option>EUR</option>
            </select>
          </label>

          <label className="block space-y-2">
            <span className="text-sm font-medium">المنطقة الزمنية</span>
            <select 
              className="w-full px-3 py-2 rounded-lg border border-input bg-background text-foreground" 
              value={timezone} 
              onChange={e => setTimezone(e.target.value)}
            >
              {tzList.map(tz => <option key={tz} value={tz}>{tz}</option>)}
            </select>
          </label>

          <label className="block space-y-2">
            <span className="text-sm font-medium">طريقة حساب الصلاة</span>
            <select 
              className="w-full px-3 py-2 rounded-lg border border-input bg-background text-foreground" 
              value={prayerMethod} 
              onChange={e => setPrayerMethod(e.target.value)}
            >
              <option value="MWL">Muslim World League</option>
              <option value="ISNA">Islamic Society of North America</option>
              <option value="Egypt">Egyptian General Authority</option>
              <option value="Makkah">Umm Al-Qura University, Makkah</option>
              <option value="Karachi">University of Islamic Sciences, Karachi</option>
            </select>
          </label>

          <div className="space-y-2">
            <span className="text-sm font-medium">الموقع الجغرافي</span>
            <div className="grid grid-cols-2 gap-2">
              <input 
                className="px-3 py-2 rounded-lg border border-input bg-background text-foreground" 
                value={latitude} 
                onChange={e => setLatitude(e.target.value)} 
                placeholder="خط العرض"
                type="number"
                step="any"
              />
              <input 
                className="px-3 py-2 rounded-lg border border-input bg-background text-foreground" 
                value={longitude} 
                onChange={e => setLongitude(e.target.value)} 
                placeholder="خط الطول"
                type="number"
                step="any"
              />
            </div>
            <button 
              className="w-full px-4 py-2 rounded-lg bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-colors text-sm"
              onClick={captureLocation}
              disabled={loading}
            >
              📍 التقاط من الجهاز
            </button>
          </div>

          <label className="flex items-center gap-3 cursor-pointer">
            <input 
              type="checkbox" 
              className="w-4 h-4 rounded border-input" 
              checked={telemetry} 
              onChange={e => setTelemetry(e.target.checked)} 
            />
            <span className="text-sm">تفعيل القياس (PostHog)</span>
          </label>

          <div className="flex gap-3 pt-2">
            <button 
              className="px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50" 
              disabled={loading} 
              onClick={save}
            >
              {loading ? '...' : 'حفظ'}
            </button>
            {msg && <span className="text-green-700 dark:text-green-400 text-sm self-center">{msg}</span>}
            {err && <span className="text-red-700 dark:text-red-400 text-sm self-center">{err}</span>}
          </div>
        </div>

        {/* عمليات سريعة */}
        <div className="rounded-2xl border border-border p-6 bg-card space-y-4">
          <div className="text-sm text-muted-foreground font-medium">عمليات سريعة</div>
          
          <div className="p-3 rounded-lg bg-muted/50">
            <div className="text-sm">
              أوامر أوفلاين المعلّقة: <b className="font-semibold">{pendingCount}</b>
            </div>
          </div>

          <div className="space-y-2">
            <button 
              className="w-full px-4 py-2 rounded-lg bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-colors text-sm"
              onClick={async () => {
                await flushQueueOnce();
                const q = await getQueued(); 
                setPendingCount(q.length);
              }}
            >
              Flush الطابور
            </button>
            
            <button 
              className="w-full px-4 py-2 rounded-lg bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-colors text-sm"
              onClick={async () => {
                await ensureNotificationPerms();
                await rescheduleAllFromDB();
              }}
            >
              إعادة جدولة التذكيرات
            </button>
            
            <button 
              className="w-full px-4 py-2 rounded-lg bg-destructive text-destructive-foreground hover:bg-destructive/90 transition-colors text-sm"
              onClick={() => {
                setTelemetryOn(false);
                setTelemetry(false);
              }}
            >
              إيقاف القياس الآن
            </button>
          </div>

          <div className="p-3 rounded-lg bg-muted/30 border border-border">
            <div className="text-xs text-muted-foreground space-y-1">
              <div>المعرّف: <span className="font-mono">{user.id}</span></div>
              <div>البريد: {user.email}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

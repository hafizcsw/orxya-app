import { useEffect, useState } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { genIdem } from '@/lib/sync'
import { useUser } from '@/lib/auth'
import { Toast } from '@/components/Toast'
import { track } from '@/lib/telemetry'
import { SessionBanner } from '@/components/SessionBanner'
import { ensureNotificationPerms, rescheduleAllFromDB } from '@/lib/notify'
import { getDeviceLocation } from '@/native/geo'
import { LocalNotifications } from '@capacitor/local-notifications'

const Automation = () => {
  const { user } = useUser()
  const [rows, setRows] = useState<any[]>([])
  const [toast, setToast] = useState<string | null>(null)

  async function load() {
    if (!user) return setRows([])
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(20)
    if (!error) setRows(data ?? [])
  }

  useEffect(() => { 
    void ensureNotificationPerms();
    load().then(() => void rescheduleAllFromDB());
  }, [user?.id])

  async function saveDefaults() {
    try {
      const body = (label: string, time_local: string) => ({
        command: 'set_alarm',
        idempotency_key: genIdem(),
        payload: { label, time_local }
      })
      await supabase.functions.invoke('commands', { body: body('Morning Plan', '08:00') })
      await supabase.functions.invoke('commands', { body: body('Daily Check-in', '21:30') })
      await rescheduleAllFromDB();
      setToast('تم الحفظ ✅')
      track('automation_saved_defaults', { count: 2 })
      track('automation_rescheduled_after_save', { count: 2 })
      load()
    } catch {
      setToast('تعذّر الحفظ الآن — جرّب لاحقًا')
    }
  }

  async function scheduleTodayPrayers() {
    const { data: sess } = await supabase.auth.getSession();
    const uid = sess?.session?.user?.id;
    if (!uid) return;

    const today = new Date().toISOString().slice(0, 10);
    const { data, error } = await supabase
      .from('prayer_times')
      .select('date_iso,fajr,dhuhr,asr,maghrib,isha')
      .eq('owner_id', uid)
      .eq('date_iso', today)
      .maybeSingle();
    
    if (error || !data) return;

    const granted = await ensureNotificationPerms();
    if (!granted) return;

    const toDate = (hhmm: string) => {
      const [hh, mm] = hhmm.split(':').map(x => parseInt(x, 10));
      const d = new Date();
      d.setHours(hh, mm, 0, 0);
      if (d.getTime() <= Date.now()) d.setDate(d.getDate() + 1);
      return d;
    };

    const items = [
      { label: 'الفجر', time: data.fajr },
      { label: 'الظهر', time: data.dhuhr },
      { label: 'العصر', time: data.asr },
      { label: 'المغرب', time: data.maghrib },
      { label: 'العشاء', time: data.isha },
    ].filter(x => !!x.time);

    const notifications = items.map((x, i) => ({
      id: 210000 + i,
      title: x.label,
      body: `موعد ${x.label} الآن`,
      schedule: { at: toDate(String(x.time)) },
      smallIcon: 'ic_stat_icon'
    }));

    if (notifications.length) {
      await LocalNotifications.schedule({ notifications });
    }
  }

  async function syncAndSchedulePrayers(days: number = 1) {
    try {
      let lat = null, lon = null;
      const loc = await getDeviceLocation();
      if (loc) { lat = loc.lat; lon = loc.lon; }
      
      const { data: sess } = await supabase.auth.getSession();
      const uid = sess?.session?.user?.id;
      if (uid && lat && lon) {
        await supabase.from('profiles').update({ latitude: lat, longitude: lon }).eq('id', uid);
      }

      await supabase.functions.invoke('prayer-sync', {
        body: { days, ...(lat && lon ? { lat, lon } : {}) }
      });

      if (days === 1) {
        await scheduleTodayPrayers();
        setToast('تمت مزامنة مواقيت اليوم وجدولة التنبيهات ⏰');
        track('prayers_synced_and_scheduled');
      } else {
        setToast(`تمت مزامنة مواقيت ${days} أيام ✅`);
        track('prayers_synced_range', { days });
      }
    } catch (e: any) {
      setToast(`خطأ: ${e.message}`);
    }
  }

  return (
    <div className="p-4 space-y-4 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">الأتمتة والتذكيرات</h1>
      
      <SessionBanner />
      
      {!user && (
        <div className="bg-yellow-50 border border-yellow-200 text-yellow-900 p-3 rounded-lg">
          سجّل الدخول لمزامنة التذكيرات.
        </div>
      )}
      
      <button onClick={saveDefaults} className="btn max-w-xs">
        حفظ التذكيرات الافتراضية (08:00 + 21:30)
      </button>
      
      <div className="p-4 border rounded-2xl bg-white">
        <div className="font-semibold mb-2">التذكيرات المحفوظة</div>
        {rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">لا توجد تذكيرات محفوظة</p>
        ) : (
          <ul className="text-sm space-y-1">
            {rows.map(r => (
              <li key={r.id}>• {r.label} — {r.time_local} {r.enabled ? '✅' : '⏸️'}</li>
            ))}
          </ul>
        )}
      </div>

      <div className="rounded-2xl border p-4 bg-white/70 space-y-3">
        <div className="text-sm opacity-70 font-semibold">مواقيت الصلاة</div>
        <div className="flex gap-2 flex-wrap">
          <button 
            className="btn" 
            onClick={() => syncAndSchedulePrayers(1)}
          >
            مزامنة مواقيت اليوم + جدولة
          </button>
          <button 
            className="btn" 
            onClick={() => syncAndSchedulePrayers(7)}
          >
            مزامنة 7 أيام
          </button>
        </div>
      </div>
      
      {toast && <Toast msg={toast} />}
    </div>
  )
}

export default Automation

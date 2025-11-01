import { supabase } from "@/integrations/supabase/client";
import { LocalNotifications } from "@capacitor/local-notifications";

type PT = { fajr?: string; dhuhr?: string; asr?: string; maghrib?: string; isha?: string };

const isNative = !!(window as any).Capacitor?.isNativePlatform?.();

function toDateToday(hhmm: string) {
  const [hh, mm] = hhmm.split(":").map((x) => parseInt(x, 10));
  const d = new Date();
  d.setHours(hh, mm, 0, 0);
  if (d.getTime() <= Date.now()) d.setDate(d.getDate() + 1);
  return d;
}

export async function ensureNotificationPerms(): Promise<boolean> {
  try {
    const perm = await LocalNotifications.checkPermissions();
    if (perm.display === "granted") return true;
    const req = await LocalNotifications.requestPermissions();
    return req.display === "granted";
  } catch {
    return false;
  }
}

/** يجلب مواقيت يوم محدد من DB (بعد تشغيل edge function) */
export async function getPrayerTimesFor(dateISO: string): Promise<PT | null> {
  const { data: sess } = await supabase.auth.getSession();
  const uid = sess?.session?.user?.id;
  if (!uid) return null;
  const { data } = await supabase
    .from("prayer_times")
    .select("fajr,dhuhr,asr,maghrib,isha")
    .eq("owner_id", uid)
    .eq("date_iso", dateISO)
    .maybeSingle();
  return (data ?? null) as PT | null;
}

/** يستدعي Edge Function لحفظ مواقيت التاريخ المطلوب ثم يرجعها */
export async function syncPrayers(dateISO: string): Promise<PT | null> {
  await supabase.functions.invoke("prayer-sync", { body: { date: dateISO, days: 1 } });
  return getPrayerTimesFor(dateISO);
}

/** يُجدول إشعارات اليوم (فجر→عشاء). استدعِه بعد syncPrayers أو إذا كانت البيانات موجودة. */
export async function schedulePrayersFor(dateISO: string): Promise<number> {
  const ok = await ensureNotificationPerms();
  if (!ok) return 0;

  const times = await getPrayerTimesFor(dateISO);
  if (!times) return 0;

  const items = [
    { label: "الفجر", t: times.fajr },
    { label: "الظهر", t: times.dhuhr },
    { label: "العصر", t: times.asr },
    { label: "المغرب", t: times.maghrib },
    { label: "العشاء", t: times.isha },
  ].filter((x) => !!x.t);

  const notifications = items.map((x, i) => ({
    id: 210000 + i, // نطاق ثابت لتجنّب التعارض
    title: x.label,
    body: `موعد ${x.label} الآن`,
    schedule: { at: toDateToday(String(x.t)) },
    smallIcon: "ic_stat_icon",
  }));

  if (notifications.length) {
    await LocalNotifications.schedule({ notifications });
  }
  return notifications.length;
}

/** مجدول يومي خاص بالصلاة: عند 00:03 يزامن تاريخ اليوم ويعيد الجدولة تلقائيًا */
export function startPrayerDailyScheduler() {
  // على الويب يعمل أيضًا، ولكن الفائدة المثلى على المنصات الـ Native
  const now = new Date();
  const next = new Date();
  next.setHours(0, 3, 0, 0); // 00:03
  if (next.getTime() <= now.getTime()) next.setDate(next.getDate() + 1);
  const delay = next.getTime() - now.getTime();

  setTimeout(async () => {
    const today = new Date().toISOString().slice(0, 10);
    try {
      await syncPrayers(today);
      await schedulePrayersFor(today);
    } catch (e) {
      console.error("Prayer daily scheduler error:", e);
    }
    
    // كرر كل 24 ساعة
    setInterval(async () => {
      const d = new Date().toISOString().slice(0, 10);
      try {
        await syncPrayers(d);
        await schedulePrayersFor(d);
      } catch (e) {
        console.error("Prayer daily scheduler error:", e);
      }
    }, 24 * 60 * 60 * 1000);
  }, delay);
}

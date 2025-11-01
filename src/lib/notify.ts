// src/lib/notify.ts
import { LocalNotifications } from '@capacitor/local-notifications';
import { supabase } from '@/integrations/supabase/client';

type NotiRow = {
  id: string;
  label: string;
  time_local: string; // 'HH:MM'
  enabled?: boolean;
};

// طلب الإذن (iOS/Android 13+)
export async function ensureNotificationPerms(): Promise<boolean> {
  try {
    const perm = await LocalNotifications.checkPermissions();
    if (perm.display === 'granted') return true;
    const req = await LocalNotifications.requestPermissions();
    return req.display === 'granted';
  } catch {
    return false;
  }
}

// حساب تاريخ/وقت التنفيذ القادم بناءً على توقيت الجهاز المحلي
function nextFireDate(timeLocal: string): Date {
  const [hh, mm] = timeLocal.split(':').map((v) => parseInt(v, 10));
  const now = new Date();
  const d = new Date();
  d.setHours(hh, mm, 0, 0);
  // إن كان الوقت اليوم قد مضى، نرحّل للغد
  if (d.getTime() <= now.getTime()) {
    d.setDate(d.getDate() + 1);
  }
  return d;
}

// توليد معرّف ثابت قابل للتكرار للجدولة المحلية
function toScheduleId(label: string, timeLocal: string): number {
  // hash بسيط
  const str = `${label}__${timeLocal}`;
  let h = 0;
  for (let i = 0; i < str.length; i++) h = ((h << 5) - h) + str.charCodeAt(i);
  return Math.abs(h % 2147483647);
}

export async function cancelAllScheduled(): Promise<void> {
  try { 
    await LocalNotifications.cancel({ notifications: [] }); 
  } catch {}
}

export async function scheduleRows(rows: NotiRow[]): Promise<void> {
  const granted = await ensureNotificationPerms();
  if (!granted) return;
  const notifications = [];
  for (const r of rows) {
    if (r.enabled === false) continue;
    const at = nextFireDate(r.time_local);
    notifications.push({
      id: toScheduleId(r.label, r.time_local),
      title: r.label,
      body: `تذكير ${r.time_local}`,
      schedule: { at }, // نعيد جدولة يوميًا عبر روتين يومي
      smallIcon: 'ic_stat_icon',
      sound: undefined,
      actionTypeId: undefined,
      extra: { key: 'oryxa' },
    });
  }
  if (notifications.length > 0) {
    await LocalNotifications.schedule({ notifications });
  }
}

// جلب من Supabase ثم جدولة
export async function rescheduleAllFromDB(): Promise<void> {
  try {
    const { data: sess } = await supabase.auth.getSession();
    const uid = sess?.session?.user?.id;
    if (!uid) return; // لا نعيد الجدولة بدون جلسة؛ الإدخالات تبقى محلية

    const { data, error } = await supabase
      .from('notifications')
      .select('id,label,time_local,enabled')
      .eq('owner_id', uid)
      .order('created_at', { ascending: false })
      .limit(100);

    if (error) return;
    await cancelAllScheduled();
    await scheduleRows((data ?? []) as NotiRow[]);
  } catch {
    // تجاهل الأخطاء الصامتة
  }
}

// روتين يومي بسيط: يعيد الجدولة بعد منتصف الليل بدقائق
export function startDailyRescheduler(): void {
  const now = new Date();
  const next = new Date();
  next.setHours(0, 2, 0, 0); // 00:02
  if (next.getTime() <= now.getTime()) next.setDate(next.getDate() + 1);
  const delay = next.getTime() - now.getTime();
  setTimeout(() => {
    void rescheduleAllFromDB();
    setInterval(() => void rescheduleAllFromDB(), 24 * 60 * 60 * 1000);
  }, delay);
}

// deno-lint-ignore-file no-explicit-any
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function json(b: any, s = 200) {
  return new Response(JSON.stringify(b), {
    status: s,
    headers: { ...cors, "content-type": "application/json" }
  });
}

function getArabicPrayerName(name: string): string {
  const names: Record<string, string> = {
    fajr: 'الفجر',
    dhuhr: 'الظهر',
    asr: 'العصر',
    maghrib: 'المغرب',
    isha: 'العشاء'
  };
  return names[name] || name;
}

async function createPrayerReminders(
  supabase: any,
  userId: string,
  date: string
): Promise<number> {
  // جلب prayer schedules
  const { data: schedules } = await supabase
    .from('prayer_schedules')
    .select('*')
    .eq('owner_id', userId)
    .eq('date_iso', date);

  if (!schedules || schedules.length === 0) {
    // إنشاء من prayer_times فقط
    const { data: prayerTimes } = await supabase
      .from('prayer_times')
      .select('*')
      .eq('owner_id', userId)
      .eq('date_iso', date)
      .maybeSingle();

    if (!prayerTimes) return 0;

    // إنشاء schedules افتراضية
    const prayers = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'];
    for (const prayer of prayers) {
      if (prayerTimes[prayer]) {
        await supabase.from('prayer_schedules').insert({
          owner_id: userId,
          date_iso: date,
          prayer_name: prayer,
          prayer_time: prayerTimes[prayer]
        });
      }
    }

    // إعادة جلب الـ schedules
    const { data: newSchedules } = await supabase
      .from('prayer_schedules')
      .select('*')
      .eq('owner_id', userId)
      .eq('date_iso', date);

    if (!newSchedules) return 0;
    return await createRemindersFromSchedules(supabase, userId, date, newSchedules);
  }

  return await createRemindersFromSchedules(supabase, userId, date, schedules);
}

async function createRemindersFromSchedules(
  supabase: any,
  userId: string,
  date: string,
  schedules: any[]
): Promise<number> {
  let created = 0;

  for (const schedule of schedules) {
    const prayerName = getArabicPrayerName(schedule.prayer_name);
    const prayerDateTime = new Date(`${date}T${schedule.prayer_time}Z`);

    // إنشاء تنبيهات حسب reminder_times
    for (const minutesBefore of schedule.reminder_times) {
      const reminderTime = new Date(prayerDateTime.getTime() - minutesBefore * 60000);

      let title = '';
      let body = '';
      let priority = 1;

      if (minutesBefore === 30) {
        title = `⏰ ${prayerName} بعد 30 دقيقة`;
        body = 'حان وقت التحضير والانتهاء من الأعمال الحالية';
        priority = 1;
      } else if (minutesBefore === 10) {
        title = `🕌 ${prayerName} بعد 10 دقائق`;
        body = 'حان وقت التوضؤ والاستعداد للصلاة';
        priority = 2;
      } else if (minutesBefore === 5) {
        title = `📿 ${prayerName} بعد 5 دقائق`;
        body = 'توجه إلى مكان الصلاة الآن';
        priority = 3;
      } else if (minutesBefore === 0) {
        title = `🕋 حان وقت ${prayerName}`;
        body = 'الله أكبر - حي على الصلاة';
        priority = 5;
      } else {
        continue; // تخطي أي أوقات أخرى
      }

      // فحص إذا كان التنبيه موجود بالفعل
      const { data: existing } = await supabase
        .from('notifications')
        .select('id')
        .eq('owner_id', userId)
        .eq('scheduled_at', reminderTime.toISOString())
        .eq('entity_type', 'prayer')
        .eq('entity_id', schedule.id)
        .maybeSingle();

      if (existing) continue; // موجود بالفعل

      // إنشاء التنبيه
      const { error } = await supabase.from('notifications').insert({
        owner_id: userId,
        title,
        body,
        scheduled_at: reminderTime.toISOString(),
        entity_type: 'prayer',
        entity_id: schedule.id,
        channel: 'local',
        priority,
        payload: {
          type: 'prayer_reminder',
          prayer_name: schedule.prayer_name,
          prayer_time: schedule.prayer_time,
          minutes_before: minutesBefore,
          mosque_location: schedule.mosque_location,
          travel_time_min: schedule.travel_time_min
        }
      });

      if (!error) created++;
    }
  }

  return created;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return json({ ok: true });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } } }
    );

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return json({ ok: false, error: "UNAUTHENTICATED" }, 401);

    const body = await req.json().catch(() => ({}));
    const { date } = body;
    const targetDate = date || new Date().toISOString().split('T')[0];

    const remindersCreated = await createPrayerReminders(supabase, user.id, targetDate);

    return json({
      ok: true,
      date: targetDate,
      reminders_created: remindersCreated
    });
  } catch (e) {
    console.error('[prayer-reminders-smart]', e);
    return json({ ok: false, error: String(e) }, 500);
  }
});

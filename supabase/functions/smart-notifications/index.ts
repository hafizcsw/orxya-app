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

function getTimeOfDay(hour: number): string {
  if (hour >= 5 && hour < 12) return 'morning';
  if (hour >= 12 && hour < 17) return 'afternoon';
  if (hour >= 17 && hour < 21) return 'evening';
  return 'night';
}

async function getNextPrayer(supabase: any, userId: string): Promise<any> {
  const today = new Date().toISOString().split('T')[0];
  
  const { data } = await supabase
    .from('prayer_times')
    .select('*')
    .eq('owner_id', userId)
    .eq('date_iso', today)
    .maybeSingle();

  if (!data) return null;

  const now = new Date();
  const currentTime = now.getHours() * 60 + now.getMinutes();

  const prayers = [
    { name: 'fajr', time: data.fajr },
    { name: 'dhuhr', time: data.dhuhr },
    { name: 'asr', time: data.asr },
    { name: 'maghrib', time: data.maghrib },
    { name: 'isha', time: data.isha }
  ];

  for (const prayer of prayers) {
    if (!prayer.time) continue;
    const [hours, minutes] = prayer.time.split(':').map(Number);
    const prayerMinutes = hours * 60 + minutes;
    
    if (prayerMinutes > currentTime) {
      return {
        name: prayer.name,
        time: prayer.time,
        minutesUntil: prayerMinutes - currentTime
      };
    }
  }

  return null;
}

async function getUpcomingEvents(supabase: any, userId: string, hours: number = 2): Promise<any[]> {
  const now = new Date();
  const future = new Date(now.getTime() + hours * 60 * 60 * 1000);

  const { data } = await supabase
    .from('events')
    .select('*')
    .eq('owner_id', userId)
    .gte('starts_at', now.toISOString())
    .lte('starts_at', future.toISOString())
    .order('starts_at', { ascending: true });

  return data || [];
}

async function createContextualNotification(
  supabase: any,
  userId: string,
  type: string
): Promise<any> {
  const nextPrayer = await getNextPrayer(supabase, userId);
  const upcomingEvents = await getUpcomingEvents(supabase, userId);
  
  let notification: any = {
    owner_id: userId,
    channel: 'local',
    priority: 1
  };

  switch (type) {
    case 'time_before_prayer': {
      if (!nextPrayer) break;
      
      const minutesUntil = nextPrayer.minutesUntil;
      
      if (minutesUntil <= 30 && minutesUntil > 20) {
        // إشعار 30 دقيقة قبل الصلاة
        const canFinishTasks = upcomingEvents.filter(ev => {
          const duration = ev.duration_min || 30;
          return duration < minutesUntil - 10;
        });

        notification.title = `⏰ الصلاة بعد ${minutesUntil} دقيقة`;
        notification.body = canFinishTasks.length > 0
          ? `يمكنك إنهاء: ${canFinishTasks.map(t => t.title).join(', ')}`
          : 'حان وقت التحضير للصلاة';
        notification.payload = {
          type: 'prayer_reminder',
          prayer_name: nextPrayer.name,
          minutes_until: minutesUntil,
          can_finish_tasks: canFinishTasks.length
        };
      } else if (minutesUntil <= 10) {
        // إشعار 10 دقائق قبل الصلاة
        notification.title = `🕌 ${nextPrayer.name} بعد ${minutesUntil} دقائق`;
        notification.body = 'حان وقت التحضير للصلاة';
        notification.payload = {
          type: 'prayer_imminent',
          prayer_name: nextPrayer.name,
          minutes_until: minutesUntil
        };
        notification.priority = 3;
      }
      break;
    }

    case 'gap_opportunity': {
      // البحث عن فجوة في الجدول
      const events = await getUpcomingEvents(supabase, userId, 6);
      
      if (events.length >= 2) {
        const gap = new Date(events[1].starts_at).getTime() - new Date(events[0].ends_at || events[0].starts_at).getTime();
        const gapMinutes = gap / 60000;

        if (gapMinutes >= 30 && gapMinutes <= 90) {
          // هناك فجوة مناسبة
          const gapStart = new Date(events[0].ends_at || events[0].starts_at);
          
          notification.title = `⏳ لديك ${Math.floor(gapMinutes)} دقيقة فراغ`;
          notification.body = `بين ${events[0].title} و ${events[1].title}. اقتراحات: استراحة، مهمة سريعة، أو صلاة نافلة`;
          notification.payload = {
            type: 'gap_opportunity',
            gap_minutes: gapMinutes,
            gap_start: gapStart.toISOString(),
            before_event: events[0].title,
            after_event: events[1].title
          };
        }
      }
      break;
    }

    case 'travel_reminder': {
      // التذكير بوقت المغادرة
      const nextEvent = upcomingEvents[0];
      if (!nextEvent || !nextEvent.location) break;

      const minutesUntilEvent = (new Date(nextEvent.starts_at).getTime() - new Date().getTime()) / 60000;
      const travelTime = nextEvent.travel_minutes || 30; // افتراضياً 30 دقيقة

      if (minutesUntilEvent <= travelTime + 15 && minutesUntilEvent > travelTime) {
        notification.title = `🚗 وقت المغادرة قريب`;
        notification.body = `موعدك "${nextEvent.title}" يبعد ${Math.floor(minutesUntilEvent)} دقيقة. وقت السفر المقدر: ${travelTime} دقيقة`;
        notification.payload = {
          type: 'travel_reminder',
          event_id: nextEvent.id,
          event_title: nextEvent.title,
          travel_time: travelTime,
          leave_in: minutesUntilEvent - travelTime
        };
        notification.priority = 2;
      }
      break;
    }
  }

  // تسجيل في notification_patterns للتعلم
  if (notification.title) {
    const { data: insertedNotif } = await supabase
      .from('notifications')
      .insert(notification)
      .select()
      .single();

    if (insertedNotif) {
      await supabase.from('notification_patterns').insert({
        owner_id: userId,
        notification_type: type,
        sent_at: new Date().toISOString(),
        time_of_day: getTimeOfDay(new Date().getHours()),
        day_of_week: new Date().getDay(),
        context: notification.payload
      });
    }

    return insertedNotif;
  }

  return null;
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
    const notificationType = body.type || 'time_before_prayer';

    const notification = await createContextualNotification(supabase, user.id, notificationType);

    if (notification) {
      return json({ ok: true, notification });
    }

    return json({ ok: true, message: 'لا توجد إشعارات سياقية الآن' });
  } catch (e) {
    console.error('[smart-notifications]', e);
    return json({ ok: false, error: String(e) }, 500);
  }
});

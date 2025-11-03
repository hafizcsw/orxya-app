import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

interface ConflictCheckRequest {
  date?: string;
  event_id?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      global: { headers: { Authorization: authHeader } }
    });

    const { data: { user }, error: userError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    const { date, event_id }: ConflictCheckRequest = await req.json();
    const checkDate = date || new Date().toISOString().split('T')[0];

    console.log('🔍 Conflict check:', { userId: user.id, date: checkDate });

    // جلب مواقيت الصلاة لليوم
    const { data: prayerTimes } = await supabase
      .from('prayer_times')
      .select('*')
      .eq('owner_id', user.id)
      .eq('date_iso', checkDate)
      .maybeSingle();

    if (!prayerTimes) {
      console.log('No prayer times found for date:', checkDate);
      return new Response(
        JSON.stringify({ conflicts: [], message: 'No prayer times available' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // جلب الأحداث لليوم
    let eventsQuery = supabase
      .from('events')
      .select('*')
      .eq('owner_id', user.id)
      .gte('starts_at', `${checkDate}T00:00:00`)
      .lt('starts_at', `${checkDate}T23:59:59`);

    if (event_id) {
      eventsQuery = eventsQuery.eq('id', event_id);
    }

    const { data: events } = await eventsQuery;

    if (!events || events.length === 0) {
      console.log('No events found for date:', checkDate);
      return new Response(
        JSON.stringify({ conflicts: [], message: 'No events to check' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // فحص التعارضات
    const conflicts = [];
    const prayers = [
      { name: 'fajr', time: prayerTimes.fajr, window: 15 },
      { name: 'dhuhr', time: prayerTimes.dhuhr, window: 15 },
      { name: 'asr', time: prayerTimes.asr, window: 15 },
      { name: 'maghrib', time: prayerTimes.maghrib, window: 15 },
      { name: 'isha', time: prayerTimes.isha, window: 15 }
    ];

    for (const event of events) {
      const eventStart = new Date(event.starts_at);
      const eventEnd = event.ends_at ? new Date(event.ends_at) : new Date(eventStart.getTime() + 60 * 60 * 1000);

      for (const prayer of prayers) {
        if (!prayer.time) continue;

        // Normalize time format: remove seconds if present (HH:MM:SS -> HH:MM)
        const timeStr = String(prayer.time).split(':').slice(0, 2).join(':');
        const prayerTime = new Date(`${checkDate}T${timeStr}`);
        const prayerWindowStart = new Date(prayerTime.getTime() - prayer.window * 60 * 1000);
        const prayerWindowEnd = new Date(prayerTime.getTime() + prayer.window * 60 * 1000);

        const hasConflict = 
          (eventStart >= prayerWindowStart && eventStart <= prayerWindowEnd) ||
          (eventEnd >= prayerWindowStart && eventEnd <= prayerWindowEnd) ||
          (eventStart <= prayerWindowStart && eventEnd >= prayerWindowEnd);

        if (hasConflict) {
          const conflict = {
            id: `${event.id}_${prayer.name}`,
            event_id: event.id,
            event_title: event.title,
            event_start: event.starts_at,
            event_end: event.ends_at,
            prayer_name: prayer.name,
            prayer_time: prayer.time,
            severity: calculateSeverity(eventStart, eventEnd, prayerTime),
            suggestions: generateSuggestions(event, prayer, prayerTime)
          };

          conflicts.push(conflict);

          await supabase.from('conflicts').upsert({
            owner_id: user.id,
            object_id: event.id,
            object_kind: 'event',
            date_iso: checkDate,
            prayer_name: prayer.name,
            prayer_start: prayerWindowStart.toISOString(),
            prayer_end: prayerWindowEnd.toISOString(),
            overlap_min: Math.round((Math.min(eventEnd.getTime(), prayerWindowEnd.getTime()) - Math.max(eventStart.getTime(), prayerWindowStart.getTime())) / (60 * 1000)),
            severity: calculateSeverity(eventStart, eventEnd, prayerTime),
            status: 'open'
          }, { onConflict: 'owner_id,object_id,prayer_name,date_iso' });
        }
      }
    }

    console.log(`✅ Found ${conflicts.length} conflicts`);

    return new Response(
      JSON.stringify({ 
        success: true,
        conflicts,
        date: checkDate,
        total: conflicts.length
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ Conflict check error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: errorMessage 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});

function calculateSeverity(eventStart: Date, eventEnd: Date, prayerTime: Date): 'high' | 'medium' | 'low' {
  const startDiff = Math.abs(eventStart.getTime() - prayerTime.getTime()) / (60 * 1000);
  const endDiff = Math.abs(eventEnd.getTime() - prayerTime.getTime()) / (60 * 1000);
  const minDiff = Math.min(startDiff, endDiff);

  if (minDiff <= 5) return 'high';
  if (minDiff <= 10) return 'medium';
  return 'low';
}

function generateSuggestions(event: any, prayer: any, prayerTime: Date): string[] {
  const suggestions = [];
  
  suggestions.push(`تأجيل "${event.title}" لـ 15 دقيقة بعد ${prayer.name}`);
  suggestions.push(`تقديم "${event.title}" لـ 30 دقيقة قبل ${prayer.name}`);
  suggestions.push(`تقصير مدة "${event.title}" لإنهائه قبل ${prayer.name}`);
  suggestions.push('تجاهل التعارض لهذا اليوم فقط');

  return suggestions;
}

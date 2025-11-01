import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ConflictCheckParams {
  from?: string;
  to?: string;
  days?: number;
  buffer_min?: number;
  upsert?: boolean;
  timezone?: string;
}

interface PrayerTimes {
  fajr: string | null;
  dhuhr: string | null;
  asr: string | null;
  maghrib: string | null;
  isha: string | null;
}

function ensureHHMM(s: string | null): string | null {
  if (!s) return null;
  const m = /^(\d{1,2}):(\d{2})/.exec(s.trim());
  if (!m) return null;
  const hh = String(Math.min(23, Math.max(0, +m[1]))).padStart(2, '0');
  const mm = String(Math.min(59, Math.max(0, +m[2]))).padStart(2, '0');
  return `${hh}:${mm}`;
}

function overlaps(
  aStart: number,
  aEnd: number,
  bStart: number,
  bEnd: number
): boolean {
  return Math.max(aStart, bStart) < Math.min(aEnd, bEnd);
}

function parseDateTime(dateISO: string, timeHHMM: string, timezone: string): Date {
  const [hh, mm] = timeHHMM.split(':').map(Number);
  const dateStr = `${dateISO}T${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}:00`;
  return new Date(dateStr);
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const authHeader = req.headers.get('Authorization') ?? '';

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: { Authorization: authHeader },
      },
    });

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return new Response(
        JSON.stringify({ ok: false, error: 'UNAUTHENTICATED' }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const body: ConflictCheckParams = await req.json().catch(() => ({}));
    const days = Math.min(Math.max(1, body.days ?? 7), 31);
    const bufferMin = Math.min(120, Math.max(0, body.buffer_min ?? 30));
    const upsertFlag = body.upsert ?? true;

    // Get timezone from profile if not provided
    const { data: profile } = await supabase
      .from('profiles')
      .select('timezone')
      .eq('id', user.id)
      .maybeSingle();

    const timezone = body.timezone ?? profile?.timezone ?? 'Asia/Dubai';

    // Calculate date range
    const today = new Date().toISOString().slice(0, 10);
    const from = body.from ?? today;
    const fromDate = new Date(from);
    const toDate = body.to
      ? new Date(body.to)
      : new Date(fromDate.getTime() + days * 24 * 60 * 60 * 1000);

    console.log(
      `Conflict check for user ${user.id}: ${from} to ${toDate.toISOString().slice(0, 10)}, buffer=${bufferMin}min`
    );

    // Ensure prayer times exist for the range
    const totalDays = Math.ceil((toDate.getTime() - fromDate.getTime()) / (24 * 60 * 60 * 1000));
    for (let offset = 0; offset < totalDays; offset += 14) {
      const chunkDays = Math.min(14, totalDays - offset);
      const chunkDate = new Date(fromDate.getTime() + offset * 24 * 60 * 60 * 1000)
        .toISOString()
        .slice(0, 10);
      
      await supabase.functions.invoke('prayer-sync', {
        body: { date: chunkDate, days: chunkDays },
      });
    }

    // Load events in window
    const { data: events, error: eventsError } = await supabase
      .from('events')
      .select('*')
      .eq('owner_id', user.id)
      .gte('starts_at', fromDate.toISOString())
      .lte('starts_at', toDate.toISOString())
      .order('starts_at');

    if (eventsError) {
      console.error('Events query error:', eventsError);
      throw eventsError;
    }

    console.log(`Found ${events?.length ?? 0} events to check`);

    const conflicts: any[] = [];

    for (const event of events ?? []) {
      const eventStart = new Date(event.starts_at);
      const eventEnd = event.ends_at
        ? new Date(event.ends_at)
        : new Date(eventStart.getTime() + (event.duration_min ?? 30) * 60 * 1000);

      const dateISO = eventStart.toISOString().slice(0, 10);

      // Get prayer times for this date
      const { data: prayerData } = await supabase
        .from('prayer_times')
        .select('fajr, dhuhr, asr, maghrib, isha')
        .eq('owner_id', user.id)
        .eq('date_iso', dateISO)
        .maybeSingle();

      if (!prayerData) continue;

      const prayers: [string, string | null][] = [
        ['fajr', ensureHHMM(prayerData.fajr)],
        ['dhuhr', ensureHHMM(prayerData.dhuhr)],
        ['asr', ensureHHMM(prayerData.asr)],
        ['maghrib', ensureHHMM(prayerData.maghrib)],
        ['isha', ensureHHMM(prayerData.isha)],
      ];

      for (const [prayerName, prayerTime] of prayers) {
        if (!prayerTime) continue;

        const prayerStart = parseDateTime(dateISO, prayerTime, timezone);
        const prayerEnd = new Date(prayerStart.getTime() + bufferMin * 60 * 1000);

        const evStart = eventStart.getTime();
        const evEnd = eventEnd.getTime();
        const prStart = prayerStart.getTime();
        const prEnd = prayerEnd.getTime();

        if (overlaps(evStart, evEnd, prStart, prEnd)) {
          const overlapMin = Math.round(
            (Math.min(evEnd, prEnd) - Math.max(evStart, prStart)) / 60000
          );
          const severity = overlapMin >= bufferMin ? 'hard' : 'soft';

          const suggestedStart = new Date(prEnd + 10 * 60 * 1000).toISOString();

          const conflict = {
            owner_id: user.id,
            event_id: event.id,
            date_iso: dateISO,
            prayer_name: prayerName,
            prayer_start: prayerStart.toISOString(),
            prayer_end: prayerEnd.toISOString(),
            object_kind: 'event',
            object_id: event.id,
            overlap_min: overlapMin,
            severity,
            buffer_min: bufferMin,
            suggested_start_iso: suggestedStart,
            status: 'open',
          };

          conflicts.push(conflict);

          if (upsertFlag) {
            const { error: upsertError } = await supabase
              .from('conflicts')
              .upsert(conflict, {
                onConflict: 'owner_id,event_id,date_iso,prayer_name',
              });

            if (upsertError) {
              console.error('Upsert conflict error:', upsertError);
            }
          }
        }
      }
    }

    console.log(`Found ${conflicts.length} conflicts`);

    return new Response(
      JSON.stringify({
        ok: true,
        count: conflicts.length,
        conflicts,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('conflict-check error:', error);
    return new Response(
      JSON.stringify({
        ok: false,
        error: 'SERVER_ERROR',
        details: String(error),
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

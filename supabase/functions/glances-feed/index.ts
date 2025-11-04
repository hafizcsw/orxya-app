import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.78.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing authorization' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Create admin client for auth verification
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    const jwt = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(jwt);
    
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Create user client for database operations
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: authHeader },
        },
      }
    );

    console.log('[glances-feed] User authenticated:', user.id);

    // Check feature flag
    const { data: flags } = await supabase.rpc('get_user_flags', { p_user_id: user.id });
    if (!flags?.ff_glances) {
      return new Response(JSON.stringify({ error: 'Feature not enabled' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const today = new Date().toISOString().slice(0, 10);
    const now = new Date();

    // Next event في خلال 12 ساعة
    const { data: nextEvt } = await supabase
      .from('events')
      .select('id, title, starts_at, ends_at')
      .eq('owner_id', user.id)
      .gte('starts_at', now.toISOString())
      .lte('starts_at', new Date(Date.now() + 12 * 3600 * 1000).toISOString())
      .is('deleted_at', null)
      .order('starts_at', { ascending: true })
      .limit(1)
      .maybeSingle();

    // الصلاة القادمة
    const { data: prayerTimes } = await supabase
      .from('prayer_times')
      .select('fajr, dhuhr, asr, maghrib, isha')
      .eq('owner_id', user.id)
      .eq('date_iso', today)
      .maybeSingle();

    const prayerOrder = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'] as const;
    let nextPrayer: { name: string; time: string } | null = null;
    
    if (prayerTimes) {
      for (const prayerName of prayerOrder) {
        const timeStr = prayerTimes[prayerName];
        if (!timeStr) continue;
        const prayerDateTime = new Date(`${today}T${timeStr}`);
        if (prayerDateTime.getTime() > now.getTime()) {
          nextPrayer = { name: prayerName, time: prayerDateTime.toISOString() };
          break;
        }
      }
    }

    // تعارضات اليوم
    const { count: conflictsCount } = await supabase
      .from('conflicts')
      .select('id', { count: 'exact', head: true })
      .eq('owner_id', user.id)
      .eq('date_iso', today)
      .is('resolved_at', null);

    // ملخص اليوم من daily_metrics
    let steps = 0;
    let busyMin = 0;

    try {
      const { data: dailyMetrics, error: metricsError } = await supabase
        .rpc('get_daily_metrics', {
          p_user_id: user.id,
          p_start: today,
          p_end: today
        });

      if (!metricsError && dailyMetrics && Array.isArray(dailyMetrics) && dailyMetrics.length > 0) {
        const firstMetric = dailyMetrics[0];
        steps = firstMetric.steps_total ?? 0;
        busyMin = firstMetric.busy_minutes ?? 0;
      }
    } catch (e) {
      console.warn('[glances-feed] Could not fetch daily metrics:', e);
    }

    // حساب دقائق العمل والدراسة من events
    const { data: todayEvents } = await supabase
      .from('events')
      .select('starts_at, ends_at, title')
      .eq('owner_id', user.id)
      .gte('starts_at', `${today}T00:00:00Z`)
      .lte('starts_at', `${today}T23:59:59Z`)
      .is('deleted_at', null);

    let workMin = 0;
    let studyMin = 0;

    if (todayEvents) {
      for (const evt of todayEvents) {
        const duration = (new Date(evt.ends_at).getTime() - new Date(evt.starts_at).getTime()) / 60000;
        const title = evt.title.toLowerCase();
        
        if (title.includes('work') || title.includes('عمل')) {
          workMin += duration;
        } else if (title.includes('study') || title.includes('دراسة')) {
          studyMin += duration;
        }
      }
    }

    return new Response(
      JSON.stringify({
        now: now.toISOString(),
        glances: {
          next_task: nextEvt ? {
            id: nextEvt.id,
            title: nextEvt.title,
            start_at: nextEvt.starts_at,
            end_at: nextEvt.ends_at,
            countdown_sec: Math.max(0, Math.floor((Date.parse(nextEvt.starts_at) - Date.now()) / 1000))
          } : null,
          prayer_next: nextPrayer ? {
            name: nextPrayer.name,
            time: nextPrayer.time,
            in_sec: Math.max(0, Math.floor((Date.parse(nextPrayer.time) - Date.now()) / 1000))
          } : null,
          steps_today: { steps },
          work_progress: { minutes: Math.round(workMin) },
          study_progress: { minutes: Math.round(studyMin) },
          conflicts_badge: { count: conflictsCount ?? 0 },
          focus_toggle: {}
        }
      }),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
          'Cache-Control': 'no-store'
        }
      }
    );
  } catch (error) {
    console.error('[glances-feed] Error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});

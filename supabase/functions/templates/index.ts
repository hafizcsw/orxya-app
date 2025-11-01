import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

type TemplateKey = 'work_after_maghrib' | 'gym_after_isha' | 'deep_work_morning' | 'balanced_day';

function hhmmToMin(hm: string): number {
  const [h, m] = hm.split(':').map((n) => parseInt(n));
  return h * 60 + m;
}

function withinGuard(min: number, pt: any): boolean {
  const GUARD = 10;
  const prayers = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'];
  return prayers.some((p) => {
    const t = pt?.[p];
    if (!t) return false;
    return Math.abs(min - hhmmToMin(String(t))) <= GUARD;
  });
}

function addMin(d: Date, m: number): Date {
  const x = new Date(d);
  x.setMinutes(x.getMinutes() + m);
  return x;
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
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return new Response(
        JSON.stringify({ ok: false, error: 'UNAUTHENTICATED' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const body = await req.json();
    const template_key = body?.template_key as TemplateKey;
    const dateISO = body?.date ?? new Date().toISOString().slice(0, 10);
    const userTags = body?.tags ?? [];

    if (!['work_after_maghrib', 'gym_after_isha', 'deep_work_morning', 'balanced_day'].includes(template_key)) {
      return new Response(
        JSON.stringify({ ok: false, error: 'INVALID_TEMPLATE' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get profile
    const { data: prof } = await supabase
      .from('profiles')
      .select('timezone, prayer_method')
      .eq('id', user.id)
      .maybeSingle();

    const tz = prof?.timezone ?? 'Asia/Dubai';

    // Get prayer times
    const { data: pt } = await supabase
      .from('prayer_times')
      .select('fajr, dhuhr, asr, maghrib, isha')
      .eq('owner_id', user.id)
      .eq('date_iso', dateISO)
      .maybeSingle();

    const slots: any[] = [];
    const dayStart = new Date(`${dateISO}T00:00:00Z`);

    const pushEvent = (title: string, startMin: number, durMin: number, tags?: string[]) => {
      let s = startMin;
      if (withinGuard(s, pt)) s += 15;

      const starts_at = addMin(dayStart, s).toISOString();
      const ends_at = addMin(dayStart, s + durMin).toISOString();

      slots.push({
        title,
        starts_at,
        ends_at,
        duration_min: durMin,
        source_id: 'ai',
        is_ai_created: true,
        tags: [...(tags ?? []), ...userTags],
      });
    };

    // Generate events based on template
    if (template_key === 'work_after_maghrib' && pt?.maghrib) {
      const m = hhmmToMin(pt.maghrib);
      pushEvent('Deep Work (1)', m + 20, 50, ['work', 'focus']);
      pushEvent('Break', m + 70, 10, ['break']);
      pushEvent('Deep Work (2)', m + 85, 50, ['work', 'focus']);
      pushEvent('Email Sweep', m + 140, 25, ['admin']);
    }

    if (template_key === 'gym_after_isha' && pt?.isha) {
      const isha = hhmmToMin(pt.isha);
      pushEvent('Gym Session', isha + 20, 75, ['health', 'gym']);
    }

    if (template_key === 'deep_work_morning' && pt?.fajr) {
      const f = hhmmToMin(pt.fajr);
      pushEvent('Deep Work AM', f + 40, 90, ['work', 'focus']);
    }

    if (template_key === 'balanced_day') {
      pushEvent('Planning', 8 * 60 + 15, 20, ['plan']);
      pushEvent('Work Block', 9 * 60, 90, ['work']);
      pushEvent('Walk', 11 * 60 + 10, 25, ['health', 'walk']);
      pushEvent('Study', 20 * 60, 60, ['study']);
    }

    if (slots.length === 0) {
      return new Response(
        JSON.stringify({ ok: false, error: 'NO_SLOTS_GENERATED' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Insert events
    const rows = slots.map((s) => ({ ...s, owner_id: user.id }));
    const { data, error } = await supabase
      .from('events')
      .insert(rows)
      .select('id, title, starts_at, ends_at');

    if (error) throw error;

    return new Response(
      JSON.stringify({
        ok: true,
        inserted: data?.length ?? 0,
        items: data,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Templates error:', error);
    return new Response(
      JSON.stringify({
        ok: false,
        error: 'SERVER_ERROR',
        details: String(error),
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

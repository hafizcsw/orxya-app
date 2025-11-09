import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface AIInsights {
  focusScore: number;
  energyLevel: 'low' | 'medium' | 'high';
  suggestions: string[];
  warnings: string[];
  model_version: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { date } = await req.json();
    const targetDate = date || new Date().toISOString().split('T')[0];

    // Fetch user data for AI analysis
    const [healthRes, activitiesRes, eventsRes] = await Promise.all([
      supabaseClient
        .from('signals_daily')
        .select('hrv_z, sleep_score, steps, calories_active')
        .eq('user_id', user.id)
        .eq('date', targetDate)
        .maybeSingle(),
      supabaseClient
        .from('vw_today_activities')
        .select('work_hours, study_hours, sports_hours, walk_minutes')
        .eq('day', targetDate)
        .maybeSingle(),
      supabaseClient
        .from('events')
        .select('id, title, starts_at, ends_at')
        .eq('owner_id', user.id)
        .gte('starts_at', `${targetDate}T00:00:00Z`)
        .lte('starts_at', `${targetDate}T23:59:59Z`)
        .order('starts_at', { ascending: true })
        .limit(10)
    ]);

    const health = healthRes.data || {};
    const activities = activitiesRes.data || {};
    const upcomingEvents = eventsRes.data || [];

    // Simple AI-like scoring based on available data
    const hrv_z = (health as any).hrv_z ?? 0;
    const sleep_score = (health as any).sleep_score ?? 0;
    const work_hours = (activities as any).work_hours ?? 0;
    const study_hours = (activities as any).study_hours ?? 0;
    const sports_hours = (activities as any).sports_hours ?? 0;

    // Calculate focus score (0-100)
    let focusScore = 50; // baseline
    if (sleep_score > 80) focusScore += 20;
    else if (sleep_score > 60) focusScore += 10;
    else if (sleep_score < 40) focusScore -= 20;

    if (hrv_z > 0.5) focusScore += 15;
    else if (hrv_z < -0.5) focusScore -= 15;

    if (work_hours > 6) focusScore -= 10;
    if (work_hours > 10) focusScore -= 20;

    focusScore = Math.max(0, Math.min(100, focusScore));

    // Determine energy level
    let energyLevel: 'low' | 'medium' | 'high' = 'medium';
    if (sleep_score > 75 && hrv_z > 0) energyLevel = 'high';
    else if (sleep_score < 50 || hrv_z < -0.5) energyLevel = 'low';

    // Generate suggestions
    const suggestions: string[] = [];
    const warnings: string[] = [];

    if (sleep_score < 60) {
      warnings.push('جودة النوم منخفضة - حاول النوم مبكرًا الليلة');
    }

    if (work_hours > 8) {
      warnings.push('ساعات العمل طويلة - خذ استراحات منتظمة');
    }

    if (sports_hours === 0) {
      suggestions.push('أضف نشاطًا رياضيًا اليوم لتحسين الطاقة');
    }

    if (study_hours < 2 && work_hours < 4) {
      suggestions.push('لديك وقت متاح - استثمره في التعلم أو العمل');
    }

    if (hrv_z > 0.5 && sleep_score > 80) {
      suggestions.push('استفد من الطاقة العالية لإنجاز المهام الصعبة');
    }

    if (upcomingEvents.length > 5) {
      suggestions.push('يوم مزدحم - راجع الأولويات');
    }

    const insights: AIInsights = {
      focusScore: Math.round(focusScore),
      energyLevel,
      suggestions: suggestions.slice(0, 3),
      warnings: warnings.slice(0, 2),
      model_version: 'v1.0-simple'
    };

    return new Response(JSON.stringify(insights), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.error('Error in today-ai-insights:', error);
    return new Response(JSON.stringify({ error: error?.message || 'Unknown error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get auth header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing authorization header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Create Supabase client with user's auth token
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      {
        global: { headers: { Authorization: authHeader } },
      }
    );

    // Verify user using JWT from Authorization header
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(
      authHeader.replace('Bearer ', '')
    );
    
    if (userError || !user) {
      console.error('[today-realtime-data] Auth error:', userError);
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log('[today-realtime-data] User authenticated:', user.id);

    // Parse request body - handle empty body
    let date: string | undefined;
    try {
      const body = await req.json();
      date = body?.date;
    } catch {
      // Body is empty or invalid, use default date
      date = undefined;
    }
    
    const dateStr = date || new Date().toISOString().split('T')[0];

    // Get current time
    const now = new Date();
    const currentTimeStr = now.toISOString();

    // 1. Get current and next tasks from events
    const { data: events } = await supabaseClient
      .from('events')
      .select('*')
      .eq('owner_id', user.id)
      .gte('starts_at', dateStr + 'T00:00:00Z')
      .lt('starts_at', dateStr + 'T23:59:59Z')
      .is('deleted_at', null)
      .order('starts_at', { ascending: true });

    const currentTask = events?.find(e => 
      new Date(e.starts_at) <= now && new Date(e.ends_at) > now
    );

    const nextTask = events?.find(e => 
      new Date(e.starts_at) > now
    );

    // Calculate remaining minutes for current task
    let remainingMinutes = 0;
    let progressPercent = 0;
    if (currentTask) {
      const endTime = new Date(currentTask.ends_at);
      const startTime = new Date(currentTask.starts_at);
      const totalDuration = (endTime.getTime() - startTime.getTime()) / 1000 / 60;
      remainingMinutes = Math.max(0, (endTime.getTime() - now.getTime()) / 1000 / 60);
      progressPercent = Math.min(100, ((totalDuration - remainingMinutes) / totalDuration) * 100);
    }

    // 2. Get activity data from vw_today_activities
    const { data: activityData } = await supabaseClient
      .from('vw_today_activities')
      .select('*')
      .eq('owner_id', user.id)
      .eq('day', dateStr)
      .single();

    // Get previous day for trends
    const prevDate = new Date(dateStr);
    prevDate.setDate(prevDate.getDate() - 1);
    const prevDateStr = prevDate.toISOString().split('T')[0];

    const { data: prevActivityData } = await supabaseClient
      .from('vw_today_activities')
      .select('*')
      .eq('owner_id', user.id)
      .eq('day', prevDateStr)
      .single();

    // Calculate trends
    const calculateTrend = (current: number, previous: number) => {
      if (!previous || previous === 0) return { direction: 'neutral' as const, percentage: 0 };
      const change = ((current - previous) / previous) * 100;
      return {
        direction: change > 5 ? 'up' as const : change < -5 ? 'down' as const : 'neutral' as const,
        percentage: Math.abs(Math.round(change))
      };
    };

    const activities = {
      work: {
        actual: activityData?.work_hours || 0,
        goal: 8,
        status: activityData?.work_hours >= 7.2 ? 'excellent' : activityData?.work_hours >= 5.6 ? 'good' : activityData?.work_hours >= 4 ? 'fair' : 'poor',
        trend: calculateTrend(activityData?.work_hours || 0, prevActivityData?.work_hours || 0)
      },
      study: {
        actual: activityData?.study_hours || 0,
        goal: 2,
        status: activityData?.study_hours >= 1.8 ? 'excellent' : activityData?.study_hours >= 1.4 ? 'good' : activityData?.study_hours >= 1 ? 'fair' : 'poor',
        trend: calculateTrend(activityData?.study_hours || 0, prevActivityData?.study_hours || 0)
      },
      mma: {
        actual: activityData?.sports_hours || 0,
        goal: 1,
        status: activityData?.sports_hours >= 0.9 ? 'excellent' : activityData?.sports_hours >= 0.7 ? 'good' : activityData?.sports_hours >= 0.5 ? 'fair' : 'poor',
        trend: calculateTrend(activityData?.sports_hours || 0, prevActivityData?.sports_hours || 0)
      },
      sleep: {
        actual: activityData?.sleep_hours || 0,
        goal: 8,
        status: activityData?.sleep_hours >= 7.2 ? 'excellent' : activityData?.sleep_hours >= 6 ? 'good' : activityData?.sleep_hours >= 5 ? 'fair' : 'poor',
        trend: calculateTrend(activityData?.sleep_hours || 0, prevActivityData?.sleep_hours || 0)
      }
    };

    // 3. Get health data from health_samples
    const { data: healthSamples } = await supabaseClient
      .from('health_samples')
      .select('*')
      .eq('user_id', user.id)
      .eq('day', dateStr)
      .order('day', { ascending: false })
      .limit(1);

    const healthSample = healthSamples?.[0];

    const health = {
      recovery: healthSample?.recovery || 0,
      strain: healthSample?.strain || 0,
      sleep: healthSample?.sleep_score || 0,
      hrv: healthSample?.hrv || 0
    };

    // 4. Get financial data (mock for now - can be replaced with real data)
    const financial = {
      income: 1200,
      expenses: 450,
      balance: 5000,
      trends: {
        income: { direction: 'up', percentage: 20 },
        expenses: { direction: 'down', percentage: 10 },
        balance: { direction: 'up', percentage: 11 }
      }
    };

    // 5. Return structured response
    return new Response(
      JSON.stringify({
        currentTask: currentTask ? {
          id: currentTask.id,
          title: currentTask.title,
          category: currentTask.tags?.[0] || 'other',
          starts_at: currentTask.starts_at,
          ends_at: currentTask.ends_at,
          remainingMinutes: Math.round(remainingMinutes),
          progressPercent: Math.round(progressPercent)
        } : null,
        nextTask: nextTask ? {
          id: nextTask.id,
          title: nextTask.title,
          starts_at: nextTask.starts_at,
          ends_at: nextTask.ends_at
        } : null,
        todayTasks: events || [],
        activities,
        health,
        financial
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});

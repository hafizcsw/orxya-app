import { serve } from "https://deno.land/std/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );
    
    const { user_id, task, constraints } = await req.json();

    // Get busy slots from calendar mirror (today + tomorrow)
    const now = new Date();
    const twoDaysLater = new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000);

    const { data: busySlots } = await admin
      .from("calendar_events_mirror")
      .select("start_at, end_at")
      .eq("user_id", user_id)
      .gte("start_at", now.toISOString())
      .lt("start_at", twoDaysLater.toISOString())
      .order("start_at");

    // Get HRV-Z for today
    const { data: hrvData } = await admin
      .from("signals_daily")
      .select("value")
      .eq("user_id", user_id)
      .eq("metric", "hrv_z")
      .eq("date", now.toISOString().split('T')[0])
      .maybeSingle();

    const hrvZ = Number(hrvData?.value ?? 0);

    // Simple free slot finder
    const mins = Number(task?.duration_minutes ?? 30);
    const slots: Array<{ start: string; end: string }> = [];

    // Generate hourly slots for next 48 hours
    let currentSlot = new Date(now);
    currentSlot.setMinutes(0, 0, 0);

    while (currentSlot < twoDaysLater && slots.length < 5) {
      const slotEnd = new Date(currentSlot.getTime() + mins * 60 * 1000);
      
      // Check if slot overlaps with busy times
      const isBusy = (busySlots || []).some(busy => {
        const busyStart = new Date(busy.start_at);
        const busyEnd = new Date(busy.end_at);
        return (currentSlot < busyEnd && slotEnd > busyStart);
      });

      if (!isBusy && currentSlot > now) {
        slots.push({
          start: currentSlot.toISOString(),
          end: slotEnd.toISOString()
        });
      }

      currentSlot = new Date(currentSlot.getTime() + 60 * 60 * 1000); // +1 hour
    }

    const suggested = slots.map(s => ({
      start_time: s.start,
      end_time: s.end,
      rationale: `Slot fits duration ${mins}m; HRV-Z=${hrvZ.toFixed(2)}; constraints=${constraints?.join(",") ?? "none"}`
    }));

    return new Response(JSON.stringify({ suggested_slots: suggested }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400
    });
  }
});

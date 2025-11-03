import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
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
    const jwt = req.headers.get("Authorization")?.replace("Bearer ", "");
    if (!jwt) {
      return new Response(JSON.stringify({ error: "no_auth" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    const url = Deno.env.get("SUPABASE_URL")!;
    const key = Deno.env.get("SUPABASE_ANON_KEY")!;
    const sb = createClient(url, key, {
      global: { headers: { Authorization: `Bearer ${jwt}` } }
    });

    const { data: { user }, error: userError } = await sb.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "bad_user" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    const { start, end } = await req.json().catch(() => ({}));
    if (!start || !end) {
      return new Response(JSON.stringify({ error: "bad_window" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // جلب المثيلات من MV
    const { data: instances, error: instError } = await sb
      .from("mv_event_instances")
      .select("*")
      .eq("owner_id", user.id)
      .gte("instance_start", start)
      .lte("instance_end", end)
      .order("instance_start", { ascending: true });

    if (instError) {
      console.error("Error fetching instances:", instError);
    }

    // جلب الصلاة للنافذة
    const startDate = start.substring(0, 10);
    const endDate = end.substring(0, 10);
    const { data: prayers, error: prayerError } = await sb
      .from("prayer_times")
      .select("*")
      .eq("owner_id", user.id)
      .gte("date_iso", startDate)
      .lte("date_iso", endDate);

    if (prayerError) {
      console.error("Error fetching prayers:", prayerError);
    }

    // جلب النوم من health_samples
    const { data: health, error: healthError } = await sb
      .from("health_samples")
      .select("day, sleep_minutes")
      .eq("user_id", user.id)
      .gte("day", startDate)
      .lte("day", endDate);

    if (healthError) {
      console.error("Error fetching health:", healthError);
    }

    return new Response(
      JSON.stringify({
        instances: instances ?? [],
        prayers: prayers ?? [],
        health: health ?? []
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("calendar-instances error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      }
    );
  }
});

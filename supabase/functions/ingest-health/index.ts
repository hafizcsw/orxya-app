// Epic 7: Health Data Ingestion Edge Function
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const jwt = req.headers.get("Authorization")?.replace("Bearer ", "");
    if (!jwt) {
      return new Response(
        JSON.stringify({ error: "no_auth" }), 
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const url = Deno.env.get("SUPABASE_URL")!;
    const key = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(url, key, { 
      global: { headers: { Authorization: `Bearer ${jwt}` } } 
    });

    const { data: { user }, error: uerr } = await supabase.auth.getUser();
    if (uerr || !user) {
      console.error("Auth error:", uerr);
      return new Response(
        JSON.stringify({ error: "bad_user" }), 
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const payload = await req.json().catch(() => null);
    if (!payload) {
      return new Response(
        JSON.stringify({ error: "bad_json" }), 
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { day, steps = 0, meters = 0, hr_avg = null, hr_max = null, sleep_minutes = null } = payload;

    console.log(`[ingest-health] user=${user.id} day=${day} steps=${steps}`);

    const { error } = await supabase.from("health_samples").upsert({
      user_id: user.id,
      day,
      steps,
      meters,
      hr_avg,
      hr_max,
      sleep_minutes,
      updated_at: new Date().toISOString()
    }, { onConflict: "user_id,day" });

    if (error) {
      console.error("Upsert error:", error);
      return new Response(
        JSON.stringify({ error: error.message }), 
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ ok: true, user_id: user.id, day }), 
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Unexpected error:", error);
    const message = error instanceof Error ? error.message : String(error);
    return new Response(
      JSON.stringify({ error: message }), 
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

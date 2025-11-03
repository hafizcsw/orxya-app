// Epic 7: Financial Events Ingestion Edge Function
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

    // Support single event or array of events
    const items = Array.isArray(payload) ? payload : [payload];
    const results = [];

    for (const it of items) {
      const {
        when_at,
        direction,
        amount,
        currency = "AED",
        merchant = null,
        source_pkg = null,
        place_name = null,
        lat = null,
        lng = null
      } = it;

      console.log(`[ingest-finance] user=${user.id} when=${when_at} dir=${direction} amt=${amount}`);

      const { error } = await supabase.rpc("ingest_financial_event", {
        p_user_id: user.id,
        p_when_at: when_at,
        p_direction: direction,
        p_amount: amount,
        p_currency: currency,
        p_merchant: merchant,
        p_source_pkg: source_pkg,
        p_place_name: place_name,
        p_lat: lat,
        p_lng: lng
      });

      if (error) {
        console.error("Ingest error:", error);
        results.push({ error: error.message, when_at });
      } else {
        results.push({ ok: true, when_at });
      }
    }

    const failed = results.filter(r => r.error);
    if (failed.length > 0) {
      return new Response(
        JSON.stringify({ partial: true, total: items.length, failed: failed.length, errors: failed }), 
        { status: 207, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ ok: true, count: items.length, user_id: user.id }), 
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

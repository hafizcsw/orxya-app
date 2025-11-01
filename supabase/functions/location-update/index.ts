// deno-lint-ignore-file no-explicit-any
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.46.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function json(body: any, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "content-type": "application/json" }
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const authHeader = req.headers.get("Authorization") ?? "";
    
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } }
    });

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return json({ ok: false, error: "UNAUTHENTICATED" }, 401);
    }

    const body = await req.json().catch(() => ({}));
    const { lat, lon, accuracy, provider } = body;

    if (typeof lat !== "number" || typeof lon !== "number") {
      return json({ ok: false, error: "INVALID_COORDS" }, 400);
    }

    // Insert location sample
    const { data: sample, error: sampleError } = await supabase
      .from("location_samples")
      .insert({
        owner_id: user.id,
        latitude: lat,
        longitude: lon,
        accuracy_m: accuracy ?? null,
        source: provider ?? "device"
      })
      .select("id")
      .single();

    if (sampleError) {
      console.error("location_samples insert error:", sampleError);
      throw sampleError;
    }

    // Update profile with latest location
    await supabase
      .from("profiles")
      .update({ 
        latitude: lat, 
        longitude: lon,
        location_updated_at: new Date().toISOString()
      })
      .eq("id", user.id);

    // Trigger conflict check for today
    const today = new Date().toISOString().slice(0, 10);
    await supabase.functions.invoke("conflict-check", {
      body: { date: today }
    });

    console.log(`Location updated for user ${user.id}: ${lat}, ${lon}`);

    return json({ ok: true, saved_id: sample.id });
  } catch (e: any) {
    console.error("location-update error:", e);
    return json({ ok: false, error: "SERVER_ERROR", details: String(e) }, 500);
  }
});

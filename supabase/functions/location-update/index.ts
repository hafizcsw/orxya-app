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
    const { latitude, longitude, accuracy_m, sampled_at } = body;

    if (typeof latitude !== "number" || typeof longitude !== "number") {
      return json({ ok: false, error: "INVALID_COORDS" }, 400);
    }

    // Get last sample for rate limiting
    const { data: lastSample } = await supabase
      .from("location_samples")
      .select("sampled_at, latitude, longitude, accuracy_m")
      .eq("owner_id", user.id)
      .order("sampled_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    let distance = null;
    let shouldSave = true;

    if (lastSample) {
      // Haversine distance
      const R = 6371000;
      const toRad = (x: number) => x * Math.PI / 180;
      const dLat = toRad(latitude - lastSample.latitude);
      const dLon = toRad(longitude - lastSample.longitude);
      const a = Math.sin(dLat / 2) ** 2 + 
                Math.cos(toRad(lastSample.latitude)) * Math.cos(toRad(latitude)) * 
                Math.sin(dLon / 2) ** 2;
      distance = 2 * R * Math.asin(Math.sqrt(a));

      const minutesSince = (Date.now() - new Date(lastSample.sampled_at).getTime()) / 60000;
      const betterAccuracy = accuracy_m && lastSample.accuracy_m && 
                             accuracy_m < lastSample.accuracy_m * 0.75;
      
      shouldSave = minutesSince > 10 || distance > 300 || betterAccuracy;
    }

    if (!shouldSave) {
      return json({ 
        ok: true, 
        saved: false, 
        skipped_reason: "RATE_LIMIT",
        last_distance_m: distance 
      });
    }

    // Insert location sample
    const { data: sample, error: sampleError } = await supabase
      .from("location_samples")
      .insert({
        owner_id: user.id,
        latitude,
        longitude,
        accuracy_m: accuracy_m ?? null,
        sampled_at: sampled_at || new Date().toISOString(),
        source: "device"
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
        latitude, 
        longitude,
        location_updated_at: new Date().toISOString()
      })
      .eq("id", user.id);

    // Trigger conflict check for today
    const today = new Date().toISOString().slice(0, 10);
    await supabase.functions.invoke("conflict-check", {
      body: { date: today }
    });

    console.log(`Location updated for user ${user.id}: ${latitude}, ${longitude}`);

    return json({ ok: true, saved: true, saved_id: sample.id, last_distance_m: distance });
  } catch (e: any) {
    console.error("location-update error:", e);
    return json({ ok: false, error: "SERVER_ERROR", details: String(e) }, 500);
  }
});

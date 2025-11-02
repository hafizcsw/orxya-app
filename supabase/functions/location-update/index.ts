// deno-lint-ignore-file no-explicit-any
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.47.10";

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

function haversine(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371000; // Earth radius in meters
  const toRad = (d: number) => d * Math.PI / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 + 
            Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * 
            Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
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
    const { latitude, longitude, accuracy_m, sampled_at, provider } = body;

    if (typeof latitude !== "number" || typeof longitude !== "number") {
      return json({ ok: false, error: "INVALID_COORDS" }, 400);
    }

    const sampledAt = sampled_at && !Number.isNaN(+new Date(sampled_at))
      ? sampled_at
      : new Date().toISOString();

    // Get last sample for deduplication
    const { data: lastSample } = await supabase
      .from("location_samples")
      .select("sampled_at, latitude, longitude")
      .eq("owner_id", user.id)
      .order("sampled_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    let distance = null;
    let shouldSave = true;

    if (lastSample) {
      const dt = Math.abs(+new Date(sampledAt) - +new Date(lastSample.sampled_at)) / 1000; // seconds
      distance = haversine(
        latitude, longitude,
        Number(lastSample.latitude), Number(lastSample.longitude)
      );
      
      // Skip if <5 minutes AND <100 meters
      if (dt < 5 * 60 && distance < 100) {
        shouldSave = false;
      }
    }

    if (!shouldSave) {
      return json({ 
        ok: true, 
        saved: false, 
        skipped_reason: "DEDUP",
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
        sampled_at: sampledAt,
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
        latitude, 
        longitude,
        location_updated_at: new Date().toISOString()
      })
      .eq("id", user.id);

    // If moved significantly (>30km), trigger prayer sync
    let didSyncPrayer = false;
    if (distance && distance > 30000) {
      const today = new Date().toISOString().slice(0, 10);
      const tomorrow = new Date(Date.now() + 86400000).toISOString().slice(0, 10);
      
      try {
        await supabase.functions.invoke("prayer-sync", {
          body: { date: today }
        });
        await supabase.functions.invoke("prayer-sync", {
          body: { date: tomorrow }
        });
        didSyncPrayer = true;
      } catch (e) {
        console.warn("Failed to sync prayers after location change:", e);
      }
    }

    // Trigger conflict check
    try {
      await supabase.functions.invoke("conflict-check", { body: {} });
    } catch (e) {
      console.warn("Failed to trigger conflict-check:", e);
    }

    console.log(`Location updated for user ${user.id}: ${latitude}, ${longitude}`);

    return json({ 
      ok: true, 
      saved: true, 
      saved_id: sample.id, 
      last_distance_m: distance,
      moved_km: distance ? (distance / 1000).toFixed(2) : null,
      did_sync_prayer: didSyncPrayer
    });
  } catch (e: any) {
    console.error("location-update error:", e);
    return json({ ok: false, error: "SERVER_ERROR", details: String(e) }, 500);
  }
});

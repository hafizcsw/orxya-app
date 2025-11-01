import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface LocationUpdate {
  lat: number;
  lon: number;
  accuracy?: number;
  source?: string;
  timezone?: string;
}

function haversineKm(
  a: { lat: number; lon: number },
  b: { lat: number; lon: number }
): number {
  const R = 6371; // Earth radius in km
  const toRad = (x: number) => (x * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad(b.lon - a.lon);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);

  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
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
      global: {
        headers: { Authorization: authHeader },
      },
    });

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return new Response(
        JSON.stringify({ ok: false, error: 'UNAUTHENTICATED' }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const body: LocationUpdate = await req.json();
    const { lat, lon, accuracy = null, source = 'client', timezone = null } = body;

    if (!isFinite(lat) || !isFinite(lon)) {
      return new Response(
        JSON.stringify({ ok: false, error: 'INVALID_COORDS' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    console.log(`Location update from user ${user.id}: lat=${lat}, lon=${lon}, tz=${timezone}`);

    // Get last sample
    const { data: lastSample } = await supabase
      .from('location_samples')
      .select('latitude, longitude, sampled_at')
      .eq('owner_id', user.id)
      .order('sampled_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    const now = new Date().toISOString();
    const movementKm = lastSample
      ? haversineKm(
          { lat: lastSample.latitude, lon: lastSample.longitude },
          { lat, lon }
        )
      : 0;

    console.log(`Movement: ${movementKm.toFixed(2)} km`);

    // Insert new sample
    const { error: insertError } = await supabase
      .from('location_samples')
      .insert({
        owner_id: user.id,
        latitude: lat,
        longitude: lon,
        accuracy_m: accuracy,
        source,
        sampled_at: now,
      });

    if (insertError) {
      console.error('Insert error:', insertError);
      throw insertError;
    }

    // Update profile
    const updateData: Record<string, unknown> = {
      latitude: lat,
      longitude: lon,
      location_updated_at: now,
    };
    if (timezone) {
      updateData.timezone = timezone;
    }

    await supabase.from('profiles').update(updateData).eq('id', user.id);

    // Determine if prayer sync needed (moved >= 0.7km or first sample)
    const needSync = movementKm >= 0.7 || !lastSample;
    let didSync = false;

    if (needSync) {
      console.log('Triggering prayer sync due to location change');
      const today = new Date().toISOString().slice(0, 10);
      
      const { error: syncError } = await supabase.functions.invoke('prayer-sync', {
        body: { date: today, days: 3 },
      });

      if (syncError) {
        console.error('Prayer sync error:', syncError);
      } else {
        didSync = true;
        console.log('Prayer sync completed');
      }
    }

    return new Response(
      JSON.stringify({
        ok: true,
        saved: true,
        moved_km: Number(movementKm.toFixed(2)),
        did_sync: didSync,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('location-update error:', error);
    return new Response(
      JSON.stringify({
        ok: false,
        error: 'SERVER_ERROR',
        details: String(error),
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

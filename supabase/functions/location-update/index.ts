import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

interface LocationUpdate {
  latitude: number;
  longitude: number;
  accuracy?: number;
  source?: 'gps' | 'network' | 'manual';
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      global: { headers: { Authorization: authHeader } }
    });

    const { data: { user }, error: userError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    const { latitude, longitude, accuracy, source }: LocationUpdate = await req.json();

    console.log('📍 Location update:', { userId: user.id, latitude, longitude });

    // التحقق من موافقة المستخدم
    const { data: profile } = await supabase
      .from('profiles')
      .select('allow_location')
      .eq('id', user.id)
      .maybeSingle();

    if (!profile?.allow_location) {
      throw new Error('Location tracking not enabled');
    }

    // تحديث الموقع في الملف الشخصي
    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        latitude,
        longitude,
        last_location_update: new Date().toISOString()
      })
      .eq('id', user.id);

    if (updateError) {
      console.error('Profile update error:', updateError);
      throw updateError;
    }

    // تحديث مواقيت الصلاة (استدعاء prayer-sync)
    const { error: prayerError } = await supabase.functions.invoke('prayer-sync', {
      body: { user_id: user.id, force: true }
    });

    if (prayerError) {
      console.warn('Prayer sync failed:', prayerError);
    }

    console.log('✅ Location updated successfully');

    return new Response(
      JSON.stringify({ 
        success: true,
        message: 'Location updated',
        coordinates: { latitude, longitude }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ Location update error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: errorMessage 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});

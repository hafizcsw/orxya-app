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

    console.log('📍 Location update:', { userId: user.id, latitude, longitude, accuracy, source });

    // التحقق من موافقة المستخدم
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('allow_location')
      .eq('id', user.id)
      .maybeSingle();

    if (profileError) {
      console.error('Profile query error:', profileError);
      throw new Error(`Failed to fetch profile: ${profileError.message}`);
    }

    // If profile doesn't exist or allow_location is false, return silently
    if (!profile || !profile.allow_location) {
      console.log('ℹ️ Location tracking not enabled for user:', user.id);
      return new Response(
        JSON.stringify({ 
          success: true,
          message: 'Location tracking not enabled',
          skipped: true
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // تحديث الموقع في الملف الشخصي
    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        latitude,
        longitude,
        location_updated_at: new Date().toISOString()
      })
      .eq('id', user.id);

    if (updateError) {
      console.error('Profile update error:', updateError);
      throw new Error(`Failed to update location: ${updateError.message}`);
    }

    // تحديث مواقيت الصلاة (استدعاء prayer-sync)
    const { error: prayerError } = await supabase.functions.invoke('prayer-sync', {
      body: { user_id: user.id, force: true }
    });

    if (prayerError) {
      console.warn('Prayer sync failed:', prayerError);
      // Don't throw - prayer sync failure shouldn't block location update
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
    const errorMessage = error instanceof Error ? error.message : String(error);
    const statusCode = errorMessage.includes('Unauthorized') ? 401 : 500;
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: errorMessage 
      }),
      { 
        status: statusCode, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});

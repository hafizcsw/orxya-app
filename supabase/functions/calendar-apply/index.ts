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
    if (!jwt) return new Response("Unauthorized", { status: 401 });

    const sb = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: `Bearer ${jwt}` } } }
    );

    const { data: { user } } = await sb.auth.getUser();
    if (!user) return new Response("Invalid user", { status: 401 });

    const body = await req.json();
    const { action, event, propagate_google = false, suggestion_id } = body;

    console.log(`[calendar-apply] Action: ${action}, User: ${user.id}, Propagate: ${propagate_google}`);

    let result: any = null;

    // تطبيق محلي
    switch (action) {
      case 'create': {
        const { data, error } = await sb.from('events').insert({
          ...event,
          owner_id: user.id,
          created_by: user.id,
          sequence: 0
        }).select().single();
        if (error) throw error;
        result = data;
        break;
      }
      case 'update': {
        // Support for shift_min from Android Smart Lamp actions
        const shiftMin = body.shift_min as number | undefined;
        
        let updateData = { ...event };
        
        if (shiftMin && event.id) {
          const { data: existing } = await sb.from('events')
            .select('starts_at,ends_at')
            .eq('id', event.id)
            .eq('owner_id', user.id)
            .maybeSingle();
          
          if (existing?.starts_at && existing?.ends_at) {
            const s = new Date(existing.starts_at).getTime() + shiftMin * 60_000;
            const e = new Date(existing.ends_at).getTime() + shiftMin * 60_000;
            updateData.starts_at = new Date(s).toISOString();
            updateData.ends_at = new Date(e).toISOString();
          }
        }
        
        const { data, error } = await sb.from('events')
          .update(updateData)
          .eq('id', event.id)
          .eq('owner_id', user.id)
          .select().single();
        if (error) throw error;
        result = data;
        break;
      }
      case 'move': {
        const { data, error } = await sb.from('events')
          .update({ starts_at: event.starts_at, ends_at: event.ends_at })
          .eq('id', event.id)
          .eq('owner_id', user.id)
          .select().single();
        if (error) throw error;
        result = data;
        break;
      }
      case 'cancel': {
        const { data, error } = await sb.from('events')
          .update({ status: 'cancelled', deleted_at: new Date().toISOString() })
          .eq('id', event.id)
          .eq('owner_id', user.id)
          .select().single();
        if (error) throw error;
        result = data;
        break;
      }
      case 'complete_task': {
        const { data, error } = await sb.from('events')
          .update({ completed_at: new Date().toISOString() })
          .eq('id', event.id)
          .eq('owner_id', user.id)
          .select().single();
        if (error) throw error;
        result = data;
        break;
      }
      case 'mark_free': {
        const { data, error } = await sb.from('events')
          .update({ busy_state: 'free', transparency: 'transparent' })
          .eq('id', event.id)
          .eq('owner_id', user.id)
          .select().single();
        if (error) throw error;
        result = data;
        break;
      }
      default:
        throw new Error(`Unknown action: ${action}`);
    }

    return new Response(JSON.stringify({ success: true, event: result }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('[calendar-apply] Error:', error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});

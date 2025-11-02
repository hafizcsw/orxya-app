// Conflict Management Edge Function
// Handles: apply, ignore, reopen, undo actions (single & bulk)
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders }
  });
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization') ?? '';
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );

    // Authenticate user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return json({ ok: false, error: 'UNAUTHENTICATED' }, 401);
    }

    // Parse request
    const body = await req.json().catch(() => ({}));
    const command = String(body.command ?? '');
    const ids: string[] = Array.isArray(body.ids) ? body.ids : (body.id ? [body.id] : []);
    
    if (!command || ids.length === 0) {
      return json({ ok: false, error: 'BAD_INPUT' }, 400);
    }

    const results = [];

    // Process each conflict
    for (const id of ids) {
      // Fetch conflict with RLS
      const { data: conflict } = await supabase
        .from('conflicts')
        .select('id, owner_id, status, event_id, suggestion, suggested_change')
        .eq('id', id)
        .eq('owner_id', user.id)
        .maybeSingle();

      if (!conflict) {
        results.push({ id, ok: false, error: 'NOT_FOUND' });
        continue;
      }

      // Handle different commands
      if (command === 'apply') {
        const sug = conflict.suggested_change ?? conflict.suggestion ?? {};
        const patch = sug.patch ?? {};

        // Apply event modifications if suggested
        if (conflict.event_id && Object.keys(patch).length > 0) {
          const eventUpdate: any = {};
          
          if (patch.shift_minutes) {
            // Fetch current event
            const { data: evt } = await supabase
              .from('events')
              .select('starts_at, ends_at')
              .eq('id', conflict.event_id)
              .eq('owner_id', user.id)
              .maybeSingle();
            
            if (evt) {
              const shiftMs = patch.shift_minutes * 60 * 1000;
              eventUpdate.starts_at = new Date(new Date(evt.starts_at).getTime() + shiftMs).toISOString();
              if (evt.ends_at) {
                eventUpdate.ends_at = new Date(new Date(evt.ends_at).getTime() + shiftMs).toISOString();
              }
              eventUpdate.pending_push = true;
            }
          }
          
          if (patch.transparency) {
            eventUpdate.transparency = patch.transparency;
            eventUpdate.pending_push = true;
          }
          
          if (patch.status) {
            eventUpdate.status = patch.status;
            eventUpdate.pending_push = true;
          }

          // Update event
          if (Object.keys(eventUpdate).length > 0) {
            await supabase
              .from('events')
              .update(eventUpdate)
              .eq('id', conflict.event_id)
              .eq('owner_id', user.id);
          }
        }

        // Mark conflict as resolved
        await supabase
          .from('conflicts')
          .update({
            status: 'resolved',
            resolution: 'user_accepted',
            decided_by: user.id,
            decided_at: new Date().toISOString(),
            decided_action: 'apply'
          })
          .eq('id', id);

        results.push({ id, ok: true, status: 'resolved' });
      }
      
      else if (command === 'ignore') {
        await supabase
          .from('conflicts')
          .update({
            status: 'resolved',
            resolution: 'user_ignored',
            decided_by: user.id,
            decided_at: new Date().toISOString(),
            decided_action: 'ignore'
          })
          .eq('id', id);

        results.push({ id, ok: true, status: 'ignored' });
      }
      
      else if (command === 'reopen') {
        await supabase
          .from('conflicts')
          .update({
            status: 'open',
            resolution: null,
            decided_by: null,
            decided_at: null,
            decided_action: null
          })
          .eq('id', id);

        results.push({ id, ok: true, status: 'open' });
      }
      
      else if (command === 'undo') {
        // Revert to open state (event changes would need snapshot to truly undo)
        await supabase
          .from('conflicts')
          .update({
            status: 'open',
            resolution: null,
            decided_by: null,
            decided_at: null,
            decided_action: null
          })
          .eq('id', id);

        results.push({ id, ok: true, status: 'open' });
      }
      
      else {
        results.push({ id, ok: false, error: 'UNKNOWN_COMMAND' });
      }
    }

    return json({ ok: true, results, processed: results.length });
  } catch (e) {
    console.error('Conflicts function error:', e);
    return json({ ok: false, error: 'SERVER_ERROR', details: String(e) }, 500);
  }
});

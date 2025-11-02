// deno-lint-ignore-file no-explicit-any
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function json(b: any, s = 200) {
  return new Response(JSON.stringify(b), {
    status: s,
    headers: { ...cors, "content-type": "application/json" }
  });
}

async function applyUndo(supabase: any, ev: any, undoPatch: any) {
  let updated: any = {};
  
  if (undoPatch?.shift_minutes) {
    const ms = undoPatch.shift_minutes * 60 * 1000;
    const startDate = new Date(ev.starts_at);
    const endDate = ev.ends_at ? new Date(ev.ends_at) : null;
    
    updated.starts_at = new Date(startDate.getTime() + ms).toISOString();
    if (endDate) {
      updated.ends_at = new Date(endDate.getTime() + ms).toISOString();
    }
    updated.pending_push = true;
  }
  
  if (undoPatch?.transparency) {
    updated.transparency = undoPatch.transparency;
    updated.pending_push = true;
  }
  
  if (undoPatch?.status) {
    updated.status = undoPatch.status;
    updated.pending_push = true;
  }
  
  if (Object.keys(updated).length === 0) return ev;
  
  const { data, error } = await supabase
    .from('events')
    .update(updated)
    .eq('id', ev.id)
    .select('*')
    .maybeSingle();
    
  if (error) throw error;
  return data;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return json({ ok: true });
  
  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } } }
    );
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return json({ ok: false, error: "UNAUTHENTICATED" }, 401);

    const body = await req.json().catch(() => ({}));
    const token = String(body.undo_token ?? '');
    
    if (!token) return json({ ok: false, error: "MISSING_TOKEN" }, 400);

    const { data: act } = await supabase
      .from('autopilot_actions')
      .select('*')
      .eq('owner_id', user.id)
      .eq('undo_token', token)
      .maybeSingle();

    if (!act) return json({ ok: false, error: "NOT_FOUND" }, 404);
    
    const conflictId = act.conflict_id;

    const { data: c } = await supabase
      .from('conflicts')
      .select('*')
      .eq('id', conflictId)
      .maybeSingle();
      
    if (!c) return json({ ok: false, error: "CONFLICT_NOT_FOUND" }, 404);
    
    const { data: ev } = await supabase
      .from('events')
      .select('*')
      .eq('id', c.event_id)
      .maybeSingle();
      
    if (!ev) return json({ ok: false, error: "EVENT_NOT_FOUND" }, 404);

    const after = await applyUndo(supabase, ev, c.undo_patch);

    await supabase.from('conflicts').update({
      status: 'undone',
      decided_by: user.id,
      decided_at: new Date().toISOString()
    }).eq('id', conflictId);

    await supabase.from('autopilot_actions').insert({
      owner_id: user.id,
      conflict_id: conflictId,
      action: 'undo',
      patch_before: { event: ev },
      patch_after: { event: after }
    });

    return json({ ok: true, conflict_id: conflictId, event_id: after.id });
  } catch (e) {
    console.error('[autopilot-undo]', e);
    return json({ ok: false, error: String(e) }, 500);
  }
});

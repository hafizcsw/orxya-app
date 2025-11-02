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

function uid() { return crypto.randomUUID(); }

type Decision = {
  action: 'mark_free' | 'shift_time' | 'block_time' | 'notify_only',
  confidence: number,
  requires_consent: boolean,
  patch?: any,
  reason: string
};

function decide(ev: any, conflict: any): Decision {
  const meta = ev?.meta ?? {};
  const organizerSelf = ev.organizer === 'self' || meta.organizer === 'self';
  const flexible = !!meta.flexible;
  const mustAttend = !!meta.must_attend || ev.importance === 'high';
  const participants = Number(meta.participants ?? 1);

  let conf = 0.5;
  let action: Decision['action'] = 'notify_only';
  let reason = 'baseline';

  if (conflict.prayer_name) {
    conf += 0.2;
    reason = 'prayer_window';
    if (flexible || organizerSelf) { conf += 0.2; }
    if (participants >= 3 && !organizerSelf) { conf -= 0.15; }
    if (mustAttend) { conf -= 0.25; }

    if (conf >= 0.8) {
      action = flexible ? 'shift_time' : 'mark_free';
    } else if (conf >= 0.6) {
      action = flexible ? 'shift_time' : 'notify_only';
    } else {
      action = 'notify_only';
    }
  }

  const requires_consent = action !== 'notify_only' && conf < 0.8;

  let patch: any = undefined;
  if (action === 'mark_free') {
    patch = { transparency: 'transparent', status: 'tentative' };
  }
  if (action === 'shift_time') {
    patch = { shift_minutes: 30 };
  }
  
  return { action, confidence: Math.max(0, Math.min(1, conf)), requires_consent, patch, reason };
}

async function applyPatch(supabase: any, ev: any, patch: any) {
  let updated: any = {};
  
  if (patch?.shift_minutes) {
    const ms = patch.shift_minutes * 60 * 1000;
    const startDate = new Date(ev.starts_at);
    const endDate = ev.ends_at ? new Date(ev.ends_at) : null;
    
    updated.starts_at = new Date(startDate.getTime() + ms).toISOString();
    if (endDate) {
      updated.ends_at = new Date(endDate.getTime() + ms).toISOString();
    }
    updated.pending_push = true;
  }
  
  if (patch?.transparency) {
    updated.transparency = patch.transparency;
    updated.pending_push = true;
  }
  
  if (patch?.status) {
    updated.status = patch.status;
    updated.pending_push = true;
  }
  
  if (Object.keys(updated).length === 0) return { before: ev, after: ev };
  
  const { data, error } = await supabase
    .from('events')
    .update(updated)
    .eq('id', ev.id)
    .select('*')
    .maybeSingle();
    
  if (error) throw error;
  return { before: ev, after: data };
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

    const { data: conflicts } = await supabase
      .from('conflicts')
      .select('*, events!inner(*)')
      .eq('owner_id', user.id)
      .in('status', ['open', 'suggested'])
      .limit(50);

    const results: any[] = [];
    
    for (const c of (conflicts ?? [])) {
      const ev = c.events;
      const decision = decide(ev, c);

      const updateConflict: any = {
        status: decision.requires_consent ? 'suggested' : 'auto_applied',
        suggested_action: decision.action,
        confidence: decision.confidence,
        suggested_change: {
          event_id: ev.id,
          patch: decision.patch,
          reason: decision.reason,
          kind: ev.meta?.kind ?? null
        },
        requires_consent: decision.requires_consent
      };

      let undoPatch: any = null;
      let appliedPatch: any = null;
      let notifyId: any = null;

      if (!decision.requires_consent && decision.action !== 'notify_only') {
        const { before, after } = await applyPatch(supabase, ev, decision.patch);
        appliedPatch = decision.patch;
        
        undoPatch = {
          ...(decision.patch?.shift_minutes ? { shift_minutes: -Number(decision.patch.shift_minutes) } : {}),
          ...(decision.patch?.transparency ? { transparency: before.transparency } : {}),
          ...(decision.patch?.status ? { status: before.status } : {})
        };
        
        updateConflict.applied_event_patch = appliedPatch;
        updateConflict.undo_patch = undoPatch;

        const undoToken = uid();
        await supabase.from('autopilot_actions').insert({
          owner_id: user.id,
          conflict_id: c.id,
          action: 'apply',
          suggested_action: decision.action,
          confidence: decision.confidence,
          patch_before: { event: ev },
          patch_after: { event: after },
          undo_token: undoToken
        });

        const { data: notif } = await supabase.from('notifications').insert({
          owner_id: user.id,
          label: 'تم حل تعارض تلقائيًا',
          time_local: new Date().toISOString().slice(11, 16),
          enabled: true,
          payload: {
            type: 'autopilot_applied',
            conflict_id: c.id,
            undo_token: undoToken,
            event_id: ev.id,
            action: decision.action,
            event_title: ev.title,
            prayer_name: c.prayer_name
          }
        }).select('id').maybeSingle();
        
        notifyId = notif?.id ?? null;
      } else if (decision.requires_consent) {
        const { data: notif } = await supabase.from('notifications').insert({
          owner_id: user.id,
          label: 'اقتراح حل تعارض',
          time_local: new Date().toISOString().slice(11, 16),
          enabled: true,
          payload: {
            type: 'autopilot_suggest',
            conflict_id: c.id,
            event_id: ev.id,
            action: decision.action,
            patch: decision.patch,
            event_title: ev.title,
            prayer_name: c.prayer_name,
            confidence: decision.confidence
          }
        }).select('id').maybeSingle();
        
        notifyId = notif?.id ?? null;
      }

      await supabase.from('conflicts').update({
        ...updateConflict,
        notification_id: notifyId ?? null
      }).eq('id', c.id);

      results.push({ id: c.id, decision });
    }

    return json({ ok: true, handled: results.length, results });
  } catch (e) {
    console.error('[conflict-autopilot]', e);
    return json({ ok: false, error: String(e) }, 500);
  }
});

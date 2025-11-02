// deno-lint-ignore-file no-explicit-any
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.46.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function json(x: any, s = 200) {
  return new Response(JSON.stringify(x), {
    status: s,
    headers: { ...corsHeaders, "content-type": "application/json" }
  });
}

function parseTime(t: string): { h: number; m: number } {
  const [h, m] = t.split(':').map(x => parseInt(x, 10));
  return { h, m };
}

function isInDNDWindow(now: Date, start: string | null, end: string | null): boolean {
  if (!start || !end) return false;
  const { h: sh, m: sm } = parseTime(start);
  const { h: eh, m: em } = parseTime(end);
  const nowMin = now.getHours() * 60 + now.getMinutes();
  const startMin = sh * 60 + sm;
  const endMin = eh * 60 + em;
  
  if (startMin <= endMin) {
    return nowMin >= startMin && nowMin < endMin;
  } else {
    // crosses midnight
    return nowMin >= startMin || nowMin < endMin;
  }
}

function getNextDNDExit(now: Date, start: string | null, end: string | null): Date {
  if (!start || !end) return now;
  const { h: eh, m: em } = parseTime(end);
  const exit = new Date(now);
  exit.setHours(eh, em, 0, 0);
  if (exit <= now) exit.setDate(exit.getDate() + 1);
  return exit;
}

async function isInPrayerWindow(sb: any, ownerId: string, scheduledAt: Date): Promise<{ inWindow: boolean; nextSafe?: Date }> {
  const dateISO = scheduledAt.toISOString().slice(0, 10);
  const { data: pt } = await sb.from('prayer_times')
    .select('fajr,dhuhr,asr,maghrib,isha')
    .eq('owner_id', ownerId)
    .eq('date_iso', dateISO)
    .maybeSingle();
  
  if (!pt) return { inWindow: false };
  
  const prayers = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'];
  const bufferMin = 5;
  const windowMin = 20;
  
  for (const p of prayers) {
    if (!pt[p]) continue;
    const [h, m] = (pt[p] as string).split(':').map(x => parseInt(x, 10));
    const prayerTime = new Date(scheduledAt);
    prayerTime.setHours(h, m, 0, 0);
    
    const start = new Date(prayerTime.getTime() - bufferMin * 60000);
    const end = new Date(prayerTime.getTime() + windowMin * 60000);
    
    if (scheduledAt >= start && scheduledAt < end) {
      return { inWindow: true, nextSafe: end };
    }
  }
  
  return { inWindow: false };
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAnon = Deno.env.get("SUPABASE_ANON_KEY")!;
    
    const url = new URL(req.url);
    const mode = url.searchParams.get('mode') || 'schedule';
    
    if (mode === 'schedule') {
      // يستدعى من العميل مع auth header
      const auth = req.headers.get("Authorization") ?? "";
      const sb = createClient(supabaseUrl, supabaseAnon, { 
        global: { headers: { Authorization: auth } } 
      });
      
      const { data: { user } } = await sb.auth.getUser();
      if (!user) return json({ ok: false, error: "UNAUTHENTICATED" }, 401);
      
      const body = await req.json() as {
        channel: 'local' | 'wa';
        scheduled_at: string;
        title: string;
        body?: string;
        entity_type?: 'event' | 'task';
        entity_id?: string;
        priority?: number;
        mute_while_prayer?: boolean;
      };
      
      // تحقق من feature flag
      const { data: flag } = await sb.from('feature_flags')
        .select('enabled, pilot_user_ids')
        .eq('key', 'automation.notify_enabled')
        .maybeSingle();
      
      const isEnabled = flag?.enabled || (flag?.pilot_user_ids || []).includes(user.id);
      if (!isEnabled) {
        return json({ ok: false, error: 'FEATURE_OFF' }, 403);
      }
      
      const { data, error } = await sb.from('notifications').insert({
        owner_id: user.id,
        channel: body.channel,
        status: 'scheduled',
        scheduled_at: body.scheduled_at,
        title: body.title,
        body: body.body || null,
        entity_type: body.entity_type || null,
        entity_id: body.entity_id || null,
        priority: body.priority || 0,
        mute_while_prayer: body.mute_while_prayer !== false
      }).select('id').single();
      
      if (error) throw error;
      
      console.log(`Notification ${data.id} scheduled for ${user.id} via ${body.channel}`);
      return json({ ok: true, id: data.id });
      
    } else if (mode === 'process_due') {
      // يستدعى من cron - نستخدم service role
      const sb = createClient(supabaseUrl, supabaseServiceKey);
      
      const now = new Date();
      const { data: notifications } = await sb
        .from('notifications')
        .select('*, profiles!inner(dnd_enabled, dnd_start, dnd_end, respect_prayer, wa_phone)')
        .eq('channel', 'wa')
        .eq('status', 'scheduled')
        .lte('scheduled_at', now.toISOString())
        .limit(100);
      
      if (!notifications || notifications.length === 0) {
        return json({ ok: true, processed: 0 });
      }
      
      let sent = 0, suppressed = 0, failed = 0;
      
      for (const notif of notifications) {
        const profile = (notif as any).profiles;
        
        // تحقق DND
        if (profile.dnd_enabled && isInDNDWindow(now, profile.dnd_start, profile.dnd_end)) {
          const nextExit = getNextDNDExit(now, profile.dnd_start, profile.dnd_end);
          await sb.from('notifications')
            .update({ scheduled_at: nextExit.toISOString(), status: 'scheduled' })
            .eq('id', notif.id);
          suppressed++;
          console.log(`Notification ${notif.id} suppressed (DND), rescheduled to ${nextExit}`);
          continue;
        }
        
        // تحقق الصلاة
        if (profile.respect_prayer && notif.mute_while_prayer) {
          const { inWindow, nextSafe } = await isInPrayerWindow(sb, notif.owner_id, new Date(notif.scheduled_at));
          if (inWindow && nextSafe) {
            await sb.from('notifications')
              .update({ scheduled_at: nextSafe.toISOString(), status: 'scheduled' })
              .eq('id', notif.id);
            suppressed++;
            console.log(`Notification ${notif.id} suppressed (prayer), rescheduled to ${nextSafe}`);
            continue;
          }
        }
        
        // إرسال WhatsApp
        if (!profile.wa_phone) {
          await sb.from('notifications')
            .update({ status: 'failed', error: 'NO_PHONE' })
            .eq('id', notif.id);
          failed++;
          continue;
        }
        
        try {
          // استدعاء wa-dispatch-send (افتراضي أنه موجود)
          const waRes = await fetch(`${supabaseUrl}/functions/v1/wa-dispatch-send`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${supabaseServiceKey}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              to: profile.wa_phone,
              text: `${notif.title}\n${notif.body || ''}`,
              idempotency_key: notif.id
            })
          });
          
          if (!waRes.ok) {
            const errText = await waRes.text();
            throw new Error(errText);
          }
          
          await sb.from('notifications')
            .update({ status: 'sent', sent_at: now.toISOString() })
            .eq('id', notif.id);
          sent++;
          
        } catch (e: any) {
          await sb.from('notifications')
            .update({ status: 'failed', error: String(e.message || e) })
            .eq('id', notif.id);
          failed++;
          console.error(`Failed to send notification ${notif.id}:`, e);
        }
      }
      
      console.log(`Processed ${notifications.length} notifications: sent=${sent}, suppressed=${suppressed}, failed=${failed}`);
      return json({ ok: true, processed: notifications.length, sent, suppressed, failed });
    }
    
    return json({ ok: false, error: 'INVALID_MODE' }, 400);
    
  } catch (e: any) {
    console.error("notify-dispatch error:", e);
    return json({ ok: false, error: "SERVER_ERROR", details: String(e) }, 500);
  }
});

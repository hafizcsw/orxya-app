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

async function refreshToken(refresh_token: string) {
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: Deno.env.get("GOOGLE_CLIENT_ID")!,
      client_secret: Deno.env.get("GOOGLE_CLIENT_SECRET")!,
      refresh_token,
      grant_type: "refresh_token"
    })
  });
  const j = await res.json();
  if (!res.ok) throw new Error(j?.error || "REFRESH_FAILED");
  return j;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnon = Deno.env.get("SUPABASE_ANON_KEY")!;
    const auth = req.headers.get("Authorization") ?? "";
    
    const sb = createClient(supabaseUrl, supabaseAnon, { 
      global: { headers: { Authorization: auth } } 
    });
    
    const { data: { user }, error: userErr } = await sb.auth.getUser();
    if (userErr || !user) return json({ ok: false, error: "UNAUTHENTICATED" }, 401);

    const body = await req.json().catch(() => ({})) as {
      event_id?: string;
      op?: 'upsert' | 'delete';
      target_calendar_id?: string;
    };

    if (!body.event_id || !body.op) {
      return json({ ok: false, error: "MISSING_PARAMS" }, 400);
    }

    // جلب الحدث
    const { data: ev, error: evErr } = await sb.from("events")
      .select("*")
      .eq("id", body.event_id)
      .eq("owner_id", user.id)
      .maybeSingle();
    
    if (evErr) throw evErr;
    if (!ev) return json({ ok: false, error: "EVENT_NOT_FOUND" }, 404);

    // جلب حساب Google
    const { data: acc, error: accErr } = await sb.from("external_accounts")
      .select("access_token,refresh_token,primary_calendar_id")
      .eq("owner_id", user.id)
      .eq("provider", "google")
      .eq("is_active", true)
      .maybeSingle();
    
    if (accErr) throw accErr;
    if (!acc?.access_token) {
      return json({ ok: false, error: "NO_GOOGLE_ACCOUNT" }, 400);
    }

    let access_token = acc.access_token;
    const calId = body.target_calendar_id || acc.primary_calendar_id || "primary";

    // جلب timezone من profiles
    const { data: profile } = await sb.from("profiles")
      .select("timezone")
      .eq("id", user.id)
      .maybeSingle();
    const timezone = profile?.timezone || "Asia/Dubai";

    // معالجة العملية
    if (body.op === "upsert") {
      const gEvent = {
        summary: ev.title || "(بدون عنوان)",
        description: ev.description || "",
        start: {
          dateTime: ev.starts_at,
          timeZone: timezone
        },
        end: {
          dateTime: ev.ends_at || ev.starts_at,
          timeZone: timezone
        }
      };

      let url: string;
      let method: string;
      
      if (ev.google_event_id) {
        // تحديث موجود
        url = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calId)}/events/${encodeURIComponent(ev.google_event_id)}`;
        method = "PUT";
      } else {
        // إنشاء جديد
        url = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calId)}/events`;
        method = "POST";
      }

      let res = await fetch(url, {
        method,
        headers: {
          "Authorization": `Bearer ${access_token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(gEvent)
      });

      // محاولة refresh عند 401
      if (res.status === 401 && acc.refresh_token) {
        const r = await refreshToken(acc.refresh_token);
        access_token = r.access_token;
        const expires_at = r.expires_in ? new Date(Date.now() + r.expires_in * 1000).toISOString() : null;
        
        await sb.from("external_accounts")
          .update({ access_token, expires_at })
          .eq("owner_id", user.id)
          .eq("provider", "google");
        
        // إعادة المحاولة
        res = await fetch(url, {
          method,
          headers: {
            "Authorization": `Bearer ${access_token}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify(gEvent)
        });
      }

      if (!res.ok) {
        const errBody = await res.text();
        console.error("Google Calendar API error:", res.status, errBody);
        return json({ ok: false, error: `GOOGLE_API_ERROR: ${res.status}`, details: errBody }, 500);
      }

      const result = await res.json();
      
      // تحديث الحدث المحلي
      await sb.from("events")
        .update({
          google_event_id: result.id,
          google_calendar_id: calId,
          sync_to_google: true,
          last_google_sync_at: new Date().toISOString()
        })
        .eq("id", body.event_id)
        .eq("owner_id", user.id);

      console.log(`Event ${body.event_id} synced to Google: ${result.id}`);
      return json({ ok: true, google_event_id: result.id });

    } else if (body.op === "delete") {
      if (!ev.google_event_id) {
        return json({ ok: true, message: "EVENT_NOT_ON_GOOGLE" });
      }

      const url = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calId)}/events/${encodeURIComponent(ev.google_event_id)}`;
      
      let res = await fetch(url, {
        method: "DELETE",
        headers: { "Authorization": `Bearer ${access_token}` }
      });

      // محاولة refresh عند 401
      if (res.status === 401 && acc.refresh_token) {
        const r = await refreshToken(acc.refresh_token);
        access_token = r.access_token;
        const expires_at = r.expires_in ? new Date(Date.now() + r.expires_in * 1000).toISOString() : null;
        
        await sb.from("external_accounts")
          .update({ access_token, expires_at })
          .eq("owner_id", user.id)
          .eq("provider", "google");
        
        res = await fetch(url, {
          method: "DELETE",
          headers: { "Authorization": `Bearer ${access_token}` }
        });
      }

      // 404 = already deleted, that's ok
      if (!res.ok && res.status !== 404) {
        const errBody = await res.text();
        console.error("Google Calendar delete error:", res.status, errBody);
        return json({ ok: false, error: `DELETE_FAILED: ${res.status}` }, 500);
      }

      // مسح معلومات Google من الحدث المحلي
      await sb.from("events")
        .update({
          google_event_id: null,
          google_calendar_id: null,
          sync_to_google: false,
          last_google_sync_at: null
        })
        .eq("id", body.event_id)
        .eq("owner_id", user.id);

      console.log(`Event ${body.event_id} removed from Google`);
      return json({ ok: true });
    }

    return json({ ok: false, error: "INVALID_OP" }, 400);

  } catch (e: any) {
    console.error("gcal-write error:", e);
    return json({ ok: false, error: "SERVER_ERROR", details: String(e) }, 500);
  }
});

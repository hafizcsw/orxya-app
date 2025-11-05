import { serve } from "https://deno.land/std/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { decryptJson, encryptJson } from "../_shared/crypto.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const json=(b:any,s=200)=>new Response(JSON.stringify(b),{status:s,headers:{
  "content-type":"application/json",...corsHeaders}});

// Rate limiter: في الذاكرة (يعمل لمدة وجود Edge Function)
const rateLimitMap = new Map<string, number>();
const RATE_LIMIT_MIN = 5; // 5 دقائق بين كل مزامنة

function isRateLimited(userId: string): boolean {
  const lastSync = rateLimitMap.get(userId);
  if (!lastSync) return false;
  const elapsed = Date.now() - lastSync;
  return elapsed < RATE_LIMIT_MIN * 60 * 1000;
}

function markRateLimited(userId: string) {
  rateLimitMap.set(userId, Date.now());
}

async function getBearer(supa:any, userId:string){
  const { data: acc } = await supa.from("external_accounts")
    .select("access_token_enc,refresh_token_enc,expires_at,scopes,sync_token,next_sync_after")
    .eq("owner_id", userId).eq("provider","google").maybeSingle();
  if (!acc) return { ok:false, reason:"NO_ACCOUNT" };

  // Database-level rate limit
  if (acc.next_sync_after && new Date(acc.next_sync_after) > new Date()) {
    return { ok:false, reason:"RATE_LIMITED", retry_after: acc.next_sync_after };
  }

  let access = (await decryptJson(acc.access_token_enc)).token as string;
  const refresh = acc.refresh_token_enc ? (await decryptJson(acc.refresh_token_enc)).token as string : null;
  const exp = acc.expires_at ? new Date(acc.expires_at).getTime() : null;

  if (exp && exp - Date.now() < 60_000 && refresh) {
    const clientId=Deno.env.get("GOOGLE_CLIENT_ID")!;
    const clientSecret=Deno.env.get("GOOGLE_CLIENT_SECRET")!;
    const r = await fetch("https://oauth2.googleapis.com/token", {
      method:"POST",
      headers:{ "content-type":"application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type:"refresh_token",
        refresh_token: refresh,
        client_id: clientId, client_secret: clientSecret
      })
    }).then(r=>r.json());

    if (r?.access_token) {
      access = r.access_token;
      await supa.from("external_accounts").update({
        access_token_enc: await encryptJson({ token: access }),
        expires_at: r.expires_in ? new Date(Date.now()+r.expires_in*1000).toISOString() : null
      }).eq("owner_id", userId).eq("provider","google");

      // Audit log for token refresh
      await supa.from("analytics_events").insert({
        user_id: userId,
        kind: "gcal_token_refreshed",
        meta: { expires_in: r.expires_in }
      });
    }
  }
  return { ok:true, token: access, sync_token: acc.sync_token ?? null };
}

Deno.serve(async (req)=>{
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  
  const supabaseUrl=Deno.env.get("SUPABASE_URL")!;
  const supabaseAnonKey=Deno.env.get("SUPABASE_ANON_KEY")!;
  const authHeader=req.headers.get("Authorization") ?? "";
  const supa=createClient(supabaseUrl,supabaseAnonKey,{
    global:{headers:{Authorization:authHeader}}
  });

  const { data:{ user } } = await supa.auth.getUser();
  if (!user) return json({ ok:false, error:"UNAUTHENTICATED" }, 401);

  // Memory-based rate limit check
  if (isRateLimited(user.id)) {
    return json({ ok:false, error:"RATE_LIMITED", message: `انتظر ${RATE_LIMIT_MIN} دقائق بين كل مزامنة` }, 429);
  }

  const bearerResult = await getBearer(supa, user.id);
  if (!bearerResult.ok) {
    if (bearerResult.reason === "RATE_LIMITED") {
      return json({ ok:false, error:"RATE_LIMITED", retry_after: bearerResult.retry_after }, 429);
    }
    return json({ ok:false, error: bearerResult.reason }, 400);
  }

  const { token, sync_token } = bearerResult;

  const timeMin=new Date(Date.now()-30*864e5).toISOString();
  const timeMax=new Date(Date.now()+60*864e5).toISOString();

  let pageToken: string|undefined = undefined;
  let newSyncToken: string|undefined = undefined;
  let added=0, updated=0, skipped=0, conflicts=0;

  const syncStartTime = Date.now();

  try {
    do{
      const url = new URL("https://www.googleapis.com/calendar/v3/calendars/primary/events");
      url.searchParams.set("singleEvents","true");
      url.searchParams.set("showDeleted","false");
      if (sync_token) {
        url.searchParams.set("syncToken", sync_token);
      } else {
        url.searchParams.set("timeMin", timeMin);
        url.searchParams.set("timeMax", timeMax);
        url.searchParams.set("orderBy","startTime");
      }
      if (pageToken) url.searchParams.set("pageToken", pageToken);

      const res = await fetch(url.toString(), { headers: { authorization: `Bearer ${token}` }});
      
      // Handle 410 Gone (sync token expired)
      if (res.status === 410) {
        await supa.from("external_accounts").update({ 
          sync_token: null,
          status: "sync_reset" 
        }).eq("owner_id", user.id).eq("provider","google");
        
        // Audit log
        await supa.from("analytics_events").insert({
          user_id: user.id,
          kind: "gcal_sync_token_expired",
          meta: { message: "Sync token expired, performing full sync" }
        });

        return json({ ok:true, reset:true, message: "انتهت صلاحية رمز المزامنة، سيتم إعادة المزامنة الكاملة" });
      }

      if (!res.ok) {
        const errorText = await res.text();
        console.error("Google Calendar API error:", res.status, errorText);
        
        // Audit log for errors
        await supa.from("analytics_events").insert({
          user_id: user.id,
          kind: "gcal_sync_error",
          meta: { status: res.status, error: errorText.slice(0, 500) }
        });

        return json({ ok:false, error:"GOOGLE_API_ERROR", status: res.status, details: errorText }, 500);
      }

      const data = await res.json();

      for (const ev of (data.items ?? [])) {
        const start = ev.start?.dateTime ?? (ev.start?.date ? ev.start.date + "T00:00:00Z" : null);
        const end   = ev.end?.dateTime   ?? (ev.end?.date   ? ev.end.date   + "T23:59:59Z" : null);
        if (!start || !end) { skipped++; continue; }

        const allDay = !ev.start?.dateTime && !!ev.start?.date;
        
        const incomingRow = {
          owner_id: user.id,
          source: "google",
          ext_id: ev.id,
          etag: ev.etag ?? null,
          title: ev.summary ?? "(بدون عنوان)",
          description: ev.description ?? null,
          starts_at: start,
          ends_at: end,
          all_day: allDay,
          location: ev.location ?? null,
          status: ev.status ?? "confirmed",
          updated_at: new Date().toISOString()
        };

        // Check if event already exists
        const { data: existed } = await supa.from("events")
          .select("id,etag,updated_at,last_write_origin")
          .eq("owner_id", user.id)
          .eq("source", "google")
          .eq("ext_id", ev.id)
          .maybeSingle();

        if (!existed) {
          // New event from Google
          const { error } = await supa.from("events").insert({
            ...incomingRow,
            last_write_origin: "google"
          });
          if (!error) added++;
        } else {
          // Conflict Resolution: Check if local changes exist
          const localModified = existed.last_write_origin === "user" && 
                               new Date(existed.updated_at) > new Date(ev.updated ?? existed.updated_at);
          
          if (localModified) {
            // Local change is newer → skip Google update, mark as conflict
            conflicts++;
            console.warn(`Conflict detected for event ${ev.id}: local changes preserved`);
            
            // Optionally log conflict for user review
            await supa.from("analytics_events").insert({
              user_id: user.id,
              kind: "gcal_sync_conflict",
              meta: { 
                event_id: existed.id,
                ext_id: ev.id,
                message: "Local changes preserved over Google update"
              }
            });
            
            skipped++;
          } else if (existed.etag !== incomingRow.etag) {
            // Google version is newer or equal → update
            const { error } = await supa.from("events")
              .update({
                ...incomingRow,
                last_write_origin: "google"
              })
              .eq("id", existed.id);
            if (!error) updated++;
          } else {
            skipped++;
          }
        }
      }

      pageToken = data.nextPageToken;
      newSyncToken = data.nextSyncToken ?? newSyncToken;
    } while (pageToken);

    if (newSyncToken) {
      await supa.from("external_accounts").update({
        sync_token: newSyncToken, 
        last_sync_at: new Date().toISOString(),
        next_sync_after: new Date(Date.now() + RATE_LIMIT_MIN * 60 * 1000).toISOString(),
        status: "connected"
      }).eq("owner_id", user.id).eq("provider","google");
    }

    // Mark user as rate-limited in memory
    markRateLimited(user.id);

    // Audit log for successful sync
    const syncDuration = Date.now() - syncStartTime;
    await supa.from("analytics_events").insert({
      user_id: user.id,
      kind: "gcal_sync_success",
      meta: { 
        added, 
        updated, 
        skipped, 
        conflicts,
        duration_ms: syncDuration,
        incremental: !!sync_token
      }
    });

    // Trigger conflict check for recent events (today ±3 days)
    try {
      await supa.functions.invoke("conflict-check", {
        body: { days_range: 3 }
      });
    } catch (e) {
      console.warn("Failed to trigger conflict-check:", e);
    }

    return json({ 
      ok:true, 
      added, 
      updated, 
      skipped, 
      conflicts,
      incremental: !!sync_token,
      duration_ms: syncDuration
    });

  } catch (e: any) {
    console.error("gcal-sync error:", e);
    
    // Audit log for errors
    await supa.from("analytics_events").insert({
      user_id: user.id,
      kind: "gcal_sync_error",
      meta: { error: String(e?.message ?? e) }
    });

    return json({ ok:false, error:"SERVER_ERROR", details: String(e?.message ?? e) }, 500);
  }
});
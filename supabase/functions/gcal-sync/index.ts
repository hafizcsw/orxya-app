import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { decryptJson, encryptJson } from "../_shared/crypto.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const json=(b:any,s=200)=>new Response(JSON.stringify(b),{status:s,headers:{
  "content-type":"application/json",...corsHeaders}});

async function getBearer(supa:any, userId:string){
  const { data: acc } = await supa.from("external_accounts")
    .select("access_token_enc,refresh_token_enc,expires_at,scopes,sync_token")
    .eq("owner_id", userId).eq("provider","google").maybeSingle();
  if (!acc) return { ok:false, reason:"NO_ACCOUNT" };

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

  const { ok, token, sync_token } = await getBearer(supa, user.id);
  if (!ok) return json({ ok:false, error:"NOT_LINKED" }, 400);

  const timeMin=new Date(Date.now()-30*864e5).toISOString();
  const timeMax=new Date(Date.now()+60*864e5).toISOString();

  let pageToken: string|undefined = undefined;
  let newSyncToken: string|undefined = undefined;
  let added=0, updated=0, skipped=0;

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
    if (res.status === 410) {
      await supa.from("external_accounts").update({ sync_token: null }).eq("owner_id", user.id).eq("provider","google");
      return json({ ok:true, reset:true });
    }
    const data = await res.json();

    for (const ev of (data.items ?? [])) {
      const start = ev.start?.dateTime ?? (ev.start?.date ? ev.start.date + "T00:00:00Z" : null);
      const end   = ev.end?.dateTime   ?? (ev.end?.date   ? ev.end.date   + "T23:59:59Z" : null);
      if (!start || !end) { skipped++; continue; }

      const row = {
        owner_id: user.id,
        title: ev.summary ?? "(بدون عنوان)",
        starts_at: start,
        ends_at: end,
        source_id: "external",
        external_source: "google",
        external_id: ev.id,
        external_calendar_id: "primary",
        external_etag: ev.etag ?? null,
        updated_at: new Date().toISOString()
      };

      const { data: existed } = await supa.from("events")
        .select("id,external_etag").eq("owner_id", user.id)
        .eq("external_source","google").eq("external_id", ev.id).maybeSingle();

      if (!existed) {
        const { error } = await supa.from("events").insert(row);
        if (!error) added++;
      } else if (existed.external_etag !== row.external_etag) {
        const { error } = await supa.from("events")
          .update(row).eq("id", existed.id);
        if (!error) updated++;
      } else {
        skipped++;
      }
    }

    pageToken = data.nextPageToken;
    newSyncToken = data.nextSyncToken ?? newSyncToken;
  } while (pageToken);

  if (newSyncToken) {
    await supa.from("external_accounts").update({
      sync_token: newSyncToken, last_sync_at: new Date().toISOString()
    }).eq("owner_id", user.id).eq("provider","google");
  }

  // Trigger conflict check for recent events (today ±3 days)
  try {
    await supa.functions.invoke("conflict-check", {
      body: { days_range: 3 }
    });
  } catch (e) {
    console.warn("Failed to trigger conflict-check:", e);
  }

  return json({ ok:true, added, updated, skipped, incremental: !!sync_token });
});

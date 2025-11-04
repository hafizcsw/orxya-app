import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

type Input = {
  attendees: Array<{ user_id?: string; email?: string }>;
  duration_minutes: number;
  window: { start: string; end: string };
  limit?: number;
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const jwt = req.headers.get("Authorization")?.replace("Bearer ", "");
  if (!jwt) return new Response("no_auth", { status: 401, headers: corsHeaders });

  const sb = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: `Bearer ${jwt}` } } }
  );

  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) return new Response("bad_user", { status: 401, headers: corsHeaders });

  const { data: flags } = await sb.rpc("get_user_flags", { p_user_id: user.id });
  if (!flags?.ff_calendar_find_time) {
    return new Response("flag_off", { status: 403, headers: corsHeaders });
  }

  let body: Input;
  try {
    body = await req.json();
  } catch {
    return new Response("bad_json", { status: 400, headers: corsHeaders });
  }

  const dur = Math.max(15, body.duration_minutes);
  const limit = Math.min(10, body.limit ?? 5);

  console.log(`[find-time] User ${user.id} - Duration: ${dur}min, Limit: ${limit}`);

  // جمع انشغال المستخدم الأساسي
  const { data: busySelf } = await sb
    .from("events")
    .select("starts_at,ends_at,kind,visibility,busy_state")
    .gte("starts_at", body.window.start)
    .lte("ends_at", body.window.end)
    .eq("owner_id", user.id)
    .neq("busy_state", "free");

  // جمع أوقات الصلاة
  const { data: prayers } = await sb
    .from("prayer_times")
    .select("date_iso,fajr,dhuhr,asr,maghrib,isha")
    .gte("date_iso", body.window.start.slice(0, 10))
    .lte("date_iso", body.window.end.slice(0, 10))
    .eq("owner_id", user.id);

  // جمع ساعات العمل
  const { data: wh } = await sb
    .from("working_hours")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle();

  const slots: string[] = [];
  const start = new Date(body.window.start).getTime();
  const end = new Date(body.window.end).getTime();
  const step = 30 * 60 * 1000; // 30 دقيقة

  function overlaps(aStart: number, aEnd: number, bStart: number, bEnd: number) {
    return aStart < bEnd && bStart < aEnd;
  }

  // بناء قائمة الفترات المشغولة
  const busy: Array<[number, number]> = [];
  (busySelf ?? []).forEach((e) => {
    busy.push([Date.parse(e.starts_at), Date.parse(e.ends_at)]);
  });

  // إضافة أوقات الصلاة كفترات مشغولة (10 دقائق قبل + 20 دقيقة بعد)
  (prayers ?? []).forEach((p) => {
    ["fajr", "dhuhr", "asr", "maghrib", "isha"].forEach((name) => {
      const t = (p as any)[name];
      if (!t) return;
      const at = Date.parse(`${p.date_iso}T${t}`);
      busy.push([at - 10 * 60 * 1000, at + 20 * 60 * 1000]);
    });
  });

  // البحث عن الفتحات المتاحة
  for (let ts = start; ts + dur * 60 * 1000 <= end; ts += step) {
    const d = new Date(ts);
    const dow = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"][d.getDay()];

    // التحقق من ساعات العمل
    let withinWH = true;
    if (wh && wh[dow as keyof typeof wh]) {
      const r = (wh as any)[dow] as string | null;
      if (r) {
        const m = r.match(/\[(\d+),(\d+)\)/);
        if (m) {
          const startMin = parseInt(m[1]);
          const endMin = parseInt(m[2]);
          const local = new Date(d);
          local.setHours(0, 0, 0, 0);
          const rs = local.getTime() + startMin * 60 * 1000;
          const re = local.getTime() + endMin * 60 * 1000;
          withinWH = ts >= rs && ts + dur * 60 * 1000 <= re;
        }
      }
    }

    if (!withinWH) continue;

    const slotEnd = ts + dur * 60 * 1000;
    const collides = busy.some(([b1, b2]) => overlaps(ts, slotEnd, b1, b2));

    if (!collides) {
      slots.push(new Date(ts).toISOString());
      if (slots.length >= limit) break;
    }
  }

  console.log(`[find-time] Found ${slots.length} available slots`);

  return new Response(JSON.stringify({ slots, duration_minutes: dur }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});

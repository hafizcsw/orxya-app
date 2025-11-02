import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, content-type",
};

const addMin = (d: Date, m: number) => {
  const x = new Date(d);
  x.setMinutes(x.getMinutes() + m);
  return x;
};

function overlapMinutes(aStart: Date, aEnd: Date, bStart: Date, bEnd: Date): number {
  const s = Math.max(aStart.getTime(), bStart.getTime());
  const e = Math.min(aEnd.getTime(), bEnd.getTime());
  return Math.max(0, Math.round((e - s) / 60000));
}

function severityFromMinutes(m: number): "low" | "medium" | "high" {
  if (m >= 25) return "high";
  if (m >= 10) return "medium";
  return "low";
}

function buildSuggestion(
  ev: any,
  pName: string,
  pTime: Date,
  pre: number,
  post: number
) {
  const winStart = addMin(pTime, -pre);
  const winEnd = addMin(pTime, +post);
  const eStart = new Date(ev.starts_at);
  const eEnd = new Date(ev.ends_at);
  const durMin = Math.max(1, Math.round((eEnd.getTime() - eStart.getTime()) / 60000));

  const title = (ev.title ?? "").toString().toLowerCase();
  if (["prayer", "صلاة", "mosque", "masjid", "church", "كنيسة"].some((k) => title.includes(k))) {
    return { type: "none" };
  }

  if (eStart <= winStart && eEnd >= winEnd && durMin >= pre + post) {
    return {
      type: "split",
      explanation: "الحدث يغطي نافذة الصلاة بالكامل؛ نقترح تقسيمه إلى جزئين قبل/بعد الصلاة",
      parts: [
        { new_start: eStart.toISOString(), new_end: winStart.toISOString() },
        { new_start: winEnd.toISOString(), new_end: eEnd.toISOString() },
      ],
    };
  }

  if (eStart < winStart && eEnd > winStart && eEnd <= winEnd) {
    return {
      type: "truncate_end",
      explanation: "ينتهي الحدث داخل نافذة الصلاة؛ نقترح إنهاءه قبل بداية النافذة",
      new_end: winStart.toISOString(),
    };
  }

  if (eStart >= winStart && eStart < winEnd && eEnd > winEnd) {
    return {
      type: "delay_start",
      explanation: "يبدأ الحدث داخل نافذة الصلاة؛ نقترح تأخيره لما بعد الصلاة",
      new_start: winEnd.toISOString(),
    };
  }

  return {
    type: "mark_free",
    explanation: "تعارض طفيف؛ نقترح جعله غير مُلزِم خلال نافذة الصلاة",
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const auth = req.headers.get("Authorization") ?? "";
    const supabase = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: auth } },
    });

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ ok: false, error: "UNAUTHENTICATED" }), {
        status: 401,
        headers: { ...cors, "content-type": "application/json" },
      });
    }

    const { data: prof } = await supabase
      .from("profiles")
      .select("prayer_buffers,religion")
      .eq("id", user.id)
      .maybeSingle();

    if ((prof?.religion ?? "muslim") !== "muslim") {
      return new Response(
        JSON.stringify({ ok: true, checked: 0, created: 0, skipped: "non-muslim" }),
        { headers: { ...cors, "content-type": "application/json" } }
      );
    }

    const prayerBuffers = prof?.prayer_buffers || {
      fajr: { pre: 10, post: 20 },
      dhuhr: { pre: 10, post: 20 },
      asr: { pre: 10, post: 20 },
      maghrib: { pre: 10, post: 20 },
      isha: { pre: 10, post: 20 },
      jumuah: { pre: 30, post: 45 }
    };

    const base = new Date();
    const days = [0, 1];
    let created = 0,
      checked = 0;

    for (const add of days) {
      const d = new Date(base);
      d.setDate(d.getDate() + add);
      const dateISO = d.toISOString().slice(0, 10);

      await supabase.functions.invoke("prayer-sync", {
        body: { date: dateISO, days: 1 },
      });

      const { data: pt } = await supabase
        .from("prayer_times")
        .select("fajr,dhuhr,asr,maghrib,isha")
        .eq("owner_id", user.id)
        .eq("date_iso", dateISO)
        .maybeSingle();

      // Check if Friday for Jumuah
      const dayOfWeek = new Date(dateISO).getDay();
      const prayersOrder = dayOfWeek === 5 
        ? ["fajr", "jumuah", "asr", "maghrib", "isha"] 
        : ["fajr", "dhuhr", "asr", "maghrib", "isha"];
      const pMap: Record<string, Date> = {};

      for (const name of prayersOrder) {
        const prayerKey = name === "jumuah" ? "dhuhr" : name;
        const t = (pt as any)?.[prayerKey];
        if (t) {
          const [hh, mm] = String(t).split(":").map((x) => parseInt(x, 10));
          const px = new Date(dateISO + "T00:00:00.000Z");
          px.setUTCHours(hh, mm, 0, 0);
          pMap[name] = px;
        }
      }

      const dayStart = new Date(dateISO + "T00:00:00.000Z");
      const dayEnd = new Date(dateISO + "T23:59:59.999Z");

      const { data: events } = await supabase
        .from("events")
        .select("*")
        .eq("owner_id", user.id)
        .gte("starts_at", dayStart.toISOString())
        .lte("starts_at", dayEnd.toISOString());

      for (const ev of events ?? []) {
        checked++;
        for (const pname of prayersOrder) {
          const pTime = pMap[pname];
          if (!pTime) continue;

          const buffers = (prayerBuffers as any)[pname] || { pre: 10, post: 20 };
          const winStart = addMin(pTime, -buffers.pre);
          const winEnd = addMin(pTime, +buffers.post);

          const eStart = new Date(ev.starts_at);
          const eEnd = new Date(ev.ends_at);
          if (eEnd <= winStart || eStart >= winEnd) continue;

          const minutes = overlapMinutes(eStart, eEnd, winStart, winEnd);
          if (minutes <= 0) continue;

          const sev = severityFromMinutes(minutes);
          const suggestion = buildSuggestion(ev, pname, pTime, buffers.pre, buffers.post);

          const row = {
            owner_id: user.id,
            date_iso: dateISO,
            prayer_name: pname,
            prayer_time: pTime.toISOString(),
            prayer_start: winStart.toISOString(),
            prayer_end: winEnd.toISOString(),
            event_id: ev.id,
            object_id: ev.id,
            object_kind: "event",
            overlap_min: minutes,
            buffer_min: buffers.pre + buffers.post,
            severity: sev,
            status: suggestion.type === "none" ? "ignored" : "proposed",
            suggestion: suggestion,
            resolved_at: null
          };

          const { error } = await supabase.from("conflicts").upsert(row, {
            onConflict: "owner_id,event_id,prayer_name,date_iso",
            ignoreDuplicates: false,
          });
          if (!error) created++;
        }
      }
    }

    return new Response(JSON.stringify({ ok: true, checked, created }), {
      headers: { ...cors, "content-type": "application/json" },
    });
  } catch (e: any) {
    console.error("conflict-check error:", e);
    return new Response(
      JSON.stringify({ ok: false, error: "SERVER_ERROR", details: String(e?.message ?? e) }),
      { status: 500, headers: { ...cors, "content-type": "application/json" } }
    );
  }
});

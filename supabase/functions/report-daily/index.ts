import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors = {
  "access-control-allow-origin": "*",
  "access-control-allow-headers": "authorization, x-client-info, apikey, content-type",
  "access-control-allow-methods": "GET, POST, OPTIONS",
  "content-type": "application/json; charset=utf-8",
};

function todayDubaiISODate(): string {
  // Dubai is UTC+4 year-round (no DST)
  const now = new Date();
  const dubai = new Date(now.getTime() + 4 * 60 * 60 * 1000);
  return dubai.toISOString().slice(0, 10); // YYYY-MM-DD
}

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { ...cors } });
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: { ...cors } });
  try {
    const body = req.method === "POST" ? await req.json().catch(() => ({})) : {};
    const reportDate = body.date || todayDubaiISODate();

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const authHeader = req.headers.get("Authorization") ?? "";

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }, // keep RLS
    });

    // Ensure authenticated user (RLS context)
    const { data: { user }, error: userErr } = await supabase.auth.getUser();
    if (userErr || !user) return json({ ok: false, error: "UNAUTHENTICATED" }, 401);

    console.log("Generating report for:", reportDate, "user:", user.id);

    // --- Finance aggregates ---
    const { data: finRows, error: finErr } = await supabase
      .from("finance_entries")
      .select("type, amount_usd")
      .eq("entry_date", reportDate)
      .eq("owner_id", user.id);
    if (finErr) throw finErr;

    let income_usd = 0, spend_usd = 0;
    for (const r of finRows ?? []) {
      const amt = Number(r.amount_usd) || 0;
      if (r.type === "income") income_usd += amt;
      if (r.type === "spend") spend_usd += amt;
    }
    const net_usd = income_usd - spend_usd;

    // --- Daily logs aggregates (sum across same date) ---
    const { data: logRows, error: logErr } = await supabase
      .from("daily_logs")
      .select("work_hours, study_hours, mma_hours, walk_min")
      .eq("log_date", reportDate)
      .eq("owner_id", user.id);
    if (logErr) throw logErr;

    let work_hours = 0, study_hours = 0, mma_hours = 0, walk_min = 0;
    for (const r of logRows ?? []) {
      work_hours += Number(r.work_hours) || 0;
      study_hours += Number(r.study_hours) || 0;
      mma_hours += Number(r.mma_hours) || 0;
      walk_min += Number(r.walk_min) || 0;
    }

    // --- Sales aggregates (sum qty by type) ---
    const { data: saleRows, error: saleErr } = await supabase
      .from("sales")
      .select("type, qty")
      .eq("sale_date", reportDate)
      .eq("owner_id", user.id);
    if (saleErr) throw saleErr;

    let scholarships_sold = 0, villas_sold = 0;
    for (const r of saleRows ?? []) {
      const q = Number(r.qty) || 0;
      if (r.type === "scholarship") scholarships_sold += q;
      if (r.type === "villa") villas_sold += q;
    }

    const report = {
      date: reportDate,
      income_usd, spend_usd, net_usd,
      study_hours, mma_hours, work_hours, walk_min,
      scholarships_sold, villas_sold
    };

    console.log("Report generated:", report);
    return json({ ok: true, report });
  } catch (e) {
    console.error("report-daily error:", e);
    return json({ ok: false, error: "SERVER_ERROR", details: String(e) }, 500);
  }
});

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userErr } = await supabase.auth.getUser();
    if (userErr || !user) {
      return new Response(
        JSON.stringify({ ok: false, error: "UNAUTHENTICATED" }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get date from query param or use today (Dubai timezone)
    const url = new URL(req.url);
    const dateParam = url.searchParams.get("date");
    const targetDate = dateParam || new Date().toISOString().split('T')[0];

    console.log("Generating daily report for:", targetDate, "user:", user.id);

    // Aggregate finance
    const { data: financeData } = await supabase
      .from("finance_entries")
      .select("type, amount_usd")
      .eq("owner_id", user.id)
      .eq("entry_date", targetDate);

    let income_usd = 0;
    let spend_usd = 0;
    financeData?.forEach(entry => {
      if (entry.type === 'income') income_usd += Number(entry.amount_usd);
      if (entry.type === 'spend') spend_usd += Number(entry.amount_usd);
    });
    const net_usd = income_usd - spend_usd;

    // Aggregate daily logs
    const { data: logsData } = await supabase
      .from("daily_logs")
      .select("work_hours, study_hours, mma_hours, walk_min")
      .eq("owner_id", user.id)
      .eq("log_date", targetDate)
      .maybeSingle();

    const study_hours = logsData?.study_hours || 0;
    const mma_hours = logsData?.mma_hours || 0;
    const work_hours = logsData?.work_hours || 0;
    const walk_min = logsData?.walk_min || 0;

    // Aggregate sales
    const { data: salesData } = await supabase
      .from("sales")
      .select("type, qty")
      .eq("owner_id", user.id)
      .eq("sale_date", targetDate);

    let scholarships_sold = 0;
    let villas_sold = 0;
    salesData?.forEach(sale => {
      if (sale.type === 'scholarship') scholarships_sold += sale.qty || 0;
      if (sale.type === 'villa') villas_sold += sale.qty || 0;
    });

    const report = {
      date: targetDate,
      income_usd,
      spend_usd,
      net_usd,
      study_hours,
      mma_hours,
      work_hours,
      walk_min,
      scholarships_sold,
      villas_sold
    };

    console.log("Report generated:", report);

    return new Response(
      JSON.stringify({ ok: true, report }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (e: any) {
    console.error("Server error:", e);
    return new Response(
      JSON.stringify({ ok: false, error: "SERVER_ERROR", details: String(e) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

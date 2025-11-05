// Epic 7: Daily Report - Returns daily metrics window
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
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
    const jwt = req.headers.get("Authorization")?.replace("Bearer ", "");
    if (!jwt) {
      return new Response(
        JSON.stringify({ error: "no_auth" }), 
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const url = Deno.env.get("SUPABASE_URL")!;
    const key = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(url, key, { 
      global: { headers: { Authorization: `Bearer ${jwt}` } } 
    });

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      console.error("Auth error:", authError);
      return new Response(
        JSON.stringify({ error: "bad_user" }), 
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const payload = await req.json().catch(() => ({}));
    const { start, end } = payload as { start?: string; end?: string };

    if (!start || !end) {
      return new Response(
        JSON.stringify({ error: "bad_window" }), 
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[report-daily] user=${user.id} start=${start} end=${end}`);

    // Get daily metrics from RPC
    const { data, error } = await supabase.rpc("get_daily_metrics", {
      p_user_id: user.id,
      p_start: start,
      p_end: end
    });

    if (error) {
      console.error("RPC error:", error);
      return new Response(
        JSON.stringify({ error: error.message }), 
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get initial balance from profiles
    const { data: profile } = await supabase
      .from('profiles')
      .select('initial_balance_usd')
      .eq('id', user.id)
      .single();

    const initialBalance = profile?.initial_balance_usd || 0;

    // Get detailed income/spend for each day
    const { data: financeData } = await supabase
      .from('finance_entries')
      .select('entry_date, type, amount_usd')
      .eq('owner_id', user.id)
      .gte('entry_date', start)
      .lte('entry_date', end);

    // Group by date and type
    const financeByDate = (financeData || []).reduce((acc: any, entry: any) => {
      const dateKey = entry.entry_date;
      if (!acc[dateKey]) {
        acc[dateKey] = { income: 0, spend: 0 };
      }
      if (entry.type === 'income') {
        acc[dateKey].income += parseFloat(entry.amount_usd) || 0;
      } else if (entry.type === 'spend') {
        acc[dateKey].spend += parseFloat(entry.amount_usd) || 0;
      }
      return acc;
    }, {});

    // Transform data to include calculated fields
    const items = (data || []).map((item: any) => {
      // Calculate cumulative balance up to this date
      const cumulativeNetCashflow = (data || [])
        .filter((d: any) => d.day <= item.day)
        .reduce((sum: number, d: any) => sum + (d.net_cashflow || 0), 0);
      
      const currentBalance = initialBalance + cumulativeNetCashflow;
      
      // Get income and spend for this specific day
      const dayFinance = financeByDate[item.day] || { income: 0, spend: 0 };

      return {
        ...item,
        current_balance: currentBalance,
        total_income: initialBalance + (data || [])
          .filter((d: any) => d.day <= item.day)
          .reduce((sum: number, d: any) => {
            const df = financeByDate[d.day] || { income: 0, spend: 0 };
            return sum + df.income;
          }, 0),
        total_spend: (data || [])
          .filter((d: any) => d.day <= item.day)
          .reduce((sum: number, d: any) => {
            const df = financeByDate[d.day] || { income: 0, spend: 0 };
            return sum + df.spend;
          }, 0),
        income_usd: dayFinance.income,
        spend_usd: dayFinance.spend,
        net_usd: item.net_cashflow
      };
    });

    return new Response(
      JSON.stringify({ items }), 
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Unexpected error:", error);
    const message = error instanceof Error ? error.message : String(error);
    return new Response(
      JSON.stringify({ error: message }), 
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

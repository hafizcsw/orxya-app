import { serve } from "https://deno.land/std/http/server.ts";
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
    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );
    
    const { user_id, scenario } = await req.json();

    // Get user budget rules (default 50/30/20 if not set)
    const { data: profile } = await admin
      .from("profiles")
      .select("config_jsonb")
      .eq("id", user_id)
      .single();

    const cfg = profile?.config_jsonb || {};
    const rule = cfg.budget_rule ?? { needs: 0.5, wants: 0.3, save: 0.2 };

    // Get current month summary
    const { data: events } = await admin
      .from("financial_events")
      .select("direction, amount")
      .eq("user_id", user_id)
      .gte("occurred_at", new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString());

    const income = (events || [])
      .filter(e => e.direction === "incoming")
      .reduce((sum, e) => sum + Number(e.amount), 0);
    
    const spent = (events || [])
      .filter(e => e.direction === "outgoing")
      .reduce((sum, e) => sum + Number(e.amount), 0);

    const discretionaryBudget = Math.max(0, income * rule.wants - spent);
    let impact = 0, within = true;

    if (scenario?.type === "spend") {
      impact = spent + scenario.amount - income * rule.wants;
      within = impact <= 0;
    } else if (scenario?.type === "subscribe") {
      impact = spent + scenario.amount - income * rule.wants;
      within = impact <= 0;
    }

    const out = {
      is_within_budget: within,
      impact_on_savings: Math.max(0, -impact),
      remaining_discretionary: Math.max(0, discretionaryBudget - (scenario?.amount ?? 0)),
      alerts: impact > 0 ? "Warning: exceeds 'Wants' envelope." : null,
      inputs: { income, spent, rule }
    };

    return new Response(JSON.stringify(out), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400
    });
  }
});

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface FinancialEventInput {
  occurred_at: string;
  direction: 'incoming' | 'outgoing';
  amount: number;
  currency: string;
  merchant?: string | null;
  category?: string | null;
  source_type: string;
  confidence: number;
  is_subscription: boolean;
  client_fp?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "no_auth" }), 
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } }
    });

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      console.error("Auth error:", authError);
      return new Response(
        JSON.stringify({ error: "unauthorized" }), 
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body = await req.json();
    const events = (body?.events ?? []) as FinancialEventInput[];

    if (!Array.isArray(events) || events.length === 0) {
      return new Response(
        JSON.stringify({ error: "no_events" }), 
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // تحويل إلى صيغة الجدول
    const rows = events.map(e => ({
      user_id: user.id,
      occurred_at: e.occurred_at,
      direction: e.direction,
      amount: e.amount,
      currency: (e.currency || "USD").substring(0, 3).toUpperCase(),
      merchant: e.merchant || null,
      category: e.category || null,
      source_type: e.source_type || "notification",
      confidence: e.confidence ?? 0.7,
      is_subscription: !!e.is_subscription
    }));

    console.log(`[ingest-financial-events] user=${user.id} events=${rows.length}`);

    const { error } = await supabase
      .from("financial_events")
      .insert(rows);

    if (error) {
      console.error("Insert error:", error);
      return new Response(
        JSON.stringify({ error: error.message }), 
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ ok: true, inserted: rows.length }), 
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

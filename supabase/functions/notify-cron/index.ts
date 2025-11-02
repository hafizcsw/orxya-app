// deno-lint-ignore-file no-explicit-any
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    // استدعاء notify-dispatch بوضع process_due
    const res = await fetch(`${supabaseUrl}/functions/v1/notify-dispatch?mode=process_due`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${supabaseServiceKey}`,
        'Content-Type': 'application/json'
      }
    });
    
    const result = await res.json();
    console.log('notify-cron completed:', result);
    
    return new Response(JSON.stringify(result), {
      status: res.status,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
    
  } catch (e: any) {
    console.error("notify-cron error:", e);
    return new Response(JSON.stringify({ ok: false, error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});

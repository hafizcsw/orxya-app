import { serve } from "https://deno.land/std/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const GET_DATA_PATTERNS = [
  /عدد.*خطوات|steps/i,
  /نومي|sleep/i,
  /كم.*أنفقت|spent/i,
  /الرصيد|balance/i,
  /موعدي|اجتماعي|next event/i
];

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { prompt } = await req.json();
    const hit = GET_DATA_PATTERNS.some(r => r.test(prompt));
    const intent = hit ? "get_data" : "complex_analysis";
    
    return new Response(JSON.stringify({ intent }), {
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

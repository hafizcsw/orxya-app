import { serve } from "https://deno.land/std/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const dict = [
  { k: ["كبسة", "رز بالدجاج", "كبسة دجاج"], kcal: 650, c: 75, f: 20, p: 30 },
  { k: ["مجبوس", "مجبوس دجاج"], kcal: 650, c: 75, f: 20, p: 30 },
  { k: ["فول", "فول مدمس"], kcal: 320, c: 45, f: 5, p: 18 },
  { k: ["كنافة"], kcal: 420, c: 55, f: 18, p: 8 },
  { k: ["شاورما"], kcal: 500, c: 45, f: 25, p: 30 },
  { k: ["فلافل"], kcal: 330, c: 31, f: 18, p: 13 }
];

function guess(desc: string) {
  const t = desc.toLowerCase();
  for (const row of dict) {
    if (row.k.some(w => t.includes(w))) {
      return { ...row, conf: 0.8, src: "Oryxa Dict v0.1" };
    }
  }
  return { kcal: 450, c: 50, f: 15, p: 15, conf: 0.4, src: "Heuristic v0.1" };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { food_description, quantity } = await req.json();
    const g = guess(food_description || "");
    
    return new Response(JSON.stringify({
      kcal: g.kcal,
      carbs_g: g.c,
      fat_g: g.f,
      protein_g: g.p,
      confidence: g.conf,
      source_db: g.src,
      note: quantity ?? null
    }), {
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

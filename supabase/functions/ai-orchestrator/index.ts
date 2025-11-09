import { serve } from "https://deno.land/std/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { schemaValidate, extractNumbers, MANDATORY_SCHEMA } from "../_shared/critic.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const MODEL_COMPLEX = "google/gemini-2.5-flash";
const COST_PER_1K = 0.00015;

async function callLovableAI(model: string, messages: any[]): Promise<any> {
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

  const r = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${LOVABLE_API_KEY}`
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: 0.3
    })
  });
  
  if (!r.ok) {
    if (r.status === 429) throw new Error("Rate limit exceeded");
    if (r.status === 402) throw new Error("Payment required");
    throw new Error(await r.text());
  }
  return r.json();
}

async function hash(s: string) {
  const d = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return Array.from(new Uint8Array(d)).map(b => b.toString(16).padStart(2, "0")).join("");
}

async function getCache(admin: any, key: string, uid: string) {
  const { data } = await admin
    .from("ai_cache")
    .select("payload, expires_at")
    .eq("cache_key", key)
    .eq("user_id", uid)
    .maybeSingle();
  
  if (!data) return null;
  if (new Date(data.expires_at).getTime() < Date.now()) return null;
  return data.payload;
}

async function putCache(admin: any, key: string, uid: string, payload: any, ttlSec: number) {
  const exp = new Date(Date.now() + ttlSec * 1000).toISOString();
  await admin.from("ai_cache").upsert({
    cache_key: key,
    user_id: uid,
    payload,
    expires_at: exp
  });
}

async function ensureQuota(admin: any, uid: string) {
  const { data } = await admin.from("ai_quota").select("*").eq("user_id", uid).maybeSingle();
  const today = new Date().toISOString().slice(0, 10);
  
  if (!data) {
    await admin.from("ai_quota").insert({ user_id: uid, window_start: today });
    return;
  }
  
  if (data.window_start !== today) {
    await admin.from("ai_quota").update({
      window_start: today,
      daily_calls_used: 0
    }).eq("user_id", uid);
    return;
  }
  
  if (data.daily_calls_used >= data.daily_calls_limit) {
    throw new Error("Daily quota exceeded");
  }
}

async function incrementQuota(admin: any, uid: string) {
  await admin.rpc("increment_ai_quota", { p_user_id: uid });
}

async function logCall(
  admin: any,
  uid: string,
  route: string,
  model: string | null,
  inT: number,
  outT: number,
  cost: number,
  cached: boolean,
  t0: number
) {
  const ms = Math.max(1, Math.round(performance.now() - t0));
  await admin.from("ai_calls_log").insert({
    user_id: uid,
    route,
    model,
    tokens_in: inT,
    tokens_out: outT,
    cost_usd: cost,
    latency_ms: ms,
    cached
  });
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const t0 = performance.now();

  try {
    const { prompt, domain, locale } = await req.json();
    
    const supaUser = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: req.headers.get("Authorization")! } } }
    );
    
    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Get user_id
    const { data: me } = await supaUser.auth.getUser();
    const user_id = me.user?.id;
    if (!user_id) {
      return new Response(JSON.stringify({ ok: false, error: "no auth" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 401
      });
    }

    // Check quota
    await ensureQuota(admin, user_id);

    // Check cache
    const cacheKey = await hash(`${user_id}|${prompt}|${domain}|${new Date().toDateString()}`);
    const cached = await getCache(admin, cacheKey, user_id);
    
    if (cached) {
      await logCall(admin, user_id, "orchestrator", null, 0, 0, 0, true, t0);
      return new Response(JSON.stringify({ ok: true, cached: true, data: cached }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200
      });
    }

    // Retrieve policies (if available)
    const { data: policies } = await admin
      .from("ai_policies")
      .select("domain, version, content")
      .eq("domain", domain ?? "finance")
      .order("id", { ascending: false })
      .limit(3);

    const policyText = (policies || [])
      .map(p => `#${p.domain}/${p.version}\n${p.content}`)
      .join("\n---\n");

    // Call tools based on domain
    let toolData: any = {};
    
    if ((domain ?? "").includes("finance")) {
      try {
        const budgetRes = await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/budget-simulator`, {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({ user_id, scenario: { type: "query" } })
        });
        toolData.budget = await budgetRes.json();
      } catch (e) {
        console.error("Budget tool error:", e);
      }
    }

    if ((domain ?? "").includes("planner")) {
      try {
        const schedRes = await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/scheduler-solver`, {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({ user_id, task: { duration_minutes: 30 }, constraints: [] })
        });
        toolData.scheduler = await schedRes.json();
      } catch (e) {
        console.error("Scheduler tool error:", e);
      }
    }

    // Build master prompt
    const systemPrompt = `أنت مساعد موثوق، يمنع عليك اختراع أرقام.
استخدم فقط البيانات والأدوات المرفقة.
أعد الإجابة بصيغة JSON فقط حسب المخطط التالي:
${JSON.stringify(MANDATORY_SCHEMA)}

قواعد مهمة:
- لا تخترع أرقامًا غير موجودة في البيانات
- استخدم فقط المصادر المتاحة في POLICIES و TOOLS
- اذكر مصادرك بوضوح في حقل sources
- قيّم ثقتك بدقة في حقل confidence`;

    const userPrompt = `[POLICIES]
${policyText || "لا توجد سياسات متاحة"}

[TOOLS]
${JSON.stringify(toolData)}

[USER_PROMPT]
${prompt}`;

    // Call Lovable AI
    const response = await callLovableAI(MODEL_COMPLEX, [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt }
    ]);

    const raw = response.choices[0].message.content;
    let parsed: any;
    
    try {
      parsed = JSON.parse(raw);
    } catch {
      throw new Error("LLM did not return valid JSON");
    }

    // Validate schema
    const [ok, errs] = schemaValidate(parsed);
    if (!ok) throw new Error(`Schema invalid: ${errs.join(", ")}`);

    // Check for numeric hallucination
    const nums = extractNumbers(parsed.advice ?? "");
    const safeNums = extractNumbers(JSON.stringify(toolData));
    const invented = nums.filter(n => !safeNums.includes(n));
    
    if (invented.length > 0) {
      console.warn("Possible numeric hallucination detected:", invented);
    }

    // Save recommendation
    await admin.from("recommendations").insert({
      user_id,
      advice_text: parsed.advice,
      actions_array: JSON.stringify(parsed.actions ?? []),
      rationale_text: parsed.rationale,
      sources_json: parsed.sources ?? [],
      confidence: parsed.confidence ?? 0.6,
      impacts_json: parsed.impacts ?? {}
    });

    // Cache result
    await putCache(admin, cacheKey, user_id, parsed, 3600); // 1 hour

    // Log call
    const tokensIn = response.usage?.prompt_tokens ?? 0;
    const tokensOut = response.usage?.completion_tokens ?? 0;
    const cost = ((tokensIn + tokensOut) / 1000) * COST_PER_1K;
    
    await logCall(admin, user_id, "orchestrator", MODEL_COMPLEX, tokensIn, tokensOut, cost, false, t0);
    await incrementQuota(admin, user_id);

    return new Response(JSON.stringify({ ok: true, data: parsed }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200
    });

  } catch (e) {
    console.error("Orchestrator error:", e);
    return new Response(JSON.stringify({ ok: false, error: String(e) }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: e instanceof Error && e.message.includes("quota") ? 429 : 400
    });
  }
});

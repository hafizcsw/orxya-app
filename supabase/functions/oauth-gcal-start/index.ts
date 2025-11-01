import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const json = (b:any,s=200)=>new Response(JSON.stringify(b),{status:s,headers:{
  "content-type":"application/json",...corsHeaders
}});

async function sha256(b:string){
  const d=new TextEncoder().encode(b);
  const h=await crypto.subtle.digest("SHA-256",d);
  return btoa(String.fromCharCode(...new Uint8Array(h)))
    .replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/,"");
}

Deno.serve(async (req)=>{
  if (req.method==="OPTIONS") return new Response(null, { headers: corsHeaders });
  
  const supabaseUrl=Deno.env.get("SUPABASE_URL")!;
  const supabaseAnonKey=Deno.env.get("SUPABASE_ANON_KEY")!;
  const authHeader=req.headers.get("Authorization") ?? "";
  const supabase=createClient(supabaseUrl,supabaseAnonKey,{
    global:{headers:{Authorization:authHeader}}
  });

  const { data:{ user } } = await supabase.auth.getUser();
  if (!user) return json({ ok:false, error:"UNAUTHENTICATED" }, 401);

  const clientId=Deno.env.get("GOOGLE_CLIENT_ID")!;
  const redirectUri=Deno.env.get("GOOGLE_REDIRECT_URI")!;
  const scope=encodeURIComponent([
    "https://www.googleapis.com/auth/calendar.readonly"
  ].join(" "));

  const codeVerifier=crypto.randomUUID()+crypto.randomUUID();
  const codeChallenge=await sha256(codeVerifier);
  const state=crypto.randomUUID();

  await supabase.from("external_accounts").upsert({
    owner_id: user.id, 
    provider: "google",
    status: "pending",
    scopes: JSON.stringify({ state, codeVerifier }),
    updated_at: new Date().toISOString()
  }, { onConflict: "owner_id,provider" });

  const url=`https://accounts.google.com/o/oauth2/v2/auth?response_type=code&client_id=${encodeURIComponent(clientId)}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${scope}&access_type=offline&include_granted_scopes=true&state=${state}&code_challenge=${codeChallenge}&code_challenge_method=S256&prompt=consent`;

  return json({ ok:true, url });
});

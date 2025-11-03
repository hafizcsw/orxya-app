export async function getKey(): Promise<CryptoKey> {
  // Prefer vault secret, fallback to environment variable for backwards compatibility
  let keyString = Deno.env.get("TOKEN_ENC_KEY");
  
  // TODO: When vault is fully migrated, use this instead:
  // const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2.38.4');
  // const supabase = createClient(
  //   Deno.env.get('SUPABASE_URL')!,
  //   Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  // );
  // const { data } = await supabase.rpc('get_encryption_key');
  // keyString = data;
  
  if (!keyString) {
    throw new Error("Encryption key not found in environment or vault");
  }
  
  const raw = new TextEncoder().encode(keyString);
  return await crypto.subtle.importKey("raw", raw, "AES-GCM", false, ["encrypt","decrypt"]);
}

export async function encryptJson(obj: unknown): Promise<string> {
  const key = await getKey();
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const data = new TextEncoder().encode(JSON.stringify(obj));
  const ct = await crypto.subtle.encrypt({name:"AES-GCM", iv}, key, data);
  const b64 = btoa(String.fromCharCode(...new Uint8Array(ct)));
  const ivb = btoa(String.fromCharCode(...iv));
  return `${ivb}.${b64}`;
}

export async function decryptJson(blob: string): Promise<any> {
  const [ivb, b64] = blob.split(".");
  const key = await getKey();
  const iv = new Uint8Array(atob(ivb).split("").map(c=>c.charCodeAt(0)));
  const ct = new Uint8Array(atob(b64).split("").map(c=>c.charCodeAt(0)));
  const pt = await crypto.subtle.decrypt({name:"AES-GCM", iv}, key, ct);
  return JSON.parse(new TextDecoder().decode(new Uint8Array(pt)));
}

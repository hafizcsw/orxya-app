export async function getKey(): Promise<CryptoKey> {
  const raw = new TextEncoder().encode(Deno.env.get("TOKEN_ENC_KEY")!);
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

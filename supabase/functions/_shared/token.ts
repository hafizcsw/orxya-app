import { decryptJson } from "./crypto.ts";

export async function decryptToken(enc: string): Promise<string> {
  const obj = await decryptJson(enc);
  return obj.token ?? "";
}

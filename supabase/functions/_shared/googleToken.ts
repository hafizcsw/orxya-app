import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

export async function getAccessTokenForUser(
  supabaseAdmin: SupabaseClient,
  user_id: string
): Promise<string> {
  // استرجاع refresh_token المشفّر
  const { data: account, error } = await supabaseAdmin
    .from("external_accounts")
    .select("refresh_token_enc")
    .eq("owner_id", user_id)
    .eq("provider", "google")
    .maybeSingle();

  if (error || !account?.refresh_token_enc) {
    throw new Error("No Google account connected");
  }

  // فك التشفير (نفترض أن التشفير تم بالفعل، وإلا استخدم pgp_sym_decrypt)
  const refreshToken = account.refresh_token_enc;

  // تبديل refresh_token بـ access_token
  const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: Deno.env.get("GOOGLE_CLIENT_ID")!,
      client_secret: Deno.env.get("GOOGLE_CLIENT_SECRET")!,
      grant_type: "refresh_token",
      refresh_token: refreshToken,
    }),
  });

  if (!tokenResponse.ok) {
    const error = await tokenResponse.text();
    throw new Error(`Failed to refresh token: ${error}`);
  }

  const tokens = await tokenResponse.json();
  return tokens.access_token as string;
}

export async function listGoogleCalendars(accessToken: string): Promise<string[]> {
  const response = await fetch(
    "https://www.googleapis.com/calendar/v3/users/me/calendarList",
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    }
  );

  if (!response.ok) {
    throw new Error(await response.text());
  }

  const data = await response.json();
  return (data.items ?? []).map((cal: any) => cal.id as string);
}

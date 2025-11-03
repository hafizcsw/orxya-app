// Epic 9: Privacy Client - Export/Delete requests
import { supabase } from "@/integrations/supabase/client";

export interface PrivacyPrefs {
  health_enabled: boolean;
  calendar_enabled: boolean;
  notif_fin_enabled: boolean;
  location_enabled: boolean;
  pause_all: boolean;
  retention_days: number;
}

export interface ExportResponse {
  ok: boolean;
  url?: string;
  expires_in?: string;
}

export interface DeleteResponse {
  ok: boolean;
  message: string;
  status: string;
}

export async function getPrivacyPrefs(): Promise<PrivacyPrefs | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .rpc("get_privacy_prefs", { p_user_id: user.id }) as any;

  if (error) {
    console.error("Failed to fetch privacy prefs:", error);
    return null;
  }

  return data?.[0] || null;
}

export async function updatePrivacyPrefs(prefs: Partial<PrivacyPrefs>): Promise<boolean> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;

  const { error } = await supabase.rpc("update_privacy_prefs", {
    p_user_id: user.id,
    p_prefs: prefs as any
  });

  if (error) {
    console.error("Failed to update privacy prefs:", error);
    return false;
  }

  // Log audit
  const action = prefs.pause_all !== undefined 
    ? (prefs.pause_all ? "pause_all_on" : "pause_all_off")
    : "toggle_on";

  await supabase.rpc("log_privacy_audit", {
    p_user_id: user.id,
    p_action: action,
    p_meta: prefs as any
  });

  return true;
}

export async function requestExport(): Promise<ExportResponse> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error("Not authenticated");

  const { data, error } = await supabase.functions.invoke("privacy-export", {
    headers: {
      Authorization: `Bearer ${session.access_token}`
    }
  });

  if (error) throw error;
  return data as ExportResponse;
}

export async function requestDelete(): Promise<DeleteResponse> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error("Not authenticated");

  const { data, error } = await supabase.functions.invoke("privacy-delete-request", {
    headers: {
      Authorization: `Bearer ${session.access_token}`
    }
  });

  if (error) throw error;
  return data as DeleteResponse;
}

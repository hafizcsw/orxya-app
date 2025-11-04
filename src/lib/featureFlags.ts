import { supabase } from "@/integrations/supabase/client";

/**
 * Get user-specific feature flags
 */
export async function getUserFlags(): Promise<Record<string, boolean>> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return {};

    const { data, error } = await supabase.rpc('get_user_flags', {
      p_user_id: session.user.id
    }) as { data: any, error: any };

    if (error) {
      console.error('[getUserFlags] Error:', error);
      return {};
    }

    // Parse the JSONB result into a record
    if (data && typeof data === 'object') {
      return data as Record<string, boolean>;
    }

    return {};
  } catch (e) {
    console.error('[getUserFlags] Exception:', e);
    return {};
  }
}

/**
 * Set a user-specific feature flag
 */
export async function setUserFlag(key: string, value: boolean): Promise<boolean> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return false;

    const { error } = await supabase.rpc('set_user_flag', {
      p_user_id: session.user.id,
      p_key: key,
      p_value: value
    });

    if (error) {
      console.error('[setUserFlag] Error:', error);
      return false;
    }

    return true;
  } catch (e) {
    console.error('[setUserFlag] Exception:', e);
    return false;
  }
}

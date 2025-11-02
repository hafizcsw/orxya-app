import { supabase } from "@/integrations/supabase/client";
import { track } from "./telemetry";

/**
 * Triggers a conflict check for today and tomorrow
 */
export async function conflictCheckToday(): Promise<void> {
  try {
    const { data, error } = await supabase.functions.invoke('conflict-check', {
      body: {}
    });

    if (error) throw error;

    track('conflict_check_run', {
      created: data?.created ?? 0,
      updated: data?.updated ?? 0
    });

    console.log('[Conflicts] Check completed:', data);
  } catch (e) {
    console.error('[Conflicts] Check failed:', e);
    track('conflict_check_error', { error: String(e) });
  }
}

/**
 * Fetches open conflicts for a specific date
 */
export async function getConflictsForDate(dateISO: string) {
  try {
    const { data, error } = await supabase
      .from('conflicts')
      .select('*')
      .eq('date_iso', dateISO)
      .eq('status', 'open')
      .order('prayer_start', { ascending: true });

    if (error) throw error;
    return data ?? [];
  } catch (e) {
    console.error('[Conflicts] Failed to fetch:', e);
    return [];
  }
}

/**
 * Resolves a conflict by ID
 */
export async function resolveConflict(conflictId: string, resolution: string) {
  try {
    const { error } = await supabase
      .from('conflicts')
      .update({
        status: 'resolved',
        resolution,
        updated_at: new Date().toISOString()
      })
      .eq('id', conflictId);

    if (error) throw error;

    track('conflict_resolved', { resolution });
    console.log('[Conflicts] Resolved:', conflictId);
  } catch (e) {
    console.error('[Conflicts] Failed to resolve:', e);
    throw e;
  }
}

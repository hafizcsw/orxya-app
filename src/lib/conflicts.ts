import { supabase } from "@/integrations/supabase/client";
import { track } from "./telemetry";

/**
 * Triggers a conflict check for today and tomorrow
 */
const COOLDOWN_KEY = 'conflict_check_last_run';
const COOLDOWN_PERIOD = 5 * 60 * 1000; // 5 minutes

/**
 * Check if enough time has passed since last check
 */
function canRunCheck(): boolean {
  const lastRun = localStorage.getItem(COOLDOWN_KEY);
  if (!lastRun) return true;
  
  const elapsed = Date.now() - parseInt(lastRun);
  return elapsed > COOLDOWN_PERIOD;
}

export async function conflictCheckToday(): Promise<void> {
  // Check cooldown
  if (!canRunCheck()) {
    console.log('[Conflicts] Skipping check - cooldown period active');
    return;
  }

  try {
    // Shorter timeout - 5 seconds
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    const { data, error } = await supabase.functions.invoke('conflict-check', {
      body: {},
      headers: {
        signal: controller.signal as any
      }
    });

    clearTimeout(timeoutId);

    if (error) {
      // Silently fail on network errors
      if (error.message?.includes('Failed to send') || error.message?.includes('timeout')) {
        console.warn('[Conflicts] Check temporarily unavailable:', error.message);
        return;
      }
      throw error;
    }

    // Update last run timestamp
    localStorage.setItem(COOLDOWN_KEY, Date.now().toString());

    track('conflict_check_run', {
      created: data?.created ?? 0,
      updated: data?.updated ?? 0
    });

    console.log('[Conflicts] Check completed:', data);
  } catch (e: any) {
    if (e.name === 'AbortError') {
      console.warn('[Conflicts] Check timed out');
    } else {
      console.error('[Conflicts] Check failed:', e);
    }
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

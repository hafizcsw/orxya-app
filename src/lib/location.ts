import { supabase } from '@/integrations/supabase/client';

/**
 * Push location sample to backend
 * Triggers prayer sync if user moved >= 0.7km
 */
export async function pushLocationSample(
  lat: number,
  lon: number,
  accuracy?: number
): Promise<{ ok: boolean; saved: boolean; moved_km: number; did_sync: boolean }> {
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
  
  const { data, error } = await supabase.functions.invoke('location-update', {
    body: { lat, lon, accuracy, source: 'web', timezone: tz },
  });

  if (error) {
    console.error('Location update failed:', error);
    throw error;
  }

  return data;
}

/**
 * Check conflicts between events and prayer times
 * @param opts.days - Number of days to check (default: 7, max: 31)
 * @param opts.buffer_min - Prayer buffer in minutes (default: 30)
 * @param opts.upsert - Whether to save conflicts to DB (default: true)
 * @param opts.timezone - Override timezone (default: from profile)
 */
export async function runConflictCheck(opts?: {
  days?: number;
  buffer_min?: number;
  upsert?: boolean;
  timezone?: string;
  from?: string;
  to?: string;
}): Promise<{ ok: boolean; count: number; conflicts: any[] }> {
  const { data, error } = await supabase.functions.invoke('conflict-check', {
    body: {
      days: 7,
      buffer_min: 30,
      upsert: true,
      ...(opts ?? {}),
    },
  });

  if (error) {
    console.error('Conflict check failed:', error);
    throw error;
  }

  return data;
}

/**
 * Get user's current conflicts from DB
 */
export async function getConflicts(dateFrom?: string, dateTo?: string) {
  let query = supabase
    .from('conflicts')
    .select('*')
    .eq('status', 'open')
    .order('date_iso', { ascending: true });

  if (dateFrom) {
    query = query.gte('date_iso', dateFrom);
  }

  if (dateTo) {
    query = query.lte('date_iso', dateTo);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Failed to fetch conflicts:', error);
    throw error;
  }

  return data ?? [];
}

/**
 * Resolve a conflict by ID
 */
export async function resolveConflict(conflictId: string, resolution: string) {
  const { error } = await supabase
    .from('conflicts')
    .update({ status: 'resolved', resolution })
    .eq('id', conflictId);

  if (error) {
    console.error('Failed to resolve conflict:', error);
    throw error;
  }
}

/**
 * Dismiss a conflict
 */
export async function dismissConflict(conflictId: string) {
  const { error } = await supabase
    .from('conflicts')
    .update({ status: 'dismissed' })
    .eq('id', conflictId);

  if (error) {
    console.error('Failed to dismiss conflict:', error);
    throw error;
  }
}

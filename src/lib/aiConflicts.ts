import { supabase } from "@/integrations/supabase/client";

export type AISuggestion = {
  action: "move_event" | "shorten_event" | "cancel_event";
  new_start?: string;
  new_end?: string;
  shift_minutes?: number;
  reasoning?: string;
  confidence?: number;
  notify_participants?: boolean;
  message_to_participants?: string | null;
  alternatives?: Array<{
    action: string;
    new_start?: string;
    new_end?: string;
    reasoning?: string;
    confidence?: number;
  }>;
};

/**
 * Request AI suggestion for a conflict
 */
export async function requestAISuggestion(conflictId: string): Promise<AISuggestion | null> {
  try {
    const { data, error } = await supabase.functions.invoke('ai-conflicts', {
      body: { conflict_id: conflictId }
    });

    if (error || !data?.ok) {
      throw error ?? new Error('AI request failed');
    }

    return data.suggestion as AISuggestion;
  } catch (e) {
    console.error('AI suggestion error:', e);
    return null;
  }
}

/**
 * Check if event overlaps with prayer time (±20 min buffer)
 */
export function checkPrayerConflict(
  eventStart: string,
  eventEnd: string,
  prayers: { fajr?: string; dhuhr?: string; asr?: string; maghrib?: string; isha?: string } | null
): boolean {
  if (!prayers) return false;

  const evStart = new Date(eventStart).getTime();
  const evEnd = new Date(eventEnd).getTime();
  const buffer = 20 * 60 * 1000; // 20 minutes in ms

  const prayerTimes = Object.values(prayers).filter(Boolean);
  
  for (const prayerTime of prayerTimes) {
    if (!prayerTime) continue;
    
    // Construct full datetime from prayer time (HH:MM)
    const [hh, mm] = prayerTime.split(':').map(Number);
    const prayerDate = new Date(eventStart);
    prayerDate.setHours(hh, mm, 0, 0);
    const prayerMs = prayerDate.getTime();
    
    // Check if event overlaps with prayer window (±20 min)
    if (
      (evStart <= prayerMs + buffer && evEnd >= prayerMs - buffer) ||
      (evStart >= prayerMs - buffer && evStart <= prayerMs + buffer)
    ) {
      return true;
    }
  }

  return false;
}

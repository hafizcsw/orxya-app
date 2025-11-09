import dayjs from 'dayjs';
import { supabase } from '@/integrations/supabase/client';

export type AIInsights = {
  focusScore: number;
  energyLevel: 'low' | 'medium' | 'high';
  suggestions: string[];
  warnings: string[];
  model_version?: string;
};

const TTL_MS = 30 * 60 * 1000; // 30 minutes
const mem = new Map<string, { ts: number; data: AIInsights }>();

function lsKey(dateISO: string) {
  return `ai-insights-${dateISO}`;
}

export async function fetchAIInsights(dateISO?: string): Promise<AIInsights> {
  const day = dateISO ?? dayjs().format('YYYY-MM-DD');
  const key = `ai:${day}`;

  // 1) Memory cache
  const hit = mem.get(key);
  if (hit && Date.now() - hit.ts < TTL_MS) return hit.data;

  // 2) Offline cache
  try {
    const raw = localStorage.getItem(lsKey(day));
    if (raw) {
      const parsed = JSON.parse(raw) as { ts: number; data: AIInsights };
      if (Date.now() - parsed.ts < TTL_MS) {
        mem.set(key, { ts: parsed.ts, data: parsed.data });
        return parsed.data;
      }
    }
  } catch {}

  // 3) Network call (Edge Function)
  const { data: sessionData } = await supabase.auth.getSession();
  if (!sessionData?.session) throw new Error('No active session');

  const { data, error } = await supabase.functions.invoke('today-ai-insights', {
    body: { date: day },
  });

  if (error) throw error;

  const insights = data as AIInsights;

  // 4) Save caches
  const record = { ts: Date.now(), data: insights };
  mem.set(key, record);
  try {
    localStorage.setItem(lsKey(day), JSON.stringify(record));
  } catch {}

  return insights;
}

// Invalidate cache when related data changes
export function invalidateAIInsights(dateISO?: string) {
  const day = dateISO ?? dayjs().format('YYYY-MM-DD');
  mem.delete(`ai:${day}`);
  try {
    localStorage.removeItem(lsKey(day));
  } catch {}
}

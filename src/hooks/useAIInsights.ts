import { useEffect, useState } from 'react';
import dayjs from 'dayjs';
import { AIInsights, fetchAIInsights } from '@/lib/ai-insights';

export function useAIInsights(date?: string) {
  const [insights, setInsights] = useState<AIInsights | null>(null);
  const [loading, setLoading] = useState(false);
  const d = date ?? dayjs().format('YYYY-MM-DD');

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      try {
        const x = await fetchAIInsights(d);
        if (alive) setInsights(x);
      } catch (e: any) {
        console.error('[useAIInsights]', e);
        if (alive) setInsights(null);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [d]);

  return { insights, loading };
}

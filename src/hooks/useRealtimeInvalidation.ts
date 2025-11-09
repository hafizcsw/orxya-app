import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { invalidateAIInsights } from '@/lib/ai-insights';

/**
 * Hook to invalidate AI insights cache when related data changes
 */
export function useRealtimeInvalidation() {
  useEffect(() => {
    const channel = supabase
      .channel('ai-cache-invalidation')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'signals_daily' },
        () => {
          console.log('[Realtime] signals_daily changed - invalidating AI cache');
          invalidateAIInsights();
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'events' },
        () => {
          console.log('[Realtime] events changed - invalidating AI cache');
          invalidateAIInsights();
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'financial_events' },
        () => {
          console.log('[Realtime] financial_events changed - invalidating AI cache');
          invalidateAIInsights();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);
}

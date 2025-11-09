import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { invalidateAIInsights } from '@/lib/ai-insights';
import { TodayDataManager } from '@/lib/today-data-manager';

/**
 * Hook to invalidate caches when related data changes
 * Handles: AI insights, health, finance, activities
 */
export function useRealtimeInvalidation() {
  useEffect(() => {
    const channel = supabase
      .channel('today-cache-invalidation')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'signals_daily' },
        () => {
          console.log('[Realtime] signals_daily changed - invalidating caches');
          invalidateAIInsights();
          TodayDataManager.clearPrefix('health');
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'events' },
        () => {
          console.log('[Realtime] events changed - invalidating caches');
          invalidateAIInsights();
          TodayDataManager.clearPrefix('activities');
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'financial_events' },
        () => {
          console.log('[Realtime] financial_events changed - invalidating caches');
          invalidateAIInsights();
          TodayDataManager.clearPrefix('finance');
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);
}

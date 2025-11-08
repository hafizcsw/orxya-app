import { useState, useEffect, useCallback, useRef } from 'react';
import { TodayDataManager, AIInsights } from '@/lib/today-data-manager';
import { useDebounce } from './useDebounce';
import { NetworkResilience } from '@/lib/network-resilience';

export function useAIInsights(
  currentTask: any,
  health: any,
  activities: any,
  upcomingEvents: any[]
) {
  const [insights, setInsights] = useState<AIInsights | null>(null);
  const [loading, setLoading] = useState(false);
  const fetchTimeoutRef = useRef<NodeJS.Timeout>();
  const lastFetchRef = useRef<number>(0);

  const fetchInsights = useCallback(async () => {
    // Debounce: prevent fetching more than once per 30 seconds
    const now = Date.now();
    if (now - lastFetchRef.current < 30000) {
      console.log('[useAIInsights] Skipping fetch - too soon');
      return;
    }
    
    lastFetchRef.current = now;
    setLoading(true);
    
    try {
      const data = await NetworkResilience.executeWithRetry(
        () => TodayDataManager.fetchAIInsights(
          currentTask,
          health,
          activities,
          upcomingEvents || []
        ),
        {
          maxRetries: 2,
          fallback: () => ({
            focusScore: 50,
            energyLevel: 'medium' as const,
            suggestions: ['البيانات غير متوفرة - يتم استخدام البيانات المخزنة'],
            warnings: [],
            isOffline: true
          })
        }
      );
      setInsights(data);
    } catch (error) {
      console.error('Error fetching AI insights:', error);
      setInsights({
        focusScore: 50,
        energyLevel: 'medium',
        suggestions: [],
        warnings: [],
        isOffline: true
      });
    } finally {
      setLoading(false);
    }
  }, [currentTask?.id, health?.recovery, activities, upcomingEvents]);

  // Debounced version
  const debouncedFetch = useDebounce(fetchInsights, 2000);

  // Fetch on mount and periodically
  useEffect(() => {
    // Initial fetch with delay
    fetchTimeoutRef.current = setTimeout(fetchInsights, 1000);
    
    // Refresh every 30 minutes instead of every hour
    const interval = setInterval(fetchInsights, 30 * 60 * 1000);
    
    return () => {
      if (fetchTimeoutRef.current) clearTimeout(fetchTimeoutRef.current);
      clearInterval(interval);
    };
  }, []);

  return {
    insights,
    loading,
    refetch: debouncedFetch
  };
}

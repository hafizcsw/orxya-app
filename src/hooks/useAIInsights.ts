import { useState, useEffect, useCallback, useRef } from 'react';
import { TodayDataManager, AIInsights } from '@/lib/today-data-manager';
import { NetworkResilience } from '@/lib/network-resilience';

// Simple debounce implementation to avoid dependency issues
function useDebounceValue<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

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

  // Debounce dependencies to prevent rapid refetches
  const debouncedCurrentTaskId = useDebounceValue(currentTask?.id, 1000);
  const debouncedRecovery = useDebounceValue(health?.recovery, 1000);

  useEffect(() => {
    // Clear any pending timeout
    if (fetchTimeoutRef.current) {
      clearTimeout(fetchTimeoutRef.current);
    }

    // Schedule fetch with delay
    fetchTimeoutRef.current = setTimeout(() => {
      if (debouncedCurrentTaskId || debouncedRecovery !== undefined) {
        fetchInsights();
      }
    }, 500);

    return () => {
      if (fetchTimeoutRef.current) {
        clearTimeout(fetchTimeoutRef.current);
      }
    };
  }, [debouncedCurrentTaskId, debouncedRecovery, fetchInsights]);

  return { insights, loading };
}

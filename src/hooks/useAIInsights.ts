import { useState, useEffect } from 'react';
import { TodayDataManager, AIInsights } from '@/lib/today-data-manager';

// AIInsights type is now imported from today-data-manager

export function useAIInsights(
  currentTask: any,
  health: any,
  activities: any,
  upcomingEvents: any[]
) {
  const [insights, setInsights] = useState<AIInsights | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchInsights = async () => {
    if (!currentTask && !health && !activities) return;
    
    setLoading(true);
    try {
      const data = await TodayDataManager.fetchAIInsights(
        currentTask,
        health,
        activities,
        upcomingEvents || []
      );
      setInsights(data);
    } catch (error) {
      console.error('Error fetching AI insights:', error);
      // Set default insights on error
      setInsights({
        focusScore: 50,
        energyLevel: 'medium',
        suggestions: [],
        warnings: []
      });
    } finally {
      setLoading(false);
    }
  };

  // Fetch insights on mount and every hour
  useEffect(() => {
    fetchInsights();
    
    const interval = setInterval(fetchInsights, 60 * 60 * 1000); // Every hour
    
    return () => clearInterval(interval);
  }, [currentTask?.id, health?.recovery]);

  return {
    insights,
    loading,
    refetch: fetchInsights
  };
}

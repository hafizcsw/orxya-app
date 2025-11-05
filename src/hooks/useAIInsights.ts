import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface AIInsights {
  focusScore: number;
  energyLevel: 'low' | 'medium' | 'high';
  suggestions: string[];
  warnings: string[];
}

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
      const { data, error } = await supabase.functions.invoke('today-ai-insights', {
        body: {
          currentTask,
          health,
          activities,
          upcomingEvents: upcomingEvents?.slice(0, 5) || []
        }
      });

      if (error) throw error;
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

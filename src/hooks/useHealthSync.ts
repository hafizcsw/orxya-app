import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface HealthMetrics {
  steps?: number;
  sleepMinutes?: number;
  hrvZ?: number;
  date: string;
}

export function useHealthSync(date?: Date) {
  const [user, setUser] = useState<any>(null);
  const [metrics, setMetrics] = useState<HealthMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user));
  }, []);

  useEffect(() => {
    if (!user?.id) {
      setLoading(false);
      return;
    }

    const targetDate = date || new Date();
    const dateStr = targetDate.toISOString().split('T')[0];

    const fetchMetrics = async () => {
      try {
        setLoading(true);
        
        // Note: This requires the signals_daily table to exist
        // For now, we return empty metrics as placeholder
        const metricsMap: HealthMetrics = { date: dateStr };

        setMetrics(metricsMap);
        setError(null);
      } catch (err) {
        console.error('Error fetching health metrics:', err);
        setError(err instanceof Error ? err.message : 'Unknown error');
        setMetrics(null);
      } finally {
        setLoading(false);
      }
    };

    fetchMetrics();
  }, [user?.id, date]);

  return { metrics, loading, error };
}

export async function triggerETL() {
  try {
    const { data, error } = await supabase.functions.invoke('etl-health-daily');
    
    if (error) throw error;
    
    return data;
  } catch (err) {
    console.error('Error triggering ETL:', err);
    throw err;
  }
}

import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import dayjs from 'dayjs';
import { 
  calculateRecovery, 
  calculateStrain, 
  calculateSleepScore, 
  calculateActivityScore,
  calculateTrend,
  type HealthMetrics,
  type TrendData 
} from "@/lib/health-calculations";
import type { Period } from "./useTodayReport";

export interface HealthDataWithTrends extends HealthMetrics {
  recoveryTrend: TrendData;
  strainTrend: TrendData;
  sleepTrend: TrendData;
  activityTrend: TrendData;
  steps: number;
  meters: number;
  sleepMinutes: number;
  hrAvg: number;
  hrMax: number;
  baseline_days_collected?: number; // NEW: عدد أيام HRV الـ14
}

export function useHealthData(period: Period, selectedDate: Date) {
  const [healthData, setHealthData] = useState<HealthDataWithTrends | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchHealthData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("No user");

      // Calculate date range based on period
      const endDate = new Date(selectedDate);
      const startDate = new Date(selectedDate);
      
      switch (period) {
        case 'daily':
          // Just the selected day
          break;
        case 'weekly':
          startDate.setDate(endDate.getDate() - 6);
          break;
        case 'monthly':
          startDate.setDate(endDate.getDate() - 29);
          break;
        case 'yearly':
          startDate.setDate(endDate.getDate() - 364);
          break;
      }

      const startDateStr = startDate.toISOString().split('T')[0];
      const endDateStr = endDate.toISOString().split('T')[0];

      // Fetch current period data from signals_daily (NEW)
      const { data: currentData, error: currentError } = await supabase
        .from('signals_daily')
        .select('*')
        .eq('user_id', user.id)
        .gte('date', startDateStr)
        .lte('date', endDateStr)
        .order('date', { ascending: false });

      if (currentError) throw currentError;

      // Fetch previous period data for trends
      const prevEndDate = new Date(startDate);
      prevEndDate.setDate(prevEndDate.getDate() - 1);
      const prevStartDate = new Date(prevEndDate);
      
      switch (period) {
        case 'daily':
          prevStartDate.setDate(prevEndDate.getDate());
          break;
        case 'weekly':
          prevStartDate.setDate(prevEndDate.getDate() - 6);
          break;
        case 'monthly':
          prevStartDate.setDate(prevEndDate.getDate() - 29);
          break;
        case 'yearly':
          prevStartDate.setDate(prevEndDate.getDate() - 364);
          break;
      }

      const { data: prevData } = await supabase
        .from('signals_daily')
        .select('*')
        .eq('user_id', user.id)
        .gte('date', prevStartDate.toISOString().split('T')[0])
        .lte('date', prevEndDate.toISOString().split('T')[0]);

      // Aggregate current period data
      const current = aggregateHealthData(currentData || []);
      const previous = aggregateHealthData(prevData || []);

      // Calculate metrics
      const recovery = calculateRecovery(current.sleepMinutes, current.hrAvg);
      const strain = calculateStrain(current.hrAvg, current.hrMax, current.steps, current.meters);
      const sleep = calculateSleepScore(current.sleepMinutes);
      const activity = calculateActivityScore(current.steps, current.meters);

      const prevRecovery = calculateRecovery(previous.sleepMinutes, previous.hrAvg);
      const prevStrain = calculateStrain(previous.hrAvg, previous.hrMax, previous.steps, previous.meters);
      const prevSleep = calculateSleepScore(previous.sleepMinutes);
      const prevActivity = calculateActivityScore(previous.steps, previous.meters);

      // NEW: Fetch baseline_days_collected from signals_daily
      const since14 = dayjs(endDateStr).subtract(14, 'day').format('YYYY-MM-DD');
      const { data: d14 } = await supabase
        .from('signals_daily')
        .select('hrv_z, date')
        .eq('user_id', user.id)
        .gte('date', since14)
        .lte('date', endDateStr);
      
      const baseline_days_collected = (d14 ?? []).filter(r => r.hrv_z !== null && r.hrv_z !== undefined).length;

      setHealthData({
        recovery,
        strain,
        sleep,
        activity,
        recoveryTrend: calculateTrend(recovery, prevRecovery),
        strainTrend: calculateTrend(strain, prevStrain),
        sleepTrend: calculateTrend(sleep, prevSleep),
        activityTrend: calculateTrend(activity, prevActivity),
        steps: current.steps,
        meters: current.meters,
        sleepMinutes: current.sleepMinutes,
        hrAvg: current.hrAvg,
        hrMax: current.hrMax,
        baseline_days_collected, // NEW
      });
    } catch (err) {
      console.error("Error fetching health data:", err);
      setError(err instanceof Error ? err : new Error("Unknown error"));
      
      // Set default values on error
      setHealthData({
        recovery: 0,
        strain: 0,
        sleep: 0,
        activity: 0,
        recoveryTrend: { direction: 'neutral', percentage: 0 },
        strainTrend: { direction: 'neutral', percentage: 0 },
        sleepTrend: { direction: 'neutral', percentage: 0 },
        activityTrend: { direction: 'neutral', percentage: 0 },
        steps: 0,
        meters: 0,
        sleepMinutes: 0,
        hrAvg: 0,
        hrMax: 0,
        baseline_days_collected: 0, // NEW
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHealthData();
  }, [period, selectedDate]);

  return { healthData, loading, error, refetch: fetchHealthData };
}

function aggregateHealthData(data: any[]) {
  if (!data || data.length === 0) {
    return {
      steps: 0,
      meters: 0,
      hrAvg: 60,
      hrMax: 100,
      sleepMinutes: 0,
    };
  }

  // For daily, just use the first (most recent) record
  if (data.length === 1) {
    return {
      steps: data[0].steps || 0,
      meters: data[0].meters || 0,
      hrAvg: data[0].hr_avg || 60,
      hrMax: data[0].hr_max || 100,
      sleepMinutes: data[0].sleep_minutes || 0,
    };
  }

  // For longer periods, calculate averages/totals
  const totalSteps = data.reduce((sum, d) => sum + (d.steps || 0), 0);
  const totalMeters = data.reduce((sum, d) => sum + (d.meters || 0), 0);
  const avgHR = Math.round(data.reduce((sum, d) => sum + (d.hr_avg || 60), 0) / data.length);
  const maxHR = Math.max(...data.map(d => d.hr_max || 100));
  const avgSleep = Math.round(data.reduce((sum, d) => sum + (d.sleep_minutes || 0), 0) / data.length);

  return {
    steps: totalSteps,
    meters: totalMeters,
    hrAvg: avgHR,
    hrMax: maxHR,
    sleepMinutes: avgSleep,
  };
}

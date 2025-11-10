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
  const [error, setError] = useState<string | null>(null);

  const fetchHealthData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.error('[useHealthData] No user');
        setError('لا يوجد مستخدم مسجل');
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
          baseline_days_collected: 0,
        });
        return;
      }

      const dateStr = selectedDate.toISOString().split('T')[0];

      // القراءة من v_health_today للبيانات الحالية
      const { data: currentData, error: currentError } = await supabase
        .from('v_health_today')
        .select('recovery_percent, sleep_score, strain_score, walk_minutes, steps, meters, hr_avg, hr_max, sleep_minutes, hrv_z')
        .eq('date', dateStr)
        .maybeSingle();

      if (currentError) {
        console.error('[useHealthData] Current data error:', currentError);
      }

      // حساب baseline_days_collected
      const since14 = dayjs(dateStr).subtract(14, 'day').format('YYYY-MM-DD');
      const { data: d14 } = await supabase
        .from('signals_daily')
        .select('hrv_z, date')
        .eq('user_id', user.id)
        .gte('date', since14)
        .lte('date', dateStr);
      
      const baseline_days_collected = (d14 ?? []).filter(r => r.hrv_z !== null && r.hrv_z !== undefined).length;

      // استخدام القيم المباشرة من View
      const recovery = currentData?.recovery_percent ?? 0;
      const strain = currentData?.strain_score ?? 0;
      const sleep = currentData?.sleep_score ?? 0;
      const activity = calculateActivityScore(currentData?.steps ?? 0, currentData?.meters ?? 0);

      setHealthData({
        recovery,
        strain,
        sleep,
        activity,
        recoveryTrend: { direction: 'neutral', percentage: 0 }, // يمكن حسابها لاحقاً
        strainTrend: { direction: 'neutral', percentage: 0 },
        sleepTrend: { direction: 'neutral', percentage: 0 },
        activityTrend: { direction: 'neutral', percentage: 0 },
        steps: currentData?.steps ?? 0,
        meters: currentData?.meters ?? 0,
        sleepMinutes: currentData?.sleep_minutes ?? 0,
        hrAvg: currentData?.hr_avg ?? 60,
        hrMax: currentData?.hr_max ?? 100,
        baseline_days_collected,
      });
    } catch (err) {
      console.error('[useHealthData] error:', err);
      setError(err instanceof Error ? err.message : 'حدث خطأ غير متوقع');
      
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
        baseline_days_collected: 0,
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

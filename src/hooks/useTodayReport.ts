import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { calculateTrend, TrendData } from "@/lib/health-calculations";

export type Period = "daily" | "weekly" | "monthly" | "yearly";

export interface TodayReport {
  balance: number;
  income: number;
  expenses: number;
  study_hours: number;
  sports_hours: number;
  work_hours: number;
  walk_minutes: number;
  
  // Trends
  workTrend: TrendData;
  studyTrend: TrendData;
  sportsTrend: TrendData;
  incomeTrend: TrendData;
  expensesTrend: TrendData;
  balanceTrend: TrendData;
}

export function useTodayReport(period: Period, selectedDate: Date) {
  const [report, setReport] = useState<TodayReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchReport = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.error('[useTodayReport] No user');
        setError('لا يوجد مستخدم مسجل');
        setReport({
          balance: 0,
          income: 0,
          expenses: 0,
          study_hours: 0,
          sports_hours: 0,
          work_hours: 0,
          walk_minutes: 0,
          workTrend: { direction: 'neutral', percentage: 0 },
          studyTrend: { direction: 'neutral', percentage: 0 },
          sportsTrend: { direction: 'neutral', percentage: 0 },
          incomeTrend: { direction: 'neutral', percentage: 0 },
          expensesTrend: { direction: 'neutral', percentage: 0 },
          balanceTrend: { direction: 'neutral', percentage: 0 },
        });
        return;
      }

      const dateStr = selectedDate.toISOString().split('T')[0];

      // Fetch current period data from vw_today_activities
      const { data: currentActivity, error: activityError } = await supabase
        .from('vw_today_activities')
        .select('study_hours, sports_hours, work_hours, walk_minutes, day, user_id')
        .eq('user_id', user.id)
        .eq('day', dateStr)
        .maybeSingle();

      if (activityError) {
        console.error('[useTodayReport] Activity error:', activityError);
      }

      // Fetch previous period for trends
      const prevDate = new Date(selectedDate);
      prevDate.setDate(prevDate.getDate() - 1);
      const prevDateStr = prevDate.toISOString().split('T')[0];

      const { data: prevActivity } = await supabase
        .from('vw_today_activities')
        .select('study_hours, sports_hours, work_hours, walk_minutes, day, user_id')
        .eq('user_id', user.id)
        .eq('day', prevDateStr)
        .maybeSingle();

      // Fetch financial data from v_finance_today
      const { data: finData, error: finError } = await supabase
        .from('v_finance_today')
        .select('income, expenses, balance, income_trend_pct, expenses_trend_pct, balance_trend_pct')
        .eq('day', dateStr)
        .maybeSingle();

      if (finError) {
        console.error('[useTodayReport] Finance error:', finError);
      }

      const currentData = {
        balance: Number(finData?.balance || 0),
        income: Number(finData?.income || 0),
        expenses: Number(finData?.expenses || 0),
        study_hours: currentActivity?.study_hours || 0,
        sports_hours: currentActivity?.sports_hours || 0,
        work_hours: currentActivity?.work_hours || 0,
        walk_minutes: currentActivity?.walk_minutes || 0,
      };

      const { data: prevFinData } = await supabase
        .from('v_finance_today')
        .select('income, expenses, balance')
        .eq('day', prevDateStr)
        .maybeSingle();

      const previousData = {
        balance: Number(prevFinData?.balance || 0),
        income: Number(prevFinData?.income || 0),
        expenses: Number(prevFinData?.expenses || 0),
        study_hours: prevActivity?.study_hours || 0,
        sports_hours: prevActivity?.sports_hours || 0,
        work_hours: prevActivity?.work_hours || 0,
        walk_minutes: prevActivity?.walk_minutes || 0,
      };

      // Calculate trends
      const workTrend = calculateTrend(currentData.work_hours, previousData.work_hours);
      const studyTrend = calculateTrend(currentData.study_hours, previousData.study_hours);
      const sportsTrend = calculateTrend(currentData.sports_hours, previousData.sports_hours);
      const incomeTrend = calculateTrend(currentData.income, previousData.income);
      const expensesTrend = calculateTrend(currentData.expenses, previousData.expenses);
      const balanceTrend = calculateTrend(currentData.balance, previousData.balance);

      setReport({
        ...currentData,
        workTrend,
        studyTrend,
        sportsTrend,
        incomeTrend,
        expensesTrend,
        balanceTrend,
      });
    } catch (err) {
      console.error('[useTodayReport] error:', err);
      setError(err instanceof Error ? err.message : 'حدث خطأ غير متوقع');
      setReport({
        balance: 0,
        income: 0,
        expenses: 0,
        study_hours: 0,
        sports_hours: 0,
        work_hours: 0,
        walk_minutes: 0,
        workTrend: { direction: 'neutral', percentage: 0 },
        studyTrend: { direction: 'neutral', percentage: 0 },
        sportsTrend: { direction: 'neutral', percentage: 0 },
        incomeTrend: { direction: 'neutral', percentage: 0 },
        expensesTrend: { direction: 'neutral', percentage: 0 },
        balanceTrend: { direction: 'neutral', percentage: 0 },
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReport();
  }, [period, selectedDate]);

  return { report, loading, error, refetch: fetchReport };
}

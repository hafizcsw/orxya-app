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
  const [error, setError] = useState<Error | null>(null);

  const fetchReport = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("No user");

      // Current data (mock for now)
      const currentData = {
        balance: 5000,
        income: 1200,
        expenses: 450,
        study_hours: 3,
        sports_hours: 2,
        work_hours: 6,
        walk_minutes: 45,
      };

      // Previous period data (mock - in production, fetch from DB)
      const previousData = {
        balance: 4500,
        income: 1000,
        expenses: 500,
        study_hours: 2.5,
        sports_hours: 1.5,
        work_hours: 5,
        walk_minutes: 30,
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
      console.error("Error fetching report:", err);
      setError(err instanceof Error ? err : new Error("Unknown error"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReport();
  }, [period, selectedDate]);

  return { report, loading, error, refetch: fetchReport };
}

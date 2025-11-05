import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export type Period = "daily" | "weekly" | "monthly" | "yearly";

export interface TodayReport {
  balance: number;
  income: number;
  expenses: number;
  study_hours: number;
  sports_hours: number;
  work_hours: number;
  walk_minutes: number;
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

      // Mock data for now since get_daily_report doesn't exist yet
      setReport({
        balance: 5000,
        income: 1200,
        expenses: 450,
        study_hours: 3,
        sports_hours: 2,
        work_hours: 6,
        walk_minutes: 45,
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

import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import dayjs from 'dayjs';

type FinancialSummary = {
  income: number;
  expenses: number;
  balance: number;
  trends?: {
    income_pct: number | null;
    expenses_pct: number | null;
    balance_pct: number | null;
  };
};

export function useFinancialData(date?: string) {
  const [data, setData] = useState<FinancialSummary>({ 
    income: 0, 
    expenses: 0, 
    balance: 0,
    trends: { income_pct: null, expenses_pct: null, balance_pct: null }
  });
  const [loading, setLoading] = useState(false);

  const day = dayjs(date ?? undefined).format('YYYY-MM-DD');

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      try {
        // القراءة من v_finance_today مع الاتجاهات
        const { data: row, error } = await supabase
          .from('v_finance_today')
          .select('income, expenses, balance, income_trend_pct, expenses_trend_pct, balance_trend_pct')
          .eq('day', day)
          .maybeSingle();

        if (error) throw error;

        const summary: FinancialSummary = {
          income: Number(row?.income ?? 0),
          expenses: Number(row?.expenses ?? 0),
          balance: Number(row?.balance ?? 0),
          trends: {
            income_pct: row?.income_trend_pct ?? null,
            expenses_pct: row?.expenses_trend_pct ?? null,
            balance_pct: row?.balance_trend_pct ?? null,
          }
        };
        
        if (alive) setData(summary);
      } catch (err) {
        console.error('[useFinancialData] error', err);
        if (alive) setData({ 
          income: 0, 
          expenses: 0, 
          balance: 0,
          trends: { income_pct: null, expenses_pct: null, balance_pct: null }
        });
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [day]);

  return { data, loading };
}

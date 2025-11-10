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
  const [error, setError] = useState<string | null>(null);

  const day = dayjs(date ?? undefined).format('YYYY-MM-DD');

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        // القراءة من v_finance_today مع الاتجاهات
        const { data: row, error } = await supabase
          .from('v_finance_today')
          .select('income, expenses, balance, income_trend_pct, expenses_trend_pct, balance_trend_pct')
          .eq('day', day)
          .maybeSingle();

        if (error) {
          console.error('[useFinancialData] error', error);
          if (alive) {
            setError(error.message);
            setData({ 
              income: 0, 
              expenses: 0, 
              balance: 0,
              trends: { income_pct: null, expenses_pct: null, balance_pct: null }
            });
          }
          return;
        }

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
        if (alive) {
          setError(err instanceof Error ? err.message : 'حدث خطأ غير متوقع');
          setData({ 
            income: 0, 
            expenses: 0, 
            balance: 0,
            trends: { income_pct: null, expenses_pct: null, balance_pct: null }
          });
        }
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [day]);

  return { data, loading, error };
}

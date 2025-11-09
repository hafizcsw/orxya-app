import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import dayjs from 'dayjs';

type FinancialSummary = {
  income: number;
  expenses: number;
  balance: number;
};

export function useFinancialData(date?: string) {
  const [data, setData] = useState<FinancialSummary>({ income: 0, expenses: 0, balance: 0 });
  const [loading, setLoading] = useState(false);

  const d = dayjs(date ?? undefined);
  const start = d.startOf('day').toISOString();
  const end = d.endOf('day').toISOString();

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      try {
        const { data: rows, error } = await supabase
          .from('financial_events')
          .select('direction, amount')
          .gte('when_at', start)
          .lte('when_at', end);

        if (error) throw error;

        let income = 0, expenses = 0;
        (rows ?? []).forEach(r => {
          const amt = Number(r.amount ?? 0);
          if (r.direction === 1) income += amt;
          else if (r.direction === -1) expenses += amt;
        });

        const summary = { income, expenses, balance: income - expenses };
        if (alive) setData(summary);
      } catch (err) {
        console.error('[useFinancialData] error', err);
        if (alive) setData({ income: 0, expenses: 0, balance: 0 });
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [start, end]);

  return { data, loading };
}

import { useState } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { useUser } from '@/lib/auth'
import { Protected } from '@/components/Protected'
import { StatCard } from '@/components/StatCard'
import { Sparkline } from '@/components/Sparkline'
import { toCSV } from '@/lib/csv'
import { track } from '@/lib/telemetry'

type DayReport = {
  date: string;
  income_usd: number;
  spend_usd: number;
  net_usd: number;
  study_hours: number;
  mma_hours: number;
  work_hours: number;
  walk_min: number;
  scholarships_sold: number;
  villas_sold: number;
};

async function fetchDaily(dateISO: string): Promise<DayReport | null> {
  const { data, error } = await supabase.functions.invoke('report-daily', {
    body: { date: dateISO }
  });
  if (error || !data?.ok) return null;
  return data.report as DayReport;
}

function fmt(d: Date) { 
  return d.toISOString().slice(0, 10); 
}

function subDays(d: Date, n: number) { 
  const x = new Date(d); 
  x.setDate(x.getDate() - n); 
  return x; 
}

export default function Reports() {
  const { user } = useUser();
  const [date, setDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<DayReport[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function loadSingle() {
    if (!user) {
      setError('الرجاء تسجيل الدخول أولاً');
      return;
    }
    setLoading(true); 
    setError(null);
    try {
      track('reports_fetch_single', { date });
      const rep = await fetchDaily(date);
      setRows(rep ? [rep] : []);
    } catch (e: any) {
      setError(String(e?.message ?? e));
    } finally { 
      setLoading(false); 
    }
  }

  async function loadRange(days: number) {
    if (!user) {
      setError('الرجاء تسجيل الدخول أولاً');
      return;
    }
    setLoading(true); 
    setError(null);
    try {
      track('reports_fetch_range', { days });
      const end = new Date(date);
      const promises = Array.from({ length: days }, (_, i) => fetchDaily(fmt(subDays(end, i))));
      const out = await Promise.all(promises);
      const filtered = out.filter(Boolean) as DayReport[];
      setRows(filtered.reverse());
    } catch (e: any) {
      setError(String(e?.message ?? e));
    } finally { 
      setLoading(false); 
    }
  }

  function exportCSV() {
    if (!rows?.length) return;
    const csv = toCSV(rows);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; 
    a.download = `oryxa_reports_${date}.csv`; 
    a.click();
    URL.revokeObjectURL(url);
    track('reports_export_csv', { count: rows.length });
  }

  const totals = rows?.reduce((acc, r) => {
    acc.income += r.income_usd || 0;
    acc.spend += r.spend_usd || 0;
    acc.net += r.net_usd || 0;
    acc.study += r.study_hours || 0;
    acc.mma += r.mma_hours || 0;
    acc.work += r.work_hours || 0;
    acc.walk += r.walk_min || 0;
    acc.sch += r.scholarships_sold || 0;
    acc.villas += r.villas_sold || 0;
    return acc;
  }, { income: 0, spend: 0, net: 0, study: 0, mma: 0, work: 0, walk: 0, sch: 0, villas: 0 });

  const netSeries = rows?.map(r => r.net_usd ?? 0) ?? [];

  return (
    <Protected>
      <div className="container mx-auto p-4 space-y-6">
        <h1 className="text-3xl font-bold">التقارير</h1>

        {!user && (
          <div className="text-sm text-muted-foreground">
            سجّل الدخول لعرض التقارير المباشرة.
          </div>
        )}

        <div className="flex flex-col md:flex-row gap-4 items-start">
          <label className="flex flex-col gap-2">
            <span className="text-sm font-medium">التاريخ الأساسي</span>
            <input
              className="px-3 py-2 rounded-lg border border-input bg-background text-foreground"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </label>

          <div className="flex flex-wrap gap-2">
            <button 
              className="px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50" 
              disabled={loading || !user} 
              onClick={loadSingle}
            >
              {loading ? '...' : 'اليوم فقط'}
            </button>
            <button 
              className="px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50" 
              disabled={loading || !user} 
              onClick={() => loadRange(7)}
            >
              {loading ? '...' : 'آخر 7 أيام'}
            </button>
            <button 
              className="px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50" 
              disabled={loading || !user} 
              onClick={() => loadRange(30)}
            >
              {loading ? '...' : 'آخر 30 يومًا'}
            </button>
            <button 
              className="px-4 py-2 rounded-lg bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-colors disabled:opacity-50" 
              disabled={loading || !rows?.length} 
              onClick={exportCSV}
            >
              تصدير CSV
            </button>
          </div>
        </div>

        {error && (
          <div className="p-3 rounded-lg bg-red-100 dark:bg-red-900/30 text-red-900 dark:text-red-100 text-sm">
            {error}
          </div>
        )}

        {rows && (
          <>
            {/* بطاقات الملخّص */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <StatCard 
                title="إجمالي الدخل $" 
                value={totals?.income.toFixed(2) ?? 0} 
                tone="good" 
              />
              <StatCard 
                title="إجمالي المصروف $" 
                value={totals?.spend.toFixed(2) ?? 0} 
                tone="bad" 
              />
              <StatCard 
                title="الصافي $" 
                value={totals?.net.toFixed(2) ?? 0} 
                tone={(totals?.net ?? 0) >= 0 ? 'good' : 'bad'} 
              />
              <StatCard 
                title="مشي (د)" 
                value={totals?.walk ?? 0} 
              />
              <StatCard 
                title="دراسة (س)" 
                value={totals?.study.toFixed(1) ?? 0} 
              />
              <StatCard 
                title="MMA (س)" 
                value={totals?.mma.toFixed(1) ?? 0} 
              />
              <StatCard 
                title="عمل (س)" 
                value={totals?.work.toFixed(1) ?? 0} 
              />
              <StatCard 
                title="مبيعات" 
                value={`${totals?.sch ?? 0} منح / ${totals?.villas ?? 0} فلل`} 
              />
            </div>

            {/* Sparkline للصافي */}
            {netSeries.length > 1 && (
              <div className="rounded-2xl border border-border p-4 bg-card">
                <div className="text-sm text-muted-foreground mb-2">
                  اتجاه الصافي (أقدم ← أحدث)
                </div>
                <div className="text-xs text-muted-foreground mb-2">
                  نقاط: {netSeries.length}
                </div>
                <div className="w-full overflow-x-auto">
                  <Sparkline points={netSeries} width={Math.min(600, netSeries.length * 40)} />
                </div>
              </div>
            )}

            {/* جدول مختصر للأيام */}
            <div className="overflow-x-auto rounded-xl border border-border">
              <table className="min-w-full text-sm">
                <thead className="bg-muted">
                  <tr>
                    <th className="text-right p-3 font-medium">التاريخ</th>
                    <th className="text-right p-3 font-medium">دخل $</th>
                    <th className="text-right p-3 font-medium">مصروف $</th>
                    <th className="text-right p-3 font-medium">صافي $</th>
                    <th className="text-right p-3 font-medium">دراسة</th>
                    <th className="text-right p-3 font-medium">MMA</th>
                    <th className="text-right p-3 font-medium">عمل</th>
                    <th className="text-right p-3 font-medium">مشي (د)</th>
                    <th className="text-right p-3 font-medium">منح</th>
                    <th className="text-right p-3 font-medium">فلل</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r, idx) => (
                    <tr 
                      key={r.date} 
                      className={idx % 2 === 0 ? 'bg-background' : 'bg-muted/50'}
                    >
                      <td className="p-3">{r.date}</td>
                      <td className="p-3 text-green-700 dark:text-green-400">
                        {r.income_usd.toFixed(2)}
                      </td>
                      <td className="p-3 text-red-700 dark:text-red-400">
                        {r.spend_usd.toFixed(2)}
                      </td>
                      <td className={`p-3 font-medium ${r.net_usd >= 0 ? 'text-green-700 dark:text-green-400' : 'text-red-700 dark:text-red-400'}`}>
                        {r.net_usd.toFixed(2)}
                      </td>
                      <td className="p-3">{r.study_hours.toFixed(1)}</td>
                      <td className="p-3">{r.mma_hours.toFixed(1)}</td>
                      <td className="p-3">{r.work_hours.toFixed(1)}</td>
                      <td className="p-3">{r.walk_min}</td>
                      <td className="p-3">{r.scholarships_sold}</td>
                      <td className="p-3">{r.villas_sold}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        {!rows && !loading && (
          <div className="text-center text-muted-foreground py-8">
            اختر نطاقًا زمنيًا لعرض التقارير
          </div>
        )}
      </div>
    </Protected>
  );
}

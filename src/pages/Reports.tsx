import { useState } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { useUser } from '@/lib/auth'
import { Protected } from '@/components/Protected'
import { StatCard } from '@/components/StatCard'
import { Sparkline } from '@/components/Sparkline'
import { toCSV } from '@/lib/csv'
import { track } from '@/lib/telemetry'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Loader2, TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { useTranslation } from 'react-i18next'

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
  events?: Array<{
    title: string;
    starts_at: string;
    ends_at: string;
    location?: string;
  }>;
};

async function fetchDaily(dateISO: string): Promise<DayReport | null> {
  const { data, error } = await supabase.functions.invoke('report-daily', {
    body: { start: dateISO, end: dateISO }
  });
  if (error || !data?.items) return null;
  return data.items[0] as DayReport;
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
  const { t } = useTranslation('reports');
  const [date, setDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<DayReport[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  // AI Summary state
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [summary, setSummary] = useState<string | null>(null);
  const [summaryStats, setSummaryStats] = useState<any>(null);
  const [summaryError, setSummaryError] = useState<string | null>(null);

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

  async function loadAISummary(span: 'day' | 'week' | 'month', startDate?: string) {
    if (!user) {
      setSummaryError('الرجاء تسجيل الدخول أولاً');
      return;
    }
    setSummaryLoading(true);
    setSummaryError(null);
    setSummary(null);
    try {
      track('reports_ai_summary', { span, date: startDate || date });
      const { data, error } = await supabase.functions.invoke('summarize-period', {
        body: { span, start_iso: startDate || date }
      });
      
      if (error) throw error;
      
      if (!data?.ok) {
        throw new Error(data?.error || 'فشل في توليد الملخص');
      }
      
      setSummary(data.summary);
      setSummaryStats(data.stats);
    } catch (e: any) {
      console.error('AI summary error:', e);
      setSummaryError(String(e?.message ?? e));
    } finally {
      setSummaryLoading(false);
    }
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
      <div className="max-w-4xl mx-auto p-4 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">{t('title')}</h1>
        </div>

        {!user && (
          <div className="text-sm text-muted-foreground">
            {t('common:messages.loading')}
          </div>
        )}

        <Tabs defaultValue="daily" className="w-full">
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="daily">{t('daily')}</TabsTrigger>
            <TabsTrigger value="ai">{t('monthly')}</TabsTrigger>
          </TabsList>

          {/* Daily Reports Tab */}
          <TabsContent value="daily" className="space-y-6">
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
                  {loading ? '...' : t('daily')}
                </button>
                <button 
                  className="px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50" 
                  disabled={loading || !user} 
                  onClick={() => loadRange(7)}
                >
                  {loading ? '...' : t('weekly')}
                </button>
                <button 
                  className="px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50" 
                  disabled={loading || !user} 
                  onClick={() => loadRange(30)}
                >
                  {loading ? '...' : t('monthly')}
                </button>
                <button 
                  className="px-4 py-2 rounded-lg bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-colors disabled:opacity-50" 
                  disabled={loading || !rows?.length} 
                  onClick={exportCSV}
                >
                  {t('export')}
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
                        <th className="text-right p-3 font-medium">أحداث</th>
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
                          <td className="p-3">
                            {r.events && r.events.length > 0 ? (
                              <div className="space-y-1">
                                {r.events.map((event, i) => (
                                  <div key={i} className="text-xs">
                                    <div className="font-medium">{event.title}</div>
                                    <div className="text-muted-foreground">
                                      {new Date(event.starts_at).toLocaleTimeString('ar-AE', { hour: '2-digit', minute: '2-digit' })} - {new Date(event.ends_at).toLocaleTimeString('ar-AE', { hour: '2-digit', minute: '2-digit' })}
                                    </div>
                                    {event.location && (
                                      <div className="text-muted-foreground">📍 {event.location}</div>
                                    )}
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </td>
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
          </TabsContent>

          {/* AI Summary Tab */}
          <TabsContent value="ai" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>الملخص الذكي</CardTitle>
                <CardDescription>
                  احصل على تحليل AI شامل لإنتاجيتك، المهام، الأحداث، والتعارضات مع الصلاة
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-col md:flex-row gap-4 items-start">
                  <label className="flex flex-col gap-2">
                    <span className="text-sm font-medium">تاريخ البداية</span>
                    <input
                      className="px-3 py-2 rounded-lg border border-input bg-background text-foreground"
                      type="date"
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                    />
                  </label>

                  <div className="flex flex-wrap gap-2">
                    <button 
                      className="px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center gap-2" 
                      disabled={summaryLoading || !user} 
                      onClick={() => loadAISummary('day')}
                    >
                      {summaryLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                      اليوم
                    </button>
                    <button 
                      className="px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center gap-2" 
                      disabled={summaryLoading || !user} 
                      onClick={() => loadAISummary('week')}
                    >
                      {summaryLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                      هذا الأسبوع
                    </button>
                    <button 
                      className="px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center gap-2" 
                      disabled={summaryLoading || !user} 
                      onClick={() => loadAISummary('month')}
                    >
                      {summaryLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                      هذا الشهر
                    </button>
                  </div>
                </div>

                {summaryError && (
                  <div className="p-3 rounded-lg bg-red-100 dark:bg-red-900/30 text-red-900 dark:text-red-100 text-sm">
                    {summaryError}
                  </div>
                )}

                {summaryStats && (
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                    <Card>
                      <CardContent className="pt-4">
                        <div className="text-2xl font-bold">{summaryStats.total_tasks}</div>
                        <div className="text-xs text-muted-foreground">إجمالي المهام</div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="pt-4">
                        <div className="text-2xl font-bold text-green-600">{summaryStats.done_tasks}</div>
                        <div className="text-xs text-muted-foreground">مهام منجزة</div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="pt-4">
                        <div className="text-2xl font-bold">{summaryStats.total_events}</div>
                        <div className="text-xs text-muted-foreground">أحداث</div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="pt-4">
                        <div className="text-2xl font-bold text-blue-600">{summaryStats.ai_events}</div>
                        <div className="text-xs text-muted-foreground">أحداث AI</div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="pt-4">
                        <div className="text-2xl font-bold text-orange-600">{summaryStats.conflicts}</div>
                        <div className="text-xs text-muted-foreground">تعارضات</div>
                      </CardContent>
                    </Card>
                  </div>
                )}

                {summary && (
                  <Card className="bg-muted/50">
                    <CardHeader>
                      <CardTitle className="text-lg">التحليل والتوصيات</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="prose prose-sm dark:prose-invert max-w-none whitespace-pre-wrap">
                        {summary}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {!summary && !summaryLoading && (
                  <div className="text-center text-muted-foreground py-8">
                    اختر نطاقًا زمنيًا للحصول على ملخص ذكي
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </Protected>
  );
}

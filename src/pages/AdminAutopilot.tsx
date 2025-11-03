import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useUser } from '@/lib/auth';
import { track } from '@/lib/telemetry';
import { Card } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';

type Kpis = {
  as_of_date: string;
  open_now: number;
  suggested_now: number;
  auto_applied_now: number;
  resolved_now: number;
  undone_now: number;
  applied_7d: number;
  undone_7d: number;
  undo_rate_7d: number;
};

type Daily = { day: string; applied: number; undone: number; total_actions: number; };
type Reason = { reason: string | null; cnt: number; };

export default function AdminAutopilot() {
  const { user } = useUser();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [kpis, setKpis] = useState<Kpis | null>(null);
  const [daily, setDaily] = useState<Daily[]>([]);
  const [reasons, setReasons] = useState<Reason[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      if (!user) { 
        setIsAdmin(false); 
        setLoading(false); 
        track('admin_not_authorized', { reason: 'no_user' });
        return; 
      }

      try {
        track('admin_open', { user_id: user.id });

        // Check authorization first via user_roles table (server-side enforced)
        const { data: roleCheck, error: roleError } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id)
          .eq('role', 'admin')
          .maybeSingle();
        
        if (roleError || !roleCheck) {
          setIsAdmin(false);
          setErr('Unauthorized - Admin access required');
          track('admin_not_authorized', { reason: 'no_admin_role' });
          setLoading(false);
          return;
        }

        setIsAdmin(true);

        // Now fetch admin data (RPC functions enforce role check on server-side too)
        const [{ data: k }, { data: d }, { data: r }] = await Promise.all([
          supabase.rpc('admin_conflict_kpis' as any),
          supabase.rpc('admin_actions_daily' as any),
          supabase.rpc('admin_top_reasons_30d' as any)
        ]);

        setKpis((k && k[0]) ?? null);
        setDaily((d ?? []) as Daily[]);
        setReasons((r ?? []) as Reason[]);
        setErr(null);

        track('admin_kpis_loaded', { has_data: !!k });
        track('admin_daily_loaded', { days: (d as any[])?.length ?? 0 });
        track('admin_reasons_loaded', { count: (r as any[])?.length ?? 0 });
      } catch (e: any) {
        setIsAdmin(false);
        setErr(e?.message ?? 'Not authorized');
        track('admin_not_authorized', { error: e?.message });
      } finally {
        setLoading(false);
      }
    })();
  }, [user?.id]);

  const maxTotal = useMemo(() => Math.max(1, ...daily.map(x => x.total_actions || 0)), [daily]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (isAdmin === false) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="p-8 max-w-md">
          <h2 className="text-xl font-semibold text-destructive mb-2">غير مصرح</h2>
          <p className="text-muted-foreground">هذه الصفحة متاحة للمدراء فقط.</p>
          {err && <p className="text-sm text-muted-foreground mt-2">{err}</p>}
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-8">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold">لوحة التحكم — Autopilot</h1>
        <p className="text-muted-foreground">مراقبة شاملة لتصرفات النظام التلقائي</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <KpiCard label="مفتوحة" value={kpis?.open_now ?? 0} variant="default" />
        <KpiCard label="مقترحة" value={kpis?.suggested_now ?? 0} variant="info" />
        <KpiCard label="مطبّقة تلقائيًا" value={kpis?.auto_applied_now ?? 0} variant="success" />
        <KpiCard label="محلولة" value={kpis?.resolved_now ?? 0} variant="muted" />
        <KpiCard label="تم التراجع" value={kpis?.undone_now ?? 0} variant="warning" />
        <KpiCard 
          label="معدل التراجع (7 أيام)" 
          value={`${Math.round((kpis?.undo_rate_7d ?? 0) * 100)}%`} 
          variant="accent"
        />
      </div>

      {/* Daily Activity */}
      <Card className="p-6 space-y-4">
        <h2 className="text-xl font-semibold">النشاط اليومي (30 يومًا)</h2>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Mini bars */}
          <div className="space-y-2">
            <div className="text-sm text-muted-foreground font-medium">إجمالي الأفعال</div>
            <div className="space-y-1">
              {daily.slice().reverse().map(row => (
                <div key={row.day} className="flex items-center gap-3">
                  <div className="w-24 text-xs text-muted-foreground" dir="ltr">
                    {new Date(row.day).toLocaleDateString('ar-SA', { month: 'short', day: 'numeric' })}
                  </div>
                  <div className="flex-1 h-3 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-primary to-primary/70 rounded-full transition-all"
                      style={{ width: `${(row.total_actions / maxTotal) * 100}%` }}
                      title={`${row.total_actions} إجمالي`}
                    />
                  </div>
                  <div className="w-12 text-right text-xs font-medium">{row.total_actions}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Table */}
          <div className="space-y-2">
            <div className="text-sm text-muted-foreground font-medium">تفصيل: مطبّقة / متراجع عنها</div>
            <div className="max-h-[400px] overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-background">
                  <tr className="text-muted-foreground border-b">
                    <th className="text-right py-2 px-2">اليوم</th>
                    <th className="text-right py-2 px-2">مطبّقة</th>
                    <th className="text-right py-2 px-2">متراجع</th>
                  </tr>
                </thead>
                <tbody>
                  {daily.slice().reverse().map(r => (
                    <tr key={r.day} className="border-b hover:bg-muted/50 transition-colors">
                      <td className="py-2 px-2 text-right" dir="ltr">
                        {new Date(r.day).toLocaleDateString('ar-SA', { month: 'short', day: 'numeric' })}
                      </td>
                      <td className="py-2 px-2 text-right font-medium text-green-600">{r.applied}</td>
                      <td className="py-2 px-2 text-right font-medium text-orange-600">{r.undone}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </Card>

      {/* Top Reasons */}
      <Card className="p-6 space-y-4">
        <h2 className="text-xl font-semibold">أكثر أسباب التعارض شيوعًا (30 يومًا)</h2>
        <div className="max-h-[400px] overflow-y-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-background">
              <tr className="text-muted-foreground border-b">
                <th className="text-right py-2 px-2">السبب</th>
                <th className="text-right py-2 px-2 w-24">العدد</th>
              </tr>
            </thead>
            <tbody>
              {(reasons ?? []).map((r, i) => (
                <tr key={`${r.reason ?? 'unknown'}-${i}`} className="border-b hover:bg-muted/50 transition-colors">
                  <td className="py-2 px-2 text-right">
                    <span className="inline-flex items-center gap-2">
                      {r.reason === 'prayer_window' && '🕌'}
                      {r.reason ?? '—'}
                    </span>
                  </td>
                  <td className="py-2 px-2 text-right font-medium">{r.cnt}</td>
                </tr>
              ))}
              {reasons.length === 0 && (
                <tr>
                  <td colSpan={2} className="py-8 text-center text-muted-foreground">
                    لا توجد بيانات
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

function KpiCard({ 
  label, 
  value, 
  variant = 'default' 
}: { 
  label: string; 
  value: number | string;
  variant?: 'default' | 'success' | 'warning' | 'info' | 'muted' | 'accent';
}) {
  const colors = {
    default: 'border-border',
    success: 'border-green-200 bg-green-50/50 dark:border-green-900 dark:bg-green-950/20',
    warning: 'border-orange-200 bg-orange-50/50 dark:border-orange-900 dark:bg-orange-950/20',
    info: 'border-blue-200 bg-blue-50/50 dark:border-blue-900 dark:bg-blue-950/20',
    muted: 'border-muted bg-muted/30',
    accent: 'border-primary/20 bg-primary/5'
  };

  return (
    <Card className={`p-4 ${colors[variant]}`}>
      <div className="text-xs text-muted-foreground mb-1">{label}</div>
      <div className="text-2xl font-bold">{value}</div>
    </Card>
  );
}

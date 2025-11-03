import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useUser } from '@/lib/auth';
import { Protected } from '@/components/Protected';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Database, Trash2, CheckCircle2, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { track } from '@/lib/telemetry';

// ... keep existing code (project/task seed data)

type ProjectSeed = {
  name: string;
  status: 'Active' | 'Archived';
  priority: string;
  target?: string | null;
  deadline?: string | null;
  next_action?: string | null;
  notes?: string | null;
};

type TaskSeed = {
  project: string;
  title: string;
  status: 'todo' | 'doing' | 'done';
  due_date?: string | null;
  tags?: string[];
};

const projects: ProjectSeed[] = [
  { 
    name: 'Eye on Sky (Drone Sports)', 
    status: 'Active', 
    priority: 'High', 
    target: 'MVP deck + sponsor pack', 
    deadline: '2025-12-15', 
    next_action: 'Lock venue shortlist', 
    notes: 'Jebel Ali / Palm area. Tags: drones, events, design' 
  },
  { 
    name: 'Drone Logistics – Maldives', 
    status: 'Active', 
    priority: 'High', 
    target: 'Pilot corridor approval', 
    deadline: '2025-12-05', 
    next_action: 'CAA outreach', 
    notes: 'Male → resort cluster A. Tags: drone, logistics, pilot' 
  },
  { 
    name: 'Smart Business Hub – LO-TWO-N', 
    status: 'Active', 
    priority: 'Medium', 
    next_action: 'Floorplan zoning v1',
    notes: 'Tags: coworking, IoT, ops'
  },
  { 
    name: 'MALAK AI CRM (CSW Global)', 
    status: 'Active', 
    priority: 'High', 
    target: 'RC hardening', 
    next_action: 'Flags: pilot list',
    notes: 'Tags: crm, whatsapp, supabase, edge'
  },
  { 
    name: 'CSW Coin', 
    status: 'Active', 
    priority: 'Medium', 
    target: 'Utility whitepaper v1',
    notes: 'Tags: token, scholarships, staking'
  },
  { 
    name: 'Russian Scholarships Program', 
    status: 'Active', 
    priority: 'Medium', 
    target: 'MoU set + LP RU/AR',
    notes: 'Tags: scholarships, universities, russia'
  },
  { 
    name: 'Real Estate CRM (UAE Investors)', 
    status: 'Active', 
    priority: 'High', 
    target: 'Lead ingestion POC',
    notes: 'Tags: realestate, crm, leads'
  },
  { 
    name: 'Planing AI (PlumbAR)', 
    status: 'Active', 
    priority: 'Medium', 
    target: 'Camera diag flow',
    notes: 'Tags: ai, cv, mobile'
  },
];

const tasks: TaskSeed[] = [
  // Eye on Sky
  { project: 'Eye on Sky (Drone Sports)', title: 'Finalize eye-shaped arena v2', status: 'doing', due_date: '2025-11-10', tags: ['design', '3d'] },
  { project: 'Eye on Sky (Drone Sports)', title: 'Sponsorship tiering (Gold/Silver/Bronze)', status: 'todo', due_date: '2025-11-12', tags: ['bizdev'] },
  { project: 'Eye on Sky (Drone Sports)', title: '3D walk-through teaser (30s)', status: 'todo', due_date: '2025-11-20', tags: ['media'] },

  // Drone Logistics
  { project: 'Drone Logistics – Maldives', title: 'Route feasibility: Male → resort cluster A', status: 'doing', due_date: '2025-11-08', tags: ['ops'] },
  { project: 'Drone Logistics – Maldives', title: 'Civil Aviation contact list', status: 'todo', due_date: '2025-11-06', tags: ['regulatory'] },
  { project: 'Drone Logistics – Maldives', title: 'Pilot proposal one-pager', status: 'todo', due_date: '2025-11-09', tags: ['proposal'] },

  // Smart Business Hub
  { project: 'Smart Business Hub – LO-TWO-N', title: 'Floorplan zoning v1', status: 'doing', due_date: '2025-11-07', tags: ['design'] },
  { project: 'Smart Business Hub – LO-TWO-N', title: 'IoT sensor shortlist', status: 'todo', due_date: '2025-11-13', tags: ['iot', 'hardware'] },
  { project: 'Smart Business Hub – LO-TWO-N', title: 'Permits checklist', status: 'todo', due_date: '2025-11-18', tags: ['permits'] },

  // MALAK AI CRM
  { project: 'MALAK AI CRM (CSW Global)', title: 'Edge Function: commands hardening', status: 'done', due_date: '2025-10-31', tags: ['edge', 'security'] },
  { project: 'MALAK AI CRM (CSW Global)', title: 'Prayer scheduler QA', status: 'doing', due_date: '2025-11-02', tags: ['qa'] },
  { project: 'MALAK AI CRM (CSW Global)', title: 'Feature flags: pilot list', status: 'todo', due_date: '2025-11-03', tags: ['flags'] },

  // CSW Coin
  { project: 'CSW Coin', title: 'Token utility draft (tuition discounts)', status: 'todo', due_date: '2025-11-14', tags: ['tokenomics'] },
  { project: 'CSW Coin', title: 'Smart contract audit shortlist', status: 'todo', due_date: '2025-11-22', tags: ['audit'] },
  { project: 'CSW Coin', title: 'Exchange listing pathways', status: 'todo', due_date: '2025-11-25', tags: ['listing'] },

  // Russian Scholarships
  { project: 'Russian Scholarships Program', title: 'University MoU template', status: 'doing', due_date: '2025-11-05', tags: ['legal'] },
  { project: 'Russian Scholarships Program', title: 'Landing page RU/AR', status: 'todo', due_date: '2025-11-09', tags: ['web', 'content'] },
  { project: 'Russian Scholarships Program', title: 'Document translation pipeline', status: 'todo', due_date: '2025-11-12', tags: ['ops'] },

  // Real Estate CRM
  { project: 'Real Estate CRM (UAE Investors)', title: 'Lead ingestion (300k CSV) mapping', status: 'doing', due_date: '2025-11-04', tags: ['data'] },
  { project: 'Real Estate CRM (UAE Investors)', title: 'Scoring model sketch', status: 'todo', due_date: '2025-11-11', tags: ['ml', 'scoring'] },
  { project: 'Real Estate CRM (UAE Investors)', title: 'Broker dashboard wireframe', status: 'todo', due_date: '2025-11-16', tags: ['ui', 'dashboard'] },

  // Planing AI
  { project: 'Planing AI (PlumbAR)', title: 'Camera diagnostic flow v1', status: 'doing', due_date: '2025-11-06', tags: ['ux', 'cv'] },
  { project: 'Planing AI (PlumbAR)', title: 'Parts catalog schema', status: 'todo', due_date: '2025-11-10', tags: ['data'] },
  { project: 'Planing AI (PlumbAR)', title: 'On-device model viability', status: 'todo', due_date: '2025-11-24', tags: ['ml', 'mobile'] },
];

const Seed = () => {
  const { user } = useUser();
  const [loading, setLoading] = useState(false);
  const [log, setLog] = useState<string[]>([]);
  const [oryxaResult, setOryxaResult] = useState<any>(null);

  const addLog = (msg: string) => setLog(prev => [...prev, msg]);

  // Oryxa Seed (Calendar + Finance + Health)
  const handleOryxaSeed = async (days: number = 3) => {
    if (!user) {
      toast.error('يرجى تسجيل الدخول أولاً');
      return;
    }

    setLoading(true);
    setOryxaResult(null);

    try {
      const { data, error } = await supabase.functions.invoke('seed-data', {
        body: {
          action: 'seed',
          days,
          startDate: '2025-11-03',
          tag: 'seed:oryxa-2025-11-03'
        }
      });

      if (error) throw error;

      if (data?.success) {
        setOryxaResult(data);
        toast.success(
          `تم إضافة البيانات بنجاح!\n${data.results.events} أحداث، ${data.results.financial} مالية، ${data.results.health} صحة`,
          { duration: 5000 }
        );
        track('oryxa_seed_success', { days });
      } else {
        throw new Error(data?.error || 'فشل في إضافة البيانات');
      }
    } catch (err: any) {
      console.error('Seed error:', err);
      toast.error(`خطأ: ${err.message}`);
      setOryxaResult({ error: err.message });
      track('oryxa_seed_error', { error: err.message });
    } finally {
      setLoading(false);
    }
  };

  const handleOryxaRollback = async () => {
    if (!user) {
      toast.error('يرجى تسجيل الدخول أولاً');
      return;
    }

    if (!confirm('هل أنت متأكد من حذف جميع بيانات الـ Oryxa Seed؟')) {
      return;
    }

    setLoading(true);
    setOryxaResult(null);

    try {
      const { data, error } = await supabase.functions.invoke('seed-data', {
        body: {
          action: 'rollback',
          tag: 'seed:oryxa-2025-11-03'
        }
      });

      if (error) throw error;

      if (data?.success) {
        setOryxaResult(data);
        toast.success(
          `تم حذف البيانات بنجاح!\n${data.results.events} أحداث، ${data.results.financial} مالية`,
          { duration: 5000 }
        );
        track('oryxa_rollback_success');
      } else {
        throw new Error(data?.error || 'فشل في حذف البيانات');
      }
    } catch (err: any) {
      console.error('Rollback error:', err);
      toast.error(`خطأ: ${err.message}`);
      setOryxaResult({ error: err.message });
      track('oryxa_rollback_error', { error: err.message });
    } finally {
      setLoading(false);
    }
  };

  // Projects & Tasks Seed (existing code)
  const runProjectsSeed = async () => {
    setLoading(true);
    setLog([]);
    addLog('🚀 بدء Seed...');

    try {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth?.user) {
        addLog('❌ يجب تسجيل الدخول أولاً');
        setLoading(false);
        return;
      }

      const projectMap = new Map<string, string>();

      // Add projects
      addLog(`➕ إضافة ${projects.length} مشاريع...`);
      for (const p of projects) {
        const { data } = await supabase.functions.invoke('commands', {
          body: {
            command: 'add_project',
            idempotency_key: crypto.randomUUID(),
            payload: {
              name: p.name,
              status: p.status,
              priority: p.priority,
              target: p.target ?? null,
              deadline: p.deadline ?? null,
              next_action: p.next_action ?? null,
              notes: p.notes ?? null,
            }
          }
        });

        if (data?.ok) {
          const projectId = data.saved_ids?.[0];
          if (projectId) {
            projectMap.set(p.name, projectId);
            addLog(`  ✅ ${p.name}`);
          }
        } else {
          addLog(`  ⚠️ فشل: ${p.name}`);
        }
      }

      // Add tasks
      addLog(`➕ إضافة ${tasks.length} مهمة...`);
      const counters: Record<string, number> = {};
      
      for (const t of tasks) {
        const projectId = projectMap.get(t.project);
        if (!projectId) {
          addLog(`  ⚠️ مشروع غير موجود: ${t.project}`);
          continue;
        }

        const key = `${projectId}:${t.status}`;
        counters[key] = (counters[key] ?? 0) + 1000;

        const { data } = await supabase.functions.invoke('commands', {
          body: {
            command: 'add_task',
            idempotency_key: crypto.randomUUID(),
            payload: {
              project_id: projectId,
              title: t.title,
              status: t.status,
              order_pos: counters[key],
              due_date: t.due_date ?? null,
            }
          }
        });

        if (data?.ok && t.tags?.length) {
          const taskId = data.saved_ids?.[0];
          if (taskId) {
            await supabase.from('tasks').update({ tags: t.tags }).eq('id', taskId);
          }
        }

        if (data?.ok) {
          addLog(`  ✅ ${t.title.substring(0, 40)}...`);
        } else {
          addLog(`  ⚠️ فشل: ${t.title}`);
        }
      }

      addLog('✅ انتهى Seed بنجاح!');
      track('seed_run_success', { projects: projects.length, tasks: tasks.length });
    } catch (error) {
      addLog(`❌ خطأ: ${error}`);
      track('seed_run_error', { error: String(error) });
    } finally {
      setLoading(false);
    }
  };

  const clearProjectsData = async () => {
    if (!confirm('هل تريد حذف جميع المشاريع والمهام؟ هذا لا يمكن التراجع عنه!')) return;

    setLoading(true);
    setLog([]);
    addLog('🗑️ حذف البيانات...');

    try {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth?.user) {
        addLog('❌ يجب تسجيل الدخول أولاً');
        setLoading(false);
        return;
      }

      const { error: tasksErr } = await supabase
        .from('tasks')
        .delete()
        .eq('owner_id', auth.user.id);

      if (tasksErr) {
        addLog(`❌ خطأ في حذف المهام: ${tasksErr.message}`);
      } else {
        addLog('✅ تم حذف المهام');
      }

      const { error: projectsErr } = await supabase
        .from('projects')
        .delete()
        .eq('owner_id', auth.user.id);

      if (projectsErr) {
        addLog(`❌ خطأ في حذف المشاريع: ${projectsErr.message}`);
      } else {
        addLog('✅ تم حذف المشاريع');
      }

      addLog('✅ انتهى التنظيف');
      track('seed_clear_success');
    } catch (error) {
      addLog(`❌ خطأ: ${error}`);
      track('seed_clear_error', { error: String(error) });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Protected>
      <div className="max-w-4xl mx-auto p-4 space-y-6">
        <div>
          <h1 className="text-3xl font-bold mb-2">🌱 بيانات تجريبية (Seed)</h1>
          <p className="text-muted-foreground">
            إضافة بيانات تجريبية لاختبار التطبيق
          </p>
        </div>

        <Tabs defaultValue="oryxa" className="w-full">
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="oryxa">Oryxa (أحداث + مالية)</TabsTrigger>
            <TabsTrigger value="projects">مشاريع ومهام</TabsTrigger>
          </TabsList>

          <TabsContent value="oryxa" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Database className="h-5 w-5" />
                  Oryxa Seed Data
                </CardTitle>
                <CardDescription>
                  يضيف 3-7 أيام من البيانات (03-05 نوفمبر 2025) تشمل:
                  <ul className="list-disc list-inside mt-2 space-y-1">
                    <li>أحداث يومية (مشي، عمل، نوم)</li>
                    <li>جلسة MMA يوم الأربعاء (لاختبار التعارضات)</li>
                    <li>دخل ومصروفات واقعية بالدرهم</li>
                    <li>بيانات صحة ونشاط (خطوات، نوم)</li>
                  </ul>
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-wrap gap-3">
                  <Button
                    onClick={() => handleOryxaSeed(3)}
                    disabled={loading || !user}
                  >
                    {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Database className="h-4 w-4 mr-2" />}
                    إضافة 3 أيام
                  </Button>

                  <Button
                    onClick={() => handleOryxaSeed(7)}
                    disabled={loading || !user}
                    variant="secondary"
                  >
                    {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Database className="h-4 w-4 mr-2" />}
                    إضافة 7 أيام
                  </Button>

                  <Button
                    onClick={handleOryxaRollback}
                    disabled={loading || !user}
                    variant="destructive"
                  >
                    {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Trash2 className="h-4 w-4 mr-2" />}
                    حذف البيانات
                  </Button>
                </div>

                {!user && (
                  <div className="flex items-center gap-2 p-3 rounded-lg bg-amber-50 dark:bg-amber-900/20 text-amber-900 dark:text-amber-200">
                    <AlertCircle className="h-5 w-5" />
                    <span className="text-sm">سجّل الدخول أولاً</span>
                  </div>
                )}

                {oryxaResult && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        {oryxaResult.error ? (
                          <>
                            <AlertCircle className="h-5 w-5 text-destructive" />
                            <span className="text-destructive">خطأ</span>
                          </>
                        ) : (
                          <>
                            <CheckCircle2 className="h-5 w-5 text-green-600" />
                            <span className="text-green-600">نجحت العملية</span>
                          </>
                        )}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {oryxaResult.error ? (
                        <p className="text-destructive">{oryxaResult.error}</p>
                      ) : (
                        <div className="space-y-2">
                          <p className="text-sm text-muted-foreground">{oryxaResult.message}</p>
                          {oryxaResult.results && (
                            <div className="grid grid-cols-3 gap-4 mt-4">
                              <div className="p-3 rounded-lg bg-muted">
                                <div className="text-2xl font-bold">{oryxaResult.results.events}</div>
                                <div className="text-xs text-muted-foreground">أحداث</div>
                              </div>
                              <div className="p-3 rounded-lg bg-muted">
                                <div className="text-2xl font-bold">{oryxaResult.results.financial || 0}</div>
                                <div className="text-xs text-muted-foreground">مالية</div>
                              </div>
                              <div className="p-3 rounded-lg bg-muted">
                                <div className="text-2xl font-bold">{oryxaResult.results.health || 0}</div>
                                <div className="text-xs text-muted-foreground">صحة</div>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>📝 ملاحظات</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm text-muted-foreground">
                <p>• جميع البيانات موسومة بـ <code className="px-1 py-0.5 rounded bg-muted">seed:oryxa-2025-11-03</code></p>
                <p>• الحذف آمن ولا يؤثر على بياناتك الأصلية</p>
                <p>• يمكنك إعادة الإدراج عدة مرات دون تكرار</p>
                <p>• البيانات تشمل روتينك الكامل: 05:00 فجر → 22:00 نوم</p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="projects" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>المشاريع والمهام</CardTitle>
                <CardDescription>
                  سيتم إضافة {projects.length} مشاريع و {tasks.length} مهمة تجريبية
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-3">
                  <Button
                    onClick={runProjectsSeed}
                    disabled={loading}
                  >
                    {loading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                    تشغيل Seed
                  </Button>

                  <Button
                    onClick={clearProjectsData}
                    disabled={loading}
                    variant="destructive"
                  >
                    مسح جميع البيانات
                  </Button>
                </div>

                {log.length > 0 && (
                  <div className="mt-4 p-4 rounded-lg bg-muted font-mono text-sm space-y-1 max-h-96 overflow-y-auto">
                    {log.map((line, i) => (
                      <div key={i}>{line}</div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>المشاريع المخطط لها</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm">
                  {projects.map((p, i) => (
                    <div key={i} className="border-b border-border pb-2 last:border-0">
                      <div className="font-medium">{p.name}</div>
                      <div className="text-muted-foreground">
                        {p.priority} • {p.target} • {p.deadline}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </Protected>
  );
};

export default Seed;

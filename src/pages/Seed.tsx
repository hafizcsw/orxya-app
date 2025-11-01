import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { track } from '@/lib/telemetry';
import { Loader2 } from 'lucide-react';

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
  const [loading, setLoading] = useState(false);
  const [log, setLog] = useState<string[]>([]);

  const addLog = (msg: string) => setLog(prev => [...prev, msg]);

  const runSeed = async () => {
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
          // Update tags separately (not supported in commands yet)
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

  const clearData = async () => {
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

      // Delete all tasks first (foreign key)
      const { error: tasksErr } = await supabase
        .from('tasks')
        .delete()
        .eq('owner_id', auth.user.id);

      if (tasksErr) {
        addLog(`❌ خطأ في حذف المهام: ${tasksErr.message}`);
      } else {
        addLog('✅ تم حذف المهام');
      }

      // Delete all projects
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
    <div className="container mx-auto p-4 md:p-6 space-y-6">
      <h1 className="text-3xl font-bold mb-6">بيانات تجريبية (Seed)</h1>

      <div className="rounded-2xl border border-border p-6 bg-card space-y-4">
        <div className="space-y-2">
          <h2 className="text-lg font-semibold">إضافة مشاريع ومهام نموذجية</h2>
          <p className="text-sm text-muted-foreground">
            سيتم إضافة {projects.length} مشاريع و {tasks.length} مهمة تجريبية
          </p>
        </div>

        <div className="flex gap-3">
          <button
            onClick={runSeed}
            disabled={loading}
            className="px-6 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            تشغيل Seed
          </button>

          <button
            onClick={clearData}
            disabled={loading}
            className="px-6 py-2 rounded-lg bg-destructive text-destructive-foreground hover:bg-destructive/90 transition-colors disabled:opacity-50"
          >
            مسح جميع البيانات
          </button>
        </div>

        {log.length > 0 && (
          <div className="mt-4 p-4 rounded-lg bg-muted font-mono text-sm space-y-1 max-h-96 overflow-y-auto">
            {log.map((line, i) => (
              <div key={i}>{line}</div>
            ))}
          </div>
        )}
      </div>

      <div className="rounded-2xl border border-border p-6 bg-card">
        <h2 className="text-lg font-semibold mb-3">المشاريع المخطط لها</h2>
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
      </div>
    </div>
  );
};

export default Seed;

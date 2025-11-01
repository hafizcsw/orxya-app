import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useUser } from '@/lib/auth';
import { enqueueCommand } from '@/lib/offline-actions';
import { genIdem } from '@/lib/sync';
import { track } from '@/lib/telemetry';
import type { Project, Task } from '@/types/project';
import { nextOrderPos, midpoint } from '@/lib/kanban';
import { Toast } from '@/components/Toast';

const statusCols: Array<Task['status']> = ['todo', 'doing', 'done'];
const statusLabel: Record<Task['status'], string> = {
  todo: 'To-Do',
  doing: 'Doing',
  done: 'Done',
};

export default function Projects() {
  const { user } = useUser();
  const [loading, setLoading] = useState(false);
  const [projects, setProjects] = useState<Project[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [pname, setPname] = useState('');
  const [tTitle, setTTitle] = useState('');
  const [tDue, setTDue] = useState<string>('');
  const [tInitStatus, setTInitStatus] = useState<Task['status']>('todo');
  const [toast, setToast] = useState<string | null>(null);
  const [draggedTask, setDraggedTask] = useState<Task | null>(null);

  async function loadProjects() {
    if (!user) { setProjects([]); return; }
    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .eq('owner_id', user.id)
      .order('created_at', { ascending: false })
      .limit(50);
    if (!error) setProjects((data ?? []) as Project[]);
  }

  async function loadTasks(project_id: string) {
    if (!user) { setTasks([]); return; }
    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .eq('owner_id', user.id)
      .eq('project_id', project_id)
      .order('status', { ascending: true })
      .order('order_pos', { ascending: true })
      .order('created_at', { ascending: true });
    if (!error) setTasks((data ?? []) as Task[]);
  }

  useEffect(() => { loadProjects(); }, [user?.id]);
  useEffect(() => { if (selected) loadTasks(selected); }, [user?.id, selected]);

  const grouped = useMemo(() => {
    const g: Record<Task['status'], Task[]> = { todo: [], doing: [], done: [] };
    for (const t of tasks) g[t.status].push(t);
    return g;
  }, [tasks]);

  async function sendCommand(command: string, payload: any, offlineMsg?: string): Promise<{ ok: boolean; data?: any }> {
    try {
      const { data, error } = await supabase.functions.invoke('commands', {
        body: { command, idempotency_key: genIdem(), payload },
      });
      if (error) throw error;
      setToast('تم الحفظ ✅');
      return { ok: true, data };
    } catch {
      await enqueueCommand(command as any, payload);
      if (offlineMsg) setToast(offlineMsg);
      return { ok: false };
    }
  }

  async function addProject() {
    if (!pname.trim()) return;
    setLoading(true);
    track('projects_add_project');
    const { ok, data } = await sendCommand('add_project', { title: pname.trim() },
      'حُفظ المشروع أوفلاين وسيُزامَن 🔄');
    setPname('');
    await loadProjects();
    if (ok && data?.saved_ids?.[0]) setSelected(data.saved_ids[0]);
    setLoading(false);
  }

  async function addTask() {
    if (!selected || !tTitle.trim()) return;
    setLoading(true);
    track('projects_add_task', { status: tInitStatus });
    const col = grouped[tInitStatus] ?? [];
    const order_pos = nextOrderPos(col);
    await sendCommand(
      'add_task',
      {
        project_id: selected,
        title: tTitle.trim(),
        status: tInitStatus,
        order_pos,
        due_date: tDue || null,
      },
      'حُفظت المهمة أوفلاين وسيُزامَن 🔄'
    );
    setTTitle(''); setTDue('');
    await loadTasks(selected);
    setLoading(false);
  }

  async function moveToStatus(t: Task, to: Task['status']) {
    if (!selected) return;
    track('projects_set_status', { to });
    const toList = grouped[to] ?? [];
    const new_order_pos = nextOrderPos(toList);
    await sendCommand(
      'move_task',
      { task_id: t.id, to_status: to, new_order_pos },
      'نُقلت المهمة أوفلاين وسيُزامَن 🔄'
    );
    await loadTasks(selected);
  }

  async function moveUpDown(t: Task, dir: 'up' | 'down') {
    const col = grouped[t.status] ?? [];
    const idx = col.findIndex(x => x.id === t.id);
    if (idx < 0) return;

    if (dir === 'up' && idx > 0) {
      const prev = col[idx - 1];
      const new_order_pos = midpoint(prev.order_pos, t.order_pos);
      await sendCommand('move_task',
        { task_id: t.id, to_status: t.status, new_order_pos },
        'أُعيد ترتيب المهمة أوفلاين 🔄');
      await loadTasks(selected!);
    }
    if (dir === 'down' && idx < col.length - 1) {
      const next = col[idx + 1];
      const new_order_pos = midpoint(t.order_pos, next.order_pos);
      await sendCommand('move_task',
        { task_id: t.id, to_status: t.status, new_order_pos },
        'أُعيد ترتيب المهمة أوفلاين 🔄');
      await loadTasks(selected!);
    }
  }

  // Drag & Drop handlers
  function handleDragStart(e: React.DragEvent, task: Task) {
    setDraggedTask(task);
    e.dataTransfer.effectAllowed = 'move';
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  }

  async function handleDrop(e: React.DragEvent, targetStatus: Task['status']) {
    e.preventDefault();
    if (!draggedTask || !selected) return;
    
    if (draggedTask.status !== targetStatus) {
      await moveToStatus(draggedTask, targetStatus);
    }
    setDraggedTask(null);
  }

  function handleDragEnd() {
    setDraggedTask(null);
  }

  return (
    <div className="container mx-auto p-4 space-y-6">
      <h1 className="text-3xl font-bold mb-6">المشاريع</h1>

      {!user && (
        <div className="p-4 rounded-lg bg-yellow-50 border border-yellow-200 text-yellow-900">
          سجّل الدخول لإدارة مشاريعك ومهامك.
        </div>
      )}

      {user && (
        <>
          {/* إضافة مشروع */}
          <div className="rounded-2xl border border-border p-6 bg-card space-y-4">
            <div className="font-semibold text-lg">إضافة مشروع</div>
            <div className="flex gap-3">
              <input
                className="flex-1 px-3 py-2 rounded-lg border border-input bg-background text-foreground"
                value={pname}
                onChange={e => setPname(e.target.value)}
                placeholder="اسم المشروع"
              />
              <button 
                className="px-6 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
                onClick={addProject} 
                disabled={loading || !pname.trim()}
              >
                {loading ? '...' : 'إضافة'}
              </button>
            </div>
          </div>

          {/* قائمة المشاريع */}
          <div className="rounded-2xl border border-border p-6 bg-card space-y-4">
            <div className="font-semibold text-lg">المشاريع</div>
            <div className="flex flex-wrap gap-2">
              {projects.length === 0 ? (
                <div className="text-muted-foreground">لا توجد مشاريع بعد.</div>
              ) : projects.map(p => (
                <button
                  key={p.id}
                  className={`px-4 py-2 rounded-lg border transition-colors ${
                    selected === p.id 
                      ? 'bg-primary text-primary-foreground border-primary' 
                      : 'bg-secondary text-secondary-foreground border-border hover:bg-secondary/80'
                  }`}
                  onClick={() => setSelected(p.id)}
                >
                  {p.title}
                </button>
              ))}
            </div>
          </div>

          {/* إضافة مهمة + كانبان */}
          {selected && (
            <>
              <div className="rounded-2xl border border-border p-6 bg-card space-y-4">
                <div className="font-semibold text-lg">إضافة مهمة</div>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                  <input
                    className="px-3 py-2 rounded-lg border border-input bg-background text-foreground"
                    value={tTitle}
                    onChange={e => setTTitle(e.target.value)}
                    placeholder="عنوان المهمة"
                  />
                  <select
                    className="px-3 py-2 rounded-lg border border-input bg-background text-foreground"
                    value={tInitStatus}
                    onChange={e => setTInitStatus(e.target.value as Task['status'])}
                  >
                    <option value="todo">To-Do</option>
                    <option value="doing">Doing</option>
                    <option value="done">Done</option>
                  </select>
                  <input
                    className="px-3 py-2 rounded-lg border border-input bg-background text-foreground"
                    type="date"
                    value={tDue}
                    onChange={e => setTDue(e.target.value)}
                  />
                  <button 
                    className="px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
                    onClick={addTask} 
                    disabled={!tTitle.trim()}
                  >
                    حفظ
                  </button>
                </div>
              </div>

              <div className="grid md:grid-cols-3 gap-4">
                {statusCols.map(col => (
                  <div 
                    key={col} 
                    className={`rounded-2xl border border-border p-4 bg-card space-y-3 transition-colors ${
                      draggedTask && draggedTask.status !== col ? 'ring-2 ring-primary/50' : ''
                    }`}
                    onDragOver={handleDragOver}
                    onDrop={(e) => handleDrop(e, col)}
                  >
                    <div className="font-semibold text-lg">{statusLabel[col]}</div>
                    <div className="space-y-3">
                      {(grouped[col] ?? []).map(t => (
                        <div 
                          key={t.id} 
                          draggable
                          onDragStart={(e) => handleDragStart(e, t)}
                          onDragEnd={handleDragEnd}
                          className={`border border-border rounded-xl p-4 bg-background space-y-3 cursor-move transition-all ${
                            draggedTask?.id === t.id ? 'opacity-50 scale-95' : 'hover:shadow-md'
                          }`}
                        >
                          <div className="font-medium">{t.title}</div>
                          <div className="text-sm text-muted-foreground">
                            {t.due_date ? `موعد: ${t.due_date}` : '—'}
                          </div>
                          <div className="flex gap-2 flex-wrap">
                            {col !== 'todo' && (
                              <button 
                                className="px-3 py-1 rounded-lg text-sm bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-colors"
                                onClick={() => moveToStatus(t, 'todo')}
                              >
                                ↤ To-Do
                              </button>
                            )}
                            {col !== 'doing' && (
                              <button 
                                className="px-3 py-1 rounded-lg text-sm bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-colors"
                                onClick={() => moveToStatus(t, 'doing')}
                              >
                                ↔ Doing
                              </button>
                            )}
                            {col !== 'done' && (
                              <button 
                                className="px-3 py-1 rounded-lg text-sm bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-colors"
                                onClick={() => moveToStatus(t, 'done')}
                              >
                                ↦ Done
                              </button>
                            )}
                            <button 
                              className="px-3 py-1 rounded-lg text-sm bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-colors"
                              onClick={() => moveUpDown(t, 'up')}
                            >
                              ↑
                            </button>
                            <button 
                              className="px-3 py-1 rounded-lg text-sm bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-colors"
                              onClick={() => moveUpDown(t, 'down')}
                            >
                              ↓
                            </button>
                          </div>
                        </div>
                      ))}
                      {grouped[col]?.length === 0 && (
                        <div className="text-muted-foreground text-sm text-center py-4">— لا مهام —</div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </>
      )}

      {toast && <Toast msg={toast} />}
    </div>
  );
}

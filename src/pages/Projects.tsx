import { useEffect, useMemo, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useUser } from '@/lib/auth';
import { enqueueCommand } from '@/lib/offline-actions';
import { genIdem } from '@/lib/sync';
import { track } from '@/lib/telemetry';
import type { Project, Task } from '@/types/project';
import { nextOrderPos, midpoint, normalizeOrder } from '@/lib/order';
import { throttle } from '@/lib/throttle';
import { Toast } from '@/components/Toast';

const statusCols: Array<Task['status']> = ['todo', 'doing', 'done'];
const statusLabel: Record<Task['status'], string> = {
  todo: 'To-Do',
  doing: 'Doing',
  done: 'Done',
};

type PendingOp = { snapshot: Task[]; desc: string };

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
  const [dropTarget, setDropTarget] = useState<{ status: Task['status']; beforeId: string | null } | null>(null);
  const [pendingOps, setPendingOps] = useState<PendingOp[]>([]);

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

  // Throttled reload to reduce server load
  const reloadTasks = useMemo(
    () => throttle(() => selected && loadTasks(selected), 250),
    [selected]
  );

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
    const { ok, data } = await sendCommand('add_project', { name: pname.trim() },
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

  // Helper: check if move is a no-op
  function isNoopMove(t: Task, to: Task['status'], newPos: number): boolean {
    const sameStatus = t.status === to;
    const posClose = Math.abs(Number(t.order_pos) - Number(newPos)) < 0.5;
    return sameStatus && posClose;
  }

  // Helper: smallest gap between consecutive tasks in a column
  function smallestGap(list: Task[]): number {
    if (!list || list.length < 2) return Infinity;
    const sorted = [...list].sort((a, b) => Number(a.order_pos) - Number(b.order_pos));
    let minGap = Infinity;
    for (let i = 1; i < sorted.length; i++) {
      const gap = Number(sorted[i].order_pos) - Number(sorted[i - 1].order_pos);
      if (gap < minGap) minGap = gap;
    }
    return minGap;
  }

  // Optimistic UI: apply local move immediately
  function applyLocalMove(taskId: string, to: Task['status'], newPos: number) {
    setTasks(prev => {
      const snapshot = [...prev];
      const list = [...prev];
      const idx = list.findIndex(t => t.id === taskId);
      if (idx < 0) return prev;

      const t = { ...list[idx] };
      list.splice(idx, 1);
      t.status = to;
      t.order_pos = newPos;

      const sameCol = list.filter(x => x.status === to).sort((a,b)=>Number(a.order_pos)-Number(b.order_pos));
      const insertIdx = sameCol.findIndex(x => Number(x.order_pos) > newPos);
      
      if (insertIdx === -1) {
        list.push(t);
      } else {
        const actualIdx = list.findIndex(x => x.id === sameCol[insertIdx].id);
        list.splice(actualIdx, 0, t);
      }

      setPendingOps(op => [{ snapshot, desc: 'move_task' }, ...op]);
      return list;
    });
  }

  // Rollback last optimistic operation
  function rollbackLastOp() {
    setPendingOps(op => {
      if (!op.length) return op;
      const [last, ...rest] = op;
      setTasks(last.snapshot);
      return rest;
    });
  }

  // Normalize column order positions when gaps become too small
  async function normalizeColumn(status: Task['status']) {
    const col = (grouped[status] ?? []).slice().sort((a, b) => Number(a.order_pos) - Number(b.order_pos));
    const patches = normalizeOrder(col);
    
    for (const p of patches) {
      await sendCommand('move_task', 
        { task_id: p.id, to_status: status, new_order_pos: p.order_pos },
        undefined
      );
    }
    
    track('kanban_normalized', { status, count: patches.length });
    reloadTasks();
  }

  // Precise drop handler with optimistic UI
  async function handleDropPrecise(toStatus: Task['status'], beforeId: string | null) {
    if (!draggedTask || !selected) return;
    
    const col = (grouped[toStatus] ?? []).slice().sort((a, b) => Number(a.order_pos) - Number(b.order_pos));
    let new_order_pos: number;

    if (beforeId === null) {
      new_order_pos = nextOrderPos(col);
    } else {
      const idx = col.findIndex(t => t.id === beforeId);
      if (idx === -1) {
        new_order_pos = nextOrderPos(col);
      } else if (idx === 0) {
        const first = col[0];
        new_order_pos = midpoint(Number(first.order_pos) - 1000, Number(first.order_pos));
      } else {
        const prev = col[idx - 1];
        const next = col[idx];
        new_order_pos = midpoint(Number(prev.order_pos), Number(next.order_pos));
      }
    }

    // Prevent no-op moves
    if (isNoopMove(draggedTask, toStatus, new_order_pos)) {
      track('kanban_noop', { task_id: draggedTask.id });
      setDraggedTask(null);
      setDropTarget(null);
      return;
    }

    // Apply optimistic UI update
    const taskToMove = draggedTask;
    applyLocalMove(draggedTask.id, toStatus, new_order_pos);
    setDraggedTask(null);
    setDropTarget(null);

    // Send to server
    const { ok } = await sendCommand('move_task', 
      { task_id: taskToMove.id, to_status: toStatus, new_order_pos },
      'نُقلت المهمة أوفلاين وسيُزامَن 🔄'
    );

    if (!ok) {
      rollbackLastOp();
      setToast('تعذّر الحفظ، تم التراجع ↩️');
      track('kanban_undo', { reason: 'network' });
      return;
    }

    // Throttled reload + auto-normalize if needed
    reloadTasks();

    const updatedCol = await supabase
      .from('tasks')
      .select('*')
      .eq('project_id', selected)
      .eq('status', toStatus)
      .order('order_pos');
    
    if (updatedCol.data && smallestGap(updatedCol.data as Task[]) < 1) {
      await normalizeColumn(toStatus);
    }

    track('kanban_drop_opt', {
      project_id: selected,
      task_id: taskToMove.id,
      to_status: toStatus,
      before_id: beforeId,
    });
  }

  // Legacy drag handlers (keep for column-level drops)
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

  // DropZone component with visual highlighting
  function DropZone({ 
    status, 
    beforeId 
  }: { 
    status: Task['status']; 
    beforeId: string | null;
  }) {
    const active = dropTarget && dropTarget.status === status && dropTarget.beforeId === beforeId;
    return (
      <div
        onDragEnter={(e) => { 
          e.preventDefault(); 
          setDropTarget({ status, beforeId }); 
        }}
        onDragOver={(e) => e.preventDefault()}
        onDragLeave={() => setDropTarget(null)}
        onDrop={(e) => {
          e.preventDefault();
          handleDropPrecise(status, beforeId);
        }}
        className={`h-2 my-1 rounded transition-all ${
          active ? 'bg-blue-500/60 h-2.5' : 'bg-blue-200/30 hover:bg-blue-400/50'
        }`}
      />
    );
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
                  {p.name}
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
                    <div className="flex items-center justify-between mb-2">
                      <div className="font-semibold text-lg">{statusLabel[col]}</div>
                      <div className="text-xs px-2 py-0.5 rounded bg-muted">{(grouped[col] ?? []).length} مهام</div>
                    </div>
                    <div className="space-y-2">
                      {(grouped[col] ?? []).length === 0 ? (
                        <>
                          <DropZone status={col} beforeId={null} />
                          <div className="text-sm text-muted-foreground py-4 text-center">— لا مهام —</div>
                          <DropZone status={col} beforeId={null} />
                        </>
                      ) : (
                        <>
                          {/* Drop zone at top */}
                          <DropZone status={col} beforeId={(grouped[col] ?? [])[0]?.id ?? null} />
                          
                          {(grouped[col] ?? []).map((t, idx, arr) => (
                            <div key={t.id}>
                              <div 
                                draggable
                                onDragStart={(e) => handleDragStart(e, t)}
                                onDragEnd={handleDragEnd}
                                className={`border border-border rounded-xl p-4 bg-background space-y-3 cursor-grab active:cursor-grabbing transition-all ${
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
                                  {idx > 0 && (
                                    <button 
                                      className="px-3 py-1 rounded-lg text-sm bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-colors"
                                      onClick={() => moveUpDown(t, 'up')}
                                    >
                                      ↑
                                    </button>
                                  )}
                                  {idx < arr.length - 1 && (
                                    <button 
                                      className="px-3 py-1 rounded-lg text-sm bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-colors"
                                      onClick={() => moveUpDown(t, 'down')}
                                    >
                                      ↓
                                    </button>
                                  )}
                                </div>
                              </div>
                              
                              {/* Drop zone between tasks */}
                              <DropZone status={col} beforeId={arr[idx + 1]?.id ?? null} />
                            </div>
                          ))}
                        </>
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

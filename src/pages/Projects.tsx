import { useEffect, useMemo, useState, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useUser } from '@/lib/auth';
import { enqueueCommand } from '@/lib/offline-actions';
import { genIdem } from '@/lib/sync';
import { track } from '@/lib/telemetry';
import type { Project, Task } from '@/types/project';
import { nextOrderPos, midpoint, normalizeOrder } from '@/lib/order';
import { throttle } from '@/lib/throttle';
import { Toast } from '@/components/Toast';
import { useIsMobile } from '@/hooks/use-mobile';
import { ChevronLeft, ChevronRight, Search, Filter, X, Calendar, Tag, AlertCircle, Clock, Download } from 'lucide-react';
import { KeyboardHelp } from '@/components/KeyboardHelp';
import { AIAssistPanel } from '@/components/AIAssistPanel';
import { exportProjectsToJSON, exportSingleProjectToJSON } from '@/lib/export';
import EmptyState from '@/components/EmptyState';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { CardSkeleton } from '@/components/ui/skeleton';
import Spinner from '@/components/ui/Spinner';
import { useNotify } from '@/lib/notify-utils';
import { copy } from '@/lib/copy';
import { aiAsk, getAIConsents, setAIConsentsPreset, computeAIStatus, type AIConsents } from '@/lib/ai';

const statusCols: Array<Task['status']> = ['todo', 'doing', 'done'];
const statusLabel: Record<Task['status'], string> = {
  todo: 'To-Do',
  doing: 'Doing',
  done: 'Done',
};

type PendingOp = { snapshot: Task[]; desc: string };

export default function Projects() {
  const { user } = useUser();
  const isMobile = useIsMobile();
  const notify = useNotify();
  const [loading, setLoading] = useState(false);
  const [projects, setProjects] = useState<Project[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [pname, setPname] = useState('');
  const [tTitle, setTTitle] = useState('');
  const [tDue, setTDue] = useState<string>('');
  const [tInitStatus, setTInitStatus] = useState<Task['status']>('todo');
  const [draggedTask, setDraggedTask] = useState<Task | null>(null);
  const [dropTarget, setDropTarget] = useState<{ status: Task['status']; beforeId: string | null } | null>(null);
  const [pendingOps, setPendingOps] = useState<PendingOp[]>([]);
  const [mobileColumn, setMobileColumn] = useState<Task['status']>('todo');
  const [normalizing, setNormalizing] = useState<Record<Task['status'], boolean>>({ 
    todo: false, 
    doing: false, 
    done: false 
  });

  // AI states
  const [aiText, setAIText] = useState("");
  const [aiBusy, setAIBusy] = useState(false);
  const [aiReply, setAIReply] = useState<string|null>(null);
  const [aiCons, setAICons] = useState<AIConsents | null>(null);
  const [aiBarMsg, setAIBarMsg] = useState<string>("");

  // Filter states
  const [q, setQ] = useState('');
  const [fStatuses, setFStatuses] = useState<Task['status'][]>(['todo', 'doing', 'done']);
  const [fOnlyToday, setFOnlyToday] = useState(false);
  const [fOnlyOverdue, setFOnlyOverdue] = useState(false);
  const [fFrom, setFFrom] = useState<string>('');
  const [fTo, setFTo] = useState<string>('');
  const [showFilters, setShowFilters] = useState(false);
  const [showKeyboardHelp, setShowKeyboardHelp] = useState(false);
  const [showAIPanel, setShowAIPanel] = useState(false);

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
    setLoading(true);
    
    // Show skeleton while loading
    const tempLoading = true;
    
    // Try loading from cache first
    const cacheKey = `oryxa:tasks:${project_id}:v2`;
    try {
      const cached = localStorage.getItem(cacheKey);
      if (cached) {
        const parsedCache = JSON.parse(cached);
        if (parsedCache.timestamp && Date.now() - parsedCache.timestamp < 5000) {
          setTasks(parsedCache.tasks);
          setLoading(false);
        }
      }
    } catch (e) {
      // Ignore cache errors
    }

    let query = supabase
      .from('tasks')
      .select('*')
      .eq('owner_id', user.id)
      .eq('project_id', project_id);

    // Apply filters
    if (fStatuses.length && fStatuses.length < 3) {
      query = query.in('status', fStatuses);
    }

    // Text search
    if (q.trim()) {
      query = query.ilike('title', `%${q.trim()}%`);
    }

    // Date filters
    const todayISO = new Date().toISOString().slice(0, 10);
    if (fOnlyToday) {
      query = query.eq('due_date', todayISO);
    }
    if (fOnlyOverdue) {
      query = query.lt('due_date', todayISO).neq('status', 'done');
    }
    if (fFrom) query = query.gte('due_date', fFrom);
    if (fTo) query = query.lte('due_date', fTo);

    // Order
    query = query
      .order('status', { ascending: true })
      .order('order_pos', { ascending: true })
      .order('created_at', { ascending: true });

    const { data, error } = await query;
    
    if (!error) {
      const tasksData = (data ?? []) as Task[];
      setTasks(tasksData);
      
      // Update cache
      try {
        localStorage.setItem(cacheKey, JSON.stringify({
          tasks: tasksData,
          timestamp: Date.now()
        }));
      } catch (e) {
        // Ignore cache errors
      }
      
      track('tasks_loaded', { 
        count: tasksData.length, 
        from_cache: false,
        filtered: q.trim() !== '' || fOnlyToday || fOnlyOverdue || fFrom !== '' || fTo !== ''
      });
    }
    
    setLoading(false);
  }

  // Throttled reload to reduce server load
  const reloadTasks = useMemo(
    () => throttle(() => selected && loadTasks(selected), 250),
    [selected, q, fStatuses, fOnlyToday, fOnlyOverdue, fFrom, fTo]
  );

  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { loadProjects(); }, [user?.id]);
  
  useEffect(() => {
    (async () => {
      const c = await getAIConsents();
      if (c) setAICons(c as any);
    })();
  }, [user?.id]);

  useEffect(() => {
    if (selected) loadTasks(selected); 
  }, [user?.id, selected, q, fStatuses, fOnlyToday, fOnlyOverdue, fFrom, fTo]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Check if user is typing in an input
      const isInputFocused = document.activeElement?.tagName === 'INPUT' || 
                            document.activeElement?.tagName === 'TEXTAREA';
      
      if (e.key === '?' && !isInputFocused) {
        e.preventDefault();
        setShowKeyboardHelp(prev => !prev);
        track('kb_help_toggle');
      }
      
      if (e.key === 'Escape') {
        setShowKeyboardHelp(false);
        setShowFilters(false);
      }
      
      if (e.key === '/' && !isInputFocused) {
        e.preventDefault();
        searchInputRef.current?.focus();
        track('kb_focus_search');
      }
      
      if (e.key === 'n' && !isInputFocused) {
        e.preventDefault();
        document.querySelector<HTMLInputElement>('input[placeholder="عنوان المهمة"]')?.focus();
        track('kb_new_task');
      }
      
      if (['1', '2', '3'].includes(e.key) && !isInputFocused) {
        e.preventDefault();
        const statusMap = { '1': 'todo', '2': 'doing', '3': 'done' } as const;
        setMobileColumn(statusMap[e.key as '1' | '2' | '3']);
        track('kb_switch_col', { column: statusMap[e.key as '1' | '2' | '3'] });
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const grouped = useMemo(() => {
    const g: Record<Task['status'], Task[]> = { todo: [], doing: [], done: [] };
    for (const t of tasks) g[t.status].push(t);
    return g;
  }, [tasks]);

  // Helper: check if task is overdue or today
  const isOverdue = (task: Task) => {
    if (!task.due_date || task.status === 'done') return false;
    const today = new Date().toISOString().slice(0, 10);
    return task.due_date < today;
  };

  const isToday = (task: Task) => {
    if (!task.due_date) return false;
    const today = new Date().toISOString().slice(0, 10);
    return task.due_date === today;
  };

  // Column stats
  const columnStats = useMemo(() => {
    const stats: Record<Task['status'], { total: number; overdue: number; today: number }> = {
      todo: { total: 0, overdue: 0, today: 0 },
      doing: { total: 0, overdue: 0, today: 0 },
      done: { total: 0, overdue: 0, today: 0 }
    };
    
    for (const task of tasks) {
      stats[task.status].total++;
      if (isOverdue(task)) stats[task.status].overdue++;
      if (isToday(task)) stats[task.status].today++;
    }
    
    return stats;
  }, [tasks]);

  async function sendCommand(command: string, payload: any, offlineMsg?: string): Promise<{ ok: boolean; data?: any }> {
    try {
      const { data, error } = await supabase.functions.invoke('commands', {
        body: { command, idempotency_key: genIdem(), payload },
      });
      if (error) throw error;
      notify.success(copy.saved);
      return { ok: true, data };
    } catch {
      await enqueueCommand(command as any, payload);
      if (offlineMsg) notify.info(offlineMsg);
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

      // Limit pendingOps to last 20 operations to prevent memory bloat
      setPendingOps(op => [{ snapshot, desc: 'move_task' }, ...op].slice(0, 20));
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
    // Prevent concurrent normalization
    if (normalizing[status]) return;
    
    setNormalizing(s => ({ ...s, [status]: true }));
    
    try {
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
    } finally {
      setNormalizing(s => ({ ...s, [status]: false }));
    }
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
      notify.error(copy.undo);
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
        className={`h-2 my-1 rounded-2xl transition-all ${
          active ? 'bg-primary/80 h-2.5 shadow-[0_0_0_2px_rgba(255,255,255,.6)_inset]' : 'bg-primary/20 hover:bg-primary/40'
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
              <Button 
                variant="default"
                onClick={addProject} 
                disabled={loading || !pname.trim()}
              >
                {loading ? <Spinner className="mr-2" /> : null}
                {loading ? 'جارٍ...' : 'إضافة'}
              </Button>
            </div>
          </div>

          {/* قائمة المشاريع */}
          <div className="rounded-2xl border border-border p-6 bg-card space-y-4">
            <div className="flex items-center justify-between">
              <div className="font-semibold text-lg">المشاريع</div>
              {projects.length > 0 && (
                <button
                  onClick={() => {
                    exportProjectsToJSON(projects, tasks);
                    track('projects_export_all');
                  }}
                  className="px-3 py-1.5 rounded-lg text-sm bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-colors flex items-center gap-2"
                >
                  <Download className="h-4 w-4" />
                  تصدير JSON
                </button>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              {projects.length === 0 ? (
                <EmptyState
                  title="لا توجد مشاريع بعد"
                  hint="ابدأ بإضافة مشروع جديد لتنظيم مهامك."
                  cta={
                    <button
                      onClick={() => document.querySelector<HTMLInputElement>('input[placeholder="اسم المشروع"]')?.focus()}
                      className="px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
                    >
                      + مشروع جديد
                    </button>
                  }
                />
              ) : projects.map(p => (
                <button
                  key={p.id}
                  className={`px-4 py-2 rounded-lg border transition-colors compact-py compact-px ${
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


          {/* Search and Filters - Only show when project is selected */}
          {selected && (
            <div className="rounded-2xl border border-border p-6 bg-card space-y-4">
              <div className="flex items-center gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <input
                    ref={searchInputRef}
                    type="text"
                    value={q}
                    onChange={(e) => {
                      setQ(e.target.value);
                      track('tasks_search', { query: e.target.value });
                    }}
                    placeholder="بحث في المهام..."
                    className="w-full pl-10 pr-3 py-2 rounded-lg border border-input bg-background text-foreground"
                  />
                </div>
                
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className={`px-4 py-2 rounded-lg border transition-colors flex items-center gap-2 ${
                    showFilters ? 'bg-primary text-primary-foreground border-primary' : 'bg-secondary text-secondary-foreground border-border hover:bg-secondary/80'
                  }`}
                >
                  <Filter className="h-4 w-4" />
                  {!isMobile && 'فلاتر'}
                </button>
              </div>

              {/* Filters Panel */}
              {showFilters && (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 pt-4 border-t border-border">
                  {/* Status filters */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium">الحالة</label>
                    <div className="flex flex-wrap gap-2">
                      {(['todo', 'doing', 'done'] as const).map(status => (
                        <button
                          key={status}
                          onClick={() => {
                            setFStatuses(prev => 
                              prev.includes(status) 
                                ? prev.filter(s => s !== status)
                                : [...prev, status]
                            );
                            track('tasks_filter_status', { status, active: !fStatuses.includes(status) });
                          }}
                          className={`px-3 py-1 rounded-lg text-sm transition-colors ${
                            fStatuses.includes(status)
                              ? 'bg-primary text-primary-foreground'
                              : 'bg-muted text-muted-foreground hover:bg-muted/80'
                          }`}
                        >
                          {statusLabel[status]}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Quick filters */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium">سريع</label>
                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={() => {
                          setFOnlyToday(!fOnlyToday);
                          if (!fOnlyToday) setFOnlyOverdue(false);
                          track('tasks_filter_today', { active: !fOnlyToday });
                        }}
                        className={`px-3 py-1 rounded-lg text-sm flex items-center gap-1 transition-colors ${
                          fOnlyToday
                            ? 'bg-blue-500 text-white'
                            : 'bg-muted text-muted-foreground hover:bg-muted/80'
                        }`}
                      >
                        <Clock className="h-3 w-3" />
                        اليوم
                      </button>
                      
                      <button
                        onClick={() => {
                          setFOnlyOverdue(!fOnlyOverdue);
                          if (!fOnlyOverdue) setFOnlyToday(false);
                          track('tasks_filter_overdue', { active: !fOnlyOverdue });
                        }}
                        className={`px-3 py-1 rounded-lg text-sm flex items-center gap-1 transition-colors ${
                          fOnlyOverdue
                            ? 'bg-red-500 text-white'
                            : 'bg-muted text-muted-foreground hover:bg-muted/80'
                        }`}
                      >
                        <AlertCircle className="h-3 w-3" />
                        متأخرة
                      </button>
                    </div>
                  </div>

                  {/* Date range */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium">المدى الزمني</label>
                    <div className="flex gap-2">
                      <input
                        type="date"
                        value={fFrom}
                        onChange={(e) => {
                          setFFrom(e.target.value);
                          track('tasks_filter_date_from', { date: e.target.value });
                        }}
                        className="flex-1 px-2 py-1 text-sm rounded-lg border border-input bg-background"
                        placeholder="من"
                      />
                      <input
                        type="date"
                        value={fTo}
                        onChange={(e) => {
                          setFTo(e.target.value);
                          track('tasks_filter_date_to', { date: e.target.value });
                        }}
                        className="flex-1 px-2 py-1 text-sm rounded-lg border border-input bg-background"
                        placeholder="إلى"
                      />
                    </div>
                  </div>

                  {/* Clear filters */}
                  <div className="sm:col-span-2 md:col-span-3 flex justify-end">
                     <button
                      onClick={() => {
                        setQ('');
                        setFStatuses(['todo', 'doing', 'done']);
                        setFOnlyToday(false);
                        setFOnlyOverdue(false);
                        setFFrom('');
                        setFTo('');
                        track('tasks_filters_clear');
                      }}
                      className="text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
                    >
                      <X className="h-3 w-3" />
                      مسح الكل
                    </button>
                    {selected && (
                      <button 
                        onClick={() => { setShowAIPanel(true); track('ai_panel_open'); }} 
                        className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-purple-500 to-blue-500 text-white hover:opacity-90 transition-opacity flex items-center gap-2"
                        title="مساعد الذكاء الاصطناعي"
                      >
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z"/>
                        </svg>
                        <span className="text-sm font-medium">AI</span>
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* Results count */}
              <div className="text-sm text-muted-foreground">
                {tasks.length} {tasks.length === 1 ? 'مهمة' : 'مهام'}
                {(q || fOnlyToday || fOnlyOverdue || fFrom || fTo) && ' (مُفلتَرة)'}
              </div>
            </div>
          )}

          {/* إضافة مهمة + كانبان */}
          {selected && (
            <>
              {/* شريط حالة الأذونات */}
              <div className="mb-3 p-3 border rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3 flex-wrap">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                    computeAIStatus(aiCons) === "on" ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200" :
                    computeAIStatus(aiCons) === "limited" ? "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200" :
                    "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300"
                  }`}>
                    🤖 الذكاء: {computeAIStatus(aiCons) === "on" ? "مُفعّل" : computeAIStatus(aiCons) === "limited" ? "مقيّد" : "مقفول"}
                  </span>
                  {aiCons && (
                    <div className="hidden sm:flex items-center gap-2 text-xs">
                      <span className={`px-2 py-0.5 rounded ${aiCons.consent_read_calendar ? "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200" : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400"}`}>
                        قراءة التقويم
                      </span>
                      <span className={`px-2 py-0.5 rounded ${aiCons.consent_write_calendar ? "bg-violet-100 text-violet-800 dark:bg-violet-900 dark:text-violet-200" : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400"}`}>
                        كتابة التقويم
                      </span>
                      <span className={`px-2 py-0.5 rounded ${aiCons.consent_write_tasks ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200" : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400"}`}>
                        إنشاء المهام
                      </span>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    className="px-3 py-1.5 rounded-lg border border-border hover:bg-secondary text-sm transition-colors"
                    onClick={async () => {
                      const ok = await setAIConsentsPreset("all_on");
                      if (ok.ok) {
                        const c = await getAIConsents();
                        setAICons(c as any);
                        setAIBarMsg("تم تفعيل جميع الأذونات ✅");
                        setTimeout(() => setAIBarMsg(""), 3000);
                      } else setAIBarMsg("تعذّر التفعيل");
                    }}
                  >
                    تشغيل الكل
                  </button>
                  <button
                    className="px-3 py-1.5 rounded-lg border border-border hover:bg-secondary text-sm transition-colors"
                    onClick={async () => {
                      const ok = await setAIConsentsPreset("all_off");
                      if (ok.ok) {
                        const c = await getAIConsents();
                        setAICons(c as any);
                        setAIBarMsg("تم إيقاف الذكاء كاملاً ⏹️");
                        setTimeout(() => setAIBarMsg(""), 3000);
                      } else setAIBarMsg("تعذّر الإيقاف");
                    }}
                  >
                    إيقاف الكل
                  </button>
                  <a
                    href="/profile"
                    className="px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-sm hover:opacity-90 transition-opacity"
                  >
                    الإعدادات
                  </a>
                </div>
              </div>
              {aiBarMsg && <div className="mb-2 text-sm text-muted-foreground">{aiBarMsg}</div>}

              {/* ذكاء المهام للمشروع */}
              <div className="rounded-2xl border border-border p-6 bg-card space-y-4">
                <div className="font-semibold text-lg">توليد مهام بالذكاء للمشروع المحدّد</div>
                <textarea
                  value={aiText}
                  onChange={(e)=>setAIText(e.target.value)}
                  placeholder="اكتب ما تريد تنظيمه… مثال: 'قسّم خطة الأسبوع إلى مهام يومية قصيرة مع مواعيد نهائية قبل صلاة العشاء.'"
                  className="w-full min-h-[90px] px-3 py-2 rounded-xl border border-input bg-background"
                />
                <div className="flex items-center gap-2 flex-wrap">
                  <Button
                    variant="default"
                    disabled={!aiText.trim() || !selected || aiBusy}
                    onClick={async ()=>{
                      if (!selected) return;
                      if (!aiCons?.consent_write_tasks) {
                        notify.error("⚠️ إنشاء المهام متوقف. استخدم شريط الأذونات لتفعيله أو افتح الإعدادات.");
                        return;
                      }
                      setAIBusy(true); setAIReply(null);
                      const m = aiText.trim() + `\n\n[context] استخدم project_id=${selected} لأي مهام مناسبة. تأكد من إضافة due_date حيث يمكن.`;
                      const res = await aiAsk(m, { context_project_id: selected });
                      setAIBusy(false);
                      if (!res.ok) { notify.error("فشل توليد المهام"); return; }
                      setAIReply(res.reply || "تمت المعالجة.");
                      setAIText("");
                      if (selected) await loadTasks(selected);
                    }}
                  >
                    {aiBusy ? <><Spinner className="h-4 w-4 mr-2" /> جارٍ التوليد…</> : "استخدم الذكاء"}
                  </Button>
                  {aiReply && <div className="text-sm text-muted-foreground">{aiReply}</div>}
                </div>
                <div className="text-xs text-muted-foreground">
                  * سيحترم النظام أذوناتك من الإعدادات (إنشاء مهام/أحداث، قراءة/كتابة التقويم).
                </div>
              </div>

              <div className="rounded-2xl border border-border p-6 bg-card space-y-4">
                <div className="flex items-center justify-between">
                  <div className="font-semibold text-lg">إضافة مهمة</div>
                  {tasks.length > 0 && (
                    <button
                      onClick={() => {
                        const project = projects.find(p => p.id === selected);
                        if (project) {
                          exportSingleProjectToJSON(project, tasks);
                          track('projects_export_single', { project_id: selected });
                        }
                      }}
                      className="px-3 py-1.5 rounded-lg text-sm bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-colors flex items-center gap-2"
                    >
                      <Download className="h-4 w-4" />
                      {!isMobile && 'تصدير المشروع'}
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
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

              {/* Kanban Board - Mobile: Single Column with Navigation */}
              {isMobile ? (
                <div className="space-y-4">
                  {/* Mobile Column Selector */}
                  <div className="flex items-center justify-between gap-2 bg-card rounded-2xl border border-border p-4">
                    <button
                      onClick={() => {
                        const idx = statusCols.indexOf(mobileColumn);
                        setMobileColumn(statusCols[idx > 0 ? idx - 1 : statusCols.length - 1]);
                      }}
                      className="p-2 hover:bg-accent rounded-lg transition-colors"
                    >
                      <ChevronRight className="h-5 w-5" />
                    </button>
                    
                    <div className="flex-1 text-center">
                      <div className="font-semibold text-lg">{statusLabel[mobileColumn]}</div>
                      <div className="text-xs text-muted-foreground mt-1">
                        {(grouped[mobileColumn] ?? []).length} مهام
                      </div>
                    </div>
                    
                    <button
                      onClick={() => {
                        const idx = statusCols.indexOf(mobileColumn);
                        setMobileColumn(statusCols[(idx + 1) % statusCols.length]);
                      }}
                      className="p-2 hover:bg-accent rounded-lg transition-colors"
                    >
                      <ChevronLeft className="h-5 w-5" />
                    </button>
                  </div>

                  {/* Mobile Column Content */}
                  <div className="rounded-2xl border border-border p-4 bg-card space-y-3 min-h-[400px]">
                    {loading ? (
                      <div className="space-y-2">
                        <CardSkeleton />
                        <CardSkeleton />
                        <CardSkeleton />
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {(grouped[mobileColumn] ?? []).length === 0 ? (
                          <div className="text-sm text-muted-foreground py-8 text-center">— لا مهام —</div>
                        ) : (
                          (grouped[mobileColumn] ?? []).map((t, idx, arr) => (
                            <div 
                              key={t.id}
                              className="border border-border rounded-xl p-4 bg-background space-y-3"
                            >
                              <div className="flex items-start justify-between gap-2">
                                <div className="font-medium flex-1">{t.title}</div>
                                {isOverdue(t) && (
                                  <span className="text-xs px-2 py-1 rounded bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300 flex items-center gap-1">
                                    <AlertCircle className="h-3 w-3" />
                                    متأخرة
                                  </span>
                                )}
                                {!isOverdue(t) && isToday(t) && (
                                  <span className="text-xs px-2 py-1 rounded bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 flex items-center gap-1">
                                    <Clock className="h-3 w-3" />
                                    اليوم
                                  </span>
                                )}
                              </div>
                              <div className="text-sm text-muted-foreground flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                {t.due_date || '—'}
                              </div>
                              <div className="flex gap-2 flex-wrap">
                                {mobileColumn !== 'todo' && (
                                  <button 
                                    className="px-3 py-1.5 rounded-lg text-sm bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-colors"
                                    onClick={() => moveToStatus(t, 'todo')}
                                  >
                                    ← To-Do
                                  </button>
                                )}
                                {mobileColumn !== 'doing' && (
                                  <button 
                                    className="px-3 py-1.5 rounded-lg text-sm bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-colors"
                                    onClick={() => moveToStatus(t, 'doing')}
                                  >
                                    ↔ Doing
                                  </button>
                                )}
                                {mobileColumn !== 'done' && (
                                  <button 
                                    className="px-3 py-1.5 rounded-lg text-sm bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-colors"
                                    onClick={() => moveToStatus(t, 'done')}
                                  >
                                    → Done
                                  </button>
                                )}
                                {idx > 0 && (
                                  <button 
                                    className="px-3 py-1.5 rounded-lg text-sm bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-colors"
                                    onClick={() => moveUpDown(t, 'up')}
                                  >
                                    ↑
                                  </button>
                                )}
                                {idx < arr.length - 1 && (
                                  <button 
                                    className="px-3 py-1.5 rounded-lg text-sm bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-colors"
                                    onClick={() => moveUpDown(t, 'down')}
                                  >
                                    ↓
                                  </button>
                                )}
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                /* Desktop: 3-Column Kanban */
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
                        <div className="flex items-center gap-2 text-xs">
                          <span className="px-2 py-0.5 rounded bg-muted">
                            {columnStats[col].total}
                          </span>
                          {columnStats[col].overdue > 0 && (
                            <span className="px-2 py-0.5 rounded bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300">
                              🔴 {columnStats[col].overdue}
                            </span>
                          )}
                          {columnStats[col].today > 0 && (
                            <span className="px-2 py-0.5 rounded bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
                              🔵 {columnStats[col].today}
                            </span>
                          )}
                        </div>
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
                            
                            <AnimatePresence initial={false}>
                              {(grouped[col] ?? []).map((t, idx, arr) => (
                                <div key={t.id}>
                                  <motion.div
                                    layout
                                    initial={{ opacity: 0.8, scale: 0.98 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.98 }}
                                    transition={{ type: 'spring', stiffness: 280, damping: 24, mass: 0.6 }}
                                    className={`border border-border rounded-xl p-4 bg-background space-y-3 cursor-grab active:cursor-grabbing transition-all compact-py compact-px compact-text ${
                                      draggedTask?.id === t.id ? 'opacity-50 scale-95' : 'hover:shadow-md'
                                    }`}
                                  >
                                    <div
                                      draggable
                                      onDragStart={(e) => handleDragStart(e as any, t)}
                                      onDragEnd={handleDragEnd}
                                      className="cursor-grab active:cursor-grabbing w-full"
                                    >
                                      <div className="flex items-start justify-between gap-2">
                                    <div className="font-medium flex-1">{t.title}</div>
                                    {isOverdue(t) && (
                                      <span className="text-xs px-2 py-1 rounded bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300 flex items-center gap-1">
                                        <AlertCircle className="h-3 w-3" />
                                        متأخرة
                                      </span>
                                    )}
                                    {!isOverdue(t) && isToday(t) && (
                                      <span className="text-xs px-2 py-1 rounded bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 flex items-center gap-1">
                                        <Clock className="h-3 w-3" />
                                        اليوم
                                      </span>
                                    )}
                                  </div>
                                  <div className="text-sm text-muted-foreground flex items-center gap-1">
                                    <Calendar className="h-3 w-3" />
                                    {t.due_date || '—'}
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
                                  </motion.div>
                                  
                                  {/* Drop zone between tasks */}
                                  {idx < arr.length - 1 && (
                                    <DropZone status={col} beforeId={arr[idx + 1]?.id ?? null} />
                                  )}
                                </div>
                              ))}
                            </AnimatePresence>
                            
                            {/* Drop zone at bottom */}
                            <DropZone status={col} beforeId={null} />
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </>
      )}

      {showKeyboardHelp && <KeyboardHelp onClose={() => setShowKeyboardHelp(false)} />}
      {showAIPanel && selected && (
        <AIAssistPanel 
          projectId={selected} 
          onClose={() => setShowAIPanel(false)}
          onTasksCreated={() => { reloadTasks(); setShowAIPanel(false); }}
        />
      )}
    </div>
  );
}

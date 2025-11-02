import { useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useUser } from '@/lib/auth';
import { track } from '@/lib/telemetry';
import { Button } from '@/components/ui/button';
import CalendarEventModal from '@/components/CalendarEventModal';

type Ev = {
  id: string;
  title: string | null;
  starts_at: string;
  ends_at: string | null;
  source_id: 'local' | 'google' | 'ai';
  description: string | null;
};

type PT = {
  fajr: string | null;
  dhuhr: string | null;
  asr: string | null;
  maghrib: string | null;
  isha: string | null;
};

function dayISO(d: Date) {
  return d.toISOString().slice(0, 10);
}

function toLocalHM(iso: string) {
  const dt = new Date(iso);
  return dt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export default function CalendarSimplePage() {
  const { user } = useUser();
  const [view, setView] = useState<'day' | 'week'>('day');
  const [cursor, setCursor] = useState<Date>(new Date());
  const [events, setEvents] = useState<Ev[]>([]);
  const [pt, setPT] = useState<PT | null>(null);
  const [conflictsCount, setConflictsCount] = useState<number>(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const [qaTitle, setQATitle] = useState('');
  const [qaDate, setQADate] = useState(new Date().toISOString().slice(0,10));
  const [qaFrom, setQAFrom] = useState('09:00');
  const [qaTo, setQATo] = useState('10:00');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Ev | null>(null);

  const range = useMemo(() => {
    const start = new Date(cursor);
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    if (view === 'day') end.setDate(end.getDate() + 1);
    else end.setDate(end.getDate() + 7);
    return {
      start,
      end,
      startISO: start.toISOString(),
      endISO: end.toISOString(),
    };
  }, [cursor, view]);

  async function loadEvents() {
    if (!user) {
      setEvents([]);
      return;
    }
    const { data } = await supabase
      .from('events')
      .select('id,title,starts_at,ends_at,source_id,description')
      .eq('owner_id', user.id)
      .gte('starts_at', range.startISO)
      .lt('starts_at', range.endISO)
      .order('starts_at', { ascending: true });
    setEvents((data ?? []) as any);
  }

  async function loadPrayers() {
    if (!user) {
      setPT(null);
      return;
    }
    const { data } = await supabase
      .from('prayer_times')
      .select('fajr,dhuhr,asr,maghrib,isha')
      .eq('owner_id', user.id)
      .eq('date_iso', dayISO(range.start))
      .maybeSingle();
    setPT((data ?? null) as any);
  }

  async function loadConflicts() {
    if (!user) {
      setConflictsCount(0);
      return;
    }
    const { count } = await supabase
      .from('conflicts')
      .select('*', { count: 'exact', head: true })
      .eq('owner_id', user.id)
      .eq('status', 'open')
      .gte('prayer_start', range.startISO)
      .lt('prayer_start', range.endISO);
    setConflictsCount(count ?? 0);
  }

  useEffect(() => {
    loadEvents();
    loadPrayers();
    loadConflicts();
  }, [user?.id, range.startISO, range.endISO]);

  useEffect(() => {
    // scroll to current hour (day view)
    if (view === 'day' && containerRef.current) {
      const now = new Date();
      if (dayISO(now) === dayISO(cursor)) {
        containerRef.current.scrollTo({
          top: now.getHours() * 64 - 120,
          behavior: 'smooth',
        });
      }
    }
  }, [view, cursor]);

  function shift(deltaDays: number) {
    const d = new Date(cursor);
    d.setDate(d.getDate() + deltaDays);
    setCursor(d);
    setQADate(d.toISOString().slice(0,10));
    track('calendar_navigate', { view, delta: deltaDays });
  }

  function combineLocal(d:string, t:string){
    const [h,m] = t.split(':').map(x=>parseInt(x,10));
    const dt = new Date(d+'T00:00:00');
    dt.setHours(h,m,0,0);
    return dt.toISOString();
  }

  async function quickAdd() {
    if (!user || !qaDate || !qaFrom) return;
    const starts_at = combineLocal(qaDate, qaFrom);
    const ends_at = qaTo ? combineLocal(qaDate, qaTo) : starts_at;

    const temp: Ev = {
      id: 'tmp_'+Math.random().toString(36).slice(2),
      title: qaTitle || '(بدون عنوان)',
      starts_at, ends_at, source_id:'local', description: null
    };
    setEvents(prev => [temp, ...prev].sort((a,b)=>+new Date(a.starts_at)-+new Date(b.starts_at)));

    try {
      const { data, error } = await supabase
        .from('events')
        .insert({
          owner_id: user.id,
          title: qaTitle || '(بدون عنوان)',
          starts_at, ends_at,
          source_id: 'local'
        })
        .select('id,title,starts_at,ends_at,source_id,description')
        .single();
      if (error) throw error;
      setEvents(prev => [data as any, ...prev.filter(e=>e.id!==temp.id)]
        .sort((a,b)=>+new Date(a.starts_at)-+new Date(b.starts_at)));
      await supabase.functions.invoke('conflict-check', { body: { event_id: (data as any).id } }).catch(()=>{});
      setQATitle('');
      track('calendar_quick_add');
      await loadConflicts();
    } catch {
      setEvents(prev => prev.filter(e=>e.id!==temp.id));
    }
  }

  const prayerBands = useMemo(() => {
    if (!pt) return [];
    const map = [
      { k: 'fajr', label: 'الفجر' },
      { k: 'dhuhr', label: 'الظهر' },
      { k: 'asr', label: 'العصر' },
      { k: 'maghrib', label: 'المغرب' },
      { k: 'isha', label: 'العشاء' },
    ] as const;
    return map
      .filter((m) => (pt as any)[m.k])
      .map((m) => ({
        key: m.k,
        label: m.label,
        time: (pt as any)[m.k] as string,
      }));
  }, [pt]);

  if (!user) {
    return (
      <div className="container mx-auto p-4">
        <div className="text-center text-muted-foreground">
          سجّل الدخول لعرض التقويم.
        </div>
      </div>
    );
  }

  return (
    <div className="container max-w-6xl mx-auto p-4 space-y-4">
      {/* Quick Add Bar */}
      <div className="flex flex-wrap items-end gap-2 border rounded-2xl p-3 bg-card">
        <div className="flex-1 min-w-[220px]">
          <label className="text-xs font-medium mb-1 block">عنوان سريع</label>
          <input 
            value={qaTitle} 
            onChange={e=>setQATitle(e.target.value)}
            placeholder="مثال: اجتماع عميل"
            className="w-full px-3 py-2 rounded-lg border bg-background"
          />
        </div>
        <div>
          <label className="text-xs font-medium mb-1 block">التاريخ</label>
          <input 
            type="date" 
            value={qaDate}
            onChange={e=>setQADate(e.target.value)}
            className="px-2 py-2 rounded-lg border bg-background"
          />
        </div>
        <div>
          <label className="text-xs font-medium mb-1 block">من</label>
          <input 
            type="time" 
            value={qaFrom}
            onChange={e=>setQAFrom(e.target.value)}
            className="px-2 py-2 rounded-lg border bg-background"
          />
        </div>
        <div>
          <label className="text-xs font-medium mb-1 block">إلى</label>
          <input 
            type="time" 
            value={qaTo}
            onChange={e=>setQATo(e.target.value)}
            className="px-2 py-2 rounded-lg border bg-background"
          />
        </div>
        <button 
          onClick={quickAdd}
          className="px-5 py-2 rounded-lg bg-primary text-primary-foreground hover:opacity-90 transition-opacity"
        >
          إضافة
        </button>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button onClick={() => shift(view === 'day' ? -1 : -7)} variant="outline" size="sm">
            ←
          </Button>
          <div className="font-medium text-lg min-w-[200px] text-center">
            {cursor.toLocaleDateString('ar-AE', {
              dateStyle: view === 'day' ? 'full' : 'medium',
            })}
          </div>
          <Button onClick={() => shift(view === 'day' ? +1 : +7)} variant="outline" size="sm">
            →
          </Button>
          <Button
            onClick={() => setCursor(new Date())}
            variant="ghost"
            size="sm"
            className="text-xs"
          >
            اليوم
          </Button>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-sm">
            <span className="text-muted-foreground">تعارضات الصلاة:</span>
            <span
              className={`px-2 py-1 rounded-full text-xs font-medium ${
                conflictsCount > 0
                  ? 'bg-red-500 text-white'
                  : 'bg-muted text-muted-foreground'
              }`}
            >
              {conflictsCount}
            </span>
          </div>
          <div className="flex items-center gap-1 border rounded-lg p-1">
            <Button
              onClick={() => setView('day')}
              variant={view === 'day' ? 'secondary' : 'ghost'}
              size="sm"
            >
              يوم
            </Button>
            <Button
              onClick={() => setView('week')}
              variant={view === 'week' ? 'secondary' : 'ghost'}
              size="sm"
            >
              أسبوع
            </Button>
          </div>
        </div>
      </div>

      {/* DAY VIEW */}
      {view === 'day' && (
        <div
          ref={containerRef}
          className="h-[70vh] overflow-auto border rounded-2xl p-4 bg-card relative"
        >
          {/* hour grid */}
          <div className="relative">
            {Array.from({ length: 24 }).map((_, h) => (
              <div
                key={h}
                className="h-16 border-b border-border text-xs text-muted-foreground flex items-start"
              >
                <div className="w-16 shrink-0 font-mono">
                  {String(h).padStart(2, '0')}:00
                </div>
              </div>
            ))}
          </div>

          {/* prayer bands */}
          {prayerBands.map((b) => {
            const [HH, MM] = b.time.split(':').map((x) => parseInt(x, 10));
            const top = ((HH * 60 + MM) * 64) / 60; // 64px per hour
            return (
              <div
                key={b.key}
                className="absolute left-0 right-0 pointer-events-none"
                style={{ top }}
              >
                <div className="mx-16 px-2 py-1 rounded bg-amber-100 dark:bg-amber-900/30 text-amber-900 dark:text-amber-200 text-xs inline-flex items-center gap-1">
                  🕌 <span className="font-medium">{b.label}</span> — {b.time}
                </div>
              </div>
            );
          })}

          {/* events */}
          {events.map((ev) => {
            const st = new Date(ev.starts_at);
            const en = new Date(ev.ends_at ?? ev.starts_at);
            const top = ((st.getHours() * 60 + st.getMinutes()) * 64) / 60;
            const h = Math.max(24, Math.max(1, (+en - +st) / 60000) * (64 / 60)); // min 24px
            const color =
              ev.source_id === 'google'
                ? 'bg-sky-100 border-sky-300 dark:bg-sky-900/30 dark:border-sky-700'
                : ev.source_id === 'ai'
                ? 'bg-violet-100 border-violet-300 dark:bg-violet-900/30 dark:border-violet-700'
                : 'bg-emerald-100 border-emerald-300 dark:bg-emerald-900/30 dark:border-emerald-700';
            return (
              <div
                key={ev.id}
                className={`absolute left-16 right-4 border rounded-lg p-2 cursor-pointer hover:shadow-md transition-shadow ${color}`}
                style={{ top, height: h }}
                onClick={() => {
                  setEditing(ev);
                  setModalOpen(true);
                  track('calendar_event_clicked', { id: ev.id, source: ev.source_id });
                }}
              >
                <div className="text-sm font-medium truncate">
                  {ev.title ?? '(بدون عنوان)'}
                </div>
                <div className="text-xs text-muted-foreground">
                  {toLocalHM(ev.starts_at)} – {toLocalHM(ev.ends_at ?? ev.starts_at)}
                  {' · '}
                  {ev.source_id === 'google'
                    ? '📅 Google'
                    : ev.source_id === 'ai'
                    ? '🤖 AI'
                    : '📝 محلي'}
                </div>
                {ev.description && (
                  <div className="text-xs mt-1 truncate opacity-70">{ev.description}</div>
                )}
              </div>
            );
          })}

          {events.length === 0 && (
            <div className="absolute inset-0 flex items-center justify-center text-muted-foreground">
              <div className="text-center">
                <div className="text-4xl mb-2">📅</div>
                <div>لا توجد أحداث في هذا اليوم</div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* WEEK VIEW */}
      {view === 'week' && (
        <div className="grid md:grid-cols-7 gap-3">
          {Array.from({ length: 7 }).map((_, i) => {
            const d = new Date(range.start);
            d.setDate(d.getDate() + i);
            const dayEvents = events.filter(
              (e) => e.starts_at.slice(0, 10) === d.toISOString().slice(0, 10)
            );
            const isToday = dayISO(d) === dayISO(new Date());
            return (
              <div
                key={i}
                className={`border rounded-2xl p-3 bg-card ${
                  isToday ? 'ring-2 ring-primary' : ''
                }`}
              >
                <div className="text-sm font-medium mb-2 flex items-center justify-between">
                  <span>
                    {d.toLocaleDateString('ar-AE', {
                      weekday: 'short',
                      day: 'numeric',
                    })}
                  </span>
                  {isToday && (
                    <span className="text-xs bg-primary text-primary-foreground px-2 py-0.5 rounded-full">
                      اليوم
                    </span>
                  )}
                </div>
                <div className="space-y-1">
                  {dayEvents.length === 0 ? (
                    <div className="text-xs text-muted-foreground text-center py-2">
                      — لا أحداث —
                    </div>
                  ) : (
                    dayEvents.map((e) => (
                      <div
                        key={e.id}
                        className="text-xs flex items-center gap-2 p-2 rounded hover:bg-muted cursor-pointer"
                        onClick={() => {
                          track('calendar_event_clicked', {
                            id: e.id,
                            source: e.source_id,
                          });
                        }}
                      >
                        <span
                          className={`size-2 rounded-full shrink-0 ${
                            e.source_id === 'google'
                              ? 'bg-sky-500'
                              : e.source_id === 'ai'
                              ? 'bg-violet-500'
                              : 'bg-emerald-500'
                          }`}
                        />
                        <span className="truncate flex-1">{e.title ?? '(بدون عنوان)'}</span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Legend */}
      <div className="flex items-center justify-center gap-6 text-xs text-muted-foreground">
        <div className="flex items-center gap-1">
          <span className="size-3 rounded-full bg-emerald-500" />
          <span>محلي</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="size-3 rounded-full bg-sky-500" />
          <span>Google Calendar</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="size-3 rounded-full bg-violet-500" />
          <span>AI</span>
        </div>
      </div>

      <CalendarEventModal
        open={modalOpen}
        onClose={()=>setModalOpen(false)}
        initial={editing ? {
          id: editing.id,
          title: editing.title,
          starts_at: editing.starts_at,
          ends_at: editing.ends_at,
          description: editing.description,
          source: editing.source_id as any
        } : null}
        defaultDate={cursor}
        onSaved={(e)=>{
          const normalized: Ev = {
            id: e.id!,
            title: e.title,
            starts_at: e.starts_at,
            ends_at: e.ends_at ?? e.starts_at,
            source_id: (e.source ?? 'local') as any,
            description: e.description ?? null
          };
          setEvents(prev=>{
            const exists = prev.some(x=>x.id===normalized.id);
            const next = exists ? prev.map(x=>x.id===normalized.id? normalized : x) : [normalized, ...prev];
            return next.sort((a,b)=>+new Date(a.starts_at)-+new Date(b.starts_at));
          });
          loadConflicts();
        }}
        onDeleted={(id)=>{
          setEvents(prev=>prev.filter(x=>x.id!==id));
          loadConflicts();
        }}
      />
    </div>
  );
}

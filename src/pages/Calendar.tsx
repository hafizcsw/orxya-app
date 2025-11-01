import { useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useUser } from '@/lib/auth';
import { track } from '@/lib/telemetry';
import {
  startOfWeek,
  endOfWeek,
  minuteOfDay,
  snapAwayFromPrayers,
  formatDateRange,
  getDaysInRange,
  startOfDay,
  endOfDay,
} from '@/lib/time';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';

interface Event {
  id: string;
  title: string;
  starts_at: string;
  ends_at: string;
  source_id?: string;
  tags?: string[];
  duration_min?: number;
}

interface Task {
  id: string;
  title: string;
  status: string;
  due_date?: string;
}

interface PrayerTimes {
  fajr?: string;
  dhuhr?: string;
  asr?: string;
  maghrib?: string;
  isha?: string;
}

interface Conflict {
  id: string;
  event_id?: string;
  prayer_name: string;
  severity: string;
}

export default function Calendar() {
  const { user } = useUser();
  const { toast } = useToast();
  const [view, setView] = useState<'week'>('week');
  const [cursor, setCursor] = useState<Date>(new Date());
  const [events, setEvents] = useState<Event[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [prayers, setPrayers] = useState<Record<string, PrayerTimes>>({});
  const [conflicts, setConflicts] = useState<Conflict[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [dragging, setDragging] = useState<{ eventId: string; startY: number } | null>(null);
  const tzRef = useRef<string>('Asia/Dubai');

  const weekStart = useMemo(() => startOfWeek(cursor, tzRef.current), [cursor]);
  const weekEnd = useMemo(() => endOfWeek(cursor, tzRef.current), [cursor]);
  const days = useMemo(() => getDaysInRange(weekStart, weekEnd), [weekStart, weekEnd]);

  async function loadAll() {
    if (!user) return;
    setIsLoading(true);

    try {
      const start = startOfDay(weekStart);
      const end = endOfDay(weekEnd);

      const [{ data: prof }, { data: ev }, { data: tks }, { data: conf }] = await Promise.all([
        supabase.from('profiles').select('timezone').eq('id', user.id).maybeSingle(),
        supabase
          .from('events')
          .select('*')
          .eq('owner_id', user.id)
          .gte('starts_at', start.toISOString())
          .lte('starts_at', end.toISOString())
          .order('starts_at'),
        supabase
          .from('tasks')
          .select('*')
          .eq('owner_id', user.id)
          .gte('due_date', start.toISOString().slice(0, 10))
          .lte('due_date', end.toISOString().slice(0, 10)),
        supabase
          .from('conflicts')
          .select('*')
          .eq('owner_id', user.id)
          .gte('date_iso', start.toISOString().slice(0, 10))
          .lte('date_iso', end.toISOString().slice(0, 10)),
      ]);

      tzRef.current = prof?.timezone ?? 'Asia/Dubai';
      setEvents((ev ?? []) as Event[]);
      setTasks((tks ?? []) as Task[]);
      setConflicts((conf ?? []) as Conflict[]);

      // Load prayer times
      const dayStrings = days.map((d) => d.toISOString().slice(0, 10));
      const { data: pts } = await supabase
        .from('prayer_times')
        .select('date_iso, fajr, dhuhr, asr, maghrib, isha')
        .eq('owner_id', user.id)
        .in('date_iso', dayStrings);

      const map: Record<string, PrayerTimes> = {};
      (pts ?? []).forEach((row: any) => {
        map[row.date_iso] = {
          fajr: row.fajr,
          dhuhr: row.dhuhr,
          asr: row.asr,
          maghrib: row.maghrib,
          isha: row.isha,
        };
      });
      setPrayers(map);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadAll();
    track('calendar_open_week');
  }, [user?.id, cursor]);

  function goToToday() {
    setCursor(new Date());
  }

  function goToPrev() {
    const d = new Date(cursor);
    d.setDate(d.getDate() - 7);
    setCursor(d);
  }

  function goToNext() {
    const d = new Date(cursor);
    d.setDate(d.getDate() + 7);
    setCursor(d);
  }

  async function moveEvent(eventId: string, newStart: Date) {
    const event = events.find((e) => e.id === eventId);
    if (!event) return;

    const duration = new Date(event.ends_at).getTime() - new Date(event.starts_at).getTime();
    const newEnd = new Date(newStart.getTime() + duration);

    // Snap away from prayers
    const dayISO = newStart.toISOString().slice(0, 10);
    const snappedStart = snapAwayFromPrayers(newStart, prayers[dayISO]);
    const snappedEnd = snapAwayFromPrayers(newEnd, prayers[dayISO]);

    // Optimistic update
    const snapshot = [...events];
    setEvents((prev) =>
      prev.map((e) =>
        e.id === eventId
          ? { ...e, starts_at: snappedStart.toISOString(), ends_at: snappedEnd.toISOString() }
          : e
      )
    );

    try {
      const { error } = await supabase.functions.invoke('commands', {
        body: {
          command: 'move_event',
          idempotency_key: crypto.randomUUID(),
          payload: {
            event_id: eventId,
            starts_at: snappedStart.toISOString(),
            ends_at: snappedEnd.toISOString(),
          },
        },
      });

      if (error) throw error;

      track('calendar_move_event', { eventId });
      toast({
        title: 'تم نقل الحدث',
        description: 'تم تحديث موعد الحدث بنجاح',
      });
    } catch (error) {
      console.error('Move event failed:', error);
      setEvents(snapshot);
      toast({
        title: 'فشل نقل الحدث',
        description: 'حدث خطأ أثناء التحديث',
        variant: 'destructive',
      });
    }
  }

  function getEventsForDay(day: Date): Event[] {
    const dayStr = day.toISOString().slice(0, 10);
    return events.filter((e) => e.starts_at.startsWith(dayStr));
  }

  function getTasksForDay(day: Date): Task[] {
    const dayStr = day.toISOString().slice(0, 10);
    return tasks.filter((t) => t.due_date === dayStr);
  }

  function getConflictsForDay(day: Date): Conflict[] {
    const dayStr = day.toISOString().slice(0, 10);
    return conflicts.filter((c) => c.event_id && events.some((e) => e.id === c.event_id && e.starts_at.startsWith(dayStr)));
  }

  // Calculate event position in day
  function getEventStyle(event: Event) {
    const start = new Date(event.starts_at);
    const end = new Date(event.ends_at);
    
    const startMin = minuteOfDay(start);
    const endMin = minuteOfDay(end);
    
    const dayMinutes = 18 * 60; // 6am to 12am
    const top = ((startMin - 6 * 60) / dayMinutes) * 100;
    const height = ((endMin - startMin) / dayMinutes) * 100;
    
    return {
      top: `${Math.max(0, top)}%`,
      height: `${Math.max(2, height)}%`,
    };
  }

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] max-w-[1400px] mx-auto p-4 gap-4">
      {/* Header */}
      <div className="flex items-center justify-between bg-card p-4 rounded-xl shadow-md border">
        <div className="flex items-center gap-2">
          <CalendarIcon className="w-6 h-6 text-primary" />
          <h1 className="text-2xl font-bold">التقويم</h1>
        </div>

        <div className="flex items-center gap-2">
          <Button onClick={goToToday} variant="outline" size="sm">
            اليوم
          </Button>
          
          <div className="flex items-center gap-1">
            <Button onClick={goToPrev} variant="ghost" size="icon">
              <ChevronRight className="w-5 h-5" />
            </Button>
            <Button onClick={goToNext} variant="ghost" size="icon">
              <ChevronLeft className="w-5 h-5" />
            </Button>
          </div>

          <div className="text-sm font-medium min-w-[200px] text-center">
            {formatDateRange(weekStart, weekEnd)}
          </div>
        </div>

        {isLoading && <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />}
      </div>

      {/* Week Grid */}
      <div className="flex-1 overflow-auto bg-card rounded-xl shadow-md border">
        <div className="min-w-[800px] h-full">
          {/* Day Headers */}
          <div className="grid grid-cols-8 border-b sticky top-0 bg-card z-10">
            <div className="p-2 text-sm font-medium text-muted-foreground border-l">الوقت</div>
            {days.map((day) => {
              const dayEvents = getEventsForDay(day);
              const dayTasks = getTasksForDay(day);
              const dayConflicts = getConflictsForDay(day);
              
              return (
                <div key={day.toISOString()} className="p-2 text-center border-l">
                  <div className="text-sm font-medium">
                    {day.toLocaleDateString('ar-SA', { weekday: 'short' })}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {day.toLocaleDateString('ar-SA', { day: 'numeric', month: 'short' })}
                  </div>
                  <div className="flex gap-1 justify-center mt-1 text-xs">
                    {dayEvents.length > 0 && (
                      <span className="px-1.5 py-0.5 bg-primary/20 rounded">
                        {dayEvents.length} حدث
                      </span>
                    )}
                    {dayTasks.length > 0 && (
                      <span className="px-1.5 py-0.5 bg-accent rounded">
                        {dayTasks.length} مهمة
                      </span>
                    )}
                    {dayConflicts.length > 0 && (
                      <span className="px-1.5 py-0.5 bg-destructive/20 rounded">
                        ⚠️
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Time Grid */}
          <div className="relative">
            {/* Hours */}
            {Array.from({ length: 18 }, (_, i) => i + 6).map((hour) => (
              <div key={hour} className="grid grid-cols-8 border-b h-16">
                <div className="p-2 text-xs text-muted-foreground border-l">
                  {hour.toString().padStart(2, '0')}:00
                </div>
                {days.map((day) => (
                  <div
                    key={`${day.toISOString()}-${hour}`}
                    className="border-l relative hover:bg-accent/5 transition-colors"
                  />
                ))}
              </div>
            ))}

            {/* Events Overlay */}
            {days.map((day, dayIndex) => {
              const dayEvents = getEventsForDay(day);
              return (
                <div key={day.toISOString()}>
                  {dayEvents.map((event) => {
                    const style = getEventStyle(event);
                    return (
                      <div
                        key={event.id}
                        className="absolute rounded-lg px-2 py-1 text-xs cursor-move hover:shadow-lg transition-shadow"
                        style={{
                          ...style,
                          left: `${((dayIndex + 1) / 8) * 100}%`,
                          width: `${100 / 8 - 1}%`,
                          zIndex: 10,
                          backgroundColor: event.source_id === 'ai' ? 'hsl(var(--primary) / 0.2)' : 'hsl(var(--accent))',
                          border: '1px solid hsl(var(--border))',
                        }}
                      >
                        <div className="font-medium truncate">{event.title}</div>
                        <div className="text-[10px] text-muted-foreground">
                          {new Date(event.starts_at).toLocaleTimeString('ar-SA', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Tasks Sidebar */}
      <div className="absolute left-4 top-32 w-64 bg-card rounded-xl shadow-md border p-4 max-h-[60vh] overflow-auto">
        <h3 className="font-bold mb-3 flex items-center gap-2">
          <span>مهام الأسبوع</span>
          <span className="text-xs bg-accent px-2 py-0.5 rounded">{tasks.length}</span>
        </h3>
        <div className="space-y-2">
          {tasks.map((task) => (
            <div
              key={task.id}
              className="p-2 rounded-lg bg-accent/50 hover:bg-accent cursor-pointer text-sm"
              draggable
            >
              <div className="font-medium truncate">{task.title}</div>
              <div className="text-xs text-muted-foreground">
                {task.due_date && new Date(task.due_date).toLocaleDateString('ar-SA')}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

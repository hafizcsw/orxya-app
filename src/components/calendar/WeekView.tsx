import { useState, useRef } from "react";
import DayPrayerOverlay from "./DayPrayerOverlay";
import { startOfWeek, addDays, toISODate } from "@/lib/dates";
import { snapDeltaMins, minutesSinceMidnight, isoWithDeltaMin, type DragState } from "@/lib/calendar";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { track } from "@/lib/telemetry";

type Event = {
  id: string; 
  title: string; 
  starts_at: string; 
  ends_at: string; 
  source?: string;
  conflict_level?: number;
};

type PT = { 
  fajr?: string; 
  dhuhr?: string; 
  asr?: string; 
  maghrib?: string; 
  isha?: string 
};

type Props = {
  anchor: Date;
  eventsByDate: Record<string, Event[]>;
  prayersByDate: Record<string, PT>;
  onEventClick?: (id: string)=>void;
  onEventsChange?: () => void;
};

export default function WeekView({ anchor, eventsByDate, prayersByDate, onEventClick, onEventsChange }: Props) {
  const weekStart = startOfWeek(anchor, 0);
  const days: Date[] = Array.from({length:7}, (_,i)=> addDays(weekStart, i));
  const [drag, setDrag] = useState<DragState | null>(null);
  const [optimisticEvents, setOptimisticEvents] = useState<Record<string, Event>>({});
  const gridRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  
  function onPointerDown(e: React.PointerEvent, ev: Event, mode: DragState['mode']) {
    if (!gridRef.current) return;
    const rectTop = gridRef.current.getBoundingClientRect().top;
    setDrag({
      id: ev.id,
      mode,
      startY: e.clientY - rectTop,
      origStart: new Date(ev.starts_at).getTime(),
      origEnd: new Date(ev.ends_at).getTime(),
    });
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    track('calendar_drag_start', { mode });
  }

  function onPointerMove(e: React.PointerEvent) {
    if (!drag || !gridRef.current) return;
    const rectTop = gridRef.current.getBoundingClientRect().top;
    const deltaY = (e.clientY - rectTop) - drag.startY;
    const deltaMin = snapDeltaMins(deltaY);

    if (drag.mode === 'move') {
      setOptimisticEvents(prev => ({
        ...prev,
        [drag.id]: {
          ...(prev[drag.id] || eventsByDate[Object.keys(eventsByDate).find(k => eventsByDate[k].find(ev => ev.id === drag.id)) ?? '']?.find(ev => ev.id === drag.id)),
          starts_at: isoWithDeltaMin(new Date(drag.origStart).toISOString(), deltaMin),
          ends_at: isoWithDeltaMin(new Date(drag.origEnd).toISOString(), deltaMin),
        } as Event
      }));
    } else if (drag.mode === 'resize-top') {
      const nextStart = drag.origStart + deltaMin * 60_000;
      if (nextStart < drag.origEnd - 5 * 60_000) {
        setOptimisticEvents(prev => ({
          ...prev,
          [drag.id]: {
            ...(prev[drag.id] || eventsByDate[Object.keys(eventsByDate).find(k => eventsByDate[k].find(ev => ev.id === drag.id)) ?? '']?.find(ev => ev.id === drag.id)),
            starts_at: new Date(nextStart).toISOString(),
          } as Event
        }));
      }
    } else {
      const nextEnd = drag.origEnd + deltaMin * 60_000;
      if (nextEnd > drag.origStart + 5 * 60_000) {
        setOptimisticEvents(prev => ({
          ...prev,
          [drag.id]: {
            ...(prev[drag.id] || eventsByDate[Object.keys(eventsByDate).find(k => eventsByDate[k].find(ev => ev.id === drag.id)) ?? '']?.find(ev => ev.id === drag.id)),
            ends_at: new Date(nextEnd).toISOString(),
          } as Event
        }));
      }
    }
  }

  async function onPointerUp() {
    if (!drag) return;
    const finalEv = optimisticEvents[drag.id];
    const currentDrag = drag;
    setDrag(null);

    if (finalEv) {
      try {
        const { error } = await supabase.functions.invoke('commands', {
          body: {
            command: 'update_event',
            idempotency_key: `${drag.id}-${Date.now()}`,
            payload: {
              event_id: finalEv.id,
              starts_at: finalEv.starts_at,
              ends_at: finalEv.ends_at,
            }
          }
        });
        
        if (error) throw error;
        
        // Check conflicts
        await supabase.functions.invoke('conflict-check', {
          body: { days_back: 0, days_fwd: 7 }
        }).catch(() => {});
        
        toast({ description: "تم تحديث الحدث ✓" });
        track('calendar_drag_commit', { mode: currentDrag.mode });
        onEventsChange?.();
      } catch {
        toast({ description: "تعذّر الحفظ", variant: "destructive" });
        track('calendar_drag_undo', { reason: 'network' });
        setOptimisticEvents(prev => {
          const next = { ...prev };
          delete next[drag.id];
          return next;
        });
      }
    }
  }

  return (
    <div ref={gridRef} className="grid grid-cols-[80px,1fr,1fr,1fr,1fr,1fr,1fr,1fr] h-[72vh] border rounded-2xl overflow-auto">
      <div className="border-r bg-muted/40 sticky left-0 z-10">
        {Array.from({length:24}, (_,h)=>(
          <div key={h} className="h-[calc(100%/24)] text-[10px] px-1 border-b flex items-start">{h}:00</div>
        ))}
      </div>
      {days.map((d, idx) => {
        const iso = toISODate(d);
        const list = (eventsByDate[iso] ?? []).map(ev => optimisticEvents[ev.id] || ev);
        const dayName = d.toLocaleDateString(undefined, { weekday: 'short' });
        
        return (
          <div key={idx} className="relative border-r">
            <div className="sticky top-0 bg-background border-b p-1 text-xs text-center font-medium z-10">
              {dayName} {d.getDate()}
            </div>
            {Array.from({length:24}, (_,h)=>(
              <div key={h} className="h-[calc((100%-28px)/24)] border-b" />
            ))}
            <DayPrayerOverlay {...(prayersByDate[iso] ?? {})} />
            {list.map(ev => {
              const startMin = minutesSinceMidnight(ev.starts_at);
              const endMin = minutesSinceMidnight(ev.ends_at);
              const top = ((startMin/(24*60))*100);
              const height = Math.max(20, ((endMin-startMin)/(24*60))*100);
              const conflicted = (ev.conflict_level ?? 0) > 0;
              
              return (
                <div
                  key={ev.id}
                  className={`absolute left-1 right-1 rounded-md border p-1 text-xs overflow-hidden transition-opacity select-none
                    ${conflicted 
                      ? "border-destructive bg-destructive/15 text-destructive-foreground" 
                      : ev.source === "ai" 
                        ? "bg-purple-100 border-purple-300 text-purple-900 dark:bg-purple-900 dark:text-purple-200" 
                        : "bg-primary/10 border-primary text-foreground"
                    }
                    ${drag?.id === ev.id ? "opacity-60" : "hover:opacity-90"}`}
                  style={{ top: `calc(28px + ${top}%)`, height: `${height}%` }}
                  title={ev.title}
                >
                  {/* Resize top handle */}
                  <div
                    className="absolute inset-x-1 top-0 h-1 cursor-n-resize rounded-sm bg-foreground/20 z-20"
                    onPointerDown={(e) => { e.stopPropagation(); onPointerDown(e, ev, 'resize-top'); }}
                  />
                  
                  {/* Main content - draggable */}
                  <div
                    className="absolute inset-0 cursor-grab active:cursor-grabbing p-1"
                    onClick={(e)=>{ if (!drag) { e.stopPropagation(); onEventClick?.(ev.id); }}}
                    onPointerDown={(e) => onPointerDown(e, ev, 'move')}
                    onPointerMove={onPointerMove}
                    onPointerUp={onPointerUp}
                  >
                    <div className="flex items-center justify-between gap-1">
                      <div className="font-medium truncate flex-1">
                        {ev.source === "ai" && "🧠 "}
                        {ev.title}
                      </div>
                      {conflicted && (
                        <span className="inline-flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 rounded-full bg-destructive/20 border border-destructive shrink-0">
                          ⚠
                        </span>
                      )}
                    </div>
                  </div>
                  
                  {/* Resize bottom handle */}
                  <div
                    className="absolute inset-x-1 bottom-0 h-1 cursor-s-resize rounded-sm bg-foreground/20 z-20"
                    onPointerDown={(e) => { e.stopPropagation(); onPointerDown(e, ev, 'resize-bottom'); }}
                  />
                </div>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}

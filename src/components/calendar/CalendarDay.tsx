import { useMemo, useRef, useState } from "react";
import { layoutDay } from "@/lib/calendar-layout";
import EventBubble from "./EventBubble";
import PrayerBand from "./PrayerBand";
import { supabase } from "@/integrations/supabase/client";
import { checkPrayerConflict } from "@/lib/aiConflicts";
import { cn } from "@/lib/utils";

type CalEvent = {
  id: string;
  title: string;
  starts_at: string;
  ends_at: string;
  location?: string | null;
  cancelled?: boolean | null;
};

type PrayerTimes = {
  fajr?: string;
  dhuhr?: string;
  asr?: string;
  maghrib?: string;
  isha?: string;
};

type Props = {
  date: Date;
  events: CalEvent[];
  prayers: PrayerTimes | null;
  onCreate?: (p: { start_ts: string; end_ts: string; durationMin: number }) => void;
  onMove?: (ev: CalEvent, target: { start_ts: string; end_ts: string }) => void;
  onResize?: (ev: CalEvent, target: { start_ts: string; end_ts: string }) => void;
  onReload?: () => void;
  onEventClick?: (event: CalEvent) => void;
};

const HOURS = Array.from({ length: 24 }, (_, i) => i);

export default function CalendarDay({
  date,
  events,
  prayers,
  onCreate,
  onMove,
  onResize,
  onReload,
  onEventClick
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [drag, setDrag] = useState<{ y0: number; y1: number } | null>(null);
  const iso = date.toISOString().slice(0, 10);

  const { positioned, scale } = useMemo(() => layoutDay(events, date), [events, date]);

  const toTime = (y: number) => {
    const minutes = Math.round(y / scale.pxPerMin);
    const d = new Date(date);
    d.setHours(0, minutes, 0, 0);
    return d.toISOString();
  };

  const handleMouseDownCreate = (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const y = e.clientY - rect.top;
    setDrag({ y0: y, y1: y });
  };

  const handleMouseMoveCreate = (e: React.MouseEvent) => {
    if (!drag) return;
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const y = Math.max(0, Math.min(e.clientY - rect.top, 24 * scale.pxPerHour));
    setDrag((d) => (d ? { ...d, y1: y } : d));
  };

  const handleMouseUpCreate = async () => {
    if (!drag) return;
    const [minY, maxY] = drag.y0 < drag.y1 ? [drag.y0, drag.y1] : [drag.y1, drag.y0];
    const start_ts = toTime(minY);
    const end_ts = toTime(maxY);
    const durMin = Math.max(15, Math.round((maxY - minY) / scale.pxPerMin));
    setDrag(null);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase.from("events").insert({
      starts_at: start_ts,
      ends_at: end_ts,
      owner_id: user.id,
      title: "حدث جديد"
    });

    if (!error) {
      onCreate?.({ start_ts, end_ts, durationMin: durMin });
      onReload?.();
      
      // Check for conflicts
      await supabase.functions
        .invoke("conflict-check", { body: { range: iso } })
        .catch(() => {});
    }
  };

  return (
    <div
      className="relative border-l h-full select-none bg-background"
      onMouseLeave={() => drag && setDrag(null)}
    >
      {/* Hour grid */}
      <div
        className="absolute inset-0"
        ref={containerRef}
        onMouseDown={handleMouseDownCreate}
        onMouseMove={handleMouseMoveCreate}
        onMouseUp={handleMouseUpCreate}
      >
        {HOURS.map((h) => (
          <div
            key={h}
            className={cn(
              "border-b border-border/50 text-[10px] pr-1",
              h === 0 && "border-t"
            )}
            style={{ height: scale.pxPerHour }}
          >
            <div className="opacity-40 text-right font-mono">
              {h.toString().padStart(2, "0")}:00
            </div>
          </div>
        ))}
      </div>

      {/* Prayer overlay */}
      {prayers && <PrayerBand prayers={prayers} scale={scale} />}

      {/* Events */}
      <div className="absolute inset-0 z-20">
        {positioned.map((p) => {
          const hasConflict = checkPrayerConflict(
            p.event.starts_at,
            p.event.ends_at,
            prayers
          );

          return (
            <EventBubble
              key={p.event.id}
              p={p}
              scale={scale}
              hasConflict={hasConflict}
              onClick={() => onEventClick?.(p.event)}
              onMove={async (to) => {
                await supabase
                  .from("events")
                  .update({ starts_at: to.start_ts, ends_at: to.end_ts })
                  .eq("id", p.event.id);
                onMove?.(p.event, to);
                onReload?.();
                await supabase.functions
                  .invoke("conflict-check", { body: { event_id: p.event.id } })
                  .catch(() => {});
              }}
              onResize={async (to) => {
                await supabase
                  .from("events")
                  .update({ starts_at: to.start_ts, ends_at: to.end_ts })
                  .eq("id", p.event.id);
                onResize?.(p.event, to);
                onReload?.();
                await supabase.functions
                  .invoke("conflict-check", { body: { event_id: p.event.id } })
                  .catch(() => {});
              }}
            />
          );
        })}
      </div>

      {/* Drag creation preview */}
      {drag && (
        <div
          className="absolute left-1 right-1 rounded-lg bg-primary/20 border-2 border-primary border-dashed z-30 pointer-events-none"
          style={{
            top: Math.min(drag.y0, drag.y1),
            height: Math.abs(drag.y1 - drag.y0)
          }}
        />
      )}
    </div>
  );
}

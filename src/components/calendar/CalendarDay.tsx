import { useMemo, useRef, useState, memo } from "react";
import { packEventsIntoLanes, getLanePosition } from "@/lib/eventPacking";
import EventChip from "./EventChip";
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
  visibleRange?: { startHour: number; endHour: number };
  pxPerHour?: number;
};

const HOURS = Array.from({ length: 24 }, (_, i) => i);

function CalendarDay({
  date,
  events,
  prayers,
  onCreate,
  onMove,
  onResize,
  onReload,
  onEventClick,
  visibleRange,
  pxPerHour = 64
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [drag, setDrag] = useState<{ y0: number; y1: number } | null>(null);
  const iso = date.toISOString().slice(0, 10);
  const pxPerMin = pxPerHour / 60;

  const packedEvents = useMemo(() => {
    const packed = packEventsIntoLanes(events ?? [], date, pxPerMin);
    return packed.filter(p => !p.isAllDay);
  }, [events, date, pxPerMin]);

  const toTime = (y: number) => {
    const minutes = Math.round(y / pxPerMin);
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
    const y = Math.max(0, Math.min(e.clientY - rect.top, 24 * pxPerHour));
    setDrag((d) => (d ? { ...d, y1: y } : d));
  };

  const handleMouseUpCreate = async () => {
    if (!drag) return;
    const [minY, maxY] = drag.y0 < drag.y1 ? [drag.y0, drag.y1] : [drag.y1, drag.y0];
    const start_ts = toTime(minY);
    const end_ts = toTime(maxY);
    const durMin = Math.max(15, Math.round((maxY - minY) / pxPerMin));
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
      className="relative border-l border-border/30 h-full select-none bg-background hover:bg-accent/5 transition-colors"
      onMouseLeave={() => drag && setDrag(null)}
    >
      {/* Hour grid - Fixed, no conditional rendering to prevent flicker */}
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
            className="border-b border-border/30 hover:bg-accent/10 transition-colors"
            style={{ height: pxPerHour }}
          />
        ))}
      </div>

      {/* Prayer overlay */}
      {prayers && <PrayerBand prayers={prayers} scale={{ pxPerMin }} />}

      {/* Events */}
      <div className="absolute inset-0 z-20 px-1">
        {packedEvents.map((packed, idx) => {
          const hasConflict = checkPrayerConflict(
            packed.event.starts_at,
            packed.event.ends_at,
            prayers
          );
          const position = getLanePosition(packed);

          return (
            <div
              key={packed.event.id ?? idx}
              className="absolute"
              style={{
                top: packed.top,
                height: packed.height,
                left: position.left,
                width: position.width
              }}
            >
              <EventChip
                event={packed.event}
                onClick={() => onEventClick?.(packed.event)}
                hasConflict={hasConflict}
              />
            </div>
          );
        })}
      </div>

      {/* Drag creation preview - Google style */}
      {drag && (
        <div
          className="absolute left-1 right-1 rounded bg-primary/30 border border-primary z-30 pointer-events-none"
          style={{
            top: Math.min(drag.y0, drag.y1),
            height: Math.abs(drag.y1 - drag.y0)
          }}
        />
      )}
    </div>
  );
}

export default memo(CalendarDay);

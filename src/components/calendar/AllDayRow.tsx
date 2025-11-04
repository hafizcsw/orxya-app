import { useMemo } from "react";
import { cn } from "@/lib/utils";
import EventChip from "./EventChip";

type Props = {
  events: any[];
  days: Date[];
  onEventClick: (event: any) => void;
};

export default function AllDayRow({ events, days, onEventClick }: Props) {
  const allDayEvents = useMemo(() => {
    return events.filter(e => {
      if (!e.starts_at || !e.ends_at) return false;
      const start = new Date(e.starts_at);
      const end = new Date(e.ends_at);
      const durationHours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
      return durationHours >= 20;
    });
  }, [events]);

  if (allDayEvents.length === 0) return null;

  const getEventDaySpan = (event: any) => {
    const start = new Date(event.starts_at);
    const end = new Date(event.ends_at);
    
    const startDay = days.findIndex(d => 
      d.toISOString().slice(0, 10) === start.toISOString().slice(0, 10)
    );
    
    const endDay = days.findIndex(d => 
      d.toISOString().slice(0, 10) === end.toISOString().slice(0, 10)
    );

    if (startDay === -1) return null;

    return {
      start: Math.max(0, startDay),
      end: endDay === -1 ? days.length - 1 : endDay,
      span: (endDay === -1 ? days.length - 1 : endDay) - Math.max(0, startDay) + 1
    };
  };

  // Group events by row (to avoid overlaps)
  const rows: any[][] = [];
  for (const event of allDayEvents) {
    const span = getEventDaySpan(event);
    if (!span) continue;

    let placed = false;
    for (const row of rows) {
      const hasOverlap = row.some(e => {
        const eSpan = getEventDaySpan(e);
        if (!eSpan) return false;
        return eSpan.start < span.end && eSpan.end > span.start;
      });

      if (!hasOverlap) {
        row.push(event);
        placed = true;
        break;
      }
    }

    if (!placed) {
      rows.push([event]);
    }
  }

  return (
    <div className="border-b border-border/10 bg-muted/10" style={{ minHeight: rows.length * 24 + 8 }}>
      <div className="relative grid grid-cols-7" style={{ minHeight: rows.length * 24 + 8 }}>
        {rows.map((row, rowIdx) => (
          <div key={rowIdx} className="contents">
            {row.map((event, idx) => {
              const span = getEventDaySpan(event);
              if (!span) return null;

              return (
                <div
                  key={event.id || idx}
                  className="absolute px-1"
                  style={{
                    top: rowIdx * 24 + 4,
                    left: `${(span.start / 7) * 100}%`,
                    width: `${(span.span / 7) * 100}%`,
                    height: 20,
                    gridColumn: `${span.start + 1} / span ${span.span}`
                  }}
                >
                  <EventChip
                    event={event}
                    onClick={() => onEventClick(event)}
                    isAllDay
                    className="text-[10px]"
                  />
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

import { useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { AlertCircle } from "lucide-react";
import { GOOGLE_CALENDAR_COLORS, getColorForEvent } from "@/lib/calendar-colors";

export default function EventBubble({
  p,
  scale,
  onMove,
  onResize,
  onClick,
  hasConflict = false
}: {
  p: {
    event: any;
    top: number;
    height: number;
    laneLeftPct: number;
    laneWidthPct: number;
  };
  scale: { pxPerHour: number; pxPerMin: number; dayStartMin: number; dayEndMin: number };
  onMove?: (to: { start_ts: string; end_ts: string }) => void | Promise<void>;
  onResize?: (to: { start_ts: string; end_ts: string }) => void | Promise<void>;
  onClick?: () => void;
  hasConflict?: boolean;
}) {
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState<{ y: number; top: number } | null>(null);
  const [resizing, setResizing] = useState<"start" | "end" | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  const toISO = (yTop: number, yBottom: number) => {
    const toTime = (y: number) => {
      const min = Math.round(y / scale.pxPerMin);
      const d = new Date(p.event.starts_at || p.event.start_ts);
      d.setHours(0, 0, 0, 0);
      d.setMinutes(min);
      return d.toISOString();
    };
    return { start_ts: toTime(yTop), end_ts: toTime(yBottom) };
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).dataset.handle) return;
    
    // Double click to open details
    if (e.detail === 2) {
      onClick?.();
      return;
    }

    setDragStart({ y: e.clientY, top: p.top });
    setIsDragging(true);
    e.stopPropagation();
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (dragStart && isDragging) {
      const dy = e.clientY - dragStart.y;
      const newTop = Math.max(0, dragStart.top + dy);
      if (ref.current) {
        ref.current.style.top = `${newTop}px`;
      }
    }
  };

  const handleMouseUp = async () => {
    if (dragStart && isDragging && ref.current) {
      const finalTop = parseInt(ref.current.style.top || String(p.top));
      const to = toISO(finalTop, finalTop + p.height);
      setDragStart(null);
      setIsDragging(false);
      await onMove?.(to);
    }
  };

  const colorKey = getColorForEvent(p.event.source, p.event.color);
  const colorClasses = GOOGLE_CALENDAR_COLORS[colorKey];

  return (
    <div
      ref={ref}
      className={cn(
        "absolute rounded-lg shadow-lg transition-all cursor-move overflow-hidden group",
        colorClasses.bg,
        colorClasses.text,
        isDragging && "shadow-2xl scale-105 z-50",
        "hover:shadow-xl hover:z-40"
      )}
      style={{
        top: p.top,
        height: p.height,
        left: `${p.laneLeftPct}%`,
        width: `${p.laneWidthPct}%`,
        minHeight: "20px"
      }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      <div className="p-2 h-full flex flex-col relative">
        {hasConflict && (
          <div className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-destructive border-2 border-background animate-pulse" />
        )}
        
        <div className="font-semibold text-sm truncate flex items-center gap-1">
          {hasConflict && <AlertCircle className="w-3 h-3 flex-shrink-0" />}
          {p.event.title || "بدون عنوان"}
        </div>
        {p.event.location && (
          <div className="text-xs opacity-90 truncate">📍 {p.event.location}</div>
        )}
        {p.height > 40 && (
          <div className="text-xs opacity-75 mt-auto">
            {new Date(p.event.starts_at || p.event.start_ts).toLocaleTimeString("ar", {
              hour: "2-digit",
              minute: "2-digit"
            })}
          </div>
        )}
      </div>

      {/* Resize handles */}
      <div
        data-handle="true"
        className="absolute -top-0.5 left-0 right-0 h-2 cursor-n-resize opacity-0 group-hover:opacity-100 bg-white/20 transition-opacity"
        onMouseDown={(e) => {
          e.stopPropagation();
          setResizing("start");
        }}
      />
      <div
        data-handle="true"
        className="absolute -bottom-0.5 left-0 right-0 h-2 cursor-s-resize opacity-0 group-hover:opacity-100 bg-white/20 transition-opacity"
        onMouseDown={(e) => {
          e.stopPropagation();
          setResizing("end");
        }}
      />
    </div>
  );
}

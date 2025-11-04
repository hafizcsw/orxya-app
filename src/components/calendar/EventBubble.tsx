import { useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { AlertCircle, Clock, MapPin, Users, CheckCircle2 } from "lucide-react";
import { GOOGLE_CALENDAR_COLORS, getColorForEvent } from "@/lib/calendar-colors";
import type { EventCategory, EventStatus } from "@/types";

const CATEGORY_ICONS: Record<EventCategory, string> = {
  work: '💼',
  personal: '👤',
  meeting: '👥',
  task: '🎯',
  study: '📚',
  exercise: '🏃',
  food: '🍽️',
  travel: '✈️',
  prayer: '🕌',
  other: '📌'
};

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
  const category: EventCategory = p.event.category || 'other';
  const status: EventStatus = p.event.status || 'scheduled';

  const formatTime = (iso: string) => {
    const d = new Date(iso);
    const hour = d.getHours();
    const minute = d.getMinutes();
    const period = hour >= 12 ? 'م' : 'ص';
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minute.toString().padStart(2, '0')} ${period}`;
  };

  const isCompleted = status === 'completed';

  return (
    <div
      ref={ref}
      className={cn(
        "absolute rounded-xl shadow-md transition-all cursor-move overflow-hidden group border-l-4",
        colorClasses.bg,
        colorClasses.text,
        colorClasses.border,
        colorClasses.shadow,
        isDragging && "shadow-2xl scale-105 z-50 ring-2 ring-primary/50",
        "hover:shadow-xl hover:z-40 hover:-translate-y-0.5",
        "backdrop-blur-sm",
        isCompleted && "opacity-80"
      )}
      style={{
        top: p.top,
        height: p.height,
        left: `${p.laneLeftPct}%`,
        width: `${p.laneWidthPct}%`,
        minHeight: "24px"
      }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      <div className="p-2.5 h-full flex flex-col relative gap-1">
        {/* Gradient overlay on hover */}
        <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-xl pointer-events-none" />
        
        {/* Conflict indicator */}
        {hasConflict && (
          <div className="absolute -top-1 -right-1 z-10">
            <div className="w-4 h-4 rounded-full bg-destructive border-2 border-background animate-pulse flex items-center justify-center">
              <AlertCircle className="w-2.5 h-2.5 text-destructive-foreground" />
            </div>
          </div>
        )}
        
        {/* Completed indicator */}
        {isCompleted && (
          <div className="absolute top-2 right-2 z-10">
            <CheckCircle2 className="w-4 h-4 text-green-500" />
          </div>
        )}
        
        {/* Header: Category + Title */}
        <div className="flex items-start gap-1.5 relative z-10">
          <span className="text-sm flex-shrink-0" title={category}>
            {CATEGORY_ICONS[category]}
          </span>
          <div className={cn(
            "font-semibold text-sm leading-tight flex-1 min-w-0",
            p.height > 30 ? "line-clamp-2" : "truncate",
            isCompleted && "line-through opacity-75"
          )}>
            {p.event.title || "بدون عنوان"}
          </div>
        </div>
        
        {/* Time information - always show for events > 30px */}
        {p.height > 30 && (
          <div className="flex items-center gap-1.5 text-xs opacity-90 relative z-10">
            <Clock className="w-3 h-3 flex-shrink-0" />
            <span>
              {formatTime(p.event.starts_at || p.event.start_ts)}
              {p.event.ends_at && ` - ${formatTime(p.event.ends_at)}`}
            </span>
          </div>
        )}
        
        {/* Location - show for events > 50px */}
        {p.height > 50 && p.event.location && (
          <div className="flex items-center gap-1.5 text-xs opacity-80 truncate relative z-10">
            <MapPin className="w-3 h-3 flex-shrink-0" />
            <span className="truncate">{p.event.location}</span>
          </div>
        )}
        
        {/* Description - show for events > 70px */}
        {p.height > 70 && p.event.description && (
          <div className="text-xs opacity-75 line-clamp-2 relative z-10 mt-auto">
            {p.event.description}
          </div>
        )}
        
        {/* Participants - show for events > 90px */}
        {p.height > 90 && p.event.attendees && p.event.attendees.length > 0 && (
          <div className="flex items-center gap-1.5 text-xs opacity-70 relative z-10">
            <Users className="w-3 h-3 flex-shrink-0" />
            <span className="truncate">{p.event.attendees.length} مشارك</span>
          </div>
        )}
      </div>

      {/* Resize handles - enhanced */}
      <div
        data-handle="true"
        className="absolute -top-1 left-0 right-0 h-3 cursor-n-resize opacity-0 group-hover:opacity-100 bg-gradient-to-b from-white/30 to-transparent transition-opacity rounded-t-xl"
        onMouseDown={(e) => {
          e.stopPropagation();
          setResizing("start");
        }}
      />
      <div
        data-handle="true"
        className="absolute -bottom-1 left-0 right-0 h-3 cursor-s-resize opacity-0 group-hover:opacity-100 bg-gradient-to-t from-white/30 to-transparent transition-opacity rounded-b-xl"
        onMouseDown={(e) => {
          e.stopPropagation();
          setResizing("end");
        }}
      />
    </div>
  );
}

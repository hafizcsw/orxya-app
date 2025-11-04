import { cn } from "@/lib/utils";
import { MapPin, Clock, AlertCircle, CheckCircle2, Pause, X } from "lucide-react";
import { GOOGLE_CALENDAR_COLORS, getColorForEvent } from "@/lib/calendar-colors";
import { useCountdown } from '@/hooks/useCountdown';
import { zIndex } from '@/lib/z-index';
import type { EventCategory, EventPriority, EventStatus } from "@/types";

type Props = {
  event: any;
  onClick: () => void;
  isAllDay?: boolean;
  hasConflict?: boolean;
  style?: React.CSSProperties;
  className?: string;
};

// Category icons mapping
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

export default function EventChip({ 
  event, 
  onClick, 
  isAllDay = false,
  hasConflict = false,
  style,
  className 
}: Props) {
  const category: EventCategory = event.category || 'other';
  const priority: EventPriority = event.priority || 'normal';
  const status: EventStatus = event.status || 'scheduled';
  
  const now = new Date();
  const start = event.starts_at ? new Date(event.starts_at) : now;
  const end = event.ends_at ? new Date(event.ends_at) : now;
  const isOngoing = now >= start && now < end;
  const isPast = now >= end;
  
  const getEventColor = () => {
    if (event.is_cancelled || status === 'cancelled') {
      return {
        bg: "bg-muted/40",
        text: "text-muted-foreground",
        hex: "#9ca3af"
      };
    }
    
    if (status === 'completed' || isPast) {
      return {
        bg: "bg-muted/30",
        text: "text-muted-foreground",
        hex: "#6b7280"
      };
    }
    
    if (hasConflict) {
      return {
        bg: "bg-red-100 dark:bg-red-950/40",
        text: "text-red-700 dark:text-red-300",
        hex: "#ef4444"
      };
    }

    if (isOngoing) {
      return {
        bg: "bg-blue-100 dark:bg-blue-950/40",
        text: "text-blue-700 dark:text-blue-300",
        hex: "#3b82f6"
      };
    }
    
    const colorKey = getColorForEvent(event.source, event.color);
    const color = GOOGLE_CALENDAR_COLORS[colorKey];
    
    return {
      bg: color.bg,
      text: color.text,
      hex: color.hex
    };
  };
  
  const colors = getEventColor();

  const formatTime = (iso: string) => {
    const d = new Date(iso);
    const hour = d.getHours();
    const minute = d.getMinutes();
    const period = hour >= 12 ? 'م' : 'ص';
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minute.toString().padStart(2, '0')} ${period}`;
  };

  const getStatusIcon = () => {
    if (isPast) return <CheckCircle2 className="w-3.5 h-3.5 text-success" />;
    if (isOngoing) return <div className="w-2 h-2 rounded-full bg-destructive animate-pulse" />;
    
    switch (status) {
      case 'completed':
        return <CheckCircle2 className="w-3.5 h-3.5 text-success" />;
      case 'in_progress':
        return <Clock className="w-3.5 h-3.5 text-primary animate-pulse" />;
      case 'paused':
        return <Pause className="w-3.5 h-3.5 text-warning" />;
      case 'cancelled':
        return <X className="w-3.5 h-3.5 text-muted-foreground" />;
      default:
        return null;
    }
  };

  const getProgressPercentage = () => {
    if (!isOngoing) return 0;
    const total = end.getTime() - start.getTime();
    const elapsed = now.getTime() - start.getTime();
    return Math.min(100, Math.max(0, (elapsed / total) * 100));
  };

  // تصميم نظيف للأحداث طوال اليوم
  if (isAllDay) {
    return (
      <button
        onClick={(e) => {
          e.stopPropagation();
          onClick();
        }}
        className={cn(
          "w-full rounded px-2 py-0.5 text-start",
          "transition-all duration-150 hover:opacity-90",
          colors.bg,
          colors.text,
          "shadow-sm",
          className
        )}
        style={style}
        title={event.description || event.title}
      >
        <div className="flex items-center gap-1.5">
          <span className="font-medium text-xs truncate">{event.title || "بدون عنوان"}</span>
          {isPast && <CheckCircle2 className="w-3 h-3 shrink-0 ml-auto opacity-70" />}
        </div>
      </button>
    );
  }

  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      className={cn(
        "group w-full h-full rounded px-2 py-1 relative",
        "text-start overflow-hidden",
        "transition-all duration-150",
        "hover:shadow-lg hover:-translate-y-0.5",
        "focus:outline-none focus:ring-2 focus:ring-primary/20",
        colors.bg,
        colors.text,
        "shadow-sm",
        isOngoing && "ring-2 ring-blue-500/40",
        hasConflict && "ring-2 ring-red-500/50",
        isPast && "opacity-60",
        className
      )}
      style={{ ...style, zIndex: zIndex.eventBubble }}
      title={event.description || event.title}
    >
      {/* مؤشر الأولوية */}
      {priority === 'high' && !hasConflict && (
        <div className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-red-500 shadow-sm" />
      )}
      
      {/* Get event height from style prop */}
      {(() => {
        const height = typeof style?.height === 'number' ? style.height : 0;
        
        return (
          <>
            {/* الوقت - للبطاقات أكبر من 35px */}
            {height > 35 && event.starts_at && (
              <div className="text-xs font-medium mb-0.5 opacity-90">
                {formatTime(event.starts_at)}
              </div>
            )}

            {/* العنوان - دائماً */}
            <div className="font-medium text-sm leading-tight truncate">
              {event.title || "بدون عنوان"}
            </div>

            {/* الموقع - للبطاقات أكبر من 55px */}
            {height > 55 && event.location && (
              <div className="flex items-center gap-1 text-xs opacity-75 truncate mt-1">
                <MapPin className="w-3 h-3 shrink-0" />
                <span className="truncate">{event.location}</span>
              </div>
            )}

            {/* شريط التقدم - للأحداث الجارية والبطاقات أكبر من 70px */}
            {height > 70 && isOngoing && (
              <div className="mt-2 h-1 bg-white/20 dark:bg-black/20 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-white/50 dark:bg-white/40 transition-all"
                  style={{ width: `${getProgressPercentage()}%` }}
                />
              </div>
            )}

            {/* مؤشر الحالة - للبطاقات أكبر من 85px */}
            {height > 85 && (
              <div className="absolute bottom-1 left-1 flex items-center gap-1">
                {getStatusIcon()}
              </div>
            )}

            {/* تحذير التعارض */}
            {hasConflict && (
              <div className="absolute bottom-1 right-1 flex items-center gap-1 bg-red-500 text-white text-[9px] px-1.5 py-0.5 rounded font-medium">
                <AlertCircle className="w-2.5 h-2.5" />
                <span>تعارض</span>
              </div>
            )}
          </>
        );
      })()}
    </button>
  );
}

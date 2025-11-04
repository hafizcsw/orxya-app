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
  
  const countdown = useCountdown(event.starts_at || new Date());
  const now = new Date();
  const start = event.starts_at ? new Date(event.starts_at) : now;
  const end = event.ends_at ? new Date(event.ends_at) : now;
  const isOngoing = now >= start && now < end;
  const isPast = now >= end;
  const isUpcoming = now < start;
  
  const getEventColor = () => {
    if (event.is_cancelled || status === 'cancelled') {
      return {
        bg: "bg-muted/30",
        border: "border-muted/30",
        text: "text-muted-foreground"
      };
    }
    
    if (status === 'completed' || isPast) {
      return {
        bg: "bg-muted/20",
        border: "border-border/30",
        text: "text-muted-foreground"
      };
    }
    
    if (hasConflict) {
      return {
        bg: "bg-red-50 dark:bg-red-950/30",
        border: "border-red-400",
        text: "text-red-900 dark:text-red-100"
      };
    }

    if (isOngoing) {
      return {
        bg: "bg-blue-50 dark:bg-blue-950/30",
        border: "border-blue-400",
        text: "text-blue-900 dark:text-blue-100"
      };
    }
    
    const colorKey = getColorForEvent(event.source, event.color);
    const color = GOOGLE_CALENDAR_COLORS[colorKey];
    
    return {
      bg: color.bg,
      border: color.border,
      text: color.text
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

  // تصميم مختصر للأحداث طوال اليوم
  if (isAllDay) {
    return (
      <button
        onClick={(e) => {
          e.stopPropagation();
          onClick();
        }}
        className={cn(
          "w-full rounded-lg px-2.5 py-1.5 text-start",
          "transition-all duration-200 hover:scale-[1.01]",
          "border backdrop-blur-sm",
          colors.bg,
          colors.border,
          colors.text,
          "animate-fade-in",
          className
        )}
        style={style}
        title={event.description || event.title}
      >
        <div className="flex items-center gap-1.5">
          <span className="text-sm shrink-0">{CATEGORY_ICONS[category]}</span>
          <span className="font-medium text-[13px] truncate">{event.title || "بدون عنوان"}</span>
          {isPast && <CheckCircle2 className="w-3 h-3 text-success shrink-0 ml-auto" />}
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
        "group w-full h-full rounded-lg border-l-4 px-2 py-1.5 relative",
        "text-start overflow-hidden",
        "transition-all duration-200",
        "hover:shadow-md hover:scale-[1.01]",
        "focus:outline-none focus:ring-2 focus:ring-primary/20",
        colors.bg,
        colors.border,
        colors.text,
        isOngoing && "ring-2 ring-blue-400/30",
        hasConflict && "ring-2 ring-red-400/50",
        isPast && "opacity-60",
        className
      )}
      style={{ ...style, zIndex: zIndex.eventBubble }}
      title={event.description || event.title}
    >
      {/* تحذير التعارض */}
      {hasConflict && (
        <div className="absolute bottom-1 left-1 bg-red-500 text-white text-[9px] px-1.5 py-0.5 rounded-md font-bold animate-pulse">
          ⚠️ تعارض
        </div>
      )}

      {/* علامة الأولوية */}
      {priority === 'high' && !hasConflict && (
        <div className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-red-500" />
      )}
      
      {/* Get event height from style prop */}
      {(() => {
        const height = typeof style?.height === 'number' ? style.height : 0;
        
        return (
          <>
            {/* الوقت - يظهر فقط للبطاقات الأكبر من 40px */}
            {height > 40 && (
              <div className="flex items-center gap-1 mb-1">
                <Clock className="w-3 h-3" />
                <span className="text-xs font-semibold">
                  {event.starts_at && formatTime(event.starts_at)}
                </span>
              </div>
            )}

            {/* العنوان - دائماً */}
            <div className="font-medium text-sm truncate">
              {CATEGORY_ICONS[category]} {event.title || "بدون عنوان"}
            </div>

            {/* الموقع - يظهر فقط للبطاقات الأكبر من 60px */}
            {height > 60 && event.location && (
              <div className="text-[10px] text-muted-foreground truncate mt-1">
                📍 {event.location}
              </div>
            )}

            {/* شريط التقدم - يظهر فقط للبطاقات الأكبر من 80px */}
            {height > 80 && isOngoing && (
              <div className="mt-2 h-1 bg-border/30 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-blue-500 transition-all"
                  style={{ width: `${getProgressPercentage()}%` }}
                />
              </div>
            )}
          </>
        );
      })()}
    </button>
  );
}

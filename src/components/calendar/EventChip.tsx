import { cn } from "@/lib/utils";
import { MapPin, Clock, AlertCircle, CheckCircle2, Pause, X } from "lucide-react";
import { GOOGLE_CALENDAR_COLORS, getColorForEvent } from "@/lib/calendar-colors";
import { useCountdown } from '@/hooks/useCountdown';
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
        bg: "bg-gradient-to-br from-destructive/15 to-destructive/10",
        border: "border-destructive/60",
        text: "text-destructive-foreground"
      };
    }

    if (isOngoing) {
      return {
        bg: "bg-gradient-to-br from-primary/20 via-primary/15 to-primary/10",
        border: "border-primary/60",
        text: "text-primary-foreground"
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
        "group w-full h-full rounded-xl border-l-[3px] px-2.5 py-2 relative",
        "text-start overflow-hidden",
        "transition-all duration-300 ease-out",
        "hover:scale-[1.02] hover:shadow-lg hover:z-20",
        "focus:outline-none focus:ring-2 focus:ring-primary/30",
        colors.bg,
        colors.border,
        colors.text,
        "animate-fade-in backdrop-blur-sm",
        isOngoing && "shadow-md shadow-primary/20",
        hasConflict && "ring-2 ring-destructive/50",
        status === 'cancelled' && "opacity-60 line-through",
        isPast && "opacity-70",
        className
      )}
      style={style}
      title={event.description || event.title}
    >
      {/* تحذير التعارض */}
      {hasConflict && (
        <div className="absolute bottom-1 left-1 z-20 bg-destructive text-destructive-foreground text-[10px] px-2 py-0.5 rounded-full shadow-lg font-bold animate-pulse">
          ⚠️ تعارض
        </div>
      )}

      {/* علامة الأولوية */}
      {priority === 'high' && !hasConflict && (
        <div className="absolute -top-1 -right-1 z-10 w-3 h-3 rounded-full bg-destructive shadow-md" />
      )}
      
      {/* الوقت - أكبر وأوضح */}
      <div className="flex items-center justify-between gap-2 mb-1.5">
        <div className="flex items-center gap-1.5">
          <Clock className="w-3.5 h-3.5 shrink-0 text-primary" />
          <span className="font-bold text-[15px]">
            {event.starts_at && formatTime(event.starts_at)}
          </span>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {getStatusIcon()}
          {isOngoing && (
            <span className="text-[9px] px-1.5 py-0.5 rounded-md bg-destructive text-destructive-foreground font-bold uppercase">
              Live
            </span>
          )}
        </div>
      </div>

      {/* العنوان */}
      <div className="flex items-start gap-1.5 mb-1.5">
        <span className="text-sm shrink-0">{CATEGORY_ICONS[category]}</span>
        <span className={cn(
          "font-semibold text-[13px] leading-snug line-clamp-2",
          status === 'cancelled' && "line-through opacity-60"
        )}>
          {event.title || "بدون عنوان"}
        </span>
      </div>

      {/* العداد التنازلي / الحالة */}
      <div className="flex items-center gap-1.5 text-[11px] mb-1">
        {isUpcoming && countdown.total > 0 && (
          <span className="px-2 py-0.5 rounded-md bg-primary/15 text-primary font-medium border border-primary/20">
            {countdown.formattedShort}
          </span>
        )}
        {isOngoing && countdown.total > 0 && (
          <span className="px-2 py-0.5 rounded-md bg-destructive/15 text-destructive font-medium border border-destructive/20 animate-pulse">
            متبقي {countdown.minutes}د
          </span>
        )}
        {isPast && (
          <span className="px-2 py-0.5 rounded-md bg-success/15 text-success font-medium border border-success/20 flex items-center gap-1">
            <CheckCircle2 className="w-2.5 h-2.5" />
            مكتمل
          </span>
        )}
      </div>

      {/* الموقع - اختياري ومختصر */}
      {event.location && (
        <div className="flex items-center gap-1 text-[11px] text-muted-foreground truncate opacity-75">
          <MapPin className="w-2.5 h-2.5 flex-shrink-0" />
          <span className="truncate">{event.location}</span>
        </div>
      )}

      {/* شريط التقدم للأحداث الجارية */}
      {isOngoing && event.starts_at && event.ends_at && (
        <div className="mt-2 pt-1.5 border-t border-border/30">
          <div className="w-full h-1 bg-muted/50 rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-primary via-primary to-primary/70 rounded-full transition-all duration-1000"
              style={{ width: `${getProgressPercentage()}%` }}
            />
          </div>
        </div>
      )}
    </button>
  );
}

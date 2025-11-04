import { cn } from "@/lib/utils";
import { MapPin, Clock, AlertCircle, CheckCircle2, Pause, X } from "lucide-react";
import { GOOGLE_CALENDAR_COLORS, getColorForEvent } from "@/lib/calendar-colors";
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

// Priority colors
const PRIORITY_INDICATORS: Record<EventPriority, { color: string; label: string }> = {
  high: { color: 'bg-red-500', label: '🔴' },
  medium: { color: 'bg-yellow-500', label: '🟡' },
  normal: { color: 'bg-green-500', label: '🟢' }
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
  
  const getEventColor = () => {
    if (event.is_cancelled || status === 'cancelled') {
      return {
        bg: "bg-muted/30",
        border: "border-muted",
        text: "text-muted-foreground",
        shadow: ""
      };
    }
    
    if (status === 'completed') {
      return {
        bg: "bg-green-500/20",
        border: "border-green-500",
        text: "text-green-700 dark:text-green-300",
        shadow: "shadow-sm shadow-green-500/20"
      };
    }
    
    if (hasConflict) {
      return {
        bg: "bg-gradient-to-br from-destructive to-red-600",
        border: "border-destructive",
        text: "text-destructive-foreground",
        shadow: "shadow-md shadow-destructive/30"
      };
    }
    
    const colorKey = getColorForEvent(event.source, event.color);
    const color = GOOGLE_CALENDAR_COLORS[colorKey];
    
    return {
      bg: color.bg,
      border: color.border,
      text: color.text,
      shadow: color.shadow ? `shadow-sm ${color.shadow}` : "shadow-sm"
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

  const calculateDuration = () => {
    if (!event.starts_at || !event.ends_at) return null;
    const start = new Date(event.starts_at);
    const end = new Date(event.ends_at);
    const diff = end.getTime() - start.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    
    if (hours > 0) {
      return mins > 0 ? `${hours}س ${mins}د` : `${hours}س`;
    }
    return `${mins}د`;
  };

  const isOngoing = () => {
    if (!event.starts_at || !event.ends_at) return false;
    const now = new Date();
    const start = new Date(event.starts_at);
    const end = new Date(event.ends_at);
    return now >= start && now <= end;
  };

  const getStatusIcon = () => {
    switch (status) {
      case 'completed':
        return <CheckCircle2 className="w-3 h-3 text-green-500" />;
      case 'in_progress':
        return <Clock className="w-3 h-3 text-blue-500 animate-pulse" />;
      case 'paused':
        return <Pause className="w-3 h-3 text-yellow-500" />;
      case 'cancelled':
        return <X className="w-3 h-3 text-muted-foreground" />;
      default:
        return null;
    }
  };

  const duration = calculateDuration();
  const ongoing = isOngoing();

  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      className={cn(
        "group w-full h-full rounded-xl border-l-[6px] px-2.5 py-1.5 relative",
        "text-start overflow-hidden",
        "transition-all duration-300 ease-out",
        "hover:scale-[1.02] hover:z-20 hover:-translate-y-0.5",
        "focus:outline-none focus:ring-2 focus:ring-primary/40 focus:ring-offset-1",
        "backdrop-blur-sm",
        colors.bg,
        colors.border,
        colors.text,
        colors.shadow,
        "animate-fade-in",
        ongoing && "event-pulse-border ring-2 ring-blue-500/50",
        status === 'cancelled' && "border-dashed opacity-60",
        className
      )}
      style={style}
      title={event.description || event.title}
    >
      {/* Gradient overlay on hover */}
      <div className="absolute inset-0 bg-gradient-to-br from-white/15 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-xl pointer-events-none" />
      
      {/* Priority indicator */}
      {priority !== 'normal' && (
        <div className="absolute top-1.5 right-1.5 z-10">
          <span className="text-[10px]" title={`أولوية ${priority === 'high' ? 'عالية' : 'متوسطة'}`}>
            {PRIORITY_INDICATORS[priority].label}
          </span>
        </div>
      )}
      
      {/* Conflict indicator */}
      {hasConflict && (
        <div className="absolute top-1 right-1 flex items-center gap-1 z-10">
          <AlertCircle className="w-3 h-3 text-destructive-foreground animate-pulse" />
        </div>
      )}
      
      <div className="relative z-10 space-y-1">
        {/* Header: Category icon + Title + Status */}
        <div className="flex items-start gap-1.5">
          <span className="text-xs flex-shrink-0 mt-0.5" title={category}>
            {CATEGORY_ICONS[category]}
          </span>
          <div className="flex-1 min-w-0">
            <div className={cn(
              "text-xs sm:text-sm font-semibold leading-tight truncate",
              status === 'cancelled' && "line-through"
            )}>
              {event.title || "بدون عنوان"}
            </div>
          </div>
          {getStatusIcon()}
        </div>
        
        {/* Timing information */}
        {!isAllDay && event.starts_at && (
          <div className="flex items-center gap-2 text-[10px] sm:text-xs opacity-80 font-medium">
            <Clock className="w-3 h-3 flex-shrink-0" />
            <span>{formatTime(event.starts_at)}</span>
            {duration && (
              <>
                <span className="opacity-50">•</span>
                <span className="opacity-75">{duration}</span>
              </>
            )}
          </div>
        )}
        
        {/* Location */}
        {event.location && (
          <div className="flex items-center gap-1.5 text-[10px] sm:text-xs opacity-70 truncate">
            <MapPin className="w-3 h-3 flex-shrink-0" />
            <span className="truncate">{event.location}</span>
          </div>
        )}
        
        {/* Progress bar for ongoing events */}
        {ongoing && event.starts_at && event.ends_at && (
          <div className="w-full h-1 bg-black/20 dark:bg-white/20 rounded-full overflow-hidden">
            <div 
              className="h-full bg-blue-500 rounded-full transition-all duration-500"
              style={{
                width: `${Math.min(100, Math.max(0, 
                  ((new Date().getTime() - new Date(event.starts_at).getTime()) / 
                  (new Date(event.ends_at).getTime() - new Date(event.starts_at).getTime())) * 100
                ))}%`
              }}
            />
          </div>
        )}
      </div>
    </button>
  );
}

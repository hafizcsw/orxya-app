import { cn } from "@/lib/utils";
import { MapPin } from "lucide-react";
import { GOOGLE_CALENDAR_COLORS, getColorForEvent } from "@/lib/calendar-colors";

type Props = {
  event: any;
  onClick: () => void;
  isAllDay?: boolean;
  hasConflict?: boolean;
  style?: React.CSSProperties;
  className?: string;
};

export default function EventChip({ 
  event, 
  onClick, 
  isAllDay = false,
  hasConflict = false,
  style,
  className 
}: Props) {
  const getEventColor = () => {
    if (event.is_cancelled) {
      return {
        bg: "bg-muted/50",
        border: "border-muted",
        text: "text-muted-foreground line-through",
        shadow: ""
      };
    }
    
    if (hasConflict) {
      return {
        bg: "bg-destructive",
        border: "border-destructive",
        text: "text-destructive-foreground",
        shadow: "shadow-lg shadow-destructive/30"
      };
    }
    
    const colorKey = getColorForEvent(event.source, event.color);
    const color = GOOGLE_CALENDAR_COLORS[colorKey];
    
    return {
      bg: color.bg,
      border: color.border,
      text: color.text,
      shadow: "shadow-md shadow-primary/10"
    };
  };
  
  const colors = getEventColor();

  const formatTime = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleTimeString("ar", { hour: "2-digit", minute: "2-digit" });
  };

  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      className={cn(
        "group w-full h-full rounded-lg border-l-4 px-2 py-1 relative",
        "text-start overflow-hidden",
        "transition-all duration-300 ease-out",
        "hover:scale-[1.03] hover:z-20 hover:rotate-[0.5deg]",
        "focus:outline-none focus:ring-2 focus:ring-primary/40 focus:ring-offset-1",
        "backdrop-blur-sm",
        colors.bg,
        colors.border,
        colors.text,
        colors.shadow,
        "animate-fade-in",
        className
      )}
      style={style}
    >
      {/* Gradient overlay on hover */}
      <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-lg pointer-events-none" />
      
      {hasConflict && (
        <div className="absolute top-1 right-1 flex items-center gap-1 z-10">
          <div className="w-2 h-2 rounded-full bg-destructive animate-pulse shadow-lg shadow-destructive/50" />
        </div>
      )}
      
      <div className="relative z-10">
        <div className="text-[11px] sm:text-xs font-semibold leading-tight truncate mb-0.5">
          {event.title || "بدون عنوان"}
        </div>
        
        {!isAllDay && event.starts_at && (
          <div className="text-[9px] sm:text-[10px] opacity-75 leading-tight font-medium">
            {formatTime(event.starts_at)}
          </div>
        )}
        
        {event.location && (
          <div className="flex items-center gap-1 text-[9px] opacity-60 truncate mt-1">
            <MapPin className="w-2.5 h-2.5 flex-shrink-0" />
            <span className="truncate">{event.location}</span>
          </div>
        )}
      </div>
    </button>
  );
}

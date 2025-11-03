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
        bg: "bg-muted",
        border: "border-muted",
        text: "text-muted-foreground line-through"
      };
    }
    
    if (hasConflict) {
      return {
        bg: "bg-[#d50000]",
        border: "border-[#d50000]",
        text: "text-white"
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
    return d.toLocaleTimeString("ar", { hour: "2-digit", minute: "2-digit" });
  };

  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      className={cn(
        "w-full h-full rounded-md border-l-[4px] px-2 py-1 relative",
        "text-start text-xs overflow-hidden",
        "transition-all duration-200",
        "hover:shadow-md hover:scale-[1.02] hover:z-10",
        "focus:outline-none focus:ring-2 focus:ring-[#1a73e8]/30",
        colors.bg,
        colors.border,
        colors.text,
        className
      )}
      style={style}
    >
      {hasConflict && (
        <div className="w-1.5 h-1.5 rounded-full bg-red-500 absolute top-0.5 left-0.5 animate-pulse" />
      )}
      
      <div className="font-medium leading-tight truncate">
        {event.title || "بدون عنوان"}
      </div>
      
      {!isAllDay && event.starts_at && (
        <div className="text-[10px] opacity-80 leading-tight">
          {formatTime(event.starts_at)}
        </div>
      )}
      
      {event.location && (
        <div className="flex items-center gap-0.5 text-[9px] opacity-60 truncate mt-0.5">
          <MapPin className="w-2 h-2 flex-shrink-0" />
          <span className="truncate">{event.location}</span>
        </div>
      )}
    </button>
  );
}

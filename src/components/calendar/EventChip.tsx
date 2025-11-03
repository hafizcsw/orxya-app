import { cn } from "@/lib/utils";
import { MapPin } from "lucide-react";

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
    if (event.is_cancelled) return "bg-muted/50 text-muted-foreground line-through border-muted";
    if (hasConflict) return "bg-red-50 dark:bg-red-950/30 border-red-500 text-red-700 dark:text-red-300";
    if (event.source === "google") return "bg-blue-50 dark:bg-blue-950/30 border-blue-500 text-blue-700 dark:text-blue-300";
    if (event.color) return `bg-primary/10 border-primary text-primary`;
    return "bg-primary/10 border-primary text-primary";
  };

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
        "w-full h-full rounded border-l-[3px] px-1.5 py-1 relative",
        "text-start text-xs overflow-hidden",
        "transition-all hover:shadow-sm",
        "focus:outline-none focus:ring-1 focus:ring-primary/30",
        getEventColor(),
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

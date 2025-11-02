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
    if (event.is_cancelled) return "bg-muted text-muted-foreground line-through";
    if (hasConflict) return "bg-destructive/20 border-destructive/50 text-destructive";
    if (event.source === "google") return "bg-blue-500/20 border-blue-500/50 text-blue-700 dark:text-blue-300";
    if (event.color) return `bg-[${event.color}]/20 border-[${event.color}]/50`;
    return "bg-primary/20 border-primary/50 text-primary";
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
        "w-full h-full rounded-md border-l-4 px-2 py-1",
        "text-start text-xs overflow-hidden",
        "transition-all hover:shadow-md hover:scale-[1.02]",
        "focus:outline-none focus:ring-2 focus:ring-primary/50",
        getEventColor(),
        className
      )}
      style={style}
    >
      {hasConflict && (
        <div className="w-1.5 h-1.5 rounded-full bg-destructive absolute -top-0.5 -right-0.5" />
      )}
      
      <div className="font-medium truncate">
        {event.title || "بدون عنوان"}
      </div>
      
      {!isAllDay && event.starts_at && (
        <div className="text-[10px] opacity-70">
          {formatTime(event.starts_at)}
        </div>
      )}
      
      {event.location && (
        <div className="flex items-center gap-1 text-[10px] opacity-60 truncate">
          <MapPin className="w-2.5 h-2.5" />
          <span className="truncate">{event.location}</span>
        </div>
      )}
    </button>
  );
}

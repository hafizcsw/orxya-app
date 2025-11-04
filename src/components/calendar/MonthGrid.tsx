import { startOfMonth, endOfMonth, startOfWeek, addDays, sameDay, toISODate } from "@/lib/dates";
import Badge from "@/components/ui/Badge";
import { cn } from "@/lib/utils";

type Event = {
  id: string;
  title: string;
  starts_at: string;
  ends_at: string;
  source?: string;
};

type Props = {
  anchor: Date;
  eventsByDate: Record<string, Event[]>;
  onDayClick?: (iso: string) => void;
};

export default function MonthGrid({ anchor, eventsByDate, onDayClick }: Props) {
  const start = startOfWeek(startOfMonth(anchor));
  const end = addDays(endOfMonth(anchor), 6);
  const cells: Date[] = [];
  for (let d=new Date(start); d <= end; d = addDays(d,1)) cells.push(new Date(d));

  const today = new Date();
  return (
    <div className="grid grid-cols-7 border rounded-2xl overflow-hidden">
      {/* Enhanced Weekday Headers */}
      {["الأحد","الإثنين","الثلاثاء","الأربعاء","الخميس","الجمعة","السبت"].map((n,i)=>(
        <div 
          key={i} 
          className="px-3 py-3 text-center text-sm font-semibold bg-muted/80 border-b text-foreground uppercase tracking-wide"
        >
          {n}
        </div>
      ))}
      
      {/* Day Cells */}
      {cells.map((d, i) => {
        const iso = toISODate(d);
        const dayEvents = eventsByDate[iso] ?? [];
        const inMonth = d.getMonth() === anchor.getMonth();
        const isTodayCell = sameDay(d, today);
        
        return (
          <button
            key={i}
            onClick={() => onDayClick?.(iso)}
            className={cn(
              "relative h-28 p-2 text-right border hover:bg-secondary/30 transition-colors",
              inMonth ? "" : "bg-muted/20 opacity-60",
              isTodayCell && "ring-2 ring-primary ring-inset"
            )}
          >
            {/* Day number with highlight */}
            <div className={cn(
              "inline-flex items-center justify-center rounded-full mb-1",
              "w-7 h-7 text-sm font-medium transition-all",
              isTodayCell
                ? "bg-primary text-white shadow-md"
                : "text-foreground"
            )}>
              {d.getDate()}
            </div>
            
            {/* Events list - cleaner */}
            <div className="space-y-1">
              {dayEvents.slice(0,2).map(ev => (
                <div 
                  key={ev.id} 
                  className="truncate text-xs rounded-md px-2 py-1 bg-blue-100 text-blue-800 border border-blue-200 dark:bg-blue-900 dark:text-blue-200 font-medium"
                >
                  {ev.source === "ai" && "🧠 "}{ev.title}
                </div>
              ))}
              {dayEvents.length > 2 && (
                <div className="text-xs text-muted-foreground font-medium">
                  +{dayEvents.length - 2} أخرى
                </div>
              )}
            </div>
          </button>
        );
      })}
    </div>
  );
}

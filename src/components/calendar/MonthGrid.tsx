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
    <div className="grid grid-cols-7 rounded-lg overflow-hidden border border-border/20">
      {/* Clean Weekday Headers */}
      {["الأحد","الإثنين","الثلاثاء","الأربعاء","الخميس","الجمعة","السبت"].map((n,i)=>(
        <div 
          key={i} 
          className="px-3 py-3 text-center text-xs font-medium bg-background border-b border-border/10 text-muted-foreground"
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
              "relative h-28 p-2.5 text-right border-r border-b border-border/10 hover:bg-accent/30 transition-colors",
              inMonth ? "" : "bg-muted/10 opacity-50",
              i % 7 === 6 && "border-r-0"
            )}
          >
            {/* Day number - Clean minimal style */}
            <div className={cn(
              "inline-flex items-center justify-center rounded-full mb-1.5",
              "w-7 h-7 text-sm font-normal transition-all",
              isTodayCell
                ? "bg-[#1a73e8] text-white"
                : inMonth 
                  ? "text-foreground" 
                  : "text-muted-foreground"
            )}>
              {d.getDate()}
            </div>
            
            {/* Events - Minimal clean dots */}
            <div className="space-y-1">
              {dayEvents.slice(0,3).map(ev => (
                <div 
                  key={ev.id} 
                  className="truncate text-[11px] px-1.5 py-0.5 bg-primary/10 text-primary rounded font-normal"
                >
                  {ev.title}
                </div>
              ))}
              {dayEvents.length > 3 && (
                <div className="text-[10px] text-muted-foreground/70 px-1">
                  +{dayEvents.length - 3}
                </div>
              )}
            </div>
          </button>
        );
      })}
    </div>
  );
}

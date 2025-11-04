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
    <div className="grid grid-cols-7 rounded-lg overflow-hidden border border-border/20 shadow-sm">
      {/* رؤوس أيام الأسبوع */}
      {["الأحد","الإثنين","الثلاثاء","الأربعاء","الخميس","الجمعة","السبت"].map((n,i)=>(
        <div 
          key={i} 
          className="px-3 py-2.5 text-center text-[11px] font-medium bg-muted/30 border-b border-border/10 text-muted-foreground"
        >
          {n}
        </div>
      ))}
      
      {/* خلايا الأيام */}
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
              "relative h-32 p-2 text-right border-l border-b border-border/5 hover:bg-accent/20 transition-all duration-150",
              inMonth ? "bg-background" : "bg-muted/5 opacity-60",
              isTodayCell && "bg-blue-50/50 dark:bg-blue-950/20",
              i % 7 === 0 && "border-l-0"
            )}
          >
            {/* رقم اليوم */}
            <div className={cn(
              "inline-flex items-center justify-center rounded-full mb-2",
              "w-8 h-8 text-sm font-medium transition-all",
              isTodayCell
                ? "bg-[#1a73e8] text-white shadow-lg scale-105"
                : inMonth 
                  ? "text-foreground hover:bg-accent/30" 
                  : "text-muted-foreground/60"
            )}>
              {d.getDate()}
            </div>
            
            {/* الأحداث */}
            <div className="space-y-1">
              {dayEvents.slice(0,3).map(ev => (
                <div 
                  key={ev.id} 
                  className="truncate text-[10px] px-1.5 py-0.5 rounded font-medium shadow-sm bg-blue-100 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300"
                >
                  {ev.title}
                </div>
              ))}
              {dayEvents.length > 3 && (
                <div className="text-[9px] text-muted-foreground/60 px-1 font-medium">
                  +{dayEvents.length - 3} المزيد
                </div>
              )}
            </div>
          </button>
        );
      })}
    </div>
  );
}

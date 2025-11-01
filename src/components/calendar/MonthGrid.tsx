import { startOfMonth, endOfMonth, startOfWeek, addDays, sameDay, toISODate } from "@/lib/dates";
import Badge from "@/components/ui/Badge";

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
      {["الأحد","الإثنين","الثلاثاء","الأربعاء","الخميس","الجمعة","السبت"].map((n,i)=>(
        <div key={i} className="p-2 text-center text-xs bg-muted/60 border-b font-medium">{n}</div>
      ))}
      {cells.map((d, i) => {
        const iso = toISODate(d);
        const dayEvents = eventsByDate[iso] ?? [];
        const inMonth = d.getMonth() === anchor.getMonth();
        const isTodayCell = sameDay(d, today);
        return (
          <button
            key={i}
            onClick={() => onDayClick?.(iso)}
            className={`relative h-32 p-2 text-left border border-t-0 hover:bg-secondary/40 transition-colors
              ${inMonth ? "" : "bg-muted/30"} ${isTodayCell ? "ring-2 ring-primary" : ""}`}
          >
            <div className="text-xs opacity-70 font-medium">{d.getDate()}</div>
            <div className="mt-1 space-y-1">
              {dayEvents.slice(0,3).map(ev => (
                <div key={ev.id} className="truncate text-xs rounded px-1 py-0.5 
                    bg-blue-100 text-blue-800 border border-blue-200 dark:bg-blue-900 dark:text-blue-200">
                  {ev.source === "ai" && "🧠 "}{ev.title}
                </div>
              ))}
              {dayEvents.length>3 && <div className="text-[11px] text-muted-foreground">+{dayEvents.length-3} أخرى</div>}
            </div>
          </button>
        );
      })}
    </div>
  );
}

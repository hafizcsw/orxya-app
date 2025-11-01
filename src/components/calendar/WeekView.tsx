import DayPrayerOverlay from "./DayPrayerOverlay";
import { startOfWeek, addDays, toISODate } from "@/lib/dates";

type Event = {
  id: string; 
  title: string; 
  starts_at: string; 
  ends_at: string; 
  source?: string;
};

type PT = { 
  fajr?: string; 
  dhuhr?: string; 
  asr?: string; 
  maghrib?: string; 
  isha?: string 
};

type Props = {
  anchor: Date;
  eventsByDate: Record<string, Event[]>;
  prayersByDate: Record<string, PT>;
  onEventClick?: (id: string)=>void;
};

function minutesSinceMidnight(iso: string) {
  const d = new Date(iso);
  return d.getHours()*60 + d.getMinutes();
}

export default function WeekView({ anchor, eventsByDate, prayersByDate, onEventClick }: Props) {
  const weekStart = startOfWeek(anchor, 0);
  const days: Date[] = Array.from({length:7}, (_,i)=> addDays(weekStart, i));
  
  return (
    <div className="grid grid-cols-[80px,1fr,1fr,1fr,1fr,1fr,1fr,1fr] h-[72vh] border rounded-2xl overflow-auto">
      <div className="border-r bg-muted/40 sticky left-0 z-10">
        {Array.from({length:24}, (_,h)=>(
          <div key={h} className="h-[calc(100%/24)] text-[10px] px-1 border-b flex items-start">{h}:00</div>
        ))}
      </div>
      {days.map((d, idx) => {
        const iso = toISODate(d);
        const list = (eventsByDate[iso] ?? []).slice();
        const dayName = d.toLocaleDateString(undefined, { weekday: 'short' });
        
        return (
          <div key={idx} className="relative border-r">
            <div className="sticky top-0 bg-background border-b p-1 text-xs text-center font-medium z-10">
              {dayName} {d.getDate()}
            </div>
            {Array.from({length:24}, (_,h)=>(
              <div key={h} className="h-[calc((100%-28px)/24)] border-b" />
            ))}
            <DayPrayerOverlay {...(prayersByDate[iso] ?? {})} />
            {list.map(ev => {
              const startMin = minutesSinceMidnight(ev.starts_at);
              const endMin = minutesSinceMidnight(ev.ends_at);
              const top = ((startMin/(24*60))*100);
              const height = Math.max(20, ((endMin-startMin)/(24*60))*100);
              
              return (
                <button
                  key={ev.id}
                  onClick={()=>onEventClick?.(ev.id)}
                  className={`absolute left-1 right-1 rounded-md border p-1 text-xs text-left overflow-hidden hover:opacity-90 transition-opacity
                    ${ev.source === "ai" ? "bg-purple-100 border-purple-300 text-purple-900 dark:bg-purple-900 dark:text-purple-200" : "bg-violet-100 border-violet-300 text-violet-900 dark:bg-violet-900 dark:text-violet-200"}`}
                  style={{ top: `calc(28px + ${top}%)`, height: `${height}%` }}
                  title={ev.title}
                >
                  <div className="font-medium truncate">{ev.source === "ai" && "🧠 "}{ev.title}</div>
                </button>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}

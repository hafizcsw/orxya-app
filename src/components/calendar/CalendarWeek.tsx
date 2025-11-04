import { useEffect, useMemo, useState, useRef } from "react";
import { addDays, startOfWeek, endOfWeek, formatISO } from "date-fns";
import { useCalendarData } from "@/hooks/useCalendarData";
import CalendarDay from "./CalendarDay";
import EventDetailsDrawer from "./EventDetailsDrawer";
import AllDayRow from "./AllDayRow";
import { supabase } from "@/integrations/supabase/client";
import { track } from "@/lib/telemetry";
import { ChevronLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import { getCurrentTimePosition } from "@/lib/eventPacking";
import { useVisibleHours } from "@/hooks/useVisibleHours";
import { useSelectedDate } from "@/contexts/DateContext";
type Props = {
  anchor?: Date;
  startOn?: 0 | 1 | 2 | 3 | 4 | 5 | 6;
  onDateChange?: (date: Date) => void;
  showPrayerTimes?: boolean;
};
export default function CalendarWeek({
  anchor = new Date(),
  startOn = 6,
  onDateChange,
  showPrayerTimes = true
}: Props) {
  const {
    setSelectedDate: setGlobalDate
  } = useSelectedDate();
  const gridRef = useRef<HTMLDivElement>(null);
  const [selectedEvent, setSelectedEvent] = useState<any | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [conflictData, setConflictData] = useState<{
    hasConflict: boolean;
    conflictId: string | null;
  }>({
    hasConflict: false,
    conflictId: null
  });
  const pxPerHour = 64;
  const pxPerMin = pxPerHour / 60;
  const visibleRange = useVisibleHours(gridRef, pxPerHour);
  const start = startOfWeek(anchor, {
    weekStartsOn: startOn
  });
  const end = endOfWeek(anchor, {
    weekStartsOn: startOn
  });
  const days = useMemo(() => Array.from({
    length: 7
  }, (_, i) => addDays(start, i)), [start]);
  const range = {
    from: formatISO(start, {
      representation: "date"
    }),
    to: formatISO(end, {
      representation: "date"
    })
  };
  const {
    events,
    prayersByDay,
    loading,
    reload,
    reloadThrottled
  } = useCalendarData(range);

  // Collect all events for all-day row
  const allEvents = useMemo(() => {
    return Object.values(events).flat();
  }, [events]);
  useEffect(() => {
    reloadThrottled();
    track("cal_view_range", {
      from: range.from,
      to: range.to
    });
  }, [range.from, range.to]);

  // Update current time every minute
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000);
    return () => clearInterval(interval);
  }, []);
  const navigateWeek = (direction: "prev" | "next") => {
    const newDate = addDays(anchor, direction === "next" ? 7 : -7);
    onDateChange?.(newDate);
  };
  const goToToday = () => {
    onDateChange?.(new Date());
  };
  const handleEventClick = async (event: any) => {
    setSelectedEvent(event);
    track("cal_open_from_week_chip", {
      event_id: event.id
    });

    // Check for conflicts
    const {
      data: conflicts
    } = await supabase.from("conflicts").select("id, status").eq("event_id", event.id).eq("status", "open").maybeSingle();
    setConflictData({
      hasConflict: !!conflicts,
      conflictId: conflicts?.id || null
    });
    setDrawerOpen(true);
  };
  const handleDrawerClose = () => {
    setDrawerOpen(false);
    setSelectedEvent(null);
    setConflictData({
      hasConflict: false,
      conflictId: null
    });
  };
  return <div className="w-full h-[calc(100vh-200px)] sm:h-[calc(100vh-160px)] flex flex-col bg-background rounded-lg overflow-hidden border border-border/20">
      {/* Navigation header - Google Calendar style - Hidden on mobile */}
      <div className="hidden sm:flex items-center justify-between px-4 sm:px-6 py-3 border-b border-border/20">
        <div className="flex items-center gap-2 sm:gap-3">
          
          
          
        </div>

        <h2 className="text-base sm:text-lg font-normal text-foreground">
          {start.toLocaleDateString("ar", {
          month: "long",
          year: "numeric"
        })}
        </h2>

        <button onClick={reload} disabled={loading} className="px-4 py-2 text-sm font-medium rounded-md hover:bg-accent/50 transition-colors disabled:opacity-50">
          {loading ? "..." : "تحديث"}
        </button>
      </div>

      {/* Week view container */}
      <div className="flex flex-1 overflow-hidden relative">
        {/* Days grid - Main scrollable area */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Day headers - Sticky */}
          <div className="flex border-b border-border/10 bg-background h-12 sm:h-12 sticky top-0 z-20">
            <div className="w-14 sm:w-16 flex-shrink-0" /> {/* Spacer for time gutter */}
            <div className="grid grid-cols-7 flex-1">
            {days.map((d, i) => {
              const isToday = d.toDateString() === new Date().toDateString();
              return <div key={i} className={cn("flex flex-col items-center justify-center gap-1 border-l border-border/30 text-center px-1", i === 0 && "border-l-0")}>
                  <div className="text-xs sm:text-[11px] text-muted-foreground font-normal">
                    {d.toLocaleDateString("ar", {
                    weekday: "short"
                  })}
                  </div>
                  <button onClick={() => {
                  onDateChange?.(d);
                  setGlobalDate(d);
                }} className={cn("flex items-center justify-center rounded-full transition-all font-medium cursor-pointer hover:bg-accent", "w-7 h-7 sm:w-7 sm:h-7 text-sm sm:text-sm", isToday ? "bg-[#1a73e8] text-white shadow-md hover:bg-[#1557b0]" : "text-foreground hover:bg-muted")}>
                    {d.getDate()}
                  </button>
                  </div>;
            })}
            </div>
          </div>

          {/* All-Day Row */}
          <AllDayRow events={allEvents} days={days} onEventClick={handleEventClick} />

          {/* Scrollable container */}
          <div className="flex-1 overflow-auto relative" ref={gridRef}>
            <div className="flex relative">
              {/* Time gutter - نظيف */}
              <div className="w-14 sm:w-16 flex-shrink-0 bg-background">
                <div className="relative">
                  {Array.from({ length: 24 }, (_, h) => {
                    // عرض كل 3 ساعات فقط
                    if (h % 3 !== 0) return <div key={h} style={{ height: pxPerHour }} />;
                    
                    return (
                      <div 
                        key={h} 
                        className="relative text-right pr-2 sm:pr-3" 
                        style={{ height: pxPerHour * 3 }}
                      >
                        {h > 0 && (
                          <span className="absolute -top-2.5 right-1 sm:right-2 text-[10px] text-muted-foreground/60 font-normal">
                            {h.toString().padStart(2, "0")}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Week grid with days */}
              <div className="grid grid-cols-7 flex-1 relative">
                {days.map((d, i) => {
                const iso = d.toISOString().slice(0, 10);
                const dayEvents = events[iso] ?? [];
                const prayers = prayersByDay[iso] ?? null;
                return <CalendarDay key={i} date={d} events={dayEvents} prayers={showPrayerTimes ? prayers : null} onReload={reload} onEventClick={handleEventClick} onCreate={payload => {
                  track("cal_create_drag", {
                    durMin: payload.durationMin
                  });
                }} onMove={(evt, to) => {
                  track("cal_move", {
                    id: evt.id,
                    to_start: to.start_ts
                  });
                }} onResize={(evt, to) => {
                  track("cal_resize", {
                    id: evt.id,
                    to_end: to.end_ts
                  });
                }} visibleRange={visibleRange} pxPerHour={pxPerHour} />;
              })}

                {/* Current time indicator - خط أحمر أنيق */}
                {days.some(d => d.toDateString() === new Date().toDateString()) && (
                  <div 
                    className="absolute left-0 right-0 z-30 pointer-events-none" 
                    style={{ top: getCurrentTimePosition(pxPerMin) }}
                  >
                    <div className="flex items-center">
                      <div className="w-2.5 h-2.5 rounded-full bg-red-500 shadow-lg -ml-1.5" />
                      <div className="flex-1 h-[2px] bg-red-500 shadow-md" />
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Event Details Drawer */}
      <EventDetailsDrawer event={selectedEvent} open={drawerOpen} onClose={handleDrawerClose} onUpdate={reload} hasConflict={conflictData.hasConflict} conflictId={conflictData.conflictId} />
    </div>;
}
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
  return <div className="w-full h-[calc(100vh-200px)] sm:h-[calc(100vh-160px)] flex flex-col bg-white dark:bg-background overflow-hidden">
      {/* Navigation header - Hidden on mobile */}
      <div className="hidden sm:flex items-center justify-between px-4 sm:px-6 py-3 border-b border-border/10 bg-white dark:bg-background">
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Navigation buttons would go here */}
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
      <div className="flex flex-1 overflow-hidden relative bg-white dark:bg-background">
        {/* Days grid - Main scrollable area */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Day headers - Google Calendar style */}
          <div className="flex border-b border-border/20 bg-white dark:bg-background sticky top-0 z-20 shadow-sm">
            <div className="w-16 flex-shrink-0 border-r border-border/20" /> {/* Spacer for time gutter */}
            <div className="grid grid-cols-7 flex-1">
            {days.map((d, i) => {
              const isToday = d.toDateString() === new Date().toDateString();
              const weekdayShort = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'][d.getDay()];
              
              return <div key={i} className={cn("flex flex-col items-center justify-center py-3 px-2 border-l border-border/10", i === 0 && "border-l-0")}>
                  <div className="text-[11px] text-muted-foreground/70 font-medium mb-1.5 uppercase tracking-wide">
                    {weekdayShort}
                  </div>
                  <button onClick={() => {
                  onDateChange?.(d);
                  setGlobalDate(d);
                }} className={cn("flex items-center justify-center rounded-full transition-all font-medium cursor-pointer", "w-12 h-12 text-2xl", isToday ? "bg-[#1a73e8] text-white shadow-md hover:bg-[#1557b0]" : "text-foreground hover:bg-muted/50")}>
                    {d.getDate()}
                  </button>
                  </div>;
            })}
            </div>
          </div>

          {/* All-Day Row */}
          <AllDayRow events={allEvents} days={days} onEventClick={handleEventClick} />

          {/* Scrollable container */}
          <div className="flex-1 overflow-auto relative bg-white dark:bg-background" ref={gridRef}>
            <div className="flex relative">
              {/* Time gutter - Google Calendar exact style */}
              <div className="w-16 flex-shrink-0 bg-white dark:bg-background border-r border-border/20">
                <div className="relative">
                  {Array.from({ length: 24 }, (_, h) => {
                    const period = h < 12 ? 'AM' : 'PM';
                    const displayHour = h === 0 ? 12 : h > 12 ? h - 12 : h;
                    
                    return (
                      <div 
                        key={h} 
                        className="relative" 
                        style={{ height: pxPerHour }}
                      >
                        {h > 0 && (
                          <div className="absolute -top-2.5 left-0 right-0 text-center">
                            <span className="text-[10px] text-muted-foreground/60 font-normal">
                              {displayHour} {period}
                            </span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Week grid with days */}
              <div className="grid grid-cols-7 flex-1 relative bg-white dark:bg-background">
                {/* Hour lines - very subtle */}
                <div className="absolute inset-0 pointer-events-none col-span-7">
                  {Array.from({ length: 24 }, (_, h) => (
                    <div 
                      key={h} 
                      className="absolute left-0 right-0 border-t border-border/[0.08]"
                      style={{ top: h * pxPerHour }}
                    />
                  ))}
                </div>

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

                {/* Current time indicator - Google style */}
                {days.some(d => d.toDateString() === new Date().toDateString()) && (
                  <div 
                    className="absolute left-0 right-0 z-30 pointer-events-none col-span-7" 
                    style={{ top: getCurrentTimePosition(pxPerMin) }}
                  >
                    <div className="relative">
                      <div className="absolute -left-1.5 -top-1.5 w-3 h-3 rounded-full bg-[#ea4335] shadow-lg" />
                      <div className="h-[2px] bg-[#ea4335]" />
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
import { useEffect, useMemo, useState, useRef } from "react";
import { formatISO } from "date-fns";
import { useCalendarData } from "@/hooks/useCalendarData";
import CalendarDay from "./CalendarDay";
import EventDetailsDrawer from "./EventDetailsDrawer";
import AllDayRow from "./AllDayRow";
import { supabase } from "@/integrations/supabase/client";
import { track } from "@/lib/telemetry";
import { cn } from "@/lib/utils";
import { getCurrentTimePosition } from "@/lib/eventPacking";
import { useVisibleHours } from "@/hooks/useVisibleHours";

type Props = {
  anchor?: Date;
  onDateChange?: (date: Date) => void;
  showPrayerTimes?: boolean;
};

export default function CalendarDayView({
  anchor = new Date(),
  onDateChange,
  showPrayerTimes = true
}: Props) {
  const gridRef = useRef<HTMLDivElement>(null);
  const [selectedEvent, setSelectedEvent] = useState<any | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [aiInsights, setAiInsights] = useState<string>("");
  const [loadingInsights, setLoadingInsights] = useState(false);
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

  const range = {
    from: formatISO(anchor, { representation: "date" }),
    to: formatISO(anchor, { representation: "date" })
  };

  const {
    events,
    prayersByDay,
    loading,
    reload,
    reloadThrottled
  } = useCalendarData(range);

  const allEvents = useMemo(() => {
    return Object.values(events).flat();
  }, [events]);

  const iso = anchor.toISOString().slice(0, 10);
  const dayEvents = events[iso] ?? [];
  const prayers = prayersByDay[iso] ?? null;
  const isToday = anchor.toDateString() === new Date().toDateString();

  // Fetch AI insights when events load or time changes significantly
  useEffect(() => {
    const fetchInsights = async () => {
      setLoadingInsights(true);
      try {
        const { data, error } = await supabase.functions.invoke('calendar-ai-insights', {
          body: { 
            date: anchor.toISOString().split('T')[0],
            currentTime: new Date().toISOString()
          }
        });
        
        if (!error && data?.insights) {
          setAiInsights(data.insights);
        } else if (data?.fallback) {
          setAiInsights(data.fallback);
        }
      } catch (err) {
        console.error('Failed to fetch AI insights:', err);
      } finally {
        setLoadingInsights(false);
      }
    };
    
    // Only fetch if it's today
    if (isToday && allEvents.length >= 0) {
      fetchInsights();
    }
  }, [anchor, allEvents.length, isToday]);

  useEffect(() => {
    reloadThrottled();
    track("cal_view_day", {
      date: range.from
    });
  }, [range.from]);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  const handleEventClick = async (event: any) => {
    setSelectedEvent(event);
    track("cal_open_from_day_chip", {
      event_id: event.id
    });

    const { data: conflicts } = await supabase
      .from("conflicts")
      .select("id, status")
      .eq("event_id", event.id)
      .eq("status", "open")
      .maybeSingle();

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


  return (
    <div className="w-full h-[calc(100vh-200px)] sm:h-[calc(100vh-160px)] flex flex-col bg-background rounded-lg overflow-hidden border border-border/20">
      {/* Header */}
      <div className="hidden sm:flex items-center justify-between px-4 sm:px-6 py-3 border-b border-border/20">
        <h2 className="text-base sm:text-lg font-normal text-foreground">
          {anchor.toLocaleDateString("ar", {
            weekday: "long",
            day: "numeric",
            month: "long",
            year: "numeric"
          })}
        </h2>

        <button
          onClick={reload}
          disabled={loading}
          className="px-4 py-2 text-sm font-medium rounded-md hover:bg-accent/50 transition-colors disabled:opacity-50"
        >
          {loading ? "..." : "تحديث"}
        </button>
      </div>

      {/* Day view container */}
      <div className="flex flex-1 overflow-hidden relative">
        <div className="flex flex-1 flex-col overflow-hidden">
          {/* AI Insights Banner - Only for Today */}
          {isToday && aiInsights && (
            <div className="px-4 py-3 bg-gradient-to-r from-blue-500/10 via-purple-500/10 to-blue-500/10 border-b border-blue-500/20 backdrop-blur-sm animate-fade-in">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-lg">
                  <span className="text-sm">🤖</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground leading-relaxed">
                    {loadingInsights ? (
                      <span className="flex items-center gap-2">
                        <span className="inline-block w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                        جاري تحليل يومك...
                      </span>
                    ) : (
                      aiInsights
                    )}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Day header */}
          <div className="flex border-b border-border/10 bg-background h-12 sm:h-12 sticky top-0 z-20">
            <div className="w-14 sm:w-16 flex-shrink-0" />
            <div className="flex-1 flex flex-col items-center justify-center gap-1 px-1 text-center">
              <div className="text-xs sm:text-[11px] text-muted-foreground font-normal">
                {anchor.toLocaleDateString("ar", { weekday: "short" })}
              </div>
              <div
                className={cn(
                  "flex items-center justify-center rounded-full transition-all font-medium",
                  "w-7 h-7 sm:w-7 sm:h-7 text-sm sm:text-sm",
                  isToday
                    ? "bg-[#1a73e8] text-white shadow-md"
                    : "text-foreground"
                )}
              >
                {anchor.getDate()}
              </div>
            </div>
          </div>

          {/* All-Day Row */}
          <AllDayRow events={allEvents} days={[anchor]} onEventClick={handleEventClick} />

          {/* Scrollable container */}
          <div className="flex-1 overflow-auto relative" ref={gridRef}>
            <div className="flex relative">
              {/* Time gutter */}
              <div className="w-14 sm:w-16 flex-shrink-0 bg-background">
                <div className="relative">
                  {Array.from({ length: 24 }, (_, h) => {
                    const period = h < 12 ? 'AM' : 'PM';
                    const displayHour = h === 0 ? 12 : h > 12 ? h - 12 : h;
                    return (
                      <div
                        key={h}
                        className="relative text-right pr-2 sm:pr-3"
                        style={{ height: pxPerHour }}
                      >
                        <span className="absolute -top-2.5 right-1 sm:right-2 text-[10px] sm:text-[11px] text-muted-foreground font-normal leading-tight">
                          {h === 0 ? "" : (
                            <>
                              <span className="block sm:inline">{displayHour.toString().padStart(2, "0")}:00</span>
                              <span className="block sm:inline sm:ml-1 text-[8px] sm:text-[10px]">{period}</span>
                            </>
                          )}
                        </span>
                        <div className="absolute top-0 left-0 right-0 border-t border-border/10" />
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Day grid */}
              <div className="flex-1 relative">
                <CalendarDay
                  date={anchor}
                  events={dayEvents}
                  prayers={showPrayerTimes ? prayers : null}
                  onReload={reload}
                  onEventClick={handleEventClick}
                  onCreate={(payload) => {
                    track("cal_create_drag_day", {
                      durMin: payload.durationMin
                    });
                  }}
                  onMove={(evt, to) => {
                    track("cal_move_day", {
                      id: evt.id,
                      to_start: to.start_ts
                    });
                  }}
                  onResize={(evt, to) => {
                    track("cal_resize_day", {
                      id: evt.id,
                      to_end: to.end_ts
                    });
                  }}
                  visibleRange={visibleRange}
                  pxPerHour={pxPerHour}
                />

                {/* Current time indicator */}
                {isToday && (
                  <div
                    className="absolute left-0 right-0 h-[2px] bg-red-500 z-30 pointer-events-none"
                    style={{ top: getCurrentTimePosition(pxPerMin) }}
                  >
                    <div className="absolute -right-1 -top-1.5 w-3 h-3 rounded-full bg-red-500 shadow-lg" />
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Event Details Drawer */}
      <EventDetailsDrawer
        event={selectedEvent}
        open={drawerOpen}
        onClose={handleDrawerClose}
        onUpdate={reload}
        hasConflict={conflictData.hasConflict}
        conflictId={conflictData.conflictId}
      />
    </div>
  );
}

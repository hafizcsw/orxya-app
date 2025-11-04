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
        // Get current session first
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session) {
          console.log('No active session for AI insights');
          setLoadingInsights(false);
          return;
        }

        const { data, error } = await supabase.functions.invoke('calendar-ai-insights', {
          body: { 
            date: anchor.toISOString().split('T')[0],
            currentTime: new Date().toISOString()
          }
        });
        
        if (error) {
          console.error('Error fetching AI insights:', error);
          setAiInsights(null);
        } else if (data?.insights) {
          setAiInsights(data.insights);
        } else if (data?.fallback) {
          setAiInsights(data.fallback);
        }
      } catch (err) {
        console.error('Failed to fetch AI insights:', err);
        setAiInsights(null);
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
    <div className="w-full h-[calc(100vh-200px)] sm:h-[calc(100vh-160px)] flex flex-col bg-background overflow-hidden">
      {/* Header - Google Calendar style */}
      <div className="hidden sm:flex items-center justify-between px-4 sm:px-6 py-3 border-b border-border bg-background">
        <h2 className="text-[15px] sm:text-base font-medium text-foreground">
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
          className="px-3 py-1.5 text-[13px] font-medium text-muted-foreground rounded-md hover:bg-muted transition-colors disabled:opacity-50"
        >
          {loading ? "..." : "تحديث"}
        </button>
      </div>

      {/* Day view container */}
      <div className="flex flex-1 overflow-hidden relative">
        <div className="flex flex-1 flex-col overflow-hidden">
          {/* AI Insights Banner - Google style */}
          {isToday && aiInsights && (
            <div className="px-4 py-2.5 bg-primary/5 border-b border-primary/10 animate-fade-in">
              <div className="flex items-start gap-2.5">
                <div className="flex-shrink-0 w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center">
                  <span className="text-[13px]">🤖</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] text-foreground/90 leading-relaxed">
                    {loadingInsights ? (
                      <span className="flex items-center gap-2">
                        <span className="inline-block w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
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

          {/* Day header - Google style */}
          <div className="flex border-b border-border bg-background h-[52px] sticky top-0 z-20">
            <div className="w-14 sm:w-16 flex-shrink-0 border-r border-border" />
            <div className="flex-1 flex flex-col items-center justify-center gap-0.5 px-1 text-center">
              <div className="text-[11px] text-muted-foreground font-normal uppercase tracking-wide">
                {anchor.toLocaleDateString("ar", { weekday: "short" })}
              </div>
              <div
                className={cn(
                  "flex items-center justify-center rounded-full transition-all",
                  "w-10 h-10 text-[15px]",
                  isToday
                    ? "bg-primary text-white font-medium shadow-sm"
                    : "text-foreground font-normal hover:bg-muted"
                )}
              >
                {anchor.getDate()}
              </div>
            </div>
          </div>

          {/* All-Day Row */}
          <AllDayRow events={allEvents} days={[anchor]} onEventClick={handleEventClick} />

          {/* Scrollable container */}
          <div className="flex-1 overflow-auto relative bg-background" ref={gridRef}>
            <div className="flex relative">
              {/* Time gutter - Google style */}
              <div className="w-14 sm:w-16 flex-shrink-0 bg-background border-r border-border">
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
                        <span className="absolute -top-2 right-1 sm:right-2 text-[10px] text-muted-foreground font-normal">
                          {h === 0 ? "" : (
                            <>
                              {displayHour}
                              <span className="ml-0.5 text-[9px]">{period}</span>
                            </>
                          )}
                        </span>
                        <div className="absolute top-0 left-0 right-0 border-t border-border" />
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

                {/* Current time indicator - Google style */}
                {isToday && (
                  <div
                    className="absolute left-0 right-0 h-[2px] bg-[#ea4335] z-30 pointer-events-none"
                    style={{ top: getCurrentTimePosition(pxPerMin) }}
                  >
                    <div className="absolute -left-1.5 -top-1.5 w-3 h-3 rounded-full bg-[#ea4335]" />
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

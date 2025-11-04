import { useEffect, useMemo, useState, useRef } from "react";
import { formatISO } from "date-fns";
import { useCalendarData } from "@/hooks/useCalendarData";
import CalendarDay from "./CalendarDay";
import EventDetailsDrawer from "./EventDetailsDrawer";
import AllDayRow from "./AllDayRow";
import { SmartSummaryCard } from './SmartSummaryCard';
import { supabase } from "@/integrations/supabase/client";
import { track } from "@/lib/telemetry";
import { cn } from "@/lib/utils";
import { zIndex } from '@/lib/z-index';
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
        // Get current session
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session?.access_token) {
          console.log('No active session for AI insights');
          setLoadingInsights(false);
          return;
        }

        // Call the edge function with explicit auth header
        const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/calendar-ai-insights`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
            'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY
          },
          body: JSON.stringify({
            date: anchor.toISOString().split('T')[0],
            currentTime: new Date().toISOString()
          })
        });
        
        if (!response.ok) {
          const errorData = await response.json();
          console.error('Error fetching AI insights:', errorData);
          setAiInsights(null);
          return;
        }

        const data = await response.json();
        
        if (data?.insights) {
          setAiInsights(data.insights);
        } else if (data?.fallback) {
          setAiInsights(data.fallback);
        } else {
          setAiInsights(null);
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

  // Auto-scroll to current time on mount (only for today)
  useEffect(() => {
    const isToday = anchor.toDateString() === new Date().toDateString();
    
    if (gridRef.current && isToday) {
      // تأخير بسيط للسماح بالـ render
      const timer = setTimeout(() => {
        const now = new Date();
        const currentMinutes = now.getHours() * 60 + now.getMinutes();
        const currentPosition = currentMinutes * pxPerMin;
        
        // التمرير بحيث يكون الوقت الحالي في الثلث العلوي من الشاشة
        const offset = 150; // مساحة فوق الوقت الحالي
        const scrollTop = Math.max(0, currentPosition - offset);
        
        gridRef.current?.scrollTo({
          top: scrollTop,
          behavior: 'smooth'
        });
      }, 150);

      return () => clearTimeout(timer);
    }
  }, [anchor, pxPerMin]);

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
          {/* Smart Summary Card */}
          {isToday && allEvents.length > 0 && (
            <div className="px-4 pt-3">
              <SmartSummaryCard 
                events={allEvents} 
                aiInsight={aiInsights}
              />
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
          <div className="flex-1 overflow-auto relative bg-background scroll-smooth" ref={gridRef}>
            <div className="flex relative">
              {/* Time gutter - Google style */}
              <div className="w-14 sm:w-16 flex-shrink-0 bg-background border-r border-border">
                <div className="relative">
                  {Array.from({ length: 24 }, (_, h) => {
                    const period = h < 12 ? 'ص' : 'م';
                    const displayHour = h === 0 ? 12 : h > 12 ? h - 12 : h;
                    return (
                      <div key={h} className="relative" style={{ height: pxPerHour }}>
                        {/* Hour line - واضح */}
                        <div className="absolute top-0 left-0 right-0 border-t border-border/40" style={{ zIndex: zIndex.hourLines }} />
                        
                        {/* Half-hour line - رفيع ومنقط */}
                        <div 
                          className="absolute left-0 right-0 border-t border-border/15 border-dashed" 
                          style={{ top: pxPerHour / 2, zIndex: zIndex.hourLines }} 
                        />
                        
                        {/* Time label */}
                        <span className="absolute -top-2.5 right-2 text-[11px] font-medium text-muted-foreground">
                          {h === 0 ? "" : (
                            <span className="flex items-baseline gap-0.5">
                              <span>{displayHour}</span>
                              <span className="text-[9px] opacity-70">{period}</span>
                            </span>
                          )}
                        </span>
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
                    className="absolute left-0 right-0 pointer-events-none transition-all"
                    style={{ 
                      top: getCurrentTimePosition(pxPerMin),
                      zIndex: zIndex.currentTimeLine 
                    }}
                  >
                    <div className="relative h-[2px] bg-red-500 shadow-sm">
                      <div className="absolute -left-1.5 -top-1.5 w-3 h-3 rounded-full bg-red-500 shadow-md" />
                    </div>
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

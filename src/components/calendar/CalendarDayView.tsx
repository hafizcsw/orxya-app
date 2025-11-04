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

      {/* Day view container */}
      <div className="flex flex-1 overflow-hidden relative">
        <div className="flex flex-1 flex-col overflow-hidden">
          {/* All-Day Row */}
          <AllDayRow events={allEvents} days={[anchor]} onEventClick={handleEventClick} />

          {/* Scrollable container */}
          <div className="flex-1 overflow-auto relative bg-background scroll-smooth" ref={gridRef}>
            <div className="flex relative">
              {/* Clean Time Gutter - Google Calendar Style */}
              <div className="w-14 sm:w-16 flex-shrink-0 bg-background border-l border-border/10 relative">
                {Array.from({ length: 24 }, (_, h) => {
                  const period = h < 12 ? 'ص' : 'م';
                  const displayHour = h === 0 ? 12 : h > 12 ? h - 12 : h;
                  
                  return (
                    <div key={h} className="relative" style={{ height: pxPerHour }}>
                      {/* Time label - clean and simple */}
                      {h !== 0 && (
                        <div className="absolute -top-2.5 right-2 text-[11px] text-muted-foreground/70 font-medium flex items-baseline gap-0.5">
                          <span>{displayHour}</span>
                          <span className="text-[9px]">{period}</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Day grid with subtle lines */}
              <div className="flex-1 relative">
                {/* Hour lines background - very subtle */}
                <div className="absolute inset-0 pointer-events-none">
                  {Array.from({ length: 24 }, (_, h) => (
                    <div 
                      key={h} 
                      className="absolute left-0 right-0 border-t border-border/5"
                      style={{ top: h * pxPerHour }}
                    />
                  ))}
                </div>

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

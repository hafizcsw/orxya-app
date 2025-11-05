import { useEffect, useMemo, useState, useRef } from "react";
import { addDays, startOfWeek, endOfWeek, formatISO } from "date-fns";
import { useCalendarData } from "@/hooks/useCalendarData";
import CalendarDay from "./CalendarDay";
import EventDetailsDrawer from "./EventDetailsDrawer";
import AllDayRow from "./AllDayRow";
import { supabase } from "@/integrations/supabase/client";
import { track } from "@/lib/telemetry";
import { useSettings } from "@/contexts/SettingsContext";
import { ChevronLeft, ChevronRight, Search, HelpCircle, Settings } from "lucide-react";
import { cn } from "@/lib/utils";
import { getCurrentTimePosition } from "@/lib/eventPacking";
import { useVisibleHours } from "@/hooks/useVisibleHours";
import { useSelectedDate } from "@/contexts/DateContext";
import { useNavigate } from "react-router-dom";
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
  const navigate = useNavigate();
  const { settings } = useSettings();
  const {
    setSelectedDate: setGlobalDate
  } = useSelectedDate();
  const gridRef = useRef<HTMLDivElement>(null);
  const [selectedEvent, setSelectedEvent] = useState<any | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [viewMode, setViewMode] = useState<'day' | 'week' | 'month'>('week');
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
      {/* Top Navigation Bar - Google Calendar Exact 56px */}
      <div className="flex items-center justify-between px-6 border-b bg-white dark:bg-background" style={{ height: '56px', borderColor: '#e0e0e0' }}>
        {/* Left Section */}
        <div className="flex items-center gap-3">
          {/* Today Button */}
          <button 
            onClick={goToToday}
            className="px-5 py-2 text-[13px] font-['Roboto'] font-medium text-[#3c4043] border rounded-md hover:bg-[#f8f9fa] transition-all duration-150"
            style={{ height: '36px', borderColor: '#dadce0' }}
          >
            اليوم
          </button>
          
          {/* Navigation Arrows */}
          <div className="flex items-center gap-0">
            <button 
              onClick={() => navigateWeek("prev")}
              className="p-2 hover:bg-[#f1f3f4] rounded-full transition-all duration-150"
              style={{ width: '40px', height: '40px' }}
            >
              <ChevronRight className="w-5 h-5" style={{ color: '#5f6368' }} />
            </button>
            <button 
              onClick={() => navigateWeek("next")}
              className="p-2 hover:bg-[#f1f3f4] rounded-full transition-all duration-150"
              style={{ width: '40px', height: '40px' }}
            >
              <ChevronLeft className="w-5 h-5" style={{ color: '#5f6368' }} />
            </button>
          </div>

          {/* Month/Year Display */}
          <h2 className="text-[22px] font-['Roboto'] font-normal mr-2" style={{ color: '#3c4043' }}>
            {start.toLocaleDateString("ar", {
              month: "long",
              year: "numeric"
            })}
          </h2>
        </div>

        {/* Right Section */}
        <div className="flex items-center gap-1">
          {/* Search Button */}
          <button className="p-2 hover:bg-[#f1f3f4] rounded-full transition-all duration-150" style={{ width: '40px', height: '40px' }}>
            <Search className="w-5 h-5" style={{ color: '#5f6368' }} />
          </button>

          {/* Help Button */}
          <button className="p-2 hover:bg-[#f1f3f4] rounded-full transition-all duration-150" style={{ width: '40px', height: '40px' }}>
            <HelpCircle className="w-5 h-5" style={{ color: '#5f6368' }} />
          </button>

          {/* Settings Button */}
          <button className="p-2 hover:bg-[#f1f3f4] rounded-full transition-all duration-150" style={{ width: '40px', height: '40px' }}>
            <Settings className="w-5 h-5" style={{ color: '#5f6368' }} />
          </button>

          {/* View Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="px-4 py-2 text-[13px] font-['Roboto'] font-medium text-[#3c4043] border rounded-md hover:bg-[#f8f9fa] transition-all duration-150 flex items-center gap-2 mr-2" style={{ height: '36px', borderColor: '#dadce0' }}>
                أسبوع
                <ChevronLeft className="w-4 h-4 rotate-[-90deg]" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-40">
              <DropdownMenuItem onClick={() => navigate('/calendar/day')}>
                يوم
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate('/calendar')}>
                أسبوع
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate('/calendar/month')}>
                شهر
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Week view container */}
      <div className="flex flex-1 overflow-hidden relative bg-white dark:bg-background">
        {/* Days grid - Main scrollable area */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Day headers - Google Calendar Exact 72px */}
          <div className="flex border-b bg-white dark:bg-background sticky top-0 z-20" style={{ height: '72px', borderColor: '#e0e0e0' }}>
            <div className="flex-shrink-0 border-r" style={{ width: '72px', borderColor: '#e0e0e0' }} /> {/* Spacer for time gutter */}
            <div className="grid grid-cols-7 flex-1">
            {days.map((d, i) => {
              const isToday = d.toDateString() === new Date().toDateString();
              const weekdayShort = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'][d.getDay()];
              
              return <div key={i} className={cn("flex flex-col items-center justify-center border-l", i === 0 && "border-l-0")} style={{ borderColor: '#e0e0e0' }}>
                  <div className="text-[11px] font-['Roboto'] font-medium uppercase mb-0.5" style={{ color: '#70757a', letterSpacing: '0.8px' }}>
                    {weekdayShort}
                  </div>
                  <button onClick={() => {
                  onDateChange?.(d);
                  setGlobalDate(d);
                }} className={cn("flex items-center justify-center rounded-full transition-all duration-150 cursor-pointer", isToday ? "text-white" : "hover:bg-[#f1f3f4]")} style={{ 
                  width: '46px', 
                  height: '46px',
                  fontSize: '26px',
                  fontFamily: 'Roboto',
                  fontWeight: isToday ? 500 : 400,
                  backgroundColor: isToday ? '#1a73e8' : 'transparent',
                  color: isToday ? '#ffffff' : '#3c4043'
                }}>
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
              {/* Time gutter - Updated for better readability */}
              <div className="flex-shrink-0 bg-white dark:bg-background border-r" style={{ width: '72px', borderColor: '#e0e0e0' }}>
                <div className="relative">
                  {Array.from({ length: 24 }, (_, h) => {
                    const period = h < 12 ? 'ص' : 'م';
                    const displayHour = h === 0 ? 12 : h > 12 ? h - 12 : h;
                    
                    return (
                      <div 
                        key={h} 
                        className="relative" 
                        style={{ height: pxPerHour }}
                      >
                        {h > 0 && (
                          <div className="absolute left-0 right-0 flex flex-col items-end pr-3" style={{ top: '2px' }}>
                            <span className="text-[13px] font-medium leading-none text-muted-foreground">
                              {displayHour}
                            </span>
                            <span className="text-[11px] font-normal leading-none text-muted-foreground/70" style={{ marginTop: '1px' }}>
                              {period}
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
                {/* Hour lines - Google Calendar exact style */}
                <div className="absolute inset-0 pointer-events-none col-span-7">
                  {Array.from({ length: 24 }, (_, h) => (
                    <div 
                      key={h} 
                      className="absolute left-0 right-0 border-t"
                      style={{ top: h * pxPerHour, borderColor: '#e0e0e0' }}
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
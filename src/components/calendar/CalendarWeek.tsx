import { useEffect, useMemo, useState } from "react";
import { addDays, startOfWeek, endOfWeek, formatISO } from "date-fns";
import { useCalendarData } from "@/hooks/useCalendarData";
import CalendarDay from "./CalendarDay";
import EventDetailsDrawer from "./EventDetailsDrawer";
import { supabase } from "@/integrations/supabase/client";
import { track } from "@/lib/telemetry";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  anchor?: Date;
  startOn?: 0 | 1 | 2 | 3 | 4 | 5 | 6;
  onDateChange?: (date: Date) => void;
};

export default function CalendarWeek({ 
  anchor = new Date(), 
  startOn = 6,
  onDateChange 
}: Props) {
  const [selectedEvent, setSelectedEvent] = useState<any | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [conflictData, setConflictData] = useState<{ hasConflict: boolean; conflictId: string | null }>({
    hasConflict: false,
    conflictId: null
  });

  const start = startOfWeek(anchor, { weekStartsOn: startOn });
  const end = endOfWeek(anchor, { weekStartsOn: startOn });

  const days = useMemo(
    () => Array.from({ length: 7 }, (_, i) => addDays(start, i)),
    [start]
  );

  const range = {
    from: formatISO(start, { representation: "date" }),
    to: formatISO(end, { representation: "date" })
  };

  const { events, prayersByDay, loading, reload, reloadThrottled } = useCalendarData(range);

  useEffect(() => {
    reloadThrottled();
    track("cal_view_range", { from: range.from, to: range.to });
  }, [range.from, range.to]);

  const navigateWeek = (direction: "prev" | "next") => {
    const newDate = addDays(anchor, direction === "next" ? 7 : -7);
    onDateChange?.(newDate);
  };

  const goToToday = () => {
    onDateChange?.(new Date());
  };

  const handleEventClick = async (event: any) => {
    setSelectedEvent(event);
    
    // Check for conflicts
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
    setConflictData({ hasConflict: false, conflictId: null });
  };

  return (
    <div className="w-full h-[calc(100vh-140px)] flex flex-col card-futuristic overflow-hidden">
      {/* Navigation header */}
      <div className="flex items-center justify-between p-4 border-b bg-gradient-to-r from-background to-muted/20">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigateWeek("prev")}
            className="btn-ghost-glow p-2 rounded-lg"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
          <button
            onClick={goToToday}
            className="btn-ghost-glow px-4 py-2 text-sm rounded-lg"
          >
            اليوم
          </button>
          <button
            onClick={() => navigateWeek("next")}
            className="btn-ghost-glow p-2 rounded-lg"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
        </div>

        <h2 className="text-xl font-bold">
          {start.toLocaleDateString("ar", { month: "long", year: "numeric" })}
        </h2>

        <button
          onClick={reload}
          disabled={loading}
          className="btn-ghost-glow px-4 py-2 text-sm rounded-lg"
        >
          {loading ? "جار التحديث..." : "تحديث"}
        </button>
      </div>

      {/* Day headers */}
      <div className="grid grid-cols-7 border-b bg-muted/30">
        {days.map((d, i) => {
          const isToday = d.toDateString() === new Date().toDateString();
          return (
            <div
              key={i}
              className={cn(
                "p-3 text-sm font-medium text-center border-l",
                isToday && "bg-primary/10"
              )}
            >
              <div className="opacity-60">
                {d.toLocaleDateString("ar", { weekday: "short" })}
              </div>
              <div
                className={cn(
                  "text-2xl mt-1",
                  isToday && "w-10 h-10 mx-auto rounded-full bg-primary text-primary-foreground flex items-center justify-center"
                )}
              >
                {d.getDate()}
              </div>
            </div>
          );
        })}
      </div>

      {/* Week grid */}
      <div className="flex-1 grid grid-cols-7 overflow-auto">
        {days.map((d, i) => {
          const iso = d.toISOString().slice(0, 10);
          const dayEvents = events[iso] ?? [];
          const prayers = prayersByDay[iso] ?? null;

          return (
            <CalendarDay
              key={i}
              date={d}
              events={dayEvents}
              prayers={prayers}
              onReload={reload}
              onEventClick={handleEventClick}
              onCreate={(payload) => {
                track("cal_create_drag", { durMin: payload.durationMin });
              }}
              onMove={(evt, to) => {
                track("cal_move", { id: evt.id, to_start: to.start_ts });
              }}
              onResize={(evt, to) => {
                track("cal_resize", { id: evt.id, to_end: to.end_ts });
              }}
            />
          );
        })}
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

      {/* Footer status */}
      <div className="h-9 px-4 text-xs flex items-center justify-between border-t bg-muted/40">
        <div className="flex items-center gap-2">
          {loading && (
            <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
          )}
          <span className="opacity-60">
            {loading ? "جار التحديث..." : "جاهز"}
          </span>
        </div>
        <div className="opacity-60">
          {new Date().toLocaleTimeString("ar", {
            hour: "2-digit",
            minute: "2-digit"
          })}
        </div>
      </div>
    </div>
  );
}

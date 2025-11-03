import MiniCalendar from "./MiniCalendar";
import { Calendar, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";

type CalendarItem = {
  id: string;
  name: string;
  color: string;
  visible: boolean;
};

type Props = {
  selectedDate: Date;
  onDateSelect: (date: Date) => void;
  eventDates?: Set<string>;
  calendars?: CalendarItem[];
  onCalendarToggle?: (id: string) => void;
};

export default function CalendarSidebar({
  selectedDate,
  onDateSelect,
  eventDates,
  calendars = [
    { id: '1', name: 'التقويم الرئيسي', color: '#1a73e8', visible: true },
    { id: '2', name: 'العمل', color: '#d50000', visible: true },
    { id: '3', name: 'شخصي', color: '#f6bf26', visible: true },
  ],
  onCalendarToggle,
}: Props) {
  const [myCalendarsOpen, setMyCalendarsOpen] = useState(true);

  return (
    <div className="w-64 border-l border-border/30 bg-background p-4 space-y-4 overflow-y-auto">
      {/* Mini Calendar */}
      <MiniCalendar
        selectedDate={selectedDate}
        onDateSelect={onDateSelect}
        eventDates={eventDates}
      />

      {/* My Calendars */}
      <div className="space-y-2">
        <button
          onClick={() => setMyCalendarsOpen(!myCalendarsOpen)}
          className="flex items-center gap-2 w-full hover:bg-accent/50 px-2 py-1.5 rounded transition-colors"
        >
          <ChevronDown
            className={cn(
              "w-4 h-4 transition-transform",
              !myCalendarsOpen && "rotate-180"
            )}
          />
          <span className="text-sm font-medium">تقويماتي</span>
        </button>

        {myCalendarsOpen && (
          <div className="space-y-1 mr-6">
            {calendars.map((cal) => (
              <button
                key={cal.id}
                onClick={() => onCalendarToggle?.(cal.id)}
                className="flex items-center gap-2 w-full hover:bg-accent/50 px-2 py-1.5 rounded transition-colors text-right"
              >
                <div className="relative">
                  <Calendar className="w-4 h-4" style={{ color: cal.color }} />
                  {!cal.visible && (
                    <div className="absolute inset-0 bg-background/80 rounded-full" />
                  )}
                </div>
                <span className={cn(
                  "text-sm flex-1",
                  !cal.visible && "opacity-50"
                )}>
                  {cal.name}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

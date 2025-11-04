import MiniCalendar from "./MiniCalendar";
import { Calendar, ChevronDown, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { Button } from "@/components/ui/button";

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
    <div className="w-full h-full bg-gradient-to-b from-background to-accent/5 p-4 space-y-6 overflow-y-auto">
      {/* Enhanced Create Button */}
      <Button
        onClick={onCalendarToggle ? () => onCalendarToggle('create') : undefined}
        variant="outline"
        className="w-full justify-start gap-3 h-12 rounded-full shadow-lg hover:shadow-xl transition-all duration-300 border border-border/50 bg-white dark:bg-background font-bold text-sm hover:scale-105 hover:bg-primary/5 group"
      >
        <Plus className="w-5 h-5 group-hover:rotate-90 transition-transform duration-300" />
        إنشاء
      </Button>

      {/* Mini Calendar */}
      <MiniCalendar
        selectedDate={selectedDate}
        onDateSelect={onDateSelect}
        eventDates={eventDates}
      />

      {/* Enhanced My Calendars Section */}
      <div className="space-y-2 animate-fade-in">
        <button
          onClick={() => setMyCalendarsOpen(!myCalendarsOpen)}
          className="flex items-center gap-2 w-full hover:bg-accent/50 px-3 py-2 rounded-lg transition-all duration-200 hover:shadow-sm group"
        >
          <ChevronDown
            className={cn(
              "w-4 h-4 transition-transform duration-300",
              !myCalendarsOpen && "-rotate-90"
            )}
          />
          <span className="text-sm font-bold">تقويماتي</span>
        </button>

        {myCalendarsOpen && (
          <div className="space-y-1 mr-6 animate-slide-down">
            {calendars.map((cal) => (
              <button
                key={cal.id}
                onClick={() => onCalendarToggle?.(cal.id)}
                className="flex items-center gap-2 w-full hover:bg-accent/50 px-3 py-2 rounded-lg transition-all duration-200 text-right hover:scale-105 hover:shadow-sm group"
              >
                <div className="relative">
                  <Calendar className="w-4 h-4 transition-transform duration-200 group-hover:scale-110" style={{ color: cal.color }} />
                  {!cal.visible && (
                    <div className="absolute inset-0 bg-background/80 rounded-full" />
                  )}
                </div>
                <span className={cn(
                  "text-sm flex-1 font-medium",
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

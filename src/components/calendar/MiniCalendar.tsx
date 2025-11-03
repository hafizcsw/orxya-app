import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  selectedDate: Date;
  onDateSelect: (date: Date) => void;
  eventDates?: Set<string>; // ISO date strings
};

export default function MiniCalendar({ selectedDate, onDateSelect, eventDates = new Set() }: Props) {
  const [viewDate, setViewDate] = useState(selectedDate);

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const daysInMonth = lastDay.getDate();
  const startDayOfWeek = firstDay.getDay();

  const prevMonth = () => setViewDate(new Date(year, month - 1, 1));
  const nextMonth = () => setViewDate(new Date(year, month + 1, 1));

  const isToday = (day: number) => {
    const today = new Date();
    return today.getDate() === day && today.getMonth() === month && today.getFullYear() === year;
  };

  const isSelected = (day: number) => {
    return selectedDate.getDate() === day && selectedDate.getMonth() === month && selectedDate.getFullYear() === year;
  };

  const hasEvents = (day: number) => {
    const dateStr = new Date(year, month, day).toISOString().split('T')[0];
    return eventDates.has(dateStr);
  };

  const days = [];
  for (let i = 0; i < startDayOfWeek; i++) {
    days.push(<div key={`empty-${i}`} className="aspect-square" />);
  }
  for (let day = 1; day <= daysInMonth; day++) {
    days.push(
      <button
        key={day}
        onClick={() => onDateSelect(new Date(year, month, day))}
        className={cn(
          "aspect-square rounded-full text-xs font-medium transition-all relative",
          "hover:bg-accent/50",
          isToday(day) && "ring-2 ring-[#1a73e8]",
          isSelected(day) && "bg-[#1a73e8] text-white hover:bg-[#1557b0]",
          !isSelected(day) && "text-foreground"
        )}
      >
        {day}
        {hasEvents(day) && !isSelected(day) && (
          <div className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-[#1a73e8]" />
        )}
      </button>
    );
  }

  return (
    <div className="p-3 bg-background rounded-lg border border-border/50">
      <div className="flex items-center justify-between mb-3">
        <button
          onClick={prevMonth}
          className="p-1 hover:bg-accent/50 rounded transition-colors"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
        <div className="text-sm font-medium">
          {viewDate.toLocaleDateString('ar', { month: 'long', year: 'numeric' })}
        </div>
        <button
          onClick={nextMonth}
          className="p-1 hover:bg-accent/50 rounded transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1 mb-1">
        {['أح', 'إث', 'ثلا', 'أرب', 'خم', 'جم', 'سب'].map((day) => (
          <div key={day} className="text-[10px] text-muted-foreground text-center font-medium">
            {day}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {days}
      </div>
    </div>
  );
}

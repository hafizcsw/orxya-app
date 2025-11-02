import { useState } from 'react';
import { format, addDays, startOfWeek, isSameDay, isToday } from 'date-fns';
import { ar } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface CalendarEvent {
  date: Date;
  type: 'prayer' | 'task' | 'meeting' | 'ai';
}

interface CalendarMiniProps {
  selectedDate: Date;
  events?: CalendarEvent[];
  onDateClick?: (date: Date) => void;
  className?: string;
}

export function CalendarMini({
  selectedDate,
  events = [],
  onDateClick,
  className,
}: CalendarMiniProps) {
  const [weekStart, setWeekStart] = useState(() => startOfWeek(selectedDate, { weekStartsOn: 6 }));

  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  const goToPreviousWeek = () => setWeekStart(d => addDays(d, -7));
  const goToNextWeek = () => setWeekStart(d => addDays(d, 7));

  const getEventDots = (date: Date) => {
    return events.filter(e => isSameDay(e.date, date));
  };

  const dotColors = {
    prayer: 'bg-success',
    task: 'bg-primary',
    meeting: 'bg-accent',
    ai: 'bg-info',
  };

  return (
    <div className={cn('card p-4', className)}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={goToPreviousWeek}
          className="p-2 rounded-lg hover:bg-muted transition-colors"
        >
          <ChevronRight className="h-4 w-4" />
        </button>

        <div className="text-sm font-medium">
          {format(weekStart, 'MMMM yyyy', { locale: ar })}
        </div>

        <button
          onClick={goToNextWeek}
          className="p-2 rounded-lg hover:bg-muted transition-colors"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
      </div>

      {/* Days Grid */}
      <div className="flex gap-2">
        {days.map((day) => {
          const dayEvents = getEventDots(day);
          const isSelected = isSameDay(day, selectedDate);
          const isTodayDate = isToday(day);

          return (
            <button
              key={day.toISOString()}
              onClick={() => onDateClick?.(day)}
              className={cn(
                'flex-1 flex flex-col items-center gap-2 p-3 rounded-xl transition-all',
                'hover:bg-muted/50',
                isSelected && 'bg-primary text-primary-foreground shadow-lg scale-105',
                isTodayDate && !isSelected && 'ring-2 ring-primary ring-offset-2'
              )}
            >
              {/* Day name */}
              <div className="text-xs font-medium opacity-70">
                {format(day, 'EEEEEE', { locale: ar })}
              </div>

              {/* Date number */}
              <div className="text-lg font-bold">
                {format(day, 'd')}
              </div>

              {/* Event dots */}
              <div className="flex gap-1 h-2">
                {dayEvents.slice(0, 3).map((event, i) => (
                  <div
                    key={i}
                    className={cn(
                      'w-1.5 h-1.5 rounded-full',
                      dotColors[event.type]
                    )}
                  />
                ))}
                {dayEvents.length > 3 && (
                  <div className="text-xs opacity-70">+{dayEvents.length - 3}</div>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

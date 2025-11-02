import { useState } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

const Overlay = ({ isOpen }: { isOpen: boolean }) => {
  if (!isOpen) return null;
  return (
    <div 
      className="fixed inset-0 z-[1299]"
      style={{ 
        backgroundColor: '#000000',
        opacity: 1,
      }}
    />
  );
};


interface CalendarPopoverProps {
  children: React.ReactNode;
  selectedDate: Date;
  onDateChange: (date: Date) => void;
}

export function CalendarPopover({ children, selectedDate, onDateChange }: CalendarPopoverProps) {
  const [open, setOpen] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(new Date(selectedDate));

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const days: (number | null)[] = [];
    
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }
    
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(day);
    }
    
    return days;
  };

  const goToPreviousMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1));
  };

  const goToNextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1));
  };

  const handleDayClick = (day: number) => {
    const newDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
    onDateChange(newDate);
  };

  const isToday = (day: number) => {
    const today = new Date();
    return (
      day === today.getDate() &&
      currentMonth.getMonth() === today.getMonth() &&
      currentMonth.getFullYear() === today.getFullYear()
    );
  };

  const isSelected = (day: number) => {
    return (
      day === selectedDate.getDate() &&
      currentMonth.getMonth() === selectedDate.getMonth() &&
      currentMonth.getFullYear() === selectedDate.getFullYear()
    );
  };

  const days = getDaysInMonth(currentMonth);
  const weekDays = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];

  return (
    <>
      <Overlay isOpen={open} />
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          {children}
        </PopoverTrigger>
      <PopoverContent className="w-80 p-5 border-2 border-border shadow-2xl" align="center" sideOffset={8} style={{ backgroundColor: '#000000', zIndex: 1300 }}>
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={goToPreviousMonth}
            className="w-9 h-9 rounded-lg bg-secondary hover:bg-secondary/80 flex items-center justify-center transition-all"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
          
          <div className="text-base font-bold">
            {currentMonth.toLocaleDateString('ar-EG', { month: 'long', year: 'numeric' })}
          </div>
          
          <button
            onClick={goToNextMonth}
            className="w-9 h-9 rounded-lg bg-secondary hover:bg-secondary/80 flex items-center justify-center transition-all"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
        </div>

        {/* Week Days */}
        <div className="grid grid-cols-7 gap-1 mb-2">
          {weekDays.map((day) => (
            <div
              key={day}
              className="text-center text-xs font-semibold text-muted-foreground py-2"
            >
              {day.slice(0, 3)}
            </div>
          ))}
        </div>

        {/* Calendar Days */}
        <div className="grid grid-cols-7 gap-1">
          {days.map((day, index) => (
            <button
              key={index}
              onClick={() => day && handleDayClick(day)}
              disabled={!day}
              className={cn(
                "aspect-square rounded-lg flex items-center justify-center text-sm font-medium transition-all",
                !day && "invisible",
                day && !isSelected(day) && !isToday(day) && "text-[hsl(var(--whoop-green))] hover:bg-secondary/60 hover:scale-110",
                isToday(day) && !isSelected(day) && "bg-secondary/60 text-[hsl(var(--whoop-green))] font-bold ring-2 ring-primary/50",
                isSelected(day) && "bg-[hsl(var(--whoop-blue))] text-white font-bold shadow-lg scale-110"
              )}
            >
              {day}
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
    </>
  );
}

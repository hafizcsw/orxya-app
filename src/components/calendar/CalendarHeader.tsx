import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react';
import { cn } from '@/lib/utils';

type Props = {
  mode: "month"|"week";
  date: Date;
  onPrev: () => void;
  onNext: () => void;
  onToday: () => void;
  onMode: (m: "month"|"week") => void;
};

export default function CalendarHeader({ mode, date, onPrev, onNext, onToday, onMode }: Props) {
  const title = date.toLocaleDateString(undefined, { year: "numeric", month: "long" });
  
  return (
    <div className={cn(
      "flex items-center justify-between gap-3",
      "flex-wrap md:flex-nowrap", // No wrap on desktop
      "mb-4 md:mb-6"
    )}>
      <div className="flex items-center gap-2 md:gap-3">
        <Button 
          variant="outline" 
          size="sm" 
          onClick={onPrev} 
          aria-label="Previous"
          className="h-9 w-9 p-0"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
        
        <Button 
          variant="outline" 
          size="sm" 
          onClick={onToday}
          className="gap-2"
        >
          <Calendar className="h-4 w-4" />
          اليوم
        </Button>
        
        <Button 
          variant="outline" 
          size="sm" 
          onClick={onNext} 
          aria-label="Next"
          className="h-9 w-9 p-0"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        
        <h2 className={cn(
          "text-xl md:text-2xl font-semibold mx-3",
          "hidden md:block" // Only show on desktop
        )}>
          {title}
        </h2>
      </div>
      
      <div className="flex items-center gap-2">
        <Button 
          variant={mode === "month" ? "default" : "outline"}
          size="sm"
          onClick={() => onMode("month")}
          className="md:h-10 md:px-4"
        >
          شهر
        </Button>
        <Button 
          variant={mode === "week" ? "default" : "outline"}
          size="sm"
          onClick={() => onMode("week")}
          className="md:h-10 md:px-4"
        >
          أسبوع
        </Button>
      </div>
    </div>
  );
}

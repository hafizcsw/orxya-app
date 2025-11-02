import { useState, useMemo } from 'react';
import { format, addDays, startOfWeek } from 'date-fns';
import { ar } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import { NeonButton } from '@/components/ui/NeonButton';
import { GlassPanel } from '@/components/ui/GlassPanel';
import { cn } from '@/lib/utils';

interface Event {
  id: string;
  title: string;
  starts_at: string;
  ends_at: string;
  status?: string;
  ai_confidence?: number;
  conflict_count?: number;
}

interface CalendarGridProps {
  view: 'day' | 'week';
  date: Date;
  events: Event[];
  prayerTimes?: {
    fajr: string;
    dhuhr: string;
    asr: string;
    maghrib: string;
    isha: string;
  };
  onDateChange: (date: Date) => void;
  onEventClick: (event: Event) => void;
  onAddEvent: (time: Date) => void;
}

export function CalendarGrid({
  view,
  date,
  events,
  prayerTimes,
  onDateChange,
  onEventClick,
  onAddEvent
}: CalendarGridProps) {
  const [draggedEvent, setDraggedEvent] = useState<Event | null>(null);

  // ساعات العرض (6 صباحاً - 11 مساءً)
  const hours = Array.from({ length: 18 }, (_, i) => i + 6);
  
  // أيام الأسبوع
  const days = useMemo(() => {
    if (view === 'day') return [date];
    const start = startOfWeek(date, { weekStartsOn: 6 }); // السبت
    return Array.from({ length: 7 }, (_, i) => addDays(start, i));
  }, [view, date]);

  // تحويل وقت الصلاة إلى رقم الساعة
  const getPrayerHour = (time: string): number => {
    const [h, m] = time.split(':').map(Number);
    return h + m / 60;
  };

  // مواقيت الصلاة بالساعات
  const prayerSlots = useMemo(() => {
    if (!prayerTimes) return [];
    return [
      { name: 'الفجر', hour: getPrayerHour(prayerTimes.fajr), duration: 0.58 },
      { name: 'الظهر', hour: getPrayerHour(prayerTimes.dhuhr), duration: 0.67 },
      { name: 'العصر', hour: getPrayerHour(prayerTimes.asr), duration: 0.67 },
      { name: 'المغرب', hour: getPrayerHour(prayerTimes.maghrib), duration: 0.5 },
      { name: 'العشاء', hour: getPrayerHour(prayerTimes.isha), duration: 0.58 }
    ].filter(p => p.hour >= 6 && p.hour <= 23);
  }, [prayerTimes]);

  // حساب موقع الحدث
  const getEventPosition = (event: Event, dayIndex: number) => {
    const start = new Date(event.starts_at);
    const end = new Date(event.ends_at);
    const startHour = start.getHours() + start.getMinutes() / 60;
    const duration = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
    
    const top = ((startHour - 6) / 18) * 100;
    const height = (duration / 18) * 100;
    const left = (100 / days.length) * dayIndex;
    const width = 100 / days.length;
    
    return { top, height, left, width };
  };

  // معالجة السحب والإفلات
  const handleDragStart = (event: Event) => {
    setDraggedEvent(event);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (hour: number, dayIndex: number) => {
    if (!draggedEvent) return;
    
    const targetDate = days[dayIndex];
    const newStart = new Date(targetDate);
    newStart.setHours(Math.floor(hour), (hour % 1) * 60);
    
    // هنا يمكن استدعاء API لتحديث الحدث
    console.log('Move event', draggedEvent.id, 'to', newStart);
    setDraggedEvent(null);
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <NeonButton
            variant="ghost"
            size="sm"
            onClick={() => onDateChange(addDays(date, view === 'day' ? -1 : -7))}
          >
            <ChevronRight className="w-5 h-5" />
          </NeonButton>
          <h2 className="text-2xl font-bold gradient-text">
            {format(date, 'MMMM yyyy', { locale: ar })}
          </h2>
          <NeonButton
            variant="ghost"
            size="sm"
            onClick={() => onDateChange(addDays(date, view === 'day' ? 1 : 7))}
          >
            <ChevronLeft className="w-5 h-5" />
          </NeonButton>
        </div>
        
        <NeonButton
          variant="primary"
          onClick={() => onAddEvent(new Date())}
        >
          <Plus className="w-4 h-4 ml-2" />
          حدث جديد
        </NeonButton>
      </div>

      {/* Days Header */}
      <div className="grid" style={{ gridTemplateColumns: `60px repeat(${days.length}, 1fr)` }}>
        <div /> {/* Empty corner */}
        {days.map((day, i) => (
          <div key={i} className="text-center p-2 border-b border-border">
            <div className="text-sm text-muted-foreground">
              {format(day, 'EEE', { locale: ar })}
            </div>
            <div className={cn(
              "text-2xl font-bold",
              format(day, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd') && "text-primary"
            )}>
              {format(day, 'd')}
            </div>
          </div>
        ))}
      </div>

      {/* Time Grid */}
      <div className="relative" style={{ height: '1080px' }}>
        <div className="grid" style={{ gridTemplateColumns: `60px repeat(${days.length}, 1fr)` }}>
          {/* Hours Column */}
          <div className="sticky right-0 z-10">
            {hours.map(hour => (
              <div
                key={hour}
                className="h-[60px] flex items-start justify-end pr-2 text-sm text-muted-foreground"
              >
                {hour}:00
              </div>
            ))}
          </div>

          {/* Day Columns */}
          {days.map((day, dayIndex) => (
            <div key={dayIndex} className="relative border-r border-border">
              {/* Hour Lines */}
              {hours.map((hour, hourIndex) => (
                <div
                  key={hour}
                  className={cn(
                    "h-[60px] border-b border-border/50 hover:bg-muted/20 cursor-pointer transition-colors",
                    hourIndex % 2 === 0 && "border-border"
                  )}
                  onDragOver={handleDragOver}
                  onDrop={() => handleDrop(hour, dayIndex)}
                  onClick={() => {
                    const clickedTime = new Date(day);
                    clickedTime.setHours(hour, 0);
                    onAddEvent(clickedTime);
                  }}
                />
              ))}

              {/* Prayer Times Overlay */}
              {prayerSlots.map((prayer, i) => {
                const top = ((prayer.hour - 6) / 18) * 100;
                const height = (prayer.duration / 18) * 100;
                
                return (
                  <div
                    key={i}
                    className="absolute left-0 right-0 bg-warning/10 border-r-4 border-warning pointer-events-none z-5"
                    style={{ top: `${top}%`, height: `${height}%` }}
                  >
                    <span className="text-xs text-warning font-medium px-2">
                      {prayer.name}
                    </span>
                  </div>
                );
              })}

              {/* Events */}
              {events
                .filter(e => format(new Date(e.starts_at), 'yyyy-MM-dd') === format(day, 'yyyy-MM-dd'))
                .map(event => {
                  const pos = getEventPosition(event, dayIndex);
                  return (
                    <div
                      key={event.id}
                      className={cn(
                        "absolute px-2 py-1 rounded-lg cursor-move z-10 transition-all",
                        "bg-primary/90 text-primary-foreground border border-primary",
                        "hover:scale-105 hover:z-20 hover:shadow-lg",
                        event.conflict_count && event.conflict_count > 0 && "border-destructive border-2"
                      )}
                      style={{
                        top: `${pos.top}%`,
                        height: `${Math.max(pos.height, 5)}%`,
                        left: `${pos.left}%`,
                        width: `calc(${pos.width}% - 8px)`,
                        margin: '0 4px'
                      }}
                      draggable
                      onDragStart={() => handleDragStart(event)}
                      onClick={() => onEventClick(event)}
                    >
                      <div className="text-xs font-medium truncate">{event.title}</div>
                      {event.conflict_count && event.conflict_count > 0 && (
                        <div className="absolute -top-2 -left-2 w-5 h-5 rounded-full bg-destructive text-white text-xs flex items-center justify-center animate-pulse-glow">
                          ⚠
                        </div>
                      )}
                      {event.ai_confidence && (
                        <div className="text-[10px] opacity-70">
                          AI {Math.round(event.ai_confidence * 100)}%
                        </div>
                      )}
                    </div>
                  );
                })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

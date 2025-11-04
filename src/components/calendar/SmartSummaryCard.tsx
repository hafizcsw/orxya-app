import { useCountdown } from '@/hooks/useCountdown';
import { Calendar, Clock, AlertCircle } from 'lucide-react';

interface Event {
  title: string;
  instance_start: string;
  instance_end: string;
  is_draft?: boolean;
}

interface SmartSummaryCardProps {
  events: Event[];
  aiInsight?: string;
}

export function SmartSummaryCard({ events, aiInsight }: SmartSummaryCardProps) {
  const now = new Date();
  const todayEvents = events.filter(e => !e.is_draft);
  
  const upcoming = todayEvents.filter(e => new Date(e.instance_start) > now);
  const ongoing = todayEvents.filter(e => 
    new Date(e.instance_start) <= now && new Date(e.instance_end) > now
  );
  const completed = todayEvents.filter(e => new Date(e.instance_end) <= now);
  
  const nextEvent = upcoming[0];
  const countdown = useCountdown(nextEvent?.instance_start || new Date());

  if (todayEvents.length === 0) return null;

  return (
    <div className="mb-4 bg-gradient-to-br from-primary/5 via-background to-primary/10 border border-primary/20 rounded-2xl p-4 shadow-lg backdrop-blur-sm animate-fade-in">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
          <Calendar className="w-5 h-5 text-primary" />
        </div>
        
        <div className="flex-1 min-w-0">
          <h3 className="text-base font-bold text-foreground mb-1">
            ملخص اليوم
          </h3>
          
          {aiInsight && (
            <p className="text-sm text-muted-foreground mb-3 leading-relaxed">
              {aiInsight}
            </p>
          )}
          
          <div className="flex flex-wrap gap-2 mb-3">
            {completed.length > 0 && (
              <div className="px-3 py-1 rounded-full bg-success/10 border border-success/20 text-xs text-success font-medium">
                ✓ {completed.length} مكتمل
              </div>
            )}
            {ongoing.length > 0 && (
              <div className="px-3 py-1 rounded-full bg-destructive/10 border border-destructive/20 text-xs text-destructive font-medium animate-pulse">
                🔴 {ongoing.length} جاري الآن
              </div>
            )}
            {upcoming.length > 0 && (
              <div className="px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-xs text-primary font-medium">
                ⏰ {upcoming.length} قادم
              </div>
            )}
          </div>

          {nextEvent && (
            <div className="flex items-center gap-2 text-sm">
              <Clock className="w-4 h-4 text-primary shrink-0" />
              <span className="text-muted-foreground">
                التالي:
              </span>
              <span className="font-semibold text-foreground truncate">
                {nextEvent.title}
              </span>
              <span className="text-primary font-bold shrink-0">
                {countdown.formattedShort}
              </span>
            </div>
          )}
          
          {ongoing.length > 0 && (
            <div className="mt-2 flex items-center gap-2 text-sm text-destructive">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span className="font-medium">
                {ongoing[0].title} - جاري التنفيذ الآن
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

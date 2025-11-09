import { useState } from 'react';
import { DollarSign, TrendingUp, TrendingDown, Check, Edit3, MapPin } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { FinancialEvent, DailyFinancialSummary } from '@/types/financial';
import { FinancialCorrectionSheet } from './FinancialCorrectionSheet';
import { formatCurrency, formatNumber, formatPercent } from '@/lib/intl';

interface MoneyPulseCardProps {
  summary: DailyFinancialSummary;
  onConfirm?: (eventId: number) => void;
  onCorrect?: (eventId: number, amount: number, direction: 1 | -1, merchant?: string) => void;
  className?: string;
}

export function MoneyPulseCard({ summary, onConfirm, onCorrect, className }: MoneyPulseCardProps) {
  const [editingEvent, setEditingEvent] = useState<FinancialEvent | null>(null);
  
  const isPositive = summary.netToday >= 0;
  const unconfirmedCount = summary.events.filter(e => !e.confirmed).length;
  
  // Get top places from events
  const placeMap = new Map<string, number>();
  summary.events
    .filter(e => e.direction === -1 && e.placeName) // expenses with location
    .forEach(e => {
      const count = placeMap.get(e.placeName!) || 0;
      placeMap.set(e.placeName!, count + 1);
    });
  
  const topPlaces = Array.from(placeMap.entries())
    .map(([placeName, count]) => ({ placeName, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 3);

  return (
    <>
      <Card className={cn("p-6 space-y-4", className)}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={cn(
              "w-12 h-12 rounded-full flex items-center justify-center",
              isPositive ? "bg-success/10" : "bg-destructive/10"
            )}>
              <DollarSign className={cn(
                "w-6 h-6",
                isPositive ? "text-success" : "text-destructive"
              )} />
            </div>
            <div>
              <div className="text-xs uppercase tracking-wider text-muted-foreground font-medium">
                Net Today
              </div>
              <div className={cn(
                "text-2xl font-bold",
                isPositive ? "text-success" : "text-destructive"
              )}>
                {isPositive ? '+' : ''}{formatNumber(summary.netToday, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {summary.currency}
              </div>
            </div>
          </div>
          {isPositive ? (
            <TrendingUp className="w-8 h-8 text-success opacity-50" />
          ) : (
            <TrendingDown className="w-8 h-8 text-destructive opacity-50" />
          )}
        </div>

        <div className="flex gap-2 text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-success" />
            <span>↑ {formatNumber(summary.totalIncome, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-destructive" />
            <span>↓ {formatNumber(summary.totalExpense, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
          </div>
          {unconfirmedCount > 0 && (
            <div className="ml-auto text-warning">
              {unconfirmedCount} pending
            </div>
          )}
        </div>

        {/* Epic 6: Top Places */}
        {topPlaces.length > 0 && summary.netToday < 0 && (
          <div className="pt-3 border-t border-border/50">
            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
              <MapPin className="w-3.5 h-3.5" />
              <span className="font-medium">Top places today:</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {topPlaces.map((place, idx) => (
                <Badge key={idx} variant="secondary" className="text-xs">
                  {place.placeName} ({place.count})
                </Badge>
              ))}
            </div>
          </div>
        )}

        <div className="space-y-2 max-h-64 overflow-y-auto">
          {summary.events.map(event => (
            <div 
              key={event.id}
              className={cn(
                "p-3 rounded-lg border transition-colors",
                event.confirmed 
                  ? "bg-muted/30 border-border/30" 
                  : "bg-background border-border"
              )}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className={cn(
                      "font-medium",
                      event.direction === 1 ? "text-success" : "text-destructive"
                    )}>
                      {event.direction === 1 ? '+' : '-'}{formatNumber(event.amount, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {event.currency}
                    </span>
                    {event.merchant && (
                      <span className="text-xs text-muted-foreground truncate">
                        • {event.merchant}
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1 space-y-0.5">
                    <div>Confidence: {formatPercent(event.confidence)}</div>
                    {event.placeName && (
                      <div className="flex items-center gap-1">
                        <MapPin className="w-3 h-3" />
                        <span>{event.placeName}</span>
                      </div>
                    )}
                  </div>
                </div>
                
                {!event.confirmed && (
                  <div className="flex gap-1 flex-shrink-0">
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 w-7 p-0"
                      onClick={() => onConfirm?.(event.id)}
                    >
                      <Check className="w-4 h-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 w-7 p-0"
                      onClick={() => setEditingEvent(event)}
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </Card>

      {editingEvent && (
        <FinancialCorrectionSheet
          event={editingEvent}
          open={!!editingEvent}
          onOpenChange={(open) => !open && setEditingEvent(null)}
          onSave={(corrected) => {
            onCorrect?.(
              editingEvent.id,
              corrected.amount,
              corrected.direction,
              corrected.merchant
            );
            setEditingEvent(null);
          }}
        />
      )}
    </>
  );
}

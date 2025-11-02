import React from 'react';
import { cn } from '@/lib/utils';

export function StatCard({
  title,
  value,
  hint,
  tone = 'neutral',
  className,
}: {
  title: string;
  value: string | number;
  hint?: string;
  tone?: 'good' | 'bad' | 'neutral';
  className?: string;
}) {
  const toneCls =
    tone === 'good' 
      ? 'border-success/30 bg-success/5 shadow-success/10' 
      : tone === 'bad' 
      ? 'border-destructive/30 bg-destructive/5 shadow-destructive/10'
      : 'border-border/50 shadow-lg';

  return (
    <div className={cn(
      'card group cursor-pointer relative overflow-hidden',
      toneCls,
      className
    )}>
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
      
      <div className="relative z-10 p-6">
        <div className="text-xs uppercase tracking-wider text-muted-foreground font-medium mb-3">
          {title}
        </div>
        <div className="text-3xl font-bold mb-2 bg-gradient-to-r from-foreground to-foreground/80 bg-clip-text">
          {value}
        </div>
        {hint && (
          <div className="text-xs text-muted-foreground/80 mt-2">
            {hint}
          </div>
        )}
      </div>
    </div>
  );
}

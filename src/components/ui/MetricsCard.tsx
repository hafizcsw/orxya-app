import { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface MetricsCardProps {
  title: string;
  value: string | number;
  change?: number;
  trend?: 'up' | 'down' | 'neutral';
  icon?: ReactNode;
  sparkline?: ReactNode;
  className?: string;
  variant?: 'default' | 'glass' | 'gradient';
}

export function MetricsCard({
  title,
  value,
  change,
  trend = 'neutral',
  icon,
  sparkline,
  className,
  variant = 'default'
}: MetricsCardProps) {
  const trendIcons = {
    up: <TrendingUp className="w-4 h-4" />,
    down: <TrendingDown className="w-4 h-4" />,
    neutral: <Minus className="w-4 h-4" />
  };
  
  const trendColors = {
    up: 'text-success',
    down: 'text-destructive',
    neutral: 'text-muted-foreground'
  };
  
  const variantStyles = {
    default: 'card bg-gradient-to-br from-card to-card/95',
    glass: 'card-glass',
    gradient: 'card bg-gradient-to-br from-primary/5 via-card to-accent/5'
  };
  
  return (
    <div className={cn(variantStyles[variant], "group cursor-pointer", className)}>
      <div className="p-6 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
            {title}
          </span>
          {icon && (
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
              {icon}
            </div>
          )}
        </div>
        
        {/* Value */}
        <div className="space-y-2">
          <div className="text-4xl font-bold gradient-text">
            {value}
          </div>
          
          {/* Trend */}
          {change !== undefined && (
            <div className={cn("flex items-center gap-2 text-sm font-medium", trendColors[trend])}>
              {trendIcons[trend]}
              <span>{change > 0 ? '+' : ''}{change}%</span>
              <span className="text-muted-foreground">من الفترة السابقة</span>
            </div>
          )}
        </div>
        
        {/* Sparkline */}
        {sparkline && (
          <div className="h-12 opacity-60 group-hover:opacity-100 transition-opacity">
            {sparkline}
          </div>
        )}
      </div>
    </div>
  );
}

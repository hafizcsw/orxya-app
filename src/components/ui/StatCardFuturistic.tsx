import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface StatCardFuturisticProps {
  icon: ReactNode;
  label: string;
  value: string | number;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  className?: string;
  iconBgClass?: string;
  onClick?: () => void;
}

export function StatCardFuturistic({
  icon,
  label,
  value,
  trend,
  className,
  iconBgClass = 'bg-success/10',
  onClick
}: StatCardFuturisticProps) {
  return (
    <div 
      className={cn(
        "card group relative overflow-hidden",
        onClick && "cursor-pointer",
        className
      )}
      onClick={onClick}
    >
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
      
      <div className="relative z-10 p-6">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs uppercase tracking-wider text-muted-foreground font-medium">
            {label}
          </span>
          <div className={cn(
            "w-10 h-10 rounded-full flex items-center justify-center transition-transform group-hover:scale-110 duration-300",
            iconBgClass
          )}>
            {icon}
          </div>
        </div>
        
        <div className="text-3xl font-bold mb-2 bg-gradient-to-r from-foreground to-foreground/80 bg-clip-text">
          {value}
        </div>
        
        {trend && (
          <div className="flex items-center gap-2 text-xs">
            <span className={cn(
              "flex items-center font-medium",
              trend.isPositive ? "text-success" : "text-destructive"
            )}>
              {trend.isPositive ? "↑" : "↓"} {Math.abs(trend.value)}%
            </span>
            <span className="text-muted-foreground">من الشهر الماضي</span>
          </div>
        )}
      </div>
    </div>
  );
}

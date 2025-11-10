import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface DashboardGridProps {
  children: ReactNode;
  columns?: 1 | 2 | 3 | 4 | 5;
  gap?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function DashboardGrid({ 
  children, 
  columns = 3,
  gap = 'md',
  className 
}: DashboardGridProps) {
  const columnStyles = {
    1: 'grid-cols-1',
    2: 'grid-cols-2',
    3: 'grid-cols-2 lg:grid-cols-3',
    4: 'grid-cols-2 md:grid-cols-3 lg:grid-cols-4',
    5: 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5'
  };
  
  const gapStyles = {
    sm: 'gap-3 sm:gap-4',
    md: 'gap-4 sm:gap-5 md:gap-6',
    lg: 'gap-5 sm:gap-6 md:gap-8'
  };
  
  return (
    <div className={cn(
      'grid w-full',
      columnStyles[columns],
      gapStyles[gap],
      'auto-rows-fr', // Equal height rows
      className
    )}>
      {children}
    </div>
  );
}

interface DashboardSectionProps {
  title: string;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}

export function DashboardSection({ 
  title, 
  description, 
  action, 
  children,
  className 
}: DashboardSectionProps) {
  return (
    <div className={cn('space-y-3 sm:space-y-4', className)}>
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="min-w-0 flex-1">
          <h2 className="text-xl sm:text-2xl font-bold gradient-text truncate">{title}</h2>
          {description && (
            <p className="text-sm text-muted-foreground mt-1">{description}</p>
          )}
        </div>
        <div className="shrink-0">
          {action}
        </div>
      </div>
      {children}
    </div>
  );
}

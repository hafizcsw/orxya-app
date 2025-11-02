import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface GlassPanelProps {
  children: ReactNode;
  className?: string;
  blur?: 'sm' | 'md' | 'lg';
  padding?: 'none' | 'sm' | 'md' | 'lg';
}

export function GlassPanel({ 
  children, 
  className, 
  blur = 'md',
  padding = 'md'
}: GlassPanelProps) {
  const blurStyles = {
    sm: 'backdrop-blur-sm',
    md: 'backdrop-blur-md',
    lg: 'backdrop-blur-xl'
  };
  
  const paddingStyles = {
    none: '',
    sm: 'p-4',
    md: 'p-6',
    lg: 'p-8'
  };
  
  return (
    <div 
      className={cn(
        "rounded-3xl bg-card/70 border border-border/50",
        blurStyles[blur],
        paddingStyles[padding],
        "shadow-[0_8px_32px_0_rgba(0,0,0,0.1)]",
        "transition-all duration-300",
        "hover:bg-card/80 hover:border-border/70",
        className
      )}
    >
      {children}
    </div>
  );
}

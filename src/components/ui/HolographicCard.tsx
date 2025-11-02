import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface HolographicCardProps {
  children: ReactNode;
  className?: string;
  variant?: 'default' | 'glass' | 'neon';
  glow?: boolean;
}

export function HolographicCard({ 
  children, 
  className, 
  variant = 'default',
  glow = false 
}: HolographicCardProps) {
  return (
    <div 
      className={cn(
        "relative rounded-3xl overflow-hidden transition-all duration-500",
        variant === 'glass' && "card-glass",
        variant === 'neon' && "card-holographic",
        variant === 'default' && "card bg-gradient-to-br from-card to-card/95",
        glow && "hover:glow-primary",
        className
      )}
    >
      {variant === 'neon' && (
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-accent/5 to-primary/10 opacity-50" />
      )}
      <div className="relative z-10">
        {children}
      </div>
    </div>
  );
}

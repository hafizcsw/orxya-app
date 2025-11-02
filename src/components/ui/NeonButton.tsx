import { ButtonHTMLAttributes, ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface NeonButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  variant?: 'primary' | 'accent' | 'success' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  glow?: boolean;
}

export function NeonButton({ 
  children, 
  className, 
  variant = 'primary',
  size = 'md',
  glow = true,
  disabled,
  ...props 
}: NeonButtonProps) {
  const baseStyles = "relative inline-flex items-center justify-center rounded-2xl font-medium transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed overflow-hidden group";
  
  const sizeStyles = {
    sm: "px-4 py-2 text-sm",
    md: "px-6 py-3 text-base",
    lg: "px-8 py-4 text-lg"
  };
  
  const variantStyles = {
    primary: "bg-gradient-to-r from-primary to-primary-glow text-primary-foreground border-2 border-primary/50",
    accent: "bg-gradient-to-r from-accent to-accent-glow text-accent-foreground border-2 border-accent/50",
    success: "bg-gradient-to-r from-success to-success-glow text-success-foreground border-2 border-success/50",
    ghost: "bg-transparent text-foreground border-2 border-primary/30 hover:border-primary/60"
  };
  
  return (
    <button
      className={cn(
        baseStyles,
        sizeStyles[size],
        variantStyles[variant],
        glow && !disabled && "hover:shadow-[0_0_30px_rgba(var(--primary-glow),0.6)]",
        !disabled && "hover:scale-105 active:scale-95",
        className
      )}
      disabled={disabled}
      {...props}
    >
      {/* Animated gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent opacity-0 group-hover:opacity-100 group-hover:animate-shimmer" />
      
      {/* Content */}
      <span className="relative z-10 flex items-center gap-2">
        {children}
      </span>
    </button>
  );
}

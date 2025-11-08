import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { ArrowUp, ArrowDown, Minus } from 'lucide-react';
import { hslToRgba, getGlowIntensity } from '@/lib/animations';

interface StatRingProps {
  value: number; // 0-100
  label: string;
  color?: string;
  gradientColors?: [string, string]; // Gradient colors [start, end]
  size?: 'sm' | 'md' | 'lg';
  subtitle?: string;
  className?: string;
  customDisplay?: string;
  scale?: number;
  icon?: React.ReactNode; // Custom icon inside the ring
  trend?: 'up' | 'down' | 'neutral'; // Trend direction
  trendValue?: number; // Trend percentage
  status?: 'excellent' | 'good' | 'fair' | 'poor'; // Status indicator
  targetValue?: number; // القيمة المستهدفة
  currentValue?: number; // القيمة الحالية
  unit?: string; // الوحدة (hours, km, USD)
  showTarget?: boolean; // عرض الهدف في subtitle
  onTargetClick?: () => void; // عند الضغط لتعديل الهدف
}

export const StatRing = React.memo(function StatRing({
  value,
  label,
  color = 'hsl(var(--primary))',
  gradientColors,
  size = 'md',
  subtitle,
  className,
  customDisplay,
  scale,
  icon,
  trend,
  trendValue,
  status,
  targetValue,
  currentValue,
  unit,
  showTarget,
  onTargetClick,
}: StatRingProps) {
  const [isMobile, setIsMobile] = React.useState(false);

  React.useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const sizes = {
    sm: { 
      width: isMobile ? 90 : 100, 
      strokeWidth: isMobile ? 4 : 5, 
      fontSize: isMobile ? '0.875rem' : '1.125rem', 
      iconSize: isMobile ? 12 : 16,
      labelSize: isMobile ? 'text-[9px]' : 'text-[10px]',
      subtitleSize: isMobile ? 'text-[8px]' : 'text-[9px]',
      valueSize: isMobile ? 'text-sm' : 'text-base',
      padding: 'p-2'
    },
    md: { 
      width: isMobile ? 120 : 140, 
      strokeWidth: isMobile ? 6 : 7, 
      fontSize: isMobile ? '1.125rem' : '1.5rem', 
      iconSize: isMobile ? 16 : 20,
      labelSize: isMobile ? 'text-[10px]' : 'text-xs',
      subtitleSize: isMobile ? 'text-[9px]' : 'text-[10px]',
      valueSize: isMobile ? 'text-base' : 'text-lg',
      padding: 'p-3'
    },
    lg: { 
      width: isMobile ? 150 : 180, 
      strokeWidth: isMobile ? 7 : 9, 
      fontSize: isMobile ? '1.5rem' : '2rem', 
      iconSize: isMobile ? 20 : 24,
      labelSize: isMobile ? 'text-xs' : 'text-sm',
      subtitleSize: isMobile ? 'text-[10px]' : 'text-xs',
      valueSize: isMobile ? 'text-lg' : 'text-xl',
      padding: 'p-4'
    },
  }

  const ringCalculations = useMemo(() => {
    const actualScale = scale || 1;
    const { width, strokeWidth, fontSize, iconSize, labelSize, subtitleSize, valueSize, padding } = sizes[size];
    const scaledWidth = width * actualScale;
    const radius = (scaledWidth - strokeWidth) / 2;
    const innerRadius = radius - strokeWidth / 2;
    const circumference = 2 * Math.PI * radius;
    
    // Calculate progress based on target if provided
    const progressValue = targetValue && currentValue !== undefined 
      ? Math.min((currentValue / targetValue) * 100, 100)
      : Math.min(value, 100);
    
    const offset = circumference - (progressValue / 100) * circumference;
    const percentage = Math.round(progressValue);
    
    return { 
      actualScale, 
      width, 
      strokeWidth, 
      fontSize, 
      iconSize, 
      labelSize, 
      subtitleSize, 
      valueSize, 
      padding,
      scaledWidth, 
      radius, 
      innerRadius, 
      circumference, 
      progressValue, 
      offset, 
      percentage 
    };
  }, [scale, size, targetValue, currentValue, value]);

  const { ringColor, dynamicGradient, gradientId } = useMemo(() => {
    // Dynamic color and gradient based on progress
    const getDynamicColor = () => {
      if (!targetValue || !gradientColors) return color;
      const progress = (currentValue || 0) / targetValue;
      if (progress >= 0.9) return 'hsl(142, 76%, 36%)'; // Excellent - Green
      if (progress >= 0.7) return 'hsl(180, 70%, 40%)'; // Good - Blue-green
      if (progress >= 0.5) return 'hsl(45, 93%, 47%)'; // Fair - Yellow
      return 'hsl(0, 84%, 60%)'; // Poor - Red
    };
    
    const getDynamicGradient = (): [string, string] => {
      if (!targetValue) return gradientColors || [color, color];
      const progress = (currentValue || 0) / targetValue;
      
      if (progress >= 0.9) {
        return ['hsl(142, 76%, 36%)', 'hsl(142, 76%, 60%)']; // Excellent gradient
      } else if (progress >= 0.7) {
        return ['hsl(180, 70%, 40%)', 'hsl(180, 70%, 60%)']; // Good gradient
      } else if (progress >= 0.5) {
        return ['hsl(45, 93%, 47%)', 'hsl(45, 93%, 65%)']; // Fair gradient
      } else {
        return ['hsl(0, 84%, 50%)', 'hsl(0, 84%, 70%)']; // Poor gradient
      }
    };
    
    const ringColor = getDynamicColor();
    const dynamicGradient = targetValue ? getDynamicGradient() : gradientColors;
    const gradientId = `gradient-${label.replace(/\s/g, '-')}`;

    return { ringColor, dynamicGradient, gradientId };
  }, [targetValue, currentValue, gradientColors, color, label]);

  const { scaledWidth, radius, innerRadius, strokeWidth, circumference, offset, percentage, iconSize, labelSize, subtitleSize, valueSize } = ringCalculations;
  
  // Status colors
  const statusColors = {
    excellent: 'text-green-500',
    good: 'text-blue-500',
    fair: 'text-yellow-500',
    poor: 'text-red-500',
  }
  
  const statusText = {
    excellent: 'ممتاز',
    good: 'جيد',
    fair: 'مقبول',
    poor: 'يحتاج تحسين',
  }

  const [isHovered, setIsHovered] = React.useState(false);
  const glowIntensity = getGlowIntensity(status);
  const shadowColor = hslToRgba(ringColor, 0.6);

  return (
    <div 
      className={cn(
        'group flex flex-col items-center',
        size === 'sm' ? 'gap-1' : size === 'md' ? 'gap-2' : 'gap-3',
        onTargetClick && 'cursor-pointer hover:scale-105 transition-transform duration-200',
        className
      )}
      title={`${label}: ${customDisplay || `${percentage}%`}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={onTargetClick}
    >
      <div 
        className="relative transition-all duration-300" 
        style={{ 
          width: scaledWidth, 
          height: scaledWidth,
          filter: isHovered 
            ? `drop-shadow(0 0 ${glowIntensity} ${shadowColor})`
            : 'drop-shadow(0 2px 8px rgba(0, 0, 0, 0.1))'
        }}
      >
        <svg width={scaledWidth} height={scaledWidth} className="transform -rotate-90">
          {/* Define gradient */}
          {dynamicGradient && (
            <defs>
              <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor={dynamicGradient[0]} />
                <stop offset="100%" stopColor={dynamicGradient[1]} />
              </linearGradient>
            </defs>
          )}
          
          {/* Inner background circle for depth */}
          <circle
            cx={scaledWidth / 2}
            cy={scaledWidth / 2}
            r={innerRadius}
            fill="hsl(var(--background))"
            opacity={0.5}
          />
          
          {/* Background circle */}
          <circle
            cx={scaledWidth / 2}
            cy={scaledWidth / 2}
            r={radius}
            fill="none"
            stroke="hsl(var(--muted))"
            strokeWidth={strokeWidth}
            opacity={0.2}
          />
          
          {/* Animated progress circle with dynamic gradient */}
          <motion.circle
            cx={scaledWidth / 2}
            cy={scaledWidth / 2}
            r={radius}
            fill="none"
            stroke={dynamicGradient ? `url(#${gradientId})` : ringColor}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset: offset }}
            transition={{ 
              type: "spring",
              stiffness: 50,
              damping: 15,
              delay: 0.2 
            }}
          />
          
          {/* Static pulse effect for excellent status */}
          {status === 'excellent' && (
            <circle
              cx={scaledWidth / 2}
              cy={scaledWidth / 2}
              r={radius + 2}
              fill="none"
              stroke={dynamicGradient ? dynamicGradient[1] : ringColor}
              strokeWidth={1}
              opacity={0.4}
              className="animate-pulse"
            />
          )}
          
          {/* Pulse effect on hover - simplified */}
          {isHovered && status !== 'excellent' && (
            <circle
              cx={scaledWidth / 2}
              cy={scaledWidth / 2}
              r={radius + 3}
              fill="none"
              stroke={dynamicGradient ? dynamicGradient[1] : ringColor}
              strokeWidth={1}
              opacity={0.3}
            />
          )}
        </svg>

        {/* Center content */}
        <div className={cn("absolute inset-0 flex flex-col items-center justify-center", size === 'sm' ? 'gap-0.5' : 'gap-1')}>
          {/* Icon */}
          {icon && (
            <div
              className="text-muted-foreground"
              style={{ width: iconSize, height: iconSize, opacity: 0.7 }}
            >
              {React.cloneElement(icon as React.ReactElement, { 
                className: cn((icon as React.ReactElement).props.className),
                style: { width: iconSize, height: iconSize }
              })}
            </div>
          )}
          
          {/* Main value */}
          <div className={cn("font-bold leading-none", valueSize)}>
            {customDisplay || Math.round(value)}
          </div>
          
          {/* Status text */}
          {status && (
            <div
              className={cn(
                "font-medium",
                size === 'sm' ? 'text-[9px]' : size === 'md' ? 'text-[10px]' : 'text-xs',
                statusColors[status]
              )}
            >
              {statusText[status]}
            </div>
          )}
        </div>
      </div>

      {/* Labels and trend */}
      <div 
        className={cn("text-center", size === 'sm' ? 'space-y-0.5' : 'space-y-1.5')}
      >
        <div className={cn(
          "font-medium text-foreground group-hover:text-primary transition-colors",
          labelSize
        )}>
          {label}
        </div>
        
        {/* Trend indicator */}
        {trend && trendValue !== undefined && trendValue > 0 && (
          <div
            className={cn(
              "flex items-center justify-center gap-0.5 font-medium",
              isMobile ? 'text-[8px]' : (size === 'sm' ? 'text-[9px]' : size === 'md' ? 'text-[10px]' : 'text-xs'),
              trend === 'up' ? 'text-green-500' : trend === 'down' ? 'text-red-500' : 'text-muted-foreground'
            )}
          >
            {trend === 'up' && <ArrowUp className={isMobile ? 'w-2 h-2' : (size === 'sm' ? 'w-2 h-2' : 'w-3 h-3')} />}
            {trend === 'down' && <ArrowDown className={isMobile ? 'w-2 h-2' : (size === 'sm' ? 'w-2 h-2' : 'w-3 h-3')} />}
            {trend === 'neutral' && <Minus className={isMobile ? 'w-2 h-2' : (size === 'sm' ? 'w-2 h-2' : 'w-3 h-3')} />}
            <span>{trendValue}%</span>
          </div>
        )}
        
        {showTarget && targetValue && currentValue !== undefined ? (
          <div className={cn("text-muted-foreground", subtitleSize)}>
            {currentValue.toFixed(1)} / {targetValue} {unit}
          </div>
        ) : subtitle && !trend ? (
          <div className={cn("text-muted-foreground", subtitleSize)}>
            {subtitle}
          </div>
        ) : null}
      </div>
    </div>
  );
});

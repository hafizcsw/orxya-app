import React from 'react';
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

export function StatRing({
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
  const sizes = {
    sm: { 
      width: 100, 
      strokeWidth: 5, 
      fontSize: '1.125rem', 
      iconSize: 16,
      labelSize: 'text-[10px]',
      subtitleSize: 'text-[9px]',
      padding: 'p-2'
    },
    md: { 
      width: 140, 
      strokeWidth: 7, 
      fontSize: '1.5rem', 
      iconSize: 20,
      labelSize: 'text-xs',
      subtitleSize: 'text-[10px]',
      padding: 'p-3'
    },
    lg: { 
      width: 180, 
      strokeWidth: 9, 
      fontSize: '2rem', 
      iconSize: 24,
      labelSize: 'text-sm',
      subtitleSize: 'text-xs',
      padding: 'p-4'
    },
  }

  const actualScale = scale || 1
  const { width, strokeWidth, fontSize, iconSize, labelSize, subtitleSize, padding } = sizes[size]
  const scaledWidth = width * actualScale
  const radius = (scaledWidth - strokeWidth) / 2
  const innerRadius = radius - strokeWidth / 2
  const circumference = 2 * Math.PI * radius
  
  // Calculate progress based on target if provided
  const progressValue = targetValue && currentValue !== undefined 
    ? Math.min((currentValue / targetValue) * 100, 100)
    : Math.min(value, 100);
  
  const offset = circumference - (progressValue / 100) * circumference
  const percentage = Math.round(progressValue)
  
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

  // Gradient ID for unique gradients per ring
  const gradientId = `gradient-${label.replace(/\s/g, '-')}`
  
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
    <motion.div 
      className={cn(
        'group flex flex-col items-center transition-all duration-300',
        size === 'sm' ? 'gap-1' : size === 'md' ? 'gap-2' : 'gap-3',
        onTargetClick && 'cursor-pointer',
        className
      )}
      title={`${label}: ${customDisplay || `${percentage}%`}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={onTargetClick}
      // Shake animation for poor status
      animate={status === 'poor' ? { x: [-2, 2, -2, 2, 0] } : {}}
      transition={status === 'poor' ? { repeat: 2, duration: 0.4 } : {}}
    >
      <div className="relative" style={{ width: scaledWidth, height: scaledWidth }}>
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
            style={{
              filter: `drop-shadow(0 0 ${isHovered ? glowIntensity : '12px'} ${shadowColor})`,
            }}
          />
          
          {/* Pulse effect for excellent status */}
          {status === 'excellent' && (
            <motion.circle
              cx={scaledWidth / 2}
              cy={scaledWidth / 2}
              r={radius}
              fill="none"
              stroke={dynamicGradient ? dynamicGradient[1] : ringColor}
              strokeWidth={2}
              animate={{ 
                scale: [1, 1.05, 1],
                opacity: [0.5, 0.8, 0.5]
              }}
              transition={{ 
                repeat: Infinity, 
                duration: 2,
                ease: "easeInOut"
              }}
            />
          )}
          
          {/* Pulse effect on hover */}
          {isHovered && status !== 'excellent' && (
            <motion.circle
              cx={scaledWidth / 2}
              cy={scaledWidth / 2}
              r={radius}
              fill="none"
              stroke={dynamicGradient ? dynamicGradient[1] : ringColor}
              strokeWidth={1}
              initial={{ opacity: 0.8, scale: 1 }}
              animate={{ opacity: 0, scale: 1.1 }}
              transition={{ 
                duration: 1.5,
                repeat: Infinity,
                ease: "easeOut"
              }}
            />
          )}
        </svg>

        {/* Center content */}
        <div className={cn("absolute inset-0 flex flex-col items-center justify-center", size === 'sm' ? 'gap-0.5' : 'gap-1')}>
          {/* Icon */}
          {icon && (
            <motion.div
              initial={{ opacity: 0, scale: 0 }}
              animate={{ opacity: 0.7, scale: 1 }}
              transition={{ delay: 0.3, type: "spring" }}
              className="text-muted-foreground"
              style={{ width: iconSize, height: iconSize }}
            >
              {React.cloneElement(icon as React.ReactElement, { 
                className: cn((icon as React.ReactElement).props.className),
                style: { width: iconSize, height: iconSize }
              })}
            </motion.div>
          )}
          
          {/* Main value */}
          <motion.div
            className="font-bold leading-none"
            style={{ 
              fontSize: customDisplay 
                ? (size === 'sm' ? '1rem' : size === 'md' ? '1.25rem' : '1.75rem') 
                : fontSize 
            }}
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ 
              type: "spring",
              stiffness: 200,
              damping: 10,
              delay: 0.5 
            }}
          >
            {customDisplay || Math.round(value)}
          </motion.div>
          
          {/* Status text */}
          {status && (
            <motion.div
              className={cn(
                "font-medium",
                size === 'sm' ? 'text-[9px]' : size === 'md' ? 'text-[10px]' : 'text-xs',
                statusColors[status]
              )}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.7 }}
            >
              {statusText[status]}
            </motion.div>
          )}
        </div>
      </div>

      {/* Labels and trend */}
      <div className={cn("text-center", size === 'sm' ? 'space-y-0.5' : 'space-y-1.5')}>
        <div className={cn(
          "font-medium text-foreground group-hover:text-primary transition-colors",
          labelSize
        )}>
          {label}
        </div>
        
        {/* Trend indicator */}
        {trend && trendValue !== undefined && trendValue > 0 && (
          <motion.div
            className={cn(
              "flex items-center justify-center gap-1 font-medium",
              size === 'sm' ? 'text-[9px]' : size === 'md' ? 'text-[10px]' : 'text-xs',
              trend === 'up' ? 'text-green-500' : trend === 'down' ? 'text-red-500' : 'text-muted-foreground'
            )}
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.9 }}
          >
            {trend === 'up' && <ArrowUp className={size === 'sm' ? 'w-2 h-2' : 'w-3 h-3'} />}
            {trend === 'down' && <ArrowDown className={size === 'sm' ? 'w-2 h-2' : 'w-3 h-3'} />}
            {trend === 'neutral' && <Minus className={size === 'sm' ? 'w-2 h-2' : 'w-3 h-3'} />}
            <span>{trendValue}%</span>
          </motion.div>
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
    </motion.div>
  );
}

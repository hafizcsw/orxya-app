import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { ArrowUp, ArrowDown, Minus } from 'lucide-react';

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
    sm: { width: 120, strokeWidth: 6, fontSize: '1.5rem', iconSize: 20 },
    md: { width: 160, strokeWidth: 8, fontSize: '1.75rem', iconSize: 24 },
    lg: { width: 200, strokeWidth: 10, fontSize: '2.25rem', iconSize: 28 },
  }

  const actualScale = scale || 1
  const { width, strokeWidth, fontSize, iconSize } = sizes[size]
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
  
  // Dynamic color based on progress
  const getDynamicColor = () => {
    if (!targetValue || !gradientColors) return color;
    const progress = (currentValue || 0) / targetValue;
    if (progress >= 0.8) return 'hsl(142 76% 36%)'; // Green
    if (progress >= 0.5) return 'hsl(45 93% 47%)'; // Yellow
    return 'hsl(0 84% 60%)'; // Red
  };
  
  const ringColor = getDynamicColor();

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

  const [isHovered, setIsHovered] = React.useState(false)

  return (
    <div 
      className={cn(
        'group flex flex-col items-center gap-3 transition-all duration-300',
        onTargetClick && 'cursor-pointer',
        className
      )}
      title={`${label}: ${customDisplay || `${percentage}%`}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={onTargetClick}
    >
      <div className="relative" style={{ width: scaledWidth, height: scaledWidth }}>
        <svg width={scaledWidth} height={scaledWidth} className="transform -rotate-90">
          {/* Define gradient if provided */}
          {gradientColors && (
            <defs>
              <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor={gradientColors[0]} />
                <stop offset="100%" stopColor={gradientColors[1]} />
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
          
          {/* Animated progress circle with gradient */}
          <motion.circle
            cx={scaledWidth / 2}
            cy={scaledWidth / 2}
            r={radius}
            fill="none"
            stroke={gradientColors ? `url(#${gradientId})` : ringColor}
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
              filter: `drop-shadow(0 0 ${isHovered ? '16px' : '12px'} ${ringColor})`,
            }}
          />
          
          {/* Pulse effect on hover */}
          {isHovered && (
            <motion.circle
              cx={scaledWidth / 2}
              cy={scaledWidth / 2}
              r={radius}
              fill="none"
              stroke={gradientColors ? gradientColors[1] : ringColor}
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
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-1">
          {/* Icon */}
          {icon && (
            <motion.div
              initial={{ opacity: 0, scale: 0 }}
              animate={{ opacity: 0.7, scale: 1 }}
              transition={{ delay: 0.3, type: "spring" }}
              className="text-muted-foreground"
              style={{ fontSize: iconSize }}
            >
              {icon}
            </motion.div>
          )}
          
          {/* Main value */}
          <motion.div
            className="font-bold leading-none"
            style={{ fontSize: customDisplay ? (size === 'lg' ? '1.75rem' : '1.5rem') : fontSize }}
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
              className={cn("text-xs font-medium", statusColors[status])}
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
      <div className="text-center space-y-1.5">
        <div className="text-sm font-medium text-foreground group-hover:text-primary transition-colors">
          {label}
        </div>
        
        {/* Trend indicator */}
        {trend && trendValue !== undefined && trendValue > 0 && (
          <motion.div
            className={cn(
              "flex items-center justify-center gap-1 text-xs font-medium",
              trend === 'up' ? 'text-green-500' : trend === 'down' ? 'text-red-500' : 'text-muted-foreground'
            )}
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.9 }}
          >
            {trend === 'up' && <ArrowUp className="w-3 h-3" />}
            {trend === 'down' && <ArrowDown className="w-3 h-3" />}
            {trend === 'neutral' && <Minus className="w-3 h-3" />}
            <span>{trendValue}%</span>
          </motion.div>
        )}
        
        {showTarget && targetValue && currentValue !== undefined ? (
          <div className="text-xs text-muted-foreground">
            {currentValue.toFixed(1)} / {targetValue} {unit}
          </div>
        ) : subtitle && !trend ? (
          <div className="text-xs text-muted-foreground">
            {subtitle}
          </div>
        ) : null}
      </div>
    </div>
  );
}

// Add missing React import
import React from 'react';

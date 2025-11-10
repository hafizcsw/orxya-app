import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { ArrowUp, ArrowDown, Minus } from 'lucide-react';
import { hslToRgba, getGlowIntensity, ringAnimations } from '@/lib/animations';
import { useDeviceInfo } from '@/contexts/DeviceContext';

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
  const deviceInfo = useDeviceInfo();
  const isMobile = deviceInfo.type === 'mobile';
  
  // Animation delay based on component mount
  const animDelay = 0;

  // Responsive sizing based on device info
  const sizes = {
    sm: { 
      width: deviceInfo.size === 'xlarge' ? 150 : 
             deviceInfo.size === 'large' ? 130 : 
             isMobile ? 115 : 100,
      strokeWidth: deviceInfo.density === 'xxxhdpi' ? 7 : 
                   deviceInfo.density === 'xxhdpi' ? 6 : 5,
      fontSize: deviceInfo.size === 'xlarge' ? '1.125rem' : 
                deviceInfo.size === 'large' ? '1rem' : '0.875rem',
      iconSize: deviceInfo.size === 'xlarge' ? 20 : 
                deviceInfo.size === 'large' ? 18 : 16,
      labelSize: deviceInfo.size === 'xlarge' ? 'text-sm' : 
                 deviceInfo.size === 'large' ? 'text-sm' :
                 isMobile ? 'text-xs' : 'text-[10px]',
      subtitleSize: deviceInfo.size === 'xlarge' ? 'text-xs' : 
                    deviceInfo.size === 'large' ? 'text-xs' :
                    isMobile ? 'text-[10px]' : 'text-[9px]',
      valueSize: deviceInfo.size === 'xlarge' ? 'text-lg' : 
                 deviceInfo.size === 'large' ? 'text-base' :
                 isMobile ? 'text-base' : 'text-sm',
      padding: 'p-2'
    },
    md: { 
      width: deviceInfo.size === 'xlarge' ? 170 : 
             deviceInfo.size === 'large' ? 150 : 
             isMobile ? 130 : 140,
      strokeWidth: deviceInfo.density === 'xxxhdpi' ? 9 : 
                   deviceInfo.density === 'xxhdpi' ? 8 : 6,
      fontSize: deviceInfo.size === 'xlarge' ? '1.75rem' : 
                deviceInfo.size === 'large' ? '1.375rem' : '1rem',
      iconSize: deviceInfo.size === 'xlarge' ? 28 : 
                deviceInfo.size === 'large' ? 26 : 20,
      labelSize: deviceInfo.size === 'xlarge' ? 'text-base' : 
                 deviceInfo.size === 'large' ? 'text-base' : 
                 isMobile ? 'text-sm' : 'text-xs',
      subtitleSize: deviceInfo.size === 'xlarge' ? 'text-sm' : 
                    deviceInfo.size === 'large' ? 'text-sm' :
                    isMobile ? 'text-xs' : 'text-[10px]',
      valueSize: deviceInfo.size === 'xlarge' ? 'text-2xl' : 
                 deviceInfo.size === 'large' ? 'text-xl' : 
                 isMobile ? 'text-lg' : 'text-base',
      padding: 'p-3'
    },
    lg: { 
      width: deviceInfo.size === 'xlarge' ? 210 : 
             deviceInfo.size === 'large' ? 180 : 
             isMobile ? 150 : 180,
      strokeWidth: deviceInfo.density === 'xxxhdpi' ? 11 : 
                   deviceInfo.density === 'xxhdpi' ? 10 : 8,
      fontSize: deviceInfo.size === 'xlarge' ? '2.25rem' : 
                deviceInfo.size === 'large' ? '1.75rem' : '1.25rem',
      iconSize: deviceInfo.size === 'xlarge' ? 36 : 
                deviceInfo.size === 'large' ? 34 : 28,
      labelSize: deviceInfo.size === 'xlarge' ? 'text-lg' : 
                 deviceInfo.size === 'large' ? 'text-base' : 
                 isMobile ? 'text-base' : 'text-sm',
      subtitleSize: deviceInfo.size === 'xlarge' ? 'text-base' : 
                    deviceInfo.size === 'large' ? 'text-sm' :
                    isMobile ? 'text-sm' : 'text-xs',
      valueSize: deviceInfo.size === 'xlarge' ? 'text-3xl' : 
                 deviceInfo.size === 'large' ? 'text-2xl' : 
                 isMobile ? 'text-xl' : 'text-lg',
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
            initial={{ strokeDashoffset: circumference, opacity: 0 }}
            animate={{ strokeDashoffset: offset, opacity: 1 }}
            transition={{ 
              strokeDashoffset: {
                type: "spring",
                stiffness: 50,
                damping: 15,
                delay: animDelay + 0.2 
              },
              opacity: { 
                duration: 0.4,
                delay: animDelay 
              }
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
            <motion.div
              className="text-muted-foreground"
              style={{ width: iconSize, height: iconSize, opacity: 0.7 }}
              initial={{ scale: 0, opacity: 0, rotate: -180 }}
              animate={{ scale: 1, opacity: 0.7, rotate: 0 }}
              transition={{
                delay: animDelay + 0.3,
                type: "spring",
                stiffness: 200,
                damping: 15
              }}
            >
              {React.cloneElement(icon as React.ReactElement, { 
                className: cn((icon as React.ReactElement).props.className),
                style: { width: iconSize, height: iconSize }
              })}
            </motion.div>
          )}
          
          {/* Main value */}
          <motion.div 
            className={cn(
              "leading-none",
              deviceInfo.size === 'xlarge' || deviceInfo.size === 'large' ? 'font-extrabold' : 'font-bold',
              "[dir=rtl]:font-extrabold",
              valueSize
            )}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              delay: animDelay + 0.5,
              duration: 0.4,
              ease: "easeOut"
            }}
          >
            {customDisplay || Math.round(value)}
          </motion.div>
          
          {/* Status text */}
          {status && (
            <motion.div
              className={cn(
                "font-bold",
                "[dir=rtl]:font-extrabold",
                deviceInfo.size === 'xlarge' ? 'text-sm' : 
                size === 'sm' ? 'text-[11px]' : size === 'md' ? 'text-xs' : 'text-sm',
                statusColors[status]
              )}
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                delay: animDelay + 0.6,
                duration: 0.3,
                ease: "easeOut"
              }}
            >
              {statusText[status]}
            </motion.div>
          )}
        </div>
      </div>

      {/* Labels and trend */}
      <motion.div 
        className={cn("text-center", size === 'sm' ? 'space-y-0.5' : 'space-y-1.5')}
        initial={{ opacity: 0, y: 5 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{
          delay: animDelay + 0.7,
          duration: 0.3,
          ease: "easeOut"
        }}
      >
        <div className={cn(
          "font-bold text-foreground group-hover:text-primary transition-colors",
          "[dir=rtl]:font-extrabold",
          labelSize
        )}>
          {label}
        </div>
        
        {/* Trend indicator */}
        {trend && trendValue !== undefined && trendValue > 0 && (
          <div
            className={cn(
              "flex items-center justify-center gap-0.5 font-semibold",
              isMobile ? 'text-[10px]' : (size === 'sm' ? 'text-[10px]' : size === 'md' ? 'text-xs' : 'text-sm'),
              trend === 'up' ? 'text-green-500' : trend === 'down' ? 'text-red-500' : 'text-muted-foreground'
            )}
          >
            {trend === 'up' && <ArrowUp className={isMobile ? 'w-2.5 h-2.5' : (size === 'sm' ? 'w-2.5 h-2.5' : 'w-3 h-3')} />}
            {trend === 'down' && <ArrowDown className={isMobile ? 'w-2.5 h-2.5' : (size === 'sm' ? 'w-2.5 h-2.5' : 'w-3 h-3')} />}
            {trend === 'neutral' && <Minus className={isMobile ? 'w-2.5 h-2.5' : (size === 'sm' ? 'w-2.5 h-2.5' : 'w-3 h-3')} />}
            <span>{trendValue}%</span>
          </div>
        )}
        
        {showTarget && targetValue && currentValue !== undefined ? (
          <div className={cn("text-muted-foreground font-medium", subtitleSize)}>
            {currentValue.toFixed(1)} / {targetValue} {unit}
          </div>
        ) : subtitle && !trend ? (
          <div className={cn("text-muted-foreground font-medium", subtitleSize)}>
            {subtitle}
          </div>
        ) : null}
      </motion.div>
    </div>
  );
});

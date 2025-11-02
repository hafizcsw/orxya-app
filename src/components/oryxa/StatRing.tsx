import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface StatRingProps {
  value: number; // 0-100
  label: string;
  color?: string;
  size?: 'sm' | 'md' | 'lg';
  subtitle?: string;
  className?: string;
  customDisplay?: string; // نص مخصص بدلاً من النسبة المئوية
}

export function StatRing({
  value,
  label,
  color = 'hsl(var(--primary))',
  size = 'md',
  subtitle,
  className,
  customDisplay,
}: StatRingProps) {
  const sizes = {
    sm: { width: 120, strokeWidth: 8, fontSize: '1.5rem' },
    md: { width: 160, strokeWidth: 10, fontSize: '2rem' },
    lg: { width: 200, strokeWidth: 12, fontSize: '2.5rem' },
  };

  const { width, strokeWidth, fontSize } = sizes[size];
  const radius = (width - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (Math.min(value, 100) / 100) * circumference;

  return (
    <div className={cn('flex flex-col items-center gap-2', className)}>
      <div className="relative" style={{ width, height: width }}>
        <svg width={width} height={width} className="transform -rotate-90">
          {/* Background circle */}
          <circle
            cx={width / 2}
            cy={width / 2}
            r={radius}
            fill="none"
            stroke="hsl(var(--muted))"
            strokeWidth={strokeWidth}
            opacity={0.2}
          />
          
          {/* Animated progress circle */}
          <motion.circle
            cx={width / 2}
            cy={width / 2}
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset: offset }}
            transition={{ 
              duration: 1.5, 
              ease: [0.4, 0, 0.2, 1],
              delay: 0.2 
            }}
            style={{
              filter: `drop-shadow(0 0 8px ${color})`,
            }}
          />
        </svg>

        {/* Center value */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <motion.div
            className="font-bold"
            style={{ fontSize: customDisplay ? (size === 'lg' ? '1.5rem' : '1.25rem') : fontSize }}
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.5 }}
          >
            {customDisplay || `${Math.round(value)}%`}
          </motion.div>
        </div>
      </div>

      {/* Labels */}
      <div className="text-center space-y-1">
        <div className="text-sm font-medium text-foreground">
          {label}
        </div>
        {subtitle && (
          <div className="text-xs text-muted-foreground">
            {subtitle}
          </div>
        )}
      </div>
    </div>
  );
}

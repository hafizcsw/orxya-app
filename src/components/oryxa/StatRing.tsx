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
  scale?: number; // Scale factor for responsive sizing
}
export function StatRing({
  value,
  label,
  color = 'hsl(var(--primary))',
  size = 'md',
  subtitle,
  className,
  customDisplay,
  scale
}: StatRingProps) {
  const sizes = {
    sm: {
      width: 100,
      strokeWidth: 6,
      fontSize: '1.25rem'
    },
    md: {
      width: 120,
      strokeWidth: 8,
      fontSize: '1.5rem'
    },
    lg: {
      width: 180,
      strokeWidth: 10,
      fontSize: '2rem'
    }
  };
  const {
    width,
    strokeWidth,
    fontSize
  } = sizes[size];
  const radius = (width - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - Math.min(value, 100) / 100 * circumference;
  return <div className={cn('flex flex-col items-center gap-2', className)} style={{
    transform: scale ? `scale(${scale})` : undefined
  }}>
      

      {/* Labels */}
      <div className="text-center space-y-1">
        <div className="text-sm font-medium text-foreground">
          {label}
        </div>
        {subtitle && <div className="text-xs text-muted-foreground">
            {subtitle}
          </div>}
      </div>
    </div>;
}
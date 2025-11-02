import { cn } from '@/lib/utils';

interface GaugeChartProps {
  value: number;
  max?: number;
  label?: string;
  size?: 'sm' | 'md' | 'lg';
  color?: string;
  showValue?: boolean;
}

export function GaugeChart({ 
  value, 
  max = 100,
  label,
  size = 'md',
  color = "hsl(var(--primary))",
  showValue = true
}: GaugeChartProps) {
  const percentage = Math.min((value / max) * 100, 100);
  const circumference = 2 * Math.PI * 45;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;
  
  const sizes = {
    sm: { container: 120, stroke: 8, fontSize: 'text-xl' },
    md: { container: 160, stroke: 10, fontSize: 'text-3xl' },
    lg: { container: 200, stroke: 12, fontSize: 'text-4xl' }
  };
  
  const sizeConfig = sizes[size];
  
  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative" style={{ width: sizeConfig.container, height: sizeConfig.container }}>
        <svg className="transform -rotate-90" width={sizeConfig.container} height={sizeConfig.container}>
          {/* Background circle */}
          <circle
            cx={sizeConfig.container / 2}
            cy={sizeConfig.container / 2}
            r="45"
            fill="none"
            stroke="hsl(var(--muted))"
            strokeWidth={sizeConfig.stroke}
            opacity="0.2"
          />
          {/* Progress circle */}
          <circle
            cx={sizeConfig.container / 2}
            cy={sizeConfig.container / 2}
            r="45"
            fill="none"
            stroke={color}
            strokeWidth={sizeConfig.stroke}
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            className="transition-all duration-1000 ease-out"
            style={{ filter: `drop-shadow(0 0 8px ${color})` }}
          />
        </svg>
        
        {showValue && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              <div className={cn(sizeConfig.fontSize, "font-bold gradient-text")}>
                {Math.round(percentage)}%
              </div>
            </div>
          </div>
        )}
      </div>
      
      {label && (
        <p className="text-sm font-medium text-muted-foreground">{label}</p>
      )}
    </div>
  );
}

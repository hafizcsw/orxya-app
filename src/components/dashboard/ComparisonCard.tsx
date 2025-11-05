import { GlassPanel } from '@/components/ui/GlassPanel'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { Sparkline } from '@/components/Sparkline'
import { cn } from '@/lib/utils'

interface ComparisonCardProps {
  label: string
  current: number
  previous: number
  format?: 'currency' | 'number' | 'hours' | 'percent'
  inverted?: boolean
  sparklineData?: number[]
}

export function ComparisonCard({ 
  label, 
  current, 
  previous, 
  format = 'number',
  inverted = false,
  sparklineData 
}: ComparisonCardProps) {
  const change = previous !== 0 ? ((current - previous) / previous) * 100 : 0
  const isPositive = inverted ? change < 0 : change > 0
  const isNeutral = Math.abs(change) < 1

  const formatValue = (value: number) => {
    switch (format) {
      case 'currency':
        return `$${value.toFixed(0)}`
      case 'hours':
        return `${value.toFixed(1)}h`
      case 'percent':
        return `${value.toFixed(0)}%`
      default:
        return value.toFixed(0)
    }
  }

  return (
    <GlassPanel 
      blur="md" 
      padding="md"
      className={cn(
        "group hover:scale-105 transition-all duration-300 relative overflow-hidden",
        isPositive && "hover:border-[hsl(var(--whoop-green))]/30",
        !isPositive && !isNeutral && "hover:border-[hsl(var(--whoop-red))]/30"
      )}
    >
      {/* Background glow effect */}
      <div className={cn(
        "absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-2xl",
        isPositive ? "bg-[hsl(var(--whoop-green))]/10" : "bg-[hsl(var(--whoop-red))]/10"
      )} />
      
      <div className="relative z-10">
        <div className="flex justify-between items-start mb-3">
          <div className="flex-1">
            <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium mb-1">
              {label}
            </p>
            <p className="text-3xl font-bold mb-1 bg-gradient-to-r from-foreground to-foreground/80 bg-clip-text">
              {formatValue(current)}
            </p>
            <p className="text-xs text-muted-foreground">
              السابق: {formatValue(previous)}
            </p>
          </div>
          
          <div className="text-right">
            {isNeutral ? (
              <div className="flex items-center gap-1 text-muted-foreground">
                <Minus className="w-4 h-4" />
                <span className="text-lg font-bold">~0%</span>
              </div>
            ) : (
              <div className={cn(
                "flex items-center gap-1",
                isPositive ? "text-[hsl(var(--whoop-green))]" : "text-[hsl(var(--whoop-red))]"
              )}>
                {isPositive ? (
                  <TrendingUp className="w-5 h-5" />
                ) : (
                  <TrendingDown className="w-5 h-5" />
                )}
                <span className="text-xl font-bold">
                  {isPositive ? '+' : ''}{change.toFixed(1)}%
                </span>
              </div>
            )}
          </div>
        </div>
        
        {sparklineData && sparklineData.length > 0 && (
          <div className="mt-3 opacity-70">
            <Sparkline 
              points={sparklineData} 
              width={200}
              height={40}
            />
          </div>
        )}
      </div>
    </GlassPanel>
  )
}

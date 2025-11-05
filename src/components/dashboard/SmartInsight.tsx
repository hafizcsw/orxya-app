import { HolographicCard } from '@/components/ui/HolographicCard'
import { Zap, TrendingUp, AlertTriangle, Award, Target, Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'

interface SmartInsightProps {
  type: 'positive' | 'negative' | 'neutral' | 'warning'
  text: string
  icon?: 'zap' | 'trending' | 'warning' | 'award' | 'target' | 'sparkles'
}

const iconMap = {
  zap: Zap,
  trending: TrendingUp,
  warning: AlertTriangle,
  award: Award,
  target: Target,
  sparkles: Sparkles,
}

const typeStyles = {
  positive: {
    borderColor: 'border-[hsl(var(--whoop-green))]',
    bgColor: 'bg-[hsl(var(--whoop-green))]/20',
    textColor: 'text-[hsl(var(--whoop-green))]',
    glowColor: 'bg-[hsl(var(--whoop-green))]/10',
  },
  negative: {
    borderColor: 'border-[hsl(var(--whoop-red))]',
    bgColor: 'bg-[hsl(var(--whoop-red))]/20',
    textColor: 'text-[hsl(var(--whoop-red))]',
    glowColor: 'bg-[hsl(var(--whoop-red))]/10',
  },
  neutral: {
    borderColor: 'border-[hsl(var(--whoop-blue))]',
    bgColor: 'bg-[hsl(var(--whoop-blue))]/20',
    textColor: 'text-[hsl(var(--whoop-blue))]',
    glowColor: 'bg-[hsl(var(--whoop-blue))]/10',
  },
  warning: {
    borderColor: 'border-[hsl(var(--whoop-yellow))]',
    bgColor: 'bg-[hsl(var(--whoop-yellow))]/20',
    textColor: 'text-[hsl(var(--whoop-yellow))]',
    glowColor: 'bg-[hsl(var(--whoop-yellow))]/10',
  },
}

export function SmartInsight({ type, text, icon = 'zap' }: SmartInsightProps) {
  const Icon = iconMap[icon]
  const styles = typeStyles[type]

  return (
    <HolographicCard 
      variant="glass" 
      className={cn(
        "border-r-4 transition-all duration-300 hover:scale-[1.02] hover:shadow-xl",
        styles.borderColor
      )}
    >
      <div className="flex items-start gap-3 p-4">
        <div className={cn(
          "w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0",
          styles.bgColor
        )}>
          <Icon className={cn("w-5 h-5", styles.textColor)} />
        </div>
        <div className="flex-1">
          <p className="font-semibold text-sm mb-1">رؤية ذكية</p>
          <p className="text-sm text-muted-foreground leading-relaxed">
            {text}
          </p>
        </div>
      </div>
      
      {/* Animated glow effect */}
      <div className={cn(
        "absolute inset-0 -z-10 blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500",
        styles.glowColor
      )} />
    </HolographicCard>
  )
}

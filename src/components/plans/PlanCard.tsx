import { Edit2, Trash2 } from 'lucide-react';
import * as LucideIcons from 'lucide-react';
import { GlassPanel } from '@/components/ui/GlassPanel';
import { cn } from '@/lib/utils';
import { BusinessPlan } from '@/types/business-plan';
import { formatCurrency, formatNumber, formatPercent } from '@/lib/intl';

interface PlanCardProps {
  plan: BusinessPlan;
  onEdit: (plan: BusinessPlan) => void;
  onDelete: (id: string) => void;
  onClick?: (plan: BusinessPlan) => void;
}

export function PlanCard({ plan, onEdit, onDelete, onClick }: PlanCardProps) {
  const IconComponent = (LucideIcons as any)[plan.icon] || LucideIcons.DollarSign;
  const progress = plan.target_monthly 
    ? Math.min((plan.month_profit / plan.target_monthly) * 100, 100)
    : 0;

  return (
    <div 
      className="cursor-pointer h-full"
      onClick={() => onClick?.(plan)}
    >
      <GlassPanel 
        blur="lg" 
        className="group hover:scale-105 transition-all duration-300 relative h-full"
      >
      {/* Edit/Delete buttons */}
      <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1 z-10">
        <button 
          onClick={(e) => { 
            e.stopPropagation(); 
            onEdit(plan); 
          }}
          className="w-7 h-7 rounded-lg bg-background/80 backdrop-blur flex items-center justify-center hover:bg-primary/20 transition-colors"
        >
          <Edit2 className="w-3.5 h-3.5" />
        </button>
        <button 
          onClick={(e) => { 
            e.stopPropagation(); 
            if (confirm('هل أنت متأكد من حذف هذه الخطة؟')) {
              onDelete(plan.plan_id);
            }
          }}
          className="w-7 h-7 rounded-lg bg-background/80 backdrop-blur flex items-center justify-center hover:bg-destructive/20 transition-colors"
        >
          <Trash2 className="w-3.5 h-3.5 text-destructive" />
        </button>
      </div>
      
      {/* Icon + Name */}
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] md:text-xs uppercase tracking-wider text-muted-foreground font-medium">
          {plan.name}
        </span>
        <div 
          className="w-8 h-8 md:w-10 md:h-10 rounded-full flex items-center justify-center hover:shadow-[0_0_20px] transition-all flex-shrink-0"
          style={{ 
            backgroundColor: `${plan.color}20`,
            boxShadow: `0 0 20px ${plan.color}30`
          }}
        >
          <IconComponent className="w-4 h-4 md:w-5 md:h-5" style={{ color: plan.color }} />
        </div>
      </div>
      
      {/* Profit Stats */}
      <div className="space-y-1.5 md:space-y-2">
        <div className="text-xs md:text-sm text-muted-foreground">الربح اليوم</div>
        <div 
          className="text-xl md:text-2xl font-bold drop-shadow-[0_0_10px]"
          style={{ 
            color: plan.color,
            textShadow: `0 0 20px ${plan.color}40`
          }}
        >
          {formatCurrency(plan.today_profit || 0)}
        </div>
        
        {/* Month stats */}
        <div className="text-[10px] md:text-xs text-muted-foreground pt-0.5 md:pt-1">
          الشهر: {formatCurrency(plan.month_profit || 0)} • {formatNumber(plan.month_transactions || 0)} معاملة
        </div>
        
        {/* Progress bar for monthly target */}
        {plan.target_monthly && (
          <div className="mt-2 md:mt-3">
            <div className="flex justify-between text-[10px] md:text-xs mb-1">
              <span>الهدف الشهري</span>
              <span className="font-semibold">{formatPercent(progress)}</span>
            </div>
            <div className="h-1 md:h-1.5 bg-muted rounded-full overflow-hidden">
              <div 
                className="h-full transition-all duration-500"
                style={{ 
                  width: `${progress}%`,
                  backgroundColor: plan.color,
                  boxShadow: `0 0 10px ${plan.color}60`
                }}
              />
            </div>
          </div>
        )}
      </div>
    </GlassPanel>
    </div>
  );
}
import { useState } from 'react';
import { PieChart, Activity, Calendar } from 'lucide-react';
import { HolographicCard } from '@/components/ui/HolographicCard';
import { DonutChart } from '@/components/charts/DonutChart';
import { RadarChart } from '@/components/charts/RadarChart';
import { NeonButton } from '@/components/ui/NeonButton';
import { BusinessPlan } from '@/types/business-plan';

type AnalyticsPeriod = 'today' | 'week' | 'month' | 'year';

interface PlansAnalyticsProps {
  plans: BusinessPlan[];
}

export function PlansAnalytics({ plans }: PlansAnalyticsProps) {
  const [period, setPeriod] = useState<AnalyticsPeriod>('month');

  // دالة مساعدة للحصول على القيمة حسب الفترة
  const getProfitByPeriod = (plan: BusinessPlan): number => {
    switch (period) {
      case 'today': return plan.today_profit;
      case 'week': return plan.week_profit;
      case 'month': return plan.month_profit;
      case 'year': return plan.year_profit;
      default: return plan.month_profit;
    }
  };

  const periodLabels = {
    today: 'اليوم',
    week: 'الأسبوع',
    month: 'الشهر',
    year: 'السنة'
  };

  const periodLabel = periodLabels[period];

  const donutData = plans.map(p => ({
    name: p.name,
    value: getProfitByPeriod(p),
    fill: p.color
  }));

  const radarData = plans.map(p => ({
    subject: p.name,
    value: getProfitByPeriod(p),
    fullMark: p.target_monthly || Math.max(...plans.map(x => getProfitByPeriod(x))) || 1000
  }));

  const totalProfit = plans.reduce((sum, p) => sum + getProfitByPeriod(p), 0);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header + Period Selector */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <Calendar className="w-6 h-6 text-primary" />
          تحليلات الخطط
        </h2>
      </div>

      {/* Period Buttons */}
      <div className="grid grid-cols-2 md:flex gap-2">
        {[
          { key: 'today' as AnalyticsPeriod, label: 'اليوم' },
          { key: 'week' as AnalyticsPeriod, label: 'الأسبوع' },
          { key: 'month' as AnalyticsPeriod, label: 'الشهر' },
          { key: 'year' as AnalyticsPeriod, label: 'السنة' }
        ].map(({ key, label }) => (
          <NeonButton
            key={key}
            variant={period === key ? 'primary' : 'ghost'}
            size="sm"
            onClick={() => setPeriod(key)}
            className="flex-1 min-w-[80px]"
            glow={period === key}
          >
            {label}
          </NeonButton>
        ))}
      </div>
      
      {/* Donut Chart - توزيع الأرباح */}
      <HolographicCard variant="glass" className="p-6">
        <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
          <PieChart className="w-5 h-5" />
          توزيع الأرباح - {periodLabel}
        </h3>
        <DonutChart 
          data={donutData}
          height={300}
        />
      </HolographicCard>
      
      {/* Radar Chart - مقارنة الأداء */}
      <HolographicCard variant="glass" className="p-6">
        <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
          <Activity className="w-5 h-5" />
          مقارنة الأداء - {periodLabel}
        </h3>
        <RadarChart 
          data={radarData}
          height={400}
        />
      </HolographicCard>

      {/* Summary Statistics */}
      <HolographicCard variant="glass" className="p-6">
        <h3 className="text-xl font-bold mb-4">إحصائيات {periodLabel}</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center">
            <div className="text-3xl font-bold gradient-text">
              {plans.length}
            </div>
            <div className="text-sm text-muted-foreground mt-1">خطط نشطة</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold gradient-text">
              ${totalProfit.toFixed(0)}
            </div>
            <div className="text-sm text-muted-foreground mt-1">إجمالي {periodLabel}</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold gradient-text">
              {plans.reduce((sum, p) => sum + p.month_transactions, 0)}
            </div>
            <div className="text-sm text-muted-foreground mt-1">معاملات</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold gradient-text">
              {plans.length > 0 ? `$${(totalProfit / plans.length).toFixed(0)}` : '$0'}
            </div>
            <div className="text-sm text-muted-foreground mt-1">متوسط الربح</div>
          </div>
        </div>
      </HolographicCard>
    </div>
  );
}
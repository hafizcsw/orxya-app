import { PieChart, Activity } from 'lucide-react';
import { HolographicCard } from '@/components/ui/HolographicCard';
import { DonutChart } from '@/components/charts/DonutChart';
import { RadarChart } from '@/components/charts/RadarChart';
import { BusinessPlan } from '@/types/business-plan';

interface PlansAnalyticsProps {
  plans: BusinessPlan[];
}

export function PlansAnalytics({ plans }: PlansAnalyticsProps) {
  const donutData = plans.map(p => ({
    name: p.name,
    value: p.month_profit,
    fill: p.color
  }));

  const radarData = plans.map(p => ({
    subject: p.name,
    value: p.month_profit,
    fullMark: p.target_monthly || Math.max(...plans.map(x => x.month_profit)) || 1000
  }));

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Donut Chart - توزيع الأرباح */}
      <HolographicCard variant="glass" className="p-6">
        <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
          <PieChart className="w-5 h-5" />
          توزيع الأرباح الشهرية
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
          مقارنة الأداء مع الأهداف
        </h3>
        <RadarChart 
          data={radarData}
          height={400}
        />
      </HolographicCard>

      {/* Summary Statistics */}
      <HolographicCard variant="glass" className="p-6">
        <h3 className="text-xl font-bold mb-4">إحصائيات شاملة</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center">
            <div className="text-3xl font-bold gradient-text">
              {plans.length}
            </div>
            <div className="text-sm text-muted-foreground mt-1">خطط نشطة</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold gradient-text">
              ${plans.reduce((sum, p) => sum + p.month_profit, 0).toFixed(0)}
            </div>
            <div className="text-sm text-muted-foreground mt-1">إجمالي الشهر</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold gradient-text">
              {plans.reduce((sum, p) => sum + p.month_transactions, 0)}
            </div>
            <div className="text-sm text-muted-foreground mt-1">معاملات</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold gradient-text">
              ${plans.reduce((sum, p) => sum + p.today_profit, 0).toFixed(0)}
            </div>
            <div className="text-sm text-muted-foreground mt-1">ربح اليوم</div>
          </div>
        </div>
      </HolographicCard>
    </div>
  );
}
import { StatRingSection } from './StatRingSection';
import { useFinancialData } from '@/hooks/useFinancialData';
import { DollarSign, TrendingUp, TrendingDown, Wallet } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useEffect, useRef } from 'react';
import { track } from '@/lib/telemetry';
import { useDeviceTypeCtx } from '@/contexts/DeviceContext';

export default function FinancialRings() {
  const { t } = useTranslation('today');
  const { data, loading, error } = useFinancialData();
  const deviceType = useDeviceTypeCtx();
  const columns = deviceType === 'mobile' ? 1 : 3;
  const viewTracked = useRef(false);

  // Handle empty or error state
  if (!loading && (!data || (data.income === 0 && data.expenses === 0 && data.balance === 0))) {
    return (
      <div className="card p-6 text-center space-y-3">
        <div className="text-muted-foreground">
          <DollarSign className="w-12 h-12 mx-auto mb-2 opacity-50" />
          <p className="text-sm">{error || t('errors.noFinancialData')}</p>
        </div>
      </div>
    );
  }

  useEffect(() => {
    if (!loading && !viewTracked.current) {
      track('today_finance_view', {
        has_income: data.income > 0,
        has_expenses: data.expenses > 0,
        balance: data.balance,
        has_trends: data.trends !== undefined
      });

      if (data.trends) {
        track('today_finance_trend_seen', {
          income_trend_pct: data.trends.income_pct,
          expenses_trend_pct: data.trends.expenses_pct,
          balance_trend_pct: data.trends.balance_pct
        });
      }
      viewTracked.current = true;
    }
  }, [loading, data]);

  const getTrendIcon = (pct: number | null) => {
    if (pct === null) return null;
    return pct > 0 ? 'up' : pct < 0 ? 'down' : 'neutral';
  };

  const rings = [
    {
      id: 'income',
      label: t('financial.income'),
      value: data.income,
      icon: <TrendingUp className="w-5 h-5" />,
      color: 'hsl(var(--chart-1))',
      gradientColors: ['hsl(var(--chart-1))', 'hsl(var(--chart-2))'] as [string, string],
      trend: getTrendIcon(data.trends?.income_pct ?? null) as 'up' | 'down' | 'neutral' | undefined,
      trendValue: data.trends?.income_pct ?? undefined,
      customDisplay: `${data.income.toFixed(0)} AED`,
    },
    {
      id: 'expenses',
      label: t('financial.expenses'),
      value: data.expenses,
      icon: <TrendingDown className="w-5 h-5" />,
      color: 'hsl(var(--chart-3))',
      gradientColors: ['hsl(var(--chart-3))', 'hsl(var(--chart-4))'] as [string, string],
      trend: getTrendIcon(data.trends?.expenses_pct ?? null) as 'up' | 'down' | 'neutral' | undefined,
      trendValue: data.trends?.expenses_pct ?? undefined,
      customDisplay: `${data.expenses.toFixed(0)} AED`,
    },
    {
      id: 'balance',
      label: t('financial.balance'),
      value: data.balance,
      icon: data.balance >= 0 ? <Wallet className="w-5 h-5" /> : <DollarSign className="w-5 h-5" />,
      color: data.balance >= 0 ? 'hsl(var(--chart-2))' : 'hsl(var(--destructive))',
      gradientColors: (data.balance >= 0 
        ? (['hsl(var(--chart-2))', 'hsl(var(--chart-1))'] as [string, string])
        : (['hsl(var(--destructive))', 'hsl(var(--chart-3))'] as [string, string])),
      trend: getTrendIcon(data.trends?.balance_pct ?? null) as 'up' | 'down' | 'neutral' | undefined,
      trendValue: data.trends?.balance_pct ?? undefined,
      customDisplay: `${data.balance >= 0 ? '+' : ''}${data.balance.toFixed(0)} AED`,
    },
  ];

  return (
    <StatRingSection
      title={t('financial.title')}
      rings={rings}
      loading={loading}
      columns={columns}
    />
  );
}

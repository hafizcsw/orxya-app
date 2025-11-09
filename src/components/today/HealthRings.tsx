import { StatRingSection } from './StatRingSection';
import { useHealthData } from '@/hooks/useHealthData';
import { Activity, Moon, Zap, Footprints } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useEffect, useRef } from 'react';
import { track } from '@/lib/telemetry';
import { useDeviceTypeCtx } from '@/contexts/DeviceContext';

export default function HealthRings() {
  const { t } = useTranslation('today');
  const { healthData, loading } = useHealthData('daily', new Date());
  const deviceType = useDeviceTypeCtx();
  const columns = deviceType === 'mobile' ? 1 : 4;
  const viewTracked = useRef(false);

  useEffect(() => {
    if (!loading && healthData && !viewTracked.current) {
      track('today_health_view', {
        has_recovery: healthData.recovery !== null && healthData.recovery !== undefined,
        has_sleep: healthData.sleep !== null && healthData.sleep !== undefined,
        has_strain: healthData.strain !== null && healthData.strain !== undefined,
        has_walk: (healthData.meters ?? 0) > 0
      });
      viewTracked.current = true;
    }
  }, [loading, healthData]);

  const rings = [
    {
      id: 'recovery',
      label: t('healthMetrics.recovery'),
      value: healthData?.recovery ?? 0,
      targetValue: 100,
      icon: <Zap className="w-5 h-5" />,
      color: 'hsl(var(--chart-1))',
      gradientColors: ['hsl(var(--chart-1))', 'hsl(var(--chart-2))'] as [string, string],
      trend: healthData?.recoveryTrend.direction as 'up' | 'down' | 'neutral' | undefined,
      trendValue: healthData?.recoveryTrend.percentage,
      customDisplay: healthData?.recovery ? `${healthData.recovery}%` : '—',
    },
    {
      id: 'sleep',
      label: t('healthMetrics.sleep'),
      value: healthData?.sleep ?? 0,
      targetValue: 100,
      icon: <Moon className="w-5 h-5" />,
      color: 'hsl(var(--chart-2))',
      gradientColors: ['hsl(var(--chart-2))', 'hsl(var(--chart-3))'] as [string, string],
      trend: healthData?.sleepTrend.direction as 'up' | 'down' | 'neutral' | undefined,
      trendValue: healthData?.sleepTrend.percentage,
      customDisplay: healthData?.sleepMinutes 
        ? `${Math.round(healthData.sleepMinutes / 60)}h ${healthData.sleepMinutes % 60}m`
        : '—',
    },
    {
      id: 'strain',
      label: t('healthMetrics.strain'),
      value: (healthData?.strain ?? 0) * 100 / 21,
      targetValue: 100,
      icon: <Activity className="w-5 h-5" />,
      color: 'hsl(var(--chart-3))',
      gradientColors: ['hsl(var(--chart-3))', 'hsl(var(--chart-4))'] as [string, string],
      trend: healthData?.strainTrend.direction as 'up' | 'down' | 'neutral' | undefined,
      trendValue: healthData?.strainTrend.percentage,
      customDisplay: healthData?.strain ? `${healthData.strain.toFixed(1)}` : '—',
    },
    {
      id: 'walk',
      label: t('activities.walk'),
      value: ((healthData?.meters ?? 0) / 1000) * 100 / 10,
      targetValue: 100,
      icon: <Footprints className="w-5 h-5" />,
      color: 'hsl(var(--chart-4))',
      gradientColors: ['hsl(var(--chart-4))', 'hsl(var(--chart-1))'] as [string, string],
      customDisplay: healthData?.meters 
        ? `${(healthData.meters / 1000).toFixed(1)}km`
        : '—',
    },
  ];

  return (
    <StatRingSection
      title={t('healthMetrics.title')}
      rings={rings}
      loading={loading}
      columns={columns}
    />
  );
}

import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { StatRingSection } from '@/components/today/StatRingSection';
import { useTodayActivities } from '@/hooks/useTodayActivities';
import { useUserGoals } from '@/hooks/useUserGoals';
import { useDeviceTypeCtx } from '@/contexts/DeviceContext';
import {
  Briefcase,
  GraduationCap,
  Dumbbell,
} from 'lucide-react';
import {
  getWorkStatus,
  getStudyStatus,
  getSportsStatus,
} from '@/lib/activity-calculations';

interface ActivitiesRingsProps {
  date?: string;
  onGoalClick?: (goalType: string) => void;
}

export function ActivitiesRings({ date, onGoalClick }: ActivitiesRingsProps) {
  const { t } = useTranslation('today');
  const navigate = useNavigate();
  const deviceType = useDeviceTypeCtx();
  const columns = deviceType === 'mobile' ? 1 : 3;
  const { data: activities, loading, error } = useTodayActivities(date);
  const { getGoal, loading: goalsLoading } = useUserGoals();

  // Handle empty or error state
  if (!loading && !activities) {
    return (
      <div className="card p-6 text-center space-y-3">
        <div className="text-muted-foreground">
          <Briefcase className="w-12 h-12 mx-auto mb-2 opacity-50" />
          <p className="text-sm">{error || t('errors.noActivitiesData')}</p>
        </div>
      </div>
    );
  }

  const rings = useMemo(() => {
    if (!activities) return [];

    const work = activities.work_hours || 0;
    const study = activities.study_hours || 0;
    const sports = activities.sports_hours || 0;

    return [
      {
        id: 'work',
        value: work,
        targetValue: getGoal('work_hours'),
        currentValue: work,
        label: t('activities.work'),
        unit: 'hrs',
        showTarget: true,
        color: 'hsl(217, 91%, 60%)',
        gradientColors: ['hsl(217, 91%, 60%)', 'hsl(217, 91%, 75%)'] as [string, string],
        icon: <Briefcase className="w-5 h-5" />,
        status: getWorkStatus(work, getGoal('work_hours')),
        customDisplay: `${work}h`,
        size: deviceType === 'mobile' ? 'sm' as const : 'md' as const,
        onTargetClick: () => onGoalClick?.('work_hours'),
      },
      {
        id: 'study',
        value: study,
        targetValue: getGoal('study_hours'),
        currentValue: study,
        label: t('activities.study'),
        unit: 'hrs',
        showTarget: true,
        color: 'hsl(38, 92%, 50%)',
        gradientColors: ['hsl(38, 92%, 50%)', 'hsl(38, 92%, 70%)'] as [string, string],
        icon: <GraduationCap className="w-5 h-5" />,
        status: getStudyStatus(study, getGoal('study_hours')),
        customDisplay: `${study}h`,
        size: deviceType === 'mobile' ? 'sm' as const : 'md' as const,
        onTargetClick: () => onGoalClick?.('study_hours'),
      },
      {
        id: 'sports',
        value: sports,
        targetValue: getGoal('mma_hours'),
        currentValue: sports,
        label: t('activities.mma'),
        unit: 'hrs',
        showTarget: true,
        color: 'hsl(142, 76%, 36%)',
        gradientColors: ['hsl(142, 76%, 36%)', 'hsl(142, 76%, 50%)'] as [string, string],
        icon: <Dumbbell className="w-5 h-5" />,
        status: getSportsStatus(sports, getGoal('mma_hours')),
        customDisplay: `${sports}h`,
        size: deviceType === 'mobile' ? 'sm' as const : 'md' as const,
        onTargetClick: () => onGoalClick?.('mma_hours'),
      },
    ];
  }, [activities, getGoal, deviceType, t, onGoalClick]);

  return (
    <StatRingSection
      title={t('sections.activities')}
      rings={rings}
      loading={loading || goalsLoading}
      columns={columns}
      action={
        <Button variant="outline" size="sm" onClick={() => navigate('/calendar')}>
          {t('common.viewDetails')}
        </Button>
      }
    />
  );
}

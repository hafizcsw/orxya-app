import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { StatRingSection } from '@/components/today/StatRingSection';
import { useTodayActivities } from '@/hooks/useTodayActivities';
import { useUserGoals } from '@/hooks/useUserGoals';
import { useDeviceType } from '@/hooks/useDeviceType';
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
  const device = useDeviceType();
  const { data: activities, loading } = useTodayActivities(date);
  const { goals, loading: goalsLoading } = useUserGoals();

  const getGoal = (type: string) => {
    const goal = goals?.find(g => g.goal_type === type);
    return goal?.target_value || 0;
  };

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
        size: device === 'mobile' ? 'sm' as const : 'md' as const,
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
        size: device === 'mobile' ? 'sm' as const : 'md' as const,
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
        size: device === 'mobile' ? 'sm' as const : 'md' as const,
        onTargetClick: () => onGoalClick?.('mma_hours'),
      },
    ];
  }, [activities, goals, device, t, onGoalClick]);

  return (
    <StatRingSection
      title={t('sections.activities')}
      rings={rings}
      loading={loading || goalsLoading}
      columns={3}
      action={
        <Button variant="outline" size="sm" onClick={() => navigate('/calendar')}>
          {t('common.viewDetails')}
        </Button>
      }
    />
  );
}

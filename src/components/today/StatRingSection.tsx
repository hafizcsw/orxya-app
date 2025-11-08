import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { DashboardGrid, DashboardSection } from '@/components/dashboard/DataDashboard';
import { Skeleton } from '@/components/ui/skeleton';
import { StatRing } from '@/components/oryxa/StatRing';
import { ringAnimations } from '@/lib/animations';
import { ReactNode } from 'react';

interface StatRingData {
  id: string;
  value: number;
  label: string;
  icon: React.ReactNode;
  color: string;
  gradientColors: [string, string];
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: number;
  status?: 'excellent' | 'good' | 'fair' | 'poor';
  targetValue?: number;
  currentValue?: number;
  unit?: string;
  showTarget?: boolean;
  customDisplay?: string;
  size?: 'sm' | 'md' | 'lg';
  onTargetClick?: () => void;
}

interface StatRingSectionProps {
  title: string;
  rings: StatRingData[];
  loading?: boolean;
  action?: ReactNode;
  columns?: 2 | 3 | 4;
}

export const StatRingSection = React.memo(function StatRingSection({ 
  title, 
  rings, 
  loading, 
  action,
  columns = 4 
}: StatRingSectionProps) {
  const memoizedRings = useMemo(() => rings, [rings]);

  return (
    <DashboardSection title={title} action={action}>
      {loading ? (
        <DashboardGrid columns={columns} gap="md">
          {memoizedRings.map((_, i) => (
            <Skeleton key={i} className="h-48 w-full rounded-2xl animate-pulse" />
          ))}
        </DashboardGrid>
      ) : (
        <DashboardGrid columns={columns} gap="md">
          {memoizedRings.map((ring, i) => {
            const anim = ringAnimations.stagger(i);
            return (
              <motion.div
                key={ring.id}
                initial={anim.initial}
                animate={anim.animate}
                transition={anim.transition}
              >
                <StatRing {...ring} />
              </motion.div>
            );
          })}
        </DashboardGrid>
      )}
    </DashboardSection>
  );
});

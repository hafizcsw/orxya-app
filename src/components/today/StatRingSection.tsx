import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { DashboardGrid, DashboardSection } from '@/components/dashboard/DataDashboard';
import { Skeleton } from '@/components/ui/skeleton';
import { StatRing } from '@/components/oryxa/StatRing';
import { ReactNode } from 'react';

type RingAnim = { initial: any; animate: any; transition: any };

const createStaggerAnim = (i: number): RingAnim => ({
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { delay: i * 0.05, duration: 0.35 }
});

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
  columns?: 1 | 2 | 3 | 4;
}

export const StatRingSection = React.memo(function StatRingSection({ 
  title, 
  rings, 
  loading, 
  action,
  columns = 4 
}: StatRingSectionProps) {
  const count = rings?.length ?? 0;
  const placeholderCount = Math.max(count, columns); // ✅ طول ثابت عند التحميل

  // ✅ حساب أنيميشن بطول ثابت (قيم عادية)
  const anims = useMemo(() => 
    Array.from({ length: placeholderCount }, (_, i) => createStaggerAnim(i)), 
    [placeholderCount]
  );

  return (
    <DashboardSection title={title} action={action}>
      {loading ? (
        <DashboardGrid columns={columns} gap="md">
          {anims.map((_, i) => (
            <Skeleton key={`ph-${i}`} className="h-48 w-full rounded-2xl animate-pulse" />
          ))}
        </DashboardGrid>
      ) : (
        <DashboardGrid columns={columns} gap="md">
          {rings.map((ring, i) => {
            const anim = anims[i] ?? createStaggerAnim(i);
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

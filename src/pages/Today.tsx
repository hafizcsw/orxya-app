import { useState, useCallback, useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import useEmblaCarousel from 'embla-carousel-react';
import { Plus } from "lucide-react";
import { BusinessPlan, BusinessPlanFormData } from "@/types/business-plan";
import { PlanCard } from "@/components/plans/PlanCard";
import { PlanFormDialog } from "@/components/plans/PlanFormDialog";
import { toast } from "sonner";
import { DashboardSection } from "@/components/dashboard/DataDashboard";
import { TodayHeader } from "@/components/today/TodayHeader";
import { QuickActionsDock } from "@/components/today/QuickActionsDock";
import { PeriodSelector } from "@/components/today/PeriodSelector";
import { StatRingSection } from "@/components/today/StatRingSection";
import { SectionErrorBoundary } from "@/components/today/SectionErrorBoundary";
import { QuickSummaryBanner } from "@/components/today/QuickSummaryBanner";
import { CollapsibleSection } from "@/components/today/CollapsibleSection";
import { useTodayReport, type Period } from "@/hooks/useTodayReport";
import { useHealthData } from "@/hooks/useHealthData";
import { useUserGoals, GoalType } from "@/hooks/useUserGoals";
import { Skeleton } from "@/components/ui/skeleton";
import { useLiveToday } from "@/hooks/useLiveToday";
import SimplePullToRefresh from 'react-simple-pull-to-refresh';
import { AIInsightsCard } from '@/components/today/AIInsightsCard';
import BaselineBanner from '@/components/today/BaselineBanner';
import { useFeatureFlags } from '@/hooks/useFeatureFlags';
import { ActivitiesRings } from '@/components/today/ActivitiesRings';
import HealthRings from '@/components/today/HealthRings';
import FinancialRings from '@/components/today/FinancialRings';
import { useRealtimeInvalidation } from '@/hooks/useRealtimeInvalidation';

import { CurrentTaskCard } from "@/components/today/CurrentTaskCard";
import { 
  Activity, 
  Heart, 
  Moon, 
  Zap, 
  Footprints, 
  Briefcase, 
  GraduationCap, 
  Dumbbell,
  DollarSign,
  TrendingDown,
  Wallet,
  Watch
} from "lucide-react";
import { useDeviceType } from "@/hooks/useDeviceType";
import { useDeviceInfo } from "@/contexts/DeviceContext";
import { cn } from "@/lib/utils";
import { 
  getRecoveryStatus, 
  getSleepStatus, 
  getStrainStatus, 
  getActivityStatus,
  formatSleepTime,
  formatDistance
} from '@/lib/health-calculations';
import {
  getWorkStatus,
  getStudyStatus,
  getSportsStatus,
  getWalkStatus,
  getIncomeStatus,
  getExpensesStatus,
  getBalanceStatus
} from '@/lib/activity-calculations';
import { GoalSettingsDialog } from "@/components/goals/GoalSettingsDialog";
import { EmptyState } from "@/components/ui/empty-state";

export default function Today() {
  const { t } = useTranslation("today");
  const navigate = useNavigate();
  const device = useDeviceType();
  const deviceInfo = useDeviceInfo();
  const [period, setPeriod] = useState<Period>("daily");
  const [selectedDate] = useState(new Date());
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<BusinessPlan | null>(null);
  const [goalDialogOpen, setGoalDialogOpen] = useState(false);
  const [editingGoalType, setEditingGoalType] = useState<GoalType | null>(null);
  const [focusMode, setFocusMode] = useState(false);
  const [dataError, setDataError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  
  // Feature Flags
  const { flags } = useFeatureFlags();
  
  // Realtime cache invalidation
  useRealtimeInvalidation();

  
  const [emblaRef, emblaApi] = useEmblaCarousel({
    loop: false, 
    align: 'start',
    dragFree: true,
  });
  const [selectedPlanIndex, setSelectedPlanIndex] = useState(0);
  const [planScrollSnaps, setPlanScrollSnaps] = useState<number[]>([]);

  const { report, loading: reportLoading, refetch: refetchReport } = useTodayReport(period, selectedDate);
  const { healthData, loading: healthLoading, refetch: refetchHealth } = useHealthData(period, selectedDate);
  const { getGoal, updateGoal } = useUserGoals();
  
  // ✅ ALL hooks BEFORE any conditional logic
  const openGoalDialog = useCallback((goalType: GoalType) => {
    setEditingGoalType(goalType);
    setGoalDialogOpen(true);
  }, []);

  // Live data hooks - MUST be before any conditional returns
  const { currentTask, nextTask, timeRemaining, progress, loading: taskLoading } = useLiveToday(selectedDate);

  // ✅ Safe fallback values لمنع تغيّر طول arrays
  const safeHealthData = healthData || {
    recovery: 0,
    sleep: 0,
    strain: 0,
    meters: 0,
    sleepMinutes: 0,
    recoveryTrend: { direction: 'neutral' as const, percentage: 0 },
    sleepTrend: { direction: 'neutral' as const, percentage: 0 },
    strainTrend: { direction: 'neutral' as const, percentage: 0 },
    activityTrend: { direction: 'neutral' as const, percentage: 0 },
    baseline_days_collected: 0,
  };

  // Stable health rings array with useMemo
  const healthRings = useMemo(() => {
    return [
      {
        id: 'recovery',
        value: safeHealthData.recovery,
        label: t('health.recovery'),
        color: "hsl(142, 76%, 36%)",
        gradientColors: ["hsl(142, 76%, 36%)", "hsl(142, 76%, 50%)"] as [string, string],
        icon: <Heart className="w-6 h-6" />,
        trend: safeHealthData.recoveryTrend.direction,
        trendValue: safeHealthData.recoveryTrend.percentage,
        status: getRecoveryStatus(safeHealthData.recovery),
        size: device === 'mobile' ? "sm" as const : "lg" as const,
        targetValue: 100,
        currentValue: safeHealthData.recovery,
      },
      {
        id: 'sleep',
        value: safeHealthData.sleep,
        label: t('health.sleep'),
        color: "hsl(217, 91%, 60%)",
        gradientColors: ["hsl(217, 91%, 60%)", "hsl(217, 91%, 75%)"] as [string, string],
        icon: <Moon className="w-6 h-6" />,
        trend: safeHealthData.sleepTrend.direction,
        trendValue: safeHealthData.sleepTrend.percentage,
        status: getSleepStatus(safeHealthData.sleep),
        customDisplay: formatSleepTime(safeHealthData.sleepMinutes),
        size: device === 'mobile' ? "sm" as const : "lg" as const,
        targetValue: 100,
        currentValue: safeHealthData.sleep,
      },
      {
        id: 'strain',
        value: (safeHealthData.strain / 21) * 100,
        label: t('health.strain'),
        color: "hsl(38, 92%, 50%)",
        gradientColors: ["hsl(38, 92%, 50%)", "hsl(38, 92%, 70%)"] as [string, string],
        icon: <Zap className="w-6 h-6" />,
        trend: safeHealthData.strainTrend.direction,
        trendValue: safeHealthData.strainTrend.percentage,
        status: getStrainStatus(safeHealthData.strain),
        customDisplay: `${safeHealthData.strain.toFixed(1)}`,
        size: device === 'mobile' ? "sm" as const : "lg" as const,
        targetValue: 21,
        currentValue: safeHealthData.strain,
      },
      {
        id: 'walk',
        value: safeHealthData.meters / 1000,
        targetValue: getGoal('walk_km'),
        currentValue: safeHealthData.meters / 1000,
        label: t('activities.walk'),
        unit: "km",
        showTarget: true,
        color: "hsl(142, 76%, 36%)",
        gradientColors: ["hsl(142, 76%, 36%)", "hsl(142, 76%, 50%)"] as [string, string],
        icon: <Footprints className="w-5 h-5" />,
        trend: safeHealthData.activityTrend.direction,
        trendValue: safeHealthData.activityTrend.percentage,
        status: getWalkStatus(safeHealthData.meters / 1000, getGoal('walk_km')),
        customDisplay: safeHealthData.meters ? formatDistance(safeHealthData.meters) : '0 km',
        size: device === 'mobile' ? "sm" as const : "lg" as const,
        onTargetClick: () => openGoalDialog('walk_km'),
      },
    ];
  }, [safeHealthData, getGoal, device, t, openGoalDialog]);

  // ✅ Safe fallback for financial data
  const safeReport = report || {
    income: 0,
    expenses: 0,
    balance: 0,
    work_hours: 0,
    study_hours: 0,
    sports_hours: 0,
    incomeTrend: { direction: 'neutral' as const, percentage: 0 },
    expensesTrend: { direction: 'neutral' as const, percentage: 0 },
    balanceTrend: { direction: 'neutral' as const, percentage: 0 },
  };

  // Stable financial rings array with useMemo
  const financialRings = useMemo(() => [
    {
      id: 'income',
      value: safeReport.income,
      targetValue: getGoal('income_monthly'),
      currentValue: safeReport.income,
      label: t("financial.income"),
      unit: "USD",
      showTarget: true,
      color: "hsl(142, 76%, 36%)",
      gradientColors: ["hsl(142, 76%, 36%)", "hsl(142, 76%, 50%)"] as [string, string],
      icon: <DollarSign className="w-6 h-6" />,
      trend: safeReport.incomeTrend.direction,
      trendValue: safeReport.incomeTrend.percentage,
      status: getIncomeStatus(safeReport.income, getGoal('income_monthly')),
      size: device === 'mobile' ? "sm" as const : "lg" as const,
      customDisplay: `$${safeReport.income}`,
      onTargetClick: () => openGoalDialog('income_monthly'),
    },
    {
      id: 'expenses',
      value: safeReport.expenses,
      targetValue: getGoal('expenses_daily'),
      currentValue: safeReport.expenses,
      label: t("financial.expenses"),
      unit: "USD",
      showTarget: true,
      color: "hsl(0, 84%, 60%)",
      gradientColors: ["hsl(0, 84%, 60%)", "hsl(0, 84%, 75%)"] as [string, string],
      icon: <TrendingDown className="w-6 h-6" />,
      trend: safeReport.expensesTrend.direction,
      trendValue: safeReport.expensesTrend.percentage,
      status: getExpensesStatus(safeReport.expenses, getGoal('expenses_daily')),
      size: device === 'mobile' ? "sm" as const : "lg" as const,
      customDisplay: `$${safeReport.expenses}`,
      onTargetClick: () => openGoalDialog('expenses_daily'),
    },
    {
      id: 'balance',
      value: Math.abs(safeReport.balance),
      label: t("financial.balance"),
      unit: "USD",
      color: "hsl(217, 91%, 60%)",
      gradientColors: ["hsl(217, 91%, 60%)", "hsl(217, 91%, 75%)"] as [string, string],
      icon: <Wallet className="w-6 h-6" />,
      trend: safeReport.balanceTrend.direction,
      trendValue: safeReport.balanceTrend.percentage,
      status: getBalanceStatus(safeReport.balance),
      size: device === 'mobile' ? "sm" as const : "lg" as const,
      customDisplay: `$${safeReport.balance}`,
    },
  ], [safeReport, getGoal, device, t, openGoalDialog]);

  const { data: plans, isLoading: plansLoading, refetch: refetchPlans } = useQuery({
    queryKey: ["business-plans"],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("plans-manage", {
        body: { action: "list" },
      });
      if (error) throw error;
      return data?.plans || [];
    },
  });

  const handleSaveGoal = async (value: number) => {
    if (editingGoalType) {
      await updateGoal(editingGoalType, value);
    }
  };

  const handlePlanSubmit = async (formData: BusinessPlanFormData) => {
    try {
      if (editingPlan) {
        const { error } = await supabase.functions.invoke("plans-manage", {
          body: { action: "update", id: editingPlan.plan_id, ...formData },
        });
        if (error) throw error;
        toast.success(t("messages.planUpdated"));
      } else {
        const { error } = await supabase.functions.invoke("plans-manage", {
          body: { action: "create", ...formData },
        });
        if (error) throw error;
        toast.success(t("messages.planAdded"));
      }
      await refetchPlans();
      setDialogOpen(false);
      setEditingPlan(null);
    } catch (error: any) {
      console.error("[Today] Error saving plan:", error);
      const errorMessage = error?.message || t("messages.error");
      toast.error(`فشل حفظ الخطة: ${errorMessage}`);
    }
  };

  const handleDeletePlan = async (id: string) => {
    try {
      const { error } = await supabase.functions.invoke("plans-manage", {
        body: { action: "delete", id },
      });
      if (error) throw error;
      await refetchPlans();
      toast.success(t("messages.planDeleted"));
    } catch (error: any) {
      console.error("[Today] Error deleting plan:", error);
      const errorMessage = error?.message || t("messages.error");
      toast.error(`فشل حذف الخطة: ${errorMessage}`);
    }
  };

  const onPlanSelect = useCallback(() => {
    if (!emblaApi) return;
    setSelectedPlanIndex(emblaApi.selectedScrollSnap());
  }, [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;
    setPlanScrollSnaps(emblaApi.scrollSnapList());
    emblaApi.on('select', onPlanSelect);
    onPlanSelect();
    return () => {
    emblaApi.off('select', onPlanSelect);
    };
  }, [emblaApi, onPlanSelect]);

  const handleRefresh = async () => {
    setDataError(null);
    try {
      await Promise.all([
        refetchReport(),
        refetchHealth(),
        refetchPlans()
      ]);
      toast.success('تم تحديث البيانات بنجاح');
    } catch (error: any) {
      console.error('[Today] Refresh error:', error);
      setDataError('فشل تحديث البيانات. حاول مرة أخرى.');
      toast.error('فشل تحديث البيانات');
    }
  };

  // Load focus mode state
  useEffect(() => {
    const loadFocusState = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: fs } = await supabase
            .from("user_focus_state")
            .select("active")
            .eq("user_id", user.id)
            .maybeSingle();
          setFocusMode(!!fs?.active);
        }
      } catch (e) {
        console.error('[Today] Error loading focus state:', e);
      }
    };
    loadFocusState();
  }, []);

  // Toggle focus mode
  const toggleFocus = async (active: boolean) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      await supabase.from("user_focus_state").upsert({
        user_id: user.id,
        active,
        updated_at: new Date().toISOString()
      });

      setFocusMode(active);
    } catch (e) {
      console.error('[Today] Error toggling focus:', e);
    }
  };

  // Calculate daily progress with stable dependencies
  const calculateDailyProgress = useCallback(() => {
    const goals = {
      work: getGoal('work_hours'),
      study: getGoal('study_hours'),
      mma: getGoal('mma_hours'),
      walk: getGoal('walk_km'),
      recovery: 100,
      sleep: 100
    };

    const achievements = {
      work: Math.min(100, (safeReport.work_hours / goals.work) * 100),
      study: Math.min(100, (safeReport.study_hours / goals.study) * 100),
      mma: Math.min(100, (safeReport.sports_hours / goals.mma) * 100),
      walk: Math.min(100, ((safeHealthData.meters / 1000) / goals.walk) * 100),
      recovery: safeHealthData.recovery,
      sleep: safeHealthData.sleep
    };

    const totalProgress = Object.values(achievements).reduce((sum, val) => sum + val, 0);
    return Math.round(totalProgress / Object.keys(achievements).length);
  }, [safeReport, safeHealthData, getGoal]);

  // Determine responsive columns based on device info
  const getResponsiveColumns = (): 1 | 2 | 3 | 4 | 5 => {
    if (device === 'mobile') {
      // Large phones (S24 Ultra, iPhone Pro Max) can show more columns
      if (deviceInfo.size === 'xlarge') return 3; // S24 Ultra
      if (deviceInfo.size === 'large') return 3; // iPhone Pro Max
      if (deviceInfo.size === 'medium') return 2; // iPhone Pro/Standard
      return 2; // Standard/small phones
    }
    if (device === 'tablet') return 4;
    return 5; // Desktop
  };
  
  const responsiveColumns = getResponsiveColumns();
  const healthColumns = responsiveColumns as 1 | 2 | 3 | 4;
  const activityColumns = responsiveColumns as 1 | 2 | 3 | 4;
  const financialColumns = responsiveColumns as 1 | 2 | 3 | 4;

  return (
    <SimplePullToRefresh onRefresh={handleRefresh}>
      <div className="min-h-screen bg-background pb-20">
        <div className={cn(
          "container mx-auto max-w-7xl space-y-3 sm:space-y-4 md:space-y-6",
          deviceInfo.size === 'xlarge' ? "px-7" : // S24 Ultra
          deviceInfo.size === 'large' ? "px-6" : // iPhone Pro Max
          deviceInfo.size === 'medium' ? "px-5" :
          "px-3 sm:px-4 md:px-6"
        )}>
          
          {/* Header with Greeting */}
          <TodayHeader selectedDate={selectedDate} />


          {/* Quick Summary Banner - NEW */}
          <QuickSummaryBanner
            dailyProgress={calculateDailyProgress()}
            nextPrayer={undefined} // TODO: Integrate with prayer times
            conflictsCount={0} // TODO: Integrate with conflicts data
            focusMode={focusMode}
            onToggleFocus={toggleFocus}
          />

          {/* NEW: Baseline Banner - shows only if < 14 days */}
          {safeHealthData.baseline_days_collected < 14 && (
            <BaselineBanner date={selectedDate.toISOString().split('T')[0]} />
          )}

          {/* NEW: AI Insights Card - conditional on feature flag */}
          {flags?.FF_AI_INSIGHTS && (
            <AIInsightsCard date={selectedDate.toISOString().split('T')[0]} />
          )}

          {/* Error State */}
          {dataError && (
            <div className="p-6 bg-destructive/10 border border-destructive/30 rounded-2xl space-y-4">
              <div className="text-center space-y-3">
                <div className="flex justify-center">
                  <div className="w-12 h-12 rounded-full bg-destructive/20 flex items-center justify-center">
                    <svg className="w-6 h-6 text-destructive" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                  </div>
                </div>
                <div>
                  <h3 className="font-semibold text-lg mb-1">خطأ في تحميل البيانات</h3>
                  <p className="text-destructive text-sm">{dataError}</p>
                </div>
                <Button onClick={handleRefresh} variant="outline" className="mt-2">
                  <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  إعادة المحاولة
                </Button>
              </div>
            </div>
          )}

          {/* Current Task Card - Live */}
          {!taskLoading && !dataError && (
            <CurrentTaskCard
              task={currentTask}
              timeRemaining={timeRemaining}
              progress={progress}
              nextTask={nextTask}
            />
          )}

        {/* Health & Recovery Section */}
        <SectionErrorBoundary sectionName={t('sections.health')}>
          <StatRingSection
            title={t('sections.health')}
            rings={healthRings}
            loading={healthLoading}
            columns={healthColumns}
            action={
              <Button variant="outline" size="sm" onClick={() => navigate("/today-whoop")}>
                <Activity className="w-4 h-4 mr-2" />
                {t('health.viewDetails')}
              </Button>
            }
          />
        </SectionErrorBoundary>


        {/* Financial Section */}
        <SectionErrorBoundary sectionName={t('sections.financial')}>
          <StatRingSection
            title={t('sections.financial')}
            rings={financialRings}
            loading={reportLoading}
            columns={financialColumns}
            action={
              <Button variant="outline" size="sm" onClick={() => navigate("/expenses")}>
                {t("financial.viewDetails")}
              </Button>
            }
          />
        </SectionErrorBoundary>

        {/* Activities - Work, Study, MMA from unified view */}
        <SectionErrorBoundary sectionName={t('sections.activities')}>
          <ActivitiesRings 
            date={selectedDate.toISOString().split('T')[0]}
            onGoalClick={openGoalDialog}
          />
        </SectionErrorBoundary>

        {/* Business Plans - Now Collapsible */}
        <CollapsibleSection
          title={t("sections.plans")}
          action={
            <Button onClick={() => setDialogOpen(true)} size="sm">
              <Plus className="w-4 h-4 mr-2" />
              {t("plans.add")}
            </Button>
          }
          defaultOpen={false}
        >
          {plansLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
              {[...Array(3)].map((_, i) => (
                <Skeleton key={i} className="h-48 w-full rounded-2xl animate-pulse" />
              ))}
            </div>
          ) : plans && plans.length > 0 ? (
            <div className="relative">
              {/* Desktop Grid View */}
              <div className="hidden sm:grid sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                {plans.map((plan: BusinessPlan) => (
                  <PlanCard
                    key={plan.plan_id}
                    plan={plan}
                    onEdit={(p) => {
                      setEditingPlan(p);
                      setDialogOpen(true);
                    }}
                    onDelete={handleDeletePlan}
                  />
                ))}
              </div>

              {/* Mobile Carousel View */}
              <div className="sm:hidden">
                <div className="overflow-hidden -mx-3 px-3" ref={emblaRef}>
                  <div className="flex gap-3 touch-pan-y">
                    {plans.map((plan: BusinessPlan) => (
                      <div 
                        key={plan.plan_id} 
                        className="flex-[0_0_85%] min-w-0"
                      >
                        <PlanCard
                          plan={plan}
                          onEdit={(p) => {
                            setEditingPlan(p);
                            setDialogOpen(true);
                          }}
                          onDelete={handleDeletePlan}
                        />
                      </div>
                    ))}
                  </div>
                </div>

                {/* Carousel Indicators */}
                {planScrollSnaps.length > 1 && (
                  <div className="flex justify-center gap-1.5 mt-3">
                    {planScrollSnaps.map((_, index) => (
                      <button
                        key={index}
                        onClick={() => emblaApi?.scrollTo(index)}
                        className={cn(
                          'h-1.5 rounded-full transition-all',
                          index === selectedPlanIndex 
                            ? 'bg-primary w-6' 
                            : 'bg-muted-foreground/30 w-1.5'
                        )}
                        aria-label={`Go to slide ${index + 1}`}
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="text-center py-12">
              <p className="text-muted-foreground mb-4">
                {t("plans.empty")}
              </p>
              <Button onClick={() => setDialogOpen(true)}>
                <Plus className="w-4 h-4 mr-2" />
                {t("plans.addFirst")}
              </Button>
            </div>
          )}
        </CollapsibleSection>
      </div>

      {/* Quick Actions Dock */}
      <QuickActionsDock />

      {/* Plan Dialog */}
      <PlanFormDialog
        isOpen={dialogOpen}
        onClose={() => {
          setDialogOpen(false);
          setEditingPlan(null);
        }}
        plan={editingPlan}
        onSave={handlePlanSubmit}
      />

      {/* Goal Settings Dialog */}
      {editingGoalType && (
        <GoalSettingsDialog
          open={goalDialogOpen}
          onOpenChange={setGoalDialogOpen}
          goalType={editingGoalType}
          currentValue={getGoal(editingGoalType)}
          onSave={handleSaveGoal}
        />
      )}
      </div>
    </SimplePullToRefresh>
  );
}

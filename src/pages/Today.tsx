import { useState, useCallback, useEffect, lazy, Suspense, useMemo } from "react";
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
  const [period, setPeriod] = useState<Period>("daily");
  const [selectedDate] = useState(new Date());
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<BusinessPlan | null>(null);
  const [goalDialogOpen, setGoalDialogOpen] = useState(false);
  const [editingGoalType, setEditingGoalType] = useState<GoalType | null>(null);
  const [focusMode, setFocusMode] = useState(false);
  const [dataError, setDataError] = useState<string | null>(null);

  // Check authentication
  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate('/auth');
      }
    };
    checkAuth();
  }, [navigate]);
  
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
  
  // Live data hooks
  const { currentTask, nextTask, timeRemaining, progress, loading: taskLoading } = useLiveToday(selectedDate);

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

  const openGoalDialog = (goalType: GoalType) => {
    setEditingGoalType(goalType);
    setGoalDialogOpen(true);
  };

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
      console.error("Error saving plan:", error);
      toast.error(t("messages.error"));
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
      console.error("Error deleting plan:", error);
      toast.error(t("messages.error"));
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
    await Promise.all([
      refetchReport(),
      refetchHealth(),
      refetchPlans()
    ]);
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

  // Calculate daily progress
  const calculateDailyProgress = () => {
    if (!report || !healthData) return 0;
    
    const goals = {
      work: getGoal('work_hours'),
      study: getGoal('study_hours'),
      mma: getGoal('mma_hours'),
      walk: getGoal('walk_km'),
      recovery: 100,
      sleep: 100
    };

    const achievements = {
      work: Math.min(100, ((report.work_hours || 0) / goals.work) * 100),
      study: Math.min(100, ((report.study_hours || 0) / goals.study) * 100),
      mma: Math.min(100, ((report.sports_hours || 0) / goals.mma) * 100),
      walk: Math.min(100, (((healthData.meters || 0) / 1000) / goals.walk) * 100),
      recovery: healthData.recovery || 0,
      sleep: healthData.sleep || 0
    };

    const totalProgress = Object.values(achievements).reduce((sum, val) => sum + val, 0);
    return Math.round(totalProgress / Object.keys(achievements).length);
  };

  // Determine responsive columns
  const healthColumns = device === 'mobile' ? 2 : device === 'tablet' ? 3 : 4;
  const activityColumns = 3; // Always 3 columns in a row
  const financialColumns = 3; // Always 3 columns in a row

  return (
    <SimplePullToRefresh onRefresh={handleRefresh}>
      <div className="min-h-screen bg-background pb-20">
        <div className="container mx-auto p-3 md:p-6 max-w-7xl space-y-4 md:space-y-6">
          
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

          {/* Error State */}
          {dataError && (
            <div className="p-6 bg-destructive/10 border border-destructive/30 rounded-2xl">
              <div className="text-center">
                <p className="text-destructive mb-4">{dataError}</p>
                <Button onClick={handleRefresh} variant="outline">
                  {t('common.retry')}
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
            rings={useMemo(() => healthData ? [
              {
                id: 'recovery',
                value: healthData.recovery,
                label: t('health.recovery'),
                color: "hsl(142, 76%, 36%)",
                gradientColors: ["hsl(142, 76%, 36%)", "hsl(142, 76%, 50%)"] as [string, string],
                icon: <Heart className="w-6 h-6" />,
                trend: healthData.recoveryTrend.direction,
                trendValue: healthData.recoveryTrend.percentage,
                status: getRecoveryStatus(healthData.recovery),
                size: device === 'mobile' ? "sm" as const : "lg" as const,
                targetValue: 100,
                currentValue: healthData.recovery,
              },
              {
                id: 'sleep',
                value: healthData.sleep,
                label: t('health.sleep'),
                color: "hsl(217, 91%, 60%)",
                gradientColors: ["hsl(217, 91%, 60%)", "hsl(217, 91%, 75%)"] as [string, string],
                icon: <Moon className="w-6 h-6" />,
                trend: healthData.sleepTrend.direction,
                trendValue: healthData.sleepTrend.percentage,
                status: getSleepStatus(healthData.sleep),
                customDisplay: formatSleepTime(healthData.sleepMinutes),
                size: device === 'mobile' ? "sm" as const : "lg" as const,
                targetValue: 100,
                currentValue: healthData.sleep,
              },
              {
                id: 'strain',
                value: (healthData.strain / 21) * 100,
                label: t('health.strain'),
                color: "hsl(38, 92%, 50%)",
                gradientColors: ["hsl(38, 92%, 50%)", "hsl(38, 92%, 70%)"] as [string, string],
                icon: <Zap className="w-6 h-6" />,
                trend: healthData.strainTrend.direction,
                trendValue: healthData.strainTrend.percentage,
                status: getStrainStatus(healthData.strain),
                customDisplay: `${healthData.strain.toFixed(1)}`,
                size: device === 'mobile' ? "sm" as const : "lg" as const,
                targetValue: 21,
                currentValue: healthData.strain,
              },
              {
                id: 'walk',
                value: (healthData?.meters || 0) / 1000,
                targetValue: getGoal('walk_km'),
                currentValue: (healthData?.meters || 0) / 1000,
                label: t('activities.walk'),
                unit: "km",
                showTarget: true,
                color: "hsl(142, 76%, 36%)",
                gradientColors: ["hsl(142, 76%, 36%)", "hsl(142, 76%, 50%)"] as [string, string],
                icon: <Footprints className="w-5 h-5" />,
                trend: healthData?.activityTrend?.direction,
                trendValue: healthData?.activityTrend?.percentage,
                status: getWalkStatus((healthData?.meters || 0) / 1000, getGoal('walk_km')),
                customDisplay: healthData?.meters ? formatDistance(healthData.meters) : '0 km',
                size: device === 'mobile' ? "sm" as const : "lg" as const,
                onTargetClick: () => openGoalDialog('walk_km'),
              },
            ] : [], [healthData, device, t, getGoal])}
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
            rings={useMemo(() => [
              {
                id: 'income',
                value: report?.income || 0,
                targetValue: getGoal('income_monthly'),
                currentValue: report?.income || 0,
                label: t("financial.income"),
                unit: "USD",
                showTarget: true,
                color: "hsl(142, 76%, 36%)",
                gradientColors: ["hsl(142, 76%, 36%)", "hsl(142, 76%, 50%)"] as [string, string],
                icon: <DollarSign className="w-6 h-6" />,
                trend: report?.incomeTrend?.direction,
                trendValue: report?.incomeTrend?.percentage,
                status: getIncomeStatus(report?.income || 0, getGoal('income_monthly')),
                size: device === 'mobile' ? "sm" as const : "lg" as const,
                customDisplay: `$${report?.income || 0}`,
                onTargetClick: () => openGoalDialog('income_monthly'),
              },
              {
                id: 'expenses',
                value: report?.expenses || 0,
                targetValue: getGoal('expenses_daily'),
                currentValue: report?.expenses || 0,
                label: t("financial.expenses"),
                unit: "USD",
                showTarget: true,
                color: "hsl(0, 84%, 60%)",
                gradientColors: ["hsl(0, 84%, 60%)", "hsl(0, 84%, 75%)"] as [string, string],
                icon: <TrendingDown className="w-6 h-6" />,
                trend: report?.expensesTrend?.direction,
                trendValue: report?.expensesTrend?.percentage,
                status: getExpensesStatus(report?.expenses || 0, getGoal('expenses_daily')),
                size: device === 'mobile' ? "sm" as const : "lg" as const,
                customDisplay: `$${report?.expenses || 0}`,
                onTargetClick: () => openGoalDialog('expenses_daily'),
              },
              {
                id: 'balance',
                value: Math.abs(report?.balance || 0),
                label: t("financial.balance"),
                unit: "USD",
                color: "hsl(217, 91%, 60%)",
                gradientColors: ["hsl(217, 91%, 60%)", "hsl(217, 91%, 75%)"] as [string, string],
                icon: <Wallet className="w-6 h-6" />,
                trend: report?.balanceTrend?.direction,
                trendValue: report?.balanceTrend?.percentage,
                status: getBalanceStatus(report?.balance || 0),
                size: device === 'mobile' ? "sm" as const : "lg" as const,
                customDisplay: `$${report?.balance || 0}`,
              },
            ], [report, t, getGoal])}
            loading={reportLoading}
            columns={financialColumns}
            action={
              <Button variant="outline" size="sm" onClick={() => navigate("/expenses")}>
                {t("financial.viewDetails")}
              </Button>
            }
          />
        </SectionErrorBoundary>

        {/* Activities - Work, Study, MMA only */}
        <SectionErrorBoundary sectionName={t('sections.activities')}>
          <StatRingSection
            title={t("sections.activities")}
            rings={useMemo(() => [
              {
                id: 'work',
                value: report?.work_hours || 0,
                targetValue: getGoal('work_hours'),
                currentValue: report?.work_hours || 0,
                label: t('activities.work'),
                unit: "hrs",
                showTarget: true,
                color: "hsl(217, 91%, 60%)",
                gradientColors: ["hsl(217, 91%, 60%)", "hsl(217, 91%, 75%)"] as [string, string],
                icon: <Briefcase className="w-5 h-5" />,
                trend: report?.workTrend?.direction,
                trendValue: report?.workTrend?.percentage,
                status: getWorkStatus(report?.work_hours || 0, getGoal('work_hours')),
                customDisplay: `${report?.work_hours || 0}h`,
                size: device === 'mobile' ? "sm" as const : "md" as const,
                onTargetClick: () => openGoalDialog('work_hours'),
              },
              {
                id: 'study',
                value: report?.study_hours || 0,
                targetValue: getGoal('study_hours'),
                currentValue: report?.study_hours || 0,
                label: t('activities.study'),
                unit: "hrs",
                showTarget: true,
                color: "hsl(38, 92%, 50%)",
                gradientColors: ["hsl(38, 92%, 50%)", "hsl(38, 92%, 70%)"] as [string, string],
                icon: <GraduationCap className="w-5 h-5" />,
                trend: report?.studyTrend?.direction,
                trendValue: report?.studyTrend?.percentage,
                status: getStudyStatus(report?.study_hours || 0, getGoal('study_hours')),
                customDisplay: `${report?.study_hours || 0}h`,
                size: device === 'mobile' ? "sm" as const : "md" as const,
                onTargetClick: () => openGoalDialog('study_hours'),
              },
              {
                id: 'mma',
                value: report?.sports_hours || 0,
                targetValue: getGoal('mma_hours'),
                currentValue: report?.sports_hours || 0,
                label: t('activities.mma'),
                unit: "hrs",
                showTarget: true,
                color: "hsl(142, 76%, 36%)",
                gradientColors: ["hsl(142, 76%, 36%)", "hsl(142, 76%, 50%)"] as [string, string],
                icon: <Dumbbell className="w-5 h-5" />,
                trend: report?.sportsTrend?.direction,
                trendValue: report?.sportsTrend?.percentage,
                status: getSportsStatus(report?.sports_hours || 0, getGoal('mma_hours')),
                customDisplay: `${report?.sports_hours || 0}h`,
                size: device === 'mobile' ? "sm" as const : "md" as const,
                onTargetClick: () => openGoalDialog('mma_hours'),
              },
            ], [report, device, t, getGoal])}
            loading={reportLoading || healthLoading}
            columns={activityColumns}
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
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[...Array(3)].map((_, i) => (
                <Skeleton key={i} className="h-48 w-full rounded-2xl animate-pulse" />
              ))}
            </div>
          ) : plans && plans.length > 0 ? (
            <div className="relative">
              {/* Desktop Grid View */}
              <div className="hidden md:grid md:grid-cols-3 gap-4">
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
              <div className="md:hidden">
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

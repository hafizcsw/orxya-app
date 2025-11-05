import { useState, useCallback, useEffect } from "react";
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
import { GlancesBar } from "@/components/glances/GlancesBar";
import { DashboardGrid, DashboardSection } from "@/components/dashboard/DataDashboard";
import { TodayHeader } from "@/components/today/TodayHeader";
import { QuickSummaryCard } from "@/components/today/QuickSummaryCard";
import { QuickActionsDock } from "@/components/today/QuickActionsDock";
import { PeriodSelector } from "@/components/today/PeriodSelector";
import { useTodayReport, type Period } from "@/hooks/useTodayReport";
import { useHealthData } from "@/hooks/useHealthData";
import { useUserGoals, GoalType } from "@/hooks/useUserGoals";
import { Skeleton } from "@/components/ui/skeleton";
import { motion } from "framer-motion";
import { StatRing } from "@/components/oryxa/StatRing";
import { DailyReportCard } from "@/components/DailyReportCard";
import { CurrentTaskCard } from "@/components/today/CurrentTaskCard";
import { AIInsightsCard } from "@/components/today/AIInsightsCard";
import { useLiveToday } from "@/hooks/useLiveToday";
import { useAIInsights } from "@/hooks/useAIInsights";
import SimplePullToRefresh from 'react-simple-pull-to-refresh';
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
  Wallet
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
  const { insights, loading: insightsLoading } = useAIInsights(
    currentTask, 
    healthData, 
    { work: { actual: report?.work_hours || 0 }, study: { actual: report?.study_hours || 0 } },
    []
  );

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
    await Promise.all([
      refetchReport(),
      refetchHealth(),
      refetchPlans()
    ]);
  };

  // Determine responsive columns
  const activityColumns = device === 'mobile' ? 2 : 4;
  const financialColumns = device === 'mobile' ? 2 : 3;

  return (
    <SimplePullToRefresh onRefresh={handleRefresh}>
      <div className="min-h-screen bg-background pb-20">
        <div className="container mx-auto p-3 md:p-6 max-w-7xl space-y-4 md:space-y-6">
          
          {/* Header with Greeting */}
          <TodayHeader selectedDate={selectedDate} />

          {/* Period Selector */}
          <PeriodSelector value={period} onChange={setPeriod} className="mb-2" />

          {/* Current Task Card - Live */}
          {!taskLoading && (
            <CurrentTaskCard
              task={currentTask}
              timeRemaining={timeRemaining}
              progress={progress}
              nextTask={nextTask}
            />
          )}

          {/* AI Insights Card */}
          <AIInsightsCard insights={insights} loading={insightsLoading} />

        {/* Health & Recovery Section */}
        <DashboardSection 
          title={t('health.title')}
          action={
            <Button variant="outline" size="sm" onClick={() => navigate("/today-whoop")}>
              <Activity className="w-4 h-4 mr-2" />
              {t('health.viewDetails')}
            </Button>
          }
        >
          {healthLoading ? (
            <DashboardGrid columns={4} gap="md">
              {[...Array(4)].map((_, i) => (
                <Skeleton key={i} className="h-48 w-full rounded-2xl" />
              ))}
            </DashboardGrid>
          ) : healthData ? (
            <DashboardGrid columns={device === 'mobile' ? 2 : 4} gap="md">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
              >
                <StatRing
                  value={healthData.recovery}
                  label={t('health.recovery')}
                  color="hsl(142, 76%, 36%)"
                  gradientColors={["hsl(142, 76%, 36%)", "hsl(142, 76%, 50%)"]}
                  icon={<Heart className="w-6 h-6" />}
                  trend={healthData.recoveryTrend.direction}
                  trendValue={healthData.recoveryTrend.percentage}
                  status={getRecoveryStatus(healthData.recovery)}
                  size={device === 'mobile' ? "md" : "lg"}
                  targetValue={100}
                  currentValue={healthData.recovery}
                />
              </motion.div>
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
              >
                <StatRing
                  value={healthData.sleep}
                  label={t('health.sleep')}
                  color="hsl(217, 91%, 60%)"
                  gradientColors={["hsl(217, 91%, 60%)", "hsl(217, 91%, 75%)"]}
                  icon={<Moon className="w-6 h-6" />}
                  trend={healthData.sleepTrend.direction}
                  trendValue={healthData.sleepTrend.percentage}
                  status={getSleepStatus(healthData.sleep)}
                  customDisplay={formatSleepTime(healthData.sleepMinutes)}
                  size={device === 'mobile' ? "md" : "lg"}
                  targetValue={100}
                  currentValue={healthData.sleep}
                />
              </motion.div>
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
              >
                <StatRing
                  value={(healthData.strain / 21) * 100}
                  label={t('health.strain')}
                  color="hsl(38, 92%, 50%)"
                  gradientColors={["hsl(38, 92%, 50%)", "hsl(38, 92%, 70%)"]}
                  icon={<Zap className="w-6 h-6" />}
                  trend={healthData.strainTrend.direction}
                  trendValue={healthData.strainTrend.percentage}
                  status={getStrainStatus(healthData.strain)}
                  customDisplay={`${healthData.strain.toFixed(1)}`}
                  size={device === 'mobile' ? "md" : "lg"}
                  targetValue={21}
                  currentValue={healthData.strain}
                />
              </motion.div>
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
              >
                <StatRing
                  value={healthData.activity}
                  label={t('health.activity')}
                  color="hsl(262, 83%, 58%)"
                  gradientColors={["hsl(262, 83%, 58%)", "hsl(262, 83%, 75%)"]}
                  icon={<Activity className="w-6 h-6" />}
                  trend={healthData.activityTrend.direction}
                  trendValue={healthData.activityTrend.percentage}
                  status={getActivityStatus(healthData.activity)}
                  size={device === 'mobile' ? "md" : "lg"}
                  targetValue={100}
                  currentValue={healthData.activity}
                />
              </motion.div>
            </DashboardGrid>
          ) : null}
        </DashboardSection>


        {/* Financial Section */}
        <DashboardSection 
          title={t("financial.title")}
          action={
            <Button variant="outline" size="sm" onClick={() => navigate("/expenses")}>
              {t("financial.viewDetails")}
            </Button>
          }
        >
          {reportLoading ? (
            <DashboardGrid columns={financialColumns} gap="md">
              {[...Array(financialColumns)].map((_, i) => (
                <Skeleton key={i} className="h-48 w-full rounded-2xl" />
              ))}
            </DashboardGrid>
          ) : (
            <DashboardGrid columns={financialColumns} gap="md">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
              >
                <StatRing
                  value={report?.income || 0}
                  targetValue={getGoal('income_monthly')}
                  currentValue={report?.income || 0}
                  label={t("financial.income")}
                  unit="USD"
                  showTarget={true}
                  color="hsl(142, 76%, 36%)"
                  gradientColors={["hsl(142, 76%, 36%)", "hsl(142, 76%, 50%)"]}
                  icon={<DollarSign className="w-6 h-6" />}
                  trend={report?.incomeTrend?.direction}
                  trendValue={report?.incomeTrend?.percentage}
                  status={getIncomeStatus(report?.income || 0, getGoal('income_monthly'))}
                  size="lg"
                  customDisplay={`$${report?.income || 0}`}
                  onTargetClick={() => openGoalDialog('income_monthly')}
                />
              </motion.div>
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
              >
                <StatRing
                  value={report?.expenses || 0}
                  targetValue={getGoal('expenses_daily')}
                  currentValue={report?.expenses || 0}
                  label={t("financial.expenses")}
                  unit="USD"
                  showTarget={true}
                  color="hsl(0, 84%, 60%)"
                  gradientColors={["hsl(0, 84%, 60%)", "hsl(0, 84%, 75%)"]}
                  icon={<TrendingDown className="w-6 h-6" />}
                  trend={report?.expensesTrend?.direction}
                  trendValue={report?.expensesTrend?.percentage}
                  status={getExpensesStatus(report?.expenses || 0, getGoal('expenses_daily'))}
                  size="lg"
                  customDisplay={`$${report?.expenses || 0}`}
                  onTargetClick={() => openGoalDialog('expenses_daily')}
                />
              </motion.div>
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
              >
                <StatRing
                  value={Math.abs(report?.balance || 0)}
                  label={t("financial.balance")}
                  unit="USD"
                  color="hsl(217, 91%, 60%)"
                  gradientColors={["hsl(217, 91%, 60%)", "hsl(217, 91%, 75%)"]}
                  icon={<Wallet className="w-6 h-6" />}
                  trend={report?.balanceTrend?.direction}
                  trendValue={report?.balanceTrend?.percentage}
                  status={getBalanceStatus(report?.balance || 0)}
                  size="lg"
                  customDisplay={`$${report?.balance || 0}`}
                />
              </motion.div>
            </DashboardGrid>
          )}
        </DashboardSection>

        {/* Activities */}
        <DashboardSection title={t("activities.title")}>
          {reportLoading || healthLoading ? (
            <DashboardGrid columns={activityColumns} gap="md">
              {[...Array(activityColumns)].map((_, i) => (
                <Skeleton key={i} className="h-48 w-full rounded-2xl" />
              ))}
            </DashboardGrid>
          ) : (
            <DashboardGrid columns={activityColumns} gap="md">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
              >
                <StatRing
                  value={(healthData?.meters || 0) / 1000}
                  targetValue={getGoal('walk_km')}
                  currentValue={(healthData?.meters || 0) / 1000}
                  label={t('activities.walk')}
                  unit="km"
                  showTarget={true}
                  color="hsl(262, 83%, 58%)"
                  gradientColors={["hsl(262, 83%, 58%)", "hsl(262, 83%, 75%)"]}
                  icon={<Footprints className="w-5 h-5" />}
                  trend={healthData?.activityTrend?.direction}
                  trendValue={healthData?.activityTrend?.percentage}
                  status={getWalkStatus((healthData?.meters || 0) / 1000, getGoal('walk_km'))}
                  customDisplay={healthData?.meters ? formatDistance(healthData.meters) : '0 km'}
                  size={device === 'mobile' ? "sm" : "md"}
                  onTargetClick={() => openGoalDialog('walk_km')}
                />
              </motion.div>
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
              >
                <StatRing
                  value={report?.work_hours || 0}
                  targetValue={getGoal('work_hours')}
                  currentValue={report?.work_hours || 0}
                  label={t('activities.work')}
                  unit="hrs"
                  showTarget={true}
                  color="hsl(217, 91%, 60%)"
                  gradientColors={["hsl(217, 91%, 60%)", "hsl(217, 91%, 75%)"]}
                  icon={<Briefcase className="w-5 h-5" />}
                  trend={report?.workTrend?.direction}
                  trendValue={report?.workTrend?.percentage}
                  status={getWorkStatus(report?.work_hours || 0, getGoal('work_hours'))}
                  customDisplay={`${report?.work_hours || 0}h`}
                  size={device === 'mobile' ? "sm" : "md"}
                  onTargetClick={() => openGoalDialog('work_hours')}
                />
              </motion.div>
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
              >
                <StatRing
                  value={report?.study_hours || 0}
                  targetValue={getGoal('study_hours')}
                  currentValue={report?.study_hours || 0}
                  label={t('activities.study')}
                  unit="hrs"
                  showTarget={true}
                  color="hsl(38, 92%, 50%)"
                  gradientColors={["hsl(38, 92%, 50%)", "hsl(38, 92%, 70%)"]}
                  icon={<GraduationCap className="w-5 h-5" />}
                  trend={report?.studyTrend?.direction}
                  trendValue={report?.studyTrend?.percentage}
                  status={getStudyStatus(report?.study_hours || 0, getGoal('study_hours'))}
                  customDisplay={`${report?.study_hours || 0}h`}
                  size={device === 'mobile' ? "sm" : "md"}
                  onTargetClick={() => openGoalDialog('study_hours')}
                />
              </motion.div>
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
              >
                <StatRing
                  value={report?.sports_hours || 0}
                  targetValue={getGoal('mma_hours')}
                  currentValue={report?.sports_hours || 0}
                  label={t('activities.mma')}
                  unit="hrs"
                  showTarget={true}
                  color="hsl(142, 76%, 36%)"
                  gradientColors={["hsl(142, 76%, 36%)", "hsl(142, 76%, 50%)"]}
                  icon={<Dumbbell className="w-5 h-5" />}
                  trend={report?.sportsTrend?.direction}
                  trendValue={report?.sportsTrend?.percentage}
                  status={getSportsStatus(report?.sports_hours || 0, getGoal('mma_hours'))}
                  customDisplay={`${report?.sports_hours || 0}h`}
                  size={device === 'mobile' ? "sm" : "md"}
                  onTargetClick={() => openGoalDialog('mma_hours')}
                />
              </motion.div>
            </DashboardGrid>
          )}
        </DashboardSection>

        {/* Glances Bar */}
        <DashboardSection title="نظرة سريعة">
          <GlancesBar />
        </DashboardSection>

        {/* Daily Report Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <DailyReportCard />
        </motion.div>

        {/* Business Plans */}
        <DashboardSection
          title={t("plans.title")}
          action={
            <Button onClick={() => setDialogOpen(true)} size="sm">
              <Plus className="w-4 h-4 mr-2" />
              {t("plans.add")}
            </Button>
          }
        >
          {plansLoading ? (
            <DashboardGrid columns={3} gap="md">
              {[...Array(3)].map((_, i) => (
                <Skeleton key={i} className="h-48 w-full rounded-2xl" />
              ))}
            </DashboardGrid>
          ) : plans && plans.length > 0 ? (
            <div className="relative">
              {/* Desktop Grid View */}
              <div className="hidden md:grid md:grid-cols-3 gap-4">
                {plans.map((plan: BusinessPlan, i: number) => (
                  <motion.div
                    key={plan.plan_id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.1 }}
                  >
                    <PlanCard
                      plan={plan}
                      onEdit={(p) => {
                        setEditingPlan(p);
                        setDialogOpen(true);
                      }}
                      onDelete={handleDeletePlan}
                    />
                  </motion.div>
                ))}
              </div>

              {/* Mobile Carousel View */}
              <div className="md:hidden">
                <div className="overflow-hidden" ref={emblaRef}>
                  <div className="flex gap-4 touch-pan-y">
                    {plans.map((plan: BusinessPlan, i: number) => (
                      <div 
                        key={plan.plan_id} 
                        className="flex-[0_0_90%] min-w-0"
                      >
                        <motion.div
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: i * 0.1 }}
                        >
                          <PlanCard
                            plan={plan}
                            onEdit={(p) => {
                              setEditingPlan(p);
                              setDialogOpen(true);
                            }}
                            onDelete={handleDeletePlan}
                          />
                        </motion.div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Carousel Indicators */}
                {planScrollSnaps.length > 1 && (
                  <div className="flex justify-center gap-2 mt-4">
                    {planScrollSnaps.map((_, index) => (
                      <button
                        key={index}
                        onClick={() => emblaApi?.scrollTo(index)}
                        className={cn(
                          'w-2 h-2 rounded-full transition-all',
                          index === selectedPlanIndex 
                            ? 'bg-primary w-6' 
                            : 'bg-muted-foreground/30'
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
        </DashboardSection>
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

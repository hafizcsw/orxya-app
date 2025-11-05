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
import { Skeleton } from "@/components/ui/skeleton";
import { motion } from "framer-motion";
import { StatRing } from "@/components/oryxa/StatRing";
import { OryxaCard } from "@/components/oryxa/Card";
import { DailyReportCard } from "@/components/DailyReportCard";
import { 
  Activity, 
  Heart, 
  Moon, 
  Zap, 
  Footprints, 
  Briefcase, 
  GraduationCap, 
  Dumbbell 
} from "lucide-react";
import { cn } from "@/lib/utils";
import { 
  getRecoveryStatus, 
  getSleepStatus, 
  getStrainStatus, 
  getActivityStatus,
  formatSleepTime,
  formatDistance
} from '@/lib/health-calculations';

export default function Today() {
  const { t } = useTranslation("today");
  const navigate = useNavigate();
  const [period, setPeriod] = useState<Period>("daily");
  const [selectedDate] = useState(new Date());
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<BusinessPlan | null>(null);
  
  const [emblaRef, emblaApi] = useEmblaCarousel({ 
    loop: false, 
    align: 'start',
    dragFree: true,
  });
  const [selectedPlanIndex, setSelectedPlanIndex] = useState(0);
  const [planScrollSnaps, setPlanScrollSnaps] = useState<number[]>([]);

  const { report, loading: reportLoading } = useTodayReport(period, selectedDate);
  const { healthData, loading: healthLoading } = useHealthData(period, selectedDate);

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

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="container mx-auto p-4 md:p-6 max-w-7xl space-y-6">
        
        {/* Header with Greeting */}
        <TodayHeader selectedDate={selectedDate} />

        {/* Quick Summary */}
        <QuickSummaryCard 
          achievements={[
            report && report.income > 0 ? `حققت دخل ${report.income} دولار` : null,
            report && report.work_hours > 5 ? `عملت ${report.work_hours} ساعات` : null,
          ].filter(Boolean) as string[]}
        />

        {/* Daily Report Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <DailyReportCard />
        </motion.div>

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
            <DashboardGrid columns={4} gap="md">
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
                  size="lg"
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
                  size="lg"
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
                  size="lg"
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
                  size="lg"
                />
              </motion.div>
            </DashboardGrid>
          ) : null}
        </DashboardSection>

        {/* Glances Bar */}
        <DashboardSection title="نظرة سريعة">
          <GlancesBar />
        </DashboardSection>

        {/* Period Selector */}
        <PeriodSelector value={period} onChange={setPeriod} className="mb-6" />

        {/* Financial Summary */}
        <DashboardSection 
          title={t("financial.title")}
          action={
            <Button variant="outline" size="sm" onClick={() => navigate("/expenses")}>
              {t("financial.viewDetails")}
            </Button>
          }
        >
          {reportLoading ? (
            <DashboardGrid columns={3} gap="md">
              {[...Array(3)].map((_, i) => (
                <Skeleton key={i} className="h-40 w-full rounded-2xl" />
              ))}
            </DashboardGrid>
          ) : (
            <DashboardGrid columns={3} gap="md">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
              >
                <StatRing
                  value={report?.balance || 0}
                  label={t("financial.balance")}
                  color="hsl(var(--chart-1))"
                  customDisplay={`$${report?.balance || 0}`}
                  scale={10000}
                />
              </motion.div>
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
              >
                <StatRing
                  value={report?.income || 0}
                  label={t("financial.income")}
                  color="hsl(var(--success))"
                  customDisplay={`$${report?.income || 0}`}
                  scale={5000}
                />
              </motion.div>
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                onClick={() => navigate("/expenses")} 
                className="cursor-pointer"
              >
                <StatRing
                  value={report?.expenses || 0}
                  label={t("financial.expenses")}
                  color="hsl(var(--destructive))"
                  customDisplay={`$${report?.expenses || 0}`}
                  scale={5000}
                />
              </motion.div>
            </DashboardGrid>
          )}
        </DashboardSection>

        {/* Activities */}
        <DashboardSection title={t("activities.title")}>
          {reportLoading || healthLoading ? (
            <DashboardGrid columns={4} gap="md">
              {[...Array(4)].map((_, i) => (
                <Skeleton key={i} className="h-48 w-full rounded-2xl" />
              ))}
            </DashboardGrid>
          ) : (
            <DashboardGrid columns={4} gap="md">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
              >
                <StatRing
                  value={healthData?.meters ? (healthData.meters / 10000) * 100 : 0}
                  label={t('activities.walk')}
                  color="hsl(262, 83%, 58%)"
                  gradientColors={["hsl(262, 83%, 58%)", "hsl(262, 83%, 75%)"]}
                  icon={<Footprints className="w-5 h-5" />}
                  customDisplay={healthData?.meters ? formatDistance(healthData.meters) : '0 km'}
                  size="md"
                />
              </motion.div>
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
              >
                <StatRing
                  value={(report?.work_hours || 0) * 10}
                  label={t('activities.work')}
                  color="hsl(217, 91%, 60%)"
                  gradientColors={["hsl(217, 91%, 60%)", "hsl(217, 91%, 75%)"]}
                  icon={<Briefcase className="w-5 h-5" />}
                  customDisplay={`${report?.work_hours || 0}h`}
                  size="md"
                />
              </motion.div>
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
              >
                <StatRing
                  value={(report?.study_hours || 0) * 10}
                  label={t('activities.study')}
                  color="hsl(38, 92%, 50%)"
                  gradientColors={["hsl(38, 92%, 50%)", "hsl(38, 92%, 70%)"]}
                  icon={<GraduationCap className="w-5 h-5" />}
                  customDisplay={`${report?.study_hours || 0}h`}
                  size="md"
                />
              </motion.div>
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
              >
                <StatRing
                  value={(report?.sports_hours || 0) * 10}
                  label={t('activities.mma')}
                  color="hsl(142, 76%, 36%)"
                  gradientColors={["hsl(142, 76%, 36%)", "hsl(142, 76%, 50%)"]}
                  icon={<Dumbbell className="w-5 h-5" />}
                  customDisplay={`${report?.sports_hours || 0}h`}
                  size="md"
                />
              </motion.div>
            </DashboardGrid>
          )}
        </DashboardSection>

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
                          "h-2 rounded-full transition-all duration-300",
                          index === selectedPlanIndex 
                            ? "w-8 bg-primary" 
                            : "w-2 bg-muted-foreground/30 hover:bg-muted-foreground/50"
                        )}
                        aria-label={`Go to plan ${index + 1}`}
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center py-12"
            >
              <div className="text-6xl mb-4">📊</div>
              <p className="text-muted-foreground mb-4">{t("plans.noPlans")}</p>
              <Button onClick={() => setDialogOpen(true)}>
                <Plus className="w-4 h-4 mr-2" />
                {t("plans.add")}
              </Button>
            </motion.div>
          )}
        </DashboardSection>

      </div>

      {/* Quick Actions Dock */}
      <QuickActionsDock />

      <PlanFormDialog
        plan={editingPlan}
        isOpen={dialogOpen}
        onClose={() => {
          setDialogOpen(false);
          setEditingPlan(null);
        }}
        onSave={handlePlanSubmit}
      />
    </div>
  );
}

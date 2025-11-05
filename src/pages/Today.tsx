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
import { Skeleton } from "@/components/ui/skeleton";
import { motion } from "framer-motion";
import { StatRing } from "@/components/oryxa/StatRing";
import { OryxaCard } from "@/components/oryxa/Card";
import { DailyReportCard } from "@/components/DailyReportCard";
import { Activity } from "lucide-react";
import { cn } from "@/lib/utils";

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

        {/* WHOOP/Health Data Section */}
        <DashboardSection 
          title="البيانات الصحية"
          action={
            <Button variant="outline" size="sm" onClick={() => navigate("/today-whoop")}>
              <Activity className="w-4 h-4 mr-2" />
              عرض بيانات WHOOP
            </Button>
          }
        >
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-8"
          >
            <div className="text-6xl mb-4">💪</div>
            <p className="text-muted-foreground mb-4">اضغط لعرض البيانات الصحية التفصيلية</p>
          </motion.div>
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
          {reportLoading ? (
            <DashboardGrid columns={4} gap="md">
              {[...Array(4)].map((_, i) => (
                <Skeleton key={i} className="h-32 w-full rounded-2xl" />
              ))}
            </DashboardGrid>
          ) : (
            <DashboardGrid columns={4} gap="md">
              {[
                { icon: "📚", value: report?.study_hours || 0, label: t("activities.study"), delay: 0.1 },
                { icon: "🥊", value: report?.sports_hours || 0, label: t("activities.mma"), delay: 0.2 },
                { icon: "💼", value: report?.work_hours || 0, label: t("activities.work"), delay: 0.3 },
                { icon: "🚶", value: report?.walk_minutes || 0, label: t("activities.walk"), delay: 0.4 },
              ].map((activity, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: activity.delay }}
                >
                  <OryxaCard className="text-center p-6 hover:scale-105 transition-transform duration-200">
                    <div className="text-4xl mb-2">{activity.icon}</div>
                    <div className="text-2xl font-bold">{activity.value}</div>
                    <div className="text-sm text-muted-foreground">{activity.label}</div>
                  </OryxaCard>
                </motion.div>
              ))}
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

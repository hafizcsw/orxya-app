import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useUser } from "@/lib/auth";
import { Card } from "./ui/card";
import { Loader2, DollarSign, TrendingUp, TrendingDown, Clock, BookOpen, Dumbbell, Footprints, Award, Building } from "lucide-react";
import { cn } from "@/lib/utils";

interface DailyReport {
  date: string;
  income_usd: number;
  spend_usd: number;
  net_usd: number;
  study_hours: number;
  mma_hours: number;
  work_hours: number;
  walk_min: number;
  scholarships_sold: number;
  villas_sold: number;
}

export const DailyReportCard = ({ date }: { date?: string }) => {
  const { user, loading: authLoading } = useUser();
  const [report, setReport] = useState<DailyReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchReport = async () => {
      // Wait for auth to finish loading first
      if (authLoading) return;
      
      // Don't fetch if user is not authenticated
      if (!user) {
        setLoading(false);
        setError(null);
        setReport(null);
        return;
      }

      try {
        setLoading(true);
        setError(null);
        
        // Get current session to ensure we have a valid JWT
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          setLoading(false);
          setReport(null);
          return;
        }
        
        const targetDate = date || new Date().toISOString().split('T')[0];
        const { data, error } = await supabase.functions.invoke('report-daily', {
          body: { start: targetDate, end: targetDate }
        });

        if (error) throw error;
        if (data?.items?.[0]) {
          setReport(data.items[0]);
        } else {
          throw new Error("فشل في جلب التقرير");
        }
      } catch (e: any) {
        console.error("خطأ في جلب التقرير:", e);
        setError(e.message || "حدث خطأ");
      } finally {
        setLoading(false);
      }
    };

    fetchReport();
  }, [date, user, authLoading]);

  if (authLoading || loading) {
    return (
      <Card className="p-6">
        <div className="flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span className="mr-2">جاري تحميل التقرير...</span>
        </div>
      </Card>
    );
  }

  if (!user) {
    return (
      <Card className="p-6">
        <p className="text-muted-foreground">سجّل الدخول لعرض التقرير اليومي</p>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="p-6 border-destructive">
        <p className="text-destructive">خطأ: {error}</p>
      </Card>
    );
  }

  if (!report) {
    return (
      <Card className="p-6">
        <p className="text-muted-foreground">لا توجد بيانات لهذا اليوم</p>
      </Card>
    );
  }

  // Stat card component with enhanced design
  const StatCard = ({ 
    icon, 
    label, 
    value, 
    iconBgColor, 
    iconColor,
    trend 
  }: { 
    icon: React.ReactNode; 
    label: string; 
    value: string | number; 
    iconBgColor: string;
    iconColor: string;
    trend?: 'up' | 'down' | 'neutral';
  }) => (
    <div className="group relative overflow-hidden rounded-xl border border-border bg-gradient-to-br from-card to-card/50 p-4 transition-all duration-300 hover:shadow-lg hover:-translate-y-1 hover:border-primary/30">
      {/* Background gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
      
      <div className="relative z-10 flex items-start justify-between gap-3">
        {/* Icon */}
        <div className={cn(
          "flex-shrink-0 w-12 h-12 rounded-xl flex items-center justify-center transition-all duration-300 group-hover:scale-110",
          iconBgColor
        )}>
          <div className={iconColor}>
            {icon}
          </div>
        </div>
        
        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
            {label}
          </div>
          <div className="text-2xl font-bold bg-gradient-to-r from-foreground to-foreground/80 bg-clip-text">
            {value}
          </div>
        </div>
        
        {/* Trend indicator */}
        {trend && (
          <div className={cn(
            "flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center",
            trend === 'up' && "bg-green-500/10",
            trend === 'down' && "bg-red-500/10",
            trend === 'neutral' && "bg-gray-500/10"
          )}>
            {trend === 'up' && <TrendingUp className="w-3 h-3 text-green-500" />}
            {trend === 'down' && <TrendingDown className="w-3 h-3 text-red-500" />}
          </div>
        )}
      </div>
      
      {/* Glow effect on hover */}
      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none">
        <div className="absolute inset-x-0 -bottom-1 h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent" />
      </div>
    </div>
  );

  return (
    <Card className="p-6 bg-gradient-to-br from-card to-card/80 backdrop-blur-sm border-border/50 shadow-lg">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text">
          التقرير اليومي
        </h3>
        <div className="text-sm text-muted-foreground font-medium px-3 py-1 rounded-full bg-primary/10 border border-primary/20">
          {report.date}
        </div>
      </div>
      
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {/* المالية */}
        <StatCard
          icon={<DollarSign className="w-5 h-5" />}
          label="الدخل"
          value={`$${report.income_usd}`}
          iconBgColor="bg-green-500/10"
          iconColor="text-green-600 dark:text-green-400"
          trend="up"
        />
        
        <StatCard
          icon={<DollarSign className="w-5 h-5" />}
          label="المصروفات"
          value={`$${report.spend_usd}`}
          iconBgColor="bg-red-500/10"
          iconColor="text-red-600 dark:text-red-400"
          trend="down"
        />
        
        <StatCard
          icon={<TrendingUp className="w-5 h-5" />}
          label="الصافي"
          value={`$${report.net_usd}`}
          iconBgColor={report.net_usd >= 0 ? "bg-green-500/10" : "bg-red-500/10"}
          iconColor={report.net_usd >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}
          trend={report.net_usd >= 0 ? 'up' : 'down'}
        />

        {/* الأنشطة */}
        <StatCard
          icon={<Clock className="w-5 h-5" />}
          label="ساعات العمل"
          value={`${report.work_hours}س`}
          iconBgColor="bg-blue-500/10"
          iconColor="text-blue-600 dark:text-blue-400"
        />
        
        <StatCard
          icon={<BookOpen className="w-5 h-5" />}
          label="ساعات الدراسة"
          value={`${report.study_hours}س`}
          iconBgColor="bg-purple-500/10"
          iconColor="text-purple-600 dark:text-purple-400"
        />
        
        <StatCard
          icon={<Dumbbell className="w-5 h-5" />}
          label="ساعات MMA"
          value={`${report.mma_hours}س`}
          iconBgColor="bg-orange-500/10"
          iconColor="text-orange-600 dark:text-orange-400"
        />
        
        <StatCard
          icon={<Footprints className="w-5 h-5" />}
          label="المشي"
          value={`${report.walk_min}د`}
          iconBgColor="bg-teal-500/10"
          iconColor="text-teal-600 dark:text-teal-400"
        />

        {/* المبيعات */}
        <StatCard
          icon={<Award className="w-5 h-5" />}
          label="المنح الدراسية"
          value={report.scholarships_sold}
          iconBgColor="bg-amber-500/10"
          iconColor="text-amber-600 dark:text-amber-400"
        />
        
        <StatCard
          icon={<Building className="w-5 h-5" />}
          label="الفلل"
          value={report.villas_sold}
          iconBgColor="bg-indigo-500/10"
          iconColor="text-indigo-600 dark:text-indigo-400"
        />
      </div>
    </Card>
  );
};

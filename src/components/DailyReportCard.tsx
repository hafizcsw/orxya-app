import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "./ui/card";
import { Loader2 } from "lucide-react";

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
  const [report, setReport] = useState<DailyReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchReport = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const targetDate = date || new Date().toISOString().split('T')[0];
        const { data, error } = await supabase.functions.invoke('report-daily', {
          body: { date: targetDate }
        });

        if (error) throw error;
        if (data?.ok && data?.report) {
          setReport(data.report);
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
  }, [date]);

  if (loading) {
    return (
      <Card className="p-6">
        <div className="flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span className="mr-2">جاري تحميل التقرير...</span>
        </div>
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
        <p className="text-muted-foreground">لا توجد بيانات</p>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <h3 className="text-lg font-semibold mb-4">التقرير اليومي - {report.date}</h3>
      
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {/* المالية */}
        <div className="space-y-1">
          <p className="text-sm text-muted-foreground">الدخل</p>
          <p className="text-xl font-bold text-green-600">${report.income_usd}</p>
        </div>
        <div className="space-y-1">
          <p className="text-sm text-muted-foreground">المصروفات</p>
          <p className="text-xl font-bold text-red-600">${report.spend_usd}</p>
        </div>
        <div className="space-y-1">
          <p className="text-sm text-muted-foreground">الصافي</p>
          <p className={`text-xl font-bold ${report.net_usd >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            ${report.net_usd}
          </p>
        </div>

        {/* الأنشطة */}
        <div className="space-y-1">
          <p className="text-sm text-muted-foreground">ساعات العمل</p>
          <p className="text-xl font-bold">{report.work_hours}س</p>
        </div>
        <div className="space-y-1">
          <p className="text-sm text-muted-foreground">ساعات الدراسة</p>
          <p className="text-xl font-bold">{report.study_hours}س</p>
        </div>
        <div className="space-y-1">
          <p className="text-sm text-muted-foreground">ساعات MMA</p>
          <p className="text-xl font-bold">{report.mma_hours}س</p>
        </div>
        <div className="space-y-1">
          <p className="text-sm text-muted-foreground">المشي (دقيقة)</p>
          <p className="text-xl font-bold">{report.walk_min}د</p>
        </div>

        {/* المبيعات */}
        <div className="space-y-1">
          <p className="text-sm text-muted-foreground">المنح الدراسية</p>
          <p className="text-xl font-bold">{report.scholarships_sold}</p>
        </div>
        <div className="space-y-1">
          <p className="text-sm text-muted-foreground">الفلل</p>
          <p className="text-xl font-bold">{report.villas_sold}</p>
        </div>
      </div>
    </Card>
  );
};

import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useHealthData } from "@/hooks/useHealthData";
import dayjs from 'dayjs';

interface BaselineBannerProps {
  date?: string;
}

export default function BaselineBanner({ date }: BaselineBannerProps) {
  const selectedDate = date ? dayjs(date).toDate() : new Date();
  const { healthData, loading } = useHealthData('daily', selectedDate);

  if (loading) return null;

  const days = healthData?.baseline_days_collected ?? 0;

  const pct = Math.min(100, (days / 14) * 100);
  if (days >= 14) return null;

  const remaining = 14 - days;

  return (
    <Card className="p-4 space-y-3 bg-gradient-to-r from-yellow-50 to-orange-50 dark:from-yellow-950/20 dark:to-orange-950/20 border-yellow-200 dark:border-yellow-800">
      <div className="flex items-start gap-3">
        <span className="text-2xl">⚡</span>
        <div className="flex-1 space-y-2">
          <h3 className="font-semibold">نضبط خطّك الصحي الشخصي…</h3>
          <p className="text-sm text-muted-foreground">
            تبقّى {remaining} {remaining === 1 ? 'يوم' : 'أيام'} لإكمال خطّ الأساس (14 يومًا).
          </p>
          <div className="space-y-1">
            <Progress value={pct} className="h-2" />
            <p className="text-xs text-muted-foreground text-right">
              {days} / 14 يومًا ({pct.toFixed(0)}%)
            </p>
          </div>
        </div>
      </div>
    </Card>
  );
}

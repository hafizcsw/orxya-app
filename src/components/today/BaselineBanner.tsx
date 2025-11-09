import { useEffect, useState } from "react";
import { useEdgeFunction } from "@/hooks/useEdgeFunction";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

export default function BaselineBanner() {
  const [days, setDays] = useState(0);
  const { execute } = useEdgeFunction("today-realtime-data");

  useEffect(() => {
    (async () => {
      try {
        const result = await execute({ date: new Date().toISOString().slice(0, 10) });
        if (result?.health?.baseline_days_collected) {
          setDays(result.health.baseline_days_collected);
        }
      } catch (error) {
        console.error("Error fetching baseline:", error);
      }
    })();
  }, []);

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

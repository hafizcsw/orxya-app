import { Card } from "@/components/ui/card";
import { Activity, Moon, Heart } from "lucide-react";
import { useHealthSync } from "@/hooks/useHealthSync";
import { Skeleton } from "@/components/ui/skeleton";

export function HealthMetricsCard() {
  const { metrics, loading } = useHealthSync();

  if (loading) {
    return (
      <Card className="p-4 space-y-3">
        <Skeleton className="h-4 w-32" />
        <div className="space-y-2">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
      </Card>
    );
  }

  if (!metrics) return null;

  const getHRVStatus = (zscore?: number) => {
    if (zscore === undefined) return { text: 'غير متوفر', color: 'text-muted-foreground' };
    if (zscore > 1) return { text: 'ممتاز', color: 'text-green-500' };
    if (zscore > 0) return { text: 'جيد', color: 'text-blue-500' };
    if (zscore > -1) return { text: 'عادي', color: 'text-yellow-500' };
    return { text: 'منخفض', color: 'text-red-500' };
  };

  const hrvStatus = getHRVStatus(metrics.hrvZ);

  return (
    <Card className="p-4">
      <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
        <Activity className="w-5 h-5 text-primary" />
        مؤشرات الصحة
      </h3>
      
      <div className="space-y-3">
        {/* Steps */}
        <div className="flex items-center justify-between p-3 rounded-lg bg-primary/5 border border-primary/10">
          <div className="flex items-center gap-3">
            <Activity className="w-5 h-5 text-primary" />
            <span className="text-sm font-medium">الخطوات</span>
          </div>
          <span className="text-lg font-bold">
            {metrics.steps ? metrics.steps.toLocaleString('ar-EG') : '—'}
          </span>
        </div>

        {/* Sleep */}
        <div className="flex items-center justify-between p-3 rounded-lg bg-blue-500/5 border border-blue-500/10">
          <div className="flex items-center gap-3">
            <Moon className="w-5 h-5 text-blue-500" />
            <span className="text-sm font-medium">النوم</span>
          </div>
          <span className="text-lg font-bold">
            {metrics.sleepMinutes 
              ? `${Math.floor(metrics.sleepMinutes / 60)}س ${Math.floor(metrics.sleepMinutes % 60)}د`
              : '—'}
          </span>
        </div>

        {/* HRV Z-Score */}
        <div className="flex items-center justify-between p-3 rounded-lg bg-gradient-to-r from-purple-500/5 to-pink-500/5 border border-purple-500/10">
          <div className="flex items-center gap-3">
            <Heart className="w-5 h-5 text-purple-500" />
            <div>
              <span className="text-sm font-medium block">HRV</span>
              <span className={`text-xs ${hrvStatus.color}`}>{hrvStatus.text}</span>
            </div>
          </div>
          <span className="text-lg font-bold">
            {metrics.hrvZ !== undefined 
              ? metrics.hrvZ.toFixed(2)
              : '—'}
          </span>
        </div>
      </div>
    </Card>
  );
}

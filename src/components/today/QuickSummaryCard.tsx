import { motion } from "framer-motion";
import { TrendingUp, AlertCircle, Target, Sparkles } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface QuickSummaryCardProps {
  achievements?: string[];
  alerts?: string[];
  goals?: string[];
  className?: string;
}

export function QuickSummaryCard({ 
  achievements = [], 
  alerts = [], 
  goals = [],
  className 
}: QuickSummaryCardProps) {
  const hasContent = achievements.length > 0 || alerts.length > 0 || goals.length > 0;

  if (!hasContent) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className={cn("mb-6", className)}
    >
      <Card className="border-primary/20 bg-gradient-to-br from-primary/5 via-background to-background">
        <CardContent className="p-6 space-y-4">
          {achievements.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-success">
                <TrendingUp className="w-5 h-5" />
                <h3 className="font-semibold">الإنجازات</h3>
              </div>
              <ul className="space-y-1 text-sm text-muted-foreground">
                {achievements.map((achievement, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <Sparkles className="w-4 h-4 mt-0.5 text-success/70" />
                    <span>{achievement}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {alerts.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-warning">
                <AlertCircle className="w-5 h-5" />
                <h3 className="font-semibold">تنبيهات</h3>
              </div>
              <ul className="space-y-1 text-sm text-muted-foreground">
                {alerts.map((alert, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="text-warning">•</span>
                    <span>{alert}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {goals.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-primary">
                <Target className="w-5 h-5" />
                <h3 className="font-semibold">الأهداف القريبة</h3>
              </div>
              <ul className="space-y-1 text-sm text-muted-foreground">
                {goals.map((goal, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="text-primary">→</span>
                    <span>{goal}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}

import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, CheckCircle, Info } from "lucide-react";
import { motion } from "framer-motion";

interface AIRecommendationCardProps {
  advice: string;
  actions?: string[];
  rationale: string;
  sources: string[];
  confidence: number;
  impacts?: {
    finance?: number;
    health?: number;
    time?: number;
  };
  cached?: boolean;
}

export function AIRecommendationCard({
  advice,
  actions,
  rationale,
  sources,
  confidence,
  impacts,
  cached
}: AIRecommendationCardProps) {
  const confidenceColor = confidence >= 0.8 ? "text-success" : confidence >= 0.5 ? "text-warning" : "text-destructive";
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Card className="p-6 space-y-4 bg-card/50 backdrop-blur border-border/50">
        {cached && (
          <Badge variant="secondary" className="mb-2">
            <Info className="w-3 h-3 mr-1" />
            من الذاكرة المؤقتة
          </Badge>
        )}

        <div className="space-y-2">
          <h3 className="text-lg font-semibold text-foreground">التوصية</h3>
          <p className="text-muted-foreground leading-relaxed">{advice}</p>
        </div>

        {actions && actions.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-semibold text-foreground">الإجراءات المقترحة</h4>
            <ul className="space-y-1">
              {actions.map((action, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                  <CheckCircle className="w-4 h-4 mt-0.5 text-success shrink-0" />
                  <span>{action}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="space-y-2">
          <h4 className="text-sm font-semibold text-foreground">التفسير</h4>
          <p className="text-sm text-muted-foreground">{rationale}</p>
        </div>

        {impacts && (
          <div className="flex gap-4 pt-2">
            {impacts.finance !== undefined && (
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">التأثير المالي:</span>
                <Badge variant={impacts.finance > 0 ? "default" : "secondary"}>
                  {impacts.finance > 0 ? "+" : ""}{impacts.finance.toFixed(0)}
                </Badge>
              </div>
            )}
            {impacts.health !== undefined && (
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">التأثير الصحي:</span>
                <Badge variant={impacts.health > 0 ? "default" : "secondary"}>
                  {impacts.health > 0 ? "+" : ""}{impacts.health.toFixed(0)}
                </Badge>
              </div>
            )}
          </div>
        )}

        <div className="flex items-center justify-between pt-4 border-t border-border/50">
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">الثقة:</span>
            <span className={`text-sm font-medium ${confidenceColor}`}>
              {(confidence * 100).toFixed(0)}%
            </span>
          </div>
          
          {sources.length > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">المصادر:</span>
              <span className="text-xs text-muted-foreground">
                {sources.slice(0, 2).join(", ")}
              </span>
            </div>
          )}
        </div>

        <div className="flex items-start gap-2 p-3 bg-muted/50 rounded-lg">
          <AlertCircle className="w-4 h-4 mt-0.5 text-muted-foreground shrink-0" />
          <p className="text-xs text-muted-foreground">
            هذه التوصية مبنية على البيانات المتاحة ولا تعتبر نصيحة مالية أو طبية رسمية.
            استشر متخصصًا عند الحاجة.
          </p>
        </div>
      </Card>
    </motion.div>
  );
}

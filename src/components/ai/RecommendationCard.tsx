import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

type Recommendation = {
  advice: string;
  rationale: string;
  actions?: string[];
  sources?: string[];
  confidence?: number;
  impacts?: {
    finance?: number;
    health?: number;
    time?: number;
  };
};

interface RecommendationCardProps {
  rec: Recommendation;
  onAction?: (action: string) => void;
  domain?: "health" | "finance" | "planner";
}

const domainConfig = {
  health: { icon: "💚", color: "bg-green-100 dark:bg-green-950/30 border-green-200 dark:border-green-800" },
  finance: { icon: "💰", color: "bg-blue-100 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800" },
  planner: { icon: "📅", color: "bg-purple-100 dark:bg-purple-950/30 border-purple-200 dark:border-purple-800" }
};

export function RecommendationCard({ rec, onAction, domain = "health" }: RecommendationCardProps) {
  const config = domainConfig[domain];

  return (
    <Card className={`p-4 space-y-3 ${config.color}`}>
      <div className="flex items-start gap-3">
        <span className="text-2xl flex-shrink-0">{config.icon}</span>
        <div className="flex-1 space-y-3">
          <h3 className="font-semibold text-lg">{rec.advice}</h3>
          
          <p className="text-sm text-muted-foreground whitespace-pre-wrap">
            {rec.rationale}
          </p>

          {!!rec.actions?.length && (
            <div className="flex flex-wrap gap-2">
              {rec.actions.map((action, idx) => (
                <Button
                  key={idx}
                  variant="outline"
                  size="sm"
                  onClick={() => onAction?.(action)}
                  className="text-xs"
                >
                  {action}
                </Button>
              ))}
            </div>
          )}

          <div className="flex flex-wrap items-center gap-2 pt-2 border-t">
            {typeof rec.confidence === "number" && (
              <Badge variant="secondary" className="text-xs">
                ثقة: {(rec.confidence * 100).toFixed(0)}%
              </Badge>
            )}
            
            {!!rec.sources?.length && (
              <span className="text-xs text-muted-foreground">
                المصادر: {rec.sources.join(" • ")}
              </span>
            )}
          </div>

          <p className="text-xs text-muted-foreground italic border-t pt-2">
            ⚠️ هذه توصية عامة وليست نصيحة طبية أو مالية. راجع المصادر واستشر متخصصًا عند الحاجة.
          </p>
        </div>
      </div>
    </Card>
  );
}

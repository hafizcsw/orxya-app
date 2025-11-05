import { useTranslation } from "react-i18next";
import { Calendar as CalendarIcon, TrendingUp, BarChart3, Award } from "lucide-react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

type Period = "daily" | "weekly" | "monthly" | "yearly";

interface PeriodSelectorProps {
  value: Period;
  onChange: (period: Period) => void;
  className?: string;
}

export function PeriodSelector({ value, onChange, className }: PeriodSelectorProps) {
  const { t } = useTranslation();

  const periods = [
    { value: "daily" as Period, icon: CalendarIcon, label: t("today.periods.daily") },
    { value: "weekly" as Period, icon: TrendingUp, label: t("today.periods.weekly") },
    { value: "monthly" as Period, icon: BarChart3, label: t("today.periods.monthly") },
    { value: "yearly" as Period, icon: Award, label: t("today.periods.yearly") },
  ];

  return (
    <Tabs value={value} onValueChange={(v) => onChange(v as Period)} className={className}>
      <TabsList className="grid w-full grid-cols-4 h-auto p-1 bg-card/50 backdrop-blur-sm border border-border/50">
        {periods.map(({ value: periodValue, icon: Icon, label }) => (
          <TabsTrigger
            key={periodValue}
            value={periodValue}
            className={cn(
              "flex flex-col items-center gap-1.5 py-2.5 px-2",
              "data-[state=active]:bg-primary/10 data-[state=active]:text-primary",
              "data-[state=active]:shadow-lg",
              "transition-all duration-200"
            )}
          >
            <Icon className="w-4 h-4" />
            <span className="text-xs font-medium">{label}</span>
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  );
}

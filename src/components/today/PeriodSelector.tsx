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
export function PeriodSelector({
  value,
  onChange,
  className
}: PeriodSelectorProps) {
  const {
    t
  } = useTranslation();
  const periods = [{
    value: "daily" as Period,
    icon: CalendarIcon,
    label: t("today.periods.daily")
  }, {
    value: "monthly" as Period,
    icon: BarChart3,
    label: t("today.periods.monthly")
  }, {
    value: "yearly" as Period,
    icon: Award,
    label: t("today.periods.yearly")
  }];
  return (
    <Tabs value={value} onValueChange={(v) => onChange(v as Period)} className={cn("w-full", className)}>
      <TabsList className="grid w-full grid-cols-3 h-12">
        {periods.map(({ value: periodValue, icon: Icon, label }) => (
          <TabsTrigger key={periodValue} value={periodValue} className="flex items-center gap-2">
            <Icon className="h-4 w-4" />
            <span className="hidden sm:inline">{label}</span>
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  );
}
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
    value: "weekly" as Period,
    icon: TrendingUp,
    label: t("today.periods.weekly")
  }, {
    value: "monthly" as Period,
    icon: BarChart3,
    label: t("today.periods.monthly")
  }, {
    value: "yearly" as Period,
    icon: Award,
    label: t("today.periods.yearly")
  }];
  return;
}
import { useTranslation } from "react-i18next";
import { Calendar } from "lucide-react";
import { format } from "date-fns";
import { ar, es } from "date-fns/locale";

interface TodayHeaderProps {
  selectedDate: Date;
}

export function TodayHeader({ selectedDate }: TodayHeaderProps) {
  const { t, i18n } = useTranslation();
  
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return t("today.greeting.morning");
    if (hour < 18) return t("today.greeting.afternoon");
    if (hour < 22) return t("today.greeting.evening");
    return t("today.greeting.night");
  };

  const locale = i18n.language === "ar" ? ar : i18n.language === "es" ? es : undefined;
  const formattedDate = format(selectedDate, "EEEE، d MMMM yyyy", { locale });

  return (
    <div className="mb-6 space-y-2">
      <h1 className="text-4xl md:text-5xl font-bold gradient-text animate-fade-in">
        {getGreeting()} 👋
      </h1>
      <div className="flex items-center gap-2 text-muted-foreground animate-fade-in" style={{ animationDelay: "0.1s" }}>
        <Calendar className="w-4 h-4" />
        <p className="text-sm md:text-base">{formattedDate}</p>
      </div>
    </div>
  );
}

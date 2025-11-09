import { useTranslation } from "react-i18next";
import { Calendar } from "lucide-react";
import { format } from "date-fns";
import { ar, es } from "date-fns/locale";
interface TodayHeaderProps {
  selectedDate: Date;
}
export function TodayHeader({
  selectedDate
}: TodayHeaderProps) {
  const {
    t,
    i18n
  } = useTranslation();
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return t("today.greeting.morning");
    if (hour < 18) return t("today.greeting.afternoon");
    if (hour < 22) return t("today.greeting.evening");
    return t("today.greeting.night");
  };
  const locale = i18n.language === "ar" ? ar : i18n.language === "es" ? es : undefined;
  const formattedDate = format(selectedDate, "EEEE، d MMMM yyyy", {
    locale
  });
    return <div className="mb-4 space-y-2">
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-r from-primary/10 to-primary/5 border border-primary/20 animate-fade-in">
          <Calendar className="w-4 h-4 text-primary" />
          <p className="text-xs md:text-sm font-medium text-foreground">{formattedDate}</p>
        </div>
      </div>
      
      <div className="flex items-start gap-1.5 px-1 animate-fade-in" style={{ animationDelay: "0.1s" }}>
        <div className="w-1 h-6 bg-gradient-to-b from-primary to-primary/40 rounded-full" />
        <div>
          <h1 className="text-xl md:text-2xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
            {getGreeting()}
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            {t("today.welcome")}
          </p>
        </div>
      </div>
    </div>;
}
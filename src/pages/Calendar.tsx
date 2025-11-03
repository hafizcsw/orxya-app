import { useState } from "react";
import { Protected } from "@/components/Protected";
import CalendarWeek from "@/components/calendar/CalendarWeek";
import { Calendar as CalendarIcon, Grid3x3 } from "lucide-react";
import MonthGrid from "@/components/calendar/MonthGrid";
import { startOfMonth, endOfMonth, toISODate } from "@/lib/dates";
import { supabase } from "@/integrations/supabase/client";
import { useUser } from "@/lib/auth";
import { cn } from "@/lib/utils";

type DbEvent = { 
  id: string; 
  title: string; 
  starts_at: string; 
  ends_at: string; 
  owner_id: string; 
  source?: string;
  conflict_level?: number;
};

type PT = { 
  fajr?: string; 
  dhuhr?: string; 
  asr?: string; 
  maghrib?: string; 
  isha?: string 
};

export default function CalendarPage() {
  const { user } = useUser();
  const [mode, setMode] = useState<"week" | "month">("week");
  const [currentDate, setCurrentDate] = useState(new Date());
  const [loading, setLoading] = useState(false);
  const [eventsByDate, setEventsByDate] = useState<Record<string, DbEvent[]>>({});

  async function loadMonthData() {
    if (!user) return;
    setLoading(true);
    try {
      const from = startOfMonth(currentDate);
      const to = endOfMonth(currentDate);
      
      const { data: evs } = await supabase
        .from("events")
        .select("*")
        .eq("owner_id", user.id)
        .gte("starts_at", from.toISOString())
        .lte("ends_at", to.toISOString());

      const ebd: Record<string, DbEvent[]> = {};
      (evs ?? []).forEach((e: any) => {
        const key = toISODate(new Date(e.starts_at));
        (ebd[key] ||= []).push({ ...e, conflict_level: 0 });
      });
      setEventsByDate(ebd);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Protected>
      <div className="min-h-screen bg-background p-4">
        <div className="max-w-4xl mx-auto space-y-4">
          {/* Compact Header with Mode Switcher */}
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold">التقويم</h1>
            
            <div className="flex items-center gap-1 bg-secondary/60 p-1 rounded-xl">
              <button
                onClick={() => setMode("week")}
                className={cn(
                  "px-3 py-1.5 rounded-lg transition-all text-xs font-medium flex items-center gap-1",
                  mode === "week" 
                    ? "bg-background shadow-sm" 
                    : "hover:bg-background/50"
                )}
              >
                <CalendarIcon className="w-3 h-3" />
                أسبوع
              </button>
              <button
                onClick={() => {
                  setMode("month");
                  loadMonthData();
                }}
                className={cn(
                  "px-3 py-1.5 rounded-lg transition-all text-xs font-medium flex items-center gap-1",
                  mode === "month" 
                    ? "bg-background shadow-sm" 
                    : "hover:bg-background/50"
                )}
              >
                <Grid3x3 className="w-3 h-3" />
                شهر
              </button>
            </div>
          </div>

          {/* Calendar View */}
          {mode === "week" ? (
            <CalendarWeek 
              anchor={currentDate} 
              startOn={6}
              onDateChange={setCurrentDate}
            />
          ) : (
            <MonthGrid 
              anchor={currentDate} 
              eventsByDate={eventsByDate}
              onDayClick={(iso) => console.log("Day clicked:", iso)} 
            />
          )}
        </div>
      </div>
    </Protected>
  );
}

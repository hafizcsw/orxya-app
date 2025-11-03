import { useState, useEffect } from "react";
import { Protected } from "@/components/Protected";
import CalendarWeek from "@/components/calendar/CalendarWeek";
import { Calendar as CalendarIcon, Grid3x3, Plus, Search, Settings, Menu } from "lucide-react";
import MonthGrid from "@/components/calendar/MonthGrid";
import { startOfMonth, endOfMonth, toISODate } from "@/lib/dates";
import { supabase } from "@/integrations/supabase/client";
import { useUser } from "@/lib/auth";
import { cn } from "@/lib/utils";
import CalendarSidebar from "@/components/calendar/CalendarSidebar";
import QuickAddDialog from "@/components/calendar/QuickAddDialog";
import { Button } from "@/components/ui/button";
import { useCalendarShortcuts } from "@/hooks/useCalendarShortcuts";
import { Sheet, SheetContent } from "@/components/ui/sheet";

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
  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false); // Start closed on mobile
  const [refreshKey, setRefreshKey] = useState(0);

  // Detect screen size and manage sidebar
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024) {
        setSidebarOpen(true); // Auto-open on desktop
      } else {
        setSidebarOpen(false); // Auto-close on mobile
      }
    };

    handleResize(); // Initial check
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Keyboard shortcuts
  useCalendarShortcuts({
    onQuickAdd: () => setQuickAddOpen(true),
    onToday: () => setCurrentDate(new Date()),
    onWeekView: () => setMode("week"),
    onMonthView: () => setMode("month"),
    onEscape: () => setQuickAddOpen(false),
  });

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
      <div className="min-h-screen bg-background flex flex-col">
        {/* Google Calendar Header */}
        <header className="border-b border-border/30 bg-background px-2 sm:px-4 py-2 flex items-center justify-between shadow-sm sticky top-0 z-50">
          <div className="flex items-center gap-2 sm:gap-4">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-2 hover:bg-accent/50 rounded-lg transition-colors"
              aria-label="Toggle sidebar"
            >
              <Menu className="w-5 h-5" />
            </button>
            
            <div className="flex items-center gap-2">
              <CalendarIcon className="w-5 h-5 sm:w-6 sm:h-6 text-[#1a73e8]" />
              <h1 className="text-base sm:text-xl font-medium hidden sm:block">التقويم</h1>
            </div>
          </div>

          <div className="flex items-center gap-1 sm:gap-3">
            <div className="hidden md:flex items-center gap-2 bg-muted/30 px-3 py-1.5 rounded-full cursor-pointer hover:bg-muted/50 transition-colors border border-border/30">
              <Search className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">بحث...</span>
            </div>
            
            <Button
              onClick={() => setQuickAddOpen(true)}
              size="sm"
              variant="outline"
              className="bg-white dark:bg-background hover:bg-accent text-foreground gap-1 sm:gap-2 shadow-sm border border-border/50 font-medium px-3 sm:px-4"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">إنشاء</span>
            </Button>

            <button 
              className="hidden sm:flex p-2 hover:bg-accent/50 rounded-full transition-colors"
              aria-label="Settings"
            >
              <Settings className="w-5 h-5 text-muted-foreground" />
            </button>
          </div>
        </header>

        {/* Main Content */}
        <div className="flex-1 flex overflow-hidden">
          {/* Desktop Sidebar - Always visible on large screens */}
          <div className={cn(
            "hidden lg:block border-l border-border/30 bg-background transition-all",
            sidebarOpen ? "w-64" : "w-0"
          )}>
            {sidebarOpen && (
              <CalendarSidebar
                selectedDate={currentDate}
                onDateSelect={setCurrentDate}
              />
            )}
          </div>

          {/* Mobile Sidebar as Sheet */}
          <Sheet open={sidebarOpen && window.innerWidth < 1024} onOpenChange={setSidebarOpen}>
            <SheetContent side="right" className="w-[280px] sm:w-[320px] p-0">
              <CalendarSidebar
                selectedDate={currentDate}
                onDateSelect={(date) => {
                  setCurrentDate(date);
                  if (window.innerWidth < 1024) setSidebarOpen(false);
                }}
              />
            </SheetContent>
          </Sheet>

          {/* Calendar Content */}
          <div className="flex-1 overflow-auto bg-background">
            <div className="p-2 sm:p-4 max-w-[1800px] mx-auto">
              {/* View Controls */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-3 sm:mb-4 gap-2 sm:gap-4">
                <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
                  <Button
                    onClick={() => setCurrentDate(new Date())}
                    variant="outline"
                    size="sm"
                    className="h-8 sm:h-9"
                  >
                    اليوم
                  </Button>
                   
                  <h2 className="text-lg sm:text-xl font-medium">
                    {currentDate.toLocaleDateString('ar', { month: 'long', year: 'numeric' })}
                  </h2>
                </div>

                <div className="flex items-center gap-1 bg-secondary/60 p-1 rounded-lg">
                  <button
                    onClick={() => setMode("week")}
                    className={cn(
                      "px-2 sm:px-3 py-1.5 rounded-md transition-all text-xs font-medium",
                      mode === "week" 
                        ? "bg-background shadow-sm" 
                        : "hover:bg-background/50"
                    )}
                  >
                    أسبوع
                  </button>
                  <button
                    onClick={() => {
                      setMode("month");
                      loadMonthData();
                    }}
                    className={cn(
                      "px-2 sm:px-3 py-1.5 rounded-md transition-all text-xs font-medium",
                      mode === "month" 
                        ? "bg-background shadow-sm" 
                        : "hover:bg-background/50"
                    )}
                  >
                    شهر
                  </button>
                </div>
              </div>

              {/* Calendar View */}
              {mode === "week" ? (
                <CalendarWeek 
                  key={refreshKey}
                  anchor={currentDate} 
                  startOn={6}
                  onDateChange={setCurrentDate}
                />
              ) : (
                <MonthGrid 
                  anchor={currentDate} 
                  eventsByDate={eventsByDate}
                  onDayClick={(iso) => setCurrentDate(new Date(iso))} 
                />
              )}
            </div>
          </div>
        </div>

        {/* Quick Add Dialog */}
        <QuickAddDialog
          open={quickAddOpen}
          onClose={() => setQuickAddOpen(false)}
          onEventCreated={() => {
            setRefreshKey(prev => prev + 1);
            setQuickAddOpen(false);
          }}
        />
      </div>
    </Protected>
  );
}

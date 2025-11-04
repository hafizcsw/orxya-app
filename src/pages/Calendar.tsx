import { useState, useEffect } from "react";
import { Protected } from "@/components/Protected";
import CalendarWeek from "@/components/calendar/CalendarWeek";
import CalendarDayView from "@/components/calendar/CalendarDayView";
import { Calendar as CalendarIcon, Grid3x3, Plus, Search, Settings, Menu, Moon } from "lucide-react";
import MonthGrid from "@/components/calendar/MonthGrid";
import { CalendarWeekErrorBoundary } from "@/components/calendar/CalendarWeekErrorBoundary";
import { startOfMonth, endOfMonth, toISODate } from "@/lib/dates";
import { supabase } from "@/integrations/supabase/client";
import { useUser } from "@/lib/auth";
import { cn } from "@/lib/utils";
import CalendarSidebar from "@/components/calendar/CalendarSidebar";
import QuickAddDialog from "@/components/calendar/QuickAddDialog";
import { Button } from "@/components/ui/button";
import { useCalendarShortcuts } from "@/hooks/useCalendarShortcuts";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { useSelectedDate } from "@/contexts/DateContext";
import PullToRefresh from "react-simple-pull-to-refresh";

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
  const { selectedDate: globalDate, setSelectedDate: setGlobalDate } = useSelectedDate();
  const [mode, setMode] = useState<"day" | "week" | "month">("week");
  const [currentDate, setCurrentDate] = useState(globalDate);
  const [loading, setLoading] = useState(false);
  const [eventsByDate, setEventsByDate] = useState<Record<string, DbEvent[]>>({});
  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showPrayerTimes, setShowPrayerTimes] = useState(true);

  // Sync with global date from Navigation
  useEffect(() => {
    setCurrentDate(globalDate);
  }, [globalDate]);

  // Detect screen size and manage sidebar
  useEffect(() => {
    const handleResize = () => {
      if (typeof window !== 'undefined') {
        if (window.innerWidth >= 1024) {
          setSidebarOpen(true); // Auto-open on desktop
        } else {
          setSidebarOpen(false); // Auto-close on mobile
        }
      }
    };

    handleResize(); // Initial check
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Keyboard shortcuts
  useCalendarShortcuts({
    onQuickAdd: () => setQuickAddOpen(true),
    onToday: () => {
      const today = new Date();
      setCurrentDate(today);
      setGlobalDate(today);
      setMode("day");
    },
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
        .is("deleted_at", null)
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

  const handleRefresh = async () => {
    if (mode === "month") {
      await loadMonthData();
    }
    // Trigger re-render for week and day views (they have their own data fetching)
    setCurrentDate(new Date(currentDate));
    return Promise.resolve();
  };

  return (
    <Protected>
      <main className="min-h-dvh flex flex-col bg-background">
        {/* Enhanced Header with Gradient */}
        <header className="sticky top-0 z-20 border-b border-border/20 bg-gradient-to-r from-background via-background to-accent/5 backdrop-blur-md px-3 sm:px-4 py-3 sm:py-2 flex items-center justify-between shadow-lg">
          <div className="flex items-center gap-3 sm:gap-4">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-2 hover:bg-accent/50 rounded-xl transition-all duration-200 hover:scale-105 active:scale-95"
              aria-label="Toggle sidebar"
            >
              <Menu className="w-5 h-5 sm:w-5 sm:h-5" />
            </button>
            
            <div className="flex items-center gap-2 group">
              <CalendarIcon className="w-6 h-6 sm:w-6 sm:h-6 text-primary transition-transform duration-300 group-hover:rotate-12" />
              <h1 className="text-lg sm:text-xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text">التقويم</h1>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <div className="hidden md:flex items-center gap-2 bg-muted/30 px-4 py-2 rounded-full cursor-pointer hover:bg-muted/50 hover:shadow-md transition-all duration-200 border border-border/30 backdrop-blur-sm">
              <Search className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">بحث...</span>
            </div>
            
            <Button
              onClick={() => setQuickAddOpen(true)}
              size="sm"
              variant="outline"
              className="bg-white dark:bg-background hover:bg-accent text-foreground gap-2 shadow-md hover:shadow-lg border border-border/50 font-semibold px-3 sm:px-4 h-9 sm:h-9 text-sm transition-all duration-200 hover:scale-105 active:scale-95"
            >
              <Plus className="w-4 h-4" />
              <span>إنشاء</span>
            </Button>

            <button 
              className="hidden sm:flex p-2 hover:bg-accent/50 rounded-full transition-all duration-200 hover:rotate-90"
              aria-label="Settings"
            >
              <Settings className="w-5 h-5 text-muted-foreground" />
            </button>
          </div>
        </header>

        {/* Main Content */}
        <section className="flex-1 flex overflow-y-auto overscroll-contain">
          {/* Desktop Sidebar - Always visible on large screens */}
          <div className={cn(
            "hidden lg:block border-l border-border/30 bg-background transition-all",
            sidebarOpen ? "w-64" : "w-0"
          )}>
            {sidebarOpen && (
              <CalendarSidebar
                selectedDate={currentDate}
                onDateSelect={(date) => {
                  setCurrentDate(date);
                  setGlobalDate(date);
                }}
              />
            )}
          </div>

          {/* Mobile Sidebar as Sheet */}
          <Sheet open={sidebarOpen && typeof window !== 'undefined' && window.innerWidth < 1024} onOpenChange={setSidebarOpen}>
            <SheetContent side="right" className="w-[280px] sm:w-[320px] p-0">
              <CalendarSidebar
                selectedDate={currentDate}
                onDateSelect={(date) => {
                  setCurrentDate(date);
                  setGlobalDate(date);
                  if (typeof window !== 'undefined' && window.innerWidth < 1024) setSidebarOpen(false);
                }}
              />
            </SheetContent>
          </Sheet>

          {/* Calendar Content */}
          <PullToRefresh
            onRefresh={handleRefresh}
            pullingContent={
              <div className="flex justify-center py-4">
                <div className="text-sm text-muted-foreground">↓ اسحب للتحديث</div>
              </div>
            }
            refreshingContent={
              <div className="flex justify-center py-4">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
              </div>
            }
            resistance={2}
            className="flex-1 overflow-auto bg-background"
          >
            <div className="p-3 sm:p-4 max-w-[1800px] mx-auto">
              {/* Enhanced View Controls */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-3 sm:gap-4">
                <div className="flex items-center gap-3 flex-wrap w-full sm:w-auto">
                  <Button
                    onClick={() => {
                      const today = new Date();
                      setCurrentDate(today);
                      setGlobalDate(today);
                      setMode("day");
                    }}
                    variant="outline"
                    size="sm"
                    className="h-9 text-sm font-semibold shadow-sm hover:shadow-md transition-all duration-200 hover:scale-105 border-primary/20"
                  >
                    اليوم
                  </Button>

                  <Button
                    onClick={() => setShowPrayerTimes(!showPrayerTimes)}
                    variant={showPrayerTimes ? "default" : "outline"}
                    size="sm"
                    className="h-9 gap-2 text-sm font-semibold shadow-sm hover:shadow-md transition-all duration-200 hover:scale-105"
                    title={showPrayerTimes ? "إخفاء أوقات الصلاة" : "إظهار أوقات الصلاة"}
                  >
                    <Moon className="w-4 h-4" />
                    <span className="sm:inline">الصلاة</span>
                  </Button>
                   
                  <h2 className="text-base sm:text-xl font-bold bg-gradient-to-r from-foreground to-foreground/60 bg-clip-text">
                    {currentDate.toLocaleDateString('ar', { month: 'long', year: 'numeric' })}
                  </h2>
                </div>

                <div className="flex items-center gap-1 bg-gradient-to-r from-secondary/60 to-secondary/40 p-1.5 rounded-xl shadow-md backdrop-blur-sm border border-border/30">
                  <button
                    onClick={() => setMode("day")}
                    className={cn(
                      "px-4 sm:px-4 py-2 rounded-lg transition-all duration-300 text-sm font-semibold",
                      mode === "day" 
                        ? "bg-background shadow-lg scale-105 text-primary" 
                        : "hover:bg-background/50 hover:scale-105"
                    )}
                  >
                    يوم
                  </button>
                  <button
                    onClick={() => setMode("week")}
                    className={cn(
                      "px-4 sm:px-4 py-2 rounded-lg transition-all duration-300 text-sm font-semibold",
                      mode === "week" 
                        ? "bg-background shadow-lg scale-105 text-primary" 
                        : "hover:bg-background/50 hover:scale-105"
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
                      "px-4 sm:px-4 py-2 rounded-lg transition-all duration-300 text-sm font-semibold",
                      mode === "month" 
                        ? "bg-background shadow-lg scale-105 text-primary" 
                        : "hover:bg-background/50 hover:scale-105"
                    )}
                  >
                    شهر
                  </button>
                </div>
              </div>

              {/* Calendar View */}
              {mode === "day" ? (
                <CalendarDayView
                  key={currentDate.getTime()}
                  anchor={currentDate}
                  onDateChange={(date) => {
                    setCurrentDate(date);
                    setGlobalDate(date);
                  }}
                  showPrayerTimes={showPrayerTimes}
                />
              ) : mode === "week" ? (
                <CalendarWeekErrorBoundary>
                  <CalendarWeek 
                    key={currentDate.getTime()}
                    anchor={currentDate} 
                    startOn={6}
                    onDateChange={(date) => {
                      setCurrentDate(date);
                      setGlobalDate(date);
                    }}
                    showPrayerTimes={false}
                  />
                </CalendarWeekErrorBoundary>
              ) : (
                <MonthGrid 
                  anchor={currentDate} 
                  eventsByDate={eventsByDate}
                  onDayClick={(iso) => setCurrentDate(new Date(iso))} 
                />
              )}
            </div>
          </PullToRefresh>
        </section>

        {/* Quick Add Dialog */}
        <QuickAddDialog
          open={quickAddOpen}
          onClose={() => setQuickAddOpen(false)}
          onEventCreated={() => {
            setQuickAddOpen(false);
          }}
        />
      </main>
    </Protected>
  );
}

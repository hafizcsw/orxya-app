import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
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
import { SmartLamp } from "@/components/SmartLamp";
import { AdvancedEventForm } from "@/components/calendar/AdvancedEventForm";
import { toast } from "sonner";
import { useTranslation } from 'react-i18next';

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
  const navigate = useNavigate();
  const { user } = useUser();
  const { t } = useTranslation('calendar');
  const { selectedDate: globalDate, setSelectedDate: setGlobalDate } = useSelectedDate();
  const [mode, setMode] = useState<"day" | "week" | "month">("day");
  const [currentDate, setCurrentDate] = useState(globalDate);
  const [loading, setLoading] = useState(false);
  const [eventsByDate, setEventsByDate] = useState<Record<string, DbEvent[]>>({});
  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const [advancedFormOpen, setAdvancedFormOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showPrayerTimes, setShowPrayerTimes] = useState(true);
  const [editingEvent, setEditingEvent] = useState<any>(null);

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
      
      const { data: evs, error } = await supabase
        .from("events")
        .select("*")
        .eq("owner_id", user.id)
        .is("deleted_at", null)
        .gte("starts_at", from.toISOString())
        .lte("ends_at", to.toISOString());

      if (error) {
        console.error('[Calendar] Error loading month data:', error);
        toast.error('فشل تحميل أحداث الشهر');
        return;
      }

      const ebd: Record<string, DbEvent[]> = {};
      (evs ?? []).forEach((e: any) => {
        const key = toISODate(new Date(e.starts_at));
        (ebd[key] ||= []).push({ ...e, conflict_level: 0 });
      });
      setEventsByDate(ebd);
    } catch (error) {
      console.error('[Calendar] Unexpected error:', error);
      toast.error('حدث خطأ غير متوقع في تحميل الأحداث');
    } finally {
      setLoading(false);
    }
  }

  const handleRefresh = async () => {
    try {
      if (mode === "month") {
        await loadMonthData();
      }
      // Trigger re-render for week and day views (they have their own data fetching)
      setCurrentDate(new Date(currentDate));
      toast.success('تم تحديث التقويم');
      return Promise.resolve();
    } catch (error) {
      console.error('[Calendar] Refresh error:', error);
      toast.error('فشل تحديث التقويم');
      return Promise.reject(error);
    }
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
              <h1 className="text-lg sm:text-xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text">{t('title')}</h1>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <div className="hidden md:flex items-center gap-2 bg-muted/30 px-4 py-2 rounded-full cursor-pointer hover:bg-muted/50 hover:shadow-md transition-all duration-200 border border-border/30 backdrop-blur-sm">
              <Search className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">{t('search')}</span>
            </div>
            
            <Button
              onClick={() => {
                setEditingEvent(null);
                setAdvancedFormOpen(true);
              }}
              size="sm"
              variant="outline"
              className="bg-white dark:bg-background hover:bg-accent text-foreground gap-2 shadow-md hover:shadow-lg border border-border/50 font-semibold px-3 sm:px-4 h-9 sm:h-9 text-sm transition-all duration-200 hover:scale-105 active:scale-95"
            >
              <Plus className="w-4 h-4" />
              <span>{t('create')}</span>
            </Button>

            <button 
              onClick={() => navigate('/calendar/settings')}
              className="hidden sm:flex p-2 hover:bg-accent/50 rounded-full transition-all duration-200 hover:rotate-90"
              aria-label="Calendar Settings"
            >
              <Settings className="w-5 h-5 text-muted-foreground" />
            </button>
          </div>
        </header>

        {/* Main Content */}
        <section className="flex-1 flex overflow-y-auto overscroll-contain">
          {/* Desktop Sidebar - Responsive Width */}
          <div className={cn(
            "hidden lg:block border-l border-border/30 bg-background transition-all",
            sidebarOpen ? "w-64 xl:w-80" : "w-0" // Wider on XL screens
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
                <div className="text-sm text-muted-foreground">↓ {t('pullToRefresh')}</div>
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
            <div className={cn(
              "p-3 sm:p-4 max-w-[1800px] mx-auto",
              "px-4 md:px-6 lg:px-8", // Progressive padding
              "py-6 md:py-8"
            )}>
              {/* Google Calendar Style Date Header */}
              <div className="flex items-center justify-between mb-4 pb-3 border-b">
                <div className="flex items-center gap-4">
                  {/* Large Day Circle */}
                  {mode === "day" && (
                    <div className={cn(
                      "flex flex-col items-center justify-center rounded-full",
                      "w-14 h-14 sm:w-16 sm:h-16",
                      currentDate.toDateString() === new Date().toDateString()
                        ? "bg-primary text-white shadow-lg"
                        : "border-2 border-border text-foreground"
                    )}>
                      <span className="text-xs uppercase font-medium opacity-80">
                        {currentDate.toLocaleDateString("ar", { weekday: "short" })}
                      </span>
                      <span className="text-xl sm:text-2xl font-bold">
                        {currentDate.getDate()}
                      </span>
                    </div>
                  )}
                  
                  {/* Month/Year */}
                  <div className="flex flex-col">
                    <h2 className="text-lg sm:text-2xl font-bold">
                      {mode === "day" 
                        ? currentDate.toLocaleDateString("ar", { weekday: "long" })
                        : currentDate.toLocaleDateString('ar', { month: 'long' })}
                    </h2>
                    <span className="text-sm text-muted-foreground">
                      {currentDate.toLocaleDateString('ar', { year: 'numeric' })}
                    </span>
                  </div>
                </div>

                {/* Controls */}
                <div className="flex items-center gap-2">
                  <Button
                    onClick={() => {
                      const today = new Date();
                      setCurrentDate(today);
                      setGlobalDate(today);
                    }}
                    variant="outline"
                    size="sm"
                    className="h-9"
                  >
                    {t('today')}
                  </Button>

                  <Button
                    onClick={() => setShowPrayerTimes(!showPrayerTimes)}
                    variant={showPrayerTimes ? "default" : "outline"}
                    size="sm"
                    className="h-9 gap-2"
                  >
                    <Moon className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              {/* View Mode Tabs */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                </div>
                <div className="flex items-center gap-1 bg-muted/50 p-1 rounded-lg">
                  <button
                    onClick={() => setMode("day")}
                    className={cn(
                      "px-4 sm:px-4 py-2 rounded-lg transition-all duration-300 text-sm font-semibold",
                      mode === "day" 
                        ? "bg-background shadow-lg scale-105 text-primary" 
                        : "hover:bg-background/50 hover:scale-105"
                    )}
                  >
                    {t('views.day')}
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
                    {t('views.week')}
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
                    {t('views.month')}
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

        {/* Advanced Event Form */}
        <Sheet open={advancedFormOpen} onOpenChange={setAdvancedFormOpen}>
          <SheetContent side="left" className="w-full sm:max-w-2xl overflow-y-auto">
            <AdvancedEventForm
              initialData={editingEvent}
              onSubmit={async (data) => {
                try {
                  const { error } = await supabase.functions.invoke("calendar-apply", {
                    body: {
                      action: editingEvent?.id ? "update" : "create",
                      event: data,
                    },
                  });

                  if (error) throw error;
                  toast.success(editingEvent?.id ? "تم تحديث الحدث بنجاح" : "تم إنشاء الحدث بنجاح");
                  setAdvancedFormOpen(false);
                  setEditingEvent(null);
                  handleRefresh();
                } catch (err: any) {
                  console.error('[Calendar] Error saving event:', err);
                  
                  let errorMessage = 'فشل حفظ الحدث';
                  if (err?.message?.includes('conflict')) {
                    errorMessage = 'يوجد تعارض في المواعيد';
                  } else if (err?.message?.includes('permission')) {
                    errorMessage = 'ليس لديك صلاحية لحفظ الحدث';
                  }
                  
                  toast.error(errorMessage);
                }
              }}
              onClose={() => {
                setAdvancedFormOpen(false);
                setEditingEvent(null);
              }}
            />
          </SheetContent>
        </Sheet>

        {/* Smart Lamp Notification */}
        <SmartLamp />
      </main>
    </Protected>
  );
}

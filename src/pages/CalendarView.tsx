import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useUser } from "@/lib/auth";
import { track } from "@/lib/telemetry";
import { Calendar, Clock, Plus, AlertTriangle } from "lucide-react";
import { Toast } from "@/components/Toast";

type Event = {
  id: string;
  title: string;
  starts_at: string;
  ends_at: string;
  status: string;
  source: string;
};

type Conflict = {
  id: string;
  prayer_name: string;
  severity: string;
  event_id: string;
};

const CalendarView = () => {
  const { user } = useUser();
  const [view, setView] = useState<"day" | "week">("day");
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().slice(0, 10));
  const [events, setEvents] = useState<Event[]>([]);
  const [conflicts, setConflicts] = useState<Conflict[]>([]);
  const [toast, setToast] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) {
      loadEvents();
      loadConflicts();
    }
  }, [user, selectedDate]);

  async function loadEvents() {
    if (!user) return;
    
    const startDate = `${selectedDate}T00:00:00Z`;
    const endDate = `${selectedDate}T23:59:59Z`;

    const { data, error } = await supabase
      .from("events")
      .select("*")
      .eq("owner_id", user.id)
      .is("deleted_at", null)
      .gte("starts_at", startDate)
      .lte("starts_at", endDate)
      .order("starts_at");

    if (!error && data) {
      setEvents(data);
    }
  }

  async function loadConflicts() {
    if (!user) return;

    const { data, error } = await supabase
      .from("conflicts")
      .select("*")
      .eq("owner_id", user.id)
      .eq("date_iso", selectedDate)
      .eq("status", "open");

    if (!error && data) {
      setConflicts(data);
    }
  }

  async function runConflictCheck() {
    if (!user) return;
    
    setLoading(true);
    track("calendar_conflict_check_manual");

    try {
      const { data, error } = await supabase.functions.invoke("conflict-check", {
        body: { date: selectedDate }
      });

      if (error) throw error;

      setToast(`تم الفحص: ${data?.count ?? 0} تعارض`);
      await loadConflicts();
    } catch (e: any) {
      setToast(`خطأ: ${e.message}`);
      track("calendar_conflict_check_error");
    } finally {
      setLoading(false);
    }
  }

  function getConflictForEvent(eventId: string) {
    return conflicts.find(c => c.event_id === eventId);
  }

  function getEventHourPosition(startTime: string) {
    const hour = new Date(startTime).getUTCHours();
    return hour * 60;
  }

  function getEventDuration(startTime: string, endTime: string) {
    const start = new Date(startTime).getTime();
    const end = new Date(endTime).getTime();
    return (end - start) / (1000 * 60);
  }

  const hours = Array.from({ length: 24 }, (_, i) => i);

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-6xl mx-auto space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Calendar className="w-6 h-6" />
            <h1 className="text-2xl font-bold">التقويم</h1>
          </div>
          
          <div className="flex items-center gap-2">
            <button
              onClick={runConflictCheck}
              disabled={loading}
              className="px-4 py-2 rounded-lg bg-yellow-500 text-white disabled:opacity-50 flex items-center gap-2"
            >
              <AlertTriangle className="w-4 h-4" />
              {loading ? "جاري الفحص..." : "فحص التعارضات"}
            </button>
            
            <button className="p-2 rounded-lg bg-primary text-primary-foreground">
              <Plus className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* View Toggle */}
        <div className="flex gap-2">
          <button
            onClick={() => setView("day")}
            className={`px-4 py-2 rounded-lg ${view === "day" ? "bg-primary text-primary-foreground" : "bg-muted"}`}
          >
            يوم
          </button>
          <button
            onClick={() => setView("week")}
            className={`px-4 py-2 rounded-lg ${view === "week" ? "bg-primary text-primary-foreground" : "bg-muted"}`}
          >
            أسبوع
          </button>
        </div>

        {/* Date Picker */}
        <input
          type="date"
          value={selectedDate}
          onChange={(e) => setSelectedDate(e.target.value)}
          className="px-4 py-2 rounded-lg border"
        />

        {/* Conflicts Summary */}
        {conflicts.length > 0 && (
          <div className="p-4 rounded-lg bg-yellow-50 border border-yellow-200">
            <div className="flex items-center gap-2 text-yellow-900">
              <AlertTriangle className="w-5 h-5" />
              <span className="font-semibold">تعارضات الصلاة: {conflicts.length}</span>
            </div>
          </div>
        )}

        {/* Calendar Grid */}
        <div className="border rounded-2xl bg-white overflow-hidden">
          <div className="relative" style={{ height: "1440px" }}>
            {/* Hour Labels */}
            <div className="absolute right-0 top-0 w-16 border-l">
              {hours.map(hour => (
                <div
                  key={hour}
                  className="h-[60px] border-b flex items-start justify-center pt-1 text-xs text-muted-foreground"
                >
                  {hour.toString().padStart(2, "0")}:00
                </div>
              ))}
            </div>

            {/* Events */}
            <div className="absolute right-16 left-0 top-0">
              {hours.map(hour => (
                <div key={hour} className="h-[60px] border-b" />
              ))}

              {events.map(event => {
                const conflict = getConflictForEvent(event.id);
                const top = getEventHourPosition(event.starts_at);
                const duration = getEventDuration(event.starts_at, event.ends_at);
                const height = duration;

                return (
                  <div
                    key={event.id}
                    className={`absolute right-2 left-2 rounded-lg p-2 ${
                      conflict?.severity === "block" ? "bg-red-100 border-2 border-red-500" :
                      conflict?.severity === "warn" ? "bg-yellow-100 border-2 border-yellow-500" :
                      "bg-blue-100 border border-blue-300"
                    }`}
                    style={{ top: `${top}px`, height: `${height}px` }}
                  >
                    <div className="text-sm font-semibold truncate">{event.title}</div>
                    {conflict && (
                      <div className="text-xs text-red-700 mt-1">
                        ⚠️ {conflict.prayer_name}
                      </div>
                    )}
                    <div className="text-xs opacity-70 mt-1">
                      <Clock className="w-3 h-3 inline" /> {duration} دقيقة
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {toast && <Toast msg={toast} />}
    </div>
  );
};

export default CalendarView;

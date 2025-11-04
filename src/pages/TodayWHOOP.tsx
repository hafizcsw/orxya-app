import React, { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Bell, Calendar, Clock, Info, Loader2, MapPin, RefreshCcw, Activity, Heart, Moon, Zap } from "lucide-react";
import { useEdgeActions } from "@/hooks/useEdgeActions";
import { format } from "date-fns";
import { LegacyToday } from "@/components/LegacyToday";
import { supabase } from "@/integrations/supabase/client";
import { useUser } from "@/lib/auth";
import NaturalInput from "@/components/calendar/NaturalInput";
import { useCalendarInstances } from "@/hooks/useCalendarInstances";

/**
 * TodayWHOOP v2.1 — UI Delta (non-destructive)
 * -------------------------------------------------
 * Drop-in component يُبنى فوق Today الحالي بدون هدم.
 * كل ميزة خلف Feature Flags ويمكن تعطيلها فورًا.
 *
 * استراتيجية الدمج:
 * 1. المكونات الجديدة (WHOOP-style) في الأعلى
 * 2. المكونات القديمة (LegacyToday) في الأسفل
 * 3. Feature Flags للتحكم في العرض
 * 4. لا نحذف أي شيء - فقط نضيف فوق الموجود
 *
 * Flags (قراءة من query/localStorage):
 *   ff_conflicts_first, ff_now_next_strip, ff_timeline_inline,
 *   ff_health_rings, ff_micro_labels, ff_permissions_inline
 */

// -----------------------------
// Feature Flags Helper
// -----------------------------
function useFlags() {
  const [flags, setFlags] = useState<Record<string, boolean>>({});
  useEffect(() => {
    const url = new URL(window.location.href);
    const ffParam = url.searchParams.get("ff");
    const initial: Record<string, boolean> = {
      ff_conflicts_first: true,
      ff_now_next_strip: true,
      ff_timeline_inline: true,
      ff_health_rings: true,
      ff_micro_labels: true,
      ff_permissions_inline: true,
      // Epic 6
      ff_location_bg: true,
      ff_location_push: false,
      ff_finloc_link: false,
      ff_geocode_ondevice: false,
      // Calendar Supercharged
      ff_calendar_instances: true,
      ff_calendar_nlp: true,
      ff_calendar_find_time: false,
      ff_calendar_overlays: true,
      ff_calendar_mobile: false,
    };
    if (ffParam) {
      ffParam.split(",").forEach(k => (initial[k] = true));
    }
    // allow localStorage overrides
    Object.keys(initial).forEach(k => {
      const v = localStorage.getItem(k);
      if (v === "0") initial[k] = false;
      if (v === "1") initial[k] = true;
    });
    setFlags(initial);
  }, []);
  return flags;
}

// -----------------------------
// Micro Labels (Source / Confidence / Last Sync)
// -----------------------------
function MicroLabels({ source, confidence, lastSync }: { source?: string; confidence?: "low"|"mid"|"high"; lastSync?: string }) {
  return (
    <div className="flex items-center gap-2 text-xs text-muted-foreground mt-2">
      {source && <Badge variant="outline" className="rounded-full px-2">{source}</Badge>}
      {confidence && (
        <span className="flex items-center gap-1">
          <span className="inline-flex items-center gap-0.5">
            <span className={`w-1.5 h-1.5 rounded-full ${confidence !== "low" ? "bg-foreground/80" : "bg-foreground/40"}`} />
            <span className={`w-1.5 h-1.5 rounded-full ${confidence !== "low" && confidence !== "mid" ? "bg-foreground/80" : "bg-foreground/40"}`} />
            <span className={`w-1.5 h-1.5 rounded-full ${confidence === "high" ? "bg-foreground/80" : "bg-foreground/40"}`} />
          </span>
          <span>confidence</span>
        </span>
      )}
      {lastSync && (
        <span className="inline-flex items-center gap-1"><RefreshCcw className="w-3 h-3" />{lastSync}</span>
      )}
    </div>
  );
}

// -----------------------------
// Conflict Quick-Solve Card (قرار واحد + Undo)
// -----------------------------
function ConflictQuickSolveCard({ conflict }: { conflict?: { title: string; window: string; prayer?: string; severity: "high"|"mid"|"low" } }) {
  if (!conflict) return null;
  const color = conflict.severity === "high" ? "border-red-500/50" : conflict.severity === "mid" ? "border-amber-500/50" : "border-foreground/10";
  return (
    <Card className={`backdrop-blur-md bg-background/60 border ${color}`}>
      <CardContent className="p-4 flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-red-500" />
            <div className="font-medium">Conflict detected</div>
          </div>
          <Badge variant="secondary">{conflict.prayer ?? "window"}</Badge>
        </div>
        <div className="text-sm text-muted-foreground">
          <b>{conflict.title}</b> overlaps <b>{conflict.prayer ?? "busy window"}</b> — {conflict.window}
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" className="rounded-2xl">Shift +30m</Button>
          <Button size="sm" variant="outline" className="rounded-2xl">Notify</Button>
          <Button size="sm" variant="ghost" className="rounded-2xl">Ignore today</Button>
        </div>
        <MicroLabels source="conflict-check" confidence="high" lastSync="updated now" />
      </CardContent>
    </Card>
  );
}

// -----------------------------
// Now / Next Strip
// -----------------------------
function NowNextStrip({ now, next }: { now?: { title: string; until: string }; next?: { title: string; at: string } }) {
  if (!now && !next) return null;
  return (
    <div className="w-full rounded-2xl border bg-background/60 backdrop-blur p-3 flex items-center justify-between">
      <div className="flex items-center gap-2">
        <Clock className="w-4 h-4" />
        <div className="text-sm"><b>Now:</b> {now?.title ?? "—"} <span className="text-muted-foreground">(until {now?.until ?? "—"})</span></div>
      </div>
      <div className="flex items-center gap-2">
        <Calendar className="w-4 h-4" />
        <div className="text-sm"><b>Next:</b> {next?.title ?? "—"} <span className="text-muted-foreground">@ {next?.at ?? "—"}</span></div>
      </div>
    </div>
  );
}

// -----------------------------
// Health Rings (Sleep, Strain, Recovery)
// -----------------------------
function HealthRings({ sleep, strain, recovery }: { sleep?: number; strain?: number; recovery?: number }) {
  return (
    <Card className="backdrop-blur-md bg-card/50 border-border/50 shadow-lg">
      <CardContent className="p-6">
        <div className="font-medium mb-4 flex items-center gap-2">
          <Activity className="w-5 h-5 text-primary" />
          <span>مؤشرات الصحة اليومية</span>
        </div>
        <div className="grid grid-cols-3 gap-4">
          {/* Sleep Ring */}
          <div className="flex flex-col items-center gap-2">
            <div className="relative w-20 h-20">
              <svg className="w-full h-full transform -rotate-90">
                <circle cx="40" cy="40" r="36" fill="none" stroke="hsl(var(--muted))" strokeWidth="6" />
                <circle 
                  cx="40" 
                  cy="40" 
                  r="36" 
                  fill="none" 
                  stroke="hsl(217 91% 60%)" 
                  strokeWidth="6"
                  strokeDasharray={`${2 * Math.PI * 36}`}
                  strokeDashoffset={`${2 * Math.PI * 36 * (1 - (sleep || 0) / 100)}`}
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <Moon className="w-6 h-6 text-blue-400" />
              </div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">{sleep || 0}%</div>
              <div className="text-xs text-muted-foreground">النوم</div>
            </div>
          </div>

          {/* Strain Ring */}
          <div className="flex flex-col items-center gap-2">
            <div className="relative w-20 h-20">
              <svg className="w-full h-full transform -rotate-90">
                <circle cx="40" cy="40" r="36" fill="none" stroke="hsl(var(--muted))" strokeWidth="6" />
                <circle 
                  cx="40" 
                  cy="40" 
                  r="36" 
                  fill="none" 
                  stroke="hsl(38 92% 50%)" 
                  strokeWidth="6"
                  strokeDasharray={`${2 * Math.PI * 36}`}
                  strokeDashoffset={`${2 * Math.PI * 36 * (1 - (strain || 0) / 100)}`}
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <Zap className="w-6 h-6 text-amber-400" />
              </div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">{strain || 0}%</div>
              <div className="text-xs text-muted-foreground">الإجهاد</div>
            </div>
          </div>

          {/* Recovery Ring */}
          <div className="flex flex-col items-center gap-2">
            <div className="relative w-20 h-20">
              <svg className="w-full h-full transform -rotate-90">
                <circle cx="40" cy="40" r="36" fill="none" stroke="hsl(var(--muted))" strokeWidth="6" />
                <circle 
                  cx="40" 
                  cy="40" 
                  r="36" 
                  fill="none" 
                  stroke="hsl(142 76% 36%)" 
                  strokeWidth="6"
                  strokeDasharray={`${2 * Math.PI * 36}`}
                  strokeDashoffset={`${2 * Math.PI * 36 * (1 - (recovery || 0) / 100)}`}
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <Heart className="w-6 h-6 text-green-400" />
              </div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">{recovery || 0}%</div>
              <div className="text-xs text-muted-foreground">التعافي</div>
            </div>
          </div>
        </div>
        <MicroLabels source="Health" confidence="high" lastSync="تم التحديث الآن" />
      </CardContent>
    </Card>
  );
}

// -----------------------------
// Inline Timeline (day) + Prayer overlay
// -----------------------------
function TimelineInline({ items, now, prayerWindows }: { items: Array<{ start: string; end: string; title: string; source?: string }>; now: string; prayerWindows?: Array<{ start: string; end: string; name: string }>; }) {
  // Simple visual timeline: 24 blocks, overlay busy windows + now + prayer translucent bands
  const hours = Array.from({ length: 24 }).map((_, i) => i);
  return (
    <Card className="bg-background/60 backdrop-blur border">
      <CardContent className="p-4">
        <div className="font-medium mb-2 flex items-center gap-2"><Calendar className="w-4 h-4" />Today timeline</div>
        <div className="relative w-full h-6 rounded-lg bg-muted overflow-hidden">
          {/* Prayer overlays */}
          {prayerWindows?.map((p, idx) => (
            <div key={idx} className="absolute top-0 bottom-0 bg-orange-300/30" style={rangeToPercent(p.start, p.end)} title={p.name} />
          ))}
          {/* Busy items */}
          {items.map((it, idx) => (
            <div key={idx} className="absolute top-0 bottom-0 bg-foreground/30" style={rangeToPercent(it.start, it.end)} title={it.title} />
          ))}
          {/* Now line */}
          <div className="absolute top-0 bottom-0 w-0.5 bg-emerald-500" style={timeToLeft(now)} />
        </div>
        <MicroLabels source="Calendar" lastSync="just now" />
      </CardContent>
    </Card>
  );
}

// Helpers to map HH:MM to percentage width/left in a 24h bar
function hmToMinutes(hm: string) {
  const [h, m] = hm.split(":").map(Number);
  return h * 60 + (m || 0);
}
function rangeToPercent(start: string, end: string) {
  const s = hmToMinutes(start), e = hmToMinutes(end);
  const left = (s / (24*60)) * 100; const right = (e / (24*60)) * 100;
  return { left: `${left}%`, width: `${Math.max(0, right - left)}%` } as React.CSSProperties;
}
function timeToLeft(hm: string) {
  const left = (hmToMinutes(hm) / (24*60)) * 100;
  return { left: `${left}%` } as React.CSSProperties;
}

// -----------------------------
// Inline Permissions (inside Today)
// -----------------------------
function PermissionsInline({ missing }: { missing: Array<{ key: string; label: string; icon?: React.ReactNode }> }) {
  if (!missing?.length) return null;
  return (
    <Card className="backdrop-blur-md bg-card/50 border-border/50 shadow-lg hover:shadow-xl transition-all">
      <CardContent className="p-5 flex flex-col sm:flex-row items-start sm:items-center gap-4">
        <div className="flex items-center gap-3 flex-1">
          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-primary/10 border border-primary/20">
            <Info className="w-5 h-5 text-primary" />
          </div>
          <div>
            <div className="text-sm font-semibold">تفعيل المصادر</div>
            <div className="text-xs text-muted-foreground mt-0.5">قم بتفعيل المصادر للحصول على التجربة الكاملة</div>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {missing.map(s => (
            <Button 
              key={s.key} 
              size="sm" 
              variant="glass" 
              className="rounded-2xl inline-flex items-center gap-2 hover:scale-105 transition-all"
            >
              {s.icon}
              <span>{s.label}</span>
            </Button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// -----------------------------
// Default Export — Page Composition
// -----------------------------
export default function TodayWHOOP() {
  const ff = useFlags();
  const { fetchConflicts, resolveConflict } = useEdgeActions();
  const { user } = useUser();

  // حالة التقرير - نفس منطق `/today`
  const [report, setReport] = useState<any | null>(null);
  const [reportLoading, setReportLoading] = useState(false);

  // تحميل التقرير
  async function fetchReport() {
    if (!user) return;
    setReportLoading(true);
    try {
      const dateStr = new Date().toISOString().slice(0, 10);
      const { data, error } = await supabase.functions.invoke('report-daily', {
        body: { 
          start: dateStr,
          end: dateStr
        }
      });
      if (error) throw error;
      setReport(data?.items?.[0] ?? null);
    } catch (e) {
      setReport(null);
    } finally {
      setReportLoading(false);
    }
  }

  useEffect(() => {
    if (user) {
      fetchReport();
    }
  }, [user?.id]);

  // حالة التعارضات
  const [conflict, setConflict] = useState<{
    title: string;
    window: string;
    prayer?: string;
    severity: "high" | "mid" | "low";
    eventId?: string;
  } | undefined>(undefined);

  const [loading, setLoading] = useState(false);

  // Health mock data
  const [healthData] = useState({
    sleep: 85,
    strain: 12.5,
    recovery: 78
  });

  const refreshConflicts = async () => {
    const today = format(new Date(), "yyyy-MM-dd");
    setLoading(true);
    try {
      const data = await fetchConflicts(today);
      const top = data.conflicts?.[0];
      setConflict(
        top
          ? {
              title: top.event?.title ?? top.prayer?.name ?? "busy",
              window: `${top.window.start}–${top.window.end}`,
              prayer: top.prayer?.name,
              severity: top.severity,
              eventId: top.event?.id,
            }
          : undefined
      );
    } catch (e) {
      console.warn("conflict refresh failed", e);
    } finally {
      setLoading(false);
    }
  };

  const onShift30 = async () => {
    if (!conflict) return;
    try {
      await resolveConflict({
        decision: "shift",
        event_id: conflict.eventId,
        by: "30m",
      });
      await refreshConflicts();
    } catch (e) {
      console.error("shift failed", e);
    }
  };

  const onNotify = async () => {
    if (!conflict) return;
    try {
      await resolveConflict({
        decision: "notify_attendees",
        event_id: conflict.eventId,
      });
    } catch (e) {
      console.error("notify failed", e);
    }
  };

  const onIgnore = async () => {
    if (!conflict) return;
    try {
      await resolveConflict({
        decision: "ignore_today",
        event_id: conflict.eventId,
      });
      await refreshConflicts();
    } catch (e) {
      console.error("ignore failed", e);
    }
  };

  // Mock state (اربطها بالبيانات الحقيقية عند الربط)
  const now = { title: "Deep Work", until: "12:30" };
  const next = { title: "Sales Review", at: "13:45" };
  const net = -127.50;
  const items = [
    { start: "10:00", end: "12:30", title: "Deep Work" },
    { start: "13:00", end: "13:25", title: "Client Call" },
    { start: "17:30", end: "18:15", title: "MMA" },
  ];
  const prayers = [
    { start: "05:25", end: "05:40", name: "Fajr" },
    { start: "12:55", end: "13:25", name: "Dhuhr" },
    { start: "15:20", end: "15:35", name: "Asr" },
    { start: "17:38", end: "17:53", name: "Maghrib" },
    { start: "19:08", end: "19:23", name: "Isha" },
  ];
  const missingPerms = [
    { key: "health", label: "Health", icon: <Loader2 className="w-3 h-3" /> },
    { key: "calendar", label: "Calendar", icon: <Calendar className="w-3 h-3" /> },
    { key: "notifications", label: "Notifications", icon: <Bell className="w-3 h-3" /> },
    { key: "location", label: "Location", icon: <MapPin className="w-3 h-3" /> },
  ];

  // إعداد نافذة التقويم (اليوم + غداً)
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const startISO = today.toISOString();
  const endISO = tomorrow.toISOString();
  
  const { data: calendarData, loading: calLoading } = useCalendarInstances(startISO, endISO);

  return (
    <main className="min-h-dvh flex flex-col bg-background">
      <section className="flex-1 overflow-y-auto overscroll-contain pb-20">
        <div className="mx-auto max-w-3xl flex flex-col gap-3 p-3">
      {/* المكونات الجديدة - WHOOP Style في الأعلى */}
      
      {/* Natural Language Input */}
      {ff.ff_calendar_nlp && (
        <Card className="backdrop-blur-md bg-card/50 border-border/50 shadow-lg">
          <CardContent className="p-4">
            <div className="font-medium mb-3 flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              <span>إضافة موعد سريع</span>
            </div>
            <NaturalInput onEventCreated={() => {
              // إعادة تحميل التقويم
            }} />
          </CardContent>
        </Card>
      )}
      
      {/* Now / Next Strip */}
      {ff.ff_now_next_strip && <NowNextStrip now={now} next={next} />}

      {/* Conflicts on top */}
      {ff.ff_conflicts_first && conflict && (
        <Card
          className={`backdrop-blur-md bg-background/60 border ${
            conflict.severity === "high"
              ? "border-red-500/50"
              : conflict.severity === "mid"
              ? "border-amber-500/50"
              : "border-foreground/10"
          }`}
        >
          <CardContent className="p-4 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-red-500" />
                <div className="font-medium">Conflict detected</div>
              </div>
              <Badge variant="secondary">{conflict.prayer ?? "window"}</Badge>
            </div>
            <div className="text-sm text-muted-foreground">
              <b>{conflict.title ?? "—"}</b> — {conflict.window ?? "—"}
            </div>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                className="rounded-2xl"
                onClick={onShift30}
                disabled={loading}
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Shift +30m"}
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="rounded-2xl"
                onClick={onNotify}
                disabled={loading}
              >
                Notify
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="rounded-2xl"
                onClick={onIgnore}
                disabled={loading}
              >
                Ignore today
              </Button>
            </div>
            <MicroLabels source="conflict-check" confidence="high" lastSync="updated now" />
          </CardContent>
        </Card>
      )}

      {/* Health Rings - WHOOP Style */}
      {ff.ff_health_rings && <HealthRings sleep={healthData.sleep} strain={healthData.strain} recovery={healthData.recovery} />}

      {/* Calendar Instances Summary */}
      {ff.ff_calendar_instances && !calLoading && (
        <Card className="backdrop-blur-md bg-card/50 border-border/50 shadow-lg">
          <CardContent className="p-4">
            <div className="font-medium mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                <span>مواعيد اليوم</span>
              </div>
              <Badge variant="secondary">{calendarData.instances.length}</Badge>
            </div>
            <div className="space-y-2">
              {calendarData.instances.slice(0, 3).map((inst) => (
                <div key={inst.event_id} className="text-sm flex items-center justify-between p-2 rounded-lg bg-background/40">
                  <div className="flex items-center gap-2">
                    <Clock className="w-3 h-3 text-muted-foreground" />
                    <span>{new Date(inst.instance_start).toLocaleTimeString('ar', { hour: '2-digit', minute: '2-digit' })}</span>
                    <span className="font-medium">{inst.title}</span>
                    {inst.is_draft && <Badge variant="outline" className="text-xs">مسودة</Badge>}
                  </div>
                  {inst.location && <MapPin className="w-3 h-3 text-muted-foreground" />}
                </div>
              ))}
              {calendarData.instances.length > 3 && (
                <div className="text-xs text-muted-foreground text-center pt-2">
                  +{calendarData.instances.length - 3} موعد آخر
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Timeline with prayer overlay */}
      {ff.ff_timeline_inline && <TimelineInline items={items} now={"12:05"} prayerWindows={prayers} />}

      {/* Permissions Inline */}
      {ff.ff_permissions_inline && <PermissionsInline missing={missingPerms} />}

      {/* Health placeholder */}
      {ff.ff_micro_labels && (
        <Card className="backdrop-blur-md bg-card/50 border-border/50 shadow-lg">
          <CardContent className="p-4">
            <div className="font-medium mb-2">معدل ضربات القلب والنشاط</div>
            <div className="text-sm text-muted-foreground mb-3">تتبع نشاطك اليومي ومعدل ضربات قلبك</div>
            <MicroLabels source="Health Sensors" confidence="mid" lastSync="منذ دقيقتين" />
          </CardContent>
        </Card>
      )}

      {/* المكونات القديمة - Legacy في الأسفل */}
      <div className="border-t border-border pt-6 mt-6">
        <h3 className="text-lg font-bold mb-4">المالية والنشاطات</h3>
        <LegacyToday report={report} loading={reportLoading} />
      </div>
        </div>
      </section>
    </main>
  );
}

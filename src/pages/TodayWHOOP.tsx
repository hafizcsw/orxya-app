import React, { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Bell, Calendar, Check, Clock, DollarSign, Info, Loader2, MapPin, RefreshCcw } from "lucide-react";
import { useEdgeActions } from "@/hooks/useEdgeActions";
import { format } from "date-fns";
import { generateMockFinancialEvents, calculateDailySummary } from "@/lib/financial-mock";
import { MoneyPulseCard } from "@/components/financial/MoneyPulseCard";

/**
 * TodayWHOOP v2.1 — UI Delta (non-destructive)
 * -------------------------------------------------
 * Drop-in component يُبنى فوق Today الحالي بدون هدم.
 * كل ميزة خلف Feature Flags ويمكن تعطيلها فورًا.
 *
 * Flags (قراءة من query/localStorage):
 *   ff_conflicts_first, ff_now_next_strip, ff_timeline_inline,
 *   ff_money_pulse, ff_micro_labels, ff_permissions_inline
 *
 * ملاحظات:
 * - البيانات هنا Mock/Props. اربط مصادر الحقيقة في مرحلة الربط.
 * - التزم بأسلوب WHOOP (حلقات/بطاقات نظيفة + زر فعل واحد لكل سياق).
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
      ff_money_pulse: true,
      ff_micro_labels: true,
      ff_permissions_inline: true,
      ff_financial_notifications: true,
      ff_ondevice_parser: true,
      ff_fin_push: false,
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

// Money Pulse moved to MoneyPulseCard component (Epic 5)

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
    <Card className="bg-background/60 border">
      <CardContent className="p-4 flex items-center gap-3">
        <Info className="w-4 h-4" />
        <div className="text-sm grow">Enable sources to unlock full experience</div>
        <div className="flex items-center gap-2">
          {missing.map(s => (
            <Button key={s.key} size="sm" variant="outline" className="rounded-2xl inline-flex items-center gap-1">
              {s.icon}{s.label}
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

  // حالة التعارضات
  const [conflict, setConflict] = useState<{
    title: string;
    window: string;
    prayer?: string;
    severity: "high" | "mid" | "low";
    eventId?: string;
  } | undefined>(undefined);

  const [loading, setLoading] = useState(false);

  // Financial state (Epic 5)
  const [financialEvents, setFinancialEvents] = useState(() => 
    generateMockFinancialEvents(new Date().toISOString().split('T')[0])
  );
  const financialSummary = React.useMemo(() => 
    calculateDailySummary(financialEvents), 
    [financialEvents]
  );

  // تحميل التعارضات الحقيقية عند تفعيل ff_conflicts_first
  useEffect(() => {
    if (!ff.ff_conflicts_first) return;
    const today = format(new Date(), "yyyy-MM-dd");
    const go = async () => {
      setLoading(true);
      try {
        const data = await fetchConflicts(today);
        const top = data.conflicts?.[0];
        if (top) {
          setConflict({
            title: top.event?.title ?? top.prayer?.name ?? "busy",
            window: `${top.window.start}–${top.window.end}`,
            prayer: top.prayer?.name,
            severity: top.severity,
            eventId: top.event?.id,
          });
        }
      } catch (e) {
        console.warn("conflict-check failed", e);
      } finally {
        setLoading(false);
      }
    };
    go();
  }, [ff.ff_conflicts_first, fetchConflicts]);

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

  // Financial handlers (Epic 5)
  const handleFinancialConfirm = (eventId: number) => {
    setFinancialEvents(prev => 
      prev.map(e => e.id === eventId ? { ...e, confirmed: true, confidence: 100 } : e)
    );
  };

  const handleFinancialCorrect = (
    eventId: number, 
    amount: number, 
    direction: 1 | -1, 
    merchant?: string
  ) => {
    setFinancialEvents(prev => 
      prev.map(e => e.id === eventId 
        ? { ...e, amount, direction, merchant, confirmed: true, confidence: 100 }
        : e
      )
    );
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

  return (
    <div className="mx-auto max-w-3xl flex flex-col gap-3 p-3">
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

      {/* Loading state when no conflict yet */}
      {ff.ff_conflicts_first && !conflict && loading && (
        <Card className="backdrop-blur-md bg-background/60 border">
          <CardContent className="p-4 flex items-center justify-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span className="text-sm text-muted-foreground">جاري التحقق من التعارضات...</span>
          </CardContent>
        </Card>
      )}

      {/* Money Pulse (Epic 5) */}
      {ff.ff_money_pulse && ff.ff_financial_notifications && (
        <MoneyPulseCard 
          summary={financialSummary}
          onConfirm={handleFinancialConfirm}
          onCorrect={handleFinancialCorrect}
        />
      )}

      {/* Timeline with prayer overlay */}
      {ff.ff_timeline_inline && <TimelineInline items={items} now={"12:05"} prayerWindows={prayers} />}

      {/* Permissions Inline */}
      {ff.ff_permissions_inline && <PermissionsInline missing={missingPerms} />}

      {/* Example micro labels on a generic card */}
      {ff.ff_micro_labels && (
        <Card className="bg-background/60 border">
          <CardContent className="p-4">
            <div className="font-medium">Focus / Strain / Sleep Rings (placeholder)</div>
            <MicroLabels source="Health" confidence="mid" lastSync="2m ago" />
          </CardContent>
        </Card>
      )}
    </div>
  );
}

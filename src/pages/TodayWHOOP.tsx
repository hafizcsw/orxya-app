import React, { useEffect, useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Bell, Calendar, Check, Clock, DollarSign, Info, Loader2, MapPin, RefreshCcw } from "lucide-react";

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
// Money Pulse (Net Today)
// -----------------------------
function MoneyPulseCard({ net, currency, confidence }: { net: number; currency: string; confidence: "low"|"mid"|"high" }) {
  const color = net > 0 ? "text-emerald-500" : net < 0 ? "text-red-500" : "text-foreground";
  return (
    <Card className="bg-background/60 backdrop-blur-md border">
      <CardContent className="p-4 flex flex-col gap-2">
        <div className="flex items-center gap-2"><DollarSign className="w-4 h-4" /><div className="font-medium">Money Pulse</div></div>
        <div className={`text-2xl font-semibold ${color}`}>{net.toFixed(2)} {currency}</div>
        <div className="flex items-center gap-2">
          <Button size="sm" className="rounded-2xl"><Check className="w-4 h-4 mr-1" />Confirm</Button>
          <Button size="sm" variant="outline" className="rounded-2xl">Correct</Button>
        </div>
        <MicroLabels source="Notifications" confidence={confidence} lastSync="3m ago" />
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

  // Mock state (اربطها بالبيانات الحقيقية عند الربط)
  const conflict = { title: "Client Call", window: "13:00–13:25", prayer: "Dhuhr", severity: "high" as const };
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
      {ff.ff_conflicts_first && <ConflictQuickSolveCard conflict={conflict} />}

      {/* Money Pulse */}
      {ff.ff_money_pulse && <MoneyPulseCard net={net} currency="AED" confidence="mid" />}

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

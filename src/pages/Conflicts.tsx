import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useUser } from "@/lib/auth";
import { track } from "@/lib/telemetry";
import { throttle } from "@/lib/throttle";
import { Protected } from "@/components/Protected";
import { ActionButton } from "@/components/ui/ActionButton";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Loader2, AlertTriangle, CheckCircle, XCircle, RotateCcw, Filter, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

type ConflictStatus = "open" | "suggested" | "auto_applied" | "resolved" | "undone";

type Conflict = {
  id: string;
  owner_id: string;
  event_id: string | null;
  object_kind: string;
  prayer_name: string;
  status: ConflictStatus;
  severity: string;
  suggested_change?: any;
  suggestion?: any;
  created_at: string;
  decided_at?: string | null;
  decided_action?: string | null;
  resolution?: string | null;
};

type EventRow = {
  id: string;
  title: string | null;
  starts_at: string | null;
  ends_at: string | null;
};

export default function ConflictsPage() {
  const { user } = useUser();
  const [items, setItems] = useState<Conflict[]>([]);
  const [events, setEvents] = useState<Record<string, EventRow>>({});
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<ConflictStatus | "all">("open");
  const [severityFilter, setSeverityFilter] = useState<"all" | "low" | "medium" | "high">("all");
  const [prayerFilter, setPrayerFilter] = useState<string>("all");
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [busy, setBusy] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const { toast } = useToast();

  const reload = useMemo(
    () => throttle(async () => { if (user) await load(); }, 300),
    [user?.id, statusFilter, severityFilter, prayerFilter]
  );

  useEffect(() => { 
    if (user) {
      track('conflict_list_open');
      load();
    }
  }, [user?.id]);
  
  useEffect(() => { 
    if (user) reload(); 
  }, [statusFilter, severityFilter, prayerFilter]);

  async function load() {
    if (!user) return;
    setLoading(true);
    
    try {
      let q = supabase
        .from("conflicts")
        .select("*")
        .eq("owner_id", user.id)
        .order("created_at", { ascending: false })
        .limit(200);

      if (statusFilter !== "all") q = q.eq("status", statusFilter);
      if (severityFilter !== "all") q = q.eq("severity", severityFilter as "low" | "medium" | "high");
      if (prayerFilter !== "all") q = q.eq("prayer_name", prayerFilter);

      const { data, error } = await q;
      if (error) throw error;
      
      setItems((data ?? []) as Conflict[]);

      // Prefetch events
      const evIds = Array.from(new Set((data ?? []).map((c: any) => c.event_id).filter(Boolean)));
      if (evIds.length) {
        const { data: ev } = await supabase
          .from("events")
          .select("id, title, starts_at, ends_at")
          .in("id", evIds as string[]);
        
        const map: Record<string, EventRow> = {};
        (ev ?? []).forEach((e) => (map[e.id] = e as EventRow));
        setEvents(map);
      } else {
        setEvents({});
      }
    } catch (e: any) {
      toast({ 
        title: "تعذّر تحميل التعارضات", 
        variant: "destructive" 
      });
    } finally {
      setLoading(false);
    }
  }

  const visible = useMemo(() => items, [items]);
  const stats = useMemo(() => {
    return {
      total: items.length,
      open: items.filter(c => c.status === "open").length,
      resolved: items.filter(c => c.status === "resolved").length,
      critical: items.filter(c => c.severity === "critical").length,
    };
  }, [items]);

  const allSelected = useMemo(() =>
    visible.length > 0 && visible.every(c => selected[c.id]), 
    [visible, selected]
  );

  const toggleAll = () => {
    const m: Record<string, boolean> = {};
    if (!allSelected) visible.forEach(c => (m[c.id] = true));
    setSelected(m);
  };

  function fmt(dt?: string | null) {
    if (!dt) return "—";
    try {
      const d = new Date(dt);
      return d.toLocaleString("ar-EG", { 
        month: "short", 
        day: "numeric", 
        hour: "2-digit", 
        minute: "2-digit" 
      });
    } catch {
      return dt;
    }
  }

  function getSuggestionText(c: Conflict) {
    const sug = c.suggested_change ?? c.suggestion ?? {};
    const patch = sug.patch ?? {};
    
    if (sug.action === "move_event" && sug.shift_minutes) {
      return `تحريك الحدث بمقدار ${Math.abs(sug.shift_minutes)} دقيقة`;
    }
    if (sug.action === "shorten_event") {
      return `تقصير الحدث → ${fmt(sug.new_start)} - ${fmt(sug.new_end)}`;
    }
    if (sug.action === "cancel_event") {
      return "إلغاء الحدث";
    }
    if (patch.shift_minutes) {
      return `تأخير ${Math.abs(patch.shift_minutes)} دقيقة`;
    }
    if (patch.transparency === "transparent") {
      return "جعل الحدث شفافًا (Free)";
    }
    if (patch.status === "tentative") {
      return "وضع الحدث كمؤقت";
    }
    
    return sug.reasoning ?? sug.reason ?? "لا توجد تفاصيل";
  }

  async function requestAISuggestion(conflictId: string) {
    setBusy(true);
    try {
      const { data, error } = await supabase.functions.invoke('ai-conflicts', {
        body: { conflict_id: conflictId }
      });

      if (error || !data?.ok) {
        throw error ?? new Error('AI request failed');
      }

      track('conflict_ai_request', { 
        conflict_id: conflictId,
        action: data.suggestion?.action,
        confidence: data.suggestion?.confidence
      });
      
      toast({ title: 'تم إنشاء اقتراح ذكي بنجاح ✨' });
      await load();
    } catch (e: any) {
      console.error('AI suggestion error:', e);
      toast({ 
        title: 'تعذّر توليد الاقتراح الذكي',
        variant: 'destructive'
      });
      track('conflict_ai_error', { conflict_id: conflictId, error: String(e) });
    } finally {
      setBusy(false);
    }
  }

  async function act(command: "apply" | "ignore" | "reopen" | "undo", ids: string[]) {
    if (!ids.length) return;
    setBusy(true);

    // Optimistic UI
    const snapshot = [...items];
    const newStatus: ConflictStatus = 
      command === "apply" ? "resolved" :
      command === "ignore" ? "resolved" :
      "open";

    setItems(prev =>
      prev.map(c =>
        ids.includes(c.id)
          ? { ...c, status: newStatus, decided_action: command }
          : c
      )
    );

    try {
      const { data, error } = await supabase.functions.invoke("conflicts", {
        body: { command, ids },
      });

      if (error || !data?.ok) throw error ?? new Error("fn_failed");

      track("conflict_action", { command, count: ids.length });
      setSelected({});
      toast({ 
        title: `تم ${command === "apply" ? "التطبيق" : command === "ignore" ? "التجاهل" : "التحديث"} بنجاح` 
      });
      
      await load();
    } catch (e: any) {
      // Rollback on error
      setItems(snapshot);
      toast({ 
        title: "تعذّر التنفيذ — تمت الاستعادة",
        variant: "destructive"
      });
    } finally {
      setBusy(false);
    }
  }

  const selectedIds = Object.keys(selected).filter(id => selected[id]);

  return (
    <Protected>
      <div className="p-6 max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
              صندوق التعارضات
            </h1>
            <p className="text-sm text-muted-foreground mt-1">إدارة التعارضات بين الأحداث وأوقات الصلاة</p>
          </div>
          
          <Button
            onClick={() => setShowFilters(!showFilters)}
            variant={showFilters ? "secondary" : "ghost"}
            size="sm"
          >
            <Filter className="w-4 h-4" />
            فلاتر
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="card p-4">
            <div className="text-xs text-muted-foreground mb-1">إجمالي</div>
            <div className="text-2xl font-bold">{stats.total}</div>
          </div>
          <div className="card p-4 border-warning/30">
            <div className="text-xs text-muted-foreground mb-1">مفتوحة</div>
            <div className="text-2xl font-bold text-warning">{stats.open}</div>
          </div>
          <div className="card p-4 border-success/30">
            <div className="text-xs text-muted-foreground mb-1">محلولة</div>
            <div className="text-2xl font-bold text-success">{stats.resolved}</div>
          </div>
          <div className="card p-4 border-destructive/30">
            <div className="text-xs text-muted-foreground mb-1">حرجة</div>
            <div className="text-2xl font-bold text-destructive">{stats.critical}</div>
          </div>
        </div>

        {/* Filters Panel */}
        {showFilters && (
          <div className="card-glass p-4 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="text-sm text-muted-foreground mb-2 block">الحالة</label>
                <select
                  value={statusFilter}
                  onChange={e => setStatusFilter(e.target.value as any)}
                  className="input w-full"
                >
                  <option value="all">كل الحالات</option>
                  <option value="open">مفتوحة</option>
                  <option value="suggested">مقترحة</option>
                  <option value="auto_applied">مطبقة تلقائيًا</option>
                  <option value="resolved">محلولة</option>
                  <option value="undone">ملغية</option>
                </select>
              </div>

              <div>
                <label className="text-sm text-muted-foreground mb-2 block">الخطورة</label>
                <select
                  value={severityFilter}
                  onChange={e => setSeverityFilter(e.target.value as "all" | "low" | "medium" | "high")}
                  className="input w-full"
                >
                  <option value="all">كل المستويات</option>
                  <option value="high">عالية</option>
                  <option value="medium">متوسطة</option>
                  <option value="low">منخفضة</option>
                </select>
              </div>

              <div>
                <label className="text-sm text-muted-foreground mb-2 block">الصلاة</label>
                <select
                  value={prayerFilter}
                  onChange={e => setPrayerFilter(e.target.value)}
                  className="input w-full"
                >
                  <option value="all">كل الصلوات</option>
                  <option value="fajr">الفجر</option>
                  <option value="dhuhr">الظهر</option>
                  <option value="asr">العصر</option>
                  <option value="maghrib">المغرب</option>
                  <option value="isha">العشاء</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setStatusFilter("all");
                  setSeverityFilter("all");
                  setPrayerFilter("all");
                }}
              >
                مسح الفلاتر
              </Button>
            </div>
          </div>
        )}

        {/* Bulk Actions Bar */}
        {selectedIds.length > 0 && (
          <div className="card-glass p-4 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <span className="text-sm font-medium">{selectedIds.length} محدد</span>
              <div className="h-4 w-px bg-border" />
              <ActionButton
                onClick={() => act("apply", selectedIds)}
                disabled={busy}
                loadingText="جار التطبيق..."
                variant="default"
                size="sm"
                icon={<CheckCircle className="w-4 h-4" />}
              >
                تطبيق
              </ActionButton>
              <ActionButton
                onClick={() => act("ignore", selectedIds)}
                disabled={busy}
                loadingText="جار التجاهل..."
                variant="ghost"
                size="sm"
                icon={<XCircle className="w-4 h-4" />}
              >
                تجاهل
              </ActionButton>
              <ActionButton
                onClick={() => act("undo", selectedIds)}
                disabled={busy}
                loadingText="جار التراجع..."
                variant="ghost"
                size="sm"
                icon={<RotateCcw className="w-4 h-4" />}
              >
                تراجع
              </ActionButton>
            </div>
            <Button
              onClick={() => setSelected({})}
              variant="ghost"
              size="sm"
            >
              إلغاء التحديد
            </Button>
          </div>
        )}

        {/* Select All Checkbox */}
        {visible.length > 0 && (
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input
              type="checkbox"
              checked={allSelected}
              onChange={toggleAll}
              className="w-4 h-4 rounded border-input"
            />
            تحديد الكل
          </label>
        )}

        {/* Conflicts List */}
        {loading ? (
          <div className="card-glass p-12 text-center">
            <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" />
            <p className="mt-4 text-sm text-muted-foreground">جار التحميل...</p>
          </div>
        ) : visible.length === 0 ? (
          <div className="card-glass p-12 text-center">
            <CheckCircle className="w-16 h-16 mx-auto text-success/50" />
            <p className="mt-4 text-lg font-medium">لا توجد تعارضات</p>
            <p className="text-sm text-muted-foreground">لا توجد تعارضات مطابقة للفلاتر الحالية</p>
          </div>
        ) : (
          <div className="space-y-3">
            {visible.map(c => {
              const ev = c.event_id ? events[c.event_id] : undefined;
              return (
                <div
                  key={c.id}
                  className={cn(
                    "card group p-5 flex items-start gap-4 transition-all",
                    selected[c.id] && "ring-2 ring-primary"
                  )}
                >
                  <input
                    type="checkbox"
                    checked={!!selected[c.id]}
                    onChange={e => setSelected(s => ({ ...s, [c.id]: e.target.checked }))}
                    className="mt-1 w-4 h-4 rounded border-input"
                  />

                  <div className="flex-1 space-y-3">
                    {/* Header */}
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className={cn(
                            "px-2 py-0.5 rounded text-xs font-medium",
                            c.status === "open" && "bg-warning/10 text-warning",
                            c.status === "suggested" && "bg-info/10 text-info",
                            c.status === "auto_applied" && "bg-primary/10 text-primary",
                            c.status === "resolved" && "bg-success/10 text-success",
                            c.status === "undone" && "bg-muted text-muted-foreground"
                          )}>
                            {c.status === "open" ? "مفتوح" :
                             c.status === "suggested" ? "مقترح" :
                             c.status === "auto_applied" ? "مطبق تلقائيًا" :
                             c.status === "resolved" ? "محلول" : "ملغي"}
                          </span>
                          
                          <span className={cn(
                            "px-2 py-0.5 rounded text-xs font-medium",
                            c.severity === "critical" && "bg-destructive/10 text-destructive",
                            c.severity === "high" && "bg-warning/10 text-warning",
                            c.severity === "medium" && "bg-info/10 text-info",
                            c.severity === "low" && "bg-muted text-muted-foreground"
                          )}>
                            {c.severity === "critical" ? "حرج" :
                             c.severity === "high" ? "عالي" :
                             c.severity === "medium" ? "متوسط" : "منخفض"}
                          </span>

                          <span className="px-2 py-0.5 rounded text-xs bg-primary/10 text-primary font-medium">
                            🕌 {c.prayer_name}
                          </span>
                        </div>

                        <h3 className="font-semibold text-lg">
                          {ev?.title ?? "—"}
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          {fmt(ev?.starts_at)} → {fmt(ev?.ends_at)}
                        </p>
                      </div>

                      <div className="text-xs text-muted-foreground">
                        {fmt(c.created_at)}
                      </div>
                    </div>

                    {/* Suggestion */}
                    {(c.suggested_change || c.suggestion) ? (
                      <div className="rounded-lg bg-gradient-to-r from-primary/5 to-transparent border border-primary/20 p-3 text-sm">
                        <div className="flex items-start gap-2">
                          <AlertTriangle className="w-4 h-4 text-primary mt-0.5" />
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-medium">الاقتراح الذكي:</span>
                              {(c.suggested_change?.confidence || c.suggestion?.confidence) && (
                                <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                                  ثقة: {Math.round((c.suggested_change?.confidence || c.suggestion?.confidence || 0) * 100)}%
                                </span>
                              )}
                            </div>
                            <div className="mb-2">{getSuggestionText(c)}</div>
                            {(c.suggested_change?.reasoning || c.suggestion?.reasoning) && (
                              <div className="text-xs text-muted-foreground">
                                💡 {c.suggested_change?.reasoning || c.suggestion?.reasoning}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="rounded-lg bg-muted/30 p-3 text-sm text-center">
                        <span className="text-muted-foreground">لا يوجد اقتراح بعد</span>
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex items-center gap-2 pt-2 flex-wrap">
                      {c.status === "open" || c.status === "suggested" ? (
                        <>
                          {!c.suggested_change && !c.suggestion && (
                            <ActionButton
                              onClick={() => requestAISuggestion(c.id)}
                              disabled={busy}
                              loadingText="جار التحليل..."
                              variant="ghost"
                              size="sm"
                              icon={<Sparkles className="w-4 h-4" />}
                            >
                              اقترح حلًا (AI)
                            </ActionButton>
                          )}
                          <ActionButton
                            onClick={() => act("apply", [c.id])}
                            disabled={busy}
                            loadingText="جار التطبيق..."
                            variant="default"
                            size="sm"
                            icon={<CheckCircle className="w-4 h-4" />}
                          >
                            تطبيق
                          </ActionButton>
                          <ActionButton
                            onClick={() => act("ignore", [c.id])}
                            disabled={busy}
                            loadingText="جار التجاهل..."
                            variant="ghost"
                            size="sm"
                            icon={<XCircle className="w-4 h-4" />}
                          >
                            تجاهل
                          </ActionButton>
                        </>
                      ) : (
                        <>
                          <ActionButton
                            onClick={() => act("reopen", [c.id])}
                            disabled={busy}
                            loadingText="جار إعادة الفتح..."
                            variant="ghost"
                            size="sm"
                          >
                            إعادة فتح
                          </ActionButton>
                          <ActionButton
                            onClick={() => act("undo", [c.id])}
                            disabled={busy}
                            loadingText="جار التراجع..."
                            variant="ghost"
                            size="sm"
                            icon={<RotateCcw className="w-4 h-4" />}
                          >
                            تراجع
                          </ActionButton>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

      </div>
    </Protected>
  );
}

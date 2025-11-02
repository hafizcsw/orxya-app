import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useUser } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

type Conflict = {
  id: string;
  date_iso: string;
  prayer_name: string;
  prayer_time: string;
  event_id: string;
  overlap_min: number;
  severity: "low" | "medium" | "high";
  status: "open" | "proposed" | "resolved" | "snoozed" | "ignored";
  suggestion: any;
};

type Event = {
  id: string;
  title: string;
  starts_at: string;
  ends_at: string;
  external_source: string | null;
};

export default function Conflicts() {
  const { user } = useUser();
  const [conflicts, setConflicts] = useState<(Conflict & { event: Event })[]>([]);
  const [loading, setLoading] = useState(false);

  async function load() {
    if (!user) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("conflicts")
        .select("*")
        .in("status", ["open", "proposed", "snoozed"])
        .order("date_iso", { ascending: true })
        .order("prayer_time", { ascending: true });

      if (error) throw error;

      const conflictsWithEvents = await Promise.all(
        (data || []).map(async (c) => {
          const { data: event } = await supabase
            .from("events")
            .select("id,title,starts_at,ends_at,external_source")
            .eq("id", c.event_id)
            .maybeSingle();

          return { ...c, event: event || { id: c.event_id, title: "(محذوف)", starts_at: "", ends_at: "", external_source: null } };
        })
      );

      setConflicts(conflictsWithEvents as any);
    } catch (e: any) {
      toast.error("فشل تحميل التعارضات: " + e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [user?.id]);

  async function handleAction(id: string, action: "accept" | "ignore" | "snooze") {
    try {
      const body: any = { id, action };
      if (action === "snooze") {
        body.snooze_until = new Date(Date.now() + 30 * 60000).toISOString();
      }

      const { data, error } = await supabase.functions.invoke("conflict-resolve", { body });

      if (error || !data?.ok) {
        throw new Error(data?.error || "فشل تنفيذ الإجراء");
      }

      toast.success("تم التنفيذ بنجاح");
      await load();
    } catch (e: any) {
      toast.error(e.message);
    }
  }

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "high":
        return "destructive";
      case "medium":
        return "default";
      default:
        return "secondary";
    }
  };

  const getPrayerNameAr = (name: string) => {
    const map: Record<string, string> = {
      fajr: "الفجر",
      dhuhr: "الظهر",
      asr: "العصر",
      maghrib: "المغرب",
      isha: "العشاء",
    };
    return map[name] || name;
  };

  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-muted-foreground">يرجى تسجيل الدخول</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">تعارضات الصلاة</h1>
        <Button onClick={load} disabled={loading} variant="outline">
          {loading ? "جاري التحميل..." : "تحديث"}
        </Button>
      </div>

      {loading && conflicts.length === 0 ? (
        <div className="text-center text-muted-foreground py-12">جاري التحميل...</div>
      ) : conflicts.length === 0 ? (
        <Card className="p-12 text-center">
          <p className="text-lg text-muted-foreground">
            ✨ لا توجد تعارضات مفتوحة
          </p>
        </Card>
      ) : (
        <div className="space-y-4">
          {conflicts.map((c) => (
            <Card key={c.id} className="p-6 space-y-4">
              <div className="flex items-start justify-between">
                <div className="space-y-2 flex-1">
                  <div className="flex items-center gap-3">
                    <h3 className="text-lg font-semibold">{c.event.title}</h3>
                    <Badge variant={getSeverityColor(c.severity)}>
                      {c.severity === "high" ? "عالٍ" : c.severity === "medium" ? "متوسط" : "منخفض"}
                    </Badge>
                    {c.event.external_source === "google" && (
                      <Badge variant="outline">Google</Badge>
                    )}
                  </div>

                  <div className="text-sm text-muted-foreground space-y-1">
                    <p>
                      صلاة <strong>{getPrayerNameAr(c.prayer_name)}</strong> —{" "}
                      {new Date(c.prayer_time).toLocaleTimeString("ar", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                    <p>
                      التاريخ: {new Date(c.date_iso).toLocaleDateString("ar")}
                    </p>
                    <p>التداخل: {c.overlap_min} دقيقة</p>
                  </div>

                  {c.suggestion?.explanation && (
                    <div className="mt-3 p-3 bg-muted rounded-lg">
                      <p className="text-sm font-medium mb-2">💡 المقترح:</p>
                      <p className="text-sm text-muted-foreground">
                        {c.suggestion.explanation}
                      </p>

                      {c.suggestion.type === "delay_start" && c.suggestion.new_start && (
                        <p className="text-sm mt-2">
                          بداية جديدة:{" "}
                          {new Date(c.suggestion.new_start).toLocaleString("ar")}
                        </p>
                      )}

                      {c.suggestion.type === "truncate_end" && c.suggestion.new_end && (
                        <p className="text-sm mt-2">
                          نهاية جديدة:{" "}
                          {new Date(c.suggestion.new_end).toLocaleString("ar")}
                        </p>
                      )}

                      {c.suggestion.type === "split" &&
                        Array.isArray(c.suggestion.parts) && (
                          <div className="text-sm mt-2 space-y-1">
                            <p>
                              الجزء الأول:{" "}
                              {new Date(c.suggestion.parts[0].new_start).toLocaleTimeString("ar")} -{" "}
                              {new Date(c.suggestion.parts[0].new_end).toLocaleTimeString("ar")}
                            </p>
                            <p>
                              الجزء الثاني:{" "}
                              {new Date(c.suggestion.parts[1].new_start).toLocaleTimeString("ar")} -{" "}
                              {new Date(c.suggestion.parts[1].new_end).toLocaleTimeString("ar")}
                            </p>
                          </div>
                        )}
                    </div>
                  )}
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <Button
                  onClick={() => handleAction(c.id, "accept")}
                  size="sm"
                  variant="default"
                >
                  قبول المقترح
                </Button>
                <Button
                  onClick={() => handleAction(c.id, "snooze")}
                  size="sm"
                  variant="outline"
                >
                  تأجيل (30 دقيقة)
                </Button>
                <Button
                  onClick={() => handleAction(c.id, "ignore")}
                  size="sm"
                  variant="ghost"
                >
                  تجاهل
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

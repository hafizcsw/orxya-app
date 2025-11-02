import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";
import { track } from "@/lib/telemetry";
import { Button } from "./ui/button";
import { Card } from "./ui/card";

export function CalendarIntegration() {
  const [status, setStatus] = useState<"connected" | "disconnected" | "loading">("loading");
  const [err, setErr] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);

  async function load() {
    setErr(null);
    setStatus("loading");
    const { data, error } = await supabase
      .from("external_accounts")
      .select("provider, access_token_enc")
      .eq("provider", "google")
      .maybeSingle();
    
    if (error) {
      setErr(error.message);
      setStatus("disconnected");
      return;
    }
    
    setStatus(data?.access_token_enc ? "connected" : "disconnected");
  }

  useEffect(() => {
    load();
  }, []);

  async function connect() {
    setErr(null);
    track("gcal_connect_click");
    
    const r = await supabase.functions.invoke("calendar-auth-start", { body: {} });
    const u = (r.data?.url as string) ?? null;
    
    if (!u) {
      setErr("تعذر بدء المصادقة");
      return;
    }
    
    const wnd = window.open(u, "_blank", "width=600,height=700,noopener,noreferrer");
    
    // Poll for window close
    const poll = setInterval(() => {
      if (!wnd || wnd.closed) {
        clearInterval(poll);
        load();
      }
    }, 1000);
  }

  async function syncNow() {
    setErr(null);
    setSyncing(true);
    track("gcal_sync_click");
    
    const r = await supabase.functions.invoke("calendar-sync", { body: {} });
    setSyncing(false);
    
    if (!r.data?.ok) {
      setErr(r.data?.error ?? "فشل المزامنة");
    }
  }

  return (
    <Card className="p-6 space-y-4">
      <div>
        <h3 className="text-lg font-semibold">Google Calendar</h3>
        {status === "loading" ? (
          <p className="text-sm text-muted-foreground">جاري التحميل...</p>
        ) : status === "connected" ? (
          <p className="text-sm text-green-600">✅ متصل</p>
        ) : (
          <p className="text-sm text-muted-foreground">غير متصل</p>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        <Button onClick={connect} variant="outline" size="sm">
          {status === "connected" ? "إعادة الربط" : "ربط الحساب"}
        </Button>
        
        {status === "connected" && (
          <Button onClick={syncNow} variant="outline" size="sm" disabled={syncing}>
            {syncing ? "جاري المزامنة..." : "مزامنة الآن"}
          </Button>
        )}
        
        <Button onClick={load} variant="ghost" size="sm">
          تحديث الحالة
        </Button>
      </div>

      {err && (
        <p className="text-sm text-destructive">{err}</p>
      )}
      
      <p className="text-xs text-muted-foreground">
        الاستيراد فقط حالياً (read-only). بعد كل مزامنة يتم فحص تعارضات الصلاة تلقائياً.
      </p>
    </Card>
  );
}

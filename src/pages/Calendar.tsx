import { useEffect, useState } from "react";
import CalendarHeader from "@/components/calendar/CalendarHeader";
import MonthGrid from "@/components/calendar/MonthGrid";
import WeekView from "@/components/calendar/WeekView";
import { startOfMonth, endOfMonth, startOfWeek, endOfWeek, toISODate } from "@/lib/dates";
import { supabase } from "@/integrations/supabase/client";
import { aiAsk } from "@/lib/ai";
import LoadingButton from "@/components/ui/LoadingButton";
import Badge from "@/components/ui/Badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useUser } from "@/lib/auth";
import { useNotify } from "@/lib/notify-utils";

type DbEvent = { 
  id: string; 
  title: string; 
  starts_at: string; 
  ends_at: string; 
  owner_id: string; 
  source?: string 
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
  const notify = useNotify();
  const [mode, setMode] = useState<"month"|"week">("month");
  const [anchor, setAnchor] = useState(new Date());
  const [loading, setLoading] = useState(false);
  const [eventsByDate, setEventsByDate] = useState<Record<string, DbEvent[]>>({});
  const [prayersByDate, setPrayersByDate] = useState<Record<string, PT>>({});

  function periodRange() {
    if (mode==="month") return { from: startOfMonth(anchor), to: endOfMonth(anchor) };
    return { from: startOfWeek(anchor), to: endOfWeek(anchor) };
  }

  async function load() {
    if (!user) return;
    setLoading(true);
    try {
      const { from, to } = periodRange();
      const fromISO = toISODate(from);
      const toISO = toISODate(to);

      const ev = await supabase.from("events")
        .select("*")
        .eq("owner_id", user.id)
        .gte("starts_at", from.toISOString())
        .lte("ends_at", new Date(to.getTime()+24*60*60*1000-1).toISOString());
      
      const ebd: Record<string, DbEvent[]> = {};
      (ev.data ?? []).forEach((e: any) => {
        const key = toISODate(new Date(e.starts_at));
        (ebd[key] ||= []).push(e);
      });
      setEventsByDate(ebd);

      const pr = await supabase.from("prayer_times")
        .select("date_iso,fajr,dhuhr,asr,maghrib,isha")
        .eq("owner_id", user.id)
        .gte("date_iso", fromISO)
        .lte("date_iso", toISO);
      
      const pbd: Record<string, PT> = {};
      (pr.data ?? []).forEach((r: any) => { pbd[r.date_iso] = r; });
      setPrayersByDate(pbd);
    } finally {
      setLoading(false);
    }
  }

  useEffect(()=>{ load(); }, [user?.id, mode, anchor]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (["INPUT","TEXTAREA"].includes(document.activeElement?.tagName ?? "")) return;
      if (e.key==="ArrowRight") { 
        e.preventDefault(); 
        setAnchor(prev => new Date(prev.getFullYear(), prev.getMonth() + (mode==="month"?1:0), prev.getDate() + (mode==="week"?7:0))); 
      }
      if (e.key==="ArrowLeft")  { 
        e.preventDefault(); 
        setAnchor(prev => new Date(prev.getFullYear(), prev.getMonth() - (mode==="month"?1:0), prev.getDate() - (mode==="week"?7:0))); 
      }
      if (e.key==="t" || e.key==="T") { setAnchor(new Date()); }
      if (e.key==="s" || e.key==="S") { smartPlanWeek(); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [mode]);

  async function smartPlanWeek() {
    if (!user) return;
    notify.info("🤖 جاري التخطيط الذكي للأسبوع...");
    try {
      const tasks = await supabase.from("tasks")
        .select("id,title")
        .eq("owner_id", user.id)
        .in("status", ["todo","doing"])
        .is("due_date", null)
        .limit(50);

      const { from, to } = { from: startOfWeek(anchor), to: endOfWeek(anchor) };
      const prompt = `اقترح جدولة أسبوعية للمهام التالية ضمن ساعات العمل 9:00-18:00. أعِد JSON فقط بصيغة:
[{"task_id":"uuid","day":"YYYY-MM-DD","start":"HH:MM","end":"HH:MM"}]

الأسبوع: ${toISODate(from)} إلى ${toISODate(to)}
المهام: ${JSON.stringify((tasks.data ?? []).map(t => ({ id: t.id, title: t.title })))}`;

      const ai = await aiAsk(prompt);
      let plan: Array<{task_id:string; day:string; start:string; end:string}> = [];
      try { 
        const reply = ai.reply || "";
        const jsonMatch = reply.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
          plan = JSON.parse(jsonMatch[0]); 
        }
      } catch {}

      for (const p of plan) {
        const startISO = `${p.day}T${p.start}:00`;
        const endISO = `${p.day}T${p.end}:00`;
        const task = tasks.data?.find(t=>t.id===p.task_id);
        await supabase.from("events").insert({
          owner_id: user.id,
          title: `${task?.title ?? "Task"}`,
          starts_at: startISO,
          ends_at: endISO,
          source: "ai"
        });
      }
      notify.success("تم التخطيط الذكي ✅");
      await load();
    } catch {
      notify.error("تعذّر التخطيط الآن");
    }
  }

  return (
    <div className="p-4 space-y-3 max-w-[1400px] mx-auto">
      <CalendarHeader
        mode={mode}
        date={anchor}
        onPrev={()=> setAnchor(new Date(anchor.getFullYear(), anchor.getMonth() - (mode==="month"?1:0), anchor.getDate() - (mode==="week"?7:0)))}
        onNext={()=> setAnchor(new Date(anchor.getFullYear(), anchor.getMonth() + (mode==="month"?1:0), anchor.getDate() + (mode==="week"?7:0)))}
        onToday={()=> setAnchor(new Date())}
        onMode={setMode}
      />

      <div className="flex items-center gap-2 flex-wrap">
        <LoadingButton onClick={smartPlanWeek} className="border bg-background hover:bg-secondary">
          🤖 تخطيط الأسبوع (AI)
        </LoadingButton>
        <Badge tone="info">اختصارات: ←/→ ، T (اليوم) ، S (تخطيط)</Badge>
      </div>

      {loading ? (
        <div className="space-y-2">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-[60vh] w-full" />
        </div>
      ) : mode==="month" ? (
        <MonthGrid 
          anchor={anchor} 
          eventsByDate={eventsByDate} 
          onDayClick={(iso)=>{ notify.info(`اليوم: ${iso}`); }} 
        />
      ) : (
        <WeekView 
          anchor={anchor} 
          eventsByDate={eventsByDate} 
          prayersByDate={prayersByDate} 
          onEventClick={(id)=>{ notify.info(`حدث: ${id}`); }} 
        />
      )}
    </div>
  );
}

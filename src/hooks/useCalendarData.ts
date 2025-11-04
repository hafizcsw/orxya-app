import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { throttle } from "@/lib/throttle";

type Range = { from: string; to: string };
type CalEvent = any;

export function useCalendarData(range: Range) {
  const [loading, setLoading] = useState(false);
  const [eventsByDay, setEventsByDay] = useState<Record<string, CalEvent[]>>({});
  const [prayersByDay, setPrayersByDay] = useState<Record<string, any>>({});

  const reload = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { 
        setLoading(false); 
        return; 
      }

      // Events in range
      const { data: evs } = await supabase
        .from("events")
        .select("*")
        .eq("owner_id", user.id)
        .is("deleted_at", null)
        .gte("starts_at", range.from + "T00:00:00Z")
        .lte("ends_at", range.to + "T23:59:59Z")
        .order("starts_at", { ascending: true });

      const byDay: Record<string, CalEvent[]> = {};
      (evs ?? []).forEach((e: CalEvent) => {
        const d = e.starts_at.slice(0, 10);
        byDay[d] = byDay[d] ?? [];
        byDay[d].push(e);
      });
      setEventsByDay(byDay);

      // Prayers per day
      const days = Object.keys(byDay).length
        ? Object.keys(byDay)
        : datesBetween(range.from, range.to);
      
      const prayerMap: Record<string, any> = {};
      for (const d of days) {
        const { data } = await supabase
          .from("prayer_times")
          .select("fajr, dhuhr, asr, maghrib, isha")
          .eq("owner_id", user.id)
          .eq("date_iso", d)
          .maybeSingle();
        if (data) prayerMap[d] = data;
      }
      setPrayersByDay(prayerMap);
    } finally {
      setLoading(false);
    }
  };

  const reloadThrottled = useMemo(() => throttle(reload, 350), [range.from, range.to]);

  return { 
    loading, 
    events: eventsByDay, 
    prayersByDay, 
    reload,
    reloadThrottled 
  };
}

function datesBetween(fromISO: string, toISO: string) {
  const a = new Date(fromISO + "T00:00:00Z");
  const b = new Date(toISO + "T00:00:00Z");
  const out: string[] = [];
  for (let d = new Date(a); d <= b; d.setDate(d.getDate() + 1)) {
    out.push(d.toISOString().slice(0, 10));
  }
  return out;
}

import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { scheduleLocal } from "@/native/notifications";

type LampStatus = "idle" | "event_soon" | "prayer_soon" | "conflict" | "ongoing";

interface SmartLampState {
  status: LampStatus;
  nextEvent: any | null;
  nextPrayer: any | null;
  conflictCount: number;
  minutesUntil: number;
}

export function useSmartLamp(userId?: string) {
  const [state, setState] = useState<SmartLampState>({
    status: "idle",
    nextEvent: null,
    nextPrayer: null,
    conflictCount: 0,
    minutesUntil: 0,
  });

  useEffect(() => {
    if (!userId) return;

    const checkStatus = async () => {
      const now = new Date();
      const next15 = new Date(now.getTime() + 15 * 60000);

      // Check for ongoing/upcoming events
      const { data: events } = await supabase
        .from("events")
        .select("*")
        .eq("owner_id", userId)
        .is("deleted_at", null)
        .lte("starts_at", next15.toISOString())
        .gte("ends_at", now.toISOString())
        .order("starts_at", { ascending: true })
        .limit(1);

      // Check for upcoming prayer
      const today = now.toISOString().split("T")[0];
      const { data: prayers } = await supabase
        .from("prayer_times")
        .select("*")
        .eq("owner_id", userId)
        .eq("date_iso", today)
        .single();

      // Check for conflicts
      const { data: conflicts } = await supabase
        .from("conflicts")
        .select("id")
        .eq("owner_id", userId)
        .eq("status", "open")
        .gte("prayer_start", now.toISOString())
        .lte("prayer_start", next15.toISOString());

      let newStatus: LampStatus = "idle";
      let nextEvent = null;
      let nextPrayer = null;
      let conflictCount = 0;
      let minutesUntil = 0;

      // Determine status
      if (conflicts && conflicts.length > 0) {
        newStatus = "conflict";
        conflictCount = conflicts.length;
        
        // Send notification for conflicts
        await scheduleLocal(
          "⚠️ تعارض في الجدول",
          `لديك ${conflictCount} تعارضات تحتاج إلى حل`
        );
      } else if (events && events.length > 0) {
        const ev = events[0];
        const startsAt = new Date(ev.starts_at);
        minutesUntil = Math.round((startsAt.getTime() - now.getTime()) / 60000);

        if (startsAt <= now) {
          newStatus = "ongoing";
          // Send notification for ongoing event with meeting link
          const confUrl = (ev as any).conference_url;
          if (confUrl) {
            await scheduleLocal(
              `🎥 ${ev.title}`,
              "الحدث جاري الآن - انضم للاجتماع"
            );
          }
        } else {
          newStatus = "event_soon";
          // Send notification before event starts
          if (minutesUntil <= 10) {
            await scheduleLocal(
              `⏰ ${ev.title}`,
              `يبدأ بعد ${minutesUntil} دقائق`
            );
          }
        }
        nextEvent = ev;
      } else if (prayers) {
        // Find next prayer
        const prayerTimes = [
          { name: "الفجر", time: prayers.fajr },
          { name: "الظهر", time: prayers.dhuhr },
          { name: "العصر", time: prayers.asr },
          { name: "المغرب", time: prayers.maghrib },
          { name: "العشاء", time: prayers.isha },
        ];

        const nowTime = now.toTimeString().split(" ")[0];
        const upcomingPrayer = prayerTimes.find(
          (p) => p.time && p.time > nowTime
        );

        if (upcomingPrayer) {
          const prayerDate = new Date(`${today}T${upcomingPrayer.time}`);
          minutesUntil = Math.round((prayerDate.getTime() - now.getTime()) / 60000);

          if (prayerDate <= next15) {
            newStatus = "prayer_soon";
            nextPrayer = upcomingPrayer;
            
            // Send notification before prayer
            if (minutesUntil <= 10) {
              await scheduleLocal(
                `🕌 ${upcomingPrayer.name}`,
                `يبدأ بعد ${minutesUntil} دقائق`
              );
            }
          }
        }
      }

      setState({
        status: newStatus,
        nextEvent,
        nextPrayer,
        conflictCount,
        minutesUntil,
      });
    };

    checkStatus();
    const interval = setInterval(checkStatus, 60000); // Check every minute

    return () => clearInterval(interval);
  }, [userId]);

  return state;
}

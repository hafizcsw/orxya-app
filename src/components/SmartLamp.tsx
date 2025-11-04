import { useState, useEffect } from "react";
import { Bell, Video, Clock, X, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useUser } from "@/lib/auth";
import { Button } from "./ui/button";
import { toast } from "sonner";

type LampStatus = "idle" | "event_soon" | "prayer_soon" | "conflict" | "ongoing";

interface SmartLampProps {
  className?: string;
}

export function SmartLamp({ className }: SmartLampProps) {
  const { user } = useUser();
  const [status, setStatus] = useState<LampStatus>("idle");
  const [nextEvent, setNextEvent] = useState<any>(null);
  const [nextPrayer, setNextPrayer] = useState<any>(null);
  const [conflictCount, setConflictCount] = useState(0);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (!user) return;

    const checkStatus = async () => {
      const now = new Date();
      const next15 = new Date(now.getTime() + 15 * 60000);

      // Check for ongoing/upcoming events
      const { data: events } = await supabase
        .from("events")
        .select("*")
        .eq("owner_id", user.id)
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
        .eq("owner_id", user.id)
        .eq("date_iso", today)
        .single();

      // Check for conflicts
      const { data: conflicts } = await supabase
        .from("conflicts")
        .select("id")
        .eq("owner_id", user.id)
        .eq("status", "open")
        .gte("prayer_start", now.toISOString())
        .lte("prayer_start", next15.toISOString());

      // Determine status
      if (conflicts && conflicts.length > 0) {
        setStatus("conflict");
        setConflictCount(conflicts.length);
      } else if (events && events.length > 0) {
        const ev = events[0];
        const startsAt = new Date(ev.starts_at);
        if (startsAt <= now) {
          setStatus("ongoing");
        } else {
          setStatus("event_soon");
        }
        setNextEvent(ev);
      } else if (prayers) {
        // Find next prayer
        const prayerTimes = [
          { name: "fajr", time: prayers.fajr },
          { name: "dhuhr", time: prayers.dhuhr },
          { name: "asr", time: prayers.asr },
          { name: "maghrib", time: prayers.maghrib },
          { name: "isha", time: prayers.isha },
        ];

        const nowTime = now.toTimeString().split(" ")[0];
        const upcomingPrayer = prayerTimes.find(
          (p) => p.time && p.time > nowTime
        );

        if (upcomingPrayer) {
          const prayerDate = new Date(`${today}T${upcomingPrayer.time}`);
          if (prayerDate <= next15) {
            setStatus("prayer_soon");
            setNextPrayer(upcomingPrayer);
          }
        }
      }
    };

    checkStatus();
    const interval = setInterval(checkStatus, 60000); // Check every minute

    return () => clearInterval(interval);
  }, [user]);

  const handleJoin = () => {
    if (nextEvent?.conference_url) {
      window.open(nextEvent.conference_url, "_blank");
    } else {
      toast.info("لا يوجد رابط اجتماع لهذا الحدث");
    }
  };

  const handleShift = async (minutes: number) => {
    if (!nextEvent) return;
    
    try {
      const { error } = await supabase.functions.invoke("calendar-apply", {
        body: {
          action: "move",
          event_id: nextEvent.id,
          shift_minutes: minutes,
        },
      });

      if (error) throw error;
      toast.success(`تم تأجيل الحدث ${minutes} دقيقة`);
    } catch (err) {
      toast.error("فشل تأجيل الحدث");
    }
  };

  const handleMarkFree = async () => {
    if (!nextEvent) return;

    try {
      const { error } = await supabase.functions.invoke("calendar-apply", {
        body: {
          action: "mark_free",
          event_id: nextEvent.id,
        },
      });

      if (error) throw error;
      toast.success("تم وضع علامة متاح");
    } catch (err) {
      toast.error("فشل تحديث الحدث");
    }
  };

  if (dismissed || status === "idle") return null;

  const colors = {
    idle: "bg-green-500",
    event_soon: "bg-yellow-500",
    prayer_soon: "bg-blue-500",
    conflict: "bg-red-500",
    ongoing: "bg-purple-500",
  };

  const icons = {
    idle: <Bell className="w-4 h-4" />,
    event_soon: <Clock className="w-4 h-4" />,
    prayer_soon: <Bell className="w-4 h-4" />,
    conflict: <AlertCircle className="w-4 h-4" />,
    ongoing: <Video className="w-4 h-4" />,
  };

  return (
    <div
      className={cn(
        "fixed bottom-20 left-4 right-4 md:left-auto md:right-6 md:w-96 z-50",
        "bg-card border border-border rounded-2xl shadow-2xl",
        "backdrop-blur-lg bg-opacity-95",
        "animate-in slide-in-from-bottom duration-300",
        className
      )}
    >
      {/* Status Bar */}
      <div className={cn("h-2 rounded-t-2xl", colors[status])} />

      {/* Content */}
      <div className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className={cn("p-2 rounded-full", colors[status])}>
              {icons[status]}
            </div>
            <div>
              <h3 className="font-semibold text-sm">
                {status === "conflict" && `${conflictCount} تعارضات`}
                {status === "event_soon" && "حدث قادم"}
                {status === "prayer_soon" && "وقت صلاة قريب"}
                {status === "ongoing" && "حدث جاري"}
              </h3>
              <p className="text-xs text-muted-foreground">
                {nextEvent?.title || nextPrayer?.name || "تحديث..."}
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setDismissed(true)}
            className="h-6 w-6 p-0"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>

        {/* Actions */}
        {status === "ongoing" && nextEvent?.conference_url && (
          <div className="flex gap-2">
            <Button
              onClick={handleJoin}
              size="sm"
              className="flex-1 bg-primary hover:bg-primary/90"
            >
              <Video className="w-4 h-4 ml-2" />
              انضم الآن
            </Button>
          </div>
        )}

        {status === "event_soon" && (
          <div className="flex gap-2">
            <Button
              onClick={() => handleShift(15)}
              size="sm"
              variant="outline"
              className="flex-1"
            >
              +15د
            </Button>
            <Button
              onClick={() => handleShift(30)}
              size="sm"
              variant="outline"
              className="flex-1"
            >
              +30د
            </Button>
            <Button
              onClick={handleMarkFree}
              size="sm"
              variant="outline"
              className="flex-1"
            >
              متاح
            </Button>
          </div>
        )}

        {status === "conflict" && (
          <Button
            onClick={() => window.location.href = "/conflicts"}
            size="sm"
            variant="destructive"
            className="w-full"
          >
            عرض التعارضات
          </Button>
        )}
      </div>
    </div>
  );
}

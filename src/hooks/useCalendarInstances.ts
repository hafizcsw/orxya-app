import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type Instance = {
  event_id: string;
  calendar_id: string | null;
  instance_start: string;
  instance_end: string;
  title: string;
  location: string | null;
  tags: string[] | null;
  is_draft: boolean;
  source: string | null;
  provider: string | null;
  travel_minutes: number;
  buffer_before: number;
  buffer_after: number;
};

type Prayer = {
  date_iso: string;
  fajr?: string;
  dhuhr?: string;
  asr?: string;
  maghrib?: string;
  isha?: string;
};

type Health = {
  day: string;
  sleep_minutes: number | null;
};

type CalendarData = {
  instances: Instance[];
  prayers: Prayer[];
  health: Health[];
};

export function useCalendarInstances(start: string, end: string) {
  const [data, setData] = useState<CalendarData>({
    instances: [],
    prayers: [],
    health: []
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const { data: result, error } = await supabase.functions.invoke(
          'calendar-instances',
          {
            body: { start, end }
          }
        );

        if (error) {
          console.error('Error fetching calendar instances:', error);
          toast.error('فشل تحميل التقويم');
          return;
        }

        setData(result || { instances: [], prayers: [], health: [] });
      } catch (err) {
        console.error('Unexpected error:', err);
        toast.error('خطأ في تحميل البيانات');
      } finally {
        setLoading(false);
      }
    };

    if (start && end) {
      fetchData();
    }
  }, [start, end]);

  return { data, loading, reload: () => {} };
}

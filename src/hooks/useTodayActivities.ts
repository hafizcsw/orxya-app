import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import dayjs from 'dayjs';

type Activities = {
  work_hours?: number;
  study_hours?: number;
  sports_hours?: number;
  walk_minutes?: number;
};

export function useTodayActivities(date?: string) {
  const [data, setData] = useState<Activities | null>(null);
  const [loading, setLoading] = useState(false);
  const day = date ?? dayjs().format('YYYY-MM-DD');

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      try {
        const { data: rows, error } = await supabase
          .from('vw_today_activities')
          .select('work_hours, study_hours, sports_hours, walk_minutes, day')
          .eq('day', day)
          .limit(1);

        if (error) throw error;

        setData(rows?.[0] ?? { work_hours: 0, study_hours: 0, sports_hours: 0, walk_minutes: 0 });
      } catch (err) {
        console.error('[useTodayActivities] error', err);
        if (alive) setData({ work_hours: 0, study_hours: 0, sports_hours: 0, walk_minutes: 0 });
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [day]);

  return { data, loading };
}

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
  const [error, setError] = useState<string | null>(null);
  const day = date ?? dayjs().format('YYYY-MM-DD');

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const { data: rows, error } = await supabase
          .from('vw_today_activities')
          .select('work_hours, study_hours, sports_hours, walk_minutes')
          .eq('day', day)
          .limit(1);

        if (error) {
          console.error('[useTodayActivities] error', error);
          if (alive) {
            setError(error.message);
            setData({ work_hours: 0, study_hours: 0, sports_hours: 0, walk_minutes: 0 });
          }
          return;
        }

        if (alive) {
          setData(rows?.[0] ?? { work_hours: 0, study_hours: 0, sports_hours: 0, walk_minutes: 0 });
        }
      } catch (err) {
        console.error('[useTodayActivities] error', err);
        if (alive) {
          setError(err instanceof Error ? err.message : 'حدث خطأ غير متوقع');
          setData({ work_hours: 0, study_hours: 0, sports_hours: 0, walk_minutes: 0 });
        }
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [day]);

  return { data, loading, error };
}

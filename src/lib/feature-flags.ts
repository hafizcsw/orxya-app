import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export function useFeatureFlag(key: string) {
  const [enabled, setEnabled] = useState(false);
  useEffect(() => {
    let alive = true;
    (async () => {
      const { data } = await supabase.from('feature_flags').select('enabled').eq('key', key).limit(1);
      if (!alive) return;
      setEnabled(Boolean(data?.[0]?.enabled));
    })();
    return () => { alive = false; };
  }, [key]);
  return enabled;
}

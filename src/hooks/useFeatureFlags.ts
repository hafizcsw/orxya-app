import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export function useFeatureFlags() {
  const [flags, setFlags] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadFlags();
  }, []);

  const loadFlags = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase.rpc('get_user_flags', {
        p_user_id: user.id,
      });

      if (error) throw error;
      
      // Parse the flags to ensure they're boolean values
      const parsedFlags: Record<string, boolean> = {};
      if (data && typeof data === 'object') {
        Object.entries(data as Record<string, any>).forEach(([key, value]) => {
          parsedFlags[key] = Boolean(value);
        });
      }
      setFlags(parsedFlags);
    } catch (error) {
      console.error('Error loading feature flags:', error);
    } finally {
      setLoading(false);
    }
  };

  const setFlag = async (key: string, value: boolean) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase.rpc('set_user_flag', {
        p_user_id: user.id,
        p_key: key,
        p_value: value,
      });

      if (error) throw error;
      
      setFlags((prev) => ({ ...prev, [key]: value }));
    } catch (error) {
      console.error('Error setting feature flag:', error);
      throw error;
    }
  };

  return { flags, loading, setFlag, reload: loadFlags };
}

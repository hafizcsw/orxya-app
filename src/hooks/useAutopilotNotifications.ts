import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useUser } from '@/lib/auth';
import { showAutopilotToast } from '@/components/AutopilotToast';

export function useAutopilotNotifications() {
  const { user } = useUser();

  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('autopilot-notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `owner_id=eq.${user.id}`,
        },
        (payload) => {
          const notif = payload.new as any;
          const type = notif.payload?.type;

          if (type === 'autopilot_applied' || type === 'autopilot_suggest') {
            showAutopilotToast(notif);
          }
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [user]);
}

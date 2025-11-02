import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { Button } from './ui/button';
import { Undo2, Check, X } from 'lucide-react';

type AutopilotNotification = {
  id: number;
  payload: {
    type: 'autopilot_applied' | 'autopilot_suggest';
    conflict_id: string;
    undo_token?: string;
    event_id: string;
    event_title: string;
    prayer_name: string;
    action: string;
    patch?: any;
    confidence?: number;
  };
};

export function showAutopilotToast(notif: AutopilotNotification) {
  const { payload } = notif;

  if (payload.type === 'autopilot_applied') {
    toast({
      title: '✨ تم حل التعارض تلقائيًا',
      description: (
        <div className="flex flex-col gap-2">
          <p className="text-sm">
            {getActionText(payload.action)} لحدث "{payload.event_title}" بسبب تعارض مع {payload.prayer_name}
          </p>
          <UndoButton undoToken={payload.undo_token!} notificationId={notif.id} />
        </div>
      ),
      duration: 10000,
    });
  } else if (payload.type === 'autopilot_suggest') {
    toast({
      title: '💡 اقتراح حل تعارض',
      description: (
        <div className="flex flex-col gap-2">
          <p className="text-sm">
            {getActionText(payload.action)} لحدث "{payload.event_title}" بسبب تعارض مع {payload.prayer_name}
          </p>
          <div className="text-xs opacity-70">ثقة: {Math.round((payload.confidence || 0) * 100)}%</div>
          <SuggestButtons
            conflictId={payload.conflict_id}
            eventId={payload.event_id}
            patch={payload.patch}
            notificationId={notif.id}
          />
        </div>
      ),
      duration: 15000,
    });
  }
}

function getActionText(action: string): string {
  switch (action) {
    case 'mark_free':
      return 'جعل الحدث حرًا (Transparent)';
    case 'shift_time':
      return 'تأخير الحدث 30 دقيقة';
    case 'block_time':
      return 'جعل الحدث غير متاح';
    default:
      return 'تنبيه فقط';
  }
}

function UndoButton({ undoToken, notificationId }: { undoToken: string; notificationId: number }) {
  const [loading, setLoading] = useState(false);

  const handleUndo = async () => {
    setLoading(true);
    try {
      const { error } = await supabase.functions.invoke('autopilot-undo', {
        body: { undo_token: undoToken }
      });

      if (error) throw error;

      await supabase.from('notifications').update({ enabled: false }).eq('id', String(notificationId));

      toast({
        title: '✅ تم التراجع بنجاح',
        description: 'تم إرجاع الحدث إلى حالته السابقة',
      });
    } catch (e) {
      console.error('[AutopilotToast] Undo failed:', e);
      toast({
        title: '❌ فشل التراجع',
        description: String(e),
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleUndo}
      disabled={loading}
      className="w-fit gap-2"
    >
      <Undo2 className="h-4 w-4" />
      {loading ? 'جاري التراجع...' : 'تراجع'}
    </Button>
  );
}

function SuggestButtons({
  conflictId,
  eventId,
  patch,
  notificationId,
}: {
  conflictId: string;
  eventId: string;
  patch: any;
  notificationId: number;
}) {
  const [loading, setLoading] = useState(false);

  const handleAccept = async () => {
    setLoading(true);
    try {
      let updated: any = {};

      if (patch?.shift_minutes) {
        const { data: ev } = await supabase
          .from('events')
          .select('starts_at, ends_at')
          .eq('id', eventId)
          .single();

        if (ev) {
          const ms = patch.shift_minutes * 60 * 1000;
          const startDate = new Date(ev.starts_at);
          const endDate = ev.ends_at ? new Date(ev.ends_at) : null;

          updated.starts_at = new Date(startDate.getTime() + ms).toISOString();
          if (endDate) {
            updated.ends_at = new Date(endDate.getTime() + ms).toISOString();
          }
          updated.pending_push = true;
        }
      }

      if (patch?.transparency) updated.transparency = patch.transparency;
      if (patch?.status) updated.status = patch.status;

      if (Object.keys(updated).length > 0) {
        const { error: eventError } = await supabase
          .from('events')
          .update(updated)
          .eq('id', eventId);

        if (eventError) throw eventError;
      }

      const { error: conflictError } = await supabase
        .from('conflicts')
        .update({
          status: 'resolved',
          decided_by: (await supabase.auth.getUser()).data.user?.id,
          decided_at: new Date().toISOString(),
        })
        .eq('id', conflictId);

      if (conflictError) throw conflictError;

      await supabase.from('notifications').update({ enabled: false }).eq('id', String(notificationId));

      toast({
        title: '✅ تم تطبيق الاقتراح',
        description: 'تم تطبيق التغيير على الحدث بنجاح',
      });
    } catch (e) {
      console.error('[AutopilotToast] Accept failed:', e);
      toast({
        title: '❌ فشل التطبيق',
        description: String(e),
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDecline = async () => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('conflicts')
        .update({
          status: 'resolved',
          resolution: 'user_declined',
          decided_by: (await supabase.auth.getUser()).data.user?.id,
          decided_at: new Date().toISOString(),
        })
        .eq('id', conflictId);

      if (error) throw error;

      await supabase.from('notifications').update({ enabled: false }).eq('id', String(notificationId));

      toast({
        title: 'تم رفض الاقتراح',
        description: 'لن يتم تطبيق التغيير',
      });
    } catch (e) {
      console.error('[AutopilotToast] Decline failed:', e);
      toast({
        title: '❌ فشل الرفض',
        description: String(e),
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex gap-2">
      <Button
        variant="default"
        size="sm"
        onClick={handleAccept}
        disabled={loading}
        className="gap-2"
      >
        <Check className="h-4 w-4" />
        {loading ? 'جاري التطبيق...' : 'تطبيق'}
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={handleDecline}
        disabled={loading}
        className="gap-2"
      >
        <X className="h-4 w-4" />
        رفض
      </Button>
    </div>
  );
}

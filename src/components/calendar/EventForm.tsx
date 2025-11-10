import { useState, useEffect } from 'react';
import { X, Save, Trash2, AlertTriangle } from 'lucide-react';
import { NeonButton } from '@/components/ui/NeonButton';
import { GlassPanel } from '@/components/ui/GlassPanel';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { track } from '@/lib/telemetry';
import { cn } from '@/lib/utils';

interface EventFormProps {
  event?: any;
  initialDate?: Date;
  onClose: () => void;
  onSave: () => void;
}

export function EventForm({ event, initialDate, onClose, onSave }: EventFormProps) {
  const { user } = useAuth();
  const [title, setTitle] = useState(event?.title || '');
  const [startsAt, setStartsAt] = useState(
    event?.starts_at 
      ? new Date(event.starts_at).toISOString().slice(0, 16)
      : initialDate?.toISOString().slice(0, 16) || ''
  );
  const [endsAt, setEndsAt] = useState(
    event?.ends_at
      ? new Date(event.ends_at).toISOString().slice(0, 16)
      : initialDate ? new Date(initialDate.getTime() + 3600000).toISOString().slice(0, 16) : ''
  );
  const [isAllDay, setIsAllDay] = useState(event?.is_all_day || false);
  const [notifyChannels, setNotifyChannels] = useState<string[]>(event?.notify_channel || ['local']);
  const [loading, setLoading] = useState(false);
  const [conflicts, setConflicts] = useState<any[]>([]);
  const [checkingConflicts, setCheckingConflicts] = useState(false);

  // فحص التعارضات عند تغيير الأوقات
  useEffect(() => {
    if (!user || !startsAt || !endsAt) return;
    
    const checkConflicts = async () => {
      setCheckingConflicts(true);
      try {
        const dateISO = new Date(startsAt).toISOString().slice(0, 10);
        const { data } = await supabase.functions.invoke('conflict-check', {
          body: { date: dateISO }
        });
        
        if (data?.ok) {
          // فلترة التعارضات لهذا الحدث فقط
          setConflicts(data.conflicts?.filter((c: any) => 
            c.event_id === event?.id || !event
          ) || []);
        }
      } catch (e) {
        console.error('Conflict check error:', e);
      } finally {
        setCheckingConflicts(false);
      }
    };

    const timer = setTimeout(checkConflicts, 500);
    return () => clearTimeout(timer);
  }, [startsAt, endsAt, user, event?.id]);

  const handleSave = async () => {
    if (!user || !title.trim()) return;
    
    setLoading(true);
    try {
      const eventData = {
        owner_id: user.id,
        title: title.trim(),
        starts_at: new Date(startsAt).toISOString(),
        ends_at: new Date(endsAt).toISOString(),
        is_all_day: isAllDay,
        notify_channel: notifyChannels,
        source: 'local'
      };

      if (event?.id) {
        // تحديث
        await supabase.from('events').update(eventData).eq('id', event.id);
        track('calendar_event_updated', { id: event.id });
      } else {
        // إنشاء
        await supabase.from('events').insert(eventData);
        track('calendar_event_created', { has_conflicts: conflicts.length > 0 });
      }

      onSave();
      onClose();
    } catch (e) {
      console.error('Save event error:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!event?.id || !confirm('هل تريد حذف هذا الحدث؟')) return;
    
    setLoading(true);
    try {
      await supabase.from('events').update({ deleted_at: new Date().toISOString() }).eq('id', event.id);
      track('calendar_event_deleted', { id: event.id });
      onSave();
      onClose();
    } catch (e) {
      console.error('Delete event error:', e);
    } finally {
      setLoading(false);
    }
  };

  const toggleChannel = (channel: string) => {
    setNotifyChannels(prev =>
      prev.includes(channel)
        ? prev.filter(c => c !== channel)
        : [...prev, channel]
    );
  };

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <GlassPanel className="max-w-2xl w-full">
        <div className="p-6 space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold gradient-text">
              {event ? 'تعديل الحدث' : 'حدث جديد'}
            </h2>
            <button onClick={onClose} className="p-2 hover:bg-muted/50 rounded-full transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Conflicts Warning */}
          {conflicts.length > 0 && (
            <div className="p-4 rounded-xl bg-warning/10 border border-warning/30 space-y-2">
              <div className="flex items-center gap-2 text-warning font-medium">
                <AlertTriangle className="w-5 h-5" />
                <span>تعارض مع {conflicts.length} من مواقيت الصلاة</span>
              </div>
              <ul className="text-sm text-muted-foreground space-y-1 pr-6">
                {conflicts.map((c: any, i: number) => (
                  <li key={i}>• {c.slot_name} - تداخل {c.overlap_min || 0} دقيقة</li>
                ))}
              </ul>
              <p className="text-xs text-muted-foreground">
                هل تريد المتابعة رغم التعارض؟
              </p>
            </div>
          )}

          {/* Form Fields */}
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-muted-foreground block mb-2">
                العنوان
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-muted/50 border border-border focus:border-primary focus:ring-2 focus:ring-primary/30 outline-none transition-all"
                placeholder="اسم الحدث..."
                autoFocus
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground block mb-2">
                  البداية
                </label>
                <input
                  type="datetime-local"
                  value={startsAt}
                  onChange={(e) => setStartsAt(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-muted/50 border border-border focus:border-primary focus:ring-2 focus:ring-primary/30 outline-none transition-all"
                  disabled={isAllDay}
                />
              </div>

              <div>
                <label className="text-sm font-medium text-muted-foreground block mb-2">
                  النهاية
                </label>
                <input
                  type="datetime-local"
                  value={endsAt}
                  onChange={(e) => setEndsAt(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-muted/50 border border-border focus:border-primary focus:ring-2 focus:ring-primary/30 outline-none transition-all"
                  disabled={isAllDay}
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="allDay"
                checked={isAllDay}
                onChange={(e) => setIsAllDay(e.target.checked)}
                className="w-5 h-5 rounded border-border"
              />
              <label htmlFor="allDay" className="text-sm font-medium cursor-pointer">
                طوال اليوم
              </label>
            </div>

            {/* Notification Channels */}
            <div>
              <label className="text-sm font-medium text-muted-foreground block mb-2">
                قنوات التنبيه
              </label>
              <div className="flex gap-2">
                {[
                  { id: 'local', label: 'محلي', icon: '🔔' },
                  { id: 'whatsapp', label: 'واتساب', icon: '💬' },
                  { id: 'email', label: 'بريد', icon: '📧' }
                ].map(ch => (
                  <button
                    key={ch.id}
                    onClick={() => toggleChannel(ch.id)}
                    className={cn(
                      "flex-1 p-3 rounded-xl border-2 transition-all",
                      notifyChannels.includes(ch.id)
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border bg-muted/30 hover:bg-muted/50"
                    )}
                  >
                    <div className="text-2xl mb-1">{ch.icon}</div>
                    <div className="text-xs">{ch.label}</div>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4 border-t border-border">
            {event && (
              <NeonButton
                variant="ghost"
                onClick={handleDelete}
                disabled={loading}
                className="text-destructive hover:bg-destructive/10"
              >
                <Trash2 className="w-4 h-4 ml-2" />
                حذف
              </NeonButton>
            )}
            <div className="flex-1" />
            <NeonButton variant="ghost" onClick={onClose} disabled={loading}>
              إلغاء
            </NeonButton>
            <NeonButton
              variant="primary"
              onClick={handleSave}
              disabled={loading || !title.trim() || checkingConflicts}
              glow
            >
              <Save className="w-4 h-4 ml-2" />
              {loading ? 'جار الحفظ...' : 'حفظ'}
            </NeonButton>
          </div>
        </div>
      </GlassPanel>
    </div>
  );
}

import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { track } from '@/lib/telemetry';
import { toast } from '@/hooks/use-toast';

type Ev = {
  id?: string;
  title: string | null;
  starts_at: string;
  ends_at: string | null;
  description?: string | null;
  source: 'local'|'google'|'ai';
};

type Props = {
  open: boolean;
  onClose: () => void;
  initial: Ev | null;
  defaultDate?: Date | null;
  onSaved?: (ev: Ev) => void;
  onDeleted?: (id: string) => void;
};

function toLocalDate(iso?: string) {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toISOString().slice(0,10);
}

function toLocalTime(iso?: string) {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toTimeString().slice(0,5);
}

function combineLocal(dateStr: string, timeStr: string) {
  const [h,m] = (timeStr || '00:00').split(':').map(x=>parseInt(x,10));
  const d = new Date(dateStr+'T00:00:00');
  d.setHours(h, m, 0, 0);
  return d.toISOString();
}

export default function CalendarEventModal({
  open, onClose, initial, defaultDate, onSaved, onDeleted
}: Props) {
  const { user } = useAuth();
  const creating = !initial?.id;

  const [title, setTitle] = useState(initial?.title ?? '');
  const [date, setDate] = useState(initial ? toLocalDate(initial.starts_at) : (defaultDate ? defaultDate.toISOString().slice(0,10) : ''));
  const [startTime, setStartTime] = useState(initial ? toLocalTime(initial.starts_at) : '09:00');
  const [endTime, setEndTime] = useState(initial?.ends_at ? toLocalTime(initial.ends_at) : '10:00');
  const [description, setDescription] = useState(initial?.description ?? '');
  const [syncToGoogle, setSyncToGoogle] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string|null>(null);

  useEffect(() => {
    if (!open) return;
    setTitle(initial?.title ?? '');
    setDate(initial ? toLocalDate(initial.starts_at) : (defaultDate ? defaultDate.toISOString().slice(0,10) : ''));
    setStartTime(initial ? toLocalTime(initial.starts_at) : '09:00');
    setEndTime(initial?.ends_at ? toLocalTime(initial.ends_at) : '10:00');
    setDescription(initial?.description ?? '');
    setErr(null);
  }, [open, initial?.id]);

  const valid = useMemo(() => {
    if (!date || !startTime) return false;
    const s = combineLocal(date, startTime);
    const e = endTime ? combineLocal(date, endTime) : null;
    if (e && new Date(e) < new Date(s)) return false;
    return true;
  }, [date, startTime, endTime]);

  async function save() {
    if (!user || !valid) return;
    setSaving(true); setErr(null);
    try {
      const starts_at = combineLocal(date, startTime);
      const ends_at = endTime ? combineLocal(date, endTime) : starts_at;
      if (creating) {
        const { data, error } = await supabase
          .from('events')
          .insert({
            owner_id: user.id,
            title: title || '(بدون عنوان)',
            starts_at, ends_at,
            source_id: 'local',
            description: description || null
          })
          .select('id,title,starts_at,ends_at,source_id,description')
          .single();
        if (error) throw error;
        
        // مزامنة مع Google إذا مطلوب
        if (syncToGoogle) {
          setSyncing(true);
          const { error: syncErr } = await supabase.functions.invoke('gcal-write', {
            body: { event_id: data.id, op: 'upsert' }
          });
          setSyncing(false);
          if (syncErr) {
            toast({ title: 'تحذير', description: 'تم حفظ الحدث محليًا لكن فشلت المزامنة مع Google', variant: 'destructive' });
          } else {
            toast({ title: 'تم الحفظ والمزامنة مع Google', variant: 'default' });
          }
        }
        
        await supabase.functions.invoke('conflict-check', { body: { event_id: data.id } }).catch(()=>{});
        track('calendar_event_created_local', { synced: syncToGoogle });
        onSaved?.({ ...data, source: data.source_id } as any);
      } else {
        const { data, error } = await supabase
          .from('events')
          .update({
            title: title || '(بدون عنوان)',
            starts_at, ends_at,
            description: description || null
          })
          .eq('id', initial!.id)
          .eq('owner_id', user.id)
          .select('id,title,starts_at,ends_at,source_id,description,google_event_id')
          .single();
        if (error) throw error;
        
        // مزامنة مع Google إذا مطلوب
        if (syncToGoogle) {
          setSyncing(true);
          const { error: syncErr } = await supabase.functions.invoke('gcal-write', {
            body: { event_id: data.id, op: 'upsert' }
          });
          setSyncing(false);
          if (syncErr) {
            toast({ title: 'تحذير', description: 'تم حفظ الحدث محليًا لكن فشلت المزامنة مع Google', variant: 'destructive' });
          } else {
            toast({ title: 'تم التحديث والمزامنة مع Google', variant: 'default' });
          }
        }
        
        await supabase.functions.invoke('conflict-check', { body: { event_id: data.id } }).catch(()=>{});
        track('calendar_event_updated_local', { synced: syncToGoogle });
        onSaved?.({ ...data, source: data.source_id } as any);
      }
      onClose();
    } catch (e:any) {
      setErr(e?.message ?? 'تعذر الحفظ');
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    if (!user || creating || !initial?.id) return;
    setSaving(true); setErr(null);
    try {
      // حذف من Google أولًا إذا كان مرتبطًا
      if ((initial as any).google_event_id) {
        await supabase.functions.invoke('gcal-write', {
          body: { event_id: initial.id, op: 'delete' }
        }).catch((e) => {
          console.error('Failed to delete from Google:', e);
        });
      }
      
      const { error } = await supabase
        .from('events')
        .delete()
        .eq('id', initial.id)
        .eq('owner_id', user.id);
      if (error) throw error;
      track('calendar_event_deleted_local');
      onDeleted?.(initial.id!);
      onClose();
    } catch (e:any) {
      setErr(e?.message ?? 'تعذر الحذف');
    } finally {
      setSaving(false);
    }
  }

  async function unsyncFromGoogle() {
    if (!user || !initial?.id) return;
    setSyncing(true);
    try {
      await supabase.functions.invoke('gcal-write', {
        body: { event_id: initial.id, op: 'delete' }
      });
      toast({ title: 'تم إلغاء المزامنة مع Google', variant: 'default' });
      track('calendar_event_unsynced');
      onClose();
    } catch (e: any) {
      toast({ title: 'خطأ', description: 'فشل إلغاء المزامنة', variant: 'destructive' });
    } finally {
      setSyncing(false);
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/30 z-50 flex items-center justify-center p-4">
      <div className="w-full max-w-lg rounded-2xl bg-card border p-6 space-y-4">
        <div className="text-xl font-semibold">{creating ? 'حدث جديد' : 'تعديل حدث'}</div>

        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-1.5 block">العنوان</label>
            <input 
              value={title} 
              onChange={e=>setTitle(e.target.value)}
              placeholder="عنوان الحدث"
              className="w-full px-3 py-2 rounded-lg border bg-background"
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-sm font-medium mb-1.5 block">التاريخ</label>
              <input 
                type="date" 
                value={date} 
                onChange={e=>setDate(e.target.value)}
                className="w-full px-2 py-2 rounded-lg border bg-background"
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">من</label>
              <input 
                type="time" 
                value={startTime} 
                onChange={e=>setStartTime(e.target.value)}
                className="w-full px-2 py-2 rounded-lg border bg-background"
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">إلى</label>
              <input 
                type="time" 
                value={endTime} 
                onChange={e=>setEndTime(e.target.value)}
                className="w-full px-2 py-2 rounded-lg border bg-background"
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <input 
              type="checkbox" 
              id="sync-google" 
              checked={syncToGoogle}
              onChange={(e) => setSyncToGoogle(e.target.checked)}
              className="w-4 h-4 rounded border-border"
            />
            <label htmlFor="sync-google" className="text-sm font-medium cursor-pointer">
              مزامنة مع Google Calendar
            </label>
          </div>

          {(initial as any)?.google_event_id && (
            <div className="text-xs text-muted-foreground">
              ✅ مرتبط بـ Google Calendar
            </div>
          )}

          <div>
            <label className="text-sm font-medium mb-1.5 block">ملاحظات</label>
            <textarea 
              value={description ?? ''} 
              onChange={e=>setDescription(e.target.value)}
              rows={3} 
              className="w-full px-3 py-2 rounded-lg border bg-background resize-none"
              placeholder="تفاصيل إضافية (اختياري)"
            />
          </div>

          {!valid && (
            <div className="text-sm text-destructive">
              تحقق من الوقت — لا ينبغي أن ينتهي قبل أن يبدأ.
            </div>
          )}
          {err && <div className="text-sm text-destructive">{err}</div>}
        </div>

        <div className="flex items-center justify-between pt-2">
          <div className="flex items-center gap-2">
            {!creating && (
              <button 
                onClick={remove} 
                disabled={saving || syncing}
                className="px-4 py-2 rounded-lg border border-destructive text-destructive hover:bg-destructive/10 transition-colors"
              >
                حذف
              </button>
            )}
            {(initial as any)?.google_event_id && (
              <button 
                onClick={unsyncFromGoogle} 
                disabled={saving || syncing}
                className="px-3 py-2 rounded-lg border hover:bg-secondary transition-colors text-sm"
              >
                إلغاء مزامنة Google
              </button>
            )}
          </div>
          
          <div className="flex items-center gap-2">
            <button 
              onClick={onClose} 
              className="px-4 py-2 rounded-lg border hover:bg-secondary transition-colors"
            >
              إلغاء
            </button>
            <button 
              onClick={save} 
              disabled={!valid || saving || syncing}
              className="px-5 py-2 rounded-lg bg-primary text-primary-foreground hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {saving ? 'جارٍ الحفظ...' : syncing ? 'جارٍ المزامنة...' : 'حفظ'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

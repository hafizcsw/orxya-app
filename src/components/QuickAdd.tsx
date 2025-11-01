import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { genIdem } from '@/lib/sync';
import { track } from '@/lib/telemetry';
import { useToast } from '@/hooks/use-toast';

type Props = { 
  open: boolean; 
  onClose: () => void; 
  defaultProjectId?: string | null;
  onSuccess?: () => void;
};

function parseArabicDate(s: string): Date | null {
  const now = new Date();
  const d = s.trim();
  if (/(^|\s)اليوم($|\s)/.test(d)) return now;
  if (/(^|\s)غد(اً|ا)?($|\s)/.test(d)) { const x = new Date(); x.setDate(x.getDate()+1); return x; }
  if (/(^|\s)بعد\s*غد(اً|ا)?($|\s)/.test(d)) { const x = new Date(); x.setDate(x.getDate()+2); return x; }
  
  // YYYY-MM-DD
  const m = d.match(/(\d{4})-(\d{2})-(\d{2})/);
  if (m) return new Date(`${m[1]}-${m[2]}-${m[3]}T09:00:00`);
  
  // DD/MM
  const m2 = d.match(/(\d{1,2})[\/\-\.](\d{1,2})/);
  if (m2) { 
    const x = new Date(); 
    x.setMonth(Number(m2[2])-1); 
    x.setDate(Number(m2[1])); 
    x.setHours(9,0,0,0); 
    return x; 
  }
  return null;
}

function parseTimeRange(s: string): { start?: string; end?: string } {
  // Examples: 15:00-16:30  |  3-4 م
  const m = s.match(/(\d{1,2})(?::(\d{2}))?\s*(ص|م)?\s*[-–]\s*(\d{1,2})(?::(\d{2}))?\s*(ص|م)?/);
  if (!m) return {};
  const h1 = Number(m[1]); 
  const mm1 = m[2] ? Number(m[2]) : 0; 
  const ap1 = (m[3]||'').trim();
  const h2 = Number(m[4]); 
  const mm2 = m[5] ? Number(m[5]) : 0; 
  const ap2 = (m[6]||'').trim();
  const to24 = (h:number, ap:string) => ap==='م' && h<12 ? h+12 : (ap==='ص' && h===12 ? 0 : h);
  const H1 = ap1 ? to24(h1, ap1) : h1;
  const H2 = ap2 ? to24(h2, ap2) : h2;
  const pad = (n:number)=> String(n).padStart(2,'0');
  return { start: `${pad(H1)}:${pad(mm1)}`, end: `${pad(H2)}:${pad(mm2)}` };
}

function extractTags(s: string): string[] {
  return (s.match(/#[\p{L}\w\-]+/gu) || []).map(x => x.replace(/^#/, '')).slice(0, 6);
}

export default function QuickAdd({ open, onClose, defaultProjectId, onSuccess }: Props){
  const [text, setText] = useState('');
  const ref = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  useEffect(()=>{ 
    if(open) {
      setTimeout(()=>ref.current?.focus(), 0);
      track('quick_add_open');
    }
  }, [open]);

  async function submit(){
    const v = text.trim();
    if (!v) { onClose(); return; }

    // Simple format:
    // e: title @ date [time-time] #tag1 #tag2
    // t: title [@ date (due)] #tag…
    const isEvent = v.startsWith('e:') || v.startsWith('E:');
    const isTask  = v.startsWith('t:') || v.startsWith('T:');
    const body = v.replace(/^[eEtT]:\s*/, '');
    const parts = body.split('@');
    const title = parts[0].trim();
    const meta  = (parts[1] || '').trim();
    const tags  = extractTags(v);

    try {
      if (isEvent || (!isTask && meta)) {
        const date = parseArabicDate(meta) ?? new Date();
        const tr   = parseTimeRange(meta);
        const start = new Date(date);
        if (tr.start) { const [h,m] = tr.start.split(':').map(Number); start.setHours(h,m||0,0,0); }
        const end = new Date(start);
        if (tr.end) { const [h,m] = tr.end.split(':').map(Number); end.setHours(h,m||0,0,0); }
        else { end.setMinutes(end.getMinutes()+60); }

        const payload = {
          command: 'create_event',
          idempotency_key: genIdem(),
          payload: {
            title: title || 'New Event',
            starts_at: start.toISOString(),
            ends_at: end.toISOString(),
            source: 'user',
            tags
          }
        };
        const { error } = await supabase.functions.invoke('commands', { body: payload });
        if (error) throw error;
        track('quick_add_event');
        toast({ title: 'تم إنشاء الحدث', description: title });
      } else {
        if (!defaultProjectId) {
          toast({ title: 'خطأ', description: 'يرجى اختيار مشروع أولاً', variant: 'destructive' });
          return;
        }
        const due = parseArabicDate(meta || '')?.toISOString().slice(0,10) ?? null;
        const { error } = await supabase.functions.invoke('commands', {
          body: {
            command: 'add_task',
            idempotency_key: genIdem(),
            payload: {
              project_id: defaultProjectId,
              title: title || 'New Task',
              status: 'todo',
              order_pos: 1_000_000,
              due_date: due,
              tags
            }
          }
        });
        if (error) throw error;
        track('quick_add_task');
        toast({ title: 'تم إنشاء المهمة', description: title });
      }
      setText('');
      onClose();
      onSuccess?.();
    } catch (e) {
      console.error('Quick add error:', e);
      toast({ 
        title: 'فشل الحفظ', 
        description: 'حدث خطأ أثناء الحفظ', 
        variant: 'destructive' 
      });
      onClose();
    }
  }

  if (!open) return null;
  
  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-start justify-center p-6" onClick={onClose}>
      <div className="w-full max-w-2xl rounded-2xl shadow-xl border border-border bg-card p-4 mt-20" onClick={e=>e.stopPropagation()}>
        <div className="text-sm text-muted-foreground mb-2">
          اكتب: <code className="px-1 py-0.5 rounded bg-muted">e:</code> للحدث، <code className="px-1 py-0.5 rounded bg-muted">t:</code> للمهمة، ثم العنوان، ثم <code className="px-1 py-0.5 rounded bg-muted">@</code> التاريخ/الوقت، وأضِف الوسوم بـ <code className="px-1 py-0.5 rounded bg-muted">#</code>
        </div>
        <input
          ref={ref}
          value={text}
          onChange={e=>setText(e.target.value)}
          onKeyDown={(e)=>{ 
            if(e.key==='Enter') submit(); 
            if(e.key==='Escape') onClose(); 
          }}
          placeholder="e: اجتماع تسليم @ غداً 3-4 م #work  |  t: مراجعة العقد @ اليوم #legal"
          className="w-full px-4 py-3 rounded-xl border border-input bg-background text-foreground outline-none focus:ring-2 focus:ring-ring"
        />
        <div className="mt-3 flex items-center justify-between">
          <div className="text-xs text-muted-foreground">⌘/Ctrl + K لفتح/إغلاق</div>
          <div className="flex gap-2">
            <button 
              className="px-3 py-1 rounded-lg border border-border bg-secondary hover:bg-secondary/80 text-secondary-foreground transition-colors" 
              onClick={onClose}
            >
              إلغاء
            </button>
            <button 
              className="px-3 py-1 rounded-lg border border-primary bg-primary text-primary-foreground hover:opacity-90 transition-opacity" 
              onClick={submit}
            >
              حفظ
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

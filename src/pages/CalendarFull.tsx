import { useEffect, useMemo, useRef, useState } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import type { DateSelectArg, EventClickArg, EventContentArg, EventDropArg } from '@fullcalendar/core';
import { supabase } from '@/integrations/supabase/client';
import { throttle } from '@/lib/throttle';
import { track } from '@/lib/telemetry';
import { buildPrayerWindowsForDay } from '@/lib/calendar';
import { useUser } from '@/lib/auth';
import { useToast } from '@/hooks/use-toast';
import Button from '@/components/ui/Button';
import { Loader2, Calendar as CalendarIcon } from 'lucide-react';
import { SessionBanner } from '@/components/SessionBanner';

type Row = {
  id: string;
  owner_id: string;
  title: string;
  starts_at: string;
  ends_at: string | null;
  description: string | null;
  source_id: string | null;
  conflict_open_count: number;
  conflict_prayers: string[];
};

export default function CalendarFullPage() {
  const { user } = useUser();
  const { toast } = useToast();
  const calRef = useRef<FullCalendar | null>(null);
  const [range, setRange] = useState<{ from: string; to: string } | null>(null);
  const [events, setEvents] = useState<Row[]>([]);
  const [bgEvents, setBgEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const reload = useMemo(
    () =>
      throttle(async () => {
        if (!user || !range) return;
        setLoading(true);
        try {
          // 1) أحداث المستخدم للفترة من الـ view الجديد
          const { data: evs, error: e1 } = await supabase
            .from('vw_events_conflicts')
            .select('*')
            .eq('owner_id', user.id)
            .lt('starts_at', range.to)
            .gt('ends_at', range.from);
          if (e1) throw e1;
          setEvents((evs ?? []) as Row[]);

          // 2) مواقيت الصلاة للأيام في الفترة ⇒ نوافذ خلفية
          const days: string[] = [];
          {
            const s = new Date(range.from);
            const e = new Date(range.to);
            for (let d = new Date(s); d <= e; d.setUTCDate(d.getUTCDate() + 1)) {
              days.push(d.toISOString().slice(0, 10));
            }
          }
          const { data: pts } = await supabase
            .from('prayer_times')
            .select('date_iso,fajr,dhuhr,asr,maghrib,isha')
            .eq('owner_id', user.id)
            .in('date_iso', days);
          const bg = (pts ?? []).flatMap((p: any) =>
            buildPrayerWindowsForDay(
              {
                fajr: p.fajr,
                dhuhr: p.dhuhr,
                asr: p.asr,
                maghrib: p.maghrib,
                isha: p.isha
              },
              p.date_iso
            )
          );
          setBgEvents(bg);
        } catch (e: any) {
          toast({
            title: 'خطأ',
            description: e?.message ?? 'تعذّر التحميل',
            variant: 'destructive'
          });
        } finally {
          setLoading(false);
        }
      }, 300),
    [user?.id, range, toast]
  );

  useEffect(() => {
    reload();
  }, [reload]);

  function onDatesSet(arg: any) {
    const from = arg.startStr;
    const to = arg.endStr;
    setRange({ from, to });
  }

  // تنسيق العرض داخل الحدث: لون تحذيري عند وجود تعارضات
  function renderEventContent(arg: EventContentArg) {
    const c = arg.event.extendedProps as any;
    const hasConflict = c.conflict_open_count > 0;
    return (
      <div
        className={`px-2 py-1 rounded text-xs ${
          hasConflict
            ? 'bg-destructive/15 border border-destructive text-destructive-foreground'
            : 'bg-primary/10 border border-primary/20'
        }`}
      >
        <div className="font-medium truncate">{arg.event.title}</div>
        {hasConflict && (
          <div className="text-[10px] mt-0.5 flex items-center gap-1">
            <span>⚠</span>
            <span>تعارض: {c.conflict_prayers?.join('، ')}</span>
          </div>
        )}
      </div>
    );
  }

  // منع الإسقاط داخل نافذة صلاة (خلفية)
  function isInPrayerWindow(startISO: string, endISO: string) {
    const s = new Date(startISO);
    const e = new Date(endISO);
    return bgEvents.some((w: any) => {
      const ws = new Date(w.start),
        we = new Date(w.end);
      return e > ws && s < we;
    });
  }

  // إنشاء سريع بالاختيار
  async function onSelectSlot(sel: DateSelectArg) {
    if (!user) return;
    const title = prompt('عنوان الحدث؟');
    if (!title) return;

    const payload = {
      title,
      starts_at: sel.startStr,
      ends_at: sel.endStr,
      source: 'user',
      tags: []
    };

    const { error } = await supabase.functions.invoke('commands', {
      body: {
        command: 'create_event',
        idempotency_key: crypto.randomUUID(),
        payload
      }
    });

    if (error) {
      toast({
        title: 'خطأ',
        description: 'تعذّر إنشاء الحدث',
        variant: 'destructive'
      });
      return;
    }

    track('cal_create_event');
    reload();
  }

  // سحب/إفلات
  async function onEventDrop(arg: EventDropArg) {
    const id = arg.event.id;
    const start = arg.event.start?.toISOString()!;
    const end = arg.event.end?.toISOString() ?? start;

    // منع السقوط داخل نافذة صلاة
    if (isInPrayerWindow(start, end)) {
      toast({
        title: 'تحذير',
        description: 'لا يمكن وضع الحدث داخل نافذة الصلاة',
        variant: 'destructive'
      });
      arg.revert();
      track('cal_drop_blocked_prayer');
      return;
    }

    track('cal_drop', { id });
    const { error } = await supabase.functions.invoke('commands', {
      body: {
        command: 'update_event',
        idempotency_key: crypto.randomUUID(),
        payload: { event_id: id, starts_at: start, ends_at: end }
      }
    });

    if (error) {
      arg.revert();
      toast({
        title: 'خطأ',
        description: 'تعذّر الحفظ — تم التراجع',
        variant: 'destructive'
      });
      track('cal_drop_undo');
      return;
    }

    await supabase.functions.invoke('conflict-check', { body: { event_id: id } });
    reload();
  }

  // تحجيم
  async function onEventResize(arg: any) {
    const id = arg.event.id;
    const start = arg.event.start?.toISOString()!;
    const end = arg.event.end?.toISOString() ?? start;

    if (isInPrayerWindow(start, end)) {
      toast({
        title: 'تحذير',
        description: 'لا يمكن تمديد الحدث داخل نافذة الصلاة',
        variant: 'destructive'
      });
      arg.revert();
      track('cal_resize_blocked_prayer');
      return;
    }

    track('cal_resize', { id });
    const { error } = await supabase.functions.invoke('commands', {
      body: {
        command: 'update_event',
        idempotency_key: crypto.randomUUID(),
        payload: { event_id: id, starts_at: start, ends_at: end }
      }
    });

    if (error) {
      arg.revert();
      toast({
        title: 'خطأ',
        description: 'تعذّر الحفظ — تم التراجع',
        variant: 'destructive'
      });
      track('cal_resize_undo');
      return;
    }

    await supabase.functions.invoke('conflict-check', { body: { event_id: id } });
    reload();
  }

  function onEventClick(arg: EventClickArg) {
    const start = arg.event.start?.toLocaleString('ar-EG') ?? '';
    const end = arg.event.end?.toLocaleString('ar-EG') ?? '';
    toast({
      title: arg.event.title,
      description: `${start} → ${end}`
    });
  }

  // تحويل صفوفنا إلى صيغة FullCalendar
  const fcEvents = useMemo(() => {
    const mapped = events.map(ev => ({
      id: ev.id,
      title: ev.title ?? '(بدون عنوان)',
      start: ev.starts_at,
      end: ev.ends_at ?? ev.starts_at,
      className: ev.conflict_open_count > 0 ? 'fc-event-conflict' : '',
      extendedProps: {
        conflict_open_count: ev.conflict_open_count,
        conflict_prayers: ev.conflict_prayers
      }
    }));
    return [...mapped, ...bgEvents];
  }, [events, bgEvents]);

  if (!user) {
    return (
      <div className="container mx-auto p-6">
        <SessionBanner />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <CalendarIcon className="h-8 w-8 text-primary" />
            التقويم الكامل
          </h1>
          <p className="text-muted-foreground mt-1">
            إدارة الأحداث ومواقيت الصلاة مع السحب والتحجيم
          </p>
        </div>
        {loading && (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span className="text-sm">جارٍ التحميل…</span>
          </div>
        )}
      </div>

      <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
        <FullCalendar
          ref={calRef as any}
          plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
          initialView="timeGridWeek"
          headerToolbar={{
            left: 'prev,next today',
            center: 'title',
            right: 'dayGridMonth,timeGridWeek,timeGridDay'
          }}
          locale="ar"
          direction="rtl"
          selectable
          select={onSelectSlot}
          editable
          eventDrop={onEventDrop}
          eventResize={onEventResize}
          eventClick={onEventClick}
          eventContent={renderEventContent}
          datesSet={onDatesSet}
          events={fcEvents}
          slotMinTime="05:00:00"
          slotMaxTime="23:00:00"
          nowIndicator
          height="auto"
          allDaySlot={false}
        />
      </div>

      <div className="flex gap-4 text-sm text-muted-foreground flex-wrap">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-primary/10 border border-primary/20"></div>
          <span>حدث عادي</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-destructive/15 border border-destructive"></div>
          <span>حدث متعارض مع الصلاة</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-rose-200/50"></div>
          <span>نافذة صلاة</span>
        </div>
      </div>
    </div>
  );
}

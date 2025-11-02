// Calendar utilities for drag/resize and prayer windows

// Prayer windows configuration
export type PrayerName = 'fajr' | 'dhuhr' | 'asr' | 'maghrib' | 'isha';

const WINDOWS: Record<PrayerName, { pre: number; post: number; label: string }> = {
  fajr: { pre: -5, post: 20, label: 'الفجر' },
  dhuhr: { pre: -10, post: 30, label: 'الظهر' },
  asr: { pre: -10, post: 30, label: 'العصر' },
  maghrib: { pre: -10, post: 30, label: 'المغرب' },
  isha: { pre: -10, post: 30, label: 'العشاء' },
};

function hhmmToDate(hhmm: string, dayISO: string) {
  const [h, m] = hhmm.split(':').map(n => parseInt(n, 10));
  const d = new Date(`${dayISO}T00:00:00.000Z`);
  d.setUTCHours(h, m, 0, 0);
  return d;
}

function addMinutes(d: Date, m: number) {
  const x = new Date(d);
  x.setMinutes(x.getMinutes() + m);
  return x;
}

export function buildPrayerWindowsForDay(
  pt: Partial<Record<PrayerName, string>>,
  dayISO: string
) {
  const out: Array<{
    title: string;
    start: string;
    end: string;
    display: 'background';
    className: string;
    extendedProps: any;
  }> = [];

  (Object.keys(WINDOWS) as PrayerName[]).forEach(name => {
    const t = pt[name];
    if (!t) return;
    const base = hhmmToDate(t, dayISO);
    const w = WINDOWS[name];
    const start = addMinutes(base, w.pre);
    const end = addMinutes(base, w.post);
    out.push({
      title: `نافذة ${w.label}`,
      start: start.toISOString(),
      end: end.toISOString(),
      display: 'background',
      className: 'bg-rose-200/50',
      extendedProps: { prayer: name, window: w }
    });
  });
  return out;
}

export type DragState = {
  id: string;
  mode: 'move' | 'resize-top' | 'resize-bottom';
  startY: number;
  origStart: number; // ms
  origEnd: number;   // ms
};

const SNAP_MIN = 15; // minutes
const PX_PER_MIN = 1.6; // adjust based on grid height

export function snapDeltaMins(deltaY: number): number {
  return Math.round((deltaY / PX_PER_MIN) / SNAP_MIN) * SNAP_MIN;
}

export function minutesSinceMidnight(iso: string): number {
  const d = new Date(iso);
  return d.getHours() * 60 + d.getMinutes();
}

export function isoWithDeltaMin(iso: string, deltaMin: number): string {
  const d = new Date(iso);
  d.setMinutes(d.getMinutes() + deltaMin);
  return d.toISOString();
}

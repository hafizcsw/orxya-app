/**
 * Time utilities for calendar view and scheduling
 */

export function minuteOfDay(d: Date): number {
  return d.getHours() * 60 + d.getMinutes();
}

export function addMinutes(d: Date, minutes: number): Date {
  const result = new Date(d);
  result.setMinutes(result.getMinutes() + minutes);
  return result;
}

export function startOfWeek(date: Date, _tz?: string): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = (day + 6) % 7; // Monday as first day
  d.setDate(d.getDate() - diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function endOfWeek(date: Date, _tz?: string): Date {
  const start = startOfWeek(date, _tz);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  end.setHours(23, 59, 59, 999);
  return end;
}

export function startOfMonth(date: Date): Date {
  const d = new Date(date);
  d.setDate(1);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function endOfMonth(date: Date): Date {
  const d = new Date(date);
  d.setMonth(d.getMonth() + 1, 0);
  d.setHours(23, 59, 59, 999);
  return d;
}

export function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function endOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
}

function hhmmToMin(hm?: string): number | null {
  if (!hm) return null;
  const [h, m] = hm.split(':').map(Number);
  return h * 60 + m;
}

interface PrayerTimes {
  fajr?: string;
  dhuhr?: string;
  asr?: string;
  maghrib?: string;
  isha?: string;
}

/**
 * Snap time away from prayer times if within guard range
 */
export function snapAwayFromPrayers(d: Date, pt?: PrayerTimes): Date {
  if (!pt) return d;
  
  const mins = minuteOfDay(d);
  const prayers = [pt.fajr, pt.dhuhr, pt.asr, pt.maghrib, pt.isha]
    .map(hhmmToMin)
    .filter((x): x is number => x != null);
  
  const GUARD = 10; // ±10 minutes guard
  const nearPrayer = prayers.find((p) => Math.abs(mins - p) <= GUARD);
  
  if (nearPrayer != null) {
    const dd = new Date(d);
    // Always snap to 15 minutes after prayer
    dd.setMinutes(nearPrayer + 15);
    return dd;
  }
  
  return d;
}

/**
 * Check if time is within prayer guard window
 */
export function isNearPrayer(d: Date, pt?: PrayerTimes): boolean {
  if (!pt) return false;
  
  const mins = minuteOfDay(d);
  const prayers = [pt.fajr, pt.dhuhr, pt.asr, pt.maghrib, pt.isha]
    .map(hhmmToMin)
    .filter((x): x is number => x != null);
  
  const GUARD = 10;
  return prayers.some((p) => Math.abs(mins - p) <= GUARD);
}

/**
 * Format date range for display
 */
export function formatDateRange(start: Date, end: Date): string {
  const startStr = start.toLocaleDateString('ar-SA', { 
    month: 'short', 
    day: 'numeric',
    year: start.getFullYear() !== end.getFullYear() ? 'numeric' : undefined
  });
  
  const endStr = end.toLocaleDateString('ar-SA', { 
    month: 'short', 
    day: 'numeric',
    year: 'numeric'
  });
  
  return `${startStr} - ${endStr}`;
}

/**
 * Get array of days between two dates
 */
export function getDaysInRange(start: Date, end: Date): Date[] {
  const days: Date[] = [];
  const current = new Date(start);
  
  while (current <= end) {
    days.push(new Date(current));
    current.setDate(current.getDate() + 1);
  }
  
  return days;
}

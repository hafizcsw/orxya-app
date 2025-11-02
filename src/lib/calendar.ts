// Calendar utilities for drag/resize

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

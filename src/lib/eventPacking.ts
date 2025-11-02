// Event packing algorithm for overlapping events and multi-day spanning

export type PackedEvent = {
  event: any;
  lane: number;
  laneCount: number;
  startMin: number;
  endMin: number;
  top: number;
  height: number;
  isAllDay: boolean;
  spanDays?: number; // For multi-day events
  dayOffset?: number; // Which day in the span
};

/**
 * Pack events into lanes for a single day
 * Similar to Google Calendar's layout algorithm
 */
export function packEventsIntoLanes(events: any[], date: Date, pxPerMin: number): PackedEvent[] {
  if (!events || events.length === 0) return [];

  const dayISO = date.toISOString().slice(0, 10);
  
  // Separate all-day and timed events
  const timedEvents = events.filter(e => !isAllDayEvent(e));
  const allDayEvents = events.filter(e => isAllDayEvent(e));

  // Pack timed events
  const packedTimed = packTimedEvents(timedEvents, pxPerMin);
  
  // Pack all-day events (simple stacking)
  const packedAllDay = allDayEvents.map((e, idx) => ({
    event: e,
    lane: idx,
    laneCount: allDayEvents.length,
    startMin: 0,
    endMin: 24 * 60,
    top: 0,
    height: 0,
    isAllDay: true,
    spanDays: getEventSpanDays(e, date),
    dayOffset: getEventDayOffset(e, date)
  }));

  return [...packedAllDay, ...packedTimed];
}

function packTimedEvents(events: any[], pxPerMin: number): PackedEvent[] {
  const list = events
    .map(e => ({
      event: e,
      startMin: toMinutes(e.starts_at || e.start_ts),
      endMin: Math.max(
        toMinutes(e.ends_at || e.end_ts),
        toMinutes(e.starts_at || e.start_ts) + 15
      )
    }))
    .sort((a, b) => a.startMin - b.startMin || a.endMin - b.endMin);

  const lanes: { endMin: number }[] = [];
  const packed: PackedEvent[] = [];

  for (const item of list) {
    // Remove lanes that have ended
    const activeLanes = lanes.filter(l => l.endMin > item.startMin);
    
    // Find first available lane
    let laneIdx = 0;
    const usedLanes = new Set(
      activeLanes.map((_, idx) => idx)
    );
    
    while (usedLanes.has(laneIdx)) {
      laneIdx++;
    }

    // Ensure lanes array is large enough
    while (lanes.length <= laneIdx) {
      lanes.push({ endMin: 0 });
    }
    
    lanes[laneIdx] = { endMin: item.endMin };

    packed.push({
      event: item.event,
      lane: laneIdx,
      laneCount: Math.max(laneIdx + 1, activeLanes.length + 1),
      startMin: item.startMin,
      endMin: item.endMin,
      top: item.startMin * pxPerMin,
      height: (item.endMin - item.startMin) * pxPerMin,
      isAllDay: false
    });
  }

  // Recalculate lane counts for overlapping groups
  recalculateLaneCounts(packed);

  return packed;
}

function recalculateLaneCounts(packed: PackedEvent[]) {
  // Group overlapping events
  const groups: PackedEvent[][] = [];
  
  for (const event of packed) {
    let foundGroup = false;
    
    for (const group of groups) {
      if (group.some(e => 
        e.startMin < event.endMin && e.endMin > event.startMin
      )) {
        group.push(event);
        foundGroup = true;
        break;
      }
    }
    
    if (!foundGroup) {
      groups.push([event]);
    }
  }

  // Update lane counts within each group
  for (const group of groups) {
    const maxLane = Math.max(...group.map(e => e.lane));
    for (const event of group) {
      event.laneCount = maxLane + 1;
    }
  }
}

function isAllDayEvent(event: any): boolean {
  if (!event.starts_at || !event.ends_at) return false;
  
  const start = new Date(event.starts_at);
  const end = new Date(event.ends_at);
  
  // All-day if duration >= 20 hours or starts at midnight
  const durationHours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
  const startsAtMidnight = start.getHours() === 0 && start.getMinutes() === 0;
  
  return durationHours >= 20 || startsAtMidnight;
}

function getEventSpanDays(event: any, currentDate: Date): number {
  const start = new Date(event.starts_at);
  const end = new Date(event.ends_at);
  
  const startDay = new Date(start.getFullYear(), start.getMonth(), start.getDate());
  const endDay = new Date(end.getFullYear(), end.getMonth(), end.getDate());
  
  const daysDiff = Math.ceil((endDay.getTime() - startDay.getTime()) / (1000 * 60 * 60 * 24));
  return Math.max(1, daysDiff + 1);
}

function getEventDayOffset(event: any, currentDate: Date): number {
  const start = new Date(event.starts_at);
  const current = new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate());
  const eventStart = new Date(start.getFullYear(), start.getMonth(), start.getDate());
  
  return Math.max(0, Math.floor((current.getTime() - eventStart.getTime()) / (1000 * 60 * 60 * 24)));
}

function toMinutes(iso: string): number {
  const d = new Date(iso);
  return d.getHours() * 60 + d.getMinutes();
}

/**
 * Calculate left position and width percentages for an event in its lane
 */
export function getLanePosition(packed: PackedEvent): { left: string; width: string } {
  const leftPct = (packed.lane / packed.laneCount) * 100;
  const widthPct = (1 / packed.laneCount) * 100 - 1; // -1% for margin

  return {
    left: `${leftPct}%`,
    width: `${widthPct}%`
  };
}

/**
 * Get current time indicator position in pixels
 */
export function getCurrentTimePosition(pxPerMin: number): number {
  const now = new Date();
  const minutes = now.getHours() * 60 + now.getMinutes();
  return minutes * pxPerMin;
}

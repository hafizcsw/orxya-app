// Calendar layout algorithm for positioning events in lanes (Google-like)
export function layoutDay(events: any[], date: Date) {
  const dayISO = date.toISOString().slice(0, 10);
  const dayStartMin = 0;
  const dayEndMin = 24 * 60;
  const pxPerHour = 64;
  const pxPerMin = pxPerHour / 60;

  const list = (events ?? [])
    .map(e => ({
      event: e,
      startMin: toMin(e.starts_at || e.start_ts),
      endMin: Math.max(toMin(e.ends_at || e.end_ts), toMin(e.starts_at || e.start_ts) + 15)
    }))
    .sort((a, b) => a.startMin - b.startMin);

  // Lane assignment algorithm
  const active: { endMin: number; laneIdx: number }[] = [];
  let nextLane = 0;
  const placed: any[] = [];

  for (const ev of list) {
    // Free lanes that have ended
    for (let i = active.length - 1; i >= 0; i--) {
      if (active[i].endMin <= ev.startMin) active.splice(i, 1);
    }

    // Assign lane
    const used = new Set(active.map(a => a.laneIdx));
    let laneIdx = 0;
    while (used.has(laneIdx)) laneIdx++;
    active.push({ endMin: ev.endMin, laneIdx });
    if (laneIdx >= nextLane) nextLane = laneIdx + 1;

    placed.push({
      event: ev.event,
      top: ev.startMin * pxPerMin,
      height: (ev.endMin - ev.startMin) * pxPerMin,
      laneIdx
    });
  }

  // Calculate lane widths
  const laneCount = Math.max(1, nextLane);
  placed.forEach(p => {
    p.laneLeftPct = (p.laneIdx / laneCount) * 100;
    p.laneWidthPct = (1 / laneCount) * 100 - 2; // -2% margin
  });

  return { 
    positioned: placed, 
    scale: { pxPerHour, pxPerMin, dayStartMin, dayEndMin } 
  };
}

function toMin(iso: string) {
  const d = new Date(iso);
  return d.getHours() * 60 + d.getMinutes();
}

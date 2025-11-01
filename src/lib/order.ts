// Order position utilities for Kanban-style ordering with numeric midpoints

export function midpoint(a: number, b: number): number {
  return (a + b) / 2;
}

export function nextOrderPos(list: { order_pos: number }[]): number {
  if (!list || list.length === 0) return 1000;
  const max = Math.max(...list.map(t => Number(t.order_pos)));
  return max + 1000;
}

export function normalizeOrder(list: { id: string; order_pos: number }[]): { id: string; order_pos: number }[] {
  if (!list || list.length === 0) return [];
  
  // Sort by current order_pos
  const sorted = [...list].sort((a, b) => Number(a.order_pos) - Number(b.order_pos));
  
  // Reassign with 1000 spacing
  return sorted.map((item, idx) => ({
    id: item.id,
    order_pos: (idx + 1) * 1000
  }));
}

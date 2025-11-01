import type { Task } from '@/types/project';

export function nextOrderPos(list: Task[]): number {
  const nums = list.map(t => Number(t.order_pos) || 0);
  const max = nums.length ? Math.max(...nums) : 0;
  return Math.ceil(max + 1000);
}

export function midpoint(a: number, b: number): number {
  return (Number(a) + Number(b)) / 2;
}

export function normalizeOrder(list: Task[]): { id: string; order_pos: number }[] {
  return list
    .sort((a, b) => Number(a.order_pos) - Number(b.order_pos))
    .map((t, i) => ({ id: t.id, order_pos: (i + 1) * 1000 }));
}

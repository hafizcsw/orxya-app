export function todayDubaiISO(): string {
  const s = new Date().toLocaleString("en-CA", { timeZone: "Asia/Dubai" });
  return s.split(",")[0];
}

export function startOfWeek(d: Date, weekStartsOn: number = 0) {
  const x = new Date(d); 
  const diff = (x.getDay() - weekStartsOn + 7) % 7; 
  x.setDate(x.getDate()-diff);
  x.setHours(0,0,0,0); 
  return x;
}

export function endOfWeek(d: Date, weekStartsOn: number = 0) {
  const s = startOfWeek(d, weekStartsOn); 
  const e = new Date(s); 
  e.setDate(e.getDate()+6); 
  e.setHours(23,59,59,999); 
  return e;
}

export function daysInMonth(y: number, m: number) {
  return new Date(y, m+1, 0).getDate();
}

export function startOfMonth(d: Date) {
  const x = new Date(d.getFullYear(), d.getMonth(), 1); 
  x.setHours(0,0,0,0); 
  return x;
}

export function endOfMonth(d: Date) {
  const x = new Date(d.getFullYear(), d.getMonth()+1, 0); 
  x.setHours(23,59,59,999); 
  return x;
}

export function addDays(d: Date, n: number) {
  const x = new Date(d); 
  x.setDate(x.getDate()+n); 
  return x;
}

export function toISODate(d: Date) { 
  return d.toISOString().slice(0,10); 
}

export function sameDay(a: Date, b: Date) { 
  return toISODate(a)===toISODate(b); 
}

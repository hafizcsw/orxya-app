export function todayDubaiISO(): string {
  const s = new Date().toLocaleString("en-CA", { timeZone: "Asia/Dubai" });
  // s = "YYYY-MM-DD, HH:MM:SS" typically; take first part
  return s.split(",")[0];
}

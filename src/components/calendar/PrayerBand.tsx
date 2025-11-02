export default function PrayerBand({
  prayers,
  scale
}: {
  prayers: { 
    fajr?: string; 
    dhuhr?: string; 
    asr?: string; 
    maghrib?: string; 
    isha?: string;
  } | null;
  scale: { pxPerMin: number };
}) {
  if (!prayers) return null;

  const labels: [keyof typeof prayers, string][] = [
    ["fajr", "الفجر"],
    ["dhuhr", "الظهر"],
    ["asr", "العصر"],
    ["maghrib", "المغرب"],
    ["isha", "العشاء"]
  ];

  const nodes = labels
    .filter(([k]) => prayers && prayers[k])
    .map(([k, label]) => {
      const timeStr = String(prayers![k]);
      const [hh, mm] = timeStr.split(":").map(Number);
      const minutes = hh * 60 + mm;
      const y = minutes * scale.pxPerMin;

      // Protection window ±20 minutes
      const bandTop = Math.max(0, (minutes - 20) * scale.pxPerMin);
      const bandH = 40 * scale.pxPerMin;

      return (
        <div key={k} className="pointer-events-none">
          <div
            className="absolute left-0 right-0 bg-amber-500/5 border-y border-amber-500/20"
            style={{ top: bandTop, height: bandH }}
          />
          <div
            className="absolute left-0 right-0 border-t-2 border-amber-500"
            style={{ top: y }}
          >
            <span className="absolute -top-2 left-1 text-[10px] bg-gradient-to-r from-amber-500 to-amber-600 text-white px-2 py-0.5 rounded-full shadow-md font-medium">
              🕌 {label} {timeStr}
            </span>
          </div>
        </div>
      );
    });

  // Current time line
  const now = new Date();
  const nowMin = now.getHours() * 60 + now.getMinutes();

  return (
    <div className="absolute inset-0 pointer-events-none z-10">
      {nodes}
      <div
        className="absolute left-0 right-0 border-t-2 border-destructive"
        style={{ top: nowMin * scale.pxPerMin }}
      >
        <div className="absolute -top-1.5 -left-1.5 w-3 h-3 rounded-full bg-destructive animate-pulse" />
      </div>
    </div>
  );
}

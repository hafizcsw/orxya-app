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
          {/* Prayer time window background */}
          <div
            className="absolute left-0 right-0 bg-gradient-to-r from-amber-500/5 via-amber-400/8 to-amber-500/5 border-y border-amber-500/20 backdrop-blur-sm"
            style={{ top: bandTop, height: bandH }}
          />
          
          {/* Prayer time line with glow effect */}
          <div
            className="absolute left-0 right-0 border-t-2 border-amber-500 shadow-lg shadow-amber-500/30"
            style={{ top: y }}
          >
            <span className="absolute -top-3 left-2 text-[10px] sm:text-xs bg-gradient-to-r from-amber-500 via-amber-400 to-amber-600 text-white px-3 py-1 rounded-full shadow-lg shadow-amber-500/40 font-bold backdrop-blur-sm border border-amber-300/30 flex items-center gap-1.5 animate-fade-in">
              <span className="text-sm">🕌</span>
              <span>{label}</span>
              <span className="opacity-90 font-medium">{timeStr}</span>
            </span>
          </div>
        </div>
      );
    });

  // Current time line - only show if it's today
  const now = new Date();
  const nowMin = now.getHours() * 60 + now.getMinutes();

  return (
    <div className="absolute inset-y-0 left-0 right-0 pointer-events-none">
      {nodes}
    </div>
  );
}

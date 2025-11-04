import { useCountdown } from '@/hooks/useCountdown';

type PrayerTimes = { 
  fajr?: string; 
  dhuhr?: string; 
  asr?: string; 
  maghrib?: string; 
  isha?: string;
};

export default function PrayerBand({
  prayers,
  scale
}: {
  prayers: PrayerTimes | null;
  scale: { pxPerMin: number };
}) {
  if (!prayers) return null;

  const now = new Date();
  const today = now.toISOString().split('T')[0];

  const labels: [keyof PrayerTimes, string][] = [
    ["fajr", "الفجر"],
    ["dhuhr", "الظهر"],
    ["asr", "العصر"],
    ["maghrib", "المغرب"],
    ["isha", "العشاء"]
  ];

  // إيجاد الصلاة القادمة
  const findNextPrayer = () => {
    const nowMinutes = now.getHours() * 60 + now.getMinutes();
    
    for (const [key, label] of labels) {
      const timeStr = prayers[key];
      if (!timeStr) continue;
      
      const [hh, mm] = timeStr.split(":").map(Number);
      const prayerMinutes = hh * 60 + mm;
      
      if (prayerMinutes > nowMinutes) {
        return { key, label, timeStr, minutes: prayerMinutes };
      }
    }
    return null;
  };

  const nextPrayer = findNextPrayer();

  const nodes = labels
    .filter(([k]) => prayers && prayers[k])
    .map(([k, label]) => {
      const timeStr = String(prayers![k]);
      const [hh, mm] = timeStr.split(":").map(Number);
      const minutes = hh * 60 + mm;
      const y = minutes * scale.pxPerMin;
      const isNext = nextPrayer?.key === k;
      const nowMinutes = now.getHours() * 60 + now.getMinutes();
      const isPast = minutes < nowMinutes;

      // Protection window ±20 minutes
      const bandTop = Math.max(0, (minutes - 20) * scale.pxPerMin);
      const bandH = 40 * scale.pxPerMin;

      // إنشاء تاريخ كامل للعداد التنازلي
      const prayerDateTime = `${today}T${timeStr.padStart(5, '0')}:00`;
      
      return (
        <PrayerTimeMarker
          key={k}
          label={label}
          timeStr={timeStr}
          y={y}
          bandTop={bandTop}
          bandH={bandH}
          isNext={isNext}
          isPast={isPast}
          prayerDateTime={prayerDateTime}
        />
      );
    });

  return (
    <div className="absolute inset-y-0 left-0 right-0 pointer-events-none">
      {nodes}
    </div>
  );
}

function PrayerTimeMarker({
  label,
  timeStr,
  y,
  bandTop,
  bandH,
  isNext,
  isPast,
  prayerDateTime
}: {
  label: string;
  timeStr: string;
  y: number;
  bandTop: number;
  bandH: number;
  isNext: boolean;
  isPast: boolean;
  prayerDateTime: string;
}) {
  const countdown = useCountdown(prayerDateTime);

  return (
    <div className="pointer-events-none">
      {/* Prayer time window background */}
      <div
        className={`absolute left-0 right-0 backdrop-blur-sm transition-all duration-500 ${
          isNext 
            ? 'bg-gradient-to-r from-emerald-500/15 via-emerald-400/20 to-emerald-500/15 border-y border-emerald-500/40'
            : isPast
            ? 'bg-gradient-to-r from-muted/5 via-muted/10 to-muted/5 border-y border-border/20'
            : 'bg-gradient-to-r from-amber-500/8 via-amber-400/12 to-amber-500/8 border-y border-amber-500/25'
        }`}
        style={{ top: bandTop, height: bandH }}
      />
      
      {/* Prayer time line with enhanced design */}
      <div
        className={`absolute left-0 right-0 transition-all duration-500 ${
          isNext 
            ? 'border-t-[3px] border-emerald-500 shadow-xl shadow-emerald-500/50'
            : isPast
            ? 'border-t-2 border-muted/40 shadow-md shadow-muted/20'
            : 'border-t-2 border-amber-500 shadow-lg shadow-amber-500/30'
        }`}
        style={{ top: y }}
      >
        <div className={`absolute -top-4 left-2 flex items-center gap-2 ${
          isNext ? 'animate-pulse' : ''
        }`}>
          {/* بطاقة الصلاة الرئيسية */}
          <span className={`text-xs sm:text-sm px-3 py-1.5 rounded-xl font-bold backdrop-blur-md border shadow-lg transition-all duration-500 flex items-center gap-2 ${
            isNext
              ? 'bg-gradient-to-r from-emerald-500 via-emerald-400 to-emerald-600 text-white border-emerald-300/40 shadow-emerald-500/50'
              : isPast
              ? 'bg-gradient-to-r from-muted/80 to-muted/60 text-muted-foreground border-border/30 shadow-muted/30'
              : 'bg-gradient-to-r from-amber-500 via-amber-400 to-amber-600 text-white border-amber-300/30 shadow-amber-500/40'
          }`}>
            <span className="text-base">🕌</span>
            <span>{label}</span>
            <span className="opacity-90 font-medium">{timeStr}</span>
          </span>

          {/* عداد تنازلي للصلاة القادمة فقط */}
          {isNext && !countdown.isNegative && countdown.total > 0 && (
            <span className="text-xs px-2.5 py-1 rounded-lg bg-white/90 text-emerald-600 font-bold shadow-md border border-emerald-200 backdrop-blur-sm animate-fade-in">
              {countdown.formattedShort}
            </span>
          )}

          {/* علامة للصلوات المنتهية */}
          {isPast && (
            <span className="text-xs px-2 py-1 rounded-lg bg-success/10 text-success font-medium border border-success/20">
              ✓
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

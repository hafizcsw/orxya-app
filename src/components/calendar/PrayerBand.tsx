import { useCountdown } from '@/hooks/useCountdown';
import { zIndex } from '@/lib/z-index';

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
    <div className="absolute inset-y-0 left-0 right-0 pointer-events-none" style={{ zIndex: zIndex.prayerBackground }}>
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
      {/* Prayer time window background - شفاف جداً بدون blur */}
      <div
        className={`absolute left-0 right-0 transition-colors duration-500 ${
          isNext 
            ? 'bg-emerald-500/[0.02] border-y border-emerald-500/8'
            : isPast
            ? 'bg-muted/[0.01] border-y border-border/5'
            : 'bg-amber-500/[0.02] border-y border-amber-500/6'
        }`}
        style={{ top: bandTop, height: bandH, zIndex: zIndex.prayerBackground }}
      />
      
      {/* Prayer time line - أرفع وأوضح */}
      <div
        className={`absolute left-0 right-0 transition-all duration-300 ${
          isNext 
            ? 'border-t border-emerald-500/40'
            : isPast
            ? 'border-t border-muted/20 border-dashed'
            : 'border-t border-amber-500/30'
        }`}
        style={{ top: y, zIndex: zIndex.prayerLines }}
      >
        {/* Badge - صغير جداً على الحافة اليسرى */}
        <div 
          className={`absolute -left-1 -top-3 pointer-events-auto ${isNext ? 'animate-pulse' : ''}`}
          style={{ zIndex: zIndex.prayerBadge }}
        >
          <span className={`
            inline-flex items-center gap-1 px-2 py-0.5 rounded-md
            text-[10px] font-semibold
            border shadow-sm
            ${isNext
              ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300'
              : isPast
              ? 'bg-muted/50 text-muted-foreground border-border/30'
              : 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950 dark:text-amber-300'
            }
          `}>
            <span className="text-xs">🕌</span>
            <span>{label}</span>
            <span className="opacity-70">{timeStr}</span>
          </span>
          
          {/* Countdown - منفصل وصغير */}
          {isNext && !countdown.isNegative && countdown.total > 0 && (
            <span className="ml-1 inline-flex px-1.5 py-0.5 rounded text-[9px] font-bold bg-white border border-emerald-200 text-emerald-600 dark:bg-emerald-950 dark:border-emerald-800">
              {countdown.formattedShort}
            </span>
          )}
          
          {/* علامة للصلوات المنتهية */}
          {isPast && (
            <span className="ml-1 inline-flex px-1 py-0.5 rounded text-[9px] font-medium bg-success/10 text-success border border-success/20">
              ✓
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

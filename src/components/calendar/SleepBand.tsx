type SleepBandProps = {
  sleepMinutes?: number;
  scale: { pxPerMin: number };
  date: string;
};

export default function SleepBand({ sleepMinutes, scale, date }: SleepBandProps) {
  if (!sleepMinutes) return null;

  // افتراض: النوم من 00:30 إلى (00:30 + sleepMinutes)
  // يمكن تحسين هذا لاحقاً بتتبع وقت النوم الفعلي
  const sleepStartMin = 30; // 00:30
  const sleepEndMin = sleepStartMin + sleepMinutes;
  
  const top = sleepStartMin * scale.pxPerMin;
  const height = sleepMinutes * scale.pxPerMin;

  return (
    <div className="absolute inset-0 pointer-events-none z-5">
      <div
        className="absolute left-0 right-0 bg-indigo-500/10 border-y border-indigo-400/30"
        style={{ top, height }}
      >
        <span className="absolute top-1 left-1 text-[10px] bg-indigo-500 text-white px-2 py-0.5 rounded-full shadow-sm">
          😴 نوم {Math.round(sleepMinutes / 60)}س
        </span>
      </div>
    </div>
  );
}

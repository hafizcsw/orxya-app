type Props = { fajr?: string; dhuhr?: string; asr?: string; maghrib?: string; isha?: string };

function hhmmToMinutes(hhmm?: string) {
  if (!hhmm) return null;
  const [h,m] = hhmm.split(":").map(n=>parseInt(n,10));
  return h*60 + m;
}

export default function DayPrayerOverlay({ fajr, dhuhr, asr, maghrib, isha }: Props) {
  const marks = [fajr, dhuhr, asr, maghrib, isha].map(hhmmToMinutes).filter(x=>x!=null) as number[];
  return (
    <div className="absolute inset-0 pointer-events-none">
      {marks.map((min, i) => {
        const top = (min/ (24*60)) * 100;
        return <div key={i} className="absolute left-0 right-0 h-[2px] bg-emerald-400/70" style={{ top: `${top}%` }} />;
      })}
    </div>
  );
}

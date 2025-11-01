type Props = {
  mode: "month"|"week";
  date: Date;
  onPrev: () => void;
  onNext: () => void;
  onToday: () => void;
  onMode: (m: "month"|"week") => void;
};

export default function CalendarHeader({ mode, date, onPrev, onNext, onToday, onMode }: Props) {
  const title = date.toLocaleDateString(undefined, { year: "numeric", month: "long" });
  return (
    <div className="mb-3 flex items-center justify-between gap-3 flex-wrap">
      <div className="flex items-center gap-2">
        <button className="px-2 py-1 rounded border hover:bg-secondary" onClick={onPrev} aria-label="Previous">←</button>
        <button className="px-2 py-1 rounded border hover:bg-secondary" onClick={onToday}>اليوم</button>
        <button className="px-2 py-1 rounded border hover:bg-secondary" onClick={onNext} aria-label="Next">→</button>
        <div className="text-lg font-semibold mx-2">{title}</div>
      </div>
      <div className="flex items-center gap-2">
        <button 
          className={`px-3 py-1.5 rounded border ${mode==="month"?"bg-primary text-primary-foreground":"hover:bg-secondary"}`} 
          onClick={()=>onMode("month")}
        >
          شهر
        </button>
        <button 
          className={`px-3 py-1.5 rounded border ${mode==="week"?"bg-primary text-primary-foreground":"hover:bg-secondary"}`} 
          onClick={()=>onMode("week")}
        >
          أسبوع
        </button>
      </div>
    </div>
  );
}

import { cn } from '@/lib/utils';

interface HeatmapDataPoint {
  day: string;
  hour: number;
  value: number;
}

interface HeatmapChartProps {
  data: HeatmapDataPoint[];
  days?: string[];
  hours?: number[];
  colorScale?: string[];
}

const DAYS = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
const HOURS = Array.from({ length: 24 }, (_, i) => i);

export function HeatmapChart({ 
  data, 
  days = DAYS,
  hours = HOURS,
  colorScale = [
    'hsl(var(--muted))',
    'hsl(var(--primary) / 0.3)',
    'hsl(var(--primary) / 0.6)',
    'hsl(var(--primary))'
  ]
}: HeatmapChartProps) {
  const getColor = (value: number) => {
    if (value === 0) return colorScale[0];
    if (value < 33) return colorScale[1];
    if (value < 66) return colorScale[2];
    return colorScale[3];
  };
  
  const getCellData = (day: string, hour: number) => {
    return data.find(d => d.day === day && d.hour === hour);
  };
  
  return (
    <div className="w-full overflow-x-auto">
      <div className="min-w-[600px] p-4">
        {/* Hours header */}
        <div className="flex gap-1 mb-2 pr-20">
          {hours.map(hour => (
            <div key={hour} className="flex-1 text-center">
              <span className="text-xs text-muted-foreground">{hour}</span>
            </div>
          ))}
        </div>
        
        {/* Heatmap grid */}
        <div className="space-y-1">
          {days.map(day => (
            <div key={day} className="flex gap-1 items-center">
              <div className="w-16 text-xs text-muted-foreground text-right">{day}</div>
              <div className="flex-1 flex gap-1">
                {hours.map(hour => {
                  const cellData = getCellData(day, hour);
                  const value = cellData?.value || 0;
                  
                  return (
                    <div
                      key={`${day}-${hour}`}
                      className={cn(
                        "flex-1 aspect-square rounded transition-all duration-200 hover:scale-110 cursor-pointer group relative"
                      )}
                      style={{ backgroundColor: getColor(value) }}
                    >
                      {/* Tooltip */}
                      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                        <div className="glass-effect rounded-lg p-2 border border-primary/20 whitespace-nowrap">
                          <p className="text-xs font-medium">{day} - {hour}:00</p>
                          <p className="text-xs text-muted-foreground">القيمة: {value}</p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
        
        {/* Legend */}
        <div className="flex items-center gap-2 mt-4 justify-center">
          <span className="text-xs text-muted-foreground">أقل</span>
          {colorScale.map((color, index) => (
            <div
              key={index}
              className="w-6 h-6 rounded"
              style={{ backgroundColor: color }}
            />
          ))}
          <span className="text-xs text-muted-foreground">أكثر</span>
        </div>
      </div>
    </div>
  );
}

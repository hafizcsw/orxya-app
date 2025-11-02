import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';

interface DataPoint {
  name: string;
  value: number;
  color?: string;
}

interface DonutChartProps {
  data: DataPoint[];
  height?: number;
  colors?: string[];
  innerRadius?: number;
  outerRadius?: number;
}

const COLORS = [
  "hsl(var(--primary))",
  "hsl(var(--accent))",
  "hsl(var(--success))",
  "hsl(var(--warning))",
  "hsl(var(--info))"
];

export function DonutChart({ 
  data, 
  height = 300,
  colors = COLORS,
  innerRadius = 60,
  outerRadius = 100
}: DonutChartProps) {
  const CustomTooltip = ({ active, payload }: any) => {
    if (!active || !payload?.[0]) return null;
    
    return (
      <div className="glass-effect rounded-xl p-4 border border-primary/20">
        <p className="text-sm font-medium text-muted-foreground">{payload[0].name}</p>
        <p className="text-2xl font-bold gradient-text mt-1">{payload[0].value}</p>
        <p className="text-xs text-muted-foreground mt-1">
          {((payload[0].value / data.reduce((sum, item) => sum + item.value, 0)) * 100).toFixed(1)}%
        </p>
      </div>
    );
  };
  
  const total = data.reduce((sum, item) => sum + item.value, 0);
  
  return (
    <div className="relative" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={innerRadius}
            outerRadius={outerRadius}
            paddingAngle={3}
            dataKey="value"
            animationDuration={1000}
          >
            {data.map((entry, index) => (
              <Cell 
                key={`cell-${index}`} 
                fill={entry.color || colors[index % colors.length]}
                className="hover:opacity-80 transition-opacity cursor-pointer"
                stroke="hsl(var(--background))"
                strokeWidth={2}
              />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
        </PieChart>
      </ResponsiveContainer>
      
      {/* Center Label */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="text-center">
          <div className="text-3xl font-bold gradient-text">{total}</div>
          <div className="text-xs text-muted-foreground mt-1">الإجمالي</div>
        </div>
      </div>
    </div>
  );
}

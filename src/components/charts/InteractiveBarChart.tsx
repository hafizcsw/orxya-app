import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

interface DataPoint {
  name: string;
  value: number;
  color?: string;
  [key: string]: any;
}

interface InteractiveBarChartProps {
  data: DataPoint[];
  dataKey?: string;
  height?: number;
  colors?: string[];
  onClick?: (data: DataPoint) => void;
}

export function InteractiveBarChart({ 
  data, 
  dataKey = 'value',
  height = 300,
  colors = ["hsl(var(--primary))", "hsl(var(--accent))", "hsl(var(--success))"],
  onClick
}: InteractiveBarChartProps) {
  const CustomTooltip = ({ active, payload }: any) => {
    if (!active || !payload?.[0]) return null;
    
    return (
      <div className="glass-effect rounded-xl p-4 border border-primary/20">
        <p className="text-sm font-medium text-muted-foreground">{payload[0].payload.name}</p>
        <p className="text-2xl font-bold gradient-text mt-1">{payload[0].value}</p>
      </div>
    );
  };
  
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
        <defs>
          {colors.map((color, index) => (
            <linearGradient key={index} id={`barGradient${index}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={color} stopOpacity={0.9}/>
              <stop offset="95%" stopColor={color} stopOpacity={0.6}/>
            </linearGradient>
          ))}
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
        <XAxis 
          dataKey="name" 
          stroke="hsl(var(--muted-foreground))"
          style={{ fontSize: '12px' }}
        />
        <YAxis 
          stroke="hsl(var(--muted-foreground))"
          style={{ fontSize: '12px' }}
        />
        <Tooltip content={<CustomTooltip />} />
        <Bar 
          dataKey={dataKey} 
          radius={[12, 12, 0, 0]}
          animationDuration={1000}
          onClick={onClick}
          cursor="pointer"
        >
          {data.map((entry, index) => (
            <Cell 
              key={`cell-${index}`} 
              fill={entry.color || `url(#barGradient${index % colors.length})`}
              className="hover:opacity-80 transition-opacity"
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

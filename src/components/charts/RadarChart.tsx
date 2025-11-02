import { RadarChart as RechartsRadar, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, ResponsiveContainer, Tooltip } from 'recharts';

interface DataPoint {
  subject: string;
  value: number;
  fullMark: number;
}

interface RadarChartProps {
  data: DataPoint[];
  height?: number;
  color?: string;
}

export function RadarChart({ 
  data, 
  height = 400,
  color = "hsl(var(--primary))"
}: RadarChartProps) {
  const CustomTooltip = ({ active, payload }: any) => {
    if (!active || !payload?.[0]) return null;
    
    return (
      <div className="glass-effect rounded-xl p-3 border border-primary/20">
        <p className="text-sm font-medium text-foreground">{payload[0].payload.subject}</p>
        <p className="text-lg font-bold gradient-text">{payload[0].value} / {payload[0].payload.fullMark}</p>
      </div>
    );
  };
  
  return (
    <ResponsiveContainer width="100%" height={height}>
      <RechartsRadar data={data}>
        <PolarGrid stroke="hsl(var(--border))" />
        <PolarAngleAxis 
          dataKey="subject" 
          stroke="hsl(var(--foreground))"
          style={{ fontSize: '12px' }}
        />
        <PolarRadiusAxis 
          angle={90} 
          domain={[0, 100]}
          stroke="hsl(var(--muted-foreground))"
          style={{ fontSize: '10px' }}
        />
        <Radar 
          name="Performance" 
          dataKey="value" 
          stroke={color}
          fill={color}
          fillOpacity={0.3}
          strokeWidth={2}
          animationDuration={1000}
        />
        <Tooltip content={<CustomTooltip />} />
      </RechartsRadar>
    </ResponsiveContainer>
  );
}

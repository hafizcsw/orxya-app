import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { HolographicCard } from '@/components/ui/HolographicCard'
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart } from 'recharts'
import { TrendingUp, Activity, Heart, DollarSign } from 'lucide-react'
import { useDeviceType } from '@/hooks/useDeviceType'
import { cn } from '@/lib/utils'

interface TrendsChartProps {
  data: any[]
  period: 'weekly' | 'monthly' | 'yearly'
}

export function TrendsChart({ data, period }: TrendsChartProps) {
  const device = useDeviceType()

  // Transform data for charts
  const chartData = data.map(item => ({
    day: new Date(item.day).toLocaleDateString('ar', { 
      month: 'short', 
      day: 'numeric' 
    }),
    income: item.income_usd || 0,
    spend: item.spend_usd || 0,
    net: item.net_usd || 0,
    study: item.study_hours || 0,
    mma: item.mma_hours || 0,
    work: item.work_hours || 0,
    walk: item.walk_min ? item.walk_min / 60 : 0,
    sleep: item.sleep_hours || 0,
    recovery: item.recovery_score || 0,
  }))

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload) return null
    
    return (
      <div className="card-glass p-3 rounded-xl border border-border/50 shadow-xl">
        <p className="text-xs font-semibold mb-2">{label}</p>
        {payload.map((entry: any, index: number) => (
          <p key={index} className="text-xs flex items-center gap-2">
            <span 
              className="w-2 h-2 rounded-full" 
              style={{ backgroundColor: entry.color }}
            />
            <span className="text-muted-foreground">{entry.name}:</span>
            <span className="font-bold">{entry.value.toFixed(1)}</span>
          </p>
        ))}
      </div>
    )
  }

  const chartHeight = device === 'mobile' ? 250 : device === 'tablet' ? 300 : 350

  return (
    <HolographicCard variant="glass" className="overflow-hidden">
      <Tabs defaultValue="financial" dir="rtl" className="w-full">
        <div className="border-b border-border/50 px-4 pt-4">
          <TabsList className={cn(
            "w-full grid h-auto",
            device === 'mobile' ? "grid-cols-2 gap-1" : "grid-cols-4 gap-2"
          )}>
            <TabsTrigger 
              value="financial" 
              className={cn(
                "flex items-center gap-2 data-[state=active]:bg-[hsl(var(--whoop-blue))] data-[state=active]:text-white",
                device === 'mobile' ? "text-xs px-2 py-2" : "text-sm"
              )}
            >
              <DollarSign className={cn(device === 'mobile' ? "w-3 h-3" : "w-4 h-4")} />
              {device !== 'mobile' && <span>المالية</span>}
            </TabsTrigger>
            <TabsTrigger 
              value="activities"
              className={cn(
                "flex items-center gap-2 data-[state=active]:bg-[hsl(var(--whoop-green))] data-[state=active]:text-white",
                device === 'mobile' ? "text-xs px-2 py-2" : "text-sm"
              )}
            >
              <Activity className={cn(device === 'mobile' ? "w-3 h-3" : "w-4 h-4")} />
              {device !== 'mobile' && <span>الأنشطة</span>}
            </TabsTrigger>
            <TabsTrigger 
              value="health"
              className={cn(
                "flex items-center gap-2 data-[state=active]:bg-[hsl(var(--whoop-red))] data-[state=active]:text-white",
                device === 'mobile' ? "text-xs px-2 py-2" : "text-sm"
              )}
            >
              <Heart className={cn(device === 'mobile' ? "w-3 h-3" : "w-4 h-4")} />
              {device !== 'mobile' && <span>الصحة</span>}
            </TabsTrigger>
            <TabsTrigger 
              value="overview"
              className={cn(
                "flex items-center gap-2 data-[state=active]:bg-[hsl(var(--whoop-yellow))] data-[state=active]:text-white",
                device === 'mobile' ? "text-xs px-2 py-2" : "text-sm"
              )}
            >
              <TrendingUp className={cn(device === 'mobile' ? "w-3 h-3" : "w-4 h-4")} />
              {device !== 'mobile' && <span>الموجز</span>}
            </TabsTrigger>
          </TabsList>
        </div>

        <div className="p-4">
          {/* Financial Tab */}
          <TabsContent value="financial" className="mt-0">
            <ResponsiveContainer width="100%" height={chartHeight}>
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="incomeGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--whoop-green))" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="hsl(var(--whoop-green))" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="spendGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--whoop-red))" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="hsl(var(--whoop-red))" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                <XAxis 
                  dataKey="day" 
                  stroke="hsl(var(--muted-foreground))" 
                  fontSize={device === 'mobile' ? 10 : 12}
                  tick={{ fill: 'hsl(var(--muted-foreground))' }}
                />
                <YAxis 
                  stroke="hsl(var(--muted-foreground))" 
                  fontSize={device === 'mobile' ? 10 : 12}
                  tick={{ fill: 'hsl(var(--muted-foreground))' }}
                />
                <Tooltip content={<CustomTooltip />} />
                <Area
                  type="monotone"
                  dataKey="income"
                  name="الدخل"
                  stroke="hsl(var(--whoop-green))"
                  strokeWidth={2}
                  fill="url(#incomeGradient)"
                />
                <Area
                  type="monotone"
                  dataKey="spend"
                  name="المصروف"
                  stroke="hsl(var(--whoop-red))"
                  strokeWidth={2}
                  fill="url(#spendGradient)"
                />
                <Line
                  type="monotone"
                  dataKey="net"
                  name="الصافي"
                  stroke="hsl(var(--whoop-blue))"
                  strokeWidth={3}
                  dot={{ fill: 'hsl(var(--whoop-blue))', r: 4 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </TabsContent>

          {/* Activities Tab */}
          <TabsContent value="activities" className="mt-0">
            <ResponsiveContainer width="100%" height={chartHeight}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                <XAxis 
                  dataKey="day" 
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={device === 'mobile' ? 10 : 12}
                  tick={{ fill: 'hsl(var(--muted-foreground))' }}
                />
                <YAxis 
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={device === 'mobile' ? 10 : 12}
                  tick={{ fill: 'hsl(var(--muted-foreground))' }}
                />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="study" name="الدراسة" stackId="a" fill="hsl(var(--whoop-blue))" radius={[0, 0, 0, 0]} />
                <Bar dataKey="work" name="العمل" stackId="a" fill="hsl(var(--whoop-yellow))" radius={[0, 0, 0, 0]} />
                <Bar dataKey="mma" name="الرياضة" stackId="a" fill="hsl(var(--whoop-green))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </TabsContent>

          {/* Health Tab */}
          <TabsContent value="health" className="mt-0">
            <ResponsiveContainer width="100%" height={chartHeight}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                <XAxis 
                  dataKey="day" 
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={device === 'mobile' ? 10 : 12}
                  tick={{ fill: 'hsl(var(--muted-foreground))' }}
                />
                <YAxis 
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={device === 'mobile' ? 10 : 12}
                  tick={{ fill: 'hsl(var(--muted-foreground))' }}
                />
                <Tooltip content={<CustomTooltip />} />
                <Line 
                  type="monotone" 
                  dataKey="sleep" 
                  name="النوم (ساعة)" 
                  stroke="hsl(280 100% 60%)" 
                  strokeWidth={2}
                  dot={{ fill: 'hsl(280 100% 60%)', r: 3 }}
                />
                <Line 
                  type="monotone" 
                  dataKey="recovery" 
                  name="الاستشفاء (%)" 
                  stroke="hsl(330 100% 50%)" 
                  strokeWidth={2}
                  dot={{ fill: 'hsl(330 100% 50%)', r: 3 }}
                />
                <Line 
                  type="monotone" 
                  dataKey="walk" 
                  name="المشي (ساعة)" 
                  stroke="hsl(var(--whoop-red))" 
                  strokeWidth={2}
                  dot={{ fill: 'hsl(var(--whoop-red))', r: 3 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </TabsContent>

          {/* Overview Tab */}
          <TabsContent value="overview" className="mt-0">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="card-glass p-4 rounded-xl text-center">
                <p className="text-xs text-muted-foreground mb-1">متوسط الدخل</p>
                <p className="text-2xl font-bold text-[hsl(var(--whoop-green))]">
                  ${(chartData.reduce((sum, d) => sum + d.income, 0) / chartData.length).toFixed(0)}
                </p>
              </div>
              <div className="card-glass p-4 rounded-xl text-center">
                <p className="text-xs text-muted-foreground mb-1">متوسط المصروف</p>
                <p className="text-2xl font-bold text-[hsl(var(--whoop-red))]">
                  ${(chartData.reduce((sum, d) => sum + d.spend, 0) / chartData.length).toFixed(0)}
                </p>
              </div>
              <div className="card-glass p-4 rounded-xl text-center">
                <p className="text-xs text-muted-foreground mb-1">متوسط العمل</p>
                <p className="text-2xl font-bold text-[hsl(var(--whoop-yellow))]">
                  {(chartData.reduce((sum, d) => sum + d.work, 0) / chartData.length).toFixed(1)}h
                </p>
              </div>
              <div className="card-glass p-4 rounded-xl text-center">
                <p className="text-xs text-muted-foreground mb-1">متوسط النوم</p>
                <p className="text-2xl font-bold text-purple-500">
                  {(chartData.reduce((sum, d) => sum + d.sleep, 0) / chartData.length).toFixed(1)}h
                </p>
              </div>
            </div>
          </TabsContent>
        </div>
      </Tabs>
    </HolographicCard>
  )
}

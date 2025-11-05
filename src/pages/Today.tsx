import { useEffect, useState } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { enqueueCommand } from '@/lib/offline-actions'
import { genIdem } from '@/lib/sync'
import { useUser } from '@/lib/auth'
import { Toast } from '@/components/Toast'
import { track } from '@/lib/telemetry'
import { SessionBanner } from '@/components/SessionBanner'
import { LocalNotifications } from '@capacitor/local-notifications'
import { ensureNotificationPerms } from '@/lib/notify'
import { Protected } from '@/components/Protected'
import { NeonButton } from '@/components/ui/NeonButton'
import { HolographicCard } from '@/components/ui/HolographicCard'
import { GlassPanel } from '@/components/ui/GlassPanel'
import { StatRing } from '@/components/oryxa/StatRing'
import { BackgroundAI } from '@/components/oryxa/BackgroundAI'
import { cn } from '@/lib/utils'
import { Bell, Calendar, DollarSign, TrendingUp, TrendingDown, Clock, Dumbbell, BookOpen, Footprints, Award, Building, Edit2, BarChart3, User, Moon, Heart, Plus, Briefcase } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { z } from 'zod'
import { useSelectedDate } from '@/contexts/DateContext'
import { useDeviceType } from '@/hooks/useDeviceType'
import { PlanCard } from '@/components/plans/PlanCard'
import { PlanFormDialog } from '@/components/plans/PlanFormDialog'
import { PlansAnalytics } from '@/components/plans/PlansAnalytics'
import { BusinessPlan, BusinessPlanFormData } from '@/types/business-plan'
import { GlancesBar } from '@/components/glances/GlancesBar'
import { getUserFlags } from '@/lib/featureFlags'
import { TrendsChart } from '@/components/charts/TrendsChart'
import { ComparisonCard } from '@/components/dashboard/ComparisonCard'
import { SmartInsight } from '@/components/dashboard/SmartInsight'
import { generateInsights } from '@/lib/utils'

// Validation schemas
const dailyLogSchema = z.object({
  work_hours: z.number().min(0).max(24),
  study_hours: z.number().min(0).max(24),
  mma_hours: z.number().min(0).max(24),
  walk_min: z.number().min(0).max(1440),
  notes: z.string().max(500).optional()
})

const financeSchema = z.object({
  type: z.enum(['income', 'spend']),
  amount_usd: z.number().min(0),
  category: z.string().max(100).optional(),
  note: z.string().max(500).optional()
})

const salesSchema = z.object({
  type: z.enum(['scholarship', 'villa', 'other']),
  item: z.string().max(200).optional(),
  qty: z.number().int().min(1),
  price_usd: z.number().min(0),
  profit_usd: z.number().min(0)
})

const Today = () => {
  const { user } = useUser()
  const navigate = useNavigate()
  const { selectedDate } = useSelectedDate()
  const device = useDeviceType()
  const [loading, setLoading] = useState(false)
  const [report, setReport] = useState<any | null>(null)
  const [rawDailyData, setRawDailyData] = useState<any[]>([])
  const [comparisonData, setComparisonData] = useState<any | null>(null)
  const [period, setPeriod] = useState<'daily' | 'weekly' | 'monthly' | 'yearly'>('daily')
  const [toast, setToast] = useState<string | null>(null)
  const [editingField, setEditingField] = useState<string | null>(null)
  const [editValue, setEditValue] = useState<any>('')
  const [editingBalance, setEditingBalance] = useState(false)
  const [balanceValue, setBalanceValue] = useState('')
  const [isScrolled, setIsScrolled] = useState(false)
  
  // Plans management state
  const [plans, setPlans] = useState<BusinessPlan[]>([])
  const [showPlanForm, setShowPlanForm] = useState(false)
  const [editingPlan, setEditingPlan] = useState<BusinessPlan | null>(null)
  const [showAnalytics, setShowAnalytics] = useState(false)
  const [plansLoading, setPlansLoading] = useState(false)
  
  // Glances state
  const [showGlances, setShowGlances] = useState(false)

  // Responsive sizing helpers - محسّنة
  const getFinancialRingSize = () => {
    if (device === 'mobile') return 'sm'      // 100px بدلاً من md
    if (device === 'tablet') return 'md'      // 120px
    return 'lg'                               // 180px
  }

  const getDailyRingSize = () => {
    if (device === 'mobile') return 'sm'      // 100px
    if (device === 'tablet') return 'sm'      // 100px
    return 'md'                               // 120px
  }

  // تقليل الـ Animations على الموبايل
  const shouldAnimate = device !== 'mobile' || 
    !window.matchMedia('(prefers-reduced-motion: reduce)').matches

  async function fetchReport() {
    if (!user) return
    setLoading(true)
    try {
      const dateStr = selectedDate.toISOString().slice(0, 10)
      let startDate = dateStr
      let endDate = dateStr
      
      // Calculate date ranges based on period
      if (period === 'weekly') {
        const date = new Date(selectedDate)
        const day = date.getDay()
        const diff = date.getDate() - day + (day === 0 ? -6 : 1) // Monday as first day
        const monday = new Date(date.setDate(diff))
        startDate = monday.toISOString().slice(0, 10)
        
        const sunday = new Date(monday)
        sunday.setDate(monday.getDate() + 6)
        endDate = sunday.toISOString().slice(0, 10)
      } else if (period === 'monthly') {
        const date = new Date(selectedDate)
        startDate = new Date(date.getFullYear(), date.getMonth(), 1).toISOString().slice(0, 10)
        endDate = new Date(date.getFullYear(), date.getMonth() + 1, 0).toISOString().slice(0, 10)
      } else if (period === 'yearly') {
        const date = new Date(selectedDate)
        startDate = new Date(date.getFullYear(), 0, 1).toISOString().slice(0, 10)
        endDate = new Date(date.getFullYear(), 11, 31).toISOString().slice(0, 10)
      }
      
      const { data, error } = await supabase.functions.invoke('report-daily', {
        body: { 
          start: startDate,
          end: endDate
        }
      })
      if (error) throw error
      
      // For daily, take first item; for others, aggregate the data
      if (period === 'daily') {
        setReport(data?.items?.[0] ?? null)
        setRawDailyData([])
      } else {
        // Aggregate data for weekly/monthly/yearly
        const items = data?.items || []
        setRawDailyData(items) // Store raw data for charts
        
        if (items.length > 0) {
          const aggregated = {
            current_balance: items[items.length - 1]?.current_balance || 0,
            total_income: items.reduce((sum: number, item: any) => sum + (item.total_income || 0), 0),
            total_spend: items.reduce((sum: number, item: any) => sum + (item.total_spend || 0), 0),
            income_usd: items.reduce((sum: number, item: any) => sum + (item.income_usd || 0), 0),
            spend_usd: items.reduce((sum: number, item: any) => sum + (item.spend_usd || 0), 0),
            net_usd: items.reduce((sum: number, item: any) => sum + (item.net_usd || 0), 0),
            study_hours: items.reduce((sum: number, item: any) => sum + (item.study_hours || 0), 0),
            mma_hours: items.reduce((sum: number, item: any) => sum + (item.mma_hours || 0), 0),
            work_hours: items.reduce((sum: number, item: any) => sum + (item.work_hours || 0), 0),
            walk_min: items.reduce((sum: number, item: any) => sum + (item.walk_min || 0), 0),
            sleep_hours: items.reduce((sum: number, item: any) => sum + (item.sleep_hours || 0), 0) / items.length,
            recovery_score: items.reduce((sum: number, item: any) => sum + (item.recovery_score || 0), 0) / items.length,
          }
          setReport(aggregated)
        } else {
          setReport(null)
        }
      }
      
      // Fetch comparison data if not daily
      if (period !== 'daily') {
        await fetchComparisonData(startDate, endDate)
      } else {
        setComparisonData(null)
      }
      
      track('report_loaded', { hasReport: !!data?.items?.[0], period, startDate, endDate })
    } catch (e: any) {
      setReport(null)
    } finally { setLoading(false) }
  }

  async function fetchComparisonData(currentStart: string, currentEnd: string) {
    if (!user) return
    try {
      let prevStart: Date, prevEnd: Date
      const startDate = new Date(currentStart)
      const endDate = new Date(currentEnd)
      
      if (period === 'weekly') {
        prevStart = new Date(startDate)
        prevStart.setDate(prevStart.getDate() - 7)
        prevEnd = new Date(endDate)
        prevEnd.setDate(prevEnd.getDate() - 7)
      } else if (period === 'monthly') {
        prevStart = new Date(startDate)
        prevStart.setMonth(prevStart.getMonth() - 1)
        prevEnd = new Date(endDate)
        prevEnd.setMonth(prevEnd.getMonth() - 1)
      } else if (period === 'yearly') {
        prevStart = new Date(startDate)
        prevStart.setFullYear(prevStart.getFullYear() - 1)
        prevEnd = new Date(endDate)
        prevEnd.setFullYear(prevEnd.getFullYear() - 1)
      } else {
        return
      }
      
      const { data, error } = await supabase.functions.invoke('report-daily', {
        body: { 
          start: prevStart.toISOString().slice(0, 10),
          end: prevEnd.toISOString().slice(0, 10)
        }
      })
      
      if (error) throw error
      
      const items = data?.items || []
      if (items.length > 0) {
        const aggregated = {
          income_usd: items.reduce((sum: number, item: any) => sum + (item.income_usd || 0), 0),
          spend_usd: items.reduce((sum: number, item: any) => sum + (item.spend_usd || 0), 0),
          net_usd: items.reduce((sum: number, item: any) => sum + (item.net_usd || 0), 0),
          work_hours: items.reduce((sum: number, item: any) => sum + (item.work_hours || 0), 0),
          study_hours: items.reduce((sum: number, item: any) => sum + (item.study_hours || 0), 0),
          mma_hours: items.reduce((sum: number, item: any) => sum + (item.mma_hours || 0), 0),
          sleep_hours: items.reduce((sum: number, item: any) => sum + (item.sleep_hours || 0), 0) / items.length,
        }
        setComparisonData(aggregated)
      }
    } catch (e) {
      console.error('Error fetching comparison data:', e)
      setComparisonData(null)
    }
  }

  useEffect(() => { 
    if (user) {
      fetchReport()
      fetchPlans()
      checkGlancesFlag()
    }
  }, [user?.id, period, selectedDate])

  async function checkGlancesFlag() {
    const flags = await getUserFlags()
    setShowGlances(!!flags.ff_glances)
  }

  async function fetchPlans() {
    if (!user) return
    setPlansLoading(true)
    try {
      console.log('[fetchPlans] Starting request...');
      const { data, error } = await supabase.functions.invoke('plans-manage', {
        body: { action: 'list' }
      })
      console.log('[fetchPlans] Response:', { data, error });
      if (error) throw error
      setPlans(data?.plans || [])
    } catch (e: any) {
      console.error('[fetchPlans] Error:', e)
      setToast('حدث خطأ في تحميل الخطط ❌')
    } finally {
      setPlansLoading(false)
    }
  }

  async function addPlan(planData: BusinessPlanFormData) {
    if (!user) return
    try {
      const { error } = await supabase.functions.invoke('plans-manage', {
        body: { action: 'create', ...planData }
      })
      if (error) throw error
      await fetchPlans()
      setToast('تمت إضافة الخطة بنجاح! ✅')
    } catch (e: any) {
      setToast('حدث خطأ ❌')
    }
  }

  async function updatePlan(id: string, planData: BusinessPlanFormData) {
    if (!user) return
    try {
      const { error } = await supabase.functions.invoke('plans-manage', {
        body: { action: 'update', id, ...planData }
      })
      if (error) throw error
      await fetchPlans()
      setToast('تم التحديث ✅')
    } catch (e: any) {
      setToast('حدث خطأ ❌')
    }
  }

  async function deletePlan(id: string) {
    if (!user) return
    try {
      const { error } = await supabase.functions.invoke('plans-manage', {
        body: { action: 'delete', id }
      })
      if (error) throw error
      await fetchPlans()
      setToast('تم الحذف ✅')
    } catch (e: any) {
      setToast('حدث خطأ ❌')
    }
  }

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 50) {
        setIsScrolled(true)
      } else {
        setIsScrolled(false)
      }
    }

    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  async function updateField(field: string, value: any) {
    if (!user) return
    const today = new Date().toISOString().slice(0, 10)
    
    try {
      const parsedValue = Number(value)
      if (isNaN(parsedValue) || parsedValue < 0) {
        setToast('❌ قيمة غير صحيحة')
        return
      }

      const { data: existing } = await supabase
        .from('daily_logs')
        .select('id')
        .eq('owner_id', user.id)
        .eq('log_date', today)
        .maybeSingle()
      
      if (existing) {
        const { error } = await supabase
          .from('daily_logs')
          .update({ [field]: parsedValue })
          .eq('id', existing.id)
        if (error) throw error
      } else {
        const { error } = await supabase
          .from('daily_logs')
          .insert({
            owner_id: user.id,
            log_date: today,
            [field]: parsedValue
          })
        if (error) throw error
      }
      
      setToast('تم التحديث ✅')
      setEditingField(null)
      await fetchReport()
    } catch (error: any) {
      setToast('❌ حدث خطأ في التحديث')
    }
  }

  async function updateBalance(value: string) {
    if (!user) return
    
    const parsedAmount = Number(value);
    if (isNaN(parsedAmount)) {
      setToast('❌ قيمة غير صحيحة');
      return;
    }
    
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ initial_balance_usd: parsedAmount })
        .eq('id', user.id);
      
      if (error) throw error;
      
      setToast('تم تحديث الرصيد ✅');
      setEditingBalance(false);
      await fetchReport();
    } catch (error: any) {
      console.error('Error updating balance:', error);
      setToast('❌ حدث خطأ في الحفظ');
    }
  }

  async function sendCommand(command: 'add_daily_log' | 'add_finance' | 'add_sale', payload: any) {
    try {
      if (command === 'add_daily_log') {
        dailyLogSchema.parse(payload)
      } else if (command === 'add_finance') {
        financeSchema.parse(payload)
      } else if (command === 'add_sale') {
        salesSchema.parse(payload)
      }

      const { error } = await supabase.functions.invoke('commands', {
        body: { command, idempotency_key: genIdem(), payload }
      })
      if (error) throw error
      setToast('تم الحفظ ✅')
      track('command_sent', { command })
      await fetchReport()
    } catch (error: any) {
      if (error.name === 'ZodError') {
        setToast('❌ البيانات المدخلة غير صحيحة')
        return
      }
      await enqueueCommand(command, payload)
      track('command_queued_offline', { command })
      setToast('تم الحفظ أوفلاين وسيُرفع بعد تسجيل الدخول/الاتصال 🔄')
    }
  }

  const renderEditableCard = (field: string, icon: any, label: string, value: any, iconBgClass: string, suffix: string = '', step: number = 0.5) => {
    const isEditing = editingField === field
    
    return (
      <GlassPanel 
        blur="md" 
        padding={device === 'mobile' ? 'sm' : 'md'}
        className="group relative overflow-hidden hover:scale-105 transition-all duration-300"
      >
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-accent/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
        
        <div className="relative z-10">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs uppercase tracking-wider text-muted-foreground font-medium">
              {label}
            </span>
            <div className="flex items-center gap-2">
              {!isEditing && (
                <NeonButton
                  variant="ghost"
                  size="sm"
                  glow={false}
                  className="opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={() => {
                    setEditingField(field)
                    setEditValue(value || 0)
                  }}
                >
                  <Edit2 className="w-4 h-4" />
                </NeonButton>
              )}
              <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-all group-hover:scale-110 group-hover:shadow-[0_0_20px_currentColor] duration-300 ${iconBgClass}`}>
                {icon}
              </div>
            </div>
          </div>
          
          {isEditing ? (
            <div className="space-y-2">
              <input
                type="number"
                step={step}
                min="0"
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                className="input w-full text-2xl font-bold bg-background/80 backdrop-blur-sm border-2 focus:border-primary focus:shadow-[0_0_20px_hsl(var(--primary)/0.3)] transition-all"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    updateField(field, editValue)
                  } else if (e.key === 'Escape') {
                    setEditingField(null)
                  }
                }}
              />
              <div className="flex gap-2">
                <NeonButton
                  size="sm"
                  variant="primary"
                  onClick={() => updateField(field, editValue)}
                  className="flex-1"
                >
                  حفظ
                </NeonButton>
                <NeonButton
                  size="sm"
                  variant="ghost"
                  glow={false}
                  onClick={() => setEditingField(null)}
                  className="flex-1"
                >
                  إلغاء
                </NeonButton>
              </div>
            </div>
          ) : (
            <div
              className="text-3xl font-bold mb-2 bg-gradient-to-r from-foreground via-primary to-foreground bg-clip-text text-transparent cursor-pointer hover:scale-105 transition-transform animate-shimmer bg-[length:200%_auto]"
              onClick={() => {
                setEditingField(field)
                setEditValue(value || 0)
              }}
            >
              {suffix === '$' ? '$' : ''}{value || 0}{suffix !== '$' ? suffix : ''}
            </div>
          )}
        </div>
      </GlassPanel>
    )
  }

  return (
    <Protected>
      <div className="min-h-screen bg-background relative pb-safe">
        <BackgroundAI intensity={device === 'mobile' ? 'low' : 'medium'} />
        
        {/* Sticky Header - Period Selection Only - محسّن للموبايل */}
        <div className={cn(
          "sticky z-30 bg-background/95 backdrop-blur-xl border-b border-border transition-all duration-300",
          device === 'mobile' ? "top-0 py-1.5 px-3" : "top-12 py-2 px-4",
          isScrolled && "shadow-lg bg-background/98"
        )}>
          <div className="max-w-4xl mx-auto flex items-center justify-center">
            {/* Period Selection - Responsive */}
            <div className={cn(
              "flex",
              device === 'mobile' ? "gap-1" : "gap-1.5"
            )}>
              <button
                onClick={() => setPeriod('daily')}
                className={cn(
                  "rounded-full flex items-center justify-center transition-all font-bold",
                  device === 'mobile' ? "w-8 h-8 text-[9px]" : "w-9 h-9 text-[10px]",
                  period === 'daily' 
                    ? "bg-[hsl(var(--whoop-blue))] text-white shadow-[var(--glow-blue)]" 
                    : "bg-secondary hover:bg-secondary/80"
                )}
              >
                <span>D</span>
              </button>
              <button
                onClick={() => setPeriod('weekly')}
                className={cn(
                  "rounded-full flex items-center justify-center transition-all font-bold",
                  device === 'mobile' ? "w-8 h-8 text-[9px]" : "w-9 h-9 text-[10px]",
                  period === 'weekly' 
                    ? "bg-[hsl(var(--whoop-blue))] text-white shadow-[var(--glow-blue)]" 
                    : "bg-secondary hover:bg-secondary/80"
                )}
              >
                <span>W</span>
              </button>
              <button
                onClick={() => setPeriod('monthly')}
                className={cn(
                  "rounded-full flex items-center justify-center transition-all font-bold",
                  device === 'mobile' ? "w-8 h-8 text-[9px]" : "w-9 h-9 text-[10px]",
                  period === 'monthly' 
                    ? "bg-[hsl(var(--whoop-blue))] text-white shadow-[var(--glow-blue)]" 
                    : "bg-secondary hover:bg-secondary/80"
                )}
              >
                <span>M</span>
              </button>
              <button
                onClick={() => setPeriod('yearly')}
                className={cn(
                  "rounded-full flex items-center justify-center transition-all font-bold",
                  device === 'mobile' ? "w-8 h-8 text-[9px]" : "w-9 h-9 text-[10px]",
                  period === 'yearly' 
                    ? "bg-[hsl(var(--whoop-blue))] text-white shadow-[var(--glow-blue)]" 
                    : "bg-secondary hover:bg-secondary/80"
                )}
              >
                <span>Y</span>
              </button>
            </div>
          </div>
        </div>

        <div className={cn(
          device === 'mobile' && "px-3 py-4 space-y-6 max-w-full",
          device === 'tablet' && "px-6 py-6 space-y-7 max-w-3xl mx-auto",
          device === 'desktop' && "px-8 py-8 space-y-8 max-w-5xl mx-auto"
        )}>
          <SessionBanner />

          {loading ? (
            <HolographicCard variant="glass" className="p-6 text-center">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              <p className="mt-2 text-sm text-muted-foreground">جار التحميل…</p>
            </HolographicCard>
          ) : report ? (
              <>
                {/* Section 1: Financial Overview - الدوائر المالية الكبيرة */}
                <section className="mb-8">
                  <h2 className="text-sm font-semibold text-muted-foreground mb-4 px-1">
                    {period === 'daily' && 'النظرة المالية - اليوم'}
                    {period === 'weekly' && 'النظرة المالية - الأسبوع'}
                    {period === 'monthly' && 'النظرة المالية - الشهر'}
                    {period === 'yearly' && 'النظرة المالية - السنة'}
                  </h2>
                  
                  <div className="relative py-4">
                    {/* Background Glow Effect */}
                    <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-transparent to-transparent blur-3xl -z-10" />
                    
                    <div className={cn(
                      "grid place-items-center",
                      device === 'mobile' && "grid-cols-2 gap-6 px-3",
                      device === 'tablet' && "grid-cols-3 gap-8 max-w-3xl mx-auto",
                      device === 'desktop' && "grid-cols-3 gap-10 max-w-4xl mx-auto"
                    )}>
                      {/* Ring 1: Balance */}
                      <div 
                        className={cn(
                          "flex flex-col items-center group",
                          shouldAnimate && "animate-fade-in"
                        )} 
                        style={{ animationDelay: shouldAnimate ? '0ms' : undefined }}
                      >
                        <div className="relative">
                          {/* Glow Ring Effect */}
                          <div className="absolute inset-0 bg-[hsl(var(--whoop-blue))] opacity-20 blur-2xl rounded-full scale-150 group-hover:scale-[2] transition-transform duration-700" />
                          
                          <div 
                            className="relative cursor-pointer transform transition-all duration-300 hover:scale-105"
                            onClick={() => {
                              setEditingBalance(true);
                              setBalanceValue(report.current_balance?.toString() || '0');
                            }}
                          >
                            <StatRing
                              value={Math.min(100, Math.max(0, ((report.current_balance || 0) / 10000) * 100))}
                              label="الرصيد"
                              subtitle="BALANCE"
                              color="hsl(var(--whoop-blue))"
                              size={getFinancialRingSize()}
                              customDisplay={`$${(report.current_balance || 0).toFixed(0)}`}
                            />
                          </div>
                        
                          {/* Edit Button Overlay */}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingBalance(true);
                              setBalanceValue(report.current_balance?.toString() || '0');
                            }}
                            className="absolute top-2 right-2 w-8 h-8 rounded-full bg-background/80 backdrop-blur-sm flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 hover:bg-[hsl(var(--whoop-blue))] hover:text-white shadow-lg"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                      
                      {/* Ring 2: Total Income */}
                      <div 
                        className={cn(
                          "flex flex-col items-center group",
                          shouldAnimate && "animate-fade-in"
                        )} 
                        style={{ animationDelay: shouldAnimate ? '100ms' : undefined }}
                      >
                        <div className="relative">
                          <div className="absolute inset-0 bg-[hsl(var(--whoop-green))] opacity-20 blur-2xl rounded-full scale-150 group-hover:scale-[2] transition-transform duration-700" />
                          <div className="relative transform transition-all duration-300 hover:scale-105">
                            <StatRing
                              value={Math.min(100, Math.max(0, ((report.total_income || 0) / 5000) * 100))}
                              label="الدخل الكلي"
                              subtitle="INCOME"
                              color="hsl(var(--whoop-green))"
                              size={getFinancialRingSize()}
                              customDisplay={`$${report.total_income || 0}`}
                            />
                          </div>
                        </div>
                      </div>
                      
                      {/* Ring 3: Total Expenses */}
                      <div 
                        className={cn(
                          "flex flex-col items-center group cursor-pointer",
                          shouldAnimate && "animate-fade-in"
                        )} 
                        style={{ animationDelay: shouldAnimate ? '200ms' : undefined }}
                        onClick={() => navigate('/expenses')}
                      >
                        <div className="relative">
                          <div className="absolute inset-0 bg-[hsl(var(--whoop-red))] opacity-20 blur-2xl rounded-full scale-150 group-hover:scale-[2] transition-transform duration-700" />
                          <div className="relative transform transition-all duration-300 hover:scale-105">
                            <StatRing
                              value={Math.min(100, Math.max(0, ((report.total_spend || 0) / 5000) * 100))}
                              label="المصروفات الكلية"
                              subtitle="EXPENSES"
                              color="hsl(var(--whoop-red))"
                              size={getFinancialRingSize()}
                              customDisplay={`$${report.total_spend || 0}`}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </section>

                {/* Glances Section - فقط إذا كان العلم مفعل */}
                {showGlances && (
                  <section className="mb-8">
                    <h2 className="text-sm font-semibold text-muted-foreground mb-4 px-1">
                      نظرة سريعة
                    </h2>
                    <GlancesBar />
                  </section>
                )}

                {/* Section 2: Today's Stats - دوائر اليوم */}
                <section className="mb-8">
                  <h2 className="text-sm font-semibold text-muted-foreground mb-4 px-1">
                    {period === 'daily' && 'إحصائيات اليوم'}
                    {period === 'weekly' && 'إحصائيات الأسبوع'}
                    {period === 'monthly' && 'إحصائيات الشهر'}
                    {period === 'yearly' && 'إحصائيات السنة'}
                  </h2>
                  
                  <div className="relative py-4">
                    <div className="absolute inset-0 bg-gradient-to-t from-secondary/10 via-transparent to-transparent blur-2xl -z-10" />
                    
                    <div className={cn(
                      "grid gap-4 place-items-center",
                      device === 'mobile' && "grid-cols-3 gap-2 px-2",
                      device === 'tablet' && "grid-cols-3 gap-3 max-w-xl mx-auto",
                      device === 'desktop' && "grid-cols-3 gap-4 max-w-2xl mx-auto"
                    )}>
                      {/* Ring 1: Today Income */}
                      <div 
                        className={cn(
                          "flex flex-col items-center group",
                          shouldAnimate && "animate-fade-in"
                        )} 
                        style={{ animationDelay: shouldAnimate ? '300ms' : undefined }}
                      >
                        <div className="relative">
                          <div className="absolute inset-0 bg-[hsl(var(--whoop-green))] opacity-10 blur-xl rounded-full scale-125 group-hover:scale-150 transition-transform duration-500" />
                          <div className="relative transform transition-all duration-300 hover:scale-105">
                            <StatRing
                              value={Math.min(100, Math.max(0, ((report.income_usd || 0) / (period === 'daily' ? 1000 : period === 'weekly' ? 5000 : period === 'monthly' ? 20000 : 100000)) * 100))}
                              label={period === 'daily' ? 'دخل اليوم' : period === 'weekly' ? 'دخل الأسبوع' : period === 'monthly' ? 'دخل الشهر' : 'دخل السنة'}
                              subtitle={period === 'daily' ? 'TODAY' : period === 'weekly' ? 'WEEK' : period === 'monthly' ? 'MONTH' : 'YEAR'}
                              color="hsl(var(--whoop-green))"
                              size={getDailyRingSize()}
                              customDisplay={`$${Math.round(report.income_usd || 0)}`}
                            />
                          </div>
                        </div>
                      </div>
                      
                      {/* Ring 2: Today Expenses */}
                      <div 
                        className={cn(
                          "flex flex-col items-center group",
                          shouldAnimate && "animate-fade-in"
                        )} 
                        style={{ animationDelay: shouldAnimate ? '350ms' : undefined }}
                      >
                        <div className="relative">
                          <div className="absolute inset-0 bg-[hsl(var(--whoop-red))] opacity-10 blur-xl rounded-full scale-125 group-hover:scale-150 transition-transform duration-500" />
                          <div className="relative transform transition-all duration-300 hover:scale-105">
                            <StatRing
                              value={Math.min(100, Math.max(0, ((report.spend_usd || 0) / (period === 'daily' ? 1000 : period === 'weekly' ? 5000 : period === 'monthly' ? 20000 : 100000)) * 100))}
                              label={period === 'daily' ? 'مصروف اليوم' : period === 'weekly' ? 'مصروف الأسبوع' : period === 'monthly' ? 'مصروف الشهر' : 'مصروف السنة'}
                              subtitle={period === 'daily' ? 'TODAY' : period === 'weekly' ? 'WEEK' : period === 'monthly' ? 'MONTH' : 'YEAR'}
                              color="hsl(var(--whoop-red))"
                              size={getDailyRingSize()}
                              customDisplay={`$${Math.round(report.spend_usd || 0)}`}
                            />
                          </div>
                        </div>
                      </div>
                      
                      {/* Ring 3: Today Net */}
                      <div 
                        className={cn(
                          "flex flex-col items-center group",
                          shouldAnimate && "animate-fade-in"
                        )} 
                        style={{ animationDelay: shouldAnimate ? '400ms' : undefined }}
                      >
                        <div className="relative">
                          <div className={cn(
                            "absolute inset-0 opacity-10 blur-xl rounded-full scale-125 group-hover:scale-150 transition-transform duration-500",
                            report.net_usd >= 0 ? "bg-[hsl(var(--whoop-green))]" : "bg-[hsl(var(--whoop-red))]"
                          )} />
                          <div className="relative transform transition-all duration-300 hover:scale-105">
                            <StatRing
                              value={Math.min(100, Math.max(0, ((Math.abs(report.net_usd || 0)) / (period === 'daily' ? 1000 : period === 'weekly' ? 5000 : period === 'monthly' ? 20000 : 100000)) * 100))}
                              label={period === 'daily' ? 'صافي اليوم' : period === 'weekly' ? 'صافي الأسبوع' : period === 'monthly' ? 'صافي الشهر' : 'صافي السنة'}
                              subtitle="NET"
                              color={report.net_usd >= 0 ? "hsl(var(--whoop-green))" : "hsl(var(--whoop-red))"}
                              size={getDailyRingSize()}
                              customDisplay={`${report.net_usd >= 0 ? '+' : ''}$${Math.round(report.net_usd || 0)}`}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </section>

                {/* Section 3: Activity Cards - الأنشطة اليومية */}
                <section className="mb-8">
                  <h2 className="text-sm font-semibold text-muted-foreground mb-4 px-1">
                    {period === 'daily' && 'الأنشطة اليومية'}
                    {period === 'weekly' && 'الأنشطة الأسبوعية'}
                    {period === 'monthly' && 'الأنشطة الشهرية'}
                    {period === 'yearly' && 'الأنشطة السنوية'}
                  </h2>
                  
                  <div className={cn(
                    "grid gap-3",
                    device === 'mobile' && "grid-cols-2 gap-2.5",
                    device === 'tablet' && "grid-cols-3 gap-3",
                    device === 'desktop' && "grid-cols-3 gap-4"
                  )}>
                    {renderEditableCard('study_hours', <BookOpen className="w-5 h-5" />, 'دراسة', report.study_hours, 'bg-[hsl(var(--whoop-blue))]/10', 'h')}
                    {renderEditableCard('mma_hours', <Dumbbell className="w-5 h-5" />, 'رياضة', report.mma_hours, 'bg-[hsl(var(--whoop-green))]/10', 'h')}
                    {renderEditableCard('work_hours', <Building className="w-5 h-5" />, 'عمل', report.work_hours, 'bg-[hsl(var(--whoop-yellow))]/10', 'h')}
                    {renderEditableCard('walk_min', <Footprints className="w-5 h-5" />, 'مشي', report.walk_min, 'bg-[hsl(var(--whoop-red))]/10', 'min')}
                    {renderEditableCard('sleep_hours', <Moon className="w-5 h-5" />, 'نوم', report.sleep_hours, 'bg-purple-500/10', 'h')}
                    {renderEditableCard('recovery_score', <Heart className="w-5 h-5" />, 'استشفاء', report.recovery_score, 'bg-pink-500/10', '%', 1)}
                  </div>
                </section>

                {/* Section 4: Comparison - للأسبوع/الشهر/السنة فقط */}
                {period !== 'daily' && comparisonData && (
                  <section className="mb-8">
                    <h2 className="text-sm font-semibold text-muted-foreground mb-4 px-1">
                      المقارنة مع {period === 'weekly' ? 'الأسبوع السابق' : period === 'monthly' ? 'الشهر السابق' : 'السنة السابقة'}
                    </h2>
                    <div className={cn(
                      "grid gap-3",
                      device === 'mobile' && "grid-cols-1 gap-2.5",
                      device === 'tablet' && "grid-cols-2 gap-3",
                      device === 'desktop' && "grid-cols-4 gap-4"
                    )}>
                      <ComparisonCard 
                        label="الدخل"
                        current={report.income_usd || 0}
                        previous={comparisonData.income_usd || 0}
                        format="currency"
                        sparklineData={rawDailyData.map(d => d.income_usd || 0)}
                      />
                      <ComparisonCard 
                        label="المصروفات"
                        current={report.spend_usd || 0}
                        previous={comparisonData.spend_usd || 0}
                        format="currency"
                        inverted
                        sparklineData={rawDailyData.map(d => d.spend_usd || 0)}
                      />
                      <ComparisonCard 
                        label="الصافي"
                        current={report.net_usd || 0}
                        previous={comparisonData.net_usd || 0}
                        format="currency"
                        sparklineData={rawDailyData.map(d => d.net_usd || 0)}
                      />
                      <ComparisonCard 
                        label="ساعات العمل"
                        current={report.work_hours || 0}
                        previous={comparisonData.work_hours || 0}
                        format="hours"
                        sparklineData={rawDailyData.map(d => d.work_hours || 0)}
                      />
                    </div>
                  </section>
                )}

                {/* Section 5: Trends & Insights - للأسبوع/الشهر/السنة فقط */}
                {period !== 'daily' && rawDailyData.length > 0 && (
                  <section className="mb-8">
                    <h2 className="text-sm font-semibold text-muted-foreground mb-4 px-1">
                      الاتجاهات والتحليلات
                    </h2>
                    <TrendsChart data={rawDailyData} period={period} />
                  </section>
                )}

                {/* Section 6: Smart Insights - للأسبوع/الشهر/السنة فقط */}
                {period !== 'daily' && comparisonData && rawDailyData.length > 0 && (
                  <section className="mb-8">
                    <h2 className="text-sm font-semibold text-muted-foreground mb-4 px-1">
                      رؤى ذكية
                    </h2>
                    <div className="space-y-3">
                      {generateInsights(report, comparisonData, rawDailyData, period).map((insight, idx) => (
                        <SmartInsight 
                          key={idx}
                          type={insight.type}
                          icon={insight.icon}
                          text={insight.text}
                        />
                      ))}
                    </div>
                  </section>
                )}

                {/* Edit Modals - Enhanced with Animations */}
                {editingBalance && (
                <div className={cn(
                  "fixed inset-0 bg-black/90 backdrop-blur-xl z-50 flex items-center justify-center animate-fade-in",
                  device === 'mobile' ? "p-3" : "p-4"
                )}>
                  <HolographicCard 
                    variant="neon" 
                    glow 
                    className={cn(
                      "w-full animate-scale-in shadow-[0_0_50px_hsl(var(--primary)/0.5)]",
                      device === 'mobile' ? "max-w-[90vw]" : "max-w-md"
                    )}
                  >
                    <div className={cn(
                      "relative",
                      device === 'mobile' ? "p-4" : "p-6"
                    )}>
                      <div className="absolute -top-12 left-1/2 -translate-x-1/2 w-20 h-20 rounded-full bg-primary opacity-30 blur-3xl animate-pulse-glow" />
                      <h3 className={cn(
                        "font-bold mb-6 text-center bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent animate-shimmer bg-[length:200%_auto]",
                        device === 'mobile' ? "text-xl" : "text-2xl"
                      )}>
تعديل الرصيد الحقيقي
                      </h3>
                      <div className="relative mb-6">
                        <div className="absolute inset-0 bg-primary/10 blur-xl rounded-lg animate-pulse-glow" />
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={balanceValue}
                          onChange={(e) => setBalanceValue(e.target.value)}
                          className={cn(
                            "input w-full font-bold text-center relative z-10 bg-background/50 backdrop-blur-sm border-2 focus:border-primary focus:shadow-[0_0_30px_hsl(var(--primary)/0.5)] transition-all",
                            device === 'mobile' ? "text-2xl" : "text-3xl"
                          )}
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              updateBalance(balanceValue);
                            } else if (e.key === 'Escape') {
                              setEditingBalance(false);
                            }
                          }}
                        />
                      </div>
                      <div className="flex gap-3">
                        <NeonButton
                          size="md"
                          variant="primary"
                          onClick={() => updateBalance(balanceValue)}
                          className="flex-1"
                        >
                          حفظ
                        </NeonButton>
                        <NeonButton
                          size="md"
                          variant="ghost"
                          glow={false}
                          onClick={() => setEditingBalance(false)}
                          className="flex-1"
                        >
                          إلغاء
                        </NeonButton>
                      </div>
                    </div>
                  </HolographicCard>
                </div>
              )}
              
              {editingField && editingField !== 'balance' && (
                <div className={cn(
                  "fixed inset-0 bg-black/90 backdrop-blur-xl z-50 flex items-center justify-center animate-fade-in",
                  device === 'mobile' ? "p-3" : "p-4"
                )}>
                  <HolographicCard 
                    variant="neon" 
                    glow 
                    className={cn(
                      "w-full animate-scale-in shadow-[0_0_50px_hsl(var(--primary)/0.5)]",
                      device === 'mobile' ? "max-w-[90vw]" : "max-w-md"
                    )}
                  >
                    <div className={cn(
                      device === 'mobile' ? "p-4" : "p-6"
                    )}>
                      <h3 className={cn(
                        "font-bold mb-6 text-center bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent animate-shimmer bg-[length:200%_auto]",
                        device === 'mobile' ? "text-xl" : "text-2xl"
                      )}>
                        {editingField === 'work_hours' && 'تعديل ساعات العمل'}
                        {editingField === 'study_hours' && 'تعديل ساعات الدراسة'}
                        {editingField === 'mma_hours' && 'تعديل ساعات MMA'}
                        {editingField === 'walk_min' && 'تعديل دقائق المشي'}
                        {editingField === 'sleep_hours' && 'تعديل ساعات النوم'}
                        {editingField === 'recovery_score' && 'تعديل نسبة الاستشفاء'}
                      </h3>
                      <div className="relative mb-6">
                        <input
                          type="number"
                          step={editingField === 'walk_min' ? '1' : '0.5'}
                          min="0"
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          className={cn(
                            "input w-full font-bold text-center bg-background/50 backdrop-blur-sm border-2 focus:border-primary focus:shadow-[0_0_30px_hsl(var(--primary)/0.5)] transition-all",
                            device === 'mobile' ? "text-2xl" : "text-3xl"
                          )}
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              updateField(editingField, editValue);
                            } else if (e.key === 'Escape') {
                              setEditingField(null);
                            }
                          }}
                        />
                      </div>
                      <div className="flex gap-3">
                        <NeonButton
                          size="md"
                          variant="primary"
                          onClick={() => updateField(editingField, editValue)}
                          className="flex-1"
                        >
                          حفظ
                        </NeonButton>
                        <NeonButton
                          size="md"
                          variant="ghost"
                          glow={false}
                          onClick={() => setEditingField(null)}
                          className="flex-1"
                        >
                          إلغاء
                        </NeonButton>
                      </div>
                    </div>
                  </HolographicCard>
                </div>
              )}

              {/* Business Plans - نظام ديناميكي محسّن */}
              <div className="space-y-4">
                {/* Header مع أزرار التحكم */}
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-bold gradient-text flex items-center gap-2">
                    <Briefcase className="w-5 h-5" />
                    خطط الأعمال
                  </h3>
                  <div className="flex gap-2">
                    <NeonButton 
                      size="sm" 
                      variant="accent"
                      onClick={() => setShowAnalytics(!showAnalytics)}
                    >
                      <BarChart3 className="w-4 h-4" />
                      {device !== 'mobile' && 'التحليلات'}
                    </NeonButton>
                    <NeonButton 
                      size="sm" 
                      variant="primary"
                      glow
                      onClick={() => {
                        setEditingPlan(null)
                        setShowPlanForm(true)
                      }}
                    >
                      <Plus className="w-4 h-4" />
                      {device !== 'mobile' && 'إضافة خطة'}
                    </NeonButton>
                  </div>
                </div>

                {/* Plans Grid */}
                {plansLoading ? (
                  <div className="text-center text-muted-foreground py-8">جاري التحميل...</div>
                ) : plans.length > 0 ? (
                  <div className={cn(
                    "grid gap-4",
                    device === 'mobile' && "grid-cols-1 gap-3",
                    device === 'tablet' && "grid-cols-2 gap-4",
                    device === 'desktop' && "grid-cols-3 gap-4"
                  )}>
                    {plans.map(plan => (
                      <PlanCard 
                        key={plan.plan_id}
                        plan={plan}
                        onEdit={(p) => {
                          setEditingPlan(p)
                          setShowPlanForm(true)
                        }}
                        onDelete={deletePlan}
                        onClick={(p) => {
                          // يمكن إضافة navigation لصفحة تفصيلية لاحقاً
                          console.log('Plan clicked:', p)
                        }}
                      />
                    ))}
                    
                    {/* Add button card */}
                    <div
                      onClick={() => {
                        setEditingPlan(null)
                        setShowPlanForm(true)
                      }}
                      className="cursor-pointer"
                    >
                      <GlassPanel 
                        blur="md" 
                        className="border-2 border-dashed border-primary/30 hover:border-primary/60 transition-all flex items-center justify-center min-h-[150px]"
                      >
                        <div className="text-center">
                          <Plus className="w-8 h-8 mx-auto mb-2 text-primary" />
                          <p className="text-sm text-muted-foreground">إضافة خطة جديدة</p>
                        </div>
                      </GlassPanel>
                    </div>
                  </div>
                ) : (
                  <GlassPanel 
                    blur="md" 
                    className="p-8 text-center"
                  >
                    <Briefcase className="w-12 h-12 mx-auto mb-3 text-muted-foreground/50" />
                    <p className="text-muted-foreground mb-4">لا توجد خطط حتى الآن</p>
                    <NeonButton 
                      variant="primary"
                      glow
                      onClick={() => {
                        setEditingPlan(null)
                        setShowPlanForm(true)
                      }}
                    >
                      <Plus className="w-4 h-4 ml-2" />
                      إضافة خطتك الأولى
                    </NeonButton>
                  </GlassPanel>
                )}

                {/* Analytics Section */}
                {showAnalytics && plans.length > 0 && (
                  <div className="mt-6 animate-fade-in">
                    <PlansAnalytics plans={plans} />
                  </div>
                )}
              </div>

              {/* Charts */}
              {period !== 'daily' && report.trend_data && report.trend_data.length > 0 && (
                <div className="space-y-4">
                  <HolographicCard variant="glass" className="p-6">
                    <h4 className="font-medium mb-4 flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-[hsl(var(--whoop-blue)_/_0.1)] flex items-center justify-center">
                        <BarChart3 className="w-4 h-4 text-[hsl(var(--whoop-blue))]" />
                      </div>
                      الدخل والمصروفات
                    </h4>
                    <ResponsiveContainer 
                      width="100%" 
                      height={device === 'mobile' ? 200 : 300}
                    >
                      <LineChart data={report.trend_data}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis 
                          dataKey="label" 
                          stroke="hsl(var(--muted-foreground))" 
                          tick={{ fontSize: device === 'mobile' ? 10 : 12 }}
                        />
                        <YAxis stroke="hsl(var(--muted-foreground))" />
                        <Tooltip 
                          contentStyle={{ 
                            backgroundColor: 'hsl(var(--card))',
                            border: '1px solid hsl(var(--border))',
                            borderRadius: '0.75rem'
                          }}
                        />
                        <Legend />
                        <Line type="monotone" dataKey="income_usd" stroke="hsl(var(--whoop-green))" name="الدخل" strokeWidth={2} />
                        <Line type="monotone" dataKey="spend_usd" stroke="hsl(var(--whoop-red))" name="المصروفات" strokeWidth={2} />
                      </LineChart>
                    </ResponsiveContainer>
                  </HolographicCard>

                  <HolographicCard variant="glass" className="p-6">
                    <h4 className="font-medium mb-4 flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-[hsl(var(--whoop-blue)_/_0.1)] flex items-center justify-center">
                        <BarChart3 className="w-4 h-4 text-[hsl(var(--whoop-blue))]" />
                      </div>
                      الأنشطة
                    </h4>
                    <ResponsiveContainer 
                      width="100%" 
                      height={device === 'mobile' ? 200 : 300}
                    >
                      <BarChart data={report.trend_data}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis 
                          dataKey="label" 
                          stroke="hsl(var(--muted-foreground))"
                          tick={{ fontSize: device === 'mobile' ? 10 : 12 }}
                        />
                        <YAxis stroke="hsl(var(--muted-foreground))" />
                        <Tooltip 
                          contentStyle={{ 
                            backgroundColor: 'hsl(var(--card))',
                            border: '1px solid hsl(var(--border))',
                            borderRadius: '0.75rem'
                          }}
                        />
                        <Legend />
                        <Bar dataKey="work_hours" fill="hsl(var(--whoop-blue))" name="عمل" />
                        <Bar dataKey="study_hours" fill="hsl(var(--whoop-yellow))" name="دراسة" />
                        <Bar dataKey="mma_hours" fill="hsl(var(--whoop-red))" name="MMA" />
                      </BarChart>
                    </ResponsiveContainer>
                  </HolographicCard>
                </div>
              )}
            </>
          ) : (
            <HolographicCard variant="glass" className="p-6 text-center">
              <p className="text-muted-foreground">لا توجد بيانات لعرضها</p>
            </HolographicCard>
          )}
        </div>

        {toast && <Toast msg={toast} />}
      </div>
      
      <PlanFormDialog 
        plan={editingPlan}
        isOpen={showPlanForm}
        onClose={() => {
          setShowPlanForm(false)
          setEditingPlan(null)
        }}
        onSave={async (data) => {
          if (editingPlan) {
            await updatePlan(editingPlan.plan_id, data)
          } else {
            await addPlan(data)
          }
        }}
      />
    </Protected>
  )
}

export default Today

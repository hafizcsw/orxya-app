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
import { OryxaButton } from '@/components/oryxa/Button'
import { OryxaCard } from '@/components/oryxa/Card'
import { AIDock } from '@/components/oryxa/AIDock'
import { StatRing } from '@/components/oryxa/StatRing'
import { cn } from '@/lib/utils'
import { Bell, Calendar, DollarSign, TrendingUp, TrendingDown, Clock, Dumbbell, BookOpen, Footprints, Award, Building, Edit2, BarChart3, User } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { z } from 'zod'
import { useSelectedDate } from '@/contexts/DateContext'

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
  const [loading, setLoading] = useState(false)
  const [report, setReport] = useState<any | null>(null)
  const [period, setPeriod] = useState<'daily' | 'weekly' | 'monthly' | 'yearly'>('daily')
  const [toast, setToast] = useState<string | null>(null)
  const [editingField, setEditingField] = useState<string | null>(null)
  const [editValue, setEditValue] = useState<any>('')
  const [editingBalance, setEditingBalance] = useState(false)
  const [balanceValue, setBalanceValue] = useState('')
  const [isScrolled, setIsScrolled] = useState(false)

  async function fetchReport() {
    if (!user) return
    setLoading(true)
    try {
      const dateStr = selectedDate.toISOString().slice(0, 10)
      const { data, error } = await supabase.functions.invoke('report-daily', {
        body: { 
          period,
          date: dateStr 
        }
      })
      if (error) throw error
      setReport(data?.report ?? null)
      track('report_daily_loaded', { hasReport: !!data?.report, period, date: dateStr })
    } catch (e: any) {
      setReport(null)
    } finally { setLoading(false) }
  }

  useEffect(() => { 
    if (user) {
      fetchReport()
    }
  }, [user?.id, period, selectedDate])

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
      <OryxaCard className="group relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
        
        <div className="relative z-10">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs uppercase tracking-wider text-muted-foreground font-medium">
              {label}
            </span>
            <div className="flex items-center gap-2">
              {!isEditing && (
                <OryxaButton
                  variant="ghost"
                  size="sm"
                  className="opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={() => {
                    setEditingField(field)
                    setEditValue(value || 0)
                  }}
                >
                  <Edit2 className="w-4 h-4" />
                </OryxaButton>
              )}
              <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-transform group-hover:scale-110 duration-300 ${iconBgClass}`}>
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
                className="input w-full text-2xl font-bold"
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
                <OryxaButton
                  size="sm"
                  variant="primary"
                  onClick={() => updateField(field, editValue)}
                  className="flex-1"
                >
                  حفظ
                </OryxaButton>
                <OryxaButton
                  size="sm"
                  variant="ghost"
                  onClick={() => setEditingField(null)}
                  className="flex-1"
                >
                  إلغاء
                </OryxaButton>
              </div>
            </div>
          ) : (
            <div
              className="text-3xl font-bold mb-2 bg-gradient-to-r from-foreground to-foreground/80 bg-clip-text cursor-pointer hover:scale-105 transition-transform"
              onClick={() => {
                setEditingField(field)
                setEditValue(value || 0)
              }}
            >
              {suffix === '$' ? '$' : ''}{value || 0}{suffix !== '$' ? suffix : ''}
            </div>
          )}
        </div>
      </OryxaCard>
    )
  }

  return (
    <Protected>
      <div className="min-h-screen bg-background pb-24">
        <AIDock />
        
        {/* Sticky Header - Period Selection Only */}
        <div className={cn(
          "sticky top-14 z-30 bg-background/95 backdrop-blur-xl border-b border-border transition-all duration-300 px-6 py-3",
          isScrolled && "shadow-lg bg-background/98"
        )}>
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            {/* Period Selection */}
            <div className={cn(
              "flex gap-2 mx-auto transition-all duration-300",
              isScrolled && "opacity-0 translate-y-[-20px] pointer-events-none"
            )}>
              <button
                onClick={() => setPeriod('daily')}
                className={cn(
                  "w-10 h-10 rounded-full flex items-center justify-center transition-all",
                  period === 'daily' 
                    ? "bg-[hsl(var(--whoop-blue))] text-white shadow-[var(--glow-blue)]" 
                    : "bg-secondary hover:bg-secondary/80"
                )}
              >
                <span className="text-xs font-bold">D</span>
              </button>
              <button
                onClick={() => setPeriod('weekly')}
                className={cn(
                  "w-10 h-10 rounded-full flex items-center justify-center transition-all",
                  period === 'weekly' 
                    ? "bg-[hsl(var(--whoop-blue))] text-white shadow-[var(--glow-blue)]" 
                    : "bg-secondary hover:bg-secondary/80"
                )}
              >
                <span className="text-xs font-bold">W</span>
              </button>
              <button
                onClick={() => setPeriod('monthly')}
                className={cn(
                  "w-10 h-10 rounded-full flex items-center justify-center transition-all",
                  period === 'monthly' 
                    ? "bg-[hsl(var(--whoop-blue))] text-white shadow-[var(--glow-blue)]" 
                    : "bg-secondary hover:bg-secondary/80"
                )}
              >
                <span className="text-xs font-bold">M</span>
              </button>
              <button
                onClick={() => setPeriod('yearly')}
                className={cn(
                  "w-10 h-10 rounded-full flex items-center justify-center transition-all",
                  period === 'yearly' 
                    ? "bg-[hsl(var(--whoop-blue))] text-white shadow-[var(--glow-blue)]" 
                    : "bg-secondary hover:bg-secondary/80"
                )}
              >
                <span className="text-xs font-bold">Y</span>
              </button>
            </div>
          </div>
        </div>

        <div className="px-6 py-8 max-w-7xl mx-auto space-y-8">
          <SessionBanner />

          {loading ? (
            <OryxaCard className="p-6 text-center">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              <p className="mt-2 text-sm text-muted-foreground">جار التحميل…</p>
            </OryxaCard>
          ) : report ? (
            <>
              {/* Financial Rings - Enhanced with Animations */}
              <div className="relative mb-12">
                {/* Background Glow Effect */}
                <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-transparent to-transparent blur-3xl -z-10" />
                
                <div className="grid grid-cols-3 gap-6 mb-12">
                  <div className="flex flex-col items-center group animate-fade-in" style={{ animationDelay: '0ms' }}>
                    <div className="relative">
                      {/* Glow Ring Effect */}
                      <div className="absolute inset-0 bg-[hsl(var(--whoop-blue))] opacity-20 blur-2xl rounded-full scale-150 group-hover:scale-[2] transition-transform duration-700" />
                      
                      <div 
                        className="relative cursor-pointer transform transition-all duration-500 hover:scale-110"
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
                          size="lg"
                          customDisplay={`$${(report.current_balance || 0).toFixed(0)}`}
                        />
                      </div>
                      
                      {/* Edit Button Overlay */}
                      <button
                        onClick={() => {
                          setEditingBalance(true);
                          setBalanceValue(report.current_balance?.toString() || '0');
                        }}
                        className="absolute top-2 right-2 w-8 h-8 rounded-full bg-background/80 backdrop-blur-sm flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 hover:bg-[hsl(var(--whoop-blue))] hover:text-white shadow-lg"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  
                  <div className="flex flex-col items-center group animate-fade-in" style={{ animationDelay: '100ms' }}>
                    <div className="relative">
                      <div className="absolute inset-0 bg-[hsl(var(--whoop-green))] opacity-20 blur-2xl rounded-full scale-150 group-hover:scale-[2] transition-transform duration-700" />
                      <div className="relative transform transition-all duration-500 hover:scale-110">
                        <StatRing
                          value={Math.min(100, Math.max(0, ((report.total_income || 0) / 5000) * 100))}
                          label="الدخل"
                          subtitle="INCOME"
                          color="hsl(var(--whoop-green))"
                          size="lg"
                          customDisplay={`$${report.total_income || 0}`}
                        />
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex flex-col items-center group animate-fade-in" style={{ animationDelay: '200ms' }}>
                    <div className="relative">
                      <div className="absolute inset-0 bg-[hsl(var(--whoop-red))] opacity-20 blur-2xl rounded-full scale-150 group-hover:scale-[2] transition-transform duration-700" />
                      <div className="relative transform transition-all duration-500 hover:scale-110">
                        <StatRing
                          value={Math.min(100, Math.max(0, ((report.total_spend || 0) / 5000) * 100))}
                          label="المصروفات"
                          subtitle="EXPENSES"
                          color="hsl(var(--whoop-red))"
                          size="lg"
                          customDisplay={`$${report.total_spend || 0}`}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Daily Stats Rings - Enhanced */}
                <div className="grid grid-cols-3 gap-6">
                  <div className="flex flex-col items-center group animate-fade-in" style={{ animationDelay: '300ms' }}>
                    <div className="relative">
                      <div className="absolute inset-0 bg-[hsl(var(--whoop-green))] opacity-10 blur-xl rounded-full scale-125 group-hover:scale-150 transition-transform duration-500" />
                      <div className="relative transform transition-all duration-300 hover:scale-105">
                        <StatRing
                          value={Math.min(100, Math.max(0, ((report.income_usd || 0) / 1000) * 100))}
                          label="دخل اليوم"
                          subtitle="TODAY"
                          color="hsl(var(--whoop-green))"
                          size="sm"
                          customDisplay={`$${report.income_usd || 0}`}
                        />
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex flex-col items-center group animate-fade-in" style={{ animationDelay: '350ms' }}>
                    <div className="relative">
                      <div className="absolute inset-0 bg-[hsl(var(--whoop-red))] opacity-10 blur-xl rounded-full scale-125 group-hover:scale-150 transition-transform duration-500" />
                      <div className="relative transform transition-all duration-300 hover:scale-105">
                        <StatRing
                          value={Math.min(100, Math.max(0, ((report.spend_usd || 0) / 1000) * 100))}
                          label="مصروف اليوم"
                          subtitle="TODAY"
                          color="hsl(var(--whoop-red))"
                          size="sm"
                          customDisplay={`$${report.spend_usd || 0}`}
                        />
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex flex-col items-center group animate-fade-in" style={{ animationDelay: '400ms' }}>
                    <div className="relative">
                      <div className={cn(
                        "absolute inset-0 opacity-10 blur-xl rounded-full scale-125 group-hover:scale-150 transition-transform duration-500",
                        report.net_usd >= 0 ? "bg-[hsl(var(--whoop-green))]" : "bg-[hsl(var(--whoop-red))]"
                      )} />
                      <div className="relative transform transition-all duration-300 hover:scale-105">
                        <StatRing
                          value={Math.min(100, Math.max(0, ((Math.abs(report.net_usd || 0)) / 1000) * 100))}
                          label="صافي اليوم"
                          subtitle="NET"
                          color={report.net_usd >= 0 ? "hsl(var(--whoop-green))" : "hsl(var(--whoop-red))"}
                          size="sm"
                          customDisplay={`${report.net_usd >= 0 ? '+' : ''}$${report.net_usd || 0}`}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>


              {/* Edit Modals - Enhanced with Animations */}
              {editingBalance && (
                <div className="fixed inset-0 bg-black/90 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
                  <OryxaCard className="max-w-md w-full animate-scale-in shadow-2xl border-2 border-primary/20">
                    <div className="relative">
                      <div className="absolute -top-12 left-1/2 -translate-x-1/2 w-20 h-20 rounded-full bg-[hsl(var(--whoop-blue))] opacity-20 blur-2xl" />
                      <h3 className="text-2xl font-bold mb-6 text-center bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text">
تعديل الرصيد الحقيقي
                      </h3>
                      <div className="relative mb-6">
                        <div className="absolute inset-0 bg-primary/5 blur-xl rounded-lg" />
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={balanceValue}
                          onChange={(e) => setBalanceValue(e.target.value)}
                          className="input w-full text-3xl font-bold text-center relative z-10 bg-background/50 backdrop-blur-sm border-2 focus:border-primary transition-all"
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
                        <OryxaButton
                          size="md"
                          variant="primary"
                          onClick={() => updateBalance(balanceValue)}
                          className="flex-1 shadow-lg hover:shadow-xl transition-all"
                        >
                          حفظ
                        </OryxaButton>
                        <OryxaButton
                          size="md"
                          variant="ghost"
                          onClick={() => setEditingBalance(false)}
                          className="flex-1"
                        >
                          إلغاء
                        </OryxaButton>
                      </div>
                    </div>
                  </OryxaCard>
                </div>
              )}
              
              {editingField && editingField !== 'balance' && (
                <div className="fixed inset-0 bg-black/90 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
                  <OryxaCard className="max-w-md w-full animate-scale-in shadow-2xl border-2 border-primary/20">
                    <h3 className="text-2xl font-bold mb-6 text-center">
                      {editingField === 'work_hours' && 'تعديل ساعات العمل'}
                      {editingField === 'study_hours' && 'تعديل ساعات الدراسة'}
                      {editingField === 'mma_hours' && 'تعديل ساعات MMA'}
                      {editingField === 'walk_min' && 'تعديل دقائق المشي'}
                    </h3>
                    <div className="relative mb-6">
                      <input
                        type="number"
                        step={editingField === 'walk_min' ? '1' : '0.5'}
                        min="0"
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        className="input w-full text-3xl font-bold text-center bg-background/50 backdrop-blur-sm border-2 focus:border-primary transition-all"
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
                      <OryxaButton
                        size="md"
                        variant="primary"
                        onClick={() => updateField(editingField, editValue)}
                        className="flex-1 shadow-lg hover:shadow-xl transition-all"
                      >
                        حفظ
                      </OryxaButton>
                      <OryxaButton
                        size="md"
                        variant="ghost"
                        onClick={() => setEditingField(null)}
                        className="flex-1"
                      >
                        إلغاء
                      </OryxaButton>
                    </div>
                  </OryxaCard>
                </div>
              )}

              {/* Activities - Enhanced Rings with Interactions */}
              <div className="relative mb-12">
                <div className="absolute inset-0 bg-gradient-to-t from-secondary/20 via-transparent to-transparent blur-2xl -z-10" />
                
                <div className="grid grid-cols-2 gap-8">
                  <div 
                    className="flex flex-col items-center group cursor-pointer animate-fade-in"
                    style={{ animationDelay: '450ms' }}
                    onClick={() => {
                      setEditingField('work_hours')
                      setEditValue(report.work_hours || 0)
                    }}
                  >
                    <div className="relative">
                      <div className="absolute inset-0 bg-[hsl(var(--whoop-blue))] opacity-15 blur-xl rounded-full scale-125 group-hover:scale-[1.8] transition-all duration-700" />
                      <div className="relative transform transition-all duration-500 hover:scale-110 hover:rotate-2">
                        <StatRing
                          value={Math.min(100, Math.max(0, ((report.work_hours || 0) / 12) * 100))}
                          label="ساعات العمل"
                          subtitle="WORK"
                          color="hsl(var(--whoop-blue))"
                          size="md"
                          customDisplay={`${report.work_hours || 0}h`}
                        />
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingField('work_hours');
                          setEditValue(report.work_hours || 0);
                        }}
                        className="absolute top-2 right-2 w-7 h-7 rounded-full bg-background/80 backdrop-blur-sm flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 hover:bg-[hsl(var(--whoop-blue))] hover:text-white shadow-lg z-10"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                  
                  <div 
                    className="flex flex-col items-center group cursor-pointer animate-fade-in"
                    style={{ animationDelay: '500ms' }}
                    onClick={() => {
                      setEditingField('study_hours')
                      setEditValue(report.study_hours || 0)
                    }}
                  >
                    <div className="relative">
                      <div className="absolute inset-0 bg-[hsl(var(--whoop-yellow))] opacity-15 blur-xl rounded-full scale-125 group-hover:scale-[1.8] transition-all duration-700" />
                      <div className="relative transform transition-all duration-500 hover:scale-110 hover:rotate-2">
                        <StatRing
                          value={Math.min(100, Math.max(0, ((report.study_hours || 0) / 8) * 100))}
                          label="ساعات الدراسة"
                          subtitle="STUDY"
                          color="hsl(var(--whoop-yellow))"
                          size="md"
                          customDisplay={`${report.study_hours || 0}h`}
                        />
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingField('study_hours');
                          setEditValue(report.study_hours || 0);
                        }}
                        className="absolute top-2 right-2 w-7 h-7 rounded-full bg-background/80 backdrop-blur-sm flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 hover:bg-[hsl(var(--whoop-yellow))] hover:text-white shadow-lg z-10"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                  
                  <div 
                    className="flex flex-col items-center group cursor-pointer animate-fade-in"
                    style={{ animationDelay: '550ms' }}
                    onClick={() => {
                      setEditingField('mma_hours')
                      setEditValue(report.mma_hours || 0)
                    }}
                  >
                    <div className="relative">
                      <div className="absolute inset-0 bg-[hsl(var(--whoop-red))] opacity-15 blur-xl rounded-full scale-125 group-hover:scale-[1.8] transition-all duration-700" />
                      <div className="relative transform transition-all duration-500 hover:scale-110 hover:rotate-2">
                        <StatRing
                          value={Math.min(100, Math.max(0, ((report.mma_hours || 0) / 4) * 100))}
                          label="ساعات MMA"
                          subtitle="MMA"
                          color="hsl(var(--whoop-red))"
                          size="md"
                          customDisplay={`${report.mma_hours || 0}h`}
                        />
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingField('mma_hours');
                          setEditValue(report.mma_hours || 0);
                        }}
                        className="absolute top-2 right-2 w-7 h-7 rounded-full bg-background/80 backdrop-blur-sm flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 hover:bg-[hsl(var(--whoop-red))] hover:text-white shadow-lg z-10"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                  
                  <div 
                    className="flex flex-col items-center group cursor-pointer animate-fade-in"
                    style={{ animationDelay: '600ms' }}
                    onClick={() => {
                      setEditingField('walk_min')
                      setEditValue(report.walk_min || 0)
                    }}
                  >
                    <div className="relative">
                      <div className="absolute inset-0 bg-[hsl(var(--whoop-green))] opacity-15 blur-xl rounded-full scale-125 group-hover:scale-[1.8] transition-all duration-700" />
                      <div className="relative transform transition-all duration-500 hover:scale-110 hover:rotate-2">
                        <StatRing
                          value={Math.min(100, Math.max(0, ((report.walk_min || 0) / 120) * 100))}
                          label="دقائق المشي"
                          subtitle="WALK"
                          color="hsl(var(--whoop-green))"
                          size="md"
                          customDisplay={`${report.walk_min || 0}m`}
                        />
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingField('walk_min');
                          setEditValue(report.walk_min || 0);
                        }}
                        className="absolute top-2 right-2 w-7 h-7 rounded-full bg-background/80 backdrop-blur-sm flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 hover:bg-[hsl(var(--whoop-green))] hover:text-white shadow-lg z-10"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Sales */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <OryxaCard>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs uppercase tracking-wider text-muted-foreground font-medium">
                      منح دراسية
                    </span>
                    <div className="w-10 h-10 rounded-full bg-[hsl(var(--whoop-green)_/_0.1)] flex items-center justify-center">
                      <Award className="w-5 h-5 text-[hsl(var(--whoop-green))]" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="text-sm text-muted-foreground">الربح</div>
                    <div className="text-2xl font-bold text-[hsl(var(--whoop-green))]">${report.scholarship_profit || 0}</div>
                  </div>
                </OryxaCard>
                
                <OryxaCard>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs uppercase tracking-wider text-muted-foreground font-medium">
                      فلل
                    </span>
                    <div className="w-10 h-10 rounded-full bg-[hsl(var(--whoop-blue)_/_0.1)] flex items-center justify-center">
                      <Building className="w-5 h-5 text-[hsl(var(--whoop-blue))]" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="text-sm text-muted-foreground">الربح</div>
                    <div className="text-2xl font-bold text-[hsl(var(--whoop-blue))]">${report.villa_profit || 0}</div>
                  </div>
                </OryxaCard>
                
                <OryxaCard>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs uppercase tracking-wider text-muted-foreground font-medium">
                      أخرى
                    </span>
                    <div className="w-10 h-10 rounded-full bg-[hsl(var(--whoop-yellow)_/_0.1)] flex items-center justify-center">
                      <DollarSign className="w-5 h-5 text-[hsl(var(--whoop-yellow))]" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="text-sm text-muted-foreground">الربح</div>
                    <div className="text-2xl font-bold text-[hsl(var(--whoop-yellow))]">${report.other_profit || 0}</div>
                  </div>
                </OryxaCard>
              </div>

              {/* Charts */}
              {period !== 'daily' && report.trend_data && report.trend_data.length > 0 && (
                <div className="space-y-4">
                  <OryxaCard className="p-6">
                    <h4 className="font-medium mb-4 flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-[hsl(var(--whoop-blue)_/_0.1)] flex items-center justify-center">
                        <BarChart3 className="w-4 h-4 text-[hsl(var(--whoop-blue))]" />
                      </div>
                      الدخل والمصروفات
                    </h4>
                    <ResponsiveContainer width="100%" height={300}>
                      <LineChart data={report.trend_data}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis dataKey="label" stroke="hsl(var(--muted-foreground))" />
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
                  </OryxaCard>

                  <OryxaCard className="p-6">
                    <h4 className="font-medium mb-4 flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-[hsl(var(--whoop-blue)_/_0.1)] flex items-center justify-center">
                        <BarChart3 className="w-4 h-4 text-[hsl(var(--whoop-blue))]" />
                      </div>
                      الأنشطة
                    </h4>
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={report.trend_data}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis dataKey="label" stroke="hsl(var(--muted-foreground))" />
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
                  </OryxaCard>
                </div>
              )}
            </>
          ) : (
            <OryxaCard className="p-6 text-center">
              <p className="text-muted-foreground">لا توجد بيانات لعرضها</p>
            </OryxaCard>
          )}
        </div>

        {toast && <Toast msg={toast} />}
      </div>
    </Protected>
  )
}

export default Today

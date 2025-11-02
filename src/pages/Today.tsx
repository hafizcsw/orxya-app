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
import { Bell, DollarSign, TrendingUp, TrendingDown, Clock, Dumbbell, BookOpen, Footprints, Award, Building, Edit2, BarChart3 } from 'lucide-react'
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { z } from 'zod'

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
  const [loading, setLoading] = useState(false)
  const [report, setReport] = useState<any | null>(null)
  const [period, setPeriod] = useState<'daily' | 'weekly' | 'monthly' | 'yearly'>('daily')
  const [toast, setToast] = useState<string | null>(null)
  const [editingField, setEditingField] = useState<string | null>(null)
  const [editValue, setEditValue] = useState<any>('')
  const [editingBalance, setEditingBalance] = useState(false)
  const [balanceValue, setBalanceValue] = useState('')

  async function fetchReport() {
    if (!user) return
    setLoading(true)
    try {
      const { data, error } = await supabase.functions.invoke('report-daily', {
        body: { period }
      })
      if (error) throw error
      setReport(data?.report ?? null)
      track('report_daily_loaded', { hasReport: !!data?.report, period })
    } catch (e: any) {
      setReport(null)
    } finally { setLoading(false) }
  }

  useEffect(() => { 
    if (user) {
      fetchReport()
    }
  }, [user?.id, period])

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
      <div className="min-h-screen bg-background">
        <AIDock />
        
        <div className="p-4 space-y-6 max-w-6xl mx-auto">
          <SessionBanner />

          {/* Hero Section with WHOOP styling */}
          <OryxaCard className="p-8">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text">
                  مرحبًا بك في Oryxa
                </h1>
                <p className="text-muted-foreground">ابدأ يومك بإنتاجية عالية</p>
              </div>
              <div className="flex items-center gap-2">
                <OryxaButton 
                  variant="ghost"
                  size="sm"
                  onClick={async () => {
                    await ensureNotificationPerms();
                    const now = new Date(); 
                    now.setMinutes(now.getMinutes() + 1);
                    await LocalNotifications.schedule({
                      notifications: [{
                        id: 999001,
                        title: 'اختبار Oryxa',
                        body: 'إشعار بعد دقيقة',
                        schedule: { at: now }
                      }]
                    });
                    setToast('تم جدولة إشعار اختبار بعد دقيقة ⏰');
                  }}
                >
                  <Bell className="w-4 h-4" />
                </OryxaButton>
              </div>
            </div>
          </OryxaCard>

          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold">التقرير</h2>
              <div className="flex gap-2">
                <OryxaButton
                  size="sm"
                  variant={period === 'daily' ? 'primary' : 'secondary'}
                  onClick={() => setPeriod('daily')}
                >
                  يومي
                </OryxaButton>
                <OryxaButton
                  size="sm"
                  variant={period === 'weekly' ? 'primary' : 'secondary'}
                  onClick={() => setPeriod('weekly')}
                >
                  أسبوعي
                </OryxaButton>
                <OryxaButton
                  size="sm"
                  variant={period === 'monthly' ? 'primary' : 'secondary'}
                  onClick={() => setPeriod('monthly')}
                >
                  شهري
                </OryxaButton>
                <OryxaButton
                  size="sm"
                  variant={period === 'yearly' ? 'primary' : 'secondary'}
                  onClick={() => setPeriod('yearly')}
                >
                  سنوي
                </OryxaButton>
              </div>
            </div>
            
            {loading ? (
              <OryxaCard className="p-6 text-center">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                <p className="mt-2 text-sm text-muted-foreground">جار التحميل…</p>
              </OryxaCard>
            ) : report ? (
              <>
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">اليوم - {report.date}</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {renderEditableCard('income_usd', <TrendingUp className="w-5 h-5 text-success" />, 'دخل اليوم', report.income_usd, 'bg-success/10', '$', 1)}
                    {renderEditableCard('spend_usd', <TrendingDown className="w-5 h-5 text-destructive" />, 'مصروف اليوم', report.spend_usd, 'bg-destructive/10', '$', 1)}
                    <OryxaCard>
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-xs uppercase tracking-wider text-muted-foreground font-medium">صافي اليوم</span>
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                          <DollarSign className="w-5 h-5 text-primary" />
                        </div>
                      </div>
                      <div className="text-3xl font-bold">{report.net_usd >= 0 ? '✅' : '⚠️'} ${report.net_usd}</div>
                    </OryxaCard>
                    <OryxaCard>
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-xs uppercase tracking-wider text-muted-foreground font-medium">التاريخ</span>
                        <div className="w-10 h-10 rounded-full bg-muted/10 flex items-center justify-center">
                          <Clock className="w-5 h-5 text-muted-foreground" />
                        </div>
                      </div>
                      <div className="text-lg font-medium">{report.date}</div>
                    </OryxaCard>
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">الإجماليات الكلية</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <OryxaCard className="group">
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-xs uppercase tracking-wider text-muted-foreground font-medium">
                          الرصيد الحقيقي
                        </span>
                        <div className="flex items-center gap-2">
                          {!editingBalance && (
                            <OryxaButton
                              variant="ghost"
                              size="sm"
                              className="opacity-0 group-hover:opacity-100 transition-opacity"
                              onClick={() => {
                                setEditingBalance(true);
                                setBalanceValue(report.current_balance?.toString() || '0');
                              }}
                            >
                              <Edit2 className="w-4 h-4" />
                            </OryxaButton>
                          )}
                          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                            <DollarSign className="w-5 h-5 text-primary" />
                          </div>
                        </div>
                      </div>
                      
                      {editingBalance ? (
                        <div className="space-y-2">
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            value={balanceValue}
                            onChange={(e) => setBalanceValue(e.target.value)}
                            className="input w-full text-2xl font-bold"
                            autoFocus
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                updateBalance(balanceValue);
                              } else if (e.key === 'Escape') {
                                setEditingBalance(false);
                              }
                            }}
                          />
                          <div className="flex gap-2">
                            <OryxaButton
                              size="sm"
                              variant="primary"
                              onClick={() => updateBalance(balanceValue)}
                              className="flex-1"
                            >
                              حفظ
                            </OryxaButton>
                            <OryxaButton
                              size="sm"
                              variant="ghost"
                              onClick={() => setEditingBalance(false)}
                              className="flex-1"
                            >
                              إلغاء
                            </OryxaButton>
                          </div>
                        </div>
                      ) : (
                        <div
                          className="text-4xl font-bold cursor-pointer hover:scale-105 transition-transform"
                          style={{ color: (report.current_balance || 0) >= 0 ? 'hsl(var(--whoop-green))' : 'hsl(var(--whoop-red))' }}
                          onClick={() => {
                            setEditingBalance(true);
                            setBalanceValue(report.current_balance?.toString() || '0');
                          }}
                        >
                          ${report.current_balance?.toFixed(2) || 0}
                        </div>
                      )}
                    </OryxaCard>
                    
                    <OryxaCard>
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-xs uppercase tracking-wider text-muted-foreground font-medium">
                          إجمالي الدخل
                        </span>
                        <div className="w-10 h-10 rounded-full bg-success/10 flex items-center justify-center">
                          <TrendingUp className="w-5 h-5 text-success" />
                        </div>
                      </div>
                      <div className="text-3xl font-bold text-success">
                        ${report.total_income || 0}
                      </div>
                    </OryxaCard>
                    
                    <OryxaCard>
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-xs uppercase tracking-wider text-muted-foreground font-medium">
                          إجمالي المصروفات
                        </span>
                        <div className="w-10 h-10 rounded-full bg-destructive/10 flex items-center justify-center">
                          <TrendingDown className="w-5 h-5 text-destructive" />
                        </div>
                      </div>
                      <div className="text-3xl font-bold text-destructive">
                        ${report.total_spend || 0}
                      </div>
                    </OryxaCard>
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">الأنشطة - {report.date}</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {renderEditableCard('work_hours', <Building className="w-5 h-5 text-primary" />, 'ساعات العمل', report.work_hours, 'bg-primary/10', ' ساعة', 0.5)}
                    {renderEditableCard('study_hours', <BookOpen className="w-5 h-5 text-info" />, 'ساعات الدراسة', report.study_hours, 'bg-info/10', ' ساعة', 0.5)}
                    {renderEditableCard('mma_hours', <Dumbbell className="w-5 h-5 text-warning" />, 'ساعات MMA', report.mma_hours, 'bg-warning/10', ' ساعة', 0.5)}
                    {renderEditableCard('walk_min', <Footprints className="w-5 h-5 text-accent" />, 'دقائق المشي', report.walk_min, 'bg-accent/10', ' دقيقة', 1)}
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">المبيعات - {report.date}</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <OryxaCard>
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-xs uppercase tracking-wider text-muted-foreground font-medium">
                          منح دراسية
                        </span>
                        <div className="w-10 h-10 rounded-full bg-success/10 flex items-center justify-center">
                          <Award className="w-5 h-5 text-success" />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <div className="text-sm text-muted-foreground">الربح</div>
                        <div className="text-2xl font-bold text-success">${report.scholarship_profit || 0}</div>
                      </div>
                    </OryxaCard>
                    
                    <OryxaCard>
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-xs uppercase tracking-wider text-muted-foreground font-medium">
                          فلل
                        </span>
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                          <Building className="w-5 h-5 text-primary" />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <div className="text-sm text-muted-foreground">الربح</div>
                        <div className="text-2xl font-bold text-primary">${report.villa_profit || 0}</div>
                      </div>
                    </OryxaCard>
                    
                    <OryxaCard>
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-xs uppercase tracking-wider text-muted-foreground font-medium">
                          أخرى
                        </span>
                        <div className="w-10 h-10 rounded-full bg-accent/10 flex items-center justify-center">
                          <DollarSign className="w-5 h-5 text-accent" />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <div className="text-sm text-muted-foreground">الربح</div>
                        <div className="text-2xl font-bold text-accent">${report.other_profit || 0}</div>
                      </div>
                    </OryxaCard>
                  </div>
                </div>

                {period !== 'daily' && report.trend_data && report.trend_data.length > 0 && (
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold flex items-center gap-2">
                      <BarChart3 className="w-5 h-5" />
                      الرسوم البيانية
                    </h3>
                    
                    <OryxaCard className="p-6">
                      <h4 className="font-medium mb-4">الدخل والمصروفات</h4>
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
                      <h4 className="font-medium mb-4">الأنشطة</h4>
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
          </section>
        </div>

        {toast && <Toast msg={toast} />}
      </div>
    </Protected>
  )
}

export default Today

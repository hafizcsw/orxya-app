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
import { Button } from '@/components/ui/button'
import { HolographicCard } from '@/components/ui/HolographicCard'
import { StatCardFuturistic } from '@/components/ui/StatCardFuturistic'
import { NeonButton } from '@/components/ui/NeonButton'
import { GlassPanel } from '@/components/ui/GlassPanel'
import { ThemeToggle } from '@/components/ui/ThemeToggle'
import { Bell, DollarSign, TrendingUp, TrendingDown, Clock, Dumbbell, BookOpen, Footprints, Award, Building, Edit2 } from 'lucide-react'
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
  const [toast, setToast] = useState<string | null>(null)
  const [editingField, setEditingField] = useState<string | null>(null)
  const [editValue, setEditValue] = useState<any>('')
  const [quickAddType, setQuickAddType] = useState<'income' | 'spend' | 'scholarship' | 'villa' | null>(null)
  const [quickAddValue, setQuickAddValue] = useState('')

  async function fetchReport() {
    if (!user) return
    setLoading(true)
    try {
      const { data, error } = await supabase.functions.invoke('report-daily')
      if (error) throw error
      setReport(data?.report ?? null)
      track('report_daily_loaded', { hasReport: !!data?.report })
    } catch (e: any) {
      setReport(null)
    } finally { setLoading(false) }
  }

  useEffect(() => { 
    if (user) {
      fetchReport()
    }
  }, [user?.id])

  async function updateField(field: string, value: any) {
    if (!user) return
    const today = new Date().toISOString().slice(0, 10)
    
    try {
      const parsedValue = Number(value)
      if (isNaN(parsedValue) || parsedValue < 0) {
        setToast('❌ قيمة غير صحيحة')
        return
      }

      // Daily log fields only
      if (field.includes('hours') || field === 'walk_min') {
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
      }
    } catch (error: any) {
      setToast('❌ حدث خطأ في التحديث')
    }
  }

  async function sendCommand(command: 'add_daily_log' | 'add_finance' | 'add_sale', payload: any) {
    try {
      // Validate based on command type
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
      <div className="card group relative overflow-hidden p-6">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
        
        <div className="relative z-10">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs uppercase tracking-wider text-muted-foreground font-medium">
              {label}
            </span>
            <div className="flex items-center gap-2">
              {!isEditing && (
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={() => {
                    setEditingField(field)
                    setEditValue(value || 0)
                  }}
                >
                  <Edit2 className="w-4 h-4" />
                </Button>
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
                <Button
                  size="sm"
                  onClick={() => updateField(field, editValue)}
                  className="flex-1"
                >
                  حفظ
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setEditingField(null)}
                  className="flex-1"
                >
                  إلغاء
                </Button>
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
      </div>
    )
  }

  return (
    <Protected>
      <div className="p-4 space-y-6 max-w-6xl mx-auto">
        <SessionBanner />

        {/* Hero Section */}
        <HolographicCard variant="neon" glow className="p-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text">
                مرحبًا بك في Oryxa
              </h1>
              <p className="text-muted-foreground">ابدأ يومك بإنتاجية عالية</p>
            </div>
            <div className="flex items-center gap-2">
              <ThemeToggle />
              <Button 
                variant="outline"
                size="icon"
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
              </Button>
            </div>
          </div>
        </HolographicCard>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold">التقرير اليومي</h2>
          
          {loading ? (
            <GlassPanel className="p-6 text-center">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              <p className="mt-2 text-sm text-muted-foreground">جار التحميل…</p>
            </GlassPanel>
          ) : report ? (
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <StatCardFuturistic
                icon={<Clock className="w-5 h-5 text-muted-foreground" />}
                label="التاريخ"
                value={report.date}
              />
              <StatCardFuturistic
                icon={<TrendingUp className="w-5 h-5 text-success" />}
                label="الدخل"
                value={`$${report.income_usd}`}
                iconBgClass="bg-success/10"
              />
              <StatCardFuturistic
                icon={<TrendingDown className="w-5 h-5 text-destructive" />}
                label="المصروف"
                value={`$${report.spend_usd}`}
                iconBgClass="bg-destructive/10"
              />
              <StatCardFuturistic
                icon={<DollarSign className="w-5 h-5 text-primary" />}
                label="الصافي"
                value={`${report.net_usd >= 0 ? '✅' : '⚠️'} $${report.net_usd}`}
                iconBgClass="bg-primary/10"
              />
              
              {renderEditableCard('study_hours', <BookOpen className="w-5 h-5 text-primary" />, 'دراسة', report.study_hours, 'bg-primary/10', 'س', 0.5)}
              {renderEditableCard('mma_hours', <Dumbbell className="w-5 h-5 text-warning" />, 'MMA', report.mma_hours, 'bg-warning/10', 'س', 0.5)}
              {renderEditableCard('work_hours', <Clock className="w-5 h-5 text-accent" />, 'عمل', report.work_hours, 'bg-accent/10', 'س', 0.5)}
              {renderEditableCard('walk_min', <Footprints className="w-5 h-5 text-success" />, 'المشي', report.walk_min, 'bg-success/10', 'د', 5)}
              
              <StatCardFuturistic
                icon={<Award className="w-5 h-5 text-warning" />}
                label="منح"
                value={report.scholarships_sold}
                iconBgClass="bg-warning/10"
              />
              <StatCardFuturistic
                icon={<Building className="w-5 h-5 text-primary" />}
                label="فلل"
                value={report.villas_sold}
                iconBgClass="bg-primary/10"
              />
            </div>
          ) : (
            <GlassPanel className="p-8 text-center">
              <p className="text-muted-foreground">لا توجد بيانات لليوم</p>
            </GlassPanel>
          )}
        </section>

        <section className="space-y-4">
          <h3 className="font-semibold text-lg">إجراءات سريعة</h3>
          <div className="grid md:grid-cols-3 gap-4">
            {/* Daily Log */}
            <form id="daily-log-form" onSubmit={(e: any) => {
              e.preventDefault()
              const fd = new FormData(e.currentTarget)
              sendCommand('add_daily_log', {
                log_date: new Date().toISOString().slice(0, 10),
                work_hours: Number(fd.get('work_hours') || 0),
                study_hours: Number(fd.get('study_hours') || 0),
                mma_hours: Number(fd.get('mma_hours') || 0),
                walk_min: Number(fd.get('walk_min') || 0),
                notes: String(fd.get('notes') || '')
              }).then(() => {
                e.currentTarget.reset()
              })
            }}>
              <GlassPanel className="space-y-3">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <span className="text-lg">📝</span>
                  </div>
                  <div className="font-semibold">سجل اليوم</div>
                </div>
                <input 
                  name="work_hours" 
                  placeholder="ساعات العمل" 
                  className="input" 
                  type="number" 
                  step="0.5"
                  max="24"
                  min="0"
                />
                <input 
                  name="study_hours" 
                  placeholder="ساعات الدراسة" 
                  className="input" 
                  type="number" 
                  step="0.5"
                  max="24"
                  min="0"
                />
                <input 
                  name="mma_hours" 
                  placeholder="ساعات MMA" 
                  className="input" 
                  type="number" 
                  step="0.5"
                  max="24"
                  min="0"
                />
                <input 
                  name="walk_min" 
                  placeholder="دقائق المشي" 
                  className="input" 
                  type="number" 
                  step="1"
                  max="1440"
                  min="0"
                />
                <input 
                  name="notes" 
                  placeholder="ملاحظات (حد أقصى 500 حرف)" 
                  className="input"
                  maxLength={500}
                />
                <NeonButton type="submit" variant="primary" className="w-full">حفظ</NeonButton>
              </GlassPanel>
            </form>

            {/* Finance */}
            <form id="finance-form" onSubmit={(e: any) => {
              e.preventDefault()
              const fd = new FormData(e.currentTarget)
              sendCommand('add_finance', {
                entry_date: new Date().toISOString().slice(0, 10),
                type: String(fd.get('type') || 'spend'),
                amount_usd: Number(fd.get('amount_usd') || 0),
                category: String(fd.get('category') || ''),
                note: String(fd.get('note') || '')
              }).then(() => {
                e.currentTarget.reset()
              })
            }}>
              <GlassPanel className="space-y-3">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 rounded-full bg-success/10 flex items-center justify-center">
                    <span className="text-lg">💰</span>
                  </div>
                  <div className="font-semibold">مالية</div>
                </div>
                <select name="type" className="input">
                  <option value="income">دخل</option>
                  <option value="spend">مصروف</option>
                </select>
                <input name="amount_usd" placeholder="المبلغ USD" className="input" type="number" step="0.01" />
                <input name="category" placeholder="تصنيف" className="input" />
                <input name="note" placeholder="ملاحظة" className="input" />
                <NeonButton type="submit" variant="success" className="w-full">حفظ</NeonButton>
              </GlassPanel>
            </form>

            {/* Sales */}
            <form id="sales-form" onSubmit={(e: any) => {
              e.preventDefault()
              const fd = new FormData(e.currentTarget)
              sendCommand('add_sale', {
                sale_date: new Date().toISOString().slice(0, 10),
                type: String(fd.get('stype') || 'scholarship'),
                item: String(fd.get('item') || ''),
                qty: Number(fd.get('qty') || 1),
                price_usd: Number(fd.get('price_usd') || 0),
                profit_usd: Number(fd.get('profit_usd') || 0),
              }).then(() => {
                e.currentTarget.reset()
              })
            }}>
              <GlassPanel className="space-y-3">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 rounded-full bg-warning/10 flex items-center justify-center">
                    <span className="text-lg">🏆</span>
                  </div>
                  <div className="font-semibold">بيع</div>
                </div>
                <select name="stype" className="input">
                  <option value="scholarship">منحة</option>
                  <option value="villa">فيلا</option>
                  <option value="other">أخرى</option>
                </select>
                <input name="item" placeholder="العنصر" className="input" />
                <input name="qty" placeholder="الكمية" className="input" type="number" min="1" />
                <input name="price_usd" placeholder="السعر USD" className="input" type="number" step="0.01" />
                <input name="profit_usd" placeholder="الربح USD" className="input" type="number" step="0.01" />
                <NeonButton type="submit" variant="accent" className="w-full">حفظ</NeonButton>
              </GlassPanel>
            </form>
          </div>
        </section>

        {toast && <Toast msg={toast} />}
      </div>
    </Protected>
  )
}

export default Today

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
import { Bell, DollarSign, TrendingUp, TrendingDown, Clock, Dumbbell, BookOpen, Footprints, Award, Building } from 'lucide-react'

const Today = () => {
  const { user } = useUser()
  const [loading, setLoading] = useState(false)
  const [report, setReport] = useState<any | null>(null)
  const [toast, setToast] = useState<string | null>(null)

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
    if (user) fetchReport() 
  }, [user?.id])

  async function sendCommand(command: 'add_daily_log' | 'add_finance' | 'add_sale', payload: any) {
    try {
      const { error } = await supabase.functions.invoke('commands', {
        body: { command, idempotency_key: genIdem(), payload }
      })
      if (error) throw error
      setToast('تم الحفظ ✅')
      track('command_sent', { command })
      await fetchReport()
    } catch (error) {
      await enqueueCommand(command, payload)
      track('command_queued_offline', { command })
      setToast('تم الحفظ أوفلاين وسيُرفع بعد تسجيل الدخول/الاتصال 🔄')
    }
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
              <StatCardFuturistic
                icon={<BookOpen className="w-5 h-5 text-primary" />}
                label="دراسة"
                value={`${report.study_hours}س`}
              />
              <StatCardFuturistic
                icon={<Dumbbell className="w-5 h-5 text-warning" />}
                label="MMA"
                value={`${report.mma_hours}س`}
                iconBgClass="bg-warning/10"
              />
              <StatCardFuturistic
                icon={<Clock className="w-5 h-5 text-accent" />}
                label="عمل"
                value={`${report.work_hours}س`}
                iconBgClass="bg-accent/10"
              />
              <StatCardFuturistic
                icon={<Footprints className="w-5 h-5 text-success" />}
                label="المشي"
                value={`${report.walk_min}د`}
                iconBgClass="bg-success/10"
              />
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
            <form onSubmit={(e: any) => {
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
                <input name="work_hours" placeholder="ساعات العمل" className="input" type="number" step="0.5" />
                <input name="study_hours" placeholder="ساعات الدراسة" className="input" type="number" step="0.5" />
                <input name="mma_hours" placeholder="ساعات MMA" className="input" type="number" step="0.5" />
                <input name="walk_min" placeholder="دقائق المشي" className="input" type="number" step="1" />
                <input name="notes" placeholder="ملاحظات" className="input" />
                <NeonButton type="submit" variant="primary" className="w-full">حفظ</NeonButton>
              </GlassPanel>
            </form>

            {/* Finance */}
            <form onSubmit={(e: any) => {
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
            <form onSubmit={(e: any) => {
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

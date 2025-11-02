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
      fetchReport()
    } catch {
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
        <div className="relative overflow-hidden rounded-3xl p-8 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border border-primary/20">
          <div className="absolute inset-0 opacity-10">
            <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary rounded-full blur-3xl" />
            <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-success rounded-full blur-3xl" />
          </div>
          
          <div className="relative z-10">
            <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
              مرحبًا بك في Oryxa
            </h1>
            <p className="text-muted-foreground">ابدأ يومك بإنتاجية عالية</p>
          </div>
        </div>

        <section className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold">التقرير اليومي</h2>
            <button 
              className="btn-ghost-glow px-4 py-2 rounded-xl text-sm"
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
              اختبار إشعار
            </button>
          </div>
          
          {loading ? (
            <div className="card-glass p-6 text-center">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              <p className="mt-2 text-sm text-muted-foreground">جار التحميل…</p>
            </div>
          ) : report ? (
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <div className="card group p-4">
                <div className="text-xs text-muted-foreground mb-1">التاريخ</div>
                <div className="text-lg font-bold">{report.date}</div>
              </div>
              <div className="card group p-4 border-success/30">
                <div className="text-xs text-muted-foreground mb-1">الدخل</div>
                <div className="text-lg font-bold text-success">${report.income_usd}</div>
              </div>
              <div className="card group p-4 border-destructive/30">
                <div className="text-xs text-muted-foreground mb-1">المصروف</div>
                <div className="text-lg font-bold text-destructive">${report.spend_usd}</div>
              </div>
              <div className="card group p-4 border-primary/30">
                <div className="text-xs text-muted-foreground mb-1">الصافي</div>
                <div className="text-lg font-bold">{report.net_usd >= 0 ? '✅' : '⚠️'} ${report.net_usd}</div>
              </div>
              <div className="card group p-4">
                <div className="text-xs text-muted-foreground mb-1">دراسة</div>
                <div className="text-lg font-bold">{report.study_hours}س</div>
              </div>
              <div className="card group p-4">
                <div className="text-xs text-muted-foreground mb-1">MMA</div>
                <div className="text-lg font-bold">{report.mma_hours}س</div>
              </div>
              <div className="card group p-4">
                <div className="text-xs text-muted-foreground mb-1">عمل</div>
                <div className="text-lg font-bold">{report.work_hours}س</div>
              </div>
              <div className="card group p-4">
                <div className="text-xs text-muted-foreground mb-1">المشي</div>
                <div className="text-lg font-bold">{report.walk_min}د</div>
              </div>
              <div className="card group p-4">
                <div className="text-xs text-muted-foreground mb-1">منح</div>
                <div className="text-lg font-bold">{report.scholarships_sold}</div>
              </div>
              <div className="card group p-4">
                <div className="text-xs text-muted-foreground mb-1">فلل</div>
                <div className="text-lg font-bold">{report.villas_sold}</div>
              </div>
            </div>
          ) : (
            <div className="card-glass p-8 text-center">
              <p className="text-muted-foreground">لا توجد بيانات لليوم</p>
            </div>
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
              })
              e.currentTarget.reset()
            }}>
              <div className="card p-6 space-y-3">
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
                <button className="btn btn-futuristic btn-gradient w-full">حفظ</button>
              </div>
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
              })
              e.currentTarget.reset()
            }}>
              <div className="card p-6 space-y-3">
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
                <button className="btn btn-futuristic btn-gradient w-full">حفظ</button>
              </div>
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
              })
              e.currentTarget.reset()
            }}>
              <div className="card p-6 space-y-3">
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
                <button className="btn btn-futuristic btn-gradient w-full">حفظ</button>
              </div>
            </form>
          </div>
        </section>

        {toast && <Toast msg={toast} />}
      </div>
    </Protected>
  )
}

export default Today

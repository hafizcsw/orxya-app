import { useEffect, useState } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { enqueueCommand } from '@/lib/offline-actions'
import { genIdem } from '@/lib/sync'
import { useUser } from '@/lib/auth'
import { Toast } from '@/components/Toast'

const Today = () => {
  const { user } = useUser()
  const [loading, setLoading] = useState(false)
  const [report, setReport] = useState<any | null>(null)
  const [toast, setToast] = useState<string | null>(null)

  async function fetchReport() {
    setLoading(true)
    try {
      const { data, error } = await supabase.functions.invoke('report-daily')
      if (error) throw error
      setReport(data?.report ?? null)
    } catch (e: any) {
      setReport(null)
    } finally { setLoading(false) }
  }

  useEffect(() => { fetchReport() }, [user?.id])

  async function sendCommand(command: 'add_daily_log' | 'add_finance' | 'add_sale', payload: any) {
    try {
      const { error } = await supabase.functions.invoke('commands', {
        body: { command, idempotency_key: genIdem(), payload }
      })
      if (error) throw error
      setToast('تم الحفظ ✅')
      fetchReport()
    } catch {
      await enqueueCommand(command, payload)
      setToast('تم الحفظ أوفلاين وسيُرفع بعد تسجيل الدخول/الاتصال 🔄')
    }
  }

  return (
    <div className="p-4 space-y-6 max-w-6xl mx-auto">
      {!user && (
        <div className="bg-yellow-50 border border-yellow-200 text-yellow-900 p-3 rounded-lg">
          لا توجد جلسة تسجيل دخول. ستُحفظ إدخالاتك أوفلاين وتُزامَن لاحقًا بعد تسجيل الدخول.
        </div>
      )}

      <section className="space-y-2">
        <h2 className="text-xl font-semibold">التقرير اليومي</h2>
        <div className="p-4 rounded-2xl border bg-white">
          {loading ? 'جار التحميل…' : report ? (
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3 text-sm">
              <div>التاريخ: <b>{report.date}</b></div>
              <div>الدخل: <b className="text-green-600">${report.income_usd}</b></div>
              <div>المصروف: <b className="text-red-600">${report.spend_usd}</b></div>
              <div>الصافي: <b>{report.net_usd >= 0 ? '✅' : '⚠️'} ${report.net_usd}</b></div>
              <div>دراسة: <b>{report.study_hours}س</b></div>
              <div>MMA: <b>{report.mma_hours}س</b></div>
              <div>عمل: <b>{report.work_hours}س</b></div>
              <div>المشي: <b>{report.walk_min}د</b></div>
              <div>منح: <b>{report.scholarships_sold}</b></div>
              <div>فلل: <b>{report.villas_sold}</b></div>
            </div>
          ) : 'لا توجد بيانات لليوم.'}
        </div>
      </section>

      <section className="space-y-3">
        <h3 className="font-semibold">إجراءات سريعة</h3>
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
            <div className="p-4 border rounded-2xl bg-white space-y-2">
              <div className="font-medium">سجل اليوم</div>
              <input name="work_hours" placeholder="ساعات العمل" className="input" type="number" step="0.5" />
              <input name="study_hours" placeholder="ساعات الدراسة" className="input" type="number" step="0.5" />
              <input name="mma_hours" placeholder="ساعات MMA" className="input" type="number" step="0.5" />
              <input name="walk_min" placeholder="دقائق المشي" className="input" type="number" step="1" />
              <input name="notes" placeholder="ملاحظات" className="input" />
              <button className="btn">حفظ</button>
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
            <div className="p-4 border rounded-2xl bg-white space-y-2">
              <div className="font-medium">مالية</div>
              <select name="type" className="input">
                <option value="income">دخل</option>
                <option value="spend">مصروف</option>
              </select>
              <input name="amount_usd" placeholder="المبلغ USD" className="input" type="number" step="0.01" />
              <input name="category" placeholder="تصنيف" className="input" />
              <input name="note" placeholder="ملاحظة" className="input" />
              <button className="btn">حفظ</button>
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
            <div className="p-4 border rounded-2xl bg-white space-y-2">
              <div className="font-medium">بيع</div>
              <select name="stype" className="input">
                <option value="scholarship">منحة</option>
                <option value="villa">فيلا</option>
                <option value="other">أخرى</option>
              </select>
              <input name="item" placeholder="العنصر" className="input" />
              <input name="qty" placeholder="الكمية" className="input" type="number" min="1" />
              <input name="price_usd" placeholder="السعر USD" className="input" type="number" step="0.01" />
              <input name="profit_usd" placeholder="الربح USD" className="input" type="number" step="0.01" />
              <button className="btn">حفظ</button>
            </div>
          </form>
        </div>
      </section>

      {toast && <Toast msg={toast} />}
    </div>
  )
}

export default Today

/**
 * LegacyToday - Wrapper للصفحة القديمة
 * لا تعديل - فقط إظهار المحتوى القديم كما هو
 */

import { OryxaCard } from '@/components/oryxa/Card'
import { StatRing } from '@/components/oryxa/StatRing'
import { useNavigate } from 'react-router-dom'
import { BookOpen, Dumbbell, Building, Footprints } from 'lucide-react'

export function LegacyToday({ report, loading }: { 
  report: any; 
  loading: boolean;
}) {
  const navigate = useNavigate()

  if (loading) {
    return (
      <OryxaCard className="p-6 text-center">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        <p className="mt-2 text-sm text-muted-foreground">جار التحميل…</p>
      </OryxaCard>
    )
  }

  if (!report) {
    return (
      <OryxaCard className="p-6 text-center">
        <p className="text-muted-foreground">لا توجد بيانات</p>
      </OryxaCard>
    )
  }

  return (
    <div className="space-y-6">
      {/* Financial Rings - العرض القديم كما هو */}
      <div className="relative">
        <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-transparent to-transparent blur-3xl -z-10" />
        
        <div className="grid grid-cols-3 gap-2 mb-6">
          {/* Balance Ring */}
          <div className="flex flex-col items-center group">
            <div className="relative scale-75 md:scale-100">
              <div className="absolute inset-0 bg-[hsl(var(--whoop-blue))] opacity-20 blur-2xl rounded-full scale-150 group-hover:scale-[2] transition-transform duration-700" />
              <div className="relative transform transition-all duration-500 hover:scale-110">
                <StatRing
                  value={Math.min(100, Math.max(0, ((report.current_balance || 0) / 10000) * 100))}
                  label="الرصيد"
                  subtitle="BALANCE"
                  color="hsl(var(--whoop-blue))"
                  size="sm"
                  customDisplay={`$${(report.current_balance || 0).toFixed(0)}`}
                />
              </div>
            </div>
          </div>
          
          {/* Income Ring */}
          <div className="flex flex-col items-center group">
            <div className="relative scale-75 md:scale-100">
              <div className="absolute inset-0 bg-[hsl(var(--whoop-green))] opacity-20 blur-2xl rounded-full scale-150 group-hover:scale-[2] transition-transform duration-700" />
              <div className="relative transform transition-all duration-500 hover:scale-110">
                <StatRing
                  value={Math.min(100, Math.max(0, ((report.total_income || 0) / 5000) * 100))}
                  label="الدخل"
                  subtitle="INCOME"
                  color="hsl(var(--whoop-green))"
                  size="sm"
                  customDisplay={`$${report.total_income || 0}`}
                />
              </div>
            </div>
          </div>
          
          {/* Expenses Ring */}
          <div className="flex flex-col items-center group cursor-pointer" onClick={() => navigate('/expenses')}>
            <div className="relative scale-75 md:scale-100">
              <div className="absolute inset-0 bg-[hsl(var(--whoop-red))] opacity-20 blur-2xl rounded-full scale-150 group-hover:scale-[2] transition-transform duration-700" />
              <div className="relative transform transition-all duration-500 hover:scale-110">
                <StatRing
                  value={Math.min(100, Math.max(0, ((report.total_spend || 0) / 5000) * 100))}
                  label="المصروفات"
                  subtitle="EXPENSES"
                  color="hsl(var(--whoop-red))"
                  size="sm"
                  customDisplay={`$${report.total_spend || 0}`}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Activity Stats - عرض بسيط */}
        <div className="grid grid-cols-2 gap-3">
          <OryxaCard className="p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-muted-foreground">دراسة</span>
              <BookOpen className="w-4 h-4" />
            </div>
            <div className="text-2xl font-bold">{report.study_hours || 0}h</div>
          </OryxaCard>
          
          <OryxaCard className="p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-muted-foreground">رياضة</span>
              <Dumbbell className="w-4 h-4" />
            </div>
            <div className="text-2xl font-bold">{report.mma_hours || 0}h</div>
          </OryxaCard>
          
          <OryxaCard className="p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-muted-foreground">عمل</span>
              <Building className="w-4 h-4" />
            </div>
            <div className="text-2xl font-bold">{report.work_hours || 0}h</div>
          </OryxaCard>
          
          <OryxaCard className="p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-muted-foreground">مشي</span>
              <Footprints className="w-4 h-4" />
            </div>
            <div className="text-2xl font-bold">{report.walk_min || 0}min</div>
          </OryxaCard>
        </div>
      </div>
    </div>
  )
}
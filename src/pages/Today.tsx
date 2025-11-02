import { useEffect, useState } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { useUser } from '@/lib/auth'
import { Protected } from '@/components/Protected'
import { StatRing } from '@/components/oryxa/StatRing'
import { CalendarMini } from '@/components/oryxa/CalendarMini'
import { OryxaCard } from '@/components/oryxa/Card'
import { OryxaButton } from '@/components/oryxa/Button'
import { Badge } from '@/components/oryxa/Badges'
import { AIDock } from '@/components/oryxa/AIDock'
import { User, ChevronLeft, ChevronRight, Calendar, TrendingUp, Activity } from 'lucide-react'
import { format, addDays } from 'date-fns'
import { ar } from 'date-fns/locale'

const Today = () => {
  const { user } = useUser()
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [stats, setStats] = useState({
    recovery: 76,
    sleep: 8.2,
    strain: 12.4,
  })

  // Mock events for calendar
  const mockEvents = [
    { date: new Date(), type: 'prayer' as const },
    { date: addDays(new Date(), 1), type: 'task' as const },
    { date: addDays(new Date(), 2), type: 'meeting' as const },
  ]

  return (
    <Protected>
      <div className="min-h-screen bg-background">
        {/* AI Dock */}
        <AIDock />

        {/* Sticky Header */}
        <div className="sticky top-0 z-30 bg-card/80 backdrop-blur-lg border-b border-border/50 px-6 py-4">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            {/* User Avatar */}
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-secondary flex items-center justify-center">
                <User className="w-6 h-6 text-muted-foreground" />
              </div>
              <div>
                <div className="text-sm text-muted-foreground">مرحباً</div>
                <div className="font-semibold">{user?.email?.split('@')[0] || 'مستخدم'}</div>
              </div>
            </div>

            {/* Date Navigation */}
            <div className="flex items-center gap-4">
              <button 
                onClick={() => setSelectedDate(d => addDays(d, -1))}
                className="p-2 rounded-full hover:bg-secondary transition-colors"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
              
              <div className="text-center min-w-[140px]">
                <div className="text-2xl font-bold">
                  {format(selectedDate, 'd', { locale: ar })}
                </div>
                <div className="text-sm text-muted-foreground">
                  {format(selectedDate, 'EEEE، MMMM', { locale: ar })}
                </div>
              </div>

              <button 
                onClick={() => setSelectedDate(d => addDays(d, 1))}
                className="p-2 rounded-full hover:bg-secondary transition-colors"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
            </div>

            <div className="w-12" /> {/* Spacer for balance */}
          </div>
        </div>

        {/* Main Content */}
        <div className="max-w-7xl mx-auto px-6 py-8 space-y-8">
          
          {/* Stat Rings - Hero Section */}
          <section>
            <div className="grid grid-cols-3 gap-8 mb-8">
              <StatRing
                value={stats.recovery}
                label="Recovery"
                subtitle="الاستشفاء"
                color="hsl(var(--whoop-green))"
                size="lg"
              />
              <StatRing
                value={85}
                label="Sleep"
                subtitle={`${stats.sleep} ساعات`}
                color="hsl(var(--whoop-yellow))"
                size="lg"
              />
              <StatRing
                value={stats.strain}
                label="Strain"
                subtitle="الإجهاد"
                color="hsl(var(--whoop-red))"
                size="lg"
              />
            </div>
          </section>

          {/* Calendar Mini */}
          <section>
            <CalendarMini
              selectedDate={selectedDate}
              events={mockEvents}
              onDateClick={setSelectedDate}
            />
          </section>

          {/* My Day Section */}
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold">يومي</h2>
              <Badge label="3 مهام" variant="default" />
            </div>

            <div className="grid gap-4">
              <OryxaCard className="hover:bg-accent/30">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-3 h-3 rounded-full bg-[hsl(var(--whoop-green))]" />
                    <div>
                      <div className="font-medium">صلاة الفجر</div>
                      <div className="text-sm text-muted-foreground">05:30 صباحاً</div>
                    </div>
                  </div>
                  <Badge label="مكتملة" variant="sleep" />
                </div>
              </OryxaCard>

              <OryxaCard className="hover:bg-accent/30">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-3 h-3 rounded-full bg-[hsl(var(--whoop-blue))]" />
                    <div>
                      <div className="font-medium">اجتماع الفريق</div>
                      <div className="text-sm text-muted-foreground">10:00 صباحاً</div>
                    </div>
                  </div>
                  <Badge label="قادمة" variant="default" />
                </div>
              </OryxaCard>

              <OryxaCard className="hover:bg-accent/30">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-3 h-3 rounded-full bg-[hsl(var(--whoop-red))]" />
                    <div>
                      <div className="font-medium">تمرين MMA</div>
                      <div className="text-sm text-muted-foreground">06:00 مساءً</div>
                    </div>
                  </div>
                  <Badge label="هامة" variant="strain" />
                </div>
              </OryxaCard>
            </div>
          </section>

          {/* My Plan Section */}
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold">خطتي</h2>
              <OryxaButton variant="primary" size="sm">
                إضافة مهمة
              </OryxaButton>
            </div>

            <OryxaCard>
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <Activity className="w-5 h-5 text-[hsl(var(--whoop-blue))]" />
                  <div className="flex-1">
                    <div className="font-medium">أهداف اليوم</div>
                    <div className="text-sm text-muted-foreground">
                      تحقيق 3 من 5 أهداف
                    </div>
                  </div>
                  <div className="text-2xl font-bold text-[hsl(var(--whoop-blue))]">
                    60%
                  </div>
                </div>

                <div className="h-2 bg-secondary rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-[hsl(var(--whoop-blue))] transition-all duration-500"
                    style={{ width: '60%', boxShadow: 'var(--glow-blue)' }}
                  />
                </div>
              </div>
            </OryxaCard>

            <OryxaCard>
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <TrendingUp className="w-5 h-5 text-[hsl(var(--whoop-green))]" />
                  <div className="flex-1">
                    <div className="font-medium">الإنتاجية</div>
                    <div className="text-sm text-muted-foreground">
                      أعلى من المتوسط بنسبة 23%
                    </div>
                  </div>
                  <Badge label="+23%" variant="recovery" />
                </div>
              </div>
            </OryxaCard>
          </section>

          {/* Quick Actions */}
          <section className="pb-8">
            <div className="grid grid-cols-2 gap-4">
              <OryxaButton variant="secondary" size="lg" className="gap-2">
                <Calendar className="w-5 h-5" />
                التقويم الكامل
              </OryxaButton>
              <OryxaButton variant="secondary" size="lg" className="gap-2">
                <TrendingUp className="w-5 h-5" />
                التقارير
              </OryxaButton>
            </div>
          </section>

        </div>
      </div>
    </Protected>
  )
}


export default Today

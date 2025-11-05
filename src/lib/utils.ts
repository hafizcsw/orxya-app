import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Helper functions for Today page insights

export function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('ar', { 
    weekday: 'long',
    month: 'short', 
    day: 'numeric' 
  })
}

export function calculateChange(current: number, previous: number): number {
  if (previous === 0) return 0
  return ((current - previous) / previous) * 100
}

export function generateInsights(current: any, previous: any, rawData: any[], period: string) {
  const insights: Array<{
    type: 'positive' | 'negative' | 'neutral' | 'warning'
    icon: 'zap' | 'trending' | 'warning' | 'award' | 'target' | 'sparkles'
    text: string
  }> = []

  if (!current || !previous || !rawData || rawData.length === 0) return insights

  // Financial insights
  const incomeChange = calculateChange(current.income_usd, previous.income_usd)
  if (incomeChange > 20) {
    insights.push({
      type: 'positive',
      icon: 'trending',
      text: `دخلك ${period === 'weekly' ? 'هذا الأسبوع' : period === 'monthly' ? 'هذا الشهر' : 'هذه السنة'} أعلى بـ ${incomeChange.toFixed(0)}% من السابق! 🎉 استمر في هذا الأداء الرائع`
    })
  }

  const spendChange = calculateChange(current.spend_usd, previous.spend_usd)
  if (spendChange > 30) {
    insights.push({
      type: 'warning',
      icon: 'warning',
      text: `لاحظنا ارتفاعاً في المصروفات بنسبة ${spendChange.toFixed(0)}% ⚠️ قد يكون الوقت مناسباً لمراجعة النفقات`
    })
  } else if (spendChange < -20) {
    insights.push({
      type: 'positive',
      icon: 'target',
      text: `رائع! انخفضت مصروفاتك بنسبة ${Math.abs(spendChange).toFixed(0)}% 💰 ادخار ممتاز`
    })
  }

  // Best day analysis
  if (rawData.length > 1) {
    const bestDay = rawData.reduce((max, day) => 
      (day.net_usd || 0) > (max.net_usd || 0) ? day : max
    )
    if (bestDay.net_usd > 0) {
      insights.push({
        type: 'neutral',
        icon: 'award',
        text: `أفضل يوم لك كان ${formatDate(bestDay.day)} بصافي +$${bestDay.net_usd.toFixed(0)} 🏆`
      })
    }
  }

  // Activity insights
  const workChange = calculateChange(current.work_hours || 0, previous.work_hours || 0)
  if (workChange < -20) {
    insights.push({
      type: 'warning',
      icon: 'warning',
      text: `انخفضت ساعات العمل بنسبة ${Math.abs(workChange).toFixed(0)}% 📉 هل تحتاج إلى تنظيم أفضل للوقت؟`
    })
  }

  // Sleep insights
  const avgSleep = current.sleep_hours || 0
  if (avgSleep >= 7) {
    insights.push({
      type: 'positive',
      icon: 'sparkles',
      text: `معدل نومك ممتاز ${avgSleep.toFixed(1)} ساعة! 😴 استمر في المحافظة على هذا الروتين الصحي`
    })
  } else if (avgSleep < 6) {
    insights.push({
      type: 'negative',
      icon: 'warning',
      text: `معدل نومك ${avgSleep.toFixed(1)} ساعة فقط ⚠️ النوم الكافي ضروري للصحة والإنتاجية`
    })
  }

  // Net insights
  if (current.net_usd > previous.net_usd && current.net_usd > 0) {
    insights.push({
      type: 'positive',
      icon: 'zap',
      text: `صافي ربحك تحسن من $${previous.net_usd.toFixed(0)} إلى $${current.net_usd.toFixed(0)}! 📈 أداء مالي رائع`
    })
  }

  return insights.slice(0, 3) // Return max 3 insights
}

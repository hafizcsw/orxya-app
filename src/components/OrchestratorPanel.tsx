import { useState } from 'react';
import { Brain, Calendar, TrendingUp, Sparkles, CheckCircle2 } from 'lucide-react';
import { NeonButton } from '@/components/ui/NeonButton';
import { HolographicCard } from '@/components/ui/HolographicCard';
import { supabase } from '@/integrations/supabase/client';
import { useUser } from '@/lib/auth';
import { track } from '@/lib/telemetry';

export function OrchestratorPanel() {
  const { user } = useUser();
  const [loading, setLoading] = useState(false);
  const [plan, setPlan] = useState<any>(null);

  const requestPlan = async (intent: string) => {
    if (!user) return;
    setLoading(true);
    setPlan(null);
    
    try {
      const { data } = await supabase.functions.invoke('ai-orchestrate', {
        body: { intent, date: new Date().toISOString().slice(0, 10) }
      });
      setPlan(data);
      track('orchestrator_plan_request', { intent });
    } catch (e: any) {
      alert('خطأ: ' + e.message);
    } finally {
      setLoading(false);
    }
  };

  const applyPlan = async () => {
    if (!user || !plan?.plan) return;
    
    try {
      const { data } = await supabase.rpc('apply_orchestrator_plan' as any, {
        p_owner_id: user.id,
        p_run_id: crypto.randomUUID(),
        p_tasks: plan.plan.tasks || [],
        p_events: plan.plan.events || []
      }) as { data: { tasks_created: number; events_created: number } | null };
      
      alert(`تم! ${data?.tasks_created || 0} مهام • ${data?.events_created || 0} أحداث`);
      setPlan(null);
      track('orchestrator_plan_approve');
    } catch (e: any) {
      alert('خطأ: ' + e.message);
    }
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { intent: 'plan_today', label: 'خطة اليوم', icon: Calendar },
          { intent: 'plan_tomorrow', label: 'خطة الغد', icon: Calendar },
          { intent: 'plan_week', label: 'خطة الأسبوع', icon: TrendingUp },
          { intent: 'fill_gaps', label: 'سدّ النواقص', icon: Sparkles }
        ].map(({ intent, label, icon: Icon }) => (
          <NeonButton key={intent} onClick={() => requestPlan(intent)} disabled={loading} variant="primary">
            <Icon className="w-5 h-5 ml-2" />
            {label}
          </NeonButton>
        ))}
      </div>

      {plan && (
        <HolographicCard variant="neon" className="p-6">
          <h3 className="text-xl font-bold gradient-text mb-4">الخطة المقترحة</h3>
          {plan.plan?.tasks?.length > 0 && (
            <div className="mb-4">
              <p className="font-semibold mb-2">المهام ({plan.plan.tasks.length})</p>
              {plan.plan.tasks.slice(0, 5).map((t: any, i: number) => (
                <div key={i} className="text-sm p-2 bg-muted/30 rounded mb-1">• {t.title}</div>
              ))}
            </div>
          )}
          <NeonButton onClick={applyPlan} variant="primary" glow>
            <CheckCircle2 className="w-4 h-4 ml-2" />
            اعتماد الخطة
          </NeonButton>
        </HolographicCard>
      )}
    </div>
  );
}

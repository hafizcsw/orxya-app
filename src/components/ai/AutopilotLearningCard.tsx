import { useEffect, useState } from 'react';
import { Brain, TrendingUp, CheckCircle2, XCircle, Clock } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface LearningStats {
  total_decisions: number;
  accepted_count: number;
  rejected_count: number;
  acceptance_rate: number;
  top_actions: Array<{ action: string; count: number; rate: number }>;
}

export function AutopilotLearningCard() {
  const { user } = useAuth();
  const [stats, setStats] = useState<LearningStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    loadLearningStats();
  }, [user]);

  const loadLearningStats = async () => {
    if (!user) return;
    
    try {
      const { data: learning } = await supabase
        .from('autopilot_learning')
        .select('*')
        .eq('owner_id', user.id)
        .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());

      if (!learning) {
        setStats(null);
        return;
      }

      const total = learning.length;
      const accepted = learning.filter(l => l.user_decision === 'accepted').length;
      const rejected = learning.filter(l => l.user_decision === 'rejected').length;

      // حساب أفضل الإجراءات
      const actionCounts: Record<string, { total: number; accepted: number }> = {};
      learning.forEach(l => {
        if (!actionCounts[l.suggested_action]) {
          actionCounts[l.suggested_action] = { total: 0, accepted: 0 };
        }
        actionCounts[l.suggested_action].total++;
        if (l.user_decision === 'accepted') {
          actionCounts[l.suggested_action].accepted++;
        }
      });

      const topActions = Object.entries(actionCounts)
        .map(([action, counts]) => ({
          action,
          count: counts.total,
          rate: (counts.accepted / counts.total) * 100
        }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 3);

      setStats({
        total_decisions: total,
        accepted_count: accepted,
        rejected_count: rejected,
        acceptance_rate: total > 0 ? (accepted / total) * 100 : 0,
        top_actions: topActions
      });
    } catch (error) {
      console.error('Error loading learning stats:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card className="bg-card/50 backdrop-blur">
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <Clock className="w-5 h-5 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!stats || stats.total_decisions === 0) {
    return (
      <Card className="bg-card/50 backdrop-blur">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Brain className="w-5 h-5 text-primary" />
            التعلم الذكي
          </CardTitle>
          <CardDescription>
            Autopilot سيتعلم من قراراتك تلقائياً
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            لم يتم اتخاذ قرارات بعد. سيبدأ النظام بالتعلم من اختياراتك قريباً.
          </p>
        </CardContent>
      </Card>
    );
  }

  const getActionLabel = (action: string) => {
    const labels: Record<string, string> = {
      reschedule: 'إعادة جدولة',
      shorten: 'تقصير',
      make_transparent: 'جعله شفاف',
      make_tentative: 'جعله مبدئي',
      cancel: 'إلغاء'
    };
    return labels[action] || action;
  };

  return (
    <Card className="bg-card/50 backdrop-blur">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Brain className="w-5 h-5 text-primary" />
          التعلم الذكي
          <Badge variant="secondary" className="mr-auto">
            آخر 30 يوم
          </Badge>
        </CardTitle>
        <CardDescription>
          Autopilot يتعلم من قراراتك تلقائياً
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* الإحصائيات الرئيسية */}
        <div className="grid grid-cols-3 gap-4">
          <div className="space-y-1">
            <p className="text-2xl font-bold text-foreground">
              {stats.total_decisions}
            </p>
            <p className="text-xs text-muted-foreground">قرار</p>
          </div>
          
          <div className="space-y-1">
            <p className="text-2xl font-bold text-green-500 flex items-center gap-1">
              <CheckCircle2 className="w-4 h-4" />
              {stats.accepted_count}
            </p>
            <p className="text-xs text-muted-foreground">مقبول</p>
          </div>
          
          <div className="space-y-1">
            <p className="text-2xl font-bold text-red-500 flex items-center gap-1">
              <XCircle className="w-4 h-4" />
              {stats.rejected_count}
            </p>
            <p className="text-xs text-muted-foreground">مرفوض</p>
          </div>
        </div>

        {/* معدل القبول */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">معدل القبول</span>
            <span className="font-semibold flex items-center gap-1">
              <TrendingUp className="w-4 h-4 text-primary" />
              {stats.acceptance_rate.toFixed(0)}%
            </span>
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-primary to-primary/60 transition-all"
              style={{ width: `${stats.acceptance_rate}%` }}
            />
          </div>
        </div>

        {/* أفضل الإجراءات */}
        {stats.top_actions.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-semibold text-foreground">أكثر الإجراءات استخداماً</h4>
            <div className="space-y-2">
              {stats.top_actions.map((action, idx) => (
                <div key={idx} className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">{getActionLabel(action.action)}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">{action.count}×</span>
                    <Badge 
                      variant={action.rate >= 70 ? 'default' : action.rate >= 50 ? 'secondary' : 'outline'}
                      className="text-xs"
                    >
                      {action.rate.toFixed(0)}%
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <p className="text-xs text-muted-foreground mt-4">
          كلما استخدمت Autopilot أكثر، كلما أصبح أذكى في فهم تفضيلاتك
        </p>
      </CardContent>
    </Card>
  );
}

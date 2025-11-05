import { useState } from 'react';
import { Calendar, Clock, Zap, Coffee, Lightbulb, Loader2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useUser } from '@/lib/auth';
import { toast } from 'sonner';

interface DailyPlan {
  plan: {
    morning_block: {
      time_range: string;
      suggested_tasks: string[];
      focus_type: string;
    };
    afternoon_block: {
      time_range: string;
      suggested_tasks: string[];
      focus_type: string;
    };
    evening_block: {
      time_range: string;
      suggested_tasks: string[];
      focus_type: string;
    };
    breaks: string[];
    conflicts_resolution?: string[];
    productivity_tips: string[];
    priority_tasks?: string[];
  };
}

export function SmartDailyPlan() {
  const { user } = useUser();
  const [loading, setLoading] = useState(false);
  const [plan, setPlan] = useState<DailyPlan | null>(null);

  const generatePlan = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      const today = new Date().toISOString().split('T')[0];
      
      const { data, error } = await supabase.functions.invoke('ai-orchestrator-v2', {
        body: { intent: 'plan_my_day', date: today }
      });

      if (error) throw error;

      if (data?.result) {
        setPlan(data.result);
        toast.success('تم إنشاء خطة ذكية ليومك! 🎯');
      }
    } catch (error: any) {
      console.error('Error generating plan:', error);
      toast.error('حدث خطأ أثناء إنشاء الخطة');
    } finally {
      setLoading(false);
    }
  };

  const getBlockIcon = (focusType: string) => {
    switch (focusType.toLowerCase()) {
      case 'deep work':
      case 'عمل عميق':
        return <Zap className="w-4 h-4" />;
      case 'meetings':
      case 'اجتماعات':
        return <Calendar className="w-4 h-4" />;
      case 'rest':
      case 'راحة':
        return <Coffee className="w-4 h-4" />;
      default:
        return <Clock className="w-4 h-4" />;
    }
  };

  const getBlockColor = (focusType: string) => {
    switch (focusType.toLowerCase()) {
      case 'deep work':
      case 'عمل عميق':
        return 'bg-primary/10 border-primary/20 text-primary';
      case 'meetings':
      case 'اجتماعات':
        return 'bg-blue-500/10 border-blue-500/20 text-blue-500';
      case 'rest':
      case 'راحة':
        return 'bg-green-500/10 border-green-500/20 text-green-500';
      default:
        return 'bg-muted border-border text-foreground';
    }
  };

  return (
    <Card className="bg-card/50 backdrop-blur">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-primary" />
              خطتك الذكية اليوم
            </CardTitle>
            <CardDescription>
              مخطط يومي ذكي يحترم الصلاة ويعزز إنتاجيتك
            </CardDescription>
          </div>
          <Button 
            onClick={generatePlan} 
            disabled={loading}
            size="sm"
            className="gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                جاري التخطيط...
              </>
            ) : (
              <>
                <Lightbulb className="w-4 h-4" />
                خطط يومي
              </>
            )}
          </Button>
        </div>
      </CardHeader>

      {plan && (
        <CardContent className="space-y-6">
          {/* Priority Tasks */}
          {plan.plan.priority_tasks && plan.plan.priority_tasks.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <Zap className="w-4 h-4 text-yellow-500" />
                أهم المهام اليوم
              </h4>
              <div className="space-y-1">
                {plan.plan.priority_tasks.map((task, idx) => (
                  <div key={idx} className="flex items-start gap-2 text-sm">
                    <Badge variant="outline" className="mt-0.5">{idx + 1}</Badge>
                    <span className="text-muted-foreground">{task}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Time Blocks */}
          <div className="space-y-4">
            <h4 className="text-sm font-semibold text-foreground">توزيع اليوم</h4>
            
            {/* Morning */}
            <div className={`p-4 rounded-lg border ${getBlockColor(plan.plan.morning_block.focus_type)}`}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  {getBlockIcon(plan.plan.morning_block.focus_type)}
                  <span className="font-semibold">الصباح</span>
                </div>
                <Badge variant="outline">{plan.plan.morning_block.time_range}</Badge>
              </div>
              <p className="text-sm mb-2 opacity-90">{plan.plan.morning_block.focus_type}</p>
              <ul className="space-y-1">
                {plan.plan.morning_block.suggested_tasks.map((task, idx) => (
                  <li key={idx} className="text-sm opacity-80">• {task}</li>
                ))}
              </ul>
            </div>

            {/* Afternoon */}
            <div className={`p-4 rounded-lg border ${getBlockColor(plan.plan.afternoon_block.focus_type)}`}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  {getBlockIcon(plan.plan.afternoon_block.focus_type)}
                  <span className="font-semibold">بعد الظهر</span>
                </div>
                <Badge variant="outline">{plan.plan.afternoon_block.time_range}</Badge>
              </div>
              <p className="text-sm mb-2 opacity-90">{plan.plan.afternoon_block.focus_type}</p>
              <ul className="space-y-1">
                {plan.plan.afternoon_block.suggested_tasks.map((task, idx) => (
                  <li key={idx} className="text-sm opacity-80">• {task}</li>
                ))}
              </ul>
            </div>

            {/* Evening */}
            <div className={`p-4 rounded-lg border ${getBlockColor(plan.plan.evening_block.focus_type)}`}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  {getBlockIcon(plan.plan.evening_block.focus_type)}
                  <span className="font-semibold">المساء</span>
                </div>
                <Badge variant="outline">{plan.plan.evening_block.time_range}</Badge>
              </div>
              <p className="text-sm mb-2 opacity-90">{plan.plan.evening_block.focus_type}</p>
              <ul className="space-y-1">
                {plan.plan.evening_block.suggested_tasks.map((task, idx) => (
                  <li key={idx} className="text-sm opacity-80">• {task}</li>
                ))}
              </ul>
            </div>
          </div>

          {/* Breaks */}
          {plan.plan.breaks && plan.plan.breaks.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <Coffee className="w-4 h-4 text-orange-500" />
                استراحات مقترحة
              </h4>
              <div className="flex flex-wrap gap-2">
                {plan.plan.breaks.map((breakTime, idx) => (
                  <Badge key={idx} variant="secondary">
                    {breakTime}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Productivity Tips */}
          {plan.plan.productivity_tips && plan.plan.productivity_tips.length > 0 && (
            <div className="space-y-2 p-4 bg-primary/5 rounded-lg border border-primary/10">
              <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <Lightbulb className="w-4 h-4 text-primary" />
                نصائح لتعزيز الإنتاجية
              </h4>
              <ul className="space-y-1">
                {plan.plan.productivity_tips.map((tip, idx) => (
                  <li key={idx} className="text-sm text-muted-foreground">💡 {tip}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Conflicts Resolution */}
          {plan.plan.conflicts_resolution && plan.plan.conflicts_resolution.length > 0 && (
            <div className="space-y-2 p-4 bg-yellow-500/5 rounded-lg border border-yellow-500/10">
              <h4 className="text-sm font-semibold text-foreground">⚠️ تعارضات يجب حلها</h4>
              <ul className="space-y-1">
                {plan.plan.conflicts_resolution.map((conflict, idx) => (
                  <li key={idx} className="text-sm text-muted-foreground">• {conflict}</li>
                ))}
              </ul>
            </div>
          )}
        </CardContent>
      )}

      {!plan && !loading && (
        <CardContent>
          <div className="text-center py-8 space-y-4">
            <Calendar className="w-12 h-12 mx-auto text-muted-foreground opacity-50" />
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">
                لم يتم إنشاء خطة بعد
              </p>
              <p className="text-xs text-muted-foreground">
                اضغط على "خطط يومي" للحصول على خطة ذكية مخصصة لك
              </p>
            </div>
          </div>
        </CardContent>
      )}
    </Card>
  );
}

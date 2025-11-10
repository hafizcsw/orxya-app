import { useState } from 'react';
import { Calendar, Loader2, Sparkles, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export function PrayerAwareScheduler() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [suggestion, setSuggestion] = useState<string | null>(null);
  const [prayerWindows, setPrayerWindows] = useState<any[]>([]);

  const generateSchedule = async () => {
    if (!user) return;

    setLoading(true);
    try {
      const today = new Date().toISOString().split('T')[0];

      // جلب المهام المعلقة
      const { data: tasks } = await supabase
        .from('events')
        .select('*')
        .eq('owner_id', user.id)
        .eq('source', 'local')
        .is('completed_at', null)
        .limit(10);

      const { data, error } = await supabase.functions.invoke('prayer-aware-plan', {
        body: {
          date: today,
          tasks: tasks || []
        }
      });

      if (error) throw error;

      setSuggestion(data.suggestion);
      setPrayerWindows(data.prayer_windows || []);
      toast.success('تم إنشاء جدول ذكي يحترم أوقات الصلاة! 🕌');
    } catch (error: any) {
      console.error('Error generating prayer-aware schedule:', error);
      toast.error('حدث خطأ أثناء إنشاء الجدول');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="bg-card/50 backdrop-blur">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              🕌 جدولة ذكية تحترم الصلاة
            </CardTitle>
            <CardDescription>
              نظّم مهامك في أفضل الأوقات بين الصلوات
            </CardDescription>
          </div>
          <Button 
            onClick={generateSchedule} 
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
                <Sparkles className="w-4 h-4" />
                اجدول يومي
              </>
            )}
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {prayerWindows.length > 0 && (
          <Alert className="bg-primary/5 border-primary/20">
            <Calendar className="h-4 w-4 text-primary" />
            <AlertDescription>
              تم العثور على {prayerWindows.length} فترات متاحة بين الصلوات اليوم
            </AlertDescription>
          </Alert>
        )}

        {suggestion && (
          <div className="space-y-2">
            <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-primary" />
              الجدول المقترح
            </h4>
            <div className="p-4 bg-muted/30 rounded-lg border border-border whitespace-pre-wrap text-sm">
              {suggestion}
            </div>
          </div>
        )}

        {!suggestion && !loading && (
          <div className="text-center py-8 space-y-4">
            <Calendar className="w-12 h-12 mx-auto text-muted-foreground opacity-50" />
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">
                لم يتم إنشاء جدول بعد
              </p>
              <p className="text-xs text-muted-foreground">
                اضغط على "اجدول يومي" للحصول على جدول ذكي يحترم أوقات الصلاة
              </p>
            </div>
          </div>
        )}

        {prayerWindows.length === 0 && !loading && suggestion && (
          <Alert className="bg-yellow-500/5 border-yellow-500/20">
            <AlertCircle className="h-4 w-4 text-yellow-500" />
            <AlertDescription>
              لم يتم العثور على أوقات صلاة اليوم. قم بمزامنة أوقات الصلاة أولاً.
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}

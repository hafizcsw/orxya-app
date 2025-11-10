import { useEffect, useState } from 'react';
import { Sun, Sunset, Moon, Clock, Zap, Users, Coffee } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface PrayerWindow {
  window_name: string;
  start_time: string;
  end_time: string;
  duration_minutes: number;
  energy_level: string;
  recommended_activities: string[];
}

export function PrayerWindowsCard() {
  const { user } = useAuth();
  const [windows, setWindows] = useState<PrayerWindow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    loadPrayerWindows();
  }, [user]);

  const loadPrayerWindows = async () => {
    if (!user) return;

    try {
      const today = new Date().toISOString().split('T')[0];

      // استدعاء مباشر من الجدول
      const { data, error } = await supabase
        .from('prayer_windows' as any)
        .select('*')
        .eq('owner_id', user.id)
        .eq('date_iso', today)
        .order('start_time');

      if (error) throw error;
      
      // تحويل البيانات للنوع المطلوب
      const windowsData: PrayerWindow[] = (data || []).map((item: any) => ({
        window_name: item.window_name,
        start_time: item.start_time,
        end_time: item.end_time,
        duration_minutes: item.duration_minutes,
        energy_level: item.energy_level || 'medium',
        recommended_activities: item.recommended_activities || []
      }));
      
      setWindows(windowsData);
    } catch (error) {
      console.error('Error loading prayer windows:', error);
    } finally {
      setLoading(false);
    }
  };

  const getWindowIcon = (windowName: string) => {
    if (windowName.includes('fajr')) return <Sun className="w-5 h-5 text-yellow-500" />;
    if (windowName.includes('dhuhr')) return <Sun className="w-5 h-5 text-orange-500" />;
    if (windowName.includes('asr')) return <Sunset className="w-5 h-5 text-orange-600" />;
    if (windowName.includes('maghrib')) return <Moon className="w-5 h-5 text-blue-500" />;
    return <Clock className="w-5 h-5" />;
  };

  const getWindowLabel = (windowName: string) => {
    const labels: Record<string, string> = {
      after_fajr: 'بعد الفجر',
      after_dhuhr: 'بعد الظهر',
      after_asr: 'بعد العصر',
      after_maghrib: 'بعد المغرب',
      after_isha: 'بعد العشاء'
    };
    return labels[windowName] || windowName;
  };

  const getEnergyBadge = (level: string) => {
    if (level === 'high') return <Badge className="bg-green-500">طاقة عالية 🔥</Badge>;
    if (level === 'medium') return <Badge className="bg-yellow-500">طاقة متوسطة ⚡</Badge>;
    if (level === 'low') return <Badge className="bg-blue-500">طاقة منخفضة 💤</Badge>;
    return <Badge variant="outline">{level}</Badge>;
  };

  const getActivityIcon = (activity: string) => {
    if (activity.includes('deep_work')) return <Zap className="w-4 h-4" />;
    if (activity.includes('meeting')) return <Users className="w-4 h-4" />;
    if (activity.includes('rest') || activity.includes('family')) return <Coffee className="w-4 h-4" />;
    return null;
  };

  const getActivityLabel = (activity: string) => {
    const labels: Record<string, string> = {
      deep_work: 'عمل عميق',
      important_tasks: 'مهام مهمة',
      strategic_thinking: 'تفكير استراتيجي',
      meetings: 'اجتماعات',
      collaborative_work: 'عمل تعاوني',
      calls: 'مكالمات',
      routine_tasks: 'مهام روتينية',
      emails: 'بريد إلكتروني',
      admin_work: 'أعمال إدارية',
      family_time: 'وقت عائلي',
      rest: 'راحة',
      light_reading: 'قراءة خفيفة'
    };
    return labels[activity] || activity;
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

  if (windows.length === 0) {
    return (
      <Card className="bg-card/50 backdrop-blur">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            🕌 الأوقات بين الصلوات
          </CardTitle>
          <CardDescription>
            لا توجد أوقات صلاة محددة اليوم
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            قم بمزامنة أوقات الصلاة أولاً لرؤية الأوقات المتاحة بين الصلوات
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-card/50 backdrop-blur">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          🕌 الأوقات بين الصلوات
        </CardTitle>
        <CardDescription>
          استغل وقتك بذكاء بين كل صلاة وأخرى
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {windows.map((window, idx) => {
          const startTime = new Date(window.start_time);
          const endTime = new Date(window.end_time);
          const now = new Date();
          const isActive = now >= startTime && now <= endTime;

          return (
            <div 
              key={idx}
              className={`p-4 rounded-lg border ${
                isActive 
                  ? 'bg-primary/10 border-primary/30' 
                  : 'bg-muted/30 border-border'
              }`}
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  {getWindowIcon(window.window_name)}
                  <h4 className="font-semibold text-foreground">
                    {getWindowLabel(window.window_name)}
                  </h4>
                </div>
                {getEnergyBadge(window.energy_level)}
              </div>

              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-3">
                <Clock className="w-4 h-4" />
                <span>
                  {startTime.toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' })}
                  {' - '}
                  {endTime.toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' })}
                </span>
                <Badge variant="outline" className="text-xs">
                  {window.duration_minutes} دقيقة
                </Badge>
                {isActive && (
                  <Badge className="bg-green-500 text-xs">الآن ⏰</Badge>
                )}
              </div>

              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">أنشطة مقترحة:</p>
                <div className="flex flex-wrap gap-1.5">
                  {window.recommended_activities.map((activity, i) => (
                    <div 
                      key={i}
                      className="flex items-center gap-1 text-xs bg-background/50 px-2 py-1 rounded-md"
                    >
                      {getActivityIcon(activity)}
                      <span>{getActivityLabel(activity)}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}

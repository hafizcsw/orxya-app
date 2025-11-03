import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { conflictCheckToday } from '@/lib/conflicts';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function TestConflicts() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [title, setTitle] = useState('اجتماع عمل مهم');
  const [startTime, setStartTime] = useState('13:00');
  const [endTime, setEndTime] = useState('14:00');
  const [conflicts, setConflicts] = useState<any[]>([]);
  const [prayerTimes, setPrayerTimes] = useState<any>(null);

  const loadPrayerTimes = async () => {
    const { data } = await supabase
      .from('prayer_times')
      .select('*')
      .eq('date_iso', new Date().toISOString().split('T')[0])
      .single();
    
    setPrayerTimes(data);
  };

  const addTestEvent = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({ title: 'خطأ', description: 'يجب تسجيل الدخول أولاً', variant: 'destructive' });
        return;
      }

      const today = new Date().toISOString().split('T')[0];
      const { data: event, error } = await supabase
        .from('events')
        .insert([{
          owner_id: user.id,
          title,
          starts_at: `${today}T${startTime}:00`,
          ends_at: `${today}T${endTime}:00`,
          status: 'confirmed',
          source: 'local'
        }])
        .select()
        .single();

      if (error) throw error;

      toast({
        title: 'تم إضافة الحدث',
        description: `الحدث "${title}" تم إضافته بنجاح`
      });

      // Run conflict check
      await conflictCheckToday();

      // Load conflicts
      await loadConflicts();
    } catch (error: any) {
      toast({
        title: 'خطأ',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const loadConflicts = async () => {
    const { data } = await supabase
      .from('conflicts')
      .select('*')
      .eq('date_iso', new Date().toISOString().split('T')[0])
      .eq('status', 'open')
      .order('created_at', { ascending: false });
    
    setConflicts(data || []);
  };

  const clearEvents = async () => {
    const { error } = await supabase
      .from('events')
      .delete()
      .eq('source', 'local');

    if (!error) {
      toast({ title: 'تم حذف جميع الأحداث' });
      setConflicts([]);
    }
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2">اختبار نظام الكشف عن التعارضات</h1>
          <p className="text-muted-foreground">أضف حدثاً جديداً لاختبار الكشف عن التعارضات مع أوقات الصلاة</p>
        </div>

        <Card className="p-6 space-y-4">
          <h2 className="text-xl font-semibold">إضافة حدث اختباري</h2>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="title">عنوان الحدث</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="مثال: اجتماع عمل"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="start">وقت البداية</Label>
                <Input
                  id="start"
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="end">وقت النهاية</Label>
                <Input
                  id="end"
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                />
              </div>
            </div>

            <div className="flex gap-2">
              <Button onClick={addTestEvent} disabled={loading}>
                {loading ? 'جاري الإضافة...' : 'إضافة حدث'}
              </Button>
              <Button onClick={loadPrayerTimes} variant="outline">
                عرض أوقات الصلاة
              </Button>
              <Button onClick={loadConflicts} variant="outline">
                تحديث التعارضات
              </Button>
              <Button onClick={clearEvents} variant="destructive">
                حذف جميع الأحداث
              </Button>
            </div>
          </div>
        </Card>

        {prayerTimes && (
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4">أوقات الصلاة اليوم</h2>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
              <div>
                <div className="font-semibold">الفجر</div>
                <div className="text-muted-foreground">{prayerTimes.fajr}</div>
              </div>
              <div>
                <div className="font-semibold">الظهر</div>
                <div className="text-muted-foreground">{prayerTimes.dhuhr}</div>
              </div>
              <div>
                <div className="font-semibold">العصر</div>
                <div className="text-muted-foreground">{prayerTimes.asr}</div>
              </div>
              <div>
                <div className="font-semibold">المغرب</div>
                <div className="text-muted-foreground">{prayerTimes.maghrib}</div>
              </div>
              <div>
                <div className="font-semibold">العشاء</div>
                <div className="text-muted-foreground">{prayerTimes.isha}</div>
              </div>
            </div>
          </Card>
        )}

        {conflicts.length > 0 && (
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4">التعارضات المكتشفة ({conflicts.length})</h2>
            <div className="space-y-3">
              {conflicts.map((conflict) => (
                <div key={conflict.id} className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="font-semibold text-destructive">
                        تعارض مع صلاة {conflict.prayer_name}
                      </div>
                      <div className="text-sm text-muted-foreground mt-1">
                        وقت التعارض: {conflict.overlap_min} دقيقة
                      </div>
                      <div className="text-sm text-muted-foreground">
                        الخطورة: {conflict.severity}
                      </div>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {new Date(conflict.created_at).toLocaleString('ar-EG')}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}

        {conflicts.length === 0 && (
          <Card className="p-6 text-center text-muted-foreground">
            لا توجد تعارضات حالياً. أضف حدثاً يتعارض مع وقت صلاة لاختبار النظام.
          </Card>
        )}
      </div>
    </div>
  );
}

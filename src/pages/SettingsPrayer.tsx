import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';

type PrayerBuffers = {
  fajr: { pre: number; post: number };
  dhuhr: { pre: number; post: number };
  asr: { pre: number; post: number };
  maghrib: { pre: number; post: number };
  isha: { pre: number; post: number };
  jumuah: { pre: number; post: number };
};

const DEFAULT_BUFFERS: PrayerBuffers = {
  fajr: { pre: 10, post: 20 },
  dhuhr: { pre: 10, post: 20 },
  asr: { pre: 10, post: 20 },
  maghrib: { pre: 10, post: 20 },
  isha: { pre: 10, post: 20 },
  jumuah: { pre: 30, post: 45 }
};

const PRAYER_NAMES: Record<keyof PrayerBuffers, string> = {
  fajr: 'الفجر',
  dhuhr: 'الظهر',
  asr: 'العصر',
  maghrib: 'المغرب',
  isha: 'العشاء',
  jumuah: 'الجمعة'
};

export default function SettingsPrayer() {
  const [buffers, setBuffers] = useState<PrayerBuffers>(DEFAULT_BUFFERS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadBuffers();
  }, []);

  async function loadBuffers() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('profiles')
        .select('prayer_buffers')
        .eq('id', user.id)
        .single();

      if (error) throw error;
      
      if (data?.prayer_buffers) {
        setBuffers(data.prayer_buffers as PrayerBuffers);
      }
    } catch (e) {
      console.error('Failed to load prayer buffers:', e);
    } finally {
      setLoading(false);
    }
  }

  async function saveBuffers() {
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('profiles')
        .update({ prayer_buffers: buffers })
        .eq('id', user.id);

      if (error) throw error;

      toast({
        title: 'تم الحفظ',
        description: 'تم حفظ إعدادات هوامش الصلاة بنجاح'
      });
    } catch (e: any) {
      toast({
        variant: 'destructive',
        title: 'خطأ',
        description: e.message || 'فشل حفظ الإعدادات'
      });
    } finally {
      setSaving(false);
    }
  }

  function updateBuffer(prayer: keyof PrayerBuffers, type: 'pre' | 'post', value: number) {
    setBuffers(prev => ({
      ...prev,
      [prayer]: {
        ...prev[prayer],
        [type]: value
      }
    }));
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div>
        <h2 className="text-2xl font-bold">إعدادات مواقيت الصلاة</h2>
        <p className="text-muted-foreground mt-1">
          تخصيص الهوامش الزمنية قبل وبعد كل صلاة لاكتشاف التعارضات
        </p>
      </div>

      <div className="grid gap-4">
        {(Object.keys(buffers) as Array<keyof PrayerBuffers>).map((prayer) => (
          <Card key={prayer}>
            <CardHeader>
              <CardTitle className="text-lg">{PRAYER_NAMES[prayer]}</CardTitle>
              <CardDescription>
                الهامش قبل الصلاة: {buffers[prayer].pre} دقيقة | 
                بعد الصلاة: {buffers[prayer].post} دقيقة
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>قبل الصلاة ({buffers[prayer].pre} دقيقة)</Label>
                <Slider
                  value={[buffers[prayer].pre]}
                  onValueChange={([value]) => updateBuffer(prayer, 'pre', value)}
                  min={0}
                  max={60}
                  step={5}
                  className="w-full"
                />
              </div>
              <div className="space-y-2">
                <Label>بعد الصلاة ({buffers[prayer].post} دقيقة)</Label>
                <Slider
                  value={[buffers[prayer].post]}
                  onValueChange={([value]) => updateBuffer(prayer, 'post', value)}
                  min={0}
                  max={60}
                  step={5}
                  className="w-full"
                />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="flex gap-3">
        <Button onClick={saveBuffers} disabled={saving}>
          {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          حفظ الإعدادات
        </Button>
        <Button variant="outline" onClick={loadBuffers} disabled={saving}>
          إلغاء
        </Button>
      </div>
    </div>
  );
}

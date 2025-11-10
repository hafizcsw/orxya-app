import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { track } from '@/lib/telemetry';
import { toast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';

export default function SettingsNotifications() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  
  const [dndEnabled, setDndEnabled] = useState(false);
  const [dndStart, setDndStart] = useState('22:00');
  const [dndEnd, setDndEnd] = useState('08:00');
  const [respectPrayer, setRespectPrayer] = useState(true);
  const [waOptIn, setWaOptIn] = useState(false);
  const [waPhone, setWaPhone] = useState('');

  async function load() {
    if (!user) return;
    const { data } = await supabase
      .from('profiles')
      .select('dnd_enabled, dnd_start, dnd_end, respect_prayer, wa_opt_in, wa_phone')
      .eq('id', user.id)
      .maybeSingle();
    
    if (data) {
      setDndEnabled(data.dnd_enabled ?? false);
      setDndStart(data.dnd_start || '22:00');
      setDndEnd(data.dnd_end || '08:00');
      setRespectPrayer(data.respect_prayer ?? true);
      setWaOptIn(data.wa_opt_in ?? false);
      setWaPhone(data.wa_phone || '');
    }
  }

  useEffect(() => { load(); }, [user?.id]);

  async function save() {
    if (!user) return;
    setLoading(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          dnd_enabled: dndEnabled,
          dnd_start: dndStart,
          dnd_end: dndEnd,
          respect_prayer: respectPrayer,
          wa_opt_in: waOptIn,
          wa_phone: waPhone || null
        })
        .eq('id', user.id);
      
      if (error) throw error;
      
      toast({ title: 'تم الحفظ', description: 'تم تحديث إعدادات التنبيهات' });
      track('settings_notifications_saved');
    } catch (e: any) {
      toast({ title: 'خطأ', description: e.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }

  async function sendTestWA() {
    if (!user || !waPhone) {
      toast({ title: 'خطأ', description: 'الرجاء إدخال رقم الهاتف أولاً', variant: 'destructive' });
      return;
    }
    
    setLoading(true);
    try {
      const testTime = new Date(Date.now() + 60000); // بعد دقيقة
      const { error } = await supabase.functions.invoke('notify-dispatch', {
        body: {
          channel: 'wa',
          scheduled_at: testTime.toISOString(),
          title: 'رسالة اختبار',
          body: 'هذه رسالة اختبار من نظام التنبيهات',
          priority: 10
        }
      });
      
      if (error) throw error;
      
      toast({ title: 'تم الجدولة', description: 'سيتم إرسال رسالة اختبار خلال دقيقة' });
      track('test_wa_notification_scheduled');
    } catch (e: any) {
      toast({ title: 'خطأ', description: e.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }

  if (!user) {
    return (
      <div className="container mx-auto p-4">
        <div className="text-center text-muted-foreground">
          سجّل الدخول لإدارة التنبيهات
        </div>
      </div>
    );
  }

  return (
    <div className="container max-w-3xl mx-auto p-4 space-y-6">
      <h1 className="text-2xl font-semibold">إعدادات التنبيهات</h1>

      {/* DND Settings */}
      <div className="border rounded-2xl p-4 space-y-4 bg-card">
        <div>
          <h2 className="font-medium mb-2">عدم الإزعاج (DND)</h2>
          <p className="text-sm text-muted-foreground mb-4">
            تأجيل التنبيهات خلال ساعات معينة
          </p>
        </div>

        <div className="flex items-center gap-2">
          <input 
            type="checkbox" 
            id="dnd-enabled" 
            checked={dndEnabled}
            onChange={(e) => setDndEnabled(e.target.checked)}
            className="w-4 h-4 rounded border-border"
          />
          <label htmlFor="dnd-enabled" className="text-sm font-medium cursor-pointer">
            تفعيل عدم الإزعاج
          </label>
        </div>

        {dndEnabled && (
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium mb-1 block">من الساعة</label>
              <input 
                type="time" 
                value={dndStart}
                onChange={(e) => setDndStart(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border bg-background"
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">حتى الساعة</label>
              <input 
                type="time" 
                value={dndEnd}
                onChange={(e) => setDndEnd(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border bg-background"
              />
            </div>
          </div>
        )}
      </div>

      {/* Prayer Settings */}
      <div className="border rounded-2xl p-4 space-y-4 bg-card">
        <div>
          <h2 className="font-medium mb-2">احترام أوقات الصلاة</h2>
          <p className="text-sm text-muted-foreground mb-4">
            تأجيل التنبيهات التي تتعارض مع أوقات الصلاة
          </p>
        </div>

        <div className="flex items-center gap-2">
          <input 
            type="checkbox" 
            id="respect-prayer" 
            checked={respectPrayer}
            onChange={(e) => setRespectPrayer(e.target.checked)}
            className="w-4 h-4 rounded border-border"
          />
          <label htmlFor="respect-prayer" className="text-sm font-medium cursor-pointer">
            تأجيل التنبيهات خلال أوقات الصلاة
          </label>
        </div>
      </div>

      {/* WhatsApp Settings */}
      <div className="border rounded-2xl p-4 space-y-4 bg-card">
        <div>
          <h2 className="font-medium mb-2">تنبيهات واتساب</h2>
          <p className="text-sm text-muted-foreground mb-4">
            استقبال تنبيهات عبر واتساب (تجريبي)
          </p>
        </div>

        <div className="flex items-center gap-2">
          <input 
            type="checkbox" 
            id="wa-opt-in" 
            checked={waOptIn}
            onChange={(e) => setWaOptIn(e.target.checked)}
            className="w-4 h-4 rounded border-border"
          />
          <label htmlFor="wa-opt-in" className="text-sm font-medium cursor-pointer">
            تفعيل تنبيهات واتساب
          </label>
        </div>

        {waOptIn && (
          <div>
            <label className="text-sm font-medium mb-1 block">رقم الهاتف (بصيغة دولية)</label>
            <div className="flex gap-2">
              <input 
                type="tel" 
                value={waPhone}
                onChange={(e) => setWaPhone(e.target.value)}
                placeholder="+971501234567"
                className="flex-1 px-3 py-2 rounded-lg border bg-background"
              />
              <Button onClick={sendTestWA} disabled={loading} variant="outline">
                اختبار
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              مثال: +971501234567 (الإمارات)
            </p>
          </div>
        )}
      </div>

      <Button onClick={save} disabled={loading} className="w-full">
        {loading ? 'جارٍ الحفظ...' : 'حفظ الإعدادات'}
      </Button>
    </div>
  );
}

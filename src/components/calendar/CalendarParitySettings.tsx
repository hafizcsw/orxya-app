import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { useFeatureFlags } from '@/hooks/useFeatureFlags';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

export function CalendarParitySettings() {
  const { flags, loading, setFlag } = useFeatureFlags();

  const handleToggle = async (key: string, value: boolean) => {
    try {
      await setFlag(key, value);
      toast.success('تم تحديث الإعداد بنجاح');
    } catch (error) {
      toast.error('فشل في تحديث الإعداد');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="w-6 h-6 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold text-foreground mb-2">
          ميزات Calendar Parity
        </h2>
        <p className="text-sm text-muted-foreground">
          تفعيل الميزات المتقدمة المطابقة لـ Google Calendar
        </p>
      </div>

      <Card className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label>تفعيل Calendar Parity</Label>
            <p className="text-sm text-muted-foreground">
              تفعيل جميع ميزات التطابق مع Google Calendar
            </p>
          </div>
          <Switch
            checked={flags.ff_calendar_parity || false}
            onCheckedChange={(checked) => handleToggle('ff_calendar_parity', checked)}
          />
        </div>

        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label>إيجاد الأوقات المتاحة</Label>
            <p className="text-sm text-muted-foreground">
              اقتراح أوقات متاحة للاجتماعات تلقائياً
            </p>
          </div>
          <Switch
            checked={flags.ff_calendar_find_time || false}
            onCheckedChange={(checked) => handleToggle('ff_calendar_find_time', checked)}
          />
        </div>

        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label>صفحات المواعيد</Label>
            <p className="text-sm text-muted-foreground">
              السماح للآخرين بحجز مواعيد معك
            </p>
          </div>
          <Switch
            checked={flags.ff_calendar_appointments || false}
            onCheckedChange={(checked) => handleToggle('ff_calendar_appointments', checked)}
          />
        </div>

        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label>تكامل المهام</Label>
            <p className="text-sm text-muted-foreground">
              عرض المهام داخل التقويم مع إمكانية إنهائها
            </p>
          </div>
          <Switch
            checked={flags.ff_calendar_tasks_parity || false}
            onCheckedChange={(checked) => handleToggle('ff_calendar_tasks_parity', checked)}
          />
        </div>
      </Card>

      <div className="bg-muted/50 p-4 rounded-lg">
        <h3 className="font-semibold mb-2">ملاحظة:</h3>
        <ul className="text-sm space-y-1 text-muted-foreground">
          <li>• يجب تفعيل الميزة الأساسية (Calendar Parity) أولاً</li>
          <li>• جميع الميزات تعمل بدون التأثير على البيانات الحالية</li>
          <li>• يمكن إيقاف الميزات في أي وقت</li>
        </ul>
      </div>
    </div>
  );
}

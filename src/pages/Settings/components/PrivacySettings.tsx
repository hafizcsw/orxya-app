import { useSettings } from '@/contexts/SettingsContext';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

export function PrivacySettings() {
  const { settings, updateSettings } = useSettings();

  if (!settings) return null;

  const handleSave = async () => {
    toast.success('تم حفظ إعدادات الخصوصية بنجاح');
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold text-foreground mb-2">الخصوصية</h2>
        <p className="text-sm text-muted-foreground">إدارة خصوصية بياناتك</p>
      </div>

      <Card className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label>القياسات والتحليلات</Label>
            <p className="text-sm text-muted-foreground">السماح بجمع بيانات الاستخدام لتحسين التطبيق</p>
          </div>
          <Switch
            checked={settings.telemetry_enabled}
            onCheckedChange={(checked) => updateSettings({ telemetry_enabled: checked })}
          />
        </div>
      </Card>

      <div className="flex justify-end">
        <Button onClick={handleSave}>حفظ التغييرات</Button>
      </div>
    </div>
  );
}

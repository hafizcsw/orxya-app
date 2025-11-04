import { useSettings } from '@/contexts/SettingsContext';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { MapPin } from 'lucide-react';
import { toast } from 'sonner';

export function LocationSettings() {
  const { settings, updateSettings } = useSettings();

  if (!settings) return null;

  const detectLocation = () => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          updateSettings({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          });
          toast.success('تم تحديد الموقع بنجاح');
        },
        (error) => {
          toast.error('فشل تحديد الموقع');
        }
      );
    } else {
      toast.error('الموقع غير متاح في هذا المتصفح');
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold text-foreground mb-2">إعدادات الموقع</h2>
        <p className="text-sm text-muted-foreground">إدارة موقعك الجغرافي لحساب أوقات الصلاة</p>
      </div>

      <Card className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label>السماح بتحديد الموقع</Label>
            <p className="text-sm text-muted-foreground">السماح للتطبيق بالوصول إلى موقعك</p>
          </div>
          <Switch
            checked={settings.allow_location}
            onCheckedChange={(checked) => updateSettings({ allow_location: checked })}
          />
        </div>

        {settings.allow_location && (
          <>
            <div className="space-y-3">
              <Label>الموقع الحالي</Label>
              {settings.latitude && settings.longitude ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <MapPin className="w-4 h-4" />
                  <span>
                    {settings.latitude.toFixed(4)}, {settings.longitude.toFixed(4)}
                  </span>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">لم يتم تحديد الموقع بعد</p>
              )}
              <Button onClick={detectLocation} variant="outline" className="w-full">
                <MapPin className="w-4 h-4 ml-2" />
                تحديد الموقع تلقائيًا
              </Button>
            </div>

            <div className="space-y-3">
              <Label>أو أدخل الإحداثيات يدويًا</Label>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="lat" className="text-xs">خط العرض</Label>
                  <Input
                    id="lat"
                    type="number"
                    step="0.0001"
                    value={settings.latitude || ''}
                    onChange={(e) => updateSettings({ latitude: parseFloat(e.target.value) || null })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lng" className="text-xs">خط الطول</Label>
                  <Input
                    id="lng"
                    type="number"
                    step="0.0001"
                    value={settings.longitude || ''}
                    onChange={(e) => updateSettings({ longitude: parseFloat(e.target.value) || null })}
                  />
                </div>
              </div>
            </div>
          </>
        )}
      </Card>
    </div>
  );
}

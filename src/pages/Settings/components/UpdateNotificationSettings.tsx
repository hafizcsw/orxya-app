import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Bell, Volume2, Vibrate, TestTube } from 'lucide-react';
import {
  getNotificationSettings,
  saveNotificationSettings,
  showUpdateNotification,
  isNotificationSupported,
  initUpdateNotifications,
  type NotificationSettings as UpdateNotificationSettings,
} from '@/lib/update-notifications';
import { toast } from 'sonner';
import { getBuildVersion } from '@/lib/pwa-update';

export function UpdateNotificationSettings() {
  const [settings, setSettings] = useState<UpdateNotificationSettings>(getNotificationSettings());
  const [supported] = useState(isNotificationSupported());

  useEffect(() => {
    if (supported) {
      initUpdateNotifications().catch(error => {
        console.error('Failed to init notifications:', error);
      });
    }
  }, [supported]);

  const updateSetting = (key: keyof UpdateNotificationSettings, value: boolean) => {
    const newSettings = { ...settings, [key]: value };
    setSettings(newSettings);
    saveNotificationSettings(newSettings);
    toast.success('تم حفظ الإعدادات');
  };

  const handleTestNotification = async () => {
    const version = getBuildVersion();
    await showUpdateNotification(version, 'native');
    toast.success('تم إرسال إشعار تجريبي');
  };

  if (!supported) {
    return (
      <div className="space-y-4">
        <Card className="p-6">
          <div className="text-center py-8 text-muted-foreground">
            <Bell className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>الإشعارات غير مدعومة في المتصفح</p>
            <p className="text-sm mt-2">استخدم التطبيق النيتف للحصول على الإشعارات</p>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Main Settings */}
      <Card className="p-6">
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Bell className="w-5 h-5 text-primary" />
              <div>
                <Label htmlFor="enabled" className="font-semibold">
                  تفعيل الإشعارات
                </Label>
                <p className="text-sm text-muted-foreground">
                  إظهار إشعار عند توفر تحديث جديد
                </p>
              </div>
            </div>
            <Switch
              id="enabled"
              checked={settings.enabled}
              onCheckedChange={(checked) => updateSetting('enabled', checked)}
            />
          </div>

          {settings.enabled && (
            <>
              <div className="h-px bg-border" />

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Volume2 className="w-5 h-5 text-primary" />
                  <div>
                    <Label htmlFor="sound" className="font-semibold">
                      الصوت
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      تشغيل صوت عند الإشعار
                    </p>
                  </div>
                </div>
                <Switch
                  id="sound"
                  checked={settings.sound}
                  onCheckedChange={(checked) => updateSetting('sound', checked)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Vibrate className="w-5 h-5 text-primary" />
                  <div>
                    <Label htmlFor="vibration" className="font-semibold">
                      الاهتزاز
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      اهتزاز الجهاز عند الإشعار
                    </p>
                  </div>
                </div>
                <Switch
                  id="vibration"
                  checked={settings.vibration}
                  onCheckedChange={(checked) => updateSetting('vibration', checked)}
                />
              </div>
            </>
          )}
        </div>
      </Card>

      {/* Test Notification */}
      {settings.enabled && (
        <Card className="p-6">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <TestTube className="w-5 h-5 text-primary" />
              <div>
                <h3 className="font-semibold mb-1">إشعار تجريبي</h3>
                <p className="text-sm text-muted-foreground">
                  اختبر كيف ستبدو الإشعارات
                </p>
              </div>
            </div>
            
            <Button onClick={handleTestNotification} variant="outline" className="w-full">
              <Bell className="w-4 h-4 ml-2" />
              إرسال إشعار تجريبي
            </Button>
          </div>
        </Card>
      )}

      {/* Info */}
      <Card className="p-6 bg-primary/5 border-primary/20">
        <p className="text-sm text-muted-foreground">
          💡 <strong>ملاحظة:</strong> سيتم إرسال الإشعارات تلقائيًا عند توفر تحديث جديد،
          حتى عندما يكون التطبيق مغلقًا (في الخلفية).
        </p>
      </Card>
    </div>
  );
}

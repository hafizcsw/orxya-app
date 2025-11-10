import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Download, CheckCircle, AlertCircle, RefreshCw } from 'lucide-react';
import { getBuildVersion, formatBuildVersion } from '@/lib/pwa-update';
import { checkForUpdates, downloadAndApplyUpdate, getCurrentVersion, isNativePlatform } from '@/lib/live-update';
import { toast } from 'sonner';
import { Progress } from '@/components/ui/progress';

export function UpdateSettings() {
  const [buildVersion] = useState(getBuildVersion());
  const [nativeVersion, setNativeVersion] = useState<string>('');
  const [checking, setChecking] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [latestVersion, setLatestVersion] = useState<string>('');

  useEffect(() => {
    if (isNativePlatform()) {
      getCurrentVersion().then(setNativeVersion);
    }
  }, []);

  const handleCheckForUpdates = async () => {
    setChecking(true);
    try {
      const result = await checkForUpdates();
      
      if (result.available && result.version) {
        setUpdateAvailable(true);
        setLatestVersion(result.version);
        toast.success(`تحديث متوفر: النسخة ${result.version}`);
      } else {
        toast.success('أنت تستخدم أحدث نسخة');
      }
    } catch (error) {
      toast.error('فشل التحقق من التحديثات');
      console.error(error);
    } finally {
      setChecking(false);
    }
  };

  const handleDownloadUpdate = async () => {
    setDownloading(true);
    setDownloadProgress(0);
    
    try {
      // Re-check to get the latest manifest
      const result = await checkForUpdates();
      if (!result.available || !result.manifest) {
        toast.error('لا يوجد تحديث متاح');
        setDownloading(false);
        return;
      }
      
      const currentVer = await getCurrentVersion();
      const success = await downloadAndApplyUpdate(result.manifest, (progress) => {
        setDownloadProgress(progress);
      });
      
      if (success) {
        toast.success('تم تحديث التطبيق بنجاح');
        setUpdateAvailable(false);
      } else {
        toast.error('فشل تحديث التطبيق');
      }
    } catch (error) {
      toast.error('حدث خطأ أثناء التحديث');
      console.error(error);
    } finally {
      setDownloading(false);
      setDownloadProgress(0);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-2">التحديثات</h2>
        <p className="text-muted-foreground">
          معلومات النسخة والتحديثات المتوفرة
        </p>
      </div>

      {/* Build Version */}
      <Card className="p-6">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold mb-1">نسخة البناء</h3>
              <p className="text-sm text-muted-foreground">
                Web Build Version
              </p>
            </div>
            <Badge variant="outline" className="font-mono">
              {formatBuildVersion(buildVersion)}
            </Badge>
          </div>

          {isNativePlatform() && nativeVersion && (
            <div className="flex items-center justify-between pt-4 border-t">
              <div>
                <h3 className="font-semibold mb-1">نسخة التطبيق</h3>
                <p className="text-sm text-muted-foreground">
                  Native App Version
                </p>
              </div>
              <Badge variant="outline" className="font-mono">
                {nativeVersion}
              </Badge>
            </div>
          )}
        </div>
      </Card>

      {/* Update Check */}
      {isNativePlatform() && (
        <Card className="p-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold mb-1">التحقق من التحديثات</h3>
                <p className="text-sm text-muted-foreground">
                  فحص التحديثات المتوفرة للتطبيق
                </p>
              </div>
              <Button
                onClick={handleCheckForUpdates}
                disabled={checking || downloading}
                variant="outline"
                size="sm"
              >
                <RefreshCw className={`w-4 h-4 ml-2 ${checking ? 'animate-spin' : ''}`} />
                {checking ? 'جارٍ الفحص...' : 'فحص التحديثات'}
              </Button>
            </div>

            {updateAvailable && (
              <div className="pt-4 border-t space-y-4">
                <div className="flex items-start gap-3 p-4 bg-primary/5 rounded-lg border border-primary/20">
                  <AlertCircle className="w-5 h-5 text-primary mt-0.5" />
                  <div className="flex-1">
                    <h4 className="font-semibold mb-1">تحديث متوفر</h4>
                    <p className="text-sm text-muted-foreground mb-3">
                      النسخة {latestVersion} متاحة الآن
                    </p>
                    
                    {downloading && (
                      <div className="space-y-2 mb-3">
                        <Progress value={downloadProgress} className="h-2" />
                        <p className="text-xs text-muted-foreground">
                          جارٍ التنزيل... {downloadProgress}%
                        </p>
                      </div>
                    )}
                    
                    <Button
                      onClick={handleDownloadUpdate}
                      disabled={downloading}
                      size="sm"
                      className="w-full sm:w-auto"
                    >
                      <Download className="w-4 h-4 ml-2" />
                      {downloading ? 'جارٍ التنزيل...' : 'تحديث الآن'}
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </Card>
      )}

      {/* PWA Info */}
      <Card className="p-6">
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <CheckCircle className="w-5 h-5 text-green-500" />
            <div>
              <h3 className="font-semibold mb-1">التحديثات التلقائية</h3>
              <p className="text-sm text-muted-foreground">
                {isNativePlatform() 
                  ? 'التطبيق يتحقق تلقائياً من التحديثات عند الفتح'
                  : 'PWA يتحقق تلقائياً من التحديثات كل ساعة'}
              </p>
            </div>
          </div>

          <div className="pt-4 border-t">
            <p className="text-sm text-muted-foreground">
              💡 <strong>ملاحظة:</strong> التحديثات الصغيرة للواجهة تُطبّق تلقائياً.
              التحديثات الكبيرة للنظام تتطلب تحديث من المتجر.
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}

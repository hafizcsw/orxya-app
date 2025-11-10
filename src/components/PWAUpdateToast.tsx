import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Download } from 'lucide-react';

/**
 * PWA Update Toast Component
 * Listens for PWA update events and shows a toast with update action
 */
export function PWAUpdateToast() {
  const [updateAvailable, setUpdateAvailable] = useState(false);

  useEffect(() => {
    const handlePWAUpdate = () => {
      setUpdateAvailable(true);
      
      const updateCallback = (window as any).pwaUpdateCallback;
      if (updateCallback) {
        toast('يوجد تحديث جديد متاح', {
          description: 'اضغط للتحديث وإعادة التشغيل',
          duration: 10000,
          action: {
            label: 'تحديث الآن',
            onClick: () => {
              updateCallback();
            }
          },
          icon: <Download className="w-4 h-4" />,
          className: 'rtl:text-right',
        });
      }
    };

    const handleNativeUpdate = (event: any) => {
      const { version } = event.detail;
      toast(`تحديث متوفر: النسخة ${version}`, {
        description: 'افتح الإعدادات لتحديث التطبيق',
        duration: 10000,
        action: {
          label: 'افتح الإعدادات',
          onClick: () => {
            window.location.href = '/settings';
          }
        },
        icon: <Download className="w-4 h-4" />,
        className: 'rtl:text-right',
      });
    };

    window.addEventListener('pwa-update-available', handlePWAUpdate);
    window.addEventListener('native-update-available', handleNativeUpdate);

    return () => {
      window.removeEventListener('pwa-update-available', handlePWAUpdate);
      window.removeEventListener('native-update-available', handleNativeUpdate);
    };
  }, []);

  return null; // This component only manages toast notifications
}

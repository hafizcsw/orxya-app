import { useEffect } from 'react';
import { usePWAUpdate } from '@/hooks/usePWAUpdate';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';

export function PWAUpdateNotification() {
  const { updateAvailable, updateApp } = usePWAUpdate();
  const { toast } = useToast();

  useEffect(() => {
    if (updateAvailable) {
      toast({
        title: 'تحديث متاح',
        description: 'نسخة جديدة من التطبيق متوفرة',
        action: (
          <Button
            variant="outline"
            size="sm"
            onClick={updateApp}
          >
            تحديث
          </Button>
        ),
        duration: Infinity,
      });
    }
  }, [updateAvailable, toast, updateApp]);

  return null;
}

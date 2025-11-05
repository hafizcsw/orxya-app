import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { MapPin, Loader2, CheckCircle2 } from 'lucide-react';
import { quickLocationUpdate, askAgentHub } from '@/lib/agent-hub';
import { useToast } from '@/hooks/use-toast';
import { useTranslation } from 'react-i18next';

const AI = () => {
  const [loading, setLoading] = useState(false);
  const [locationStatus, setLocationStatus] = useState<'idle' | 'updating' | 'success'>('idle');
  const { toast } = useToast();
  const { t } = useTranslation(['ai']);

  const handleLocationUpdate = async () => {
    setLoading(true);
    setLocationStatus('updating');
    
    const result = await quickLocationUpdate();
    
    if (result.ok) {
      setLocationStatus('success');
      toast({
        title: t('ai:location.successTitle'),
        description: result.assistant_message || t('ai:location.successMessage'),
      });
    } else {
      setLocationStatus('idle');
      toast({
        title: t('ai:location.errorTitle'),
        description: result.error || t('ai:location.errorMessage'),
        variant: "destructive",
      });
    }
    
    setLoading(false);
  };

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <h1 className="text-3xl font-bold mb-6">{t('ai:title')}</h1>
      
      <Card className="p-6 mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold mb-2">{t('ai:location.title')}</h2>
            <p className="text-muted-foreground text-sm">
              {t('ai:location.description')}
            </p>
          </div>
          
          <Button 
            onClick={handleLocationUpdate}
            disabled={loading}
            size="lg"
            className="gap-2"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : locationStatus === 'success' ? (
              <CheckCircle2 className="h-4 w-4" />
            ) : (
              <MapPin className="h-4 w-4" />
            )}
            {loading ? t('ai:location.updating') : locationStatus === 'success' ? t('ai:location.updated') : t('ai:location.update')}
          </Button>
        </div>
      </Card>

      <div className="text-sm text-muted-foreground text-center">
        {t('ai:location.note')}
      </div>
    </div>
  );
};

export default AI;

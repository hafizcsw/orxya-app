import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { MapPin, Loader2, CheckCircle2 } from 'lucide-react';
import { quickLocationUpdate, askAgentHub } from '@/lib/agent-hub';
import { useToast } from '@/hooks/use-toast';

const AI = () => {
  const [loading, setLoading] = useState(false);
  const [locationStatus, setLocationStatus] = useState<'idle' | 'updating' | 'success'>('idle');
  const { toast } = useToast();

  const handleLocationUpdate = async () => {
    setLoading(true);
    setLocationStatus('updating');
    
    const result = await quickLocationUpdate();
    
    if (result.ok) {
      setLocationStatus('success');
      toast({
        title: "✅ تم تحديث الموقع",
        description: result.assistant_message || "تم تحديث موقعك بنجاح",
      });
    } else {
      setLocationStatus('idle');
      toast({
        title: "❌ فشل تحديث الموقع",
        description: result.error || "يرجى السماح بالوصول للموقع",
        variant: "destructive",
      });
    }
    
    setLoading(false);
  };

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <h1 className="text-3xl font-bold mb-6">المساعد الذكي</h1>
      
      <Card className="p-6 mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold mb-2">تحديث الموقع</h2>
            <p className="text-muted-foreground text-sm">
              حدّث موقعك لمزامنة مواقيت الصلاة والتحقق من التعارضات
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
            {loading ? 'جاري التحديث...' : locationStatus === 'success' ? 'تم التحديث' : 'تحديث الموقع'}
          </Button>
        </div>
      </Card>

      <div className="text-sm text-muted-foreground text-center">
        ملاحظة: يجب السماح للمتصفح بالوصول لموقعك الجغرافي
      </div>
    </div>
  );
};

export default AI;

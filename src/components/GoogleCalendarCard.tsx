import { useGoogleAccount } from '@/hooks/useExternal';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar, Check, Clock, RefreshCw, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function GoogleCalendarCard() {
  const { status, lastSyncAt, loading, connect, syncNow } = useGoogleAccount();
  const { toast } = useToast();

  async function handleSync() {
    const result = await syncNow();
    if (result) {
      toast({
        title: 'تمت المزامنة',
        description: `تم إضافة ${result.added ?? 0} أحداث، تحديث ${result.updated ?? 0}، تجاهل ${result.skipped ?? 0}`,
      });
    }
  }

  const statusConfig = {
    connected: { color: 'bg-green-500/10 text-green-600 border-green-500/20', icon: Check, label: 'متصل' },
    pending: { color: 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20', icon: Clock, label: 'قيد الربط' },
    error: { color: 'bg-red-500/10 text-red-600 border-red-500/20', icon: X, label: 'خطأ' },
    disconnected: { color: 'bg-muted text-muted-foreground', icon: Calendar, label: 'غير متصل' }
  };

  const config = statusConfig[status] || statusConfig.disconnected;
  const StatusIcon = config.icon;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Calendar className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-lg">Google Calendar</CardTitle>
              <CardDescription>مزامنة الأحداث تلقائياً</CardDescription>
            </div>
          </div>
          <Badge variant="outline" className={config.color}>
            <StatusIcon className="h-3 w-3 mr-1" />
            {config.label}
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {status !== 'connected' ? (
          <>
            <p className="text-sm text-muted-foreground">
              اربط حساب Google Calendar لاستيراد أحداثك ومزامنتها تلقائياً. سيتم فحص التعارضات مع أوقات الصلاة بعد كل مزامنة.
            </p>
            <Button onClick={connect} disabled={loading} className="w-full">
              {loading ? 'جارٍ الربط...' : 'ربط التقويم'}
            </Button>
          </>
        ) : (
          <>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">آخر مزامنة</span>
                <span className="font-medium">
                  {lastSyncAt ? new Date(lastSyncAt).toLocaleString('ar-EG') : 'لم تتم بعد'}
                </span>
              </div>
            </div>
            
            <div className="flex gap-2">
              <Button 
                onClick={handleSync} 
                disabled={loading}
                className="flex-1"
                variant="default"
              >
                <RefreshCw className={`h-4 w-4 ml-2 ${loading ? 'animate-spin' : ''}`} />
                {loading ? 'جارٍ المزامنة...' : 'مزامنة الآن'}
              </Button>
              <Button 
                onClick={connect} 
                disabled={loading}
                variant="outline"
              >
                إعادة الربط
              </Button>
            </div>

            <p className="text-xs text-muted-foreground">
              💡 يتم فحص التعارضات مع أوقات الصلاة تلقائياً بعد كل مزامنة
            </p>
          </>
        )}
      </CardContent>
    </Card>
  );
}

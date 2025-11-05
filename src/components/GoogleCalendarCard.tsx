import { useGoogleAccount } from '@/hooks/useExternal';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar, Check, Clock, RefreshCw, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useTranslation } from 'react-i18next';

export default function GoogleCalendarCard() {
  const { status, lastSyncAt, loading, connect, syncNow } = useGoogleAccount();
  const { toast } = useToast();
  const { t } = useTranslation('integrations');

  async function handleConnect() {
    try {
      await connect();
      toast({
        title: t('googleCalendar.connectSuccess'),
        description: t('googleCalendar.connectSuccessDetails'),
      });
    } catch (e: any) {
      toast({
        title: t('googleCalendar.connectError'),
        description: e.message || t('googleCalendar.connectError'),
        variant: 'destructive',
      });
    }
  }

  async function handleSync() {
    try {
      const result = await syncNow();
      if (result) {
        toast({
          title: t('googleCalendar.syncSuccess'),
          description: t('googleCalendar.syncSuccessDetails', {
            added: result.added ?? 0,
            updated: result.updated ?? 0,
            skipped: result.skipped ?? 0
          }),
        });
      }
    } catch (e: any) {
      toast({
        title: t('googleCalendar.syncError'),
        description: e.message || t('googleCalendar.syncError'),
        variant: 'destructive',
      });
    }
  }

  const statusConfig = {
    connected: { color: 'bg-green-500/10 text-green-600 border-green-500/20', icon: Check, label: t('googleCalendar.status.connected') },
    pending: { color: 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20', icon: Clock, label: t('googleCalendar.status.pending') },
    error: { color: 'bg-red-500/10 text-red-600 border-red-500/20', icon: X, label: t('googleCalendar.status.error') },
    disconnected: { color: 'bg-muted text-muted-foreground', icon: Calendar, label: t('googleCalendar.status.disconnected') }
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
              <CardTitle className="text-lg">{t('googleCalendar.title')}</CardTitle>
              <CardDescription>{t('googleCalendar.description')}</CardDescription>
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
              {t('googleCalendar.description2')}
            </p>
            <Button onClick={handleConnect} disabled={loading} className="w-full">
              {loading ? t('googleCalendar.connecting') : t('googleCalendar.connectButton')}
            </Button>
          </>
        ) : (
          <>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">{t('googleCalendar.lastSync')}</span>
                <span className="font-medium">
                  {lastSyncAt ? new Date(lastSyncAt).toLocaleString() : t('googleCalendar.neverSynced')}
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
                {loading ? t('googleCalendar.syncing') : t('googleCalendar.syncButton')}
              </Button>
              <Button 
                onClick={handleConnect} 
                disabled={loading}
                variant="outline"
              >
                {t('googleCalendar.reconnectButton')}
              </Button>
            </div>

            <p className="text-xs text-muted-foreground">
              {t('googleCalendar.syncInfo')}
            </p>
          </>
        )}
      </CardContent>
    </Card>
  );
}

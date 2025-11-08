import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useTranslation } from 'react-i18next';
import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

export type IntegrationStatus = 'connected' | 'disconnected' | 'error' | 'syncing';

interface IntegrationCardProps {
  name: string;
  description: string;
  icon: LucideIcon;
  status: IntegrationStatus;
  lastSync?: Date;
  onConnect?: () => void;
  onSync?: () => void;
  onDisconnect?: () => void;
  onManage?: () => void;
  itemsSynced?: number;
  className?: string;
}

export function IntegrationCard({
  name,
  description,
  icon: Icon,
  status,
  lastSync,
  onConnect,
  onSync,
  onDisconnect,
  onManage,
  itemsSynced,
  className,
}: IntegrationCardProps) {
  const { t } = useTranslation(['integrations']);

  const statusConfig = {
    connected: {
      color: 'bg-green-500/10 text-green-500 border-green-500/20',
      label: t('integrations:common.connected'),
    },
    disconnected: {
      color: 'bg-gray-500/10 text-gray-500 border-gray-500/20',
      label: t('integrations:common.disconnected'),
    },
    error: {
      color: 'bg-red-500/10 text-red-500 border-red-500/20',
      label: t('integrations:common.error'),
    },
    syncing: {
      color: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
      label: t('integrations:common.syncing'),
    },
  };

  const config = statusConfig[status];

  return (
    <Card className={cn('relative overflow-hidden', className)}>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Icon className="h-6 w-6 text-primary" />
            </div>
            <div>
              <CardTitle className="text-lg">{name}</CardTitle>
              <CardDescription className="mt-1">{description}</CardDescription>
            </div>
          </div>
          <Badge variant="outline" className={cn('border', config.color)}>
            {config.label}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {status === 'connected' && lastSync && (
          <div className="text-sm text-muted-foreground">
            {t('integrations:common.lastSyncAt', {
              time: new Intl.DateTimeFormat('ar', {
                dateStyle: 'short',
                timeStyle: 'short',
              }).format(lastSync),
            })}
            {itemsSynced !== undefined && (
              <span className="ml-2">• {itemsSynced} {t('integrations:hub.itemsSynced')}</span>
            )}
          </div>
        )}

        <div className="flex gap-2">
          {status === 'disconnected' && onConnect && (
            <Button onClick={onConnect} className="flex-1">
              {t('integrations:common.connect')}
            </Button>
          )}

          {status === 'connected' && (
            <>
              {onSync && (
                <Button onClick={onSync} variant="outline" className="flex-1">
                  {t('integrations:common.sync')}
                </Button>
              )}
              {onManage && (
                <Button onClick={onManage} variant="outline">
                  {t('integrations:common.manage')}
                </Button>
              )}
              {onDisconnect && (
                <Button onClick={onDisconnect} variant="ghost" size="sm">
                  {t('integrations:common.disconnect')}
                </Button>
              )}
            </>
          )}

          {status === 'error' && onConnect && (
            <Button onClick={onConnect} variant="destructive" className="flex-1">
              {t('integrations:googleCalendar.reconnectButton')}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

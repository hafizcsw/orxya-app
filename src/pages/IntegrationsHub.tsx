import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, Calendar, CheckSquare, FileText, Trello, Activity, Zap } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { IntegrationCard } from '@/components/integrations/IntegrationCard';
import { DashboardSection, DashboardGrid } from '@/components/dashboard/DataDashboard';
import { useGoogleAccount } from '@/hooks/useGoogleAccount';
import { toast } from 'sonner';

type IntegrationStatus = 'connected' | 'disconnected' | 'error' | 'syncing';

export default function IntegrationsHub() {
  const { t } = useTranslation(['integrations', 'navigation']);
  const navigate = useNavigate();
  const { status: googleStatusRaw, connect: googleConnect, syncNow: googleSync } = useGoogleAccount();
  const [syncingAll, setSyncingAll] = useState(false);

  // Map google status to our integration status
  const googleStatus: IntegrationStatus = 
    googleStatusRaw === 'pending' ? 'syncing' : 
    googleStatusRaw === 'connected' ? 'connected' :
    googleStatusRaw === 'error' ? 'error' : 'disconnected';

  const handleSyncAll = async () => {
    setSyncingAll(true);
    toast.info(t('integrations:hub.syncingAll'));
    
    // Sync Google Calendar if connected
    if (googleStatus === 'connected') {
      await googleSync();
    }
    
    // Add other integrations sync here when implemented
    
    setSyncingAll(false);
    toast.success(t('integrations:googleCalendar.syncSuccess'));
  };

  const integrations = [
    {
      id: 'google-calendar',
      name: t('integrations:googleCalendar.title'),
      description: t('integrations:googleCalendar.description'),
      icon: Calendar,
      status: googleStatus,
      onConnect: googleConnect,
      onSync: googleSync,
      isImplemented: true,
    },
    {
      id: 'todoist',
      name: t('integrations:todoist.title'),
      description: t('integrations:todoist.description'),
      icon: CheckSquare,
      status: 'disconnected' as const,
      isImplemented: false,
    },
    {
      id: 'notion',
      name: t('integrations:notion.title'),
      description: t('integrations:notion.description'),
      icon: FileText,
      status: 'disconnected' as const,
      isImplemented: false,
    },
    {
      id: 'trello',
      name: t('integrations:trello.title'),
      description: t('integrations:trello.description'),
      icon: Trello,
      status: 'disconnected' as const,
      isImplemented: false,
    },
    {
      id: 'outlook',
      name: t('integrations:outlook.title'),
      description: t('integrations:outlook.description'),
      icon: Calendar,
      status: 'disconnected' as const,
      isImplemented: false,
    },
    {
      id: 'apple-health',
      name: t('integrations:appleHealth.title'),
      description: t('integrations:appleHealth.description'),
      icon: Activity,
      status: 'disconnected' as const,
      isImplemented: false,
    },
    {
      id: 'whoop',
      name: t('integrations:whoop.title'),
      description: t('integrations:whoop.description'),
      icon: Zap,
      status: 'disconnected' as const,
      isImplemented: false,
    },
  ];

  const connectedIntegrations = integrations.filter((i) => i.status === 'connected');
  const availableIntegrations = integrations.filter((i) => i.status !== 'connected');

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate('/settings')}
                className="shrink-0"
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div>
                <h1 className="text-2xl font-bold gradient-text">
                  {t('integrations:hub.title')}
                </h1>
                <p className="text-sm text-muted-foreground mt-1">
                  {t('integrations:hub.subtitle')}
                </p>
              </div>
            </div>
            {connectedIntegrations.length > 0 && (
              <Button onClick={handleSyncAll} disabled={syncingAll}>
                {syncingAll ? t('integrations:hub.syncingAll') : t('integrations:hub.syncAll')}
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="container mx-auto px-4 py-6 space-y-8">
        {/* Connected Apps */}
        {connectedIntegrations.length > 0 && (
          <DashboardSection title={t('integrations:hub.connectedApps')}>
            <DashboardGrid columns={2}>
              {connectedIntegrations.map((integration) => (
                <IntegrationCard
                  key={integration.id}
                  name={integration.name}
                  description={integration.description}
                  icon={integration.icon}
                  status={integration.status}
                  onConnect={integration.onConnect}
                  onSync={integration.onSync}
                />
              ))}
            </DashboardGrid>
          </DashboardSection>
        )}

        {/* Available Apps */}
        <DashboardSection title={t('integrations:hub.availableApps')}>
          <DashboardGrid columns={2}>
            {availableIntegrations.map((integration) => (
              <IntegrationCard
                key={integration.id}
                name={integration.name}
                description={integration.description}
                icon={integration.icon}
                status={integration.status}
                onConnect={
                  integration.isImplemented
                    ? integration.onConnect
                    : () => toast.info('قريباً - Coming Soon')
                }
              />
            ))}
          </DashboardGrid>
        </DashboardSection>
      </div>
    </div>
  );
}

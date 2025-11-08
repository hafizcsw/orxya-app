import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Calendar, CheckSquare, FileText, Trello, Activity, Zap, ExternalLink } from 'lucide-react';
import GoogleCalendarCard from '@/components/GoogleCalendarCard';
import { IntegrationCard } from '@/components/integrations/IntegrationCard';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

export function IntegrationSettings() {
  const { t } = useTranslation(['integrations']);
  const navigate = useNavigate();

  const otherIntegrations = [
    {
      id: 'todoist',
      name: t('integrations:todoist.title'),
      description: t('integrations:todoist.description'),
      icon: CheckSquare,
      status: 'disconnected' as const,
    },
    {
      id: 'notion',
      name: t('integrations:notion.title'),
      description: t('integrations:notion.description'),
      icon: FileText,
      status: 'disconnected' as const,
    },
    {
      id: 'trello',
      name: t('integrations:trello.title'),
      description: t('integrations:trello.description'),
      icon: Trello,
      status: 'disconnected' as const,
    },
    {
      id: 'outlook',
      name: t('integrations:outlook.title'),
      description: t('integrations:outlook.description'),
      icon: Calendar,
      status: 'disconnected' as const,
    },
    {
      id: 'apple-health',
      name: t('integrations:appleHealth.title'),
      description: t('integrations:appleHealth.description'),
      icon: Activity,
      status: 'disconnected' as const,
    },
    {
      id: 'whoop',
      name: t('integrations:whoop.title'),
      description: t('integrations:whoop.description'),
      icon: Zap,
      status: 'disconnected' as const,
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-foreground mb-2">
            {t('integrations:title')}
          </h2>
          <p className="text-sm text-muted-foreground">
            {t('integrations:description')}
          </p>
        </div>
        <Button onClick={() => navigate('/integrations')} variant="outline">
          {t('integrations:hub.title')}
          <ExternalLink className="h-4 w-4 ml-2" />
        </Button>
      </div>

      {/* Google Calendar - Main Integration */}
      <div>
        <h3 className="text-lg font-medium mb-4">{t('integrations:hub.connectedApps')}</h3>
        <GoogleCalendarCard />
      </div>

      {/* Other Available Integrations */}
      <div>
        <h3 className="text-lg font-medium mb-4">{t('integrations:hub.availableApps')}</h3>
        <div className="grid gap-4 md:grid-cols-2">
          {otherIntegrations.map((integration) => (
            <IntegrationCard
              key={integration.id}
              name={integration.name}
              description={integration.description}
              icon={integration.icon}
              status={integration.status}
              onConnect={() => toast.info('قريباً - Coming Soon')}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

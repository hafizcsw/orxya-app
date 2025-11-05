import { useTranslation } from 'react-i18next';
import GoogleCalendarCard from '@/components/GoogleCalendarCard';

export function IntegrationSettings() {
  const { t } = useTranslation(['integrations']);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold text-foreground mb-2">
          {t('integrations:title')}
        </h2>
        <p className="text-sm text-muted-foreground">
          {t('integrations:description')}
        </p>
      </div>

      <GoogleCalendarCard />
    </div>
  );
}

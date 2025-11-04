import { useState } from 'react';
import { SettingsSidebar } from './components/SettingsSidebar';
import { GeneralSettings } from './components/GeneralSettings';
import { ViewSettings } from './components/ViewSettings';
import { NotificationSettings } from './components/NotificationSettings';
import { EventSettings } from './components/EventSettings';
import { TaskSettings } from './components/TaskSettings';
import { LocationSettings } from './components/LocationSettings';
import { PrayerSettings } from './components/PrayerSettings';
import { IntegrationSettings } from './components/IntegrationSettings';
import { PrivacySettings } from './components/PrivacySettings';
import { SettingsSection } from '@/types/settings';

export default function Settings() {
  const [activeSection, setActiveSection] = useState<SettingsSection>('general');

  const renderSection = () => {
    switch (activeSection) {
      case 'general':
        return <GeneralSettings />;
      case 'view':
        return <ViewSettings />;
      case 'notifications':
        return <NotificationSettings />;
      case 'events':
        return <EventSettings />;
      case 'tasks':
        return <TaskSettings />;
      case 'location':
        return <LocationSettings />;
      case 'prayer':
        return <PrayerSettings />;
      case 'integrations':
        return <IntegrationSettings />;
      case 'privacy':
        return <PrivacySettings />;
      default:
        return <GeneralSettings />;
    }
  };

  return (
    <div className="h-screen bg-background flex">
      <SettingsSidebar 
        activeSection={activeSection} 
        onSectionChange={setActiveSection} 
      />
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto p-8">
          {renderSection()}
        </div>
      </div>
    </div>
  );
}

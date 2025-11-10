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
import { CalendarParitySettings } from '@/components/calendar/CalendarParitySettings';
import { AdvancedSettings } from './components/AdvancedSettings';
import { UpdateSettings } from './components/UpdateSettings';
import { UpdateHistory } from './components/UpdateHistory';
import { SettingsSection } from '@/types/settings';
import PullToRefresh from 'react-simple-pull-to-refresh';
import { toast } from 'sonner';

export default function Settings() {
  const [activeSection, setActiveSection] = useState<SettingsSection>('general');

  const handleRefresh = async () => {
    // Force a re-render by updating the active section
    const current = activeSection;
    setActiveSection('general');
    setTimeout(() => setActiveSection(current), 0);
    toast.success('تم تحديث الإعدادات');
  };

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
      case 'calendar-parity':
        return <CalendarParitySettings />;
      case 'advanced':
        return <AdvancedSettings />;
      case 'updates':
        return <UpdateSettings />;
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
      <PullToRefresh onRefresh={handleRefresh} pullingContent="">
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-4xl mx-auto p-8 pb-24">
            {renderSection()}
          </div>
        </div>
      </PullToRefresh>
    </div>
  );
}

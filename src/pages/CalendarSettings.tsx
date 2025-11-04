import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowRight, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CalendarParitySettings } from '@/components/calendar/CalendarParitySettings';
import { GeneralSettings } from '@/pages/Settings/components/GeneralSettings';
import { EventSettings } from '@/pages/Settings/components/EventSettings';
import { ViewSettings } from '@/pages/Settings/components/ViewSettings';
import { NotificationSettings } from '@/pages/Settings/components/NotificationSettings';
import { cn } from '@/lib/utils';

type SettingsSection = 'general' | 'events' | 'view' | 'notifications' | 'integration';

export default function CalendarSettings() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialSection = (searchParams.get('section') as SettingsSection) || 'general';
  const [activeSection, setActiveSection] = useState<SettingsSection>(initialSection);

  const sections = [
    { id: 'general' as const, label: 'عام', englishLabel: 'General' },
    { id: 'events' as const, label: 'الأحداث والتقويمات', englishLabel: 'Events & Calendars' },
    { id: 'view' as const, label: 'خيارات العرض', englishLabel: 'View Options' },
    { id: 'notifications' as const, label: 'التنبيهات', englishLabel: 'Notifications' },
    { id: 'integration' as const, label: 'التكامل والمزامنة', englishLabel: 'Integration & Sync' },
  ];

  const renderSection = () => {
    switch (activeSection) {
      case 'general':
        return <GeneralSettings />;
      case 'events':
        return <EventSettings />;
      case 'view':
        return <ViewSettings />;
      case 'notifications':
        return <NotificationSettings />;
      case 'integration':
        return <CalendarParitySettings />;
      default:
        return <GeneralSettings />;
    }
  };

  return (
    <div className="min-h-screen bg-[#f8f9fa] dark:bg-[#202124]">
      <header className="bg-white dark:bg-[#292a2d] border-b border-[#dadce0] dark:border-[#5f6368] px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/calendar')}
              className="flex items-center gap-2 hover:bg-[#f1f3f4] dark:hover:bg-[#3c4043]"
            >
              <ArrowRight className="w-4 h-4" />
              <span className="text-sm">رجوع</span>
            </Button>
            <div className="h-6 w-px bg-[#dadce0] dark:bg-[#5f6368]" />
            <div className="flex items-center gap-2">
              <Settings className="w-5 h-5 text-[#5f6368] dark:text-[#9aa0a6]" />
              <h1 className="text-[22px] font-normal text-[#3c4043] dark:text-[#e8eaed]">الإعدادات</h1>
            </div>
          </div>
        </div>
      </header>

      <div className="flex">
        <aside className="hidden lg:block w-64 border-l border-[#dadce0] dark:border-[#5f6368] bg-white dark:bg-[#292a2d]">
          <nav className="p-6">
            <div className="space-y-1">
              {sections.map((section) => {
                const isActive = activeSection === section.id;
                return (
                  <button
                    key={section.id}
                    onClick={() => setActiveSection(section.id)}
                    className={cn(
                      "w-full text-right px-4 py-2.5 rounded-lg text-sm transition-all",
                      isActive
                        ? "bg-[#e8f0fe] dark:bg-[#1a73e8] text-[#1a73e8] dark:text-white font-medium border-l-4 border-[#1a73e8]"
                        : "text-[#5f6368] dark:text-[#9aa0a6] hover:bg-[#f1f3f4] dark:hover:bg-[#3c4043] hover:text-[#3c4043] dark:hover:text-[#e8eaed]"
                    )}
                  >
                    <div className="text-right">
                      <div>{section.label}</div>
                      <div className={cn(
                        "text-xs mt-0.5",
                        isActive ? "text-[#1a73e8] dark:text-white" : "text-[#5f6368] dark:text-[#9aa0a6]"
                      )}>
                        {section.englishLabel}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </nav>
        </aside>

        <div className="lg:hidden p-4 bg-white dark:bg-[#292a2d] border-b border-[#dadce0] dark:border-[#5f6368]">
          <Select value={activeSection} onValueChange={(value) => setActiveSection(value as SettingsSection)}>
            <SelectTrigger className="w-full h-9 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="z-[100]">
              {sections.map((section) => (
                <SelectItem key={section.id} value={section.id} className="text-sm">
                  <div className="text-right">
                    <div>{section.label}</div>
                    <div className="text-xs text-muted-foreground">{section.englishLabel}</div>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <main className="flex-1 p-4 lg:p-8 overflow-auto">
          <div className="max-w-full lg:max-w-5xl mx-auto bg-white dark:bg-[#292a2d] rounded-lg shadow-sm">
            <div className="p-6 lg:p-8">
              {renderSection()}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

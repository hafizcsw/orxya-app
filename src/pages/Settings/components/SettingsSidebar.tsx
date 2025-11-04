import { Globe, Eye, Bell, Calendar, CheckSquare, MapPin, Moon, Zap, Lock, Sparkles } from 'lucide-react';
import { SettingsSection } from '@/types/settings';
import { cn } from '@/lib/utils';

interface SettingsSidebarProps {
  activeSection: SettingsSection;
  onSectionChange: (section: SettingsSection) => void;
}

const sections = [
  { id: 'general' as SettingsSection, label: 'عام', icon: Globe },
  { id: 'view' as SettingsSection, label: 'العرض', icon: Eye },
  { id: 'notifications' as SettingsSection, label: 'التنبيهات', icon: Bell },
  { id: 'events' as SettingsSection, label: 'الأحداث', icon: Calendar },
  { id: 'tasks' as SettingsSection, label: 'المهام', icon: CheckSquare },
  { id: 'location' as SettingsSection, label: 'الموقع', icon: MapPin },
  { id: 'prayer' as SettingsSection, label: 'الصلاة', icon: Moon },
  { id: 'integrations' as SettingsSection, label: 'التكاملات', icon: Zap },
  { id: 'privacy' as SettingsSection, label: 'الخصوصية', icon: Lock },
  { id: 'calendar-parity' as SettingsSection, label: 'Calendar Parity', icon: Sparkles },
];

export function SettingsSidebar({ activeSection, onSectionChange }: SettingsSidebarProps) {
  return (
    <div className="w-64 border-l border-border bg-muted/30 p-6">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-foreground">الإعدادات</h1>
      </div>
      <nav className="space-y-1">
        {sections.map((section) => {
          const Icon = section.icon;
          const isActive = activeSection === section.id;
          
          return (
            <button
              key={section.id}
              onClick={() => onSectionChange(section.id)}
              className={cn(
                "w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors",
                isActive
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <Icon className="w-5 h-5" />
              <span>{section.label}</span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}

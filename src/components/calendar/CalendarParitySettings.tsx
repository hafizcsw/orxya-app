import { useState } from "react";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useFeatureFlags } from "@/hooks/useFeatureFlags";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { AppointmentPagesManager } from "./AppointmentPagesManager";
import { ICSManager } from "./ICSManager";

export function CalendarParitySettings() {
  const [activeSection, setActiveSection] = useState("overview");
  const { flags, loading, setFlag } = useFeatureFlags();

  const handleToggle = async (key: string, value: boolean) => {
    try {
      await setFlag(key, value);
      toast.success("تم تحديث الإعداد بنجاح");
    } catch (error) {
      toast.error("فشل في تحديث الإعداد");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const sections = [
    { id: "overview", label: "Overview", component: null },
    { id: "appointment-pages", label: "Appointment Pages", component: AppointmentPagesManager },
    { id: "ics", label: "ICS Import/Export", component: ICSManager },
  ];

  const ActiveComponent = sections.find(s => s.id === activeSection)?.component;

  return (
    <div className="space-y-0">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-normal text-foreground mb-2">Integration & Sync</h1>
        <p className="text-sm text-muted-foreground">
          Manage calendar integrations, appointments, and data import/export
        </p>
      </div>

      {/* Sub-navigation */}
      <div className="border-b border-border mb-8">
        <nav className="flex gap-6">
          {sections.map((section) => (
            <button
              key={section.id}
              onClick={() => setActiveSection(section.id)}
              className={`pb-3 px-1 text-sm transition-colors relative ${
                activeSection === section.id
                  ? "text-primary font-medium"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {section.label}
              {activeSection === section.id && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
              )}
            </button>
          ))}
        </nav>
      </div>

      {/* Content */}
      {activeSection === "overview" && (
        <div className="space-y-0">
          {/* Calendar Parity Main Toggle */}
          <div className="gcal-settings-item py-6 border-b border-border">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <Label htmlFor="ff_calendar_parity" className="text-base font-medium text-foreground cursor-pointer">
                  Calendar Parity
                </Label>
                <p className="text-sm text-muted-foreground mt-1">
                  Enable advanced calendar features for Google Calendar compatibility
                </p>
              </div>
              <Switch
                id="ff_calendar_parity"
                checked={flags?.ff_calendar_parity ?? false}
                onCheckedChange={(checked) => handleToggle("ff_calendar_parity", checked)}
              />
            </div>
          </div>

          {/* Find Time */}
          <div className="gcal-settings-item py-6 border-b border-border">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <Label htmlFor="ff_calendar_find_time" className="text-base font-medium text-foreground cursor-pointer">
                  Find Time
                </Label>
                <p className="text-sm text-muted-foreground mt-1">
                  Automatically suggest meeting times based on availability
                </p>
              </div>
              <Switch
                id="ff_calendar_find_time"
                checked={flags?.ff_calendar_find_time ?? false}
                onCheckedChange={(checked) => handleToggle("ff_calendar_find_time", checked)}
              />
            </div>
          </div>

          {/* Appointments */}
          <div className="gcal-settings-item py-6 border-b border-border">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <Label htmlFor="ff_calendar_appointments" className="text-base font-medium text-foreground cursor-pointer">
                  Appointment Pages
                </Label>
                <p className="text-sm text-muted-foreground mt-1">
                  Create booking pages for appointments with customizable availability
                </p>
              </div>
              <Switch
                id="ff_calendar_appointments"
                checked={flags?.ff_calendar_appointments ?? false}
                onCheckedChange={(checked) => handleToggle("ff_calendar_appointments", checked)}
              />
            </div>
          </div>

          {/* Tasks Parity */}
          <div className="gcal-settings-item py-6 border-b border-border">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <Label htmlFor="ff_calendar_tasks_parity" className="text-base font-medium text-foreground cursor-pointer">
                  Tasks Integration
                </Label>
                <p className="text-sm text-muted-foreground mt-1">
                  Sync and manage tasks within your calendar
                </p>
              </div>
              <Switch
                id="ff_calendar_tasks_parity"
                checked={flags?.ff_calendar_tasks_parity ?? false}
                onCheckedChange={(checked) => handleToggle("ff_calendar_tasks_parity", checked)}
              />
            </div>
          </div>

          {/* ICS Import/Export */}
          <div className="gcal-settings-item py-6">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <Label htmlFor="ff_calendar_ics" className="text-base font-medium text-foreground cursor-pointer">
                  ICS Import/Export
                </Label>
                <p className="text-sm text-muted-foreground mt-1">
                  Import and export calendar events in standard ICS format
                </p>
              </div>
              <Switch
                id="ff_calendar_ics"
                checked={flags?.ff_calendar_ics ?? false}
                onCheckedChange={(checked) => handleToggle("ff_calendar_ics", checked)}
              />
            </div>
          </div>
        </div>
      )}

      {ActiveComponent && <ActiveComponent />}
    </div>
  );
}

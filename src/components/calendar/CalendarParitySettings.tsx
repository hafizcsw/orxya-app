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
      toast.success("Setting updated successfully");
    } catch (error) {
      toast.error("Failed to update setting");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="w-6 h-6 animate-spin text-[#5f6368]" />
      </div>
    );
  }

  const sections = [
    { id: "overview", label: "Overview" },
    { id: "appointment-pages", label: "Appointment Pages" },
    { id: "ics", label: "ICS Import/Export" },
  ];

  return (
    <div>
      <h1 className="text-[22px] text-[#202124] mb-8">Integration & Sync</h1>

      {/* Sub-navigation */}
      <div className="border-b border-[#e0e0e0] mb-6">
        <nav className="flex gap-8">
          {sections.map((section) => (
            <button
              key={section.id}
              onClick={() => setActiveSection(section.id)}
              className={`pb-3 text-sm transition-colors relative ${
                activeSection === section.id
                  ? "text-[#1967d2] font-medium"
                  : "text-[#5f6368] hover:text-[#202124]"
              }`}
            >
              {section.label}
              {activeSection === section.id && (
                <div className="absolute bottom-0 left-0 right-0 h-[3px] bg-[#1967d2]" />
              )}
            </button>
          ))}
        </nav>
      </div>

      {/* Content */}
      {activeSection === "overview" && (
        <div className="space-y-0">
          {/* Calendar Parity Main Toggle */}
          <div className="flex items-start justify-between py-6 border-b border-[#e0e0e0]">
            <div className="flex-1 pr-4">
              <Label htmlFor="ff_calendar_parity" className="text-sm font-medium text-[#202124] cursor-pointer block">
                Calendar Parity
              </Label>
              <p className="text-xs text-[#5f6368] mt-1">
                Enable advanced calendar features for Google Calendar compatibility
              </p>
            </div>
            <Switch
              id="ff_calendar_parity"
              checked={flags?.ff_calendar_parity ?? false}
              onCheckedChange={(checked) => handleToggle("ff_calendar_parity", checked)}
            />
          </div>

          {/* Find Time */}
          <div className="flex items-start justify-between py-6 border-b border-[#e0e0e0]">
            <div className="flex-1 pr-4">
              <Label htmlFor="ff_calendar_find_time" className="text-sm font-medium text-[#202124] cursor-pointer block">
                Find Time
              </Label>
              <p className="text-xs text-[#5f6368] mt-1">
                Automatically suggest meeting times based on availability
              </p>
            </div>
            <Switch
              id="ff_calendar_find_time"
              checked={flags?.ff_calendar_find_time ?? false}
              onCheckedChange={(checked) => handleToggle("ff_calendar_find_time", checked)}
            />
          </div>

          {/* Appointments */}
          <div className="flex items-start justify-between py-6 border-b border-[#e0e0e0]">
            <div className="flex-1 pr-4">
              <Label htmlFor="ff_calendar_appointments" className="text-sm font-medium text-[#202124] cursor-pointer block">
                Appointment Pages
              </Label>
              <p className="text-xs text-[#5f6368] mt-1">
                Create booking pages for appointments with customizable availability
              </p>
            </div>
            <Switch
              id="ff_calendar_appointments"
              checked={flags?.ff_calendar_appointments ?? false}
              onCheckedChange={(checked) => handleToggle("ff_calendar_appointments", checked)}
            />
          </div>

          {/* Tasks Parity */}
          <div className="flex items-start justify-between py-6 border-b border-[#e0e0e0]">
            <div className="flex-1 pr-4">
              <Label htmlFor="ff_calendar_tasks_parity" className="text-sm font-medium text-[#202124] cursor-pointer block">
                Tasks Integration
              </Label>
              <p className="text-xs text-[#5f6368] mt-1">
                Sync and manage tasks within your calendar
              </p>
            </div>
            <Switch
              id="ff_calendar_tasks_parity"
              checked={flags?.ff_calendar_tasks_parity ?? false}
              onCheckedChange={(checked) => handleToggle("ff_calendar_tasks_parity", checked)}
            />
          </div>

          {/* ICS Import/Export */}
          <div className="flex items-start justify-between py-6">
            <div className="flex-1 pr-4">
              <Label htmlFor="ff_calendar_ics" className="text-sm font-medium text-[#202124] cursor-pointer block">
                ICS Import/Export
              </Label>
              <p className="text-xs text-[#5f6368] mt-1">
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
      )}

      {activeSection === "appointment-pages" && <AppointmentPagesManager />}
      {activeSection === "ics" && <ICSManager />}
    </div>
  );
}

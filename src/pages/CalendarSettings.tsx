import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { CalendarParitySettings } from "@/components/calendar/CalendarParitySettings";
import { ChevronLeft, Settings, Calendar, Eye, Bell, RefreshCw } from "lucide-react";

export default function CalendarSettings() {
  const [activeSection, setActiveSection] = useState("integration");
  const navigate = useNavigate();

  const sections = [
    { id: "general", label: "General", icon: Settings },
    { id: "events", label: "Events & Calendars", icon: Calendar },
    { id: "view", label: "View Options", icon: Eye },
    { id: "notifications", label: "Notifications", icon: Bell },
    { id: "integration", label: "Integration & Sync", icon: RefreshCw },
  ];

  return (
    <div className="gcal-settings-page min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-background sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center gap-4">
          <button
            onClick={() => navigate("/calendar")}
            className="p-2 hover:bg-muted rounded-full transition-colors"
            aria-label="Back to Calendar"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <h1 className="text-xl font-normal text-foreground">Settings</h1>
        </div>
      </header>

      <div className="flex max-w-7xl mx-auto">
        {/* Sidebar Navigation */}
        <aside className="gcal-settings-sidebar hidden md:block w-60 border-r border-border bg-background sticky top-[73px] h-[calc(100vh-73px)] overflow-y-auto">
          <div className="p-6">
            <h2 className="text-sm font-medium text-muted-foreground mb-1">Settings for</h2>
            <p className="text-base text-foreground mb-6">Calendar</p>
          </div>
          <nav className="px-3 pb-6">
            {sections.map((section) => {
              const Icon = section.icon;
              return (
                <button
                  key={section.id}
                  onClick={() => setActiveSection(section.id)}
                  className={`w-full text-left px-4 py-3 mb-1 rounded-lg transition-colors relative ${
                    activeSection === section.id
                      ? "bg-muted text-primary font-medium"
                      : "text-foreground hover:bg-muted/50"
                  }`}
                >
                  {activeSection === section.id && (
                    <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-primary rounded-r" />
                  )}
                  <div className="flex items-center gap-3">
                    <Icon className="w-4 h-4" />
                    <span className="text-sm">{section.label}</span>
                  </div>
                </button>
              );
            })}
          </nav>
        </aside>

        {/* Mobile Section Selector */}
        <div className="md:hidden w-full border-b border-border bg-background sticky top-[73px] z-10">
          <select
            value={activeSection}
            onChange={(e) => setActiveSection(e.target.value)}
            className="w-full p-4 bg-transparent text-foreground border-none outline-none"
          >
            {sections.map((section) => (
              <option key={section.id} value={section.id}>
                {section.label}
              </option>
            ))}
          </select>
        </div>

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto">
          <div className="max-w-3xl mx-auto px-6 py-8">
            {activeSection === "integration" && <CalendarParitySettings />}
            {activeSection === "general" && (
              <div>
                <h1 className="text-2xl font-normal text-foreground mb-2">General</h1>
                <p className="text-sm text-muted-foreground mb-8">
                  Configure general calendar preferences
                </p>
                <div className="space-y-6">
                  <div className="py-4 border-b border-border">
                    <p className="text-base font-medium text-foreground">Language and region</p>
                    <p className="text-sm text-muted-foreground mt-1">Coming soon</p>
                  </div>
                  <div className="py-4 border-b border-border">
                    <p className="text-base font-medium text-foreground">Time zone</p>
                    <p className="text-sm text-muted-foreground mt-1">Coming soon</p>
                  </div>
                  <div className="py-4">
                    <p className="text-base font-medium text-foreground">Date format</p>
                    <p className="text-sm text-muted-foreground mt-1">Coming soon</p>
                  </div>
                </div>
              </div>
            )}
            {activeSection === "events" && (
              <div>
                <h1 className="text-2xl font-normal text-foreground mb-2">Events & Calendars</h1>
                <p className="text-sm text-muted-foreground mb-8">
                  Manage your calendar events and settings
                </p>
                <div className="space-y-6">
                  <div className="py-4 border-b border-border">
                    <p className="text-base font-medium text-foreground">Default event duration</p>
                    <p className="text-sm text-muted-foreground mt-1">Coming soon</p>
                  </div>
                  <div className="py-4 border-b border-border">
                    <p className="text-base font-medium text-foreground">Event visibility</p>
                    <p className="text-sm text-muted-foreground mt-1">Coming soon</p>
                  </div>
                  <div className="py-4">
                    <p className="text-base font-medium text-foreground">Add invitations to calendar</p>
                    <p className="text-sm text-muted-foreground mt-1">Coming soon</p>
                  </div>
                </div>
              </div>
            )}
            {activeSection === "view" && (
              <div>
                <h1 className="text-2xl font-normal text-foreground mb-2">View Options</h1>
                <p className="text-sm text-muted-foreground mb-8">
                  Customize how your calendar is displayed
                </p>
                <div className="space-y-6">
                  <div className="py-4 border-b border-border">
                    <p className="text-base font-medium text-foreground">Default view</p>
                    <p className="text-sm text-muted-foreground mt-1">Coming soon</p>
                  </div>
                  <div className="py-4 border-b border-border">
                    <p className="text-base font-medium text-foreground">Week starts on</p>
                    <p className="text-sm text-muted-foreground mt-1">Coming soon</p>
                  </div>
                  <div className="py-4">
                    <p className="text-base font-medium text-foreground">Show declined events</p>
                    <p className="text-sm text-muted-foreground mt-1">Coming soon</p>
                  </div>
                </div>
              </div>
            )}
            {activeSection === "notifications" && (
              <div>
                <h1 className="text-2xl font-normal text-foreground mb-2">Notifications</h1>
                <p className="text-sm text-muted-foreground mb-8">
                  Control how you receive calendar notifications
                </p>
                <div className="space-y-6">
                  <div className="py-4 border-b border-border">
                    <p className="text-base font-medium text-foreground">Event notifications</p>
                    <p className="text-sm text-muted-foreground mt-1">Coming soon</p>
                  </div>
                  <div className="py-4 border-b border-border">
                    <p className="text-base font-medium text-foreground">Email notifications</p>
                    <p className="text-sm text-muted-foreground mt-1">Coming soon</p>
                  </div>
                  <div className="py-4">
                    <p className="text-base font-medium text-foreground">Desktop notifications</p>
                    <p className="text-sm text-muted-foreground mt-1">Coming soon</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}

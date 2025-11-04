import { useState } from "react";
import { CalendarParitySettings } from "@/components/calendar/CalendarParitySettings";

export default function CalendarSettings() {
  const [activeSection, setActiveSection] = useState("integration");

  const sections = [
    { id: "general", label: "General", icon: "⚙️" },
    { id: "events", label: "Events & Calendars", icon: "📅" },
    { id: "view", label: "View Options", icon: "👁️" },
    { id: "notifications", label: "Notifications", icon: "🔔" },
    { id: "integration", label: "Integration & Sync", icon: "🔄" },
  ];

  return (
    <div className="gcal-settings-page min-h-screen bg-background">
      <div className="flex">
        {/* Sidebar Navigation */}
        <aside className="gcal-settings-sidebar hidden md:block w-60 border-r border-border bg-background sticky top-0 h-screen overflow-y-auto">
          <div className="p-6">
            <h2 className="text-lg font-medium text-foreground mb-1">Settings for</h2>
            <p className="text-sm text-muted-foreground mb-6">Calendar</p>
          </div>
          <nav className="px-3">
            {sections.map((section) => (
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
                  <span className="text-lg">{section.icon}</span>
                  <span className="text-sm">{section.label}</span>
                </div>
              </button>
            ))}
          </nav>
        </aside>

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto">
          <div className="max-w-3xl mx-auto px-6 py-8">
            {activeSection === "integration" && <CalendarParitySettings />}
            {activeSection === "general" && (
              <div>
                <h1 className="text-2xl font-normal text-foreground mb-8">General</h1>
                <p className="text-muted-foreground">General settings coming soon...</p>
              </div>
            )}
            {activeSection === "events" && (
              <div>
                <h1 className="text-2xl font-normal text-foreground mb-8">Events & Calendars</h1>
                <p className="text-muted-foreground">Event settings coming soon...</p>
              </div>
            )}
            {activeSection === "view" && (
              <div>
                <h1 className="text-2xl font-normal text-foreground mb-8">View Options</h1>
                <p className="text-muted-foreground">View options coming soon...</p>
              </div>
            )}
            {activeSection === "notifications" && (
              <div>
                <h1 className="text-2xl font-normal text-foreground mb-8">Notifications</h1>
                <p className="text-muted-foreground">Notification settings coming soon...</p>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}

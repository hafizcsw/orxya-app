import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { CalendarParitySettings } from "@/components/calendar/CalendarParitySettings";
import { ChevronLeft } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";

export default function CalendarSettings() {
  const [activeSection, setActiveSection] = useState("general");
  const navigate = useNavigate();

  const sections = [
    { id: "general", label: "General" },
    { id: "events", label: "Events & Calendars" },
    { id: "view", label: "View Options" },
    { id: "notifications", label: "Notifications" },
    { id: "integration", label: "Integration & Sync" },
  ];

  return (
    <div className="min-h-screen bg-[#f8f9fa]">
      {/* Header */}
      <header className="bg-white border-b border-[#e0e0e0] sticky top-0 z-10">
        <div className="flex items-center gap-4 px-6 py-4">
          <button
            onClick={() => navigate("/calendar")}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            aria-label="Back to Calendar"
          >
            <ChevronLeft className="w-5 h-5 text-[#5f6368]" />
          </button>
          <h1 className="text-[22px] text-[#202124]">Settings</h1>
        </div>
      </header>

      <div className="flex">
        {/* Sidebar Navigation */}
        <aside className="hidden md:block w-[280px] bg-white border-r border-[#e0e0e0] min-h-[calc(100vh-73px)]">
          <div className="p-6 border-b border-[#e0e0e0]">
            <h2 className="text-xs text-[#5f6368] mb-1">Settings for</h2>
            <p className="text-sm text-[#202124]">Calendar</p>
          </div>
          <nav className="py-2">
            {sections.map((section) => (
              <button
                key={section.id}
                onClick={() => setActiveSection(section.id)}
                className={`w-full text-left px-6 py-3 text-sm transition-colors relative ${
                  activeSection === section.id
                    ? "bg-[#e8f0fe] text-[#1967d2] font-medium"
                    : "text-[#202124] hover:bg-[#f1f3f4]"
                }`}
              >
                {activeSection === section.id && (
                  <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-[#1967d2]" />
                )}
                {section.label}
              </button>
            ))}
          </nav>
        </aside>

        {/* Mobile Section Selector */}
        <div className="md:hidden w-full bg-white border-b border-[#e0e0e0] sticky top-[73px] z-10">
          <select
            value={activeSection}
            onChange={(e) => setActiveSection(e.target.value)}
            className="w-full p-4 bg-transparent text-[#202124] border-none outline-none"
          >
            {sections.map((section) => (
              <option key={section.id} value={section.id}>
                {section.label}
              </option>
            ))}
          </select>
        </div>

        {/* Main Content */}
        <main className="flex-1 bg-white mx-4 md:mx-8 my-6 rounded-lg shadow-sm min-h-[calc(100vh-120px)]">
          <div className="max-w-[800px] p-8">
            {activeSection === "integration" && <CalendarParitySettings />}
            
            {activeSection === "general" && (
              <div>
                <h1 className="text-[22px] text-[#202124] mb-8">General</h1>
                
                <div className="space-y-6">
                  <div className="flex items-start justify-between py-4 border-b border-[#e0e0e0]">
                    <div className="flex-1">
                      <h3 className="text-sm font-medium text-[#202124] mb-1">Language</h3>
                      <p className="text-xs text-[#5f6368]">العربية</p>
                    </div>
                    <Select defaultValue="ar">
                      <SelectTrigger className="w-[200px] bg-[#f1f3f4] border-none text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ar">العربية</SelectItem>
                        <SelectItem value="en">English</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex items-start justify-between py-4 border-b border-[#e0e0e0]">
                    <div className="flex-1">
                      <h3 className="text-sm font-medium text-[#202124] mb-1">Country</h3>
                      <p className="text-xs text-[#5f6368]">روسيا (Россия)</p>
                    </div>
                    <Select defaultValue="ru">
                      <SelectTrigger className="w-[200px] bg-[#f1f3f4] border-none text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ru">روسيا (Россия)</SelectItem>
                        <SelectItem value="us">United States</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex items-start justify-between py-4 border-b border-[#e0e0e0]">
                    <div className="flex-1">
                      <h3 className="text-sm font-medium text-[#202124] mb-1">Time zone</h3>
                      <p className="text-xs text-[#5f6368]">تنسيق التاريخ</p>
                    </div>
                    <Select defaultValue="date">
                      <SelectTrigger className="w-[200px] bg-[#f1f3f4] border-none text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="date">12/31/2025</SelectItem>
                        <SelectItem value="date2">31/12/2025</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex items-start justify-between py-4 border-b border-[#e0e0e0]">
                    <div className="flex-1">
                      <h3 className="text-sm font-medium text-[#202124] mb-1">Date format</h3>
                      <p className="text-xs text-[#5f6368]">تنسيق الوقت</p>
                    </div>
                    <Select defaultValue="time">
                      <SelectTrigger className="w-[200px] bg-[#f1f3f4] border-none text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="time">1:00 م</SelectItem>
                        <SelectItem value="time24">13:00</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            )}

            {activeSection === "events" && (
              <div>
                <h1 className="text-[22px] text-[#202124] mb-8">Events & Calendars</h1>
                <div className="space-y-6">
                  <div className="py-4 border-b border-[#e0e0e0]">
                    <p className="text-sm font-medium text-[#202124]">Default event duration</p>
                    <p className="text-xs text-[#5f6368] mt-1">Coming soon</p>
                  </div>
                  <div className="py-4 border-b border-[#e0e0e0]">
                    <p className="text-sm font-medium text-[#202124]">Event visibility</p>
                    <p className="text-xs text-[#5f6368] mt-1">Coming soon</p>
                  </div>
                </div>
              </div>
            )}

            {activeSection === "view" && (
              <div>
                <h1 className="text-[22px] text-[#202124] mb-8">View Options</h1>
                <div className="space-y-6">
                  <div className="py-4 border-b border-[#e0e0e0]">
                    <p className="text-sm font-medium text-[#202124]">Default view</p>
                    <p className="text-xs text-[#5f6368] mt-1">Coming soon</p>
                  </div>
                  <div className="py-4 border-b border-[#e0e0e0]">
                    <p className="text-sm font-medium text-[#202124]">Week starts on</p>
                    <p className="text-xs text-[#5f6368] mt-1">Coming soon</p>
                  </div>
                </div>
              </div>
            )}

            {activeSection === "notifications" && (
              <div>
                <h1 className="text-[22px] text-[#202124] mb-8">Notifications</h1>
                <div className="space-y-6">
                  <div className="py-4 border-b border-[#e0e0e0]">
                    <p className="text-sm font-medium text-[#202124]">Event notifications</p>
                    <p className="text-xs text-[#5f6368] mt-1">Coming soon</p>
                  </div>
                  <div className="py-4 border-b border-[#e0e0e0]">
                    <p className="text-sm font-medium text-[#202124]">Email notifications</p>
                    <p className="text-xs text-[#5f6368] mt-1">Coming soon</p>
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

import { useState } from "react";
import { Switch } from "@/components/ui/switch";
import { useFeatureFlags } from "@/hooks/useFeatureFlags";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { AppointmentPagesManager } from "./AppointmentPagesManager";
import { ICSManager } from "./ICSManager";
import { cn } from "@/lib/utils";

export function CalendarParitySettings() {
  const [activeSection, setActiveSection] = useState("overview");
  const { flags, loading, setFlag } = useFeatureFlags();

  const handleToggle = async (key: string, value: boolean) => {
    try {
      await setFlag(key, value);
      toast.success("تم تحديث الإعداد");
    } catch (error) {
      toast.error("حدث خطأ أثناء التحديث");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="w-6 h-6 animate-spin text-[#5f6368] dark:text-[#9aa0a6]" />
      </div>
    );
  }

  const sections = [
    { id: "overview", label: "نظرة عامة", englishLabel: "Overview" },
    { id: "appointment-pages", label: "صفحات المواعيد", englishLabel: "Appointment Pages" },
    { id: "ics", label: "استيراد/تصدير ICS", englishLabel: "ICS Import/Export" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-[22px] font-normal text-[#3c4043] dark:text-[#e8eaed] mb-2">التكامل والمزامنة</h2>
        <p className="text-sm text-[#5f6368] dark:text-[#9aa0a6]">
          Integration & Sync • إدارة التكاملات الخارجية والمزامنة
        </p>
      </div>

      <div className="flex gap-8 border-b border-[#dadce0] dark:border-[#5f6368] pb-0">
        {sections.map((section) => (
          <button
            key={section.id}
            onClick={() => setActiveSection(section.id)}
            className={cn(
              "pb-3 text-sm border-b-2 transition-colors whitespace-nowrap",
              activeSection === section.id
                ? "border-[#1a73e8] text-[#1a73e8] font-medium"
                : "border-transparent text-[#5f6368] dark:text-[#9aa0a6] hover:text-[#3c4043] dark:hover:text-[#e8eaed]"
            )}
          >
            <div>
              <div>{section.label}</div>
              <div className="text-xs mt-0.5 opacity-70">{section.englishLabel}</div>
            </div>
          </button>
        ))}
      </div>

      <div className="mt-6">
        {activeSection === "overview" && (
          <div className="space-y-0">
            <div className="py-4 border-b border-[#dadce0] dark:border-[#5f6368]">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <h3 className="text-sm font-medium text-[#3c4043] dark:text-[#e8eaed]">Calendar Parity</h3>
                  <p className="text-xs text-[#5f6368] dark:text-[#9aa0a6] mt-1">
                    مزامنة الأحداث بين التقويمات المختلفة
                  </p>
                </div>
                <Switch
                  checked={flags.ff_calendar_parity || false}
                  onCheckedChange={(checked) => handleToggle("ff_calendar_parity", checked)}
                  className="h-5 w-9 data-[state=checked]:bg-[#1a73e8]"
                />
              </div>
            </div>

            <div className="py-4 border-b border-[#dadce0] dark:border-[#5f6368]">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <h3 className="text-sm font-medium text-[#3c4043] dark:text-[#e8eaed]">Find Time</h3>
                  <p className="text-xs text-[#5f6368] dark:text-[#9aa0a6] mt-1">
                    البحث عن الأوقات المتاحة بذكاء
                  </p>
                </div>
                <Switch
                  checked={flags.ff_calendar_find_time || false}
                  onCheckedChange={(checked) => handleToggle("ff_calendar_find_time", checked)}
                  className="h-5 w-9 data-[state=checked]:bg-[#1a73e8]"
                />
              </div>
            </div>

            <div className="py-4 border-b border-[#dadce0] dark:border-[#5f6368]">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <h3 className="text-sm font-medium text-[#3c4043] dark:text-[#e8eaed]">Appointment Pages</h3>
                  <p className="text-xs text-[#5f6368] dark:text-[#9aa0a6] mt-1">
                    إنشاء صفحات حجز عامة
                  </p>
                </div>
                <Switch
                  checked={flags.ff_calendar_appointments || false}
                  onCheckedChange={(checked) => handleToggle("ff_calendar_appointments", checked)}
                  className="h-5 w-9 data-[state=checked]:bg-[#1a73e8]"
                />
              </div>
            </div>

            <div className="py-4 border-b border-[#dadce0] dark:border-[#5f6368]">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <h3 className="text-sm font-medium text-[#3c4043] dark:text-[#e8eaed]">ICS Import/Export</h3>
                  <p className="text-xs text-[#5f6368] dark:text-[#9aa0a6] mt-1">
                    استيراد وتصدير ملفات ICS
                  </p>
                </div>
                <Switch
                  checked={flags.ff_calendar_ics || false}
                  onCheckedChange={(checked) => handleToggle("ff_calendar_ics", checked)}
                  className="h-5 w-9 data-[state=checked]:bg-[#1a73e8]"
                />
              </div>
            </div>

            <div className="py-4">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <h3 className="text-sm font-medium text-[#3c4043] dark:text-[#e8eaed]">Tasks Integration</h3>
                  <p className="text-xs text-[#5f6368] dark:text-[#9aa0a6] mt-1">
                    ربط المهام مع التقويم
                  </p>
                </div>
                <Switch
                  checked={flags.ff_calendar_tasks || false}
                  onCheckedChange={(checked) => handleToggle("ff_calendar_tasks", checked)}
                  className="h-5 w-9 data-[state=checked]:bg-[#1a73e8]"
                />
              </div>
            </div>
          </div>
        )}

        {activeSection === "appointment-pages" && <AppointmentPagesManager />}
        {activeSection === "ics" && <ICSManager />}
      </div>
    </div>
  );
}

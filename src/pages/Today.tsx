import { DailyReportCard } from "@/components/DailyReportCard";
import { Button } from "@/components/ui/button";
import { scheduleLocal } from "@/native/notifications";
import { toast } from "sonner";

const Today = () => {
  const handleTestNotification = async () => {
    const result = await scheduleLocal(
      "تذكير تجريبي",
      "هذا تذكير تجريبي من تطبيق Oryxa"
    );
    if (result.web) {
      toast.success("تذكير تجريبي (ويب)", {
        description: "في النسخة Native سيظهر كإشعار حقيقي"
      });
    } else {
      toast.success("تم جدولة التذكير");
    }
  };

  return (
    <div className="container mx-auto p-4 md:p-6 max-w-4xl">
      <h1 className="text-3xl font-bold mb-6">اليوم</h1>
      
      <div className="grid gap-6">
        {/* التقرير اليومي */}
        <DailyReportCard />
        
        {/* إجراءات سريعة */}
        <div className="bg-card p-6 rounded-lg border">
          <h2 className="text-xl font-semibold mb-4">إجراءات سريعة</h2>
          <div className="space-y-3">
            <Button 
              onClick={handleTestNotification}
              variant="outline"
              className="w-full"
            >
              اختبار التذكير الآن
            </Button>
            <p className="text-sm text-muted-foreground">
              المزيد من النماذج قريباً...
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Today;

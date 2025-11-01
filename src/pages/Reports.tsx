import { useState } from "react";
import { DailyReportCard } from "@/components/DailyReportCard";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const Reports = () => {
  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().split('T')[0]
  );

  return (
    <div className="container mx-auto p-4 md:p-6 max-w-4xl">
      <h1 className="text-3xl font-bold mb-6">التقارير</h1>
      
      <div className="grid gap-6">
        <div className="bg-card p-6 rounded-lg border">
          <Label htmlFor="report-date" className="mb-2 block">
            اختر التاريخ
          </Label>
          <Input
            id="report-date"
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="max-w-xs"
          />
        </div>

        <DailyReportCard date={selectedDate} />
      </div>
    </div>
  );
};

export default Reports;

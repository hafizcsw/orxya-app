import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Download, Upload, Loader2, Link as LinkIcon } from "lucide-react";

export function ICSManager() {
  const [exportLoading, setExportLoading] = useState(false);
  const [importLoading, setImportLoading] = useState(false);
  const [importUrlLoading, setImportUrlLoading] = useState(false);
  const [exportStart, setExportStart] = useState("");
  const [exportEnd, setExportEnd] = useState("");
  const [importData, setImportData] = useState("");
  const [importUrl, setImportUrl] = useState("");

  const handleExport = async () => {
    if (!exportStart || !exportEnd) {
      toast.error("الرجاء اختيار التاريخين");
      return;
    }

    setExportLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("ics-export", {
        body: {
          start: new Date(exportStart).toISOString(),
          end: new Date(exportEnd).toISOString(),
        },
      });

      if (error) throw error;

      const blob = new Blob([data], { type: "text/calendar" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `calendar-${exportStart}-to-${exportEnd}.ics`;
      a.click();
      URL.revokeObjectURL(url);

      toast.success("تم التصدير بنجاح");
    } catch (error: any) {
      console.error("Error exporting:", error);
      toast.error("فشل التصدير");
    } finally {
      setExportLoading(false);
    }
  };

  const handleImportFromUrl = async () => {
    if (!importUrl.trim()) {
      toast.error("الرجاء إدخال رابط");
      return;
    }

    setImportUrlLoading(true);
    try {
      const response = await fetch(importUrl);
      const icsContent = await response.text();
      setImportData(icsContent);
      toast.success("تم تحميل المحتوى من الرابط");
    } catch (error) {
      console.error("Error fetching URL:", error);
      toast.error("فشل تحميل المحتوى من الرابط");
    } finally {
      setImportUrlLoading(false);
    }
  };

  const handleImport = async () => {
    if (!importData.trim()) {
      toast.error("الرجاء لصق محتوى ICS");
      return;
    }

    setImportLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("ics-import", {
        body: { ics: importData },
      });

      if (error) throw error;

      toast.success(`تم استيراد ${data.inserted} حدث بنجاح`);
      setImportData("");
      setImportUrl("");
    } catch (error: any) {
      console.error("Error importing:", error);
      toast.error("فشل الاستيراد");
    } finally {
      setImportLoading(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      setImportData(content);
    };
    reader.readAsText(file);
  };

  return (
    <div className="space-y-8">
      {/* Export Section */}
      <div className="space-y-4">
        <h3 className="text-sm font-medium text-[#3c4043] dark:text-[#e8eaed]">تصدير التقويم</h3>
        <p className="text-xs text-[#5f6368] dark:text-[#9aa0a6]">
          تنزيل الأحداث كملف ICS لفترة زمنية محددة
        </p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
          <div className="space-y-2">
            <Label htmlFor="export-start" className="text-sm text-[#3c4043] dark:text-[#e8eaed]">تاريخ البداية</Label>
            <Input
              id="export-start"
              type="date"
              value={exportStart}
              onChange={(e) => setExportStart(e.target.value)}
              className="h-9 px-3 border-[#dadce0] dark:border-[#5f6368] text-sm"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="export-end" className="text-sm text-[#3c4043] dark:text-[#e8eaed]">تاريخ النهاية</Label>
            <Input
              id="export-end"
              type="date"
              value={exportEnd}
              onChange={(e) => setExportEnd(e.target.value)}
              className="h-9 px-3 border-[#dadce0] dark:border-[#5f6368] text-sm"
            />
          </div>
        </div>

        <Button
          onClick={handleExport}
          disabled={!exportStart || !exportEnd || exportLoading}
          className="mt-4 bg-[#1a73e8] hover:bg-[#1557b0] text-white h-9"
          size="sm"
        >
          {exportLoading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              جاري التصدير...
            </>
          ) : (
            <>
              <Download className="w-4 h-4 mr-2" />
              تصدير الأحداث
            </>
          )}
        </Button>
      </div>

      {/* Divider */}
      <div className="border-t border-[#dadce0] dark:border-[#5f6368]" />

      {/* Import Section */}
      <div className="space-y-4">
        <h3 className="text-sm font-medium text-[#3c4043] dark:text-[#e8eaed]">استيراد التقويم</h3>
        <p className="text-xs text-[#5f6368] dark:text-[#9aa0a6]">
          رفع ملف ICS أو لصق المحتوى لاستيراد الأحداث
        </p>

        <div className="space-y-4 pt-2">
          {/* URL Import */}
          <div className="space-y-2">
            <Label htmlFor="import-url" className="text-sm text-[#3c4043] dark:text-[#e8eaed]">استيراد من رابط</Label>
            <div className="flex gap-2">
              <Input
                id="import-url"
                type="url"
                placeholder="https://calendar.google.com/calendar/ical/..."
                value={importUrl}
                onChange={(e) => setImportUrl(e.target.value)}
                className="h-9 px-3 border-[#dadce0] dark:border-[#5f6368] text-sm"
              />
              <Button
                onClick={handleImportFromUrl}
                disabled={!importUrl || importUrlLoading}
                variant="outline"
                size="sm"
                className="h-9"
              >
                {importUrlLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <LinkIcon className="w-4 h-4" />
                )}
              </Button>
            </div>
          </div>

          <div className="text-center text-xs text-[#5f6368] dark:text-[#9aa0a6]">أو</div>

          {/* File Upload */}
          <div className="space-y-2">
            <Label htmlFor="ics-file" className="text-sm text-[#3c4043] dark:text-[#e8eaed]">رفع ملف ICS</Label>
            <Input
              id="ics-file"
              type="file"
              accept=".ics"
              onChange={handleFileUpload}
              className="h-9 cursor-pointer border-[#dadce0] dark:border-[#5f6368] text-sm"
            />
          </div>

          <div className="text-center text-xs text-[#5f6368] dark:text-[#9aa0a6]">أو</div>

          {/* Paste Content */}
          <div className="space-y-2">
            <Label htmlFor="ics-text" className="text-sm text-[#3c4043] dark:text-[#e8eaed]">لصق محتوى ICS</Label>
            <Textarea
              id="ics-text"
              placeholder="BEGIN:VCALENDAR&#10;VERSION:2.0&#10;..."
              value={importData}
              onChange={(e) => setImportData(e.target.value)}
              rows={6}
              className="font-mono text-xs border-[#dadce0] dark:border-[#5f6368]"
            />
          </div>

          <Button
            onClick={handleImport}
            disabled={!importData || importLoading}
            className="bg-[#1a73e8] hover:bg-[#1557b0] text-white h-9"
            size="sm"
          >
            {importLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                جاري الاستيراد...
              </>
            ) : (
              <>
                <Upload className="w-4 h-4 mr-2" />
                استيراد الأحداث
              </>
            )}
          </Button>

          <p className="text-xs text-[#5f6368] dark:text-[#9aa0a6] mt-2">
            سيتم إنشاء الأحداث المستوردة كمسودات في تقويمك
          </p>
        </div>
      </div>
    </div>
  );
}

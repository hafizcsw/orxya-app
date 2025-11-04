import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { toast } from "sonner";
import { CalendarIcon, Download, Upload, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

export function ICSManager() {
  const [exportLoading, setExportLoading] = useState(false);
  const [importLoading, setImportLoading] = useState(false);
  const [exportStart, setExportStart] = useState<Date>();
  const [exportEnd, setExportEnd] = useState<Date>();
  const [importData, setImportData] = useState("");

  const handleExport = async () => {
    if (!exportStart || !exportEnd) {
      toast.error("Please select both start and end dates");
      return;
    }

    setExportLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("ics-export", {
        body: {
          start: exportStart.toISOString(),
          end: exportEnd.toISOString(),
        },
      });

      if (error) throw error;

      const blob = new Blob([data], { type: "text/calendar" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `calendar-${format(exportStart, "yyyy-MM-dd")}-to-${format(exportEnd, "yyyy-MM-dd")}.ics`;
      a.click();
      URL.revokeObjectURL(url);

      toast.success("Calendar exported successfully");
    } catch (error: any) {
      console.error("Error exporting:", error);
      toast.error("Failed to export calendar");
    } finally {
      setExportLoading(false);
    }
  };

  const handleImport = async () => {
    if (!importData.trim()) {
      toast.error("Please paste ICS content");
      return;
    }

    setImportLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("ics-import", {
        body: { ics: importData },
      });

      if (error) throw error;

      toast.success(`Imported ${data.inserted} events successfully`);
      setImportData("");
    } catch (error: any) {
      console.error("Error importing:", error);
      toast.error("Failed to import calendar");
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
      <div>
        <h2 className="text-xl font-normal text-foreground mb-2">ICS Import/Export</h2>
        <p className="text-sm text-muted-foreground">
          Transfer calendar data using the standard ICS format
        </p>
      </div>

      {/* Export Section */}
      <div className="space-y-4">
        <h3 className="text-base font-medium text-foreground">Export Calendar</h3>
        <p className="text-sm text-muted-foreground">
          Download your events as an ICS file for a specific date range
        </p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
          <div className="space-y-2">
            <Label htmlFor="export-start" className="text-sm font-normal">Start Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  id="export-start"
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !exportStart && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {exportStart ? format(exportStart, "PPP") : "Pick a date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={exportStart}
                  onSelect={setExportStart}
                  initialFocus
                  className="pointer-events-auto"
                />
              </PopoverContent>
            </Popover>
          </div>

          <div className="space-y-2">
            <Label htmlFor="export-end" className="text-sm font-normal">End Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  id="export-end"
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !exportEnd && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {exportEnd ? format(exportEnd, "PPP") : "Pick a date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={exportEnd}
                  onSelect={setExportEnd}
                  initialFocus
                  className="pointer-events-auto"
                />
              </PopoverContent>
            </Popover>
          </div>
        </div>

        <Button
          onClick={handleExport}
          disabled={!exportStart || !exportEnd || exportLoading}
          className="mt-4"
          size="sm"
        >
          {exportLoading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Exporting...
            </>
          ) : (
            <>
              <Download className="w-4 h-4 mr-2" />
              Export Events
            </>
          )}
        </Button>
      </div>

      {/* Divider */}
      <div className="border-t border-border" />

      {/* Import Section */}
      <div className="space-y-4">
        <h3 className="text-base font-medium text-foreground">Import Calendar</h3>
        <p className="text-sm text-muted-foreground">
          Upload an ICS file or paste ICS content to import events
        </p>

        <div className="space-y-4 pt-2">
          <div className="space-y-2">
            <Label htmlFor="ics-file" className="text-sm font-normal">Upload ICS File</Label>
            <Input
              id="ics-file"
              type="file"
              accept=".ics"
              onChange={handleFileUpload}
              className="cursor-pointer"
            />
          </div>

          <div className="text-center text-sm text-muted-foreground">or</div>

          <div className="space-y-2">
            <Label htmlFor="ics-text" className="text-sm font-normal">Paste ICS Content</Label>
            <Textarea
              id="ics-text"
              placeholder="BEGIN:VCALENDAR&#10;VERSION:2.0&#10;..."
              value={importData}
              onChange={(e) => setImportData(e.target.value)}
              rows={6}
              className="font-mono text-xs"
            />
          </div>

          <Button
            onClick={handleImport}
            disabled={!importData || importLoading}
            size="sm"
          >
            {importLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Importing...
              </>
            ) : (
              <>
                <Upload className="w-4 h-4 mr-2" />
                Import Events
              </>
            )}
          </Button>

          <p className="text-xs text-muted-foreground mt-2">
            Imported events will be created as drafts in your calendar
          </p>
        </div>
      </div>
    </div>
  );
}

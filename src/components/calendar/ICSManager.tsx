import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Download, Upload } from 'lucide-react';

export function ICSManager() {
  const [loading, setLoading] = useState(false);
  const [exportStart, setExportStart] = useState(
    new Date(Date.now() - 7 * 24 * 3600e3).toISOString().slice(0, 10)
  );
  const [exportEnd, setExportEnd] = useState(
    new Date(Date.now() + 30 * 24 * 3600e3).toISOString().slice(0, 10)
  );
  const [importData, setImportData] = useState('');

  const handleExport = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('ics-export', {
        body: {
          start: new Date(exportStart).toISOString(),
          end: new Date(exportEnd).toISOString(),
        },
      });

      if (error) throw error;

      const blob = new Blob([data], { type: 'text/calendar' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `calendar-${exportStart}-to-${exportEnd}.ics`;
      a.click();
      URL.revokeObjectURL(url);

      toast.success('تم تصدير التقويم بنجاح');
    } catch (error: any) {
      console.error('Error exporting:', error);
      toast.error('فشل في تصدير التقويم');
    } finally {
      setLoading(false);
    }
  };

  const handleImport = async () => {
    if (!importData.trim()) {
      toast.error('يرجى لصق محتوى ملف ICS');
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('ics-import', {
        body: { ics: importData },
      });

      if (error) throw error;

      toast.success(`تم استيراد ${data.inserted} حدث بنجاح`);
      setImportData('');
    } catch (error: any) {
      console.error('Error importing:', error);
      toast.error('فشل في استيراد التقويم');
    } finally {
      setLoading(false);
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
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold mb-2">استيراد/تصدير ICS</h2>
        <p className="text-sm text-muted-foreground">
          تصدير أحداثك أو استيراد أحداث من تقاويم أخرى
        </p>
      </div>

      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">تصدير التقويم</h3>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>من تاريخ</Label>
              <Input
                type="date"
                value={exportStart}
                onChange={(e) => setExportStart(e.target.value)}
              />
            </div>
            <div>
              <Label>إلى تاريخ</Label>
              <Input
                type="date"
                value={exportEnd}
                onChange={(e) => setExportEnd(e.target.value)}
              />
            </div>
          </div>
          <Button onClick={handleExport} disabled={loading} className="w-full">
            <Download className="w-4 h-4 mr-2" />
            {loading ? 'جاري التصدير...' : 'تصدير ICS'}
          </Button>
        </div>
      </Card>

      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">استيراد التقويم</h3>
        <div className="space-y-4">
          <div>
            <Label>رفع ملف ICS</Label>
            <Input
              type="file"
              accept=".ics"
              onChange={handleFileUpload}
              className="cursor-pointer"
            />
          </div>
          <div>
            <Label>أو الصق محتوى ICS</Label>
            <Textarea
              value={importData}
              onChange={(e) => setImportData(e.target.value)}
              placeholder="BEGIN:VCALENDAR&#10;VERSION:2.0&#10;..."
              rows={8}
              className="font-mono text-xs"
            />
          </div>
          <Button
            onClick={handleImport}
            disabled={loading || !importData.trim()}
            className="w-full"
          >
            <Upload className="w-4 h-4 mr-2" />
            {loading ? 'جاري الاستيراد...' : 'استيراد الأحداث'}
          </Button>
          <p className="text-xs text-muted-foreground">
            ملاحظة: سيتم إنشاء الأحداث المستوردة كـ "مسودات" يمكنك مراجعتها قبل تفعيلها
          </p>
        </div>
      </Card>
    </div>
  );
}

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Plus, Edit, Copy, ExternalLink } from 'lucide-react';

type AppointmentPage = {
  id: string;
  slug: string;
  title: string;
  description?: string;
  durations: number[];
  window: { start: string; end: string };
  buffer: { before: number; after: number };
  max_per_day: number;
  tz: string;
  active: boolean;
};

export function AppointmentPagesManager() {
  const [pages, setPages] = useState<AppointmentPage[]>([]);
  const [loading, setLoading] = useState(false);
  const [showEditor, setShowEditor] = useState(false);
  const [editingPage, setEditingPage] = useState<Partial<AppointmentPage>>({
    slug: '',
    title: '',
    description: '',
    durations: [30, 60],
    window: { start: '09:00', end: '18:00' },
    buffer: { before: 10, after: 10 },
    max_per_day: 8,
    tz: 'Asia/Dubai',
    active: true,
  });

  useEffect(() => {
    loadPages();
  }, []);

  const loadPages = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .rpc('get_user_flags', { p_user_id: user.id })
        .then(() =>
          supabase
            .from('appointment_pages' as any)
            .select('*')
            .order('created_at', { ascending: false })
        );

      if (error) throw error;
      setPages((data as any) || []);
    } catch (error: any) {
      console.error('Error loading pages:', error);
      toast.error('فشل في تحميل صفحات الحجز');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!editingPage.slug || !editingPage.title) {
      toast.error('يرجى إدخال الاسم والعنوان');
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('appt-publish', {
        body: editingPage,
      });

      if (error) throw error;

      toast.success('تم حفظ صفحة الحجز بنجاح');
      setShowEditor(false);
      loadPages();
    } catch (error: any) {
      console.error('Error saving page:', error);
      toast.error('فشل في حفظ صفحة الحجز');
    } finally {
      setLoading(false);
    }
  };

  const copyBookingLink = (slug: string) => {
    const link = `${window.location.origin}/book/${slug}`;
    navigator.clipboard.writeText(link);
    toast.success('تم نسخ رابط الحجز');
  };

  const createNew = () => {
    setEditingPage({
      slug: '',
      title: '',
      description: '',
      durations: [30, 60],
      window: { start: '09:00', end: '18:00' },
      buffer: { before: 10, after: 10 },
      max_per_day: 8,
      tz: 'Asia/Dubai',
      active: true,
    });
    setShowEditor(true);
  };

  const editPage = (page: AppointmentPage) => {
    setEditingPage(page);
    setShowEditor(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold">صفحات الحجز</h2>
          <p className="text-sm text-muted-foreground">
            إنشاء روابط عامة للسماح للآخرين بحجز مواعيد معك
          </p>
        </div>
        <Button onClick={createNew}>
          <Plus className="w-4 h-4 mr-2" />
          صفحة جديدة
        </Button>
      </div>

      <div className="grid gap-4">
        {pages.map((page) => (
          <Card key={page.id} className="p-6">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <h3 className="text-lg font-semibold">{page.title}</h3>
                  {!page.active && (
                    <span className="px-2 py-1 text-xs bg-muted rounded">معطّل</span>
                  )}
                </div>
                {page.description && (
                  <p className="text-sm text-muted-foreground mb-4">{page.description}</p>
                )}
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">المدد المتاحة:</span>{' '}
                    {page.durations.join(', ')} دقيقة
                  </div>
                  <div>
                    <span className="text-muted-foreground">ساعات العمل:</span>{' '}
                    {page.window.start} - {page.window.end}
                  </div>
                  <div>
                    <span className="text-muted-foreground">الحد الأقصى يومياً:</span>{' '}
                    {page.max_per_day} موعد
                  </div>
                  <div>
                    <span className="text-muted-foreground">البفر:</span>{' '}
                    {page.buffer.before}د قبل، {page.buffer.after}د بعد
                  </div>
                </div>
                <div className="mt-4 flex items-center gap-2">
                  <code className="px-3 py-1 bg-muted rounded text-sm">
                    /book/{page.slug}
                  </code>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => copyBookingLink(page.slug)}
                  >
                    <Copy className="w-4 h-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => window.open(`/book/${page.slug}`, '_blank')}
                  >
                    <ExternalLink className="w-4 h-4" />
                  </Button>
                </div>
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => editPage(page)}>
                  <Edit className="w-4 h-4 mr-2" />
                  تعديل
                </Button>
              </div>
            </div>
          </Card>
        ))}

        {pages.length === 0 && !loading && (
          <Card className="p-12 text-center">
            <p className="text-muted-foreground">لا توجد صفحات حجز بعد</p>
            <Button onClick={createNew} className="mt-4">
              إنشاء أول صفحة
            </Button>
          </Card>
        )}
      </div>

      <Dialog open={showEditor} onOpenChange={setShowEditor}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingPage.id ? 'تعديل' : 'إنشاء'} صفحة حجز
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>الاسم المختصر (slug)</Label>
                <Input
                  value={editingPage.slug}
                  onChange={(e) =>
                    setEditingPage({ ...editingPage, slug: e.target.value })
                  }
                  placeholder="consultation"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  سيظهر في الرابط: /book/...
                </p>
              </div>
              <div>
                <Label>العنوان</Label>
                <Input
                  value={editingPage.title}
                  onChange={(e) =>
                    setEditingPage({ ...editingPage, title: e.target.value })
                  }
                  placeholder="استشارة"
                />
              </div>
            </div>

            <div>
              <Label>الوصف</Label>
              <Textarea
                value={editingPage.description || ''}
                onChange={(e) =>
                  setEditingPage({ ...editingPage, description: e.target.value })
                }
                placeholder="وصف قصير عن الموعد"
                rows={2}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>المدد المتاحة (بالدقائق، افصلها بفواصل)</Label>
                <Input
                  value={editingPage.durations?.join(',')}
                  onChange={(e) =>
                    setEditingPage({
                      ...editingPage,
                      durations: e.target.value.split(',').map((v) => parseInt(v.trim())),
                    })
                  }
                  placeholder="30,45,60"
                />
              </div>
              <div>
                <Label>الحد الأقصى يومياً</Label>
                <Input
                  type="number"
                  value={editingPage.max_per_day}
                  onChange={(e) =>
                    setEditingPage({
                      ...editingPage,
                      max_per_day: parseInt(e.target.value),
                    })
                  }
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>بداية ساعات العمل</Label>
                <Input
                  type="time"
                  value={editingPage.window?.start}
                  onChange={(e) =>
                    setEditingPage({
                      ...editingPage,
                      window: { ...editingPage.window!, start: e.target.value },
                    })
                  }
                />
              </div>
              <div>
                <Label>نهاية ساعات العمل</Label>
                <Input
                  type="time"
                  value={editingPage.window?.end}
                  onChange={(e) =>
                    setEditingPage({
                      ...editingPage,
                      window: { ...editingPage.window!, end: e.target.value },
                    })
                  }
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>البفر قبل (دقائق)</Label>
                <Input
                  type="number"
                  value={editingPage.buffer?.before}
                  onChange={(e) =>
                    setEditingPage({
                      ...editingPage,
                      buffer: {
                        ...editingPage.buffer!,
                        before: parseInt(e.target.value),
                      },
                    })
                  }
                />
              </div>
              <div>
                <Label>البفر بعد (دقائق)</Label>
                <Input
                  type="number"
                  value={editingPage.buffer?.after}
                  onChange={(e) =>
                    setEditingPage({
                      ...editingPage,
                      buffer: { ...editingPage.buffer!, after: parseInt(e.target.value) },
                    })
                  }
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Switch
                checked={editingPage.active}
                onCheckedChange={(checked) =>
                  setEditingPage({ ...editingPage, active: checked })
                }
              />
              <Label>نشط</Label>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button variant="outline" onClick={() => setShowEditor(false)}>
              إلغاء
            </Button>
            <Button onClick={handleSave} disabled={loading}>
              {loading ? 'جاري الحفظ...' : 'حفظ'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

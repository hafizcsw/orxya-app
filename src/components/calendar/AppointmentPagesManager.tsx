import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { toast } from "sonner";
import { Copy, Edit, Plus, Loader2 } from "lucide-react";

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
    slug: "",
    title: "",
    description: "",
    durations: [30, 60],
    window: { start: "09:00", end: "18:00" },
    buffer: { before: 10, after: 10 },
    max_per_day: 8,
    tz: "Asia/Dubai",
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
        .rpc("get_user_flags", { p_user_id: user.id })
        .then(() =>
          supabase
            .from("appointment_pages" as any)
            .select("*")
            .order("created_at", { ascending: false })
        );

      if (error) throw error;
      setPages((data as any) || []);
    } catch (error: any) {
      console.error("Error loading pages:", error);
      toast.error("Failed to load appointment pages");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!editingPage.slug || !editingPage.title) {
      toast.error("Please enter a slug and title");
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("appt-publish", {
        body: editingPage,
      });

      if (error) throw error;

      toast.success("Appointment page saved successfully");
      setShowEditor(false);
      loadPages();
    } catch (error: any) {
      console.error("Error saving page:", error);
      toast.error("Failed to save appointment page");
    } finally {
      setLoading(false);
    }
  };

  const copyBookingLink = (slug: string) => {
    const link = `${window.location.origin}/book/${slug}`;
    navigator.clipboard.writeText(link);
    toast.success("Booking link copied");
  };

  const createNew = () => {
    setEditingPage({
      slug: "",
      title: "",
      description: "",
      durations: [30, 60],
      window: { start: "09:00", end: "18:00" },
      buffer: { before: 10, after: 10 },
      max_per_day: 8,
      tz: "Asia/Dubai",
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
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-xs text-[#5f6368] dark:text-[#9aa0a6]">
            Create shareable booking pages
          </p>
        </div>
        <Button 
          onClick={createNew} 
          size="sm"
          className="h-9 bg-[#1a73e8] hover:bg-[#1557b0] text-white"
        >
          <Plus className="w-4 h-4 mr-2" />
          إنشاء صفحة
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center p-12">
          <Loader2 className="w-6 h-6 animate-spin text-[#5f6368] dark:text-[#9aa0a6]" />
        </div>
      ) : pages.length === 0 ? (
        <div className="text-center py-12 border border-[#dadce0] dark:border-[#5f6368] rounded">
          <p className="text-sm text-[#5f6368] dark:text-[#9aa0a6] mb-4">لا توجد صفحات مواعيد</p>
          <Button 
            onClick={createNew} 
            size="sm"
            className="h-9 bg-[#1a73e8] hover:bg-[#1557b0] text-white"
          >
            <Plus className="w-4 h-4 mr-2" />
            إنشاء أول صفحة
          </Button>
        </div>
      ) : (
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b border-[#dadce0] dark:border-[#5f6368]">
              <th className="text-right text-xs text-[#5f6368] dark:text-[#9aa0a6] font-medium py-3 px-4">
                العنوان
              </th>
              <th className="text-right text-xs text-[#5f6368] dark:text-[#9aa0a6] font-medium py-3 px-4">
                المدة
              </th>
              <th className="text-right text-xs text-[#5f6368] dark:text-[#9aa0a6] font-medium py-3 px-4">
                الحالة
              </th>
              <th className="text-left text-xs text-[#5f6368] dark:text-[#9aa0a6] font-medium py-3 px-4">
                الإجراءات
              </th>
            </tr>
          </thead>
          <tbody>
            {pages.map((page) => (
              <tr 
                key={page.id} 
                className="border-b border-[#dadce0] dark:border-[#5f6368] hover:bg-[#f1f3f4] dark:hover:bg-[#3c4043] transition-colors"
              >
                <td className="py-3 px-4">
                  <div className="text-sm text-[#3c4043] dark:text-[#e8eaed] font-medium">
                    {page.title}
                  </div>
                  {page.description && (
                    <div className="text-xs text-[#5f6368] dark:text-[#9aa0a6] mt-0.5">
                      {page.description}
                    </div>
                  )}
                </td>
                <td className="py-3 px-4">
                  <div className="text-xs text-[#5f6368] dark:text-[#9aa0a6]">
                    {page.durations?.join(", ")} دقيقة
                  </div>
                </td>
                <td className="py-3 px-4">
                  <span className={`text-xs ${page.active ? "text-[#1e8e3e]" : "text-[#5f6368]"}`}>
                    {page.active ? "نشط" : "غير نشط"}
                  </span>
                </td>
                <td className="py-3 px-4">
                  <div className="flex items-center gap-1">
                    <Button
                      onClick={() => copyBookingLink(page.slug)}
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0 hover:bg-[#f1f3f4] dark:hover:bg-[#3c4043]"
                    >
                      <Copy className="w-4 h-4" />
                    </Button>
                    <Button
                      onClick={() => editPage(page)}
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0 hover:bg-[#f1f3f4] dark:hover:bg-[#3c4043]"
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <Sheet open={showEditor} onOpenChange={setShowEditor}>
        <SheetContent side="right" className="w-[600px] overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="text-[22px] font-normal text-[#3c4043] dark:text-[#e8eaed]">
              {editingPage.id ? "تعديل" : "إنشاء"} صفحة مواعيد
            </SheetTitle>
          </SheetHeader>

          <div className="space-y-4 mt-6">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-sm text-[#3c4043] dark:text-[#e8eaed]">الاسم المختصر</Label>
                <Input
                  value={editingPage.slug}
                  onChange={(e) =>
                    setEditingPage({ ...editingPage, slug: e.target.value })
                  }
                  placeholder="consultation"
                  className="h-9 mt-1"
                />
                <p className="text-xs text-[#5f6368] dark:text-[#9aa0a6] mt-1">
                  سيظهر في الرابط: /book/...
                </p>
              </div>
              <div>
                <Label className="text-sm text-[#3c4043] dark:text-[#e8eaed]">العنوان</Label>
                <Input
                  value={editingPage.title}
                  onChange={(e) =>
                    setEditingPage({ ...editingPage, title: e.target.value })
                  }
                  placeholder="استشارة"
                  className="h-9 mt-1"
                />
              </div>
            </div>

            <div>
              <Label className="text-sm text-[#3c4043] dark:text-[#e8eaed]">الوصف</Label>
              <Textarea
                value={editingPage.description || ""}
                onChange={(e) =>
                  setEditingPage({ ...editingPage, description: e.target.value })
                }
                placeholder="وصف مختصر"
                rows={2}
                className="mt-1"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-sm text-[#3c4043] dark:text-[#e8eaed]">المدة المتاحة (دقائق)</Label>
                <Input
                  value={editingPage.durations?.join(",")}
                  onChange={(e) =>
                    setEditingPage({
                      ...editingPage,
                      durations: e.target.value.split(",").map((v) => parseInt(v.trim())),
                    })
                  }
                  placeholder="30,45,60"
                  className="h-9 mt-1"
                />
              </div>
              <div>
                <Label className="text-sm text-[#3c4043] dark:text-[#e8eaed]">الحد الأقصى باليوم</Label>
                <Input
                  type="number"
                  value={editingPage.max_per_day}
                  onChange={(e) =>
                    setEditingPage({
                      ...editingPage,
                      max_per_day: parseInt(e.target.value),
                    })
                  }
                  className="h-9 mt-1"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-sm font-normal">Work hours start</Label>
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
                <Label className="text-sm font-normal">Work hours end</Label>
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
                <Label className="text-sm font-normal">Buffer before (minutes)</Label>
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
                <Label className="text-sm font-normal">Buffer after (minutes)</Label>
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

            <div className="flex items-center gap-2 pt-4 border-t border-[#dadce0] dark:border-[#5f6368]">
              <Switch
                checked={editingPage.active}
                onCheckedChange={(checked) =>
                  setEditingPage({ ...editingPage, active: checked })
                }
                className="h-5 w-9 data-[state=checked]:bg-[#1a73e8]"
              />
              <Label className="text-sm text-[#3c4043] dark:text-[#e8eaed]">نشط</Label>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-[#dadce0] dark:border-[#5f6368] mt-6">
            <Button 
              variant="ghost" 
              onClick={() => setShowEditor(false)} 
              size="sm"
              className="h-9 hover:bg-[#f1f3f4] dark:hover:bg-[#3c4043]"
            >
              إلغاء
            </Button>
            <Button 
              onClick={handleSave} 
              disabled={loading} 
              size="sm"
              className="h-9 bg-[#1a73e8] hover:bg-[#1557b0] text-white"
            >
              {loading ? "جارٍ الحفظ..." : "حفظ"}
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}

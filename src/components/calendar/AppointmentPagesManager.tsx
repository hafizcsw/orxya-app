import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
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
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-normal text-foreground">Appointment Pages</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Create shareable booking pages with custom availability
          </p>
        </div>
        <Button onClick={createNew} variant="outline" size="sm">
          <Plus className="w-4 h-4 mr-2" />
          New Page
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center p-12">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : pages.length === 0 ? (
        <div className="text-center py-12 border border-border rounded-lg">
          <p className="text-sm text-muted-foreground mb-4">No appointment pages created yet</p>
          <Button onClick={createNew} variant="default" size="sm">
            <Plus className="w-4 h-4 mr-2" />
            Create Your First Page
          </Button>
        </div>
      ) : (
        <div className="border border-border rounded-lg divide-y divide-border">
          {pages.map((page) => (
            <div key={page.id} className="p-4 hover:bg-muted/30 transition-colors">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h3 className="text-base font-medium text-foreground">{page.title}</h3>
                  {page.description && (
                    <p className="text-sm text-muted-foreground mt-1">{page.description}</p>
                  )}
                  <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                    <span>Durations: {page.durations?.join(", ")} min</span>
                    <span>•</span>
                    <span>
                      {page.window?.start} - {page.window?.end}
                    </span>
                    <span>•</span>
                    <span className={page.active ? "text-success" : "text-muted-foreground"}>
                      {page.active ? "Active" : "Inactive"}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2 ml-4">
                  <Button
                    onClick={() => copyBookingLink(page.slug)}
                    variant="ghost"
                    size="sm"
                  >
                    <Copy className="w-4 h-4" />
                  </Button>
                  <Button
                    onClick={() => editPage(page)}
                    variant="ghost"
                    size="sm"
                  >
                    <Edit className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={showEditor} onOpenChange={setShowEditor}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingPage.id ? "Edit" : "Create"} Appointment Page
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-sm font-normal">Slug</Label>
                <Input
                  value={editingPage.slug}
                  onChange={(e) =>
                    setEditingPage({ ...editingPage, slug: e.target.value })
                  }
                  placeholder="consultation"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Will appear in link: /book/...
                </p>
              </div>
              <div>
                <Label className="text-sm font-normal">Title</Label>
                <Input
                  value={editingPage.title}
                  onChange={(e) =>
                    setEditingPage({ ...editingPage, title: e.target.value })
                  }
                  placeholder="Consultation"
                />
              </div>
            </div>

            <div>
              <Label className="text-sm font-normal">Description</Label>
              <Textarea
                value={editingPage.description || ""}
                onChange={(e) =>
                  setEditingPage({ ...editingPage, description: e.target.value })
                }
                placeholder="Brief description"
                rows={2}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-sm font-normal">Available durations (minutes, comma-separated)</Label>
                <Input
                  value={editingPage.durations?.join(",")}
                  onChange={(e) =>
                    setEditingPage({
                      ...editingPage,
                      durations: e.target.value.split(",").map((v) => parseInt(v.trim())),
                    })
                  }
                  placeholder="30,45,60"
                />
              </div>
              <div>
                <Label className="text-sm font-normal">Max per day</Label>
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

            <div className="flex items-center gap-2">
              <Switch
                checked={editingPage.active}
                onCheckedChange={(checked) =>
                  setEditingPage({ ...editingPage, active: checked })
                }
              />
              <Label className="text-sm font-normal">Active</Label>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button variant="outline" onClick={() => setShowEditor(false)} size="sm">
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={loading} size="sm">
              {loading ? "Saving..." : "Save"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

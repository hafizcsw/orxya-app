import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { track } from "@/lib/telemetry";
import { requestAISuggestion, type AISuggestion } from "@/lib/aiConflicts";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { ActionButton } from "@/components/ui/ActionButton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Loader2, Trash2, Save, Sparkles, AlertTriangle, CheckCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import EventColorPicker from "./EventColorPicker";
import { type CalendarColor } from "@/lib/calendar-colors";

type Event = {
  id: string;
  title: string;
  starts_at: string;
  ends_at: string;
  location?: string | null;
  notes?: string | null;
  tags?: string[] | null;
  color?: string | null;
};

type Props = {
  event: Event | null;
  open: boolean;
  onClose: () => void;
  onUpdate: () => void;
  hasConflict?: boolean;
  conflictId?: string | null;
};

export default function EventDetailsDrawer({
  event,
  open,
  onClose,
  onUpdate,
  hasConflict = false,
  conflictId = null
}: Props) {
  const [title, setTitle] = useState("");
  const [location, setLocation] = useState("");
  const [notes, setNotes] = useState("");
  const [tags, setTags] = useState("");
  const [startsAt, setStartsAt] = useState("");
  const [endsAt, setEndsAt] = useState("");
  const [color, setColor] = useState<CalendarColor>("peacock");
  const [aiSuggestion, setAiSuggestion] = useState<AISuggestion | null>(null);
  const [loadingAI, setLoadingAI] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (event) {
      setTitle(event.title || "");
      setLocation(event.location || "");
      setNotes(event.notes || "");
      setTags((event.tags || []).join(", "));
      setStartsAt(formatForInput(event.starts_at));
      setEndsAt(formatForInput(event.ends_at));
      setColor((event.color as CalendarColor) || "peacock");
      setAiSuggestion(null);
    }
  }, [event]);

  const formatForInput = (isoString: string) => {
    return new Date(isoString).toISOString().slice(0, 16);
  };

  const handleSave = async () => {
    if (!event) return;

    try {
      const tagsArray = tags
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean);

      const { error } = await supabase
        .from("events")
        .update({
          title,
          location,
          notes,
          tags: tagsArray,
          color,
          starts_at: new Date(startsAt).toISOString(),
          ends_at: new Date(endsAt).toISOString(),
        })
        .eq("id", event.id);

      if (error) throw error;

      track("cal_event_save", { event_id: event.id });

      // Re-check conflicts
      await supabase.functions
        .invoke("conflict-check", { body: { event_id: event.id } })
        .catch(() => {});

      toast({ title: "تم الحفظ بنجاح ✅" });
      onUpdate();
      onClose();
    } catch (e) {
      console.error("Failed to save event:", e);
      toast({ 
        title: "فشل الحفظ", 
        description: "حدث خطأ أثناء حفظ التعديلات",
        variant: "destructive" 
      });
    }
  };

  const handleDelete = async () => {
    if (!event) return;

    try {
      const { error } = await supabase
        .from("events")
        .delete()
        .eq("id", event.id);

      if (error) throw error;

      track("cal_event_delete", { event_id: event.id });
      toast({ title: "تم حذف الحدث ✅" });
      onUpdate();
      onClose();
      setShowDeleteDialog(false);
    } catch (e) {
      console.error("Failed to delete event:", e);
      toast({ 
        title: "فشل الحذف", 
        description: "حدث خطأ أثناء حذف الحدث",
        variant: "destructive" 
      });
    }
  };

  const handleRequestAI = async () => {
    if (!conflictId) return;
    setLoadingAI(true);

    try {
      const suggestion = await requestAISuggestion(conflictId);
      if (suggestion) {
        setAiSuggestion(suggestion);
        track("cal_ai_suggest_from_drawer", {
          conflict_id: conflictId,
          action: suggestion.action,
        });
      }
    } catch (e) {
      console.error("AI suggestion failed:", e);
    } finally {
      setLoadingAI(false);
    }
  };

  const handleApplySuggestion = async () => {
    if (!event || !aiSuggestion) return;

    try {
      const updates: any = {};
      if (aiSuggestion.new_start) updates.starts_at = aiSuggestion.new_start;
      if (aiSuggestion.new_end) updates.ends_at = aiSuggestion.new_end;

      if (Object.keys(updates).length > 0) {
        const { error } = await supabase
          .from("events")
          .update(updates)
          .eq("id", event.id);

        if (error) throw error;

        track("cal_ai_apply_suggestion", {
          event_id: event.id,
          action: aiSuggestion.action,
        });

        // Update conflict status
        if (conflictId) {
          await supabase.functions.invoke("conflicts", {
            body: { command: "apply", ids: [conflictId] },
          });
        }

        toast({ title: "تم تطبيق الاقتراح بنجاح ✨" });
        onUpdate();
        onClose();
      }
    } catch (e) {
      console.error("Failed to apply AI suggestion:", e);
      toast({ 
        title: "فشل التطبيق", 
        description: "حدث خطأ أثناء تطبيق الاقتراح",
        variant: "destructive" 
      });
    }
  };

  if (!event) return null;

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent className="w-[500px] sm:max-w-[500px] overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            تفاصيل الحدث
            {hasConflict && (
              <Badge variant="destructive" className="text-xs">
                <AlertTriangle className="w-3 h-3 mr-1" />
                تعارض
              </Badge>
            )}
          </SheetTitle>
          <SheetDescription>
            قم بتعديل تفاصيل الحدث أو احذفه
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-6 mt-6">
          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title">العنوان</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="عنوان الحدث"
              className="text-base"
            />
          </div>

          {/* Time */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="starts">البداية</Label>
              <Input
                id="starts"
                type="datetime-local"
                value={startsAt}
                onChange={(e) => setStartsAt(e.target.value)}
                className="text-sm"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ends">النهاية</Label>
              <Input
                id="ends"
                type="datetime-local"
                value={endsAt}
                onChange={(e) => setEndsAt(e.target.value)}
                className="text-sm"
              />
            </div>
          </div>

          {/* Location */}
          <div className="space-y-2">
            <Label htmlFor="location">الموقع</Label>
            <Input
              id="location"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="أضف موقعًا"
            />
          </div>

          {/* Tags */}
          <div className="space-y-2">
            <Label htmlFor="tags">الوسوم</Label>
            <Input
              id="tags"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="عمل, شخصي, مهم (افصل بفاصلة)"
            />
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">ملاحظات</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="أضف ملاحظات..."
              rows={4}
            />
          </div>

          {/* Color Picker */}
          <div className="space-y-2">
            <Label>لون الحدث</Label>
            <EventColorPicker value={color} onChange={setColor} />
          </div>

          {/* AI Suggestion Section */}
          {hasConflict && conflictId && (
            <div className="space-y-3 p-4 rounded-lg border border-warning bg-warning text-warning-foreground">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-warning" />
                  <span className="font-medium text-sm">تعارض مع وقت الصلاة</span>
                </div>
                <ActionButton
                  size="sm"
                  variant="outline"
                  onClick={handleRequestAI}
                  disabled={!!aiSuggestion}
                  loadingText="جار التحليل..."
                  icon={<Sparkles className="w-4 h-4" />}
                >
                  اقتراح حل (AI)
                </ActionButton>
              </div>

              {aiSuggestion && (
                <div className="space-y-3 mt-3">
                  <div className="p-3 rounded-lg bg-card text-card-foreground border">
                    <div className="flex items-center gap-2 mb-2">
                      <CheckCircle className="w-4 h-4 text-success" />
                      <span className="font-medium text-sm">
                        {aiSuggestion.action === "move_event"
                          ? "تحريك الحدث"
                          : aiSuggestion.action === "shorten_event"
                          ? "تقصير الحدث"
                          : "إلغاء الحدث"}
                      </span>
                      {aiSuggestion.confidence && (
                        <Badge variant="secondary" className="text-xs">
                          ثقة: {Math.round(aiSuggestion.confidence * 100)}%
                        </Badge>
                      )}
                    </div>

                    {aiSuggestion.new_start && aiSuggestion.new_end && (
                      <div className="text-sm text-muted-foreground mb-2">
                        <span className="font-medium">الوقت المقترح:</span>{" "}
                        {new Date(aiSuggestion.new_start).toLocaleString("ar", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}{" "}
                        -{" "}
                        {new Date(aiSuggestion.new_end).toLocaleString("ar", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </div>
                    )}

                    {aiSuggestion.reasoning && (
                      <p className="text-xs text-muted-foreground">
                        💡 {aiSuggestion.reasoning}
                      </p>
                    )}
                  </div>

                  <ActionButton
                    onClick={handleApplySuggestion}
                    loadingText="جار التطبيق..."
                    icon={<CheckCircle className="w-4 h-4" />}
                    className="w-full"
                  >
                    تطبيق الاقتراح
                  </ActionButton>
                </div>
              )}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2 pt-4 border-t">
            <ActionButton
              onClick={handleSave}
              loadingText="جار الحفظ..."
              icon={<Save className="w-4 h-4" />}
              className="flex-1"
            >
              حفظ
            </ActionButton>
            <ActionButton
              onClick={() => setShowDeleteDialog(true)}
              variant="destructive"
              icon={<Trash2 className="w-4 h-4" />}
            >
              حذف
            </ActionButton>
          </div>
        </div>
      </SheetContent>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>هل أنت متأكد؟</AlertDialogTitle>
            <AlertDialogDescription>
              سيتم حذف الحدث "{event?.title}" بشكل نهائي. لا يمكن التراجع عن هذا الإجراء.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              حذف نهائياً
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Sheet>
  );
}

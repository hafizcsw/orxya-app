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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Loader2, Trash2, Save, Sparkles, AlertTriangle, CheckCircle } from "lucide-react";
import { cn } from "@/lib/utils";

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
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [aiSuggestion, setAiSuggestion] = useState<AISuggestion | null>(null);
  const [loadingAI, setLoadingAI] = useState(false);
  const [applyingAI, setApplyingAI] = useState(false);

  useEffect(() => {
    if (event) {
      setTitle(event.title || "");
      setLocation(event.location || "");
      setNotes(event.notes || "");
      setTags((event.tags || []).join(", "));
      setStartsAt(formatForInput(event.starts_at));
      setEndsAt(formatForInput(event.ends_at));
      setAiSuggestion(null);
    }
  }, [event]);

  const formatForInput = (isoString: string) => {
    return new Date(isoString).toISOString().slice(0, 16);
  };

  const handleSave = async () => {
    if (!event) return;
    setSaving(true);

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

      onUpdate();
      onClose();
    } catch (e) {
      console.error("Failed to save event:", e);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!event || !confirm("هل تريد حذف هذا الحدث؟")) return;
    setDeleting(true);

    try {
      const { error } = await supabase
        .from("events")
        .delete()
        .eq("id", event.id);

      if (error) throw error;

      track("cal_event_delete", { event_id: event.id });
      onUpdate();
      onClose();
    } catch (e) {
      console.error("Failed to delete event:", e);
    } finally {
      setDeleting(false);
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
    setApplyingAI(true);

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

        onUpdate();
        onClose();
      }
    } catch (e) {
      console.error("Failed to apply AI suggestion:", e);
    } finally {
      setApplyingAI(false);
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

          {/* AI Suggestion Section */}
          {hasConflict && conflictId && (
            <div className="space-y-3 p-4 rounded-lg border border-warning/30 bg-warning/5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-warning" />
                  <span className="font-medium text-sm">تعارض مع وقت الصلاة</span>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleRequestAI}
                  disabled={loadingAI || !!aiSuggestion}
                  className="gap-2"
                >
                  {loadingAI ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Sparkles className="w-4 h-4" />
                  )}
                  اقتراح حل (AI)
                </Button>
              </div>

              {aiSuggestion && (
                <div className="space-y-3 mt-3">
                  <div className="p-3 rounded-lg bg-background border">
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

                  <Button
                    onClick={handleApplySuggestion}
                    disabled={applyingAI}
                    className="w-full gap-2"
                  >
                    {applyingAI ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <CheckCircle className="w-4 h-4" />
                    )}
                    تطبيق الاقتراح
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2 pt-4 border-t">
            <Button
              onClick={handleSave}
              disabled={saving}
              className="flex-1 gap-2"
            >
              {saving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              حفظ
            </Button>
            <Button
              onClick={handleDelete}
              disabled={deleting}
              variant="destructive"
              className="gap-2"
            >
              {deleting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Trash2 className="w-4 h-4" />
              )}
              حذف
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

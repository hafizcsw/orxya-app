import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { track } from "@/lib/telemetry";
import { requestAISuggestion, type AISuggestion } from "@/lib/aiConflicts";
import { Button } from "@/components/ui/button";
import { ActionButton } from "@/components/ui/ActionButton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { 
  Loader2, 
  Trash2, 
  Save, 
  Sparkles, 
  AlertTriangle, 
  CheckCircle,
  Clock,
  MapPin,
  Tag,
  FileText,
  Palette,
  Copy,
  Share2,
  Calendar as CalendarIcon,
  X,
  Check
} from "lucide-react";
import { cn } from "@/lib/utils";
import EventColorPicker from "./EventColorPicker";
import { type CalendarColor } from "@/lib/calendar-colors";
import { GOOGLE_CALENDAR_COLORS } from "@/lib/calendar-colors";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { format } from "date-fns";
import { ar } from "date-fns/locale";

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
  const [applyingAI, setApplyingAI] = useState(false);
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
    } finally {
      setApplyingAI(false);
    }
  };

  const handleCopy = () => {
    if (!event) return;
    const startDate = new Date(event.starts_at);
    const eventText = `${title}\n${format(startDate, "PPp", { locale: ar })}\n${location || ""}`;
    navigator.clipboard.writeText(eventText);
    toast({ title: "تم النسخ بنجاح" });
  };

  if (!event || !open) return null;

  const colorHex = GOOGLE_CALENDAR_COLORS[color]?.hex || "#3B82F6";
  const startDate = new Date(event.starts_at);
  const endDate = new Date(event.ends_at);

  return (
    <Sheet open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <SheetContent 
        side="bottom" 
        className={cn(
          "h-[85vh] rounded-t-3xl border-t-2 p-0 bg-muted flex flex-col",
          "md:h-full md:w-[480px] md:rounded-none md:border-l-2 md:border-t-0 md:side-right"
        )}
      >
        {/* Quick Actions Bar */}
        <div className="flex items-center justify-between px-6 py-3 border-b bg-muted shrink-0">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleDelete}
              className="text-destructive hover:text-destructive hover:bg-destructive/10"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleCopy}
            >
              <Copy className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => toast({ title: "قريباً: مشاركة الحدث" })}
            >
              <Share2 className="w-4 h-4" />
            </Button>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="rounded-full"
          >
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Header */}
        <SheetHeader className="px-6 py-4 space-y-3 border-b shrink-0">
          <div className="flex items-start gap-3">
            <div 
              className="w-1 h-16 rounded-full flex-shrink-0" 
              style={{ backgroundColor: colorHex }}
            />
            <div className="flex-1 min-w-0">
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="text-2xl font-bold border-none px-0 h-auto focus-visible:ring-0 bg-transparent"
                placeholder="عنوان الحدث"
              />
              <div className="mt-2 space-y-1">
                <p className="text-base text-muted-foreground flex items-center gap-2">
                  <CalendarIcon className="w-4 h-4" />
                  {format(startDate, "EEEE، d MMMM yyyy", { locale: ar })}
                </p>
                <p className="text-base text-muted-foreground flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  {format(startDate, "h:mm a", { locale: ar })} - {format(endDate, "h:mm a", { locale: ar })}
                </p>
              </div>
            </div>
          </div>
        </SheetHeader>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
          {/* Time Section */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Clock className="w-4 h-4 text-primary" />
              <span>الوقت</span>
            </div>
            <div className="pr-6 space-y-3">
              <div>
                <Label htmlFor="event-start" className="text-xs text-muted-foreground">البداية</Label>
                <Input
                  id="event-start"
                  type="datetime-local"
                  value={startsAt}
                  onChange={(e) => setStartsAt(e.target.value)}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="event-end" className="text-xs text-muted-foreground">النهاية</Label>
                <Input
                  id="event-end"
                  type="datetime-local"
                  value={endsAt}
                  onChange={(e) => setEndsAt(e.target.value)}
                  className="mt-1"
                />
              </div>
            </div>
          </div>

          {/* Location Section */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm font-medium">
              <MapPin className="w-4 h-4 text-primary" />
              <span>الموقع</span>
            </div>
            <div className="pr-6">
              <Input
                id="event-location"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="أضف موقع"
              />
            </div>
          </div>

          {/* Tags Section */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Tag className="w-4 h-4 text-primary" />
              <span>الوسوم</span>
            </div>
            <div className="pr-6">
              <Input
                id="event-tags"
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                placeholder="وسم1, وسم2"
              />
            </div>
          </div>

          {/* Notes Section */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm font-medium">
              <FileText className="w-4 h-4 text-primary" />
              <span>الملاحظات</span>
            </div>
            <div className="pr-6">
              <Textarea
                id="event-notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="أضف ملاحظات"
                className="min-h-[100px]"
              />
            </div>
          </div>

          {/* Color Section */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Palette className="w-4 h-4 text-primary" />
              <span>اللون</span>
            </div>
            <div className="pr-6">
              <EventColorPicker value={color} onChange={setColor} />
            </div>
          </div>

          {/* AI Conflict Resolution */}
          {hasConflict && conflictId && (
            <Card className="p-5 bg-gradient-to-br from-yellow-50/50 to-orange-50/50 dark:from-yellow-950/20 dark:to-orange-950/20 border-2 border-yellow-200/50 dark:border-yellow-800/50">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 rounded-full bg-yellow-500/10">
                  <Sparkles className="w-6 h-6 text-yellow-600 dark:text-yellow-400" />
                </div>
                <span className="text-lg font-semibold">اقتراحات الذكاء الاصطناعي</span>
              </div>

              {!aiSuggestion && (
                <Button
                  onClick={handleRequestAI}
                  disabled={loadingAI}
                  variant="outline"
                  className="w-full bg-background/80 hover:bg-background"
                >
                  {loadingAI ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      جارٍ التحليل...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 mr-2" />
                      اطلب اقتراح من الذكاء الاصطناعي
                    </>
                  )}
                </Button>
              )}

              {aiSuggestion && (
                <div className="space-y-4">
                  <div className="bg-background/60 backdrop-blur-sm p-4 rounded-lg border">
                    <p className="font-medium mb-2 text-sm">💡 السبب:</p>
                    <p className="text-sm text-muted-foreground leading-relaxed">{aiSuggestion.reasoning}</p>
                  </div>

                  {aiSuggestion.new_start && aiSuggestion.new_end && (
                    <div className="bg-primary/5 p-4 rounded-lg border border-primary/20">
                      <p className="font-medium mb-3 text-sm">⏰ الوقت المقترح:</p>
                      <div className="space-y-2 text-sm">
                        <div className="flex items-center gap-2">
                          <span className="text-muted-foreground">البداية:</span>
                          <span className="font-medium">
                            {format(new Date(aiSuggestion.new_start), "PPp", { locale: ar })}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-muted-foreground">النهاية:</span>
                          <span className="font-medium">
                            {format(new Date(aiSuggestion.new_end), "PPp", { locale: ar })}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}

                  <Button
                    onClick={handleApplySuggestion}
                    disabled={applyingAI}
                    className="w-full bg-primary hover:bg-primary/90 shadow-lg"
                    size="lg"
                  >
                    {applyingAI ? (
                      <>
                        <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                        جارٍ التطبيق...
                      </>
                    ) : (
                      <>
                        <Check className="w-5 h-5 mr-2" />
                        تطبيق الاقتراح
                      </>
                    )}
                  </Button>
                </div>
              )}
            </Card>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t bg-muted shrink-0">
          <Button 
            onClick={handleSave} 
            className="w-full shadow-lg" 
            size="lg"
          >
            ✓ حفظ التغييرات
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
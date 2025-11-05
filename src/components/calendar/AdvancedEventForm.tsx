import React, { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar, Clock, MapPin, Users, Video, Bell, Repeat, Shield } from "lucide-react";
import { toast } from "sonner";

interface EventFormData {
  id?: string;
  title: string;
  description?: string;
  location?: string;
  starts_at: string;
  ends_at: string;
  timezone: string;
  kind: string;
  busy_state: string;
  visibility: string;
  conference_url?: string;
  attendees: any[];
  reminders: any[];
  recurrence?: any;
}

export function AdvancedEventForm({ 
  initialData, 
  onSubmit, 
  onClose 
}: { 
  initialData?: Partial<EventFormData>; 
  onSubmit?: (data: EventFormData) => void;
  onClose?: () => void;
}) {
  const [formData, setFormData] = useState<EventFormData>({
    title: initialData?.title || "",
    description: initialData?.description || "",
    location: initialData?.location || "",
    starts_at: initialData?.starts_at || new Date().toISOString().slice(0, 16),
    ends_at: initialData?.ends_at || new Date(Date.now() + 3600000).toISOString().slice(0, 16),
    timezone: initialData?.timezone || "Asia/Dubai",
    kind: initialData?.kind || "event",
    busy_state: initialData?.busy_state || "busy",
    visibility: initialData?.visibility || "default",
    conference_url: initialData?.conference_url || "",
    attendees: initialData?.attendees || [],
    reminders: initialData?.reminders || [{ minutes: 10, method: "popup" }],
    recurrence: initialData?.recurrence || null,
    ...initialData
  });

  const [checkingPrayer, setCheckingPrayer] = useState(false);
  const [prayerConflict, setPrayerConflict] = useState<any>(null);
  const [suggestingTimes, setSuggestingTimes] = useState(false);
  const [suggestions, setSuggestions] = useState<any[]>([]);

  const handleCheckPrayer = async () => {
    setCheckingPrayer(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/conflict-check`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          user_id: user.id,
          start_at: formData.starts_at,
          end_at: formData.ends_at
        })
      });

      const result = await res.json();
      if (result.has_conflict) {
        setPrayerConflict(result);
        toast.warning("⚠️ تعارض مع وقت الصلاة", {
          description: `الحدث يتعارض مع صلاة ${result.prayer_name}`
        });
      } else {
        toast.success("✅ لا توجد تعارضات");
        setPrayerConflict(null);
      }
    } catch (err) {
      console.error("Prayer check failed:", err);
      toast.error("فشل التحقق من الصلاة");
    } finally {
      setCheckingPrayer(false);
    }
  };

  const handleSuggestTimes = async () => {
    setSuggestingTimes(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-orchestrator`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          intent: "calendar_suggest",
          context: {
            title: formData.title,
            duration_minutes: Math.floor((Date.parse(formData.ends_at) - Date.parse(formData.starts_at)) / 60000),
            preferred_date: formData.starts_at.slice(0, 10)
          }
        })
      });

      const result = await res.json();
      if (result.suggestions) {
        setSuggestions(result.suggestions);
        toast.success(`🤖 تم اقتراح ${result.suggestions.length} أوقات بديلة`);
      }
    } catch (err) {
      console.error("Suggest times failed:", err);
      toast.error("فشل الحصول على اقتراحات");
    } finally {
      setSuggestingTimes(false);
    }
  };

  const handleSubmit = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const action = formData.id ? "update" : "create";
      
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/calendar-apply`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          action,
          event: formData,
          propagate_google: false // TODO: add toggle
        })
      });

      const result = await res.json();
      if (result.success) {
        toast.success(action === "create" ? "✅ تم إنشاء الحدث" : "✅ تم تحديث الحدث");
        onSubmit?.(result.event);
        onClose?.();
      } else {
        throw new Error(result.error);
      }
    } catch (err) {
      console.error("Submit failed:", err);
      toast.error("فشل حفظ الحدث");
    }
  };

  return (
    <div className="space-y-6 p-6 max-w-2xl">
      <h2 className="text-2xl font-bold">
        {formData.id ? "تحرير الحدث" : "حدث جديد"}
      </h2>

      {/* العنوان */}
      <div>
        <Label htmlFor="title">العنوان *</Label>
        <Input
          id="title"
          value={formData.title}
          onChange={(e) => setFormData({ ...formData, title: e.target.value })}
          placeholder="اجتماع مع الفريق..."
        />
      </div>

      {/* الوقت */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="starts_at">البداية</Label>
          <Input
            id="starts_at"
            type="datetime-local"
            value={formData.starts_at}
            onChange={(e) => setFormData({ ...formData, starts_at: e.target.value })}
          />
        </div>
        <div>
          <Label htmlFor="ends_at">النهاية</Label>
          <Input
            id="ends_at"
            type="datetime-local"
            value={formData.ends_at}
            onChange={(e) => setFormData({ ...formData, ends_at: e.target.value })}
          />
        </div>
      </div>

      {/* أزرار التحقق */}
      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={handleCheckPrayer}
          disabled={checkingPrayer}
        >
          <Shield className="w-4 h-4 mr-2" />
          تحقق من الصلاة
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={handleSuggestTimes}
          disabled={suggestingTimes}
        >
          <Clock className="w-4 h-4 mr-2" />
          اقترح أوقات
        </Button>
      </div>

      {/* عرض التعارض */}
      {prayerConflict && (
        <div className="p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/30 text-sm">
          ⚠️ تعارض مع صلاة {prayerConflict.prayer_name} - 
          الاقتراح: {prayerConflict.suggestion === 'reschedule_before_prayer' ? 'تقديم الحدث' : 
                      prayerConflict.suggestion === 'reschedule_after_prayer' ? 'تأخير الحدث' : 
                      'تعليم كـ Free'}
        </div>
      )}

      {/* الاقتراحات */}
      {suggestions.length > 0 && (
        <div className="space-y-2">
          <Label>أوقات مقترحة:</Label>
          <div className="grid gap-2">
            {suggestions.map((s, i) => (
              <button
                key={i}
                onClick={() => {
                  setFormData({
                    ...formData,
                    starts_at: s.start,
                    ends_at: s.end
                  });
                  setSuggestions([]);
                }}
                className="p-3 rounded-lg border bg-white/5 hover:bg-white/10 text-sm text-left"
              >
                🕐 {new Date(s.start).toLocaleString('ar-SA')} - {new Date(s.end).toLocaleTimeString('ar-SA')}
                {s.reason && <div className="text-xs opacity-70 mt-1">{s.reason}</div>}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* الموقع */}
      <div>
        <Label htmlFor="location">
          <MapPin className="w-4 h-4 inline mr-1" />
          الموقع
        </Label>
        <Input
          id="location"
          value={formData.location || ""}
          onChange={(e) => setFormData({ ...formData, location: e.target.value })}
          placeholder="مكتب الشركة..."
        />
      </div>

      {/* النوع والحالة */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="kind">النوع</Label>
          <Select value={formData.kind} onValueChange={(v) => setFormData({ ...formData, kind: v })}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="event">حدث</SelectItem>
              <SelectItem value="meeting">اجتماع</SelectItem>
              <SelectItem value="task">مهمة</SelectItem>
              <SelectItem value="focus">تركيز</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label htmlFor="busy_state">الحالة</Label>
          <Select value={formData.busy_state} onValueChange={(v) => setFormData({ ...formData, busy_state: v })}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="busy">مشغول</SelectItem>
              <SelectItem value="free">متفرغ</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* الوصف */}
      <div>
        <Label htmlFor="description">الوصف</Label>
        <Textarea
          id="description"
          value={formData.description || ""}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          rows={3}
          placeholder="تفاصيل إضافية..."
        />
      </div>

      {/* رابط المؤتمر */}
      {formData.kind === 'meeting' && (
        <div>
          <Label htmlFor="conference_url">
            <Video className="w-4 h-4 inline mr-1" />
            رابط الاجتماع
          </Label>
          <Input
            id="conference_url"
            value={formData.conference_url || ""}
            onChange={(e) => setFormData({ ...formData, conference_url: e.target.value })}
            placeholder="https://meet.google.com/..."
          />
        </div>
      )}

      {/* أزرار الحفظ */}
      <div className="flex gap-3 justify-end pt-4 border-t">
        <Button variant="outline" onClick={onClose}>إلغاء</Button>
        <Button onClick={handleSubmit}>
          {formData.id ? "تحديث" : "إنشاء"}
        </Button>
      </div>
    </div>
  );
}

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar, Clock, MapPin, Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type Props = {
  open: boolean;
  onClose: () => void;
  onEventCreated?: () => void;
  defaultDate?: Date;
  defaultStartTime?: string;
  defaultEndTime?: string;
};

export default function QuickAddDialog({
  open,
  onClose,
  onEventCreated,
  defaultDate,
  defaultStartTime,
  defaultEndTime,
}: Props) {
  const [title, setTitle] = useState("");
  const [date, setDate] = useState(defaultDate?.toISOString().split('T')[0] || new Date().toISOString().split('T')[0]);
  const [startTime, setStartTime] = useState(defaultStartTime || "09:00");
  const [endTime, setEndTime] = useState(defaultEndTime || "10:00");
  const [location, setLocation] = useState("");
  const [loading, setLoading] = useState(false);

  const handleCreate = async () => {
    if (!title.trim()) {
      toast.error("يرجى إدخال عنوان الحدث");
      return;
    }

    setLoading(true);
    try {
      const starts_at = new Date(`${date}T${startTime}`).toISOString();
      const ends_at = new Date(`${date}T${endTime}`).toISOString();

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("يجب تسجيل الدخول أولاً");
        return;
      }

      const { error } = await supabase.from("events").insert({
        title,
        starts_at,
        ends_at,
        location: location || null,
        is_draft: false,
        owner_id: user.id,
      });

      if (error) throw error;

      toast.success("تم إنشاء الحدث بنجاح ✅");
      onEventCreated?.();
      handleClose();
    } catch (err) {
      console.error("Failed to create event:", err);
      toast.error("فشل إنشاء الحدث");
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setTitle("");
    setLocation("");
    setDate(new Date().toISOString().split('T')[0]);
    setStartTime("09:00");
    setEndTime("10:00");
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="w-5 h-5 text-[#1a73e8]" />
            إضافة حدث سريع
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="quick-title">العنوان</Label>
            <Input
              id="quick-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="اجتماع، مكالمة، موعد..."
              className="text-base"
              autoFocus
            />
          </div>

          {/* Date and Time */}
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-2">
              <Label htmlFor="quick-date" className="flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                التاريخ
              </Label>
              <Input
                id="quick-date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="text-sm"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="quick-start" className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                البداية
              </Label>
              <Input
                id="quick-start"
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="text-sm"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="quick-end">النهاية</Label>
              <Input
                id="quick-end"
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="text-sm"
              />
            </div>
          </div>

          {/* Location */}
          <div className="space-y-2">
            <Label htmlFor="quick-location" className="flex items-center gap-1">
              <MapPin className="w-3 h-3" />
              الموقع (اختياري)
            </Label>
            <Input
              id="quick-location"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="أضف موقعاً..."
            />
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-2">
            <Button
              onClick={handleCreate}
              disabled={loading}
              className="flex-1 bg-[#1a73e8] hover:bg-[#1557b0]"
            >
              {loading ? "جار الإنشاء..." : "إنشاء"}
            </Button>
            <Button
              onClick={handleClose}
              variant="outline"
            >
              إلغاء
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Calendar, Users, Clock, Bell, Paperclip } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

type Attendee = {
  email: string;
  name?: string;
  can_modify?: boolean;
  can_invite_others?: boolean;
  can_see_guests?: boolean;
};

type Notification = {
  method: 'push' | 'email';
  minutes: number;
};

type Conference = {
  type: string;
  link?: string;
  pin?: string;
};

type EventFormData = {
  title: string;
  start: string;
  end: string;
  all_day: boolean;
  location: string;
  description: string;
  color: string;
  rrule: string;
  visibility: 'default' | 'public' | 'private';
  busy_state: 'busy' | 'free';
  attendees: Attendee[];
  notifications: Notification[];
  conference: Conference | null;
  is_draft: boolean;
  kind: 'event' | 'task' | 'ooo' | 'focus' | 'appointment';
};

type Props = {
  open: boolean;
  onClose: () => void;
  initialData?: Partial<EventFormData>;
  onSuccess?: (eventId: string) => void;
};

export function UnifiedEventComposer({ open, onClose, initialData, onSuccess }: Props) {
  const [activeTab, setActiveTab] = useState('details');
  const [loading, setLoading] = useState(false);
  const [suggestedSlots, setSuggestedSlots] = useState<string[]>([]);
  
  const [formData, setFormData] = useState<EventFormData>({
    title: '',
    start: new Date().toISOString().slice(0, 16),
    end: new Date(Date.now() + 60 * 60 * 1000).toISOString().slice(0, 16),
    all_day: false,
    location: '',
    description: '',
    color: '#4285F4',
    rrule: '',
    visibility: 'default',
    busy_state: 'busy',
    attendees: [],
    notifications: [{ method: 'push', minutes: 30 }],
    conference: null,
    is_draft: false,
    kind: 'event',
    ...initialData,
  });

  const updateField = <K extends keyof EventFormData>(key: K, value: EventFormData[K]) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
  };

  const addAttendee = () => {
    const email = prompt('أدخل البريد الإلكتروني للضيف:');
    if (!email) return;
    
    setFormData((prev) => ({
      ...prev,
      attendees: [
        ...prev.attendees,
        {
          email,
          can_modify: false,
          can_invite_others: true,
          can_see_guests: true,
        },
      ],
    }));
  };

  const removeAttendee = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      attendees: prev.attendees.filter((_, i) => i !== index),
    }));
  };

  const addNotification = () => {
    setFormData((prev) => ({
      ...prev,
      notifications: [...prev.notifications, { method: 'push', minutes: 15 }],
    }));
  };

  const updateNotification = (index: number, field: keyof Notification, value: any) => {
    setFormData((prev) => ({
      ...prev,
      notifications: prev.notifications.map((n, i) =>
        i === index ? { ...n, [field]: value } : n
      ),
    }));
  };

  const removeNotification = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      notifications: prev.notifications.filter((_, i) => i !== index),
    }));
  };

  const findAvailableSlots = async () => {
    setLoading(true);
    try {
      const startTime = new Date(formData.start);
      const endTime = new Date(formData.end);
      const duration = Math.round((endTime.getTime() - startTime.getTime()) / (1000 * 60));

      const windowStart = new Date();
      windowStart.setHours(8, 0, 0, 0);
      const windowEnd = new Date(windowStart);
      windowEnd.setDate(windowEnd.getDate() + 7);
      windowEnd.setHours(18, 0, 0, 0);

      const { data, error } = await supabase.functions.invoke('find-time', {
        body: {
          attendees: formData.attendees.map((a) => ({ email: a.email })),
          duration_minutes: duration,
          window: {
            start: windowStart.toISOString(),
            end: windowEnd.toISOString(),
          },
          limit: 5,
        },
      });

      if (error) throw error;
      
      setSuggestedSlots(data.slots || []);
      toast.success(`تم إيجاد ${data.slots?.length || 0} فتحة متاحة`);
    } catch (error: any) {
      console.error('Error finding slots:', error);
      toast.error('فشل في إيجاد الأوقات المتاحة');
    } finally {
      setLoading(false);
    }
  };

  const useSlot = (slot: string) => {
    const startTime = new Date(slot);
    const duration =
      (new Date(formData.end).getTime() - new Date(formData.start).getTime()) / (1000 * 60);
    const endTime = new Date(startTime.getTime() + duration * 60 * 1000);

    updateField('start', startTime.toISOString().slice(0, 16));
    updateField('end', endTime.toISOString().slice(0, 16));
    setActiveTab('details');
    toast.success('تم تحديد الوقت');
  };

  const handleSave = async () => {
    if (!formData.title.trim()) {
      toast.error('يرجى إدخال عنوان الحدث');
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('calendar-apply', {
        body: {
          action: 'create',
          title: formData.title,
          start: new Date(formData.start).toISOString(),
          end: new Date(formData.end).toISOString(),
          all_day: formData.all_day,
          location: formData.location || undefined,
          description: formData.description || undefined,
          color: formData.color,
          rrule: formData.rrule || undefined,
          visibility: formData.visibility,
          busy_state: formData.busy_state,
          notifications: formData.notifications,
          conference: formData.conference || undefined,
          attendees: formData.attendees.length > 0 ? formData.attendees : undefined,
          is_draft: formData.is_draft,
          kind: formData.kind,
        },
      });

      if (error) throw error;

      toast.success('تم إنشاء الحدث بنجاح');
      onSuccess?.(data.id);
      onClose();
    } catch (error: any) {
      console.error('Error creating event:', error);
      toast.error('فشل في إنشاء الحدث');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>إنشاء حدث جديد</DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="details">
              <Calendar className="w-4 h-4 mr-2" />
              التفاصيل
            </TabsTrigger>
            <TabsTrigger value="guests">
              <Users className="w-4 h-4 mr-2" />
              الضيوف
            </TabsTrigger>
            <TabsTrigger value="find-time">
              <Clock className="w-4 h-4 mr-2" />
              إيجاد وقت
            </TabsTrigger>
            <TabsTrigger value="notifications">
              <Bell className="w-4 h-4 mr-2" />
              التنبيهات
            </TabsTrigger>
            <TabsTrigger value="attachments">
              <Paperclip className="w-4 h-4 mr-2" />
              المرفقات
            </TabsTrigger>
          </TabsList>

          <TabsContent value="details" className="space-y-4">
            <div>
              <Label>العنوان</Label>
              <Input
                value={formData.title}
                onChange={(e) => updateField('title', e.target.value)}
                placeholder="عنوان الحدث"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>البداية</Label>
                <Input
                  type="datetime-local"
                  value={formData.start}
                  onChange={(e) => updateField('start', e.target.value)}
                />
              </div>
              <div>
                <Label>النهاية</Label>
                <Input
                  type="datetime-local"
                  value={formData.end}
                  onChange={(e) => updateField('end', e.target.value)}
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Switch
                checked={formData.all_day}
                onCheckedChange={(checked) => updateField('all_day', checked)}
              />
              <Label>حدث طوال اليوم</Label>
            </div>

            <div>
              <Label>الموقع</Label>
              <Input
                value={formData.location}
                onChange={(e) => updateField('location', e.target.value)}
                placeholder="الموقع"
              />
            </div>

            <div>
              <Label>الوصف</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => updateField('description', e.target.value)}
                placeholder="وصف الحدث"
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>اللون</Label>
                <Input
                  type="color"
                  value={formData.color}
                  onChange={(e) => updateField('color', e.target.value)}
                />
              </div>
              <div>
                <Label>النوع</Label>
                <select
                  className="w-full h-10 px-3 rounded-md border"
                  value={formData.kind}
                  onChange={(e) => updateField('kind', e.target.value as any)}
                >
                  <option value="event">حدث</option>
                  <option value="task">مهمة</option>
                  <option value="ooo">خارج المكتب</option>
                  <option value="focus">وقت التركيز</option>
                  <option value="appointment">موعد</option>
                </select>
              </div>
            </div>

            <div>
              <Label>التكرار (RRULE)</Label>
              <Input
                value={formData.rrule}
                onChange={(e) => updateField('rrule', e.target.value)}
                placeholder="FREQ=WEEKLY;BYDAY=MO,WE,FR"
              />
            </div>
          </TabsContent>

          <TabsContent value="guests" className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold">الضيوف ({formData.attendees.length})</h3>
              <Button onClick={addAttendee} size="sm">
                إضافة ضيف
              </Button>
            </div>

            <div className="space-y-2">
              {formData.attendees.map((attendee, index) => (
                <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <div className="font-medium">{attendee.email}</div>
                    {attendee.name && <div className="text-sm text-muted-foreground">{attendee.name}</div>}
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => removeAttendee(index)}>
                    إزالة
                  </Button>
                </div>
              ))}
              {formData.attendees.length === 0 && (
                <div className="text-center text-muted-foreground py-8">
                  لا يوجد ضيوف
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="find-time" className="space-y-4">
            <div>
              <Button onClick={findAvailableSlots} disabled={loading} className="w-full">
                {loading ? 'جاري البحث...' : 'إيجاد الأوقات المتاحة'}
              </Button>
            </div>

            {suggestedSlots.length > 0 && (
              <div className="space-y-2">
                <h3 className="font-semibold">الأوقات المقترحة:</h3>
                {suggestedSlots.map((slot, index) => (
                  <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                    <div>{new Date(slot).toLocaleString('ar-EG')}</div>
                    <Button size="sm" onClick={() => useSlot(slot)}>
                      استخدام
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="notifications" className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold">التنبيهات</h3>
              <Button onClick={addNotification} size="sm">
                إضافة تنبيه
              </Button>
            </div>

            <div className="space-y-2">
              {formData.notifications.map((notif, index) => (
                <div key={index} className="flex items-center gap-4 p-3 border rounded-lg">
                  <select
                    className="px-3 py-2 rounded-md border"
                    value={notif.method}
                    onChange={(e) =>
                      updateNotification(index, 'method', e.target.value as 'push' | 'email')
                    }
                  >
                    <option value="push">إشعار</option>
                    <option value="email">بريد إلكتروني</option>
                  </select>
                  <Input
                    type="number"
                    value={notif.minutes}
                    onChange={(e) => updateNotification(index, 'minutes', parseInt(e.target.value))}
                    className="w-24"
                  />
                  <span>دقيقة قبل</span>
                  <Button variant="ghost" size="sm" onClick={() => removeNotification(index)}>
                    إزالة
                  </Button>
                </div>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="attachments" className="space-y-4">
            <div className="text-center text-muted-foreground py-8">
              سيتم إضافة المرفقات قريباً
            </div>
          </TabsContent>
        </Tabs>

        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="outline" onClick={onClose} disabled={loading}>
            إلغاء
          </Button>
          <Button onClick={handleSave} disabled={loading}>
            {loading ? 'جاري الحفظ...' : 'حفظ الحدث'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

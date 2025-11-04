import { useParams } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { toast } from 'sonner';
import { Calendar, Clock, Loader2, CheckCircle2 } from 'lucide-react';
import { format } from 'date-fns';

type AppointmentPage = {
  id: string;
  slug: string;
  title: string;
  description?: string | null;
  durations: number[];
  availability_window: any;
  buffer_minutes: any;
  max_per_day: number;
  timezone: string;
  active: boolean;
};

export default function PublicBookingPage() {
  const { slug } = useParams<{ slug: string }>();
  const [page, setPage] = useState<AppointmentPage | null>(null);
  const [loading, setLoading] = useState(true);
  const [availableSlots, setAvailableSlots] = useState<string[]>([]);
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [selectedDuration, setSelectedDuration] = useState<number>(30);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [bookingData, setBookingData] = useState({
    name: '',
    email: '',
    notes: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    loadPage();
  }, [slug]);

  useEffect(() => {
    if (page) {
      loadAvailableSlots();
    }
  }, [selectedDate, selectedDuration, page]);

  const loadPage = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('appointment_pages')
        .select('*')
        .eq('slug', slug)
        .eq('active', true)
        .single();

      if (error) throw error;
      setPage(data);
      if (data.durations && data.durations.length > 0) {
        setSelectedDuration(data.durations[0]);
      }
    } catch (error: any) {
      console.error('Error loading page:', error);
      toast.error('الصفحة غير موجودة أو غير متاحة');
    } finally {
      setLoading(false);
    }
  };

  const loadAvailableSlots = async () => {
    if (!page) return;

    try {
      const { data, error } = await supabase.functions.invoke('appt-availability', {
        body: {
          slug: page.slug,
          date: selectedDate,
          duration: selectedDuration,
        },
      });

      if (error) throw error;
      setAvailableSlots(data.slots || []);
    } catch (error: any) {
      console.error('Error loading slots:', error);
    }
  };

  const handleBooking = async () => {
    if (!bookingData.name || !bookingData.email || !selectedSlot) {
      toast.error('الرجاء إدخال جميع البيانات المطلوبة');
      return;
    }

    setSubmitting(true);
    try {
      const { data, error } = await supabase.functions.invoke('appt-book', {
        body: {
          pageId: page?.id,
          slug: page?.slug,
          startTime: selectedSlot,
          duration: selectedDuration,
          guestName: bookingData.name,
          guestEmail: bookingData.email,
          notes: bookingData.notes,
        },
      });

      if (error) throw error;

      setSuccess(true);
      toast.success('تم حجز الموعد بنجاح!');
    } catch (error: any) {
      console.error('Error booking:', error);
      toast.error('فشل حجز الموعد');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f8f9fa] dark:bg-[#202124] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#1a73e8]" />
      </div>
    );
  }

  if (!page) {
    return (
      <div className="min-h-screen bg-[#f8f9fa] dark:bg-[#202124] flex items-center justify-center">
        <Card className="p-8 max-w-md text-center">
          <h2 className="text-xl font-medium text-[#3c4043] dark:text-[#e8eaed] mb-2">
            الصفحة غير موجودة
          </h2>
          <p className="text-sm text-[#5f6368] dark:text-[#9aa0a6]">
            الرجاء التحقق من الرابط والمحاولة مرة أخرى
          </p>
        </Card>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen bg-[#f8f9fa] dark:bg-[#202124] flex items-center justify-center p-4">
        <Card className="p-8 max-w-md text-center">
          <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto mb-4" />
          <h2 className="text-xl font-medium text-[#3c4043] dark:text-[#e8eaed] mb-2">
            تم حجز الموعد بنجاح!
          </h2>
          <p className="text-sm text-[#5f6368] dark:text-[#9aa0a6]">
            تم إرسال تأكيد الحجز إلى بريدك الإلكتروني
          </p>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8f9fa] dark:bg-[#202124] p-4">
      <div className="max-w-4xl mx-auto pt-8">
        <Card className="p-6 lg:p-8">
          {/* Header */}
          <div className="border-b border-[#dadce0] dark:border-[#5f6368] pb-6 mb-6">
            <h1 className="text-2xl font-normal text-[#3c4043] dark:text-[#e8eaed] mb-2">
              {page.title}
            </h1>
            {page.description && (
              <p className="text-sm text-[#5f6368] dark:text-[#9aa0a6]">
                {page.description}
              </p>
            )}
          </div>

          {!showForm ? (
            <div className="space-y-6">
              {/* Duration Selection */}
              <div>
                <Label className="text-sm text-[#3c4043] dark:text-[#e8eaed] mb-3 block">
                  مدة الموعد
                </Label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {page.durations.map((duration) => (
                    <Button
                      key={duration}
                      variant={selectedDuration === duration ? 'default' : 'outline'}
                      onClick={() => setSelectedDuration(duration)}
                      className={selectedDuration === duration ? 'bg-[#1a73e8]' : ''}
                    >
                      {duration} دقيقة
                    </Button>
                  ))}
                </div>
              </div>

              {/* Date Selection */}
              <div>
                <Label htmlFor="booking-date" className="text-sm text-[#3c4043] dark:text-[#e8eaed] mb-3 block">
                  التاريخ
                </Label>
                <Input
                  id="booking-date"
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  min={format(new Date(), 'yyyy-MM-dd')}
                  className="h-10"
                />
              </div>

              {/* Available Slots */}
              <div>
                <Label className="text-sm text-[#3c4043] dark:text-[#e8eaed] mb-3 block">
                  الأوقات المتاحة
                </Label>
                {availableSlots.length === 0 ? (
                  <p className="text-sm text-[#5f6368] dark:text-[#9aa0a6] text-center py-8">
                    لا توجد أوقات متاحة في هذا التاريخ
                  </p>
                ) : (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2 max-h-64 overflow-y-auto">
                    {availableSlots.map((slot) => (
                      <Button
                        key={slot}
                        variant={selectedSlot === slot ? 'default' : 'outline'}
                        onClick={() => {
                          setSelectedSlot(slot);
                          setShowForm(true);
                        }}
                        className={cn(
                          "flex items-center gap-2 justify-center",
                          selectedSlot === slot ? 'bg-[#1a73e8]' : ''
                        )}
                        size="sm"
                      >
                        <Clock className="w-4 h-4" />
                        {format(new Date(slot), 'HH:mm')}
                      </Button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Selected Details */}
              <div className="bg-[#e8f0fe] dark:bg-[#1a73e8]/20 p-4 rounded-lg">
                <div className="flex items-center gap-2 text-sm text-[#1a73e8] dark:text-[#8ab4f8]">
                  <Calendar className="w-4 h-4" />
                  <span>{selectedDate}</span>
                  <span>•</span>
                  <Clock className="w-4 h-4" />
                  <span>{selectedSlot && format(new Date(selectedSlot), 'HH:mm')}</span>
                  <span>•</span>
                  <span>{selectedDuration} دقيقة</span>
                </div>
              </div>

              {/* Booking Form */}
              <div className="space-y-4">
                <div>
                  <Label htmlFor="guest-name" className="text-sm text-[#3c4043] dark:text-[#e8eaed]">
                    الاسم *
                  </Label>
                  <Input
                    id="guest-name"
                    value={bookingData.name}
                    onChange={(e) => setBookingData({ ...bookingData, name: e.target.value })}
                    placeholder="أدخل اسمك"
                    className="h-10"
                  />
                </div>

                <div>
                  <Label htmlFor="guest-email" className="text-sm text-[#3c4043] dark:text-[#e8eaed]">
                    البريد الإلكتروني *
                  </Label>
                  <Input
                    id="guest-email"
                    type="email"
                    value={bookingData.email}
                    onChange={(e) => setBookingData({ ...bookingData, email: e.target.value })}
                    placeholder="name@example.com"
                    className="h-10"
                  />
                </div>

                <div>
                  <Label htmlFor="guest-notes" className="text-sm text-[#3c4043] dark:text-[#e8eaed]">
                    ملاحظات (اختياري)
                  </Label>
                  <Textarea
                    id="guest-notes"
                    value={bookingData.notes}
                    onChange={(e) => setBookingData({ ...bookingData, notes: e.target.value })}
                    placeholder="أي تفاصيل إضافية..."
                    rows={3}
                  />
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-4">
                <Button
                  variant="outline"
                  onClick={() => setShowForm(false)}
                  className="flex-1"
                >
                  رجوع
                </Button>
                <Button
                  onClick={handleBooking}
                  disabled={submitting || !bookingData.name || !bookingData.email}
                  className="flex-1 bg-[#1a73e8] hover:bg-[#1557b0]"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      جاري الحجز...
                    </>
                  ) : (
                    'تأكيد الحجز'
                  )}
                </Button>
              </div>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}

function cn(...classes: (string | boolean | undefined)[]) {
  return classes.filter(Boolean).join(' ');
}
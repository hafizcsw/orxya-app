# Calendar Parity - دليل التشغيل السريع

## ✅ ما تم تنفيذه

### 1. قاعدة البيانات
- ✅ جدول `calendars_extended` - تقاويم موسعة بإعدادات كاملة
- ✅ جدول `working_hours` - ساعات العمل
- ✅ جدول `working_locations` - مواقع العمل
- ✅ جدول `appointment_pages` - صفحات الحجز
- ✅ جدول `appointment_bookings` - الحجوزات
- ✅ توسيع جدول `events` بحقول جديدة (kind, tz, visibility, busy_state, notifications, conference, attachments)
- ✅ توسيع جدول `event_attendees` بصلاحيات الضيوف
- ✅ View `v_tasks_calendar` - عرض المهام في التقويم

### 2. Edge Functions
- ✅ `/functions/calendar-apply` - إدارة الأحداث (Create/Update/Move/Resize/Delete)
- ✅ `/functions/find-time` - إيجاد الأوقات المتاحة
- ✅ `/functions/task-apply` - إدارة المهام (Toggle Done)

### 3. واجهة المستخدم
- ✅ `UnifiedEventComposer` - منشئ الحدث الموحد مع 5 تبويبات
- ✅ `CalendarParitySettings` - صفحة إعدادات الميزات
- ✅ `useFeatureFlags` - Hook لإدارة الأعلام

## 🚀 التفعيل

### الخطوة 1: تفعيل الأعلام
1. اذهب إلى: **الإعدادات** → **Calendar Parity**
2. فعّل المفاتيح التالية:
   - ✅ تفعيل Calendar Parity (الرئيسي)
   - ✅ إيجاد الأوقات المتاحة
   - ✅ صفحات المواعيد
   - ✅ تكامل المهام

### الخطوة 2: استخدام منشئ الحدث
```tsx
import { UnifiedEventComposer } from '@/components/calendar/UnifiedEventComposer';

// في أي مكون تريده
const [showComposer, setShowComposer] = useState(false);

<UnifiedEventComposer
  open={showComposer}
  onClose={() => setShowComposer(false)}
  onSuccess={(eventId) => {
    console.log('Event created:', eventId);
    // إعادة تحميل التقويم
  }}
/>
```

## 🧪 الاختبار (cURL)

### 1. إنشاء حدث كامل
```bash
curl -X POST \
  'https://gcjggazmatipzqnxixhp.supabase.co/functions/v1/calendar-apply' \
  -H 'Authorization: Bearer YOUR_JWT_TOKEN' \
  -H 'Content-Type: application/json' \
  -d '{
    "action": "create",
    "title": "Design Review",
    "start": "2025-11-06T15:00:00+04:00",
    "end": "2025-11-06T16:00:00+04:00",
    "tz": "Asia/Dubai",
    "rrule": "FREQ=WEEKLY;BYDAY=TH",
    "location": "Office A",
    "description": "UI/UX parity with Google",
    "color": "#4285F4",
    "notifications": [
      {"method": "push", "minutes": 30},
      {"method": "email", "minutes": 60}
    ],
    "conference": {
      "type": "meet",
      "link": "https://meet.example/abc"
    },
    "attendees": [
      {
        "email": "guest@example.com",
        "name": "Guest",
        "can_invite_others": true
      }
    ],
    "is_draft": true,
    "kind": "event"
  }'
```

### 2. إيجاد وقت متاح
```bash
curl -X POST \
  'https://gcjggazmatipzqnxixhp.supabase.co/functions/v1/find-time' \
  -H 'Authorization: Bearer YOUR_JWT_TOKEN' \
  -H 'Content-Type: application/json' \
  -d '{
    "attendees": [],
    "duration_minutes": 30,
    "window": {
      "start": "2025-11-05T08:00:00+04:00",
      "end": "2025-11-07T20:00:00+04:00"
    },
    "limit": 5
  }'
```

### 3. إنهاء مهمة
```bash
curl -X POST \
  'https://gcjggazmatipzqnxixhp.supabase.co/functions/v1/task-apply' \
  -H 'Authorization: Bearer YOUR_JWT_TOKEN' \
  -H 'Content-Type: application/json' \
  -d '{
    "action": "toggle_done",
    "id": "TASK_UUID_HERE"
  }'
```

## 📋 الميزات المتاحة

### ✅ في منشئ الحدث:
1. **تبويب التفاصيل**
   - العنوان، الوقت، التاريخ
   - حدث طوال اليوم
   - الموقع، الوصف، اللون
   - التكرار (RRULE)
   - نوع الحدث (event/task/ooo/focus/appointment)

2. **تبويب الضيوف**
   - إضافة/إزالة ضيوف
   - إدارة صلاحيات الضيوف

3. **تبويب إيجاد وقت**
   - اقتراح 5 أوقات متاحة
   - يحترم ساعات العمل
   - يتجنب أوقات الصلاة
   - يتجنب الأحداث المشغولة

4. **تبويب التنبيهات**
   - إضافة تنبيهات متعددة
   - اختيار الطريقة (Push/Email)
   - تحديد الوقت (بالدقائق قبل الحدث)

5. **تبويب المرفقات**
   - (قريباً)

### ✅ في التقويم:
- عرض جميع الأحداث بالألوان
- عرض المهام المؤرّخة
- السحب لتغيير الموعد
- التمديد لتغيير المدة

## 🎯 التحسينات المستقبلية

### قريباً:
- [ ] صفحات الحجز العامة (Appointment Pages)
- [ ] استيراد/تصدير ICS
- [ ] المرفقات
- [ ] غرف الاجتماعات
- [ ] تكامل Zoom/Teams
- [ ] إشعارات الضيوف

### اختياري:
- [ ] AI scheduling assistant
- [ ] Smart rescheduling
- [ ] Conflict detection & resolution
- [ ] Team calendars

## 🔧 استكشاف الأخطاء

### الأعلام لا تعمل؟
تأكد من تنفيذ SQL للأعلام:
```sql
SELECT * FROM get_user_flags(auth.uid());
```

### Edge Functions لا تستجيب؟
تحقق من Logs:
```bash
# في Supabase Dashboard → Edge Functions → Logs
```

### البيانات لا تظهر؟
تحقق من RLS policies:
```sql
SELECT * FROM events WHERE owner_id = auth.uid();
```

## 📚 الموارد

- [RFC 5545 - iCalendar](https://datatracker.ietf.org/doc/html/rfc5545) - للتكرار (RRULE)
- [Google Calendar API](https://developers.google.com/calendar) - للمرجعية
- [Supabase Edge Functions](https://supabase.com/docs/guides/functions)

---

**ملاحظة**: جميع الميزات تعمل بدون التأثير على البيانات الحالية. يمكن إيقاف تشغيلها في أي وقت من الإعدادات.

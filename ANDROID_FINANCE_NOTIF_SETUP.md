# 🔔 Android Finance Notification Listener - دليل الإعداد

## نظرة عامة

يستخدم هذا النظام **NotificationListenerService** لالتقاط إشعارات البنوك تلقائيًا، تحليلها **محليًا 100%**، ثم رفع النتائج المهيكلة فقط إلى `financial_events`.

### ✅ الميزات الأمنية

- **لا نصوص خام**: يتم تحليل الإشعارات محليًا فقط
- **RLS محكم**: كل معاملة مرتبطة بـ user_id تلقائيًا
- **منع التكرار**: fingerprint محلي يمنع الإدراج المكرر
- **خصوصية كاملة**: لا تخزين أو إرسال للنصوص الأصلية
- **كفاءة الطاقة**: لا polling، يعمل فقط عند وصول الإشعارات

---

## 1️⃣ تعديل AndroidManifest.xml

أضف الخدمة داخل `<application>`:

```xml
<service
    android:name=".finance.NotifListenerService"
    android:label="@string/notification_listener_service_name"
    android:permission="android.permission.BIND_NOTIFICATION_LISTENER_SERVICE"
    android:exported="true">
    <intent-filter>
        <action android:name="android.service.notification.NotificationListenerService"/>
    </intent-filter>
</service>
```

في `res/values/strings.xml`:

```xml
<string name="notification_listener_service_name">Oryxa Finance Tracker</string>
```

---

## 2️⃣ إضافة الاعتماديات (build.gradle)

```kotlin
dependencies {
    // OkHttp للشبكة
    implementation("com.squareup.okhttp3:okhttp:4.12.0")
    
    // Coroutines
    implementation("org.jetbrains.kotlinx:kotlinx-coroutines-android:1.7.3")
}
```

---

## 3️⃣ إضافة Supabase URL إلى الموارد

في `res/values/strings.xml`:

```xml
<string name="supabase_url">https://gcjggazmatipzqnxixhp.supabase.co</string>
```

---

## 4️⃣ طلب الصلاحية من المستخدم

في Activity الرئيسية أو شاشة Onboarding:

```kotlin
import android.content.Intent
import android.provider.Settings

fun requestNotificationAccess() {
  val intent = Intent(Settings.ACTION_NOTIFICATION_LISTENER_SETTINGS)
  startActivity(intent)
  
  // اشرح للمستخدم:
  Toast.makeText(
    this,
    "رجاءً فعّل 'Oryxa' في قائمة الإشعارات",
    Toast.LENGTH_LONG
  ).show()
}

// للتحقق من التفعيل
fun isNotificationAccessGranted(): Boolean {
  val flat = Settings.Secure.getString(
    contentResolver,
    "enabled_notification_listeners"
  )
  return flat?.contains(packageName) == true
}
```

---

## 5️⃣ تخصيص البنوك المدعومة

في `NotifListenerService.kt`، عدّل `allowedPkgs`:

```kotlin
private val allowedPkgs = setOf(
  // رسائل
  "com.samsung.android.messaging",
  "com.google.android.apps.messaging",
  
  // البنوك الإماراتية
  "com.enbd.mobilebanking",       // Emirates NBD
  "com.adib.mobilebanking",       // ADIB
  "com.dib.app",                  // DIB
  
  // البنوك السعودية
  "com.alrajhibank.mobile",       // الراجحي
  "sa.com.stc.mystc",             // STC Pay
  
  // أضف حسب حاجتك
)
```

---

## 6️⃣ ربط JWT Token

في `FinanceUploader.kt`، استبدل `getSupabaseToken()`:

```kotlin
private fun getSupabaseToken(ctx: Context): String? {
  // خيار 1: Capacitor Preferences
  // return CapacitorPreferences.get("supabase_access_token")
  
  // خيار 2: SharedPreferences
  val prefs = ctx.getSharedPreferences("supabase_auth", Context.MODE_PRIVATE)
  return prefs.getString("access_token", null)
}
```

تأكد من حفظ الـ JWT عند تسجيل الدخول:

```kotlin
// في Auth flow
val prefs = context.getSharedPreferences("supabase_auth", Context.MODE_PRIVATE)
prefs.edit()
  .putString("access_token", session.accessToken)
  .apply()
```

---

## 7️⃣ اختبار النظام

### أ) إرسال إشعار تجريبي

```kotlin
// في Activity للاختبار فقط
fun sendTestNotification() {
  val notificationManager = getSystemService(NotificationManager::class.java)
  
  val channel = NotificationChannel(
    "test",
    "Test Finance",
    NotificationManager.IMPORTANCE_DEFAULT
  )
  notificationManager.createNotificationChannel(channel)
  
  val notification = Notification.Builder(this, "test")
    .setContentTitle("معاملة بنكية")
    .setContentText("تم خصم 150.00 AED من بطاقتك في STARBUCKS")
    .setSmallIcon(android.R.drawable.ic_dialog_info)
    .build()
  
  notificationManager.notify(1, notification)
}
```

### ب) فحص الإدراج

افتح Lovable Cloud → `financial_events` table وتحقق من وجود:
- `occurred_at`: وقت الإشعار
- `direction`: "outgoing"
- `amount`: 150.00
- `currency`: "AED"
- `merchant`: "STARBUCKS"
- `source_type`: "notification"
- `confidence`: >= 0.5

---

## 8️⃣ الأمان والامتثال

### ✅ متوافق مع Google Play

- ✓ **لا نطلب READ_SMS**
- ✓ **لا نصبح SMS افتراضي**
- ✓ **فقط NotificationListenerService** (مسموح به)

### 🔒 الخصوصية

- **لا تخزين**: النصوص لا تُحفظ أبدًا
- **لا إرسال**: فقط الحقول المهيكلة تُرسَل (amount, merchant, etc)
- **محلي 100%**: التحليل يتم على الجهاز فقط

### 📝 سياسة الخصوصية (أضف في تطبيقك)

```
يستخدم التطبيق صلاحية قراءة الإشعارات لاستخراج معلومات المعاملات البنكية 
تلقائيًا. جميع المعالجة تتم محليًا على جهازك، ولا نقوم بتخزين أو إرسال 
نصوص الإشعارات الأصلية. نرسل فقط البيانات المهيكلة (المبلغ، التاجر، الفئة) 
لحسابك الخاص المحمي.
```

---

## 9️⃣ إلغاء التفعيل

أضف خيار في الإعدادات:

```kotlin
fun disableFinanceTracking() {
  // فتح الإعدادات لإلغاء الصلاحية
  val intent = Intent(Settings.ACTION_NOTIFICATION_LISTENER_SETTINGS)
  startActivity(intent)
  
  // حذف البيانات المحلية
  DedupStore.clear(this)
}
```

---

## 🔧 استكشاف الأخطاء

### المشكلة: لا تصل الإشعارات

**الحل:**
1. تحقق من تفعيل الصلاحية: Settings → Notifications → Notification access
2. أضف package name البنك إلى `allowedPkgs`
3. تحقق من Logcat: `adb logcat | grep FinanceNotif`

### المشكلة: confidence منخفض

**الحل:**
- عدّل `TxnParser.kt` لدعم صيغة بنكك المحدد
- أضف keywords محلية (عربي/إنجليزي)
- اضبط الأوزان في حساب `confidence`

### المشكلة: تكرار الإدراجات

**الحل:**
- تحقق من `DedupStore` يعمل
- راجع `Fingerprint.of()` لضمان التفرّد
- نظّف SharedPreferences: `DedupStore.clear(context)`

---

## ✨ ما التالي؟

- [ ] **Order 4**: مرآة التقويم (Google Calendar Read-Only)
- [ ] **Order 5**: AI Nutrition Parser (صور الوجبات → kcal/macros)
- [ ] **Order 6**: Memory & RAG (ذاكرة طويلة/قصيرة + سياسات)
- [ ] **Order 7**: Recommendations Engine
- [ ] **Order 8**: Today v2 (عرض موحد للكل)

---

**✅ الأمر 3 مكتمل!** جاهز للأمر 4؟

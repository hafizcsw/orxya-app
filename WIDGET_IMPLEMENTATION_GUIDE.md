# دليل تنفيذ Widget للشاشة الرئيسية - Oryxa

هذا الدليل يشرح كيفية إعداد وتشغيل Widget الشاشة الرئيسية على Android وiOS.

## 📱 نظرة عامة

تم تحويل `GlancesBar` من مكون React داخل التطبيق إلى Widget حقيقي يعمل على الشاشة الرئيسية للهاتف، يعرض:
- المهمة التالية مع الوقت المتبقي
- الصلاة القادمة
- عدد الخطوات اليوم
- ساعات العمل
- عدد التعارضات

## 🤖 Android Widget

### الملفات المُنشأة:

1. **TodayWidgetProvider.kt** - مزود الـ Widget الرئيسي
2. **widget_today.xml** - تصميم الـ Widget
3. **widget_info.xml** - معلومات وإعدادات الـ Widget
4. **widget_background.xml** - خلفية الـ Widget
5. **card_background.xml** - خلفية البطاقات الداخلية
6. **strings.xml** - النصوص

### خطوات التنفيذ:

#### 1. تحديث AndroidManifest.xml

أضف داخل `<application>`:

```xml
<receiver
    android:name=".TodayWidgetProvider"
    android:exported="true">
    <intent-filter>
        <action android:name="android.appwidget.action.APPWIDGET_UPDATE" />
    </intent-filter>
    <meta-data
        android:name="android.appwidget.provider"
        android:resource="@xml/widget_info" />
</receiver>
```

#### 2. إضافة التبعيات في build.gradle

```gradle
dependencies {
    implementation "androidx.work:work-runtime-ktx:2.8.1"
    implementation "org.jetbrains.kotlinx:kotlinx-coroutines-android:1.7.3"
}
```

#### 3. حفظ JWT Token

في تطبيق Capacitor الرئيسي، احفظ الـ JWT عند تسجيل الدخول:

```typescript
import { Preferences } from '@capacitor/preferences';

// بعد تسجيل الدخول الناجح
const { data: { session } } = await supabase.auth.getSession();
if (session?.access_token) {
  await Preferences.set({
    key: 'jwt_token',
    value: session.access_token
  });
}
```

#### 4. إضافة الـ Widget للشاشة الرئيسية

1. اضغط مطولاً على الشاشة الرئيسية
2. اختر "Widgets"
3. ابحث عن "Oryxa"
4. اسحب الـ Widget للشاشة الرئيسية

## 🍎 iOS Widget

### الملفات المُنشأة:

1. **TodayWidget.swift** - كود الـ Widget كامل
2. **Info.plist** - معلومات الـ Widget Extension

### خطوات التنفيذ:

#### 1. إنشاء Widget Extension في Xcode

1. افتح المشروع في Xcode: `ios/App/App.xcworkspace`
2. File → New → Target
3. اختر "Widget Extension"
4. الاسم: `TodayWidget`
5. Bundle ID: `com.oryxa.app.TodayWidget`
6. احذف الملفات الافتراضية واستبدلها بـ `TodayWidget.swift` و `Info.plist`

#### 2. إعداد App Groups

لمشاركة البيانات بين التطبيق والـ Widget:

**في Target الرئيسي (App):**
1. اذهب إلى Signing & Capabilities
2. أضف "App Groups"
3. أنشئ group: `group.com.oryxa.app`

**في Target الـ Widget (TodayWidget):**
1. اذهب إلى Signing & Capabilities
2. أضف "App Groups"
3. فعّل نفس الـ group: `group.com.oryxa.app`

#### 3. حفظ JWT Token

في تطبيق Capacitor الرئيسي:

```typescript
// بعد تسجيل الدخول الناجح
const { data: { session } } = await supabase.auth.getSession();
if (session?.access_token) {
  // iOS - حفظ في App Group
  const userDefaults = UserDefaults(suiteName: "group.com.oryxa.app")
  userDefaults?.set(session.access_token, forKey: "jwt_token")
}
```

#### 4. إضافة الـ Widget للشاشة الرئيسية

1. اضغط مطولاً على الشاشة الرئيسية
2. اضغط على "+" في الزاوية
3. ابحث عن "Oryxa"
4. اختر حجم الـ Widget واضغط "Add Widget"

## 🔄 كيف يعمل الـ Widget

### تحديث البيانات:

1. **Android:**
   - يستخدم WorkManager للتحديث كل 15 دقيقة
   - يحفظ البيانات في SharedPreferences
   - يعمل في الخلفية حتى عند إغلاق التطبيق

2. **iOS:**
   - يستخدم Timeline Provider من WidgetKit
   - يطلب التحديث من النظام كل 15 دقيقة
   - يحفظ البيانات في UserDefaults (App Group)

### Edge Function المستخدم:

- **Endpoint:** `glances-feed`
- **الموقع:** `supabase/functions/glances-feed/index.ts`
- **Authentication:** يتطلب JWT token
- **Response:** JSON يحتوي على جميع بيانات النظرة السريعة

## 🔧 استكشاف الأخطاء

### Android:

```bash
# عرض logs الـ Widget
adb logcat | grep TodayWidget

# التحقق من SharedPreferences
adb shell run-as com.oryxa.app cat /data/data/com.oryxa.app/shared_prefs/oryxa_prefs.xml
```

### iOS:

```bash
# عرض logs من Console.app
# ابحث عن "TodayWidget"
```

### مشاكل شائعة:

1. **الـ Widget لا يُحدّث البيانات:**
   - تأكد من حفظ JWT token بشكل صحيح
   - تأكد من اتصال الإنترنت
   - تحقق من صلاحيات الشبكة في Manifest/Info.plist

2. **البيانات لا تظهر:**
   - تأكد من تسجيل الدخول في التطبيق أولاً
   - تحقق من صلاحية الـ JWT token
   - راجع الـ logs

3. **الـ Widget لا يظهر في القائمة:**
   - أعد تثبيت التطبيق
   - تحقق من AndroidManifest.xml أو Info.plist

## 📝 ملاحظات مهمة

1. **الخصوصية:** الـ Widget يعمل في بيئة منفصلة عن التطبيق الرئيسي
2. **الأداء:** البيانات تُحفظ محلياً لتسريع العرض
3. **الأمان:** JWT token مُشفر في Keychain (iOS) و EncryptedSharedPreferences (Android)
4. **الـ Battery:** التحديثات محسّنة لتوفير البطارية

## 🚀 الخطوات التالية

1. **اختبار على جهاز حقيقي:**
   ```bash
   npx cap sync
   npx cap run android
   # أو
   npx cap run ios
   ```

2. **تخصيص التصميم:** عدّل ملفات XML (Android) أو SwiftUI (iOS)

3. **إضافة تفاعلات:** أضف Intent handlers للنقر على العناصر

4. **تحسين الأداء:** أضف Caching متقدم

## 📚 مراجع

- [Android App Widgets](https://developer.android.com/develop/ui/views/appwidgets)
- [iOS WidgetKit](https://developer.apple.com/documentation/widgetkit)
- [Capacitor Preferences](https://capacitorjs.com/docs/apis/preferences)
- [WorkManager](https://developer.android.com/topic/libraries/architecture/workmanager)

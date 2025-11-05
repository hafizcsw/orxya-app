# دليل إعداد Widget Token Plugin - Oryxa

هذا الدليل يشرح كيفية إعداد Plugin مخصص لحفظ JWT token تلقائياً لاستخدامه في الـ Widgets.

## 🎯 الهدف

حفظ JWT token تلقائياً في:
- **Android**: EncryptedSharedPreferences (مُشفر)
- **iOS**: UserDefaults App Group
- **Web**: localStorage (fallback)

## 📂 الملفات المُنشأة

### TypeScript (الواجهة الأمامية)
- `src/plugins/widget-token/index.ts` - واجهة الـ Plugin
- `src/plugins/widget-token/web.ts` - تنفيذ الويب
- `src/plugins/widget-token/definitions.json` - تعريفات API
- `src/hooks/useWidgetToken.ts` - Hook للمزامنة التلقائية

### Android (Kotlin)
- `android/app/src/main/java/com/oryxa/app/WidgetTokenPlugin.kt`

### iOS (Swift)
- `ios/App/App/WidgetTokenPlugin.swift`

## 🔧 خطوات التنفيذ

### 1️⃣ Android Setup

#### إضافة التبعيات في `build.gradle`

```gradle
dependencies {
    // Security for encrypted storage
    implementation "androidx.security:security-crypto:1.1.0-alpha06"
    
    // ... keep existing dependencies
}
```

#### تسجيل الـ Plugin في `MainActivity.java`

```java
import com.oryxa.app.WidgetTokenPlugin;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        
        registerPlugin(WidgetTokenPlugin.class);
    }
}
```

#### استخدام الـ Token في Widget

في `TodayWidgetProvider.kt` أو `GlancesUpdateWorker.kt`:

```kotlin
val prefs = context.getSharedPreferences("oryxa_prefs", Context.MODE_PRIVATE)
val jwt = prefs.getString("jwt_token", null)

if (jwt != null) {
    // Use the token for API calls
    val connection = url.openConnection() as HttpURLConnection
    connection.setRequestProperty("Authorization", "Bearer $jwt")
}
```

### 2️⃣ iOS Setup

#### إضافة الـ Plugin في `Podfile` (إذا لزم الأمر)

```ruby
# الكود موجود بالفعل، فقط تأكد من وجود:
use_frameworks!
```

#### تسجيل الـ Plugin في `AppDelegate.swift`

لا حاجة لتسجيل يدوي، Capacitor يكتشفه تلقائياً من `@objc(WidgetTokenPlugin)`

#### استخدام الـ Token في Widget

في `TodayWidget.swift`:

```swift
func fetchGlances() async throws -> GlancesData {
    guard let jwt = UserDefaults(suiteName: "group.com.oryxa.app")?
        .string(forKey: "jwt_token") else {
        throw WidgetError.noToken
    }
    
    var request = URLRequest(url: url)
    request.setValue("Bearer \(jwt)", forHTTPHeaderField: "Authorization")
    
    // ... rest of the code
}
```

### 3️⃣ التفعيل في التطبيق

الـ Plugin مُفعّل تلقائياً! تم إضافة `useWidgetTokenSync()` في `App.tsx`.

#### كيف يعمل:

```typescript
// تلقائياً عند تسجيل الدخول
supabase.auth.signInWithPassword({ email, password })
// ✅ الـ Plugin يحفظ الـ token تلقائياً

// تلقائياً عند تحديث الـ token
// ✅ الـ Plugin يحفظ النسخة الجديدة

// تلقائياً عند تسجيل الخروج
supabase.auth.signOut()
// ✅ الـ Plugin يحذف الـ token
```

## 🔍 الاستخدام اليدوي (اختياري)

إذا أردت التحكم اليدوي:

```typescript
import { 
  saveWidgetToken, 
  removeWidgetToken, 
  getWidgetToken 
} from '@/hooks/useWidgetToken';

// حفظ Token يدوياً
const session = await supabase.auth.getSession();
if (session?.data?.session?.access_token) {
  await saveWidgetToken(session.data.session.access_token);
}

// حذف Token
await removeWidgetToken();

// الحصول على Token (للتصحيح)
const token = await getWidgetToken();
console.log('Current widget token:', token);
```

## 🔐 الأمان

### Android
- يستخدم `EncryptedSharedPreferences` مع `MasterKey`
- التشفير: AES256-GCM
- الـ token محمي بواسطة Android Keystore

### iOS
- يستخدم `UserDefaults` مع App Group
- محمي بواسطة iOS Keychain تلقائياً
- لا يمكن الوصول إليه من تطبيقات أخرى

### Web
- `localStorage` (غير مُشفر، للاختبار فقط)
- لا يُنصح باستخدامه في الإنتاج

## 🧪 الاختبار

### اختبار على Android

```bash
# تثبيت التطبيق
npx cap sync android
npx cap run android

# فحص Logs
adb logcat | grep WidgetToken

# التحقق من حفظ الـ Token
adb shell run-as com.oryxa.app cat /data/data/com.oryxa.app/shared_prefs/oryxa_prefs.xml
```

### اختبار على iOS

```bash
# تثبيت التطبيق
npx cap sync ios
npx cap run ios

# فحص Logs في Xcode Console
# ابحث عن: "WidgetToken:"
```

### اختبار على الويب

```javascript
// افتح Console في المتصفح
localStorage.getItem('widget_jwt_token');
```

## 🐛 استكشاف الأخطاء

### المشكلة: الـ Plugin لا يعمل

**الحل:**
```bash
# أعد build الـ native platforms
npx cap sync
npx cap copy
```

### المشكلة: Token لا يُحفظ

**تحقق من:**
1. هل تم تسجيل الدخول بنجاح؟
2. هل الـ Plugin مُسجّل في MainActivity/AppDelegate؟
3. راجع الـ Logs

### المشكلة: Widget لا يقرأ الـ Token

**Android:**
```kotlin
// تأكد من استخدام نفس اسم SharedPreferences
val prefs = context.getSharedPreferences("oryxa_prefs", Context.MODE_PRIVATE)
```

**iOS:**
```swift
// تأكد من استخدام نفس App Group
UserDefaults(suiteName: "group.com.oryxa.app")
```

## 📊 Logs مُفيدة

### عند تسجيل الدخول:
```
[WidgetToken] Saving token for widgets...
[WidgetToken] ✅ Token saved successfully
```

### عند تسجيل الخروج:
```
[WidgetToken] Removing token...
[WidgetToken] ✅ Token removed successfully
```

### عند تحديث الـ Token:
```
[WidgetToken] Saving token for widgets...
[WidgetToken] ✅ Token saved successfully
```

## 🎨 تخصيصات إضافية

### تغيير مدة صلاحية الـ Token

في Supabase Dashboard → Authentication → Settings:
- JWT expiry time: 3600 (ساعة واحدة)
- Refresh token expiry: 2592000 (30 يوم)

### إضافة Refresh Token

```typescript
// في useWidgetTokenSync hook
if (session?.refresh_token) {
  await WidgetToken.saveRefreshToken({ 
    token: session.refresh_token 
  });
}
```

## ✅ الخطوات التالية

1. ✅ تم إنشاء الـ Plugin
2. ✅ تم التكامل مع التطبيق
3. 📱 قم بـ `npx cap sync` للمزامنة
4. 🧪 اختبر على جهاز حقيقي
5. 🎯 أضف الـ Widget للشاشة الرئيسية

## 📚 مراجع

- [Capacitor Plugins](https://capacitorjs.com/docs/plugins)
- [Android EncryptedSharedPreferences](https://developer.android.com/reference/androidx/security/crypto/EncryptedSharedPreferences)
- [iOS App Groups](https://developer.apple.com/documentation/bundleresources/entitlements/com_apple_security_application-groups)
- [Supabase JWT](https://supabase.com/docs/guides/auth/sessions)

---

**ملاحظة هامة:** بعد إضافة الـ Plugin، يجب تشغيل:
```bash
npx cap sync
```
لمزامنة الكود مع الـ native platforms.

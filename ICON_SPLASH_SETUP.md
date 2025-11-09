# دليل تطبيق App Icon و Splash Screen

## 🎨 الصور المُنشأة

تم إنشاء التصاميل التالية:
- ✅ **App Icon**: `src/assets/app-icon-1024.png` (1024×1024px)
- ✅ **Splash Screen**: `src/assets/splash-screen.png` (1920×1920px)

---

## 📱 تطبيق الصور على Android

### 1. تحضير الأحجام المطلوبة

يحتاج Android لأحجام متعددة. استخدم أداة مثل [Android Asset Studio](https://romannurik.github.io/AndroidAssetStudio/icons-launcher.html) أو قم بتحجيم الصور يدوياً:

**App Icon (Launcher Icon):**
```
android/app/src/main/res/
  ├── mipmap-mdpi/ic_launcher.png (48×48)
  ├── mipmap-hdpi/ic_launcher.png (72×72)
  ├── mipmap-xhdpi/ic_launcher.png (96×96)
  ├── mipmap-xxhdpi/ic_launcher.png (144×144)
  └── mipmap-xxxhdpi/ic_launcher.png (192×192)
```

**كيفية التحضير:**
1. افتح `src/assets/app-icon-1024.png`
2. استخدم [Android Asset Studio](https://romannurik.github.io/AndroidAssetStudio/icons-launcher.html):
   - ارفع الصورة
   - اختر "Launcher Icons"
   - حمّل جميع الأحجام كملف ZIP
   - فك الضغط ونسخ المجلدات إلى `android/app/src/main/res/`

### 2. Splash Screen لـ Android

**الطريقة الحديثة (Android 12+):**

1. أنشئ ملف `android/app/src/main/res/values/splash.xml`:
```xml
<?xml version="1.0" encoding="utf-8"?>
<resources>
    <style name="Theme.App.SplashScreen" parent="Theme.SplashScreen">
        <item name="windowSplashScreenBackground">@color/splash_background</item>
        <item name="windowSplashScreenAnimatedIcon">@drawable/splash_icon</item>
        <item name="postSplashScreenTheme">@style/AppTheme</item>
    </style>
</resources>
```

2. أضف اللون في `android/app/src/main/res/values/colors.xml`:
```xml
<?xml version="1.0" encoding="utf-8"?>
<resources>
    <color name="splash_background">#1E40AF</color>
</resources>
```

3. ضع صورة Splash في `android/app/src/main/res/drawable/splash_icon.png` (حجم مناسب: 288×288)

4. حدّث `AndroidManifest.xml`:
```xml
<activity
    android:name=".MainActivity"
    android:theme="@style/Theme.App.SplashScreen"
    ...>
```

**الطريقة القديمة (متوافقة مع Android 11 وأقل):**

استخدم `capacitor-splash-screen` plugin (مُثبّت مسبقاً):

1. ضع الصور في:
```
android/app/src/main/res/
  ├── drawable-land-mdpi/splash.png (480×320)
  ├── drawable-land-hdpi/splash.png (800×480)
  ├── drawable-land-xhdpi/splash.png (1280×720)
  ├── drawable-land-xxhdpi/splash.png (1600×960)
  ├── drawable-land-xxxhdpi/splash.png (1920×1280)
  ├── drawable-port-mdpi/splash.png (320×480)
  ├── drawable-port-hdpi/splash.png (480×800)
  ├── drawable-port-xhdpi/splash.png (720×1280)
  ├── drawable-port-xxhdpi/splash.png (960×1600)
  └── drawable-port-xxxhdpi/splash.png (1280×1920)
```

2. حدّث `capacitor.config.ts`:
```typescript
plugins: {
  SplashScreen: {
    launchShowDuration: 2000,
    backgroundColor: '#1E40AF',
    showSpinner: false,
    androidScaleType: 'CENTER_CROP',
    splashFullScreen: true,
    splashImmersive: true
  }
}
```

### 3. بناء Android بعد التعديلات

```bash
npx cap sync android
cd android
./gradlew clean
./gradlew assembleDebug
```

---

## 🍎 تطبيق الصور على iOS

### 1. App Icon لـ iOS

1. افتح المشروع في Xcode:
```bash
npx cap open ios
```

2. في Navigator الأيسر:
   - `App` → `App` → `Assets.xcassets` → `AppIcon`

3. اسحب وأفلت صورة `src/assets/app-icon-1024.png` على مربع **App Store iOS 1024pt**

4. Xcode سيُنشئ جميع الأحجام المطلوبة تلقائياً

**أو استخدم أداة:**
- [App Icon Generator](https://appicon.co/)
- ارفع `app-icon-1024.png`
- حمّل iOS Icon Set
- استبدل محتويات `AppIcon.appiconset`

### 2. Splash Screen لـ iOS

**الطريقة 1 - LaunchScreen.storyboard (الأفضل):**

1. في Xcode، افتح `LaunchScreen.storyboard`

2. أضف UIImageView:
   - Drag Image View إلى الـ View Controller
   - اضبط Constraints: Leading=0, Trailing=0, Top=0, Bottom=0

3. أضف الصورة:
   - اسحب `src/assets/splash-screen.png` إلى `Assets.xcassets`
   - سمّها `SplashImage`
   - في Image View Properties، اختر `SplashImage`

4. اضبط Content Mode:
   - في Attributes Inspector
   - Content Mode: **Aspect Fill**

**الطريقة 2 - Solid Color Background (أبسط):**

1. في `LaunchScreen.storyboard`
2. حدد الـ View Controller
3. في Attributes Inspector → Background: اختر لون مشابه للتدرج (#1E40AF)
4. أضف UILabel بنص "Oryxa" في المنتصف مع تنسيق ذهبي

**تخصيص Duration في `capacitor.config.ts`:**
```typescript
plugins: {
  SplashScreen: {
    launchShowDuration: 2000,
    backgroundColor: '#1E40AF',
    showSpinner: false,
    iosSpinnerStyle: 'small',
    spinnerColor: '#FFD700'
  }
}
```

### 3. Build iOS بعد التعديلات

```bash
npx cap sync ios
npx cap open ios
# ثم في Xcode: Product → Build
```

---

## 🌐 تطبيق الأيقونة على PWA

تم بالفعل تحديث `index.html` لاستخدام:
- ✅ `/app-icon.png` كـ favicon
- ✅ `/app-icon.png` كـ Apple touch icon

للتأكد من PWA manifest، حدّث `public/manifest.webmanifest`:

```json
{
  "name": "Oryxa",
  "short_name": "Oryxa",
  "description": "منظم حياتك الذكي",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#1E40AF",
  "theme_color": "#1E40AF",
  "icons": [
    {
      "src": "/app-icon.png",
      "sizes": "1024x1024",
      "type": "image/png",
      "purpose": "any maskable"
    }
  ]
}
```

---

## ✅ Checklist نهائي

### Android:
- [ ] تحويل `app-icon-1024.png` لجميع أحجام mipmap
- [ ] نسخ الأحجام إلى `android/app/src/main/res/mipmap-*/`
- [ ] إعداد Splash Screen (Android 12+ أو القديمة)
- [ ] تشغيل `npx cap sync android`
- [ ] اختبار على emulator/جهاز

### iOS:
- [ ] فتح `npx cap open ios`
- [ ] إضافة App Icon في `Assets.xcassets/AppIcon`
- [ ] تخصيص `LaunchScreen.storyboard`
- [ ] تشغيل `npx cap sync ios`
- [ ] اختبار على Simulator/جهاز

### PWA:
- [x] تحديث `index.html` favicon
- [ ] تحديث `manifest.webmanifest`
- [ ] اختبار التثبيت على Mobile browser

---

## 🛠️ أدوات مفيدة

- **Android Asset Studio**: https://romannurik.github.io/AndroidAssetStudio/
- **App Icon Generator**: https://appicon.co/
- **Splash Screen Generator**: https://www.appicon.co/#app-icon
- **Icon Resizer**: https://resizeappicon.com/

---

## 🎨 الملفات المتاحة

- `src/assets/app-icon-1024.png` - الأيقونة الأساسية بدقة عالية
- `src/assets/splash-screen.png` - شاشة البداية بدقة عالية
- `public/app-icon.png` - نسخة للويب (Favicon/PWA)
- `public/splash-screen.png` - نسخة للويب

**ملاحظة:** يمكنك استخدام برامج مثل Photoshop أو GIMP أو أدوات أونلاين لتحجيم الصور يدوياً بدلاً من الأدوات المقترحة.

---

## 🚀 الخطوات التالية

1. Export المشروع إلى GitHub
2. Clone محلياً
3. طبّق الأيقونات والـ Splash Screens على Android و iOS
4. بناء APK/IPA
5. اختبار على أجهزة حقيقية!

# دليل بناء التطبيق Native - Android و iOS

## 📋 المتطلبات الأساسية

### لـ Android:
- **Android Studio** (Arctic Fox أو أحدث)
- **JDK 17 أو 21**
- **Android SDK 34**
- **Android Build Tools 34**
- نظام: Windows, macOS, أو Linux

### لـ iOS (macOS فقط):
- **macOS** (Monterey أو أحدث)
- **Xcode 15+**
- **Command Line Tools**
- **CocoaPods** (`sudo gem install cocoapods`)
- **حساب Apple Developer** (للنشر على App Store)

---

## 🚀 الخطوات التفصيلية

### الخطوة 1: تثبيت البيئة

#### Android Studio:
```bash
# تحميل من:
https://developer.android.com/studio

# بعد التثبيت، افتح Android Studio:
# Tools → SDK Manager → SDK Platforms → تأكد من تثبيت Android 14.0 (API 34)
# Tools → SDK Manager → SDK Tools → تأكد من تثبيت:
#   - Android SDK Build-Tools 34
#   - Android Emulator
#   - Android SDK Platform-Tools
```

#### تحديد JAVA_HOME:
```bash
# macOS/Linux (أضف لـ ~/.zshrc أو ~/.bashrc):
export JAVA_HOME=/Applications/Android\ Studio.app/Contents/jbr/Contents/Home

# Windows (System Environment Variables):
JAVA_HOME=C:\Program Files\Android\Android Studio\jbr
```

#### iOS (macOS فقط):
```bash
# تثبيت Xcode من App Store
# ثم تثبيت Command Line Tools:
xcode-select --install

# تثبيت CocoaPods:
sudo gem install cocoapods
pod setup
```

---

### الخطوة 2: Export المشروع من Lovable

1. اضغط على زر **GitHub** في أعلى يمين Lovable
2. اختر **Export to GitHub**
3. أنشئ Repository جديد (أو اختر موجود)
4. انتظر حتى يكتمل الـ export

---

### الخطوة 3: Clone المشروع محليًا

```bash
# استبدل YOUR_USERNAME و REPO_NAME باسم حسابك والمشروع
git clone https://github.com/YOUR_USERNAME/REPO_NAME.git
cd REPO_NAME

# تثبيت Dependencies
npm install
```

---

### الخطوة 4: Build المشروع

```bash
# بناء Web Assets
npm run build

# هذا ينشئ مجلد dist/ الذي سيستخدمه Capacitor
```

---

### الخطوة 5: إضافة Platforms

#### Android:
```bash
npx cap add android
```
هذا ينشئ:
- `android/` directory
- `android/app/src/main/java/.../MainActivity.kt`
- جميع ملفات Gradle اللازمة

#### iOS (macOS فقط):
```bash
npx cap add ios
```
هذا ينشئ:
- `ios/` directory
- `ios/App/App/AppDelegate.swift`
- جميع ملفات Xcode اللازمة

---

### الخطوة 6: تحديد مسار Android SDK

افتح `android/local.properties` وأضف:

#### macOS:
```properties
sdk.dir=/Users/YOUR_USERNAME/Library/Android/sdk
```

#### Windows:
```properties
sdk.dir=C:\\Users\\YOUR_USERNAME\\AppData\\Local\\Android\\Sdk
```

#### Linux:
```properties
sdk.dir=/home/YOUR_USERNAME/Android/Sdk
```

**كيف تعرف المسار؟**
- افتح Android Studio → Preferences/Settings → Appearance & Behavior → System Settings → Android SDK
- انسخ المسار من "Android SDK Location"

---

### الخطوة 7: Sync Platforms

```bash
npx cap sync
```
هذا ينسخ:
- Web assets من `dist/` إلى native projects
- Capacitor plugins
- Native configuration

---

### الخطوة 8: بناء Android APK

#### الطريقة 1 - عبر Command Line:
```bash
cd android

# Debug APK (للاختبار):
./gradlew assembleDebug
# النتيجة: android/app/build/outputs/apk/debug/app-debug.apk

# Release APK (للنشر):
./gradlew assembleRelease
# النتيجة: android/app/build/outputs/apk/release/app-release-unsigned.apk
```

#### الطريقة 2 - عبر Android Studio:
```bash
npx cap open android
```
ثم:
1. انتظر Gradle sync ينتهي
2. Build → Build Bundle(s)/APK(s) → Build APK(s)
3. افتح `app/build/outputs/apk/` لإيجاد الـ APK

---

### الخطوة 9: بناء iOS App (macOS فقط)

```bash
npx cap open ios
```

في Xcode:
1. اختر **Any iOS Device** أو emulator
2. **Product → Build**
3. للتشغيل على جهاز حقيقي:
   - وصل iPhone/iPad
   - اختره من القائمة
   - **Product → Run**
4. لإنشاء IPA للنشر:
   - **Product → Archive**
   - **Distribute App → App Store Connect**

---

### الخطوة 10: اختبار التطبيق

#### Android Emulator:
```bash
# قائمة emulators المتاحة:
emulator -list-avds

# تشغيل emulator:
emulator -avd EMULATOR_NAME

# أو مباشرة:
npx cap run android
```

#### Android Device:
1. فعّل **Developer Options** على الجهاز
2. فعّل **USB Debugging**
3. وصل الجهاز بكابل USB
4. `npx cap run android --target`

#### iOS Simulator:
```bash
npx cap run ios
```

#### iOS Device:
1. وصل iPhone/iPad
2. في Xcode: اختر الجهاز من القائمة
3. **Product → Run**
4. أول مرة: اذهب لـ Settings → General → VPN & Device Management وثق التطبيق

---

## 🔧 حل المشاكل الشائعة

### Android

#### ❌ "SDK location not found"
```bash
# أنشئ android/local.properties وأضف:
sdk.dir=/path/to/android/sdk
```

#### ❌ "Unsupported class file major version"
```bash
# تأكد من JAVA_HOME يشير لـ JDK 17:
java -version  # يجب أن يظهر 17.x

# إذا لا:
export JAVA_HOME=/path/to/jdk-17
```

#### ❌ Gradle build يفشل
```bash
cd android
./gradlew clean
./gradlew build --stacktrace
```

#### ❌ "Failed to install apk"
```bash
# امسح data التطبيق من الجهاز:
adb uninstall com.oryxa.app
# ثم أعد التثبيت
```

### iOS

#### ❌ "Pod install failed"
```bash
cd ios/App
pod repo update
pod install
```

#### ❌ Code signing error
1. Xcode → Signing & Capabilities
2. اختر **Team** (حساب Apple Developer)
3. اختر **Automatically manage signing**

#### ❌ "Module not found"
```bash
cd ios/App
pod deintegrate
pod install
```

---

## 📱 Features Native المُفعّلة

التطبيق يستخدم الـ plugins التالية:

- ✅ **@capacitor/preferences** - تخزين محلي
- ✅ **@capacitor/geolocation** - GPS و Location
- ✅ **@capacitor/local-notifications** - إشعارات محلية
- ✅ **Widget Token Plugin** - مزامنة JWT للـ widgets
- ✅ **Today Widget** - Android Home Screen Widget
- ✅ **iOS Today Extension** - iOS Widget

---

## 🎨 تخصيص التطبيق

### تغيير App Icon:

#### Android:
```
android/app/src/main/res/
  ├── mipmap-hdpi/ic_launcher.png (72x72)
  ├── mipmap-mdpi/ic_launcher.png (48x48)
  ├── mipmap-xhdpi/ic_launcher.png (96x96)
  ├── mipmap-xxhdpi/ic_launcher.png (144x144)
  └── mipmap-xxxhdpi/ic_launcher.png (192x192)
```

#### iOS:
في Xcode:
1. `ios/App/App/Assets.xcassets/AppIcon.appiconset/`
2. استبدل الصور (1024x1024 للـ App Store)

### تغيير Splash Screen:

#### Android:
```xml
<!-- android/app/src/main/res/values/styles.xml -->
<style name="AppTheme.NoActionBarLaunch" parent="AppTheme.NoActionBar">
    <item name="android:background">@drawable/splash</item>
</style>
```

#### iOS:
في Xcode:
1. `LaunchScreen.storyboard`
2. غير Background Color/Image

### تغيير App Name:

#### Android:
```xml
<!-- android/app/src/main/res/values/strings.xml -->
<string name="app_name">Oryxa</string>
```

#### iOS:
في Xcode:
1. TARGETS → App → General
2. Display Name: "Oryxa"

---

## 🚀 النشر

### Android - Google Play:

1. **إنشاء Keystore:**
```bash
keytool -genkey -v -keystore oryxa-release.keystore -alias oryxa -keyalg RSA -keysize 2048 -validity 10000
```

2. **تحديث android/gradle.properties:**
```properties
ORYXA_RELEASE_STORE_FILE=oryxa-release.keystore
ORYXA_RELEASE_KEY_ALIAS=oryxa
ORYXA_RELEASE_STORE_PASSWORD=YOUR_PASSWORD
ORYXA_RELEASE_KEY_PASSWORD=YOUR_PASSWORD
```

3. **تحديث android/app/build.gradle:**
```gradle
signingConfigs {
    release {
        storeFile file(ORYXA_RELEASE_STORE_FILE)
        storePassword ORYXA_RELEASE_STORE_PASSWORD
        keyAlias ORYXA_RELEASE_KEY_ALIAS
        keyPassword ORYXA_RELEASE_KEY_PASSWORD
    }
}
buildTypes {
    release {
        signingConfig signingConfigs.release
        // ...
    }
}
```

4. **بناء Release APK/AAB:**
```bash
cd android
./gradlew bundleRelease  # AAB (مطلوب للـ Play Store)
# أو
./gradlew assembleRelease  # APK
```

5. **رفع على Google Play Console:**
   - https://play.google.com/console
   - Create App → Upload AAB

### iOS - App Store:

1. **تحديد Bundle Identifier:**
   - Xcode → TARGETS → App → General
   - Bundle Identifier: `com.oryxa.app`

2. **إنشاء App في App Store Connect:**
   - https://appstoreconnect.apple.com
   - My Apps → + → New App

3. **Archive & Upload:**
   - Xcode → Product → Archive
   - Distribute App → App Store Connect
   - Upload

4. **Submit for Review:**
   - App Store Connect → TestFlight/App Store
   - Submit for Review

---

## 🔄 Workflow التطوير المستمر

```bash
# 1. تعديل code (في Lovable أو محليًا)
# 2. Build web assets
npm run build

# 3. Sync للـ native apps
npx cap sync

# 4. Test على emulator
npx cap run android
# أو
npx cap run ios

# 5. عند الاستعداد للنشر
cd android && ./gradlew bundleRelease
```

---

## 📚 موارد إضافية

- [Capacitor Documentation](https://capacitorjs.com/docs)
- [Android Developer Guide](https://developer.android.com)
- [iOS Developer Guide](https://developer.apple.com)
- [Google Play Console](https://play.google.com/console)
- [App Store Connect](https://appstoreconnect.apple.com)

---

## ✅ Checklist النهائي

قبل النشر، تأكد من:

- [ ] تغيير App Icon و Splash Screen
- [ ] تحديث App Name و Version
- [ ] اختبار على أجهزة حقيقية (Android و iOS)
- [ ] اختبار جميع الـ features (Location, Notifications, etc.)
- [ ] مراجعة Permissions في AndroidManifest.xml و Info.plist
- [ ] إنشاء Privacy Policy
- [ ] إعداد Screenshots للـ App Stores
- [ ] كتابة App Description
- [ ] اختبار In-App Purchases (إن وجدت)
- [ ] تفعيل Analytics
- [ ] إعداد Crash Reporting

---

## 🎉 مبروك!

تطبيقك الآن **Native كامل** وجاهز للنشر على Google Play و App Store! 🚀

لأي استفسار أو مشكلة، راجع قسم "حل المشاكل الشائعة" أو ابحث في:
- [Capacitor Community](https://ionic.io/community)
- [Stack Overflow](https://stackoverflow.com/questions/tagged/capacitor)

# دليل إعداد Android Studio و SDK - خطوة بخطوة

## 📋 نظرة عامة
هذا الدليل سيساعدك في:
- تثبيت Android Studio
- إعداد Android SDK
- تكوين JDK
- بناء أول APK لتطبيق Oryxa

---

## 📥 الخطوة 1: تحميل وتثبيت Android Studio

### Windows:

1. **تحميل Android Studio:**
   - اذهب إلى: https://developer.android.com/studio
   - اضغط **Download Android Studio**
   - احفظ الملف (حوالي 1 GB)

2. **التثبيت:**
   ```
   - افتح الملف المُحمّل: android-studio-xxxx.exe
   - اضغط Next → Next
   - اختر مسار التثبيت (افتراضي: C:\Program Files\Android\Android Studio)
   - تأكد من تحديد:
     ✅ Android Studio
     ✅ Android Virtual Device
   - اضغط Next → Install
   - انتظر (قد يأخذ 5-10 دقائق)
   - اضغط Finish
   ```

3. **أول تشغيل:**
   ```
   - سيفتح Setup Wizard
   - اختر "Standard" setup
   - اختر Theme (فاتح أو داكن)
   - اضغط Next
   - سيبدأ تحميل:
     • Android SDK
     • Android SDK Platform
     • Android Virtual Device
   - انتظر التحميل (2-4 GB)
   - اضغط Finish
   ```

### macOS:

1. **تحميل:**
   - https://developer.android.com/studio
   - حمّل ملف `.dmg`

2. **التثبيت:**
   ```
   - افتح ملف .dmg المُحمّل
   - اسحب Android Studio.app إلى مجلد Applications
   - افتح Android Studio من Applications
   - عند الطلب: اضغط Open
   - اتبع Setup Wizard (نفس خطوات Windows)
   ```

### Linux (Ubuntu/Debian):

```bash
# تحديث النظام
sudo apt update

# تحميل Android Studio
wget https://redirector.gvt1.com/edgedl/android/studio/ide-zips/2023.x.x.x/android-studio-2023.x.x.x-linux.tar.gz

# فك الضغط
tar -xvzf android-studio-*.tar.gz

# نقل إلى /opt
sudo mv android-studio /opt/

# تشغيل
cd /opt/android-studio/bin
./studio.sh
```

---

## 🛠️ الخطوة 2: تكوين Android SDK

### 1. فتح SDK Manager:
```
Android Studio → Welcome Screen → More Actions → SDK Manager
# أو إذا كان مشروع مفتوح:
Tools → SDK Manager
```

### 2. تثبيت SDK Platforms:
في تبويب **SDK Platforms**:
```
✅ Android 14.0 (API 34) - مطلوب للمشروع
✅ Android 13.0 (API 33)
✅ Android 12.0 (API 31)
✅ Android 11.0 (API 30)
```

اضغط **Show Package Details** وتأكد من:
```
✅ Android SDK Platform 34
✅ Sources for Android 34
✅ Google APIs Intel x86 Atom System Image (للـ Emulator)
```

### 3. تثبيت SDK Tools:
في تبويب **SDK Tools**:
```
✅ Android SDK Build-Tools 34.0.0
✅ Android SDK Command-line Tools (latest)
✅ Android Emulator
✅ Android SDK Platform-Tools
✅ Intel x86 Emulator Accelerator (HAXM installer) - Windows/macOS
✅ Google Play services
```

### 4. حفظ الإعدادات:
```
- اضغط Apply
- اضغط OK لتأكيد التحميل
- انتظر التحميل (قد يأخذ 10-20 دقيقة)
- اضغط Finish
```

### 5. نسخ مسار SDK:
```
في SDK Manager، ستجد:
Android SDK Location: /Users/USERNAME/Library/Android/sdk (macOS)
                     C:\Users\USERNAME\AppData\Local\Android\Sdk (Windows)
                     /home/USERNAME/Android/Sdk (Linux)

**⚠️ انسخ هذا المسار - ستحتاجه لاحقاً!**
```

---

## ☕ الخطوة 3: تكوين JDK

### التحقق من JDK المُثبت:

```bash
# افتح Terminal/Command Prompt
java -version
```

**النتيجة المطلوبة:**
```
openjdk version "17.0.x" أو "21.0.x"
```

### إذا لم يكن JDK مُثبتاً:

#### الطريقة 1: استخدام JDK المُدمج مع Android Studio (موصى به)

**Windows:**
```
C:\Program Files\Android\Android Studio\jbr
```

**macOS:**
```
/Applications/Android Studio.app/Contents/jbr/Contents/Home
```

**Linux:**
```
/opt/android-studio/jbr
```

#### الطريقة 2: تحميل JDK منفصل

```bash
# تحميل من:
https://adoptium.net/

# اختر:
- Version: 17 (LTS) أو 21 (LTS)
- Operating System: حسب نظامك
- Architecture: x64
```

### تعيين JAVA_HOME:

#### Windows:
```
1. افتح System Properties:
   - ابحث عن "Environment Variables" في Start Menu
   - أو: This PC → Properties → Advanced system settings

2. Environment Variables:
   - تحت System variables
   - اضغط New
   
3. أضف:
   Variable name: JAVA_HOME
   Variable value: C:\Program Files\Android\Android Studio\jbr

4. تعديل Path:
   - ابحث عن Path في System variables
   - اضغط Edit → New
   - أضف: %JAVA_HOME%\bin
   
5. OK → OK → OK

6. أعد فتح Command Prompt وتحقق:
   java -version
```

#### macOS/Linux:
```bash
# أضف إلى ~/.zshrc (macOS) أو ~/.bashrc (Linux):

# للـ JDK المُدمج:
export JAVA_HOME="/Applications/Android Studio.app/Contents/jbr/Contents/Home"

# أو للـ JDK المُنفصل:
export JAVA_HOME="/Library/Java/JavaVirtualMachines/temurin-17.jdk/Contents/Home"

# أضف إلى PATH:
export PATH="$JAVA_HOME/bin:$PATH"

# حفظ وتطبيق:
source ~/.zshrc  # أو source ~/.bashrc
```

**التحقق:**
```bash
echo $JAVA_HOME
java -version
```

---

## 📱 الخطوة 4: إنشاء Android Virtual Device (Emulator)

### 1. فتح AVD Manager:
```
Android Studio → Tools → Device Manager
# أو:
Welcome Screen → More Actions → Virtual Device Manager
```

### 2. إنشاء جهاز جديد:
```
1. اضغط "Create Device"

2. اختر Hardware:
   - Category: Phone
   - Device: Pixel 6 (موصى به)
   - اضغط Next

3. اختر System Image:
   - Release Name: Tiramisu (API 33) أو UpsideDownCake (API 34)
   - ABI: x86_64
   - إذا لم يكن مُحملاً: اضغط Download
   - انتظر التحميل
   - اضغط Next

4. Verify Configuration:
   - AVD Name: Pixel_6_API_34
   - Startup orientation: Portrait
   - اضغط Finish

5. تشغيل Emulator:
   - في Device Manager
   - اضغط ▶️ (Play) بجانب الجهاز المُنشأ
   - انتظر التشغيل (قد يأخذ 1-2 دقيقة في أول مرة)
```

### حل مشاكل Emulator الشائعة:

#### مشكلة HAXM (Windows/macOS):
```
إذا ظهر: "HAXM is not installed"

Windows:
1. SDK Manager → SDK Tools
2. ✅ Intel x86 Emulator Accelerator (HAXM)
3. Apply → OK
4. اذهب إلى: C:\Users\USERNAME\AppData\Local\Android\Sdk\extras\intel\Hardware_Accelerated_Execution_Manager
5. شغّل: intelhaxm-android.exe
6. اتبع التعليمات

macOS:
1. نفس الخطوات
2. قد تحتاج: System Preferences → Security & Privacy → Allow
```

#### استخدام ARM بدلاً من x86:
```
إذا فشل HAXM، اختر System Image بـ ARM بدلاً من x86_64
```

---

## 🔧 الخطوة 5: إعداد مشروع Oryxa

### 1. تحديد مسار SDK في المشروع:

في مجلد المشروع، أنشئ/حدّث `android/local.properties`:

**Windows:**
```properties
sdk.dir=C:\\Users\\YOUR_USERNAME\\AppData\\Local\\Android\\Sdk
```

**macOS:**
```properties
sdk.dir=/Users/YOUR_USERNAME/Library/Android/sdk
```

**Linux:**
```properties
sdk.dir=/home/YOUR_USERNAME/Android/Sdk
```

⚠️ **استبدل `YOUR_USERNAME` باسم المستخدم الفعلي!**

### 2. إضافة Android Platform:

```bash
# من مجلد المشروع الرئيسي
npx cap add android
```

هذا سينشئ:
```
android/
  ├── app/
  ├── gradle/
  ├── build.gradle
  ├── settings.gradle
  └── local.properties (أنت أنشأته)
```

### 3. تطبيق الأيقونات:

```bash
# استخدم Python script
python3 android-icon-generator.py
```

### 4. Sync Gradle:

```bash
npx cap sync android
```

---

## 🚀 الخطوة 6: فتح المشروع في Android Studio

### 1. فتح المشروع:
```
1. Android Studio → Open
2. انتقل إلى: your-project-folder/android
3. اضغط OK
```

### 2. Gradle Sync التلقائي:
```
- سيبدأ Gradle Sync تلقائياً
- انتظر حتى ينتهي (أول مرة: 5-15 دقيقة)
- إذا ظهرت أخطاء: انظر قسم "حل المشاكل" أدناه
```

### 3. اختيار Build Variant:
```
Build → Select Build Variant
- اختر "debug" للاختبار
- أو "release" للنشر النهائي
```

---

## 📦 الخطوة 7: بناء APK

### من Android Studio:

#### Debug APK (للاختبار):
```
1. Build → Build Bundle(s) / APK(s) → Build APK(s)
2. انتظر البناء (2-10 دقائق حسب جهازك)
3. عند الانتهاء: اضغط "locate" في النافذة
4. ستجد APK في: app/build/outputs/apk/debug/app-debug.apk
```

#### Release APK (للنشر):
```
1. Build → Build Bundle(s) / APK(s) → Build APK(s)
2. APK في: app/build/outputs/apk/release/app-release-unsigned.apk
```

### من Command Line:

```bash
cd android

# Debug APK
./gradlew assembleDebug
# النتيجة: app/build/outputs/apk/debug/app-debug.apk

# Release APK
./gradlew assembleRelease
# النتيجة: app/build/outputs/apk/release/app-release-unsigned.apk
```

---

## 🧪 الخطوة 8: اختبار التطبيق

### على Emulator:

#### من Android Studio:
```
1. تأكد من تشغيل Emulator (Device Manager → Play)
2. اختر الجهاز من القائمة العلوية
3. اضغط ▶️ Run
```

#### من Command Line:
```bash
# تشغيل مباشرة على emulator
npx cap run android
```

### على جهاز حقيقي:

#### إعداد الجهاز (Android):
```
1. على الجهاز:
   - Settings → About Phone
   - اضغط على "Build Number" 7 مرات
   - رسالة "You are now a developer!"

2. Settings → System → Developer Options:
   - ✅ Enable "USB Debugging"
   - ✅ Enable "Install via USB"

3. وصّل الجهاز بالكمبيوتر عبر USB

4. على الجهاز: قبل "Allow USB Debugging"
```

#### التشغيل:
```bash
# التحقق من اتصال الجهاز
adb devices
# يجب أن يظهر جهازك

# تشغيل التطبيق
npx cap run android --target DEVICE_ID
```

---

## 🆘 حل المشاكل الشائعة

### 1. "SDK location not found"

**الحل:**
```bash
# أنشئ android/local.properties:
sdk.dir=/path/to/android/sdk
```

**كيف تعرف المسار؟**
```
Android Studio → Tools → SDK Manager
انسخ "Android SDK Location"
```

### 2. "Unsupported class file major version"

**المشكلة:** JDK version خطأ

**الحل:**
```bash
# تحقق من JDK version
java -version

# يجب أن يكون: 17.x أو 21.x

# إذا كان مختلفاً:
# Windows:
set JAVA_HOME=C:\Program Files\Android\Android Studio\jbr

# macOS/Linux:
export JAVA_HOME="/Applications/Android Studio.app/Contents/jbr/Contents/Home"
```

### 3. "Gradle sync failed"

**الحل:**
```bash
cd android

# نظّف المشروع
./gradlew clean

# أعد المحاولة
./gradlew build --stacktrace
```

### 4. "Could not resolve dependencies"

**الحل:**
```bash
# تأكد من اتصال الإنترنت
# ثم:
cd android
./gradlew --refresh-dependencies
```

### 5. Emulator بطيء جداً

**الحل:**
```
1. تأكد من تثبيت HAXM (Windows/macOS)
2. أو استخدم ARM System Image
3. قلل RAM المخصص للـ Emulator:
   - Device Manager → Edit Device
   - Advanced Settings → RAM: 2048 MB
```

### 6. "Installation failed with message Failed to finalize session"

**الحل:**
```bash
# امسح التطبيق من الجهاز/emulator
adb uninstall com.oryxa.app

# أعد التثبيت
npx cap run android
```

---

## ✅ Checklist نهائي

قبل البناء، تأكد من:

- [ ] Android Studio مُثبت ومُحدّث
- [ ] Android SDK 34 مُثبت
- [ ] Build Tools 34 مُثبت
- [ ] JDK 17 أو 21 مُثبت ومُعيّن في JAVA_HOME
- [ ] `android/local.properties` يحتوي على `sdk.dir` صحيح
- [ ] تم تشغيل `npx cap add android`
- [ ] تم تشغيل `npx cap sync android`
- [ ] Gradle Sync نجح في Android Studio
- [ ] Emulator يعمل (أو جهاز حقيقي متصل)

---

## 🎓 موارد إضافية

- [Android Studio User Guide](https://developer.android.com/studio/intro)
- [Android SDK Documentation](https://developer.android.com/studio/releases/platforms)
- [Capacitor Android Documentation](https://capacitorjs.com/docs/android)
- [Gradle Documentation](https://docs.gradle.org/)

---

## 🎉 تهانينا!

إذا وصلت هنا ونجحت جميع الخطوات، فأنت الآن جاهز لـ:
- ✅ بناء APK لتطبيق Oryxa
- ✅ اختبار التطبيق على Emulator
- ✅ اختبار التطبيق على جهاز حقيقي
- ✅ النشر على Google Play Store

**الخطوة التالية:** بناء APK واختباره! 🚀

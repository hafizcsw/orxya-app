# 🚀 دليل سريع - بناء APK في 5 خطوات

## قبل البدء - تأكد من:
✅ Android Studio مثبت ومفتوح  
✅ تم تشغيل `npm install` و `npm run build`  
✅ تم تشغيل `npx cap add android`  

---

## 📱 الخطوة 1: تكوين مسار Android SDK

**افتح ملف:** `android/local.properties`

**أضف السطر المناسب لنظامك:**

### Windows:
```properties
sdk.dir=C:\\Users\\YOUR_USERNAME\\AppData\\Local\\Android\\Sdk
```

### macOS:
```properties
sdk.dir=/Users/YOUR_USERNAME/Library/Android/sdk
```

### Linux:
```properties
sdk.dir=/home/YOUR_USERNAME/Android/Sdk
```

**⚠️ استبدل `YOUR_USERNAME` باسم المستخدم الفعلي!**

### كيف تعرف مسار SDK الصحيح؟
```
1. افتح Android Studio
2. Tools → SDK Manager
3. انسخ "Android SDK Location" من أعلى النافذة
4. الصقه في local.properties
```

---

## 📂 الخطوة 2: فتح المشروع في Android Studio

```
1. Android Studio → Open
2. انتقل إلى مجلد المشروع
3. اختر المجلد: android/
4. اضغط OK
```

**سيبدأ Gradle Sync تلقائياً** (انتظر 2-5 دقائق في أول مرة)

---

## 🔧 الخطوة 3: Sync المشروع (إن لم يتم تلقائياً)

في Terminal داخل مجلد المشروع الرئيسي:

```bash
npx cap sync android
```

أو في Android Studio:
```
File → Sync Project with Gradle Files
```

---

## 🏗️ الخطوة 4: بناء APK

### الطريقة 1: من Android Studio (موصى به)

```
1. Build → Build Bundle(s) / APK(s) → Build APK(s)
2. انتظر البناء (2-10 دقائق)
3. عند الانتهاء: اضغط "locate"
4. ستجد APK في: android/app/build/outputs/apk/debug/app-debug.apk
```

### الطريقة 2: من Command Line (أسرع)

```bash
cd android
./gradlew assembleDebug
```

**النتيجة:**  
`android/app/build/outputs/apk/debug/app-debug.apk`

---

## 🧪 الخطوة 5: اختبار APK

### على Emulator:

```bash
# من مجلد المشروع الرئيسي
npx cap run android
```

### على جهاز حقيقي:

```
1. على الجهاز: Settings → About Phone
2. اضغط "Build Number" 7 مرات
3. Settings → Developer Options
4. ✅ Enable "USB Debugging"
5. وصّل الجهاز بالكمبيوتر
6. على الجهاز: قبل "Allow USB Debugging"
7. في Terminal:
```

```bash
adb devices          # للتحقق من اتصال الجهاز
npx cap run android  # لتشغيل التطبيق
```

---

## ❌ حل المشاكل الشائعة

### مشكلة: "SDK location not found"
**الحل:**
```bash
# تأكد من وجود android/local.properties
# وأن المسار صحيح (انسخه من SDK Manager)
```

### مشكلة: Gradle Sync فشل
**الحل:**
```bash
cd android
./gradlew clean
./gradlew build --stacktrace
```

### مشكلة: Java version خطأ
**الحل:**
```bash
# تحقق من النسخة
java -version

# يجب أن تكون: 17.x أو 21.x
# إن لم تكن، اضبط JAVA_HOME:

# Windows:
set JAVA_HOME=C:\Program Files\Android\Android Studio\jbr

# macOS/Linux:
export JAVA_HOME="/Applications/Android Studio.app/Contents/jbr/Contents/Home"
```

---

## ✅ Checklist سريع

قبل بناء APK، تأكد:

- [ ] ملف `android/local.properties` موجود ويحتوي على `sdk.dir`
- [ ] تم تشغيل `npm install` و `npm run build`
- [ ] تم تشغيل `npx cap sync android`
- [ ] Gradle Sync نجح في Android Studio (لا توجد أخطاء حمراء)
- [ ] Android SDK 34 و Build Tools 34 مثبتة

---

## 📚 موارد إضافية

- **دليل كامل ومفصل:** راجع `ANDROID_STUDIO_SETUP.md`
- **مشاكل معقدة:** راجع قسم "حل المشاكل" في الدليل الكامل

---

## 🎉 تهانينا!

إذا نجحت الخطوات، لديك الآن:
- ✅ APK جاهز للاختبار في: `android/app/build/outputs/apk/debug/app-debug.apk`
- ✅ يمكنك تثبيته على أي جهاز Android
- ✅ جاهز للاختبار والتطوير

**الخطوة التالية:** اختبر APK على جهازك أو emulator! 🚀

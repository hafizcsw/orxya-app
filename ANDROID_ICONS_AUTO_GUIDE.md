# دليل إنشاء أحجام Android تلقائياً

## 🎯 المشكلة
أدوات توليد الصور بالـ AI لا تدعم إنشاء صور بأحجام صغيرة (أقل من 512px)، لذا نحتاج لاستخدام أدوات تحجيم الصور.

## ✅ الحلول المتاحة

### الحل 1: استخدام سكريبت Python التلقائي (الأسهل)

#### المتطلبات:
```bash
# تثبيت Python (إذا لم يكن مُثبتاً)
# Python عادة مُثبت مسبقاً على macOS و Linux

# تثبيت Pillow (مكتبة معالجة الصور)
pip install Pillow
# أو
pip3 install Pillow
```

#### الاستخدام:
```bash
# من مجلد المشروع الرئيسي
python3 android-icon-generator.py

# أو مباشرة
chmod +x android-icon-generator.py
./android-icon-generator.py
```

**النتيجة:**
```
✅ جميع الأحجام المطلوبة ستُنشأ تلقائياً في:
android/app/src/main/res/
  ├── mipmap-mdpi/ic_launcher.png (48x48)
  ├── mipmap-hdpi/ic_launcher.png (72x72)
  ├── mipmap-xhdpi/ic_launcher.png (96x96)
  ├── mipmap-xxhdpi/ic_launcher.png (144x144)
  └── mipmap-xxxhdpi/ic_launcher.png (192x192)
```

---

### الحل 2: استخدام سكريبت Bash (لـ macOS/Linux)

#### المتطلبات:
```bash
# تثبيت ImageMagick
# macOS:
brew install imagemagick

# Ubuntu/Debian:
sudo apt-get install imagemagick

# Fedora/CentOS:
sudo yum install imagemagick
```

#### الاستخدام:
```bash
# من مجلد المشروع الرئيسي
chmod +x android-icon-generator.sh
./android-icon-generator.sh
```

---

### الحل 3: استخدام أدوات أونلاين (بدون تنصيب)

#### Android Asset Studio (الأفضل):
1. افتح: https://romannurik.github.io/AndroidAssetStudio/icons-launcher.html
2. ارفع ملف `src/assets/app-icon-1024.png`
3. اختر الإعدادات:
   - Name: `ic_launcher`
   - Shape: Square أو Circle (حسب الرغبة)
   - Padding: 0% (لأن الصورة جاهزة)
4. اضغط **Download**
5. فك ضغط الملف الناتج
6. انسخ مجلدات `mipmap-*` إلى `android/app/src/main/res/`

#### App Icon Generator:
1. افتح: https://appicon.co/
2. ارفع `src/assets/app-icon-1024.png`
3. اختر **Android**
4. حمّل النتيجة
5. انسخ الملفات إلى المسارات الصحيحة

---

### الحل 4: استخدام Photoshop/GIMP يدوياً

#### في Photoshop:
1. افتح `src/assets/app-icon-1024.png`
2. Image → Image Size
3. غيّر Width و Height إلى الحجم المطلوب
4. تأكد من تفعيل **Resample: Bicubic Sharper**
5. Save for Web (PNG-24)
6. كرر العملية لكل حجم

#### في GIMP (مجاني):
1. افتح `src/assets/app-icon-1024.png`
2. Image → Scale Image
3. أدخل Width: 48 (سيتغير Height تلقائياً)
4. Interpolation: **Cubic**
5. Scale → Export As → PNG
6. كرر لكل حجم

---

## 📏 الأحجام المطلوبة بالتفصيل

| الكثافة | الحجم | الملف |
|---------|------|-------|
| mdpi | 48×48 | `android/app/src/main/res/mipmap-mdpi/ic_launcher.png` |
| hdpi | 72×72 | `android/app/src/main/res/mipmap-hdpi/ic_launcher.png` |
| xhdpi | 96×96 | `android/app/src/main/res/mipmap-xhdpi/ic_launcher.png` |
| xxhdpi | 144×144 | `android/app/src/main/res/mipmap-xxhdpi/ic_launcher.png` |
| xxxhdpi | 192×192 | `android/app/src/main/res/mipmap-xxxhdpi/ic_launcher.png` |

---

## 🚀 بعد إنشاء الأيقونات

### 1. تأكد من وجود الملفات:
```bash
ls -la android/app/src/main/res/mipmap-*/ic_launcher.png
```

يجب أن ترى 5 ملفات.

### 2. Sync مع Capacitor:
```bash
npx cap sync android
```

### 3. Build التطبيق:
```bash
cd android
./gradlew assembleDebug
```

### 4. اختبار على Emulator:
```bash
npx cap run android
```

---

## 🎨 Round Icon (اختياري)

Android يدعم أيقونات دائرية أيضاً. لإنشائها:

### باستخدام Python Script:
أضف هذا للسكريبت:

```python
# Generate round icons
for density, size in SIZES.items():
    output_path = os.path.join(OUTPUT_DIR, density, "ic_launcher_round.png")
    
    # Create circular mask
    mask = Image.new('L', (size, size), 0)
    draw = ImageDraw.Draw(mask)
    draw.ellipse((0, 0, size, size), fill=255)
    
    # Apply mask
    resized = source_img.resize((size, size), Image.Resampling.LANCZOS)
    output = Image.new('RGBA', (size, size))
    output.paste(resized, (0, 0))
    output.putalpha(mask)
    
    output.save(output_path, "PNG")
```

### أو استخدم Android Asset Studio:
- في الموقع، اختر **Shape: Circle**
- سيُنشئ ملفات `ic_launcher_round.png` تلقائياً

---

## ✅ Checklist نهائي

- [ ] تثبيت Python + Pillow أو ImageMagick
- [ ] تشغيل سكريبت التحويل التلقائي
- [ ] التأكد من وجود جميع الأحجام الـ 5
- [ ] (اختياري) إنشاء Round Icons
- [ ] `npx cap sync android`
- [ ] بناء APK واختباره
- [ ] التأكد من ظهور الأيقونة الجديدة على الجهاز

---

## 🔄 تحديث الأيقونة لاحقاً

إذا أردت تغيير التصميم:

1. عدّل أو استبدل `src/assets/app-icon-1024.png`
2. أعد تشغيل السكريبت:
   ```bash
   python3 android-icon-generator.py
   ```
3. Sync و Build:
   ```bash
   npx cap sync android
   cd android && ./gradlew assembleDebug
   ```

---

## 🆘 حل المشاكل

### "No module named PIL"
```bash
pip install Pillow --upgrade
# أو
pip3 install Pillow --user
```

### "convert: command not found"
```bash
# macOS
brew install imagemagick

# Linux
sudo apt-get install imagemagick
```

### الأيقونة لا تظهر على الجهاز
```bash
# امسح التطبيق من الجهاز تماماً
adb uninstall com.oryxa.app

# أعد التثبيت
npx cap run android
```

### الأيقونة القديمة ما زالت تظهر
```bash
# نظف الـ cache
cd android
./gradlew clean

# أعد البناء
./gradlew assembleDebug
```

---

## 📚 روابط مفيدة

- [Android Asset Studio](https://romannurik.github.io/AndroidAssetStudio/)
- [App Icon Generator](https://appicon.co/)
- [ImageMagick Documentation](https://imagemagick.org/)
- [Pillow Documentation](https://pillow.readthedocs.io/)
- [Android Icon Guidelines](https://developer.android.com/guide/practices/ui_guidelines/icon_design_launcher)

---

## 🎉 الخلاصة

**الطريقة الموصى بها:**
1. استخدم Python Script (`android-icon-generator.py`) - أسهل وأسرع
2. أو استخدم Android Asset Studio - بدون تنصيب

**نتيجة:** 5 أحجام مختلفة بجودة عالية جاهزة للاستخدام في APK!

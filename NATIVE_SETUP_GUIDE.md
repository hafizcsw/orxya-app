# 🚀 دليل إعداد Oryxa Native مع Wake Word

هذا الدليل يشرح كيفية تحويل تطبيق Oryxa إلى تطبيق أصلي (Native) يعمل على Android وiOS مع ميزة Wake Word "يا أوريكسا".

## 📋 المتطلبات الأساسية

### للجميع:
- ✅ Node.js 18+ مثبت
- ✅ Git مثبت
- ✅ حساب Picovoice (للحصول على Access Key)

### لـ Android:
- ✅ Android Studio مثبت
- ✅ Java Development Kit (JDK) 17+
- ✅ Android SDK Platform 33+

### لـ iOS (Mac فقط):
- ✅ macOS مع Xcode 14+
- ✅ CocoaPods مثبت (`sudo gem install cocoapods`)
- ✅ iOS Deployment Target: 13.0+

---

## 🎯 الخطوة 1: التصدير من Lovable

1. في محرر Lovable، اضغط على **GitHub** في الأعلى
2. اختر **Export to GitHub** أو **Connect to GitHub**
3. اختر اسم المستودع (Repository)
4. انتظر حتى يكتمل التصدير

---

## 💻 الخطوة 2: Clone المشروع محلياً

```bash
# استبدل <username> و <repo-name> بمعلوماتك
git clone https://github.com/<username>/<repo-name>.git
cd <repo-name>
```

---

## 📦 الخطوة 3: تثبيت Dependencies

```bash
# تثبيت dependencies الأساسية
npm install

# تثبيت Capacitor
npm install @capacitor/core @capacitor/cli @capacitor/android @capacitor/ios --save
```

---

## 🔧 الخطوة 4: إعداد Capacitor

```bash
# تهيئة Capacitor
npx cap init

# عند السؤال:
# App name: Oryxa
# App ID: com.oryxa.app
# (اضغط Enter لقبول القيم الافتراضية الأخرى)

# إضافة المنصات
npx cap add android
npx cap add ios
```

✅ الآن لديك مجلدات `android/` و `ios/`!

---

## 📱 الخطوة 5: إعداد Android

### 5.1 نسخ ملفات Kotlin

انسخ الملفات التالية للمسارات المحددة:

#### **android/app/src/main/java/com/oryxa/app/WakeWordPlugin.kt**
```kotlin
package com.oryxa.app

import android.Manifest
import android.content.Intent
import android.content.pm.PackageManager
import androidx.core.app.ActivityCompat
import androidx.core.content.ContextCompat
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.CapacitorPlugin
import com.getcapacitor.annotation.Permission
import ai.picovoice.porcupine.*

@CapacitorPlugin(
    name = "WakeWord",
    permissions = [
        Permission(strings = [Manifest.permission.RECORD_AUDIO], alias = "audio"),
        Permission(strings = [Manifest.permission.FOREGROUND_SERVICE], alias = "foreground"),
        Permission(strings = [Manifest.permission.FOREGROUND_SERVICE_MICROPHONE], alias = "foreground_mic")
    ]
)
class WakeWordPlugin : Plugin() {
    private var porcupineManager: PorcupineManager? = null
    
    @PluginMethod
    fun startListening(call: PluginCall) {
        val accessKey = call.getString("accessKey")
        if (accessKey == null) {
            call.reject("Access key required")
            return
        }
        
        if (!hasRequiredPermissions()) {
            requestPermissionForAlias("audio", call, "permissionCallback")
            return
        }
        
        try {
            val builder = PorcupineManager.Builder()
                .setAccessKey(accessKey)
            
            val builtIn = call.getString("builtInKeyword")
            val custom = call.getString("customKeywordPath")
            
            when {
                builtIn != null -> {
                    val keyword = when (builtIn.uppercase()) {
                        "BUMBLEBEE" -> Porcupine.BuiltInKeyword.BUMBLEBEE
                        "PORCUPINE" -> Porcupine.BuiltInKeyword.PORCUPINE
                        "PICOVOICE" -> Porcupine.BuiltInKeyword.PICOVOICE
                        "JARVIS" -> Porcupine.BuiltInKeyword.JARVIS
                        "ALEXA" -> Porcupine.BuiltInKeyword.ALEXA
                        else -> Porcupine.BuiltInKeyword.PORCUPINE
                    }
                    builder.setKeyword(keyword)
                }
                custom != null -> {
                    builder.setKeywordPath(custom)
                }
                else -> {
                    builder.setKeyword(Porcupine.BuiltInKeyword.PORCUPINE)
                }
            }
            
            val sensitivity = call.getFloat("sensitivity") ?: 0.5f
            builder.setSensitivity(sensitivity)
            
            porcupineManager = builder.build(
                context,
                { keywordIndex ->
                    notifyListeners("wakeWordDetected", mapOf("keyword" to "oryxa"))
                }
            )
            
            porcupineManager?.start()
            
            val enableBackground = call.getBoolean("enableBackground") ?: false
            if (enableBackground) {
                val serviceIntent = Intent(context, WakeWordService::class.java)
                serviceIntent.putExtra("accessKey", accessKey)
                serviceIntent.putExtra("keyword", builtIn ?: "")
                serviceIntent.putExtra("customPath", custom ?: "")
                serviceIntent.putExtra("sensitivity", sensitivity)
                ContextCompat.startForegroundService(context, serviceIntent)
            }
            
            call.resolve(mapOf("success" to true))
        } catch (e: Exception) {
            call.reject("Failed to start: ${e.message}", e)
        }
    }
    
    @PluginMethod
    fun stopListening(call: PluginCall) {
        try {
            porcupineManager?.stop()
            porcupineManager?.delete()
            porcupineManager = null
            
            val serviceIntent = Intent(context, WakeWordService::class.java)
            context.stopService(serviceIntent)
            
            call.resolve()
        } catch (e: Exception) {
            call.reject("Failed to stop: ${e.message}", e)
        }
    }
    
    private fun hasRequiredPermissions(): Boolean {
        return ActivityCompat.checkSelfPermission(
            context,
            Manifest.permission.RECORD_AUDIO
        ) == PackageManager.PERMISSION_GRANTED
    }
}
```

#### **android/app/src/main/java/com/oryxa/app/WakeWordService.kt**
```kotlin
package com.oryxa.app

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Intent
import android.os.Build
import android.os.IBinder
import androidx.core.app.NotificationCompat
import ai.picovoice.porcupine.*

class WakeWordService : Service() {
    private var porcupineManager: PorcupineManager? = null
    
    override fun onCreate() {
        super.onCreate()
        createNotificationChannel()
    }
    
    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        startForeground(NOTIFICATION_ID, createNotification())
        
        intent?.let {
            val accessKey = it.getStringExtra("accessKey") ?: return START_STICKY
            val keyword = it.getStringExtra("keyword")
            val customPath = it.getStringExtra("customPath")
            val sensitivity = it.getFloatExtra("sensitivity", 0.5f)
            
            try {
                val builder = PorcupineManager.Builder()
                    .setAccessKey(accessKey)
                    .setSensitivity(sensitivity)
                
                if (!keyword.isNullOrEmpty()) {
                    val builtIn = when (keyword.uppercase()) {
                        "BUMBLEBEE" -> Porcupine.BuiltInKeyword.BUMBLEBEE
                        "PORCUPINE" -> Porcupine.BuiltInKeyword.PORCUPINE
                        "PICOVOICE" -> Porcupine.BuiltInKeyword.PICOVOICE
                        "JARVIS" -> Porcupine.BuiltInKeyword.JARVIS
                        "ALEXA" -> Porcupine.BuiltInKeyword.ALEXA
                        else -> Porcupine.BuiltInKeyword.PORCUPINE
                    }
                    builder.setKeyword(builtIn)
                } else if (!customPath.isNullOrEmpty()) {
                    builder.setKeywordPath(customPath)
                }
                
                porcupineManager = builder.build(
                    applicationContext,
                    { keywordIndex ->
                        val broadcastIntent = Intent("com.oryxa.app.WAKE_WORD_DETECTED")
                        sendBroadcast(broadcastIntent)
                    }
                )
                
                porcupineManager?.start()
            } catch (e: Exception) {
                e.printStackTrace()
                stopSelf()
            }
        }
        
        return START_STICKY
    }
    
    override fun onDestroy() {
        super.onDestroy()
        porcupineManager?.stop()
        porcupineManager?.delete()
        porcupineManager = null
    }
    
    override fun onBind(intent: Intent?): IBinder? = null
    
    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                CHANNEL_ID,
                "Wake Word Listening",
                NotificationManager.IMPORTANCE_LOW
            ).apply {
                description = "أوريكسا في وضع الاستماع"
                setShowBadge(false)
            }
            
            val manager = getSystemService(NotificationManager::class.java)
            manager.createNotificationChannel(channel)
        }
    }
    
    private fun createNotification(): Notification {
        val intent = packageManager.getLaunchIntentForPackage(packageName)
        val pendingIntent = PendingIntent.getActivity(
            this,
            0,
            intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )
        
        return NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle("أوريكسا في وضع الاستماع")
            .setContentText("قل 'يا أوريكسا' للتفعيل")
            .setSmallIcon(android.R.drawable.ic_btn_speak_now)
            .setContentIntent(pendingIntent)
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .setOngoing(true)
            .build()
    }
    
    companion object {
        const val NOTIFICATION_ID = 1001
        const val CHANNEL_ID = "wake_word_channel"
    }
}
```

### 5.2 تعديل build.gradle

افتح `android/app/build.gradle` وأضف:

```gradle
dependencies {
    // ... الاعتماديات الموجودة
    
    implementation 'ai.picovoice:porcupine-android:3.0.2'
}
```

### 5.3 تعديل AndroidManifest.xml

افتح `android/app/src/main/AndroidManifest.xml` وأضف:

```xml
<manifest xmlns:android="http://schemas.android.com/apk/res/android">
    
    <!-- إضافة الصلاحيات -->
    <uses-permission android:name="android.permission.RECORD_AUDIO" />
    <uses-permission android:name="android.permission.FOREGROUND_SERVICE" />
    <uses-permission android:name="android.permission.FOREGROUND_SERVICE_MICROPHONE" />
    <uses-permission android:name="android.permission.POST_NOTIFICATIONS" />
    
    <application>
        <!-- ... المحتوى الموجود -->
        
        <!-- إضافة الخدمة قبل </application> -->
        <service
            android:name=".WakeWordService"
            android:foregroundServiceType="microphone"
            android:exported="false" />
    </application>
</manifest>
```

---

## 🍎 الخطوة 6: إعداد iOS

### 6.1 تعديل Podfile

افتح `ios/App/Podfile` وأضف:

```ruby
platform :ios, '13.0'
use_frameworks!

target 'App' do
  # ... الاعتماديات الموجودة
  
  pod 'Porcupine-iOS', '~> 3.0.0'
end
```

ثم نفّذ:
```bash
cd ios/App
pod install
cd ../..
```

### 6.2 إنشاء WakeWordPlugin.swift

أنشئ مجلد `ios/App/App/Plugins/` ثم أنشئ ملف `WakeWordPlugin.swift`:

```swift
import Foundation
import Capacitor
import Porcupine

@objc(WakeWordPlugin)
public class WakeWordPlugin: CAPPlugin {
    private var porcupineManager: PorcupineManager?
    
    @objc func startListening(_ call: CAPPluginCall) {
        guard let accessKey = call.getString("accessKey") else {
            call.reject("Access key required")
            return
        }
        
        do {
            let builtIn = call.getString("builtInKeyword")
            let customPath = call.getString("customKeywordPath")
            let sensitivity = call.getFloat("sensitivity") ?? 0.5
            
            if let keywordName = builtIn {
                let keyword: Porcupine.BuiltinKeyword
                switch keywordName.uppercased() {
                case "BUMBLEBEE":
                    keyword = .bumblebee
                case "PORCUPINE":
                    keyword = .porcupine
                case "PICOVOICE":
                    keyword = .picovoice
                case "JARVIS":
                    keyword = .jarvis
                case "ALEXA":
                    keyword = .alexa
                default:
                    keyword = .porcupine
                }
                
                porcupineManager = try PorcupineManager(
                    accessKey: accessKey,
                    keyword: keyword,
                    sensitivity: sensitivity,
                    onDetection: { [weak self] keywordIndex in
                        self?.notifyListeners("wakeWordDetected", data: ["keyword": "oryxa"])
                    }
                )
            } else if let ppnPath = customPath {
                porcupineManager = try PorcupineManager(
                    accessKey: accessKey,
                    keywordPath: ppnPath,
                    sensitivity: sensitivity,
                    onDetection: { [weak self] keywordIndex in
                        self?.notifyListeners("wakeWordDetected", data: ["keyword": "oryxa"])
                    }
                )
            } else {
                porcupineManager = try PorcupineManager(
                    accessKey: accessKey,
                    keyword: .porcupine,
                    sensitivity: sensitivity,
                    onDetection: { [weak self] keywordIndex in
                        self?.notifyListeners("wakeWordDetected", data: ["keyword": "oryxa"])
                    }
                )
            }
            
            try porcupineManager?.start()
            call.resolve(["success": true])
            
        } catch {
            call.reject("Failed to start: \(error.localizedDescription)", nil, error)
        }
    }
    
    @objc func stopListening(_ call: CAPPluginCall) {
        do {
            porcupineManager?.stop()
            porcupineManager?.delete()
            porcupineManager = nil
            call.resolve()
        } catch {
            call.reject("Failed to stop: \(error.localizedDescription)", nil, error)
        }
    }
}
```

### 6.3 تعديل Info.plist

افتح `ios/App/App/Info.plist` وأضف:

```xml
<key>NSMicrophoneUsageDescription</key>
<string>أوريكسا تحتاج للميكروفون للاستماع لأمرك الصوتي</string>

<key>UIBackgroundModes</key>
<array>
    <string>audio</string>
</array>
```

---

## 🔑 الخطوة 7: الحصول على Picovoice Access Key

1. اذهب إلى https://console.picovoice.ai
2. سجّل حساب مجاني
3. أنشئ مشروع جديد
4. انسخ **Access Key** من لوحة التحكم
5. (اختياري) أنشئ wake word مخصص "أوريكسا" وحمّل ملف `.ppn`

---

## 🏗️ الخطوة 8: Build & Sync

```bash
# Build الـ web app
npm run build

# Sync للمنصات
npx cap sync
```

---

## 📱 الخطوة 9: التشغيل والاختبار

### Android:
```bash
# طريقة 1: من Terminal
npx cap run android

# طريقة 2: من Android Studio
npx cap open android
# ثم اضغط Run في Android Studio
```

### iOS (Mac فقط):
```bash
npx cap open ios
# في Xcode: اختر جهاز/محاكي ثم اضغط Run
```

---

## ✅ الاختبار النهائي

1. افتح التطبيق على الجهاز
2. اذهب إلى **الإعدادات** → **عام**
3. مرّر للأسفل إلى قسم **الأوامر الصوتية**
4. أدخل **Picovoice Access Key**
5. اضغط **اختبار Wake Word**
6. قل "**BUMBLEBEE**"
7. يجب أن تظهر رسالة نجاح ✅

8. اذهب إلى صفحة **المساعد الصوتي**
9. فعّل **Wake Word Toggle**
10. قل "**BUMBLEBEE**" مرة أخرى
11. يجب أن تسمع "نعم؟" وتبدأ التسجيل تلقائياً!

---

## 🐛 حل المشاكل الشائعة

### Android:
- **خطأ Gradle**: تأكد من JDK 17+ مثبت
- **Permission denied**: امنح صلاحية الميكروفون يدوياً من إعدادات الجهاز
- **Service crash**: تحقق من `foregroundServiceType` في Manifest

### iOS:
- **Pod install فشل**: شغّل `pod repo update` ثم أعد المحاولة
- **Signing error**: حدد Development Team في Xcode
- **Mic permission**: يجب أن يكون `NSMicrophoneUsageDescription` موجود

---

## 📚 موارد إضافية

- [Capacitor Docs](https://capacitorjs.com/docs)
- [Picovoice Docs](https://picovoice.ai/docs/)
- [Android Foreground Services](https://developer.android.com/develop/background-work/services/foreground-services)
- [iOS Background Audio](https://developer.apple.com/documentation/avfoundation/media_playback/configuring_your_app_for_media_playback)

---

## 💡 الخطوات التالية

- إنشاء wake word مخصص "أوريكسا" من Picovoice Console
- إضافة App Shortcuts لـ iOS (Siri Integration)
- تحسين Battery Optimization
- إضافة Voice Activity Detection (VAD)

---

**تم إنشاء هذا الدليل بواسطة Lovable AI Assistant 🤖**

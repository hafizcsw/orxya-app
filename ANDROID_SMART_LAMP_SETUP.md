# Android Smart Lamp Setup Guide

## Overview
دليل كامل لإعداد Smart Lamp مع Android Actions (+15m / Free / Snooze)

## 1. إضافة Dependencies

في `app/build.gradle`:

```gradle
dependencies {
    // WorkManager for background tasks
    implementation "androidx.work:work-runtime-ktx:2.8.1"
    
    // OkHttp for API calls
    implementation "com.squareup.okhttp3:okhttp:4.11.0"
    
    // Existing dependencies...
}
```

## 2. إنشاء ActionReceiver

إنشاء ملف: `app/src/main/java/your/pkg/actions/ActionReceiver.kt`

```kotlin
package your.pkg.actions

import android.content.*
import androidx.work.*
import kotlinx.coroutines.*
import okhttp3.*
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.RequestBody.Companion.toRequestBody
import org.json.JSONObject
import java.util.concurrent.TimeUnit

class ActionReceiver: BroadcastReceiver() {
  override fun onReceive(ctx: Context, intent: Intent) {
    val action = intent.action ?: return
    val eventId = intent.getStringExtra("event_id") ?: return
    
    when(action){
      "ACTION_SHIFT_15" -> apply(ctx, "update", eventId, shiftMin = 15)
      "ACTION_MARK_FREE" -> apply(ctx, "update", eventId, markFree = true)
      "ACTION_SNOOZE" -> apply(ctx, "update", eventId, shiftMin = 5)
    }
  }

  private fun apply(
    ctx: Context, 
    action: String, 
    eventId: String, 
    shiftMin: Int? = null, 
    markFree: Boolean = false
  ) {
    val req = OneTimeWorkRequestBuilder<ApplyWorker>()
      .setBackoffCriteria(BackoffPolicy.EXPONENTIAL, 10, TimeUnit.MINUTES)
      .setInputData(workDataOf(
        "action" to action,
        "event_id" to eventId,
        "shift_min" to (shiftMin ?: -1),
        "mark_free" to markFree
      ))
      .build()
    WorkManager.getInstance(ctx).enqueue(req)
  }
}

class ApplyWorker(
  ctx: Context, 
  params: WorkerParameters
): CoroutineWorker(ctx, params) {
  
  override suspend fun doWork(): Result = withContext(Dispatchers.IO) {
    try {
      val eventId = inputData.getString("event_id")!!
      val shift = inputData.getInt("shift_min", -1)
      val markFree = inputData.getBoolean("mark_free", false)

      val jwt = getSupabaseJwt()
      val url = BuildConfig.SUPABASE_URL + "/functions/v1/calendar-apply"

      val payload = JSONObject().apply {
        put("action", "update")
        val e = JSONObject().apply {
          put("id", eventId)
          if (markFree) put("busy_state", "free")
        }
        put("event", e)
        put("propagate_google", false)
        if (shift > 0) put("shift_min", shift)
      }.toString()

      val client = OkHttpClient()
      val req = Request.Builder()
        .url(url)
        .post(payload.toRequestBody("application/json".toMediaType()))
        .addHeader("Authorization", "Bearer $jwt")
        .build()

      val res = client.newCall(req).execute()
      if (!res.isSuccessful) return@withContext Result.retry()
      
      Result.success()
    } catch (t: Throwable){
      android.util.Log.e("ApplyWorker", "Error", t)
      Result.retry()
    }
  }

  private fun getSupabaseJwt(): String {
    // احصل على JWT من Supabase session
    // مثال: SharedPreferences أو DataStore
    val prefs = applicationContext.getSharedPreferences("supabase", Context.MODE_PRIVATE)
    return prefs.getString("jwt", "") ?: ""
  }
}
```

## 3. تسجيل Receiver في AndroidManifest.xml

```xml
<manifest ...>
  <application ...>
    
    <!-- Existing activities... -->
    
    <receiver
        android:name=".actions.ActionReceiver"
        android:exported="true">
      <intent-filter>
        <action android:name="ACTION_SHIFT_15"/>
        <action android:name="ACTION_MARK_FREE"/>
        <action android:name="ACTION_SNOOZE"/>
      </intent-filter>
    </receiver>
    
  </application>
</manifest>
```

## 4. تحديث SmartLamp Notification

إنشاء/تحديث `SmartLampManager.kt`:

```kotlin
package your.pkg.notifications

import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.os.Build
import androidx.core.app.NotificationCompat
import your.pkg.R
import your.pkg.actions.ActionReceiver

class SmartLampManager(private val context: Context) {
  
  private val nm = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
  private val CHANNEL_ID = "smart_lamp"
  private val NOTIFICATION_ID = 1001

  init {
    createChannel()
  }

  private fun createChannel() {
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
      val channel = NotificationChannel(
        CHANNEL_ID,
        "Smart Lamp",
        NotificationManager.IMPORTANCE_LOW
      ).apply {
        description = "Calendar and Prayer status indicator"
        setShowBadge(false)
      }
      nm.createNotificationChannel(channel)
    }
  }

  fun update(status: String, eventId: String?, eventTitle: String?) {
    val color = when(status) {
      "conflict" -> android.graphics.Color.RED
      "event_soon" -> android.graphics.Color.YELLOW
      "prayer_soon" -> android.graphics.Color.BLUE
      "ongoing" -> android.graphics.Color.parseColor("#9C27B0") // Purple
      else -> android.graphics.Color.GREEN
    }

    val builder = NotificationCompat.Builder(context, CHANNEL_ID)
      .setSmallIcon(R.drawable.ic_calendar) // استخدم أيقونة مناسبة
      .setContentTitle("Oryxa")
      .setContentText(eventTitle ?: "Status: $status")
      .setOngoing(true)
      .setColor(color)
      .setPriority(NotificationCompat.PRIORITY_LOW)
      .setShowWhen(false)

    if (!eventId.isNullOrEmpty()) {
      builder
        .addAction(0, "+15m", createAction("ACTION_SHIFT_15", eventId))
        .addAction(0, "Free", createAction("ACTION_MARK_FREE", eventId))
        .addAction(0, "Snooze", createAction("ACTION_SNOOZE", eventId))
    }

    nm.notify(NOTIFICATION_ID, builder.build())
  }

  fun dismiss() {
    nm.cancel(NOTIFICATION_ID)
  }

  private fun createAction(action: String, eventId: String): PendingIntent {
    val intent = Intent(action)
      .setClass(context, ActionReceiver::class.java)
      .putExtra("event_id", eventId)
    
    val reqCode = (eventId.hashCode() xor action.hashCode())
    val flags = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
      PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
    } else {
      PendingIntent.FLAG_UPDATE_CURRENT
    }
    
    return PendingIntent.getBroadcast(context, reqCode, intent, flags)
  }
}
```

## 5. الاستخدام في MainActivity أو Service

```kotlin
class MainActivity : ComponentActivity() {
  
  private lateinit var lampManager: SmartLampManager

  override fun onCreate(savedInstanceState: Bundle?) {
    super.onCreate(savedInstanceState)
    
    lampManager = SmartLampManager(this)
    
    // Update lamp when needed
    updateLamp()
  }

  private fun updateLamp() {
    // احصل على البيانات من glances-feed أو local DB
    lifecycleScope.launch {
      val nextEvent = getNextEvent() // Your implementation
      
      if (nextEvent != null) {
        val status = when {
          nextEvent.hasConflict -> "conflict"
          nextEvent.isOngoing -> "ongoing"
          nextEvent.startsInMinutes <= 15 -> "event_soon"
          else -> "idle"
        }
        
        lampManager.update(
          status = status,
          eventId = nextEvent.id,
          eventTitle = nextEvent.title
        )
      } else {
        lampManager.dismiss()
      }
    }
  }
}
```

## 6. حفظ JWT Token

في Authentication callback:

```kotlin
// بعد تسجيل الدخول بنجاح
val prefs = getSharedPreferences("supabase", Context.MODE_PRIVATE)
prefs.edit().putString("jwt", session.accessToken).apply()
```

## 7. الاختبار

1. افتح التطبيق
2. تأكد من ظهور Smart Lamp notification
3. اضغط على الأزرار (+15m / Free / Snooze)
4. تحقق من `logcat` لرؤية الطلبات:

```bash
adb logcat | grep -E "(ActionReceiver|ApplyWorker)"
```

## Notes

- التطبيق يحتاج `INTERNET` permission (موجود غالباً)
- تأكد من حفظ JWT بشكل آمن
- يمكن استخدام `EncryptedSharedPreferences` للأمان الإضافي
- الأزرار لا تدفع تغييرات لـ Google (`propagate_google=false`)
- WorkManager يعيد المحاولة تلقائياً عند الفشل

## ملفات إضافية مطلوبة

- `res/drawable/ic_calendar.xml` - أيقونة التقويم
- `BuildConfig.SUPABASE_URL` - في `build.gradle`:

```gradle
android {
    defaultConfig {
        buildConfigField "String", "SUPABASE_URL", "\"https://your-project.supabase.co\""
    }
}
```

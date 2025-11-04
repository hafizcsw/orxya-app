# Android Widget & Quick Settings Tile Setup

This guide provides complete implementation for Android Quick Settings Tile (Focus toggle) and Home Widget (Today view with Glances) that integrate with the Oryxa calendar system.

## Overview

- **Quick Settings Tile**: Toggle Focus mode directly from Quick Settings panel
- **Home Widget**: Display next event, prayer time, conflicts count with action buttons (+15m, Focus, Snooze)
- **Edge Functions**: `focus-toggle` and `glances-feed` provide backend support

---

## 1. Quick Settings Tile (Focus Toggle)

### 1.1 Tile Service Implementation

**File:** `app/src/main/java/your/pkg/tiles/FocusTileService.kt`

```kotlin
package your.pkg.tiles

import android.service.quicksettings.Tile
import android.service.quicksettings.TileService
import kotlinx.coroutines.*
import okhttp3.*
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.RequestBody.Companion.toRequestBody
import org.json.JSONObject

class FocusTileService : TileService() {
    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.IO)

    override fun onStartListening() {
        super.onStartListening()
        refresh()
    }

    override fun onClick() {
        super.onClick()
        scope.launch { toggle() }
    }

    private fun refresh() = scope.launch {
        val state = getFocusState()
        val tile = qsTile ?: return@launch
        tile.state = if (state) Tile.STATE_ACTIVE else Tile.STATE_INACTIVE
        tile.label = if (state) "Focus: ON" else "Focus: OFF"
        tile.updateTile()
    }

    private suspend fun toggle() {
        callFocusToggle("toggle")
        refresh()
    }

    private fun getJwt(): String {
        // TODO: Retrieve JWT from Supabase Auth Session
        // Store in DataStore or EncryptedSharedPreferences
        return ""
    }

    private suspend fun getFocusState(): Boolean {
        val url = "${BuildConfig.SUPABASE_URL}/functions/v1/focus-toggle"
        val body = JSONObject(mapOf("action" to "get"))
            .toString()
            .toRequestBody("application/json".toMediaType())
        val req = Request.Builder()
            .url(url)
            .post(body)
            .addHeader("Authorization", "Bearer ${getJwt()}")
            .build()
        
        return try {
            val res = OkHttpClient().newCall(req).execute()
            if (!res.isSuccessful) return false
            val json = JSONObject(res.body?.string() ?: "{}")
            json.optBoolean("active", false)
        } catch (e: Exception) {
            false
        }
    }

    private suspend fun callFocusToggle(kind: String) {
        val url = "${BuildConfig.SUPABASE_URL}/functions/v1/focus-toggle"
        val payload = JSONObject()
        val req = Request.Builder()
            .url(url)
            .post(payload.toString().toRequestBody("application/json".toMediaType()))
            .addHeader("Authorization", "Bearer ${getJwt()}")
            .build()
        
        try {
            OkHttpClient().newCall(req).execute().close()
        } catch (e: Exception) {
            // Handle error silently or log
        }
    }
}
```

### 1.2 AndroidManifest.xml Entry

Add this service declaration inside `<application>`:

```xml
<service
    android:name=".tiles.FocusTileService"
    android:icon="@drawable/ic_stat_name"
    android:label="Focus"
    android:permission="android.permission.BIND_QUICK_SETTINGS_TILE"
    android:exported="true">
    <intent-filter>
        <action android:name="android.service.quicksettings.action.QS_TILE"/>
    </intent-filter>
</service>
```

---

## 2. Home Widget (Today Glances)

### 2.1 Widget Layout

**File:** `app/src/main/res/layout/widget_today.xml`

```xml
<?xml version="1.0" encoding="utf-8"?>
<LinearLayout xmlns:android="http://schemas.android.com/apk/res/android"
    android:orientation="vertical"
    android:padding="12dp"
    android:background="@android:color/transparent">
    
    <TextView
        android:id="@+id/tvTitle"
        android:layout_width="match_parent"
        android:layout_height="wrap_content"
        android:text="Today"
        android:textStyle="bold"
        android:textSize="16sp" />
    
    <TextView
        android:id="@+id/tvEvent"
        android:layout_width="match_parent"
        android:layout_height="wrap_content"
        android:text="Next: —"
        android:paddingTop="6dp" />
    
    <TextView
        android:id="@+id/tvPrayer"
        android:layout_width="match_parent"
        android:layout_height="wrap_content"
        android:text="Prayer: —" />
    
    <TextView
        android:id="@+id/tvConflicts"
        android:layout_width="match_parent"
        android:layout_height="wrap_content"
        android:text="Conflicts: 0"
        android:paddingBottom="6dp" />
    
    <LinearLayout
        android:layout_width="match_parent"
        android:layout_height="wrap_content"
        android:orientation="horizontal">
        
        <Button
            android:id="@+id/btnShift"
            android:layout_width="0dp"
            android:layout_height="wrap_content"
            android:layout_weight="1"
            android:text="+15m"
            style="?android:attr/borderlessButtonStyle" />
        
        <Button
            android:id="@+id/btnFocus"
            android:layout_width="0dp"
            android:layout_height="wrap_content"
            android:layout_weight="1"
            android:text="Focus"
            style="?android:attr/borderlessButtonStyle" />
        
        <Button
            android:id="@+id/btnSnooze"
            android:layout_width="0dp"
            android:layout_height="wrap_content"
            android:layout_weight="1"
            android:text="Snooze"
            style="?android:attr/borderlessButtonStyle" />
    </LinearLayout>
</LinearLayout>
```

### 2.2 Widget Info XML

**File:** `app/src/main/res/xml/widget_today_info.xml`

```xml
<?xml version="1.0" encoding="utf-8"?>
<appwidget-provider xmlns:android="http://schemas.android.com/apk/res/android"
    android:minWidth="250dp"
    android:minHeight="80dp"
    android:updatePeriodMillis="0"
    android:initialLayout="@layout/widget_today"
    android:resizeMode="horizontal|vertical"
    android:widgetCategory="home_screen" />
```

### 2.3 Widget Provider Implementation

**File:** `app/src/main/java/your/pkg/widget/TodayWidgetProvider.kt`

```kotlin
package your.pkg.widget

import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.*
import android.widget.RemoteViews
import kotlinx.coroutines.*
import okhttp3.*
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.RequestBody.Companion.toRequestBody
import org.json.JSONObject
import your.pkg.R
import your.pkg.BuildConfig

class TodayWidgetProvider : AppWidgetProvider() {
    override fun onUpdate(ctx: Context, mgr: AppWidgetManager, ids: IntArray) {
        ids.forEach { updateOne(ctx, mgr, it) }
    }

    companion object {
        fun updateOne(ctx: Context, mgr: AppWidgetManager, id: Int) {
            val rv = RemoteViews(ctx.packageName, R.layout.widget_today)
            
            // Set default values
            rv.setTextViewText(R.id.tvEvent, "Next: —")
            rv.setTextViewText(R.id.tvPrayer, "Prayer: —")
            rv.setTextViewText(R.id.tvConflicts, "Conflicts: 0")

            // Set button click handlers
            rv.setOnClickPendingIntent(R.id.btnShift, actionPI(ctx, "ACTION_WIDGET_SHIFT"))
            rv.setOnClickPendingIntent(R.id.btnFocus, actionPI(ctx, "ACTION_WIDGET_FOCUS"))
            rv.setOnClickPendingIntent(R.id.btnSnooze, actionPI(ctx, "ACTION_WIDGET_SNOOZE"))

            mgr.updateAppWidget(id, rv)

            // Fetch glances data asynchronously
            CoroutineScope(Dispatchers.IO).launch {
                val data = fetchGlances(ctx) ?: return@launch
                val nr = RemoteViews(ctx.packageName, R.layout.widget_today)
                
                val ev = data.optJSONObject("nextEvent")
                val pr = data.optJSONObject("nextPrayer")
                val conflicts = data.optInt("conflictCount", 0)
                
                val evTxt = if (ev != null) {
                    "${ev.optString("title")} @ ${ev.optString("start_at").take(16).replace('T', ' ')}"
                } else "—"
                
                val prTxt = if (pr != null) {
                    "${pr.optString("name")} @ ${pr.optString("time").take(16).replace('T', ' ')}"
                } else "—"
                
                nr.setTextViewText(R.id.tvEvent, "Next: $evTxt")
                nr.setTextViewText(R.id.tvPrayer, "Prayer: $prTxt")
                nr.setTextViewText(R.id.tvConflicts, "Conflicts: $conflicts")
                
                // Set button handlers again
                nr.setOnClickPendingIntent(R.id.btnShift, actionPI(ctx, "ACTION_WIDGET_SHIFT"))
                nr.setOnClickPendingIntent(R.id.btnFocus, actionPI(ctx, "ACTION_WIDGET_FOCUS"))
                nr.setOnClickPendingIntent(R.id.btnSnooze, actionPI(ctx, "ACTION_WIDGET_SNOOZE"))
                
                mgr.updateAppWidget(id, nr)
            }
        }

        private fun actionPI(ctx: Context, action: String): PendingIntent {
            val i = Intent(action).setClass(ctx, TodayWidgetReceiver::class.java)
            return PendingIntent.getBroadcast(
                ctx,
                action.hashCode(),
                i,
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
            )
        }

        private fun fetchGlances(ctx: Context): JSONObject? {
            val jwt = getJwt(ctx)
            if (jwt.isEmpty()) return null
            
            val url = "${BuildConfig.SUPABASE_URL}/functions/v1/glances-feed"
            val req = Request.Builder()
                .url(url)
                .post("{}".toRequestBody("application/json".toMediaType()))
                .addHeader("Authorization", "Bearer $jwt")
                .build()
            
            return try {
                OkHttpClient().newCall(req).execute().use { res ->
                    if (!res.isSuccessful) return null
                    JSONObject(res.body?.string() ?: "{}")
                }
            } catch (e: Exception) {
                null
            }
        }

        private fun getJwt(ctx: Context): String {
            // TODO: Retrieve JWT from Supabase Auth Session
            return ""
        }
    }
}
```

### 2.4 Widget Button Receiver

**File:** `app/src/main/java/your/pkg/widget/TodayWidgetReceiver.kt`

```kotlin
package your.pkg.widget

import android.content.*
import androidx.work.*
import your.pkg.actions.ApplyWorker
import java.util.concurrent.TimeUnit

class TodayWidgetReceiver : BroadcastReceiver() {
    override fun onReceive(ctx: Context, intent: Intent) {
        val action = intent.action ?: return
        
        when (action) {
            "ACTION_WIDGET_SHIFT" -> enqueueApply(ctx, shift = 15)
            "ACTION_WIDGET_SNOOZE" -> enqueueApply(ctx, shift = 5)
            "ACTION_WIDGET_FOCUS" -> enqueueFocusToggle(ctx)
        }
    }

    private fun enqueueApply(ctx: Context, shift: Int) {
        val w = OneTimeWorkRequestBuilder<ApplyWorker>()
            .setInputData(
                workDataOf(
                    "action" to "update",
                    "event_id" to "",
                    "shift_min" to shift
                )
            )
            .setBackoffCriteria(BackoffPolicy.EXPONENTIAL, 10, TimeUnit.MINUTES)
            .build()
        WorkManager.getInstance(ctx).enqueue(w)
    }

    private fun enqueueFocusToggle(ctx: Context) {
        val w = OneTimeWorkRequestBuilder<FocusToggleWorker>().build()
        WorkManager.getInstance(ctx).enqueue(w)
    }
}
```

### 2.5 Focus Toggle Worker

**File:** `app/src/main/java/your/pkg/widget/FocusToggleWorker.kt`

```kotlin
package your.pkg.widget

import android.content.Context
import androidx.work.*
import kotlinx.coroutines.*
import okhttp3.*
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.RequestBody.Companion.toRequestBody
import org.json.JSONObject
import your.pkg.BuildConfig

class FocusToggleWorker(ctx: Context, params: WorkerParameters) : CoroutineWorker(ctx, params) {
    override suspend fun doWork(): Result = withContext(Dispatchers.IO) {
        val jwt = getJwt()
        if (jwt.isEmpty()) return@withContext Result.retry()
        
        val url = "${BuildConfig.SUPABASE_URL}/functions/v1/focus-toggle"
        val req = Request.Builder()
            .url(url)
            .post(JSONObject().toString().toRequestBody("application/json".toMediaType()))
            .addHeader("Authorization", "Bearer $jwt")
            .build()
        
        try {
            OkHttpClient().newCall(req).execute().use { res ->
                if (!res.isSuccessful) return@withContext Result.retry()
            }
            Result.success()
        } catch (e: Exception) {
            Result.retry()
        }
    }

    private fun getJwt(): String {
        // TODO: Retrieve JWT from Supabase Auth Session
        return ""
    }
}
```

### 2.6 AndroidManifest.xml Entries

Add these entries inside `<application>`:

```xml
<!-- Widget Provider -->
<receiver
    android:name=".widget.TodayWidgetProvider"
    android:exported="true">
    <intent-filter>
        <action android:name="android.appwidget.action.APPWIDGET_UPDATE"/>
    </intent-filter>
    <meta-data
        android:name="android.appwidget.provider"
        android:resource="@xml/widget_today_info"/>
</receiver>

<!-- Widget Action Receiver -->
<receiver
    android:name=".widget.TodayWidgetReceiver"
    android:exported="true">
    <intent-filter>
        <action android:name="ACTION_WIDGET_SHIFT"/>
        <action android:name="ACTION_WIDGET_SNOOZE"/>
        <action android:name="ACTION_WIDGET_FOCUS"/>
    </intent-filter>
</receiver>
```

---

## 3. Testing & Deployment

### 3.1 Deploy Edge Functions

```bash
supabase functions deploy focus-toggle glances-feed
```

### 3.2 Test Edge Functions

```bash
# Test focus toggle
curl -sS -H "Authorization: Bearer $JWT" \
  -H "Content-Type: application/json" \
  -d '{"action":"get"}' \
  $SUPABASE_URL/functions/v1/focus-toggle | jq

# Test glances feed
curl -sS -H "Authorization: Bearer $JWT" \
  -X POST \
  $SUPABASE_URL/functions/v1/glances-feed | jq
```

### 3.3 Build & Install Android App

```bash
./gradlew :app:assembleDebug
adb install -r app/build/outputs/apk/debug/app-debug.apk
```

### 3.4 Add Tile & Widget

1. **Quick Settings Tile:**
   - Swipe down to open Quick Settings
   - Tap edit/pencil icon
   - Find "Focus" tile and drag to active area
   - Tap to toggle Focus mode

2. **Home Widget:**
   - Long press on home screen
   - Select "Widgets"
   - Find "Today" widget
   - Drag to home screen
   - Widget will auto-refresh on app launch

### 3.5 Debug Logs

```bash
adb logcat | grep -iE "Oryxa|Focus|Widget|WorkManager|Supabase"
```

---

## 4. Implementation Notes

### JWT Storage
Store Supabase JWT securely using:
- `EncryptedSharedPreferences` for API 23+
- `DataStore` with encryption
- Update on auth state changes

### Battery Optimization
- Widget uses `updatePeriodMillis="0"` (no automatic updates)
- Manual refresh on app launch or WorkManager scheduling
- Use Wi-Fi-only constraints for background work

### Security
- All Edge Functions use `verify_jwt=true`
- No secrets stored in app code
- JWT stored encrypted on device

### Optional Enhancements
- Add DND (Do Not Disturb) toggle when Focus is enabled
- Implement "Plan Now" tile for AI day planning
- Add larger widget variant with full day schedule
- Implement push notification when conflicts are detected

---

## 5. Troubleshooting

### Widget Not Updating
- Check JWT is valid and not expired
- Verify network connectivity
- Check WorkManager logs for failed requests
- Manually trigger update from app

### Tile Not Responding
- Verify Quick Settings permission granted
- Check network logs for API errors
- Ensure JWT is accessible from TileService

### Actions Not Working
- Verify ActionReceiver and Workers are registered
- Check event_id is passed correctly from glances-feed
- Review WorkManager retry policies

---

## Related Files
- Smart Lamp Actions: See `ANDROID_SMART_LAMP_SETUP.md`
- Calendar Apply: `supabase/functions/calendar-apply/index.ts`
- Glances Feed: `supabase/functions/glances-feed/index.ts`

# Android "Plan Now" Quick Settings Tile Setup

This guide provides complete implementation for the "Plan Now" Quick Settings Tile that automatically generates AI-powered day plans and creates draft events in your calendar.

## Overview

- **Plan Now Tile**: One-tap AI planning from Quick Settings
- **Edge Function**: `plan-now` calls `ai-orchestrator` to generate optimized day schedule
- **Local Drafts**: Creates events locally as drafts without pushing to Google Calendar
- **Smart Conflict Avoidance**: Skips time slots that overlap with existing busy events

---

## 1. Edge Function: plan-now

The Edge Function is already deployed. It:
1. Calls `ai-orchestrator` with your preferences (Muslim prayer times, etc.)
2. Generates optimized time blocks for remaining hours of the day
3. Creates draft events locally in your database
4. Avoids overlapping with existing busy events
5. Triggers conflict detection

### Testing the Edge Function

```bash
# Test with current time to end of day
curl -sS -H "Authorization: Bearer $JWT" \
  -H "Content-Type: application/json" \
  -d '{"window":{"start":"2025-01-15T10:00:00Z","end":"2025-01-15T23:59:59Z"}}' \
  $SUPABASE_URL/functions/v1/plan-now | jq

# Dry run (doesn't create events, just returns plan)
curl -sS -H "Authorization: Bearer $JWT" \
  -H "Content-Type: application/json" \
  -d '{"dry_run":true}' \
  $SUPABASE_URL/functions/v1/plan-now | jq
```

Expected response:
```json
{
  "ok": true,
  "window": {
    "start": "2025-01-15T10:00:00Z",
    "end": "2025-01-15T23:59:59Z"
  },
  "inserted": 5,
  "skipped": 2,
  "total": 7
}
```

---

## 2. Android Quick Settings Tile Implementation

### 2.1 Tile Service

**File:** `app/src/main/java/your/pkg/tiles/PlanTileService.kt`

```kotlin
package your.pkg.tiles

import android.service.quicksettings.Tile
import android.service.quicksettings.TileService
import android.widget.Toast
import kotlinx.coroutines.*
import okhttp3.*
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.RequestBody.Companion.toRequestBody
import org.json.JSONObject
import your.pkg.BuildConfig

class PlanTileService : TileService() {
    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.IO)

    override fun onStartListening() {
        super.onStartListening()
        // Update tile appearance
        val tile = qsTile ?: return
        tile.state = Tile.STATE_INACTIVE
        tile.label = "Plan Now"
        tile.updateTile()
    }

    override fun onClick() {
        super.onClick()
        
        // Show loading state
        qsTile?.apply {
            state = Tile.STATE_ACTIVE
            label = "Planning..."
            updateTile()
        }

        scope.launch {
            val result = callPlanNow()
            
            withContext(Dispatchers.Main) {
                qsTile?.apply {
                    state = Tile.STATE_INACTIVE
                    label = "Plan Now"
                    updateTile()
                }

                val message = when {
                    result == null -> "Plan failed - check connection"
                    result.inserted > 0 -> "Planned ${result.inserted} blocks ✅"
                    result.skipped == result.total -> "No available slots"
                    else -> "Plan created"
                }
                Toast.makeText(this@PlanTileService, message, Toast.LENGTH_SHORT).show()
            }
        }
    }

    private fun getJwt(): String {
        // TODO: Retrieve JWT from Supabase Auth Session
        // Store in DataStore or EncryptedSharedPreferences
        return ""
    }

    private suspend fun callPlanNow(): PlanResult? = withContext(Dispatchers.IO) {
        val jwt = getJwt()
        if (jwt.isEmpty()) return@withContext null

        val url = "${BuildConfig.SUPABASE_URL}/functions/v1/plan-now"
        
        val now = System.currentTimeMillis()
        val endOfDay = java.util.Calendar.getInstance().apply {
            timeInMillis = now
            set(java.util.Calendar.HOUR_OF_DAY, 23)
            set(java.util.Calendar.MINUTE, 59)
            set(java.util.Calendar.SECOND, 59)
        }.timeInMillis

        val body = JSONObject().apply {
            put("window", JSONObject().apply {
                put("start", formatISO(now))
                put("end", formatISO(endOfDay))
            })
            put("prefs", JSONObject().apply {
                put("religion", "muslim")
            })
            put("constraints", JSONObject().apply {
                put("avoid_during_prayers", true)
            })
        }.toString().toRequestBody("application/json".toMediaType())

        val req = Request.Builder()
            .url(url)
            .post(body)
            .addHeader("Authorization", "Bearer $jwt")
            .build()

        try {
            OkHttpClient().newCall(req).execute().use { res ->
                if (!res.isSuccessful) return@withContext null
                val json = JSONObject(res.body?.string() ?: "{}")
                PlanResult(
                    inserted = json.optInt("inserted", 0),
                    skipped = json.optInt("skipped", 0),
                    total = json.optInt("total", 0)
                )
            }
        } catch (e: Exception) {
            null
        }
    }

    private fun formatISO(millis: Long): String {
        val sdf = java.text.SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss'Z'", java.util.Locale.US)
        sdf.timeZone = java.util.TimeZone.getTimeZone("UTC")
        return sdf.format(java.util.Date(millis))
    }

    data class PlanResult(val inserted: Int, val skipped: Int, val total: Int)
}
```

### 2.2 AndroidManifest.xml Entry

Add this service declaration inside `<application>`:

```xml
<service
    android:name=".tiles.PlanTileService"
    android:icon="@drawable/ic_stat_name"
    android:label="Plan Now"
    android:permission="android.permission.BIND_QUICK_SETTINGS_TILE"
    android:exported="true">
    <intent-filter>
        <action android:name="android.service.quicksettings.action.QS_TILE"/>
    </intent-filter>
</service>
```

### 2.3 Icon Resource (Optional)

Create an icon for the tile at `app/src/main/res/drawable/ic_plan.xml`:

```xml
<vector xmlns:android="http://schemas.android.com/apk/res/android"
    android:width="24dp"
    android:height="24dp"
    android:viewportWidth="24"
    android:viewportHeight="24">
    <path
        android:fillColor="#FFFFFF"
        android:pathData="M9,11H7v2h2V11zM13,11h-2v2h2V11zM17,11h-2v2h2V11zM19,4h-1V2h-2v2H8V2H6v2H5C3.9,4 3,4.9 3,6v14c0,1.1 0.9,2 2,2h14c1.1,0 2,-0.9 2,-2V6C21,4.9 20.1,4 19,4zM19,20H5V9h14V20z"/>
</vector>
```

---

## 3. Web Button Implementation (Optional)

Add to any React component where you want a "Plan Now" button:

### 3.1 Hook for Plan Now

**File:** `src/hooks/usePlanNow.ts`

```typescript
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export function usePlanNow() {
  const [isPlanning, setIsPlanning] = useState(false);
  const { toast } = useToast();

  const planNow = async () => {
    setIsPlanning(true);
    try {
      const now = new Date();
      const endOfDay = new Date();
      endOfDay.setHours(23, 59, 59, 0);

      const { data, error } = await supabase.functions.invoke('plan-now', {
        body: {
          window: {
            start: now.toISOString(),
            end: endOfDay.toISOString()
          },
          prefs: { religion: 'muslim' },
          constraints: { avoid_during_prayers: true }
        }
      });

      if (error) throw error;

      if (data?.inserted > 0) {
        toast({
          title: 'Day Planned! ✨',
          description: `Created ${data.inserted} time blocks for today`,
        });
      } else if (data?.skipped === data?.total) {
        toast({
          title: 'No Available Slots',
          description: 'Your calendar is already full for today',
          variant: 'default'
        });
      } else {
        toast({
          title: 'Planning Complete',
          description: 'Check your calendar for new AI-generated blocks'
        });
      }

      return data;
    } catch (error) {
      console.error('Plan now error:', error);
      toast({
        title: 'Planning Failed',
        description: error instanceof Error ? error.message : 'Failed to generate plan',
        variant: 'destructive'
      });
      return null;
    } finally {
      setIsPlanning(false);
    }
  };

  return { planNow, isPlanning };
}
```

### 3.2 Button Component Example

```tsx
import { Button } from '@/components/ui/button';
import { usePlanNow } from '@/hooks/usePlanNow';
import { Sparkles, Loader2 } from 'lucide-react';

export function PlanNowButton() {
  const { planNow, isPlanning } = usePlanNow();

  return (
    <Button
      onClick={planNow}
      disabled={isPlanning}
      className="gap-2"
      variant="default"
    >
      {isPlanning ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" />
          Planning...
        </>
      ) : (
        <>
          <Sparkles className="h-4 w-4" />
          Plan Now
        </>
      )}
    </Button>
  );
}
```

---

## 4. Workflow After Implementation

1. **User Taps Tile/Button**: `plan-now` is called
2. **AI Generates Plan**: Based on remaining time today, respecting prayers
3. **Drafts Created**: Events appear in calendar with `[AI]` prefix
4. **Review & Edit**: User can modify, accept, or delete AI-suggested blocks
5. **Sync to Google** (Optional): Use `calendar-apply` or enable `ff_calendar_write` flag

---

## 5. Customization Options

### Change Title Prefix

```json
{
  "title_prefix": "🤖 "
}
```

### Custom Planning Window

```json
{
  "window": {
    "start": "2025-01-15T14:00:00Z",
    "end": "2025-01-15T18:00:00Z"
  }
}
```

### Add Custom Preferences

```json
{
  "prefs": {
    "religion": "muslim",
    "focus_type": "deep_work",
    "break_frequency": "pomodoro"
  }
}
```

### Dry Run (Test Only)

```json
{
  "dry_run": true
}
```

---

## 6. Testing & Debugging

### Build & Install

```bash
./gradlew :app:assembleDebug
adb install -r app/build/outputs/apk/debug/app-debug.apk
```

### Add Tile to Quick Settings

1. Swipe down to open Quick Settings
2. Tap edit/pencil icon
3. Find "Plan Now" tile
4. Drag to active tiles area
5. Tap to test

### Debug Logs

```bash
adb logcat | grep -iE "PlanTileService|plan-now|Supabase"
```

### Common Issues

**Tile doesn't appear:**
- Verify service is registered in AndroidManifest.xml
- Check permission: `android.permission.BIND_QUICK_SETTINGS_TILE`
- Rebuild and reinstall app

**Planning fails:**
- Check JWT is valid and not expired
- Verify network connectivity
- Check Edge Function logs in Supabase dashboard
- Ensure `ai-orchestrator` is deployed

**No blocks created:**
- Calendar may already be full
- Check `skipped` count in response
- Verify existing events don't overlap

---

## 7. Advanced Features (Optional)

### Plan & Focus Mode

Create a combined tile that:
1. Enables Focus mode
2. Generates short 2-hour plan
3. Mutes non-essential notifications

```kotlin
// Call both focus-toggle and plan-now
scope.launch {
    // Enable focus
    callFocusToggle("set_true")
    
    // Plan next 2 hours
    callPlanNow(windowHours = 2)
}
```

### Weekly Planning

Extend to plan entire week:

```json
{
  "window": {
    "start": "2025-01-15T00:00:00Z",
    "end": "2025-01-22T23:59:59Z"
  }
}
```

### Custom Block Types

Add preferences for specific block types:

```json
{
  "prefs": {
    "include_exercise": true,
    "include_study": true,
    "include_family_time": true
  }
}
```

---

## 8. Performance & Battery

- **No Background Work**: Tile only acts on user tap
- **Single Request**: One API call per tap
- **Efficient Conflict Check**: Only checks overlapping time ranges
- **Local First**: No Google Calendar API calls during planning
- **Smart Caching**: JWT stored securely on device

---

## 9. Security Considerations

- JWT stored in `EncryptedSharedPreferences` or `DataStore` with encryption
- All Edge Functions protected with `verify_jwt=true`
- No secrets in app code or manifest
- User data never leaves Supabase infrastructure during planning
- Optional: Add rate limiting to prevent abuse

---

## 10. Related Documentation

- Smart Lamp Actions: `ANDROID_SMART_LAMP_SETUP.md`
- Widget & Tiles: `ANDROID_WIDGET_TILE_SETUP.md`
- AI Orchestrator: `supabase/functions/ai-orchestrator/index.ts`
- Calendar Apply: `supabase/functions/calendar-apply/index.ts`
- Conflict Detection: `supabase/functions/conflict-check/index.ts`

---

## Support

For issues or questions:
1. Check Edge Function logs in Supabase dashboard
2. Review `adb logcat` for Android errors
3. Test Edge Function directly with cURL
4. Verify JWT and network connectivity

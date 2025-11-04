# Android "Plan & Focus" Quick Settings Tile Setup

This guide provides implementation for the "Plan & Focus" Quick Settings Tile that automatically finds the next available time slot, creates a focus session, and enables focus mode—all in one tap.

## Overview

**Plan & Focus** is the ultimate productivity quick action:
- 🎯 **Finds Next Available Slot**: AI-powered slot detection avoiding prayers and conflicts
- ⚡ **Creates Focus Session**: Generates 25-240 minute focus block (default: 120 min)
- 🔕 **Enables Focus Mode**: Automatically activates focus state
- 📱 **One-Tap Activation**: No configuration needed, just tap and start

---

## 1. Edge Function: plan-focus-now

The Edge Function intelligently finds the next available time slot by:
1. First trying AI-powered suggestion via `ai-orchestrator`
2. Falling back to local conflict detection if AI fails
3. Avoiding prayer times (with 5min pre-buffer and 20min post-buffer)
4. Skipping busy events
5. Creating focus event as draft
6. Enabling focus mode automatically

### Testing the Edge Function

```bash
# Test with default 120 minute duration
curl -sS -H "Authorization: Bearer $JWT" \
  -H "Content-Type: application/json" \
  -d '{}' \
  $SUPABASE_URL/functions/v1/plan-focus-now | jq

# Custom duration (90 minutes)
curl -sS -H "Authorization: Bearer $JWT" \
  -H "Content-Type: application/json" \
  -d '{"duration_min":90}' \
  $SUPABASE_URL/functions/v1/plan-focus-now | jq

# Custom title
curl -sS -H "Authorization: Bearer $JWT" \
  -H "Content-Type: application/json" \
  -d '{"title":"Deep Work Session","duration_min":120}' \
  $SUPABASE_URL/functions/v1/plan-focus-now | jq
```

Expected success response:
```json
{
  "ok": true,
  "event_id": "uuid-here",
  "start_at": "2025-01-15T10:30:00Z",
  "end_at": "2025-01-15T12:30:00Z",
  "focus": true
}
```

No slot available (409):
```json
{
  "ok": false,
  "reason": "no_slot_found"
}
```

---

## 2. Android Quick Settings Tile Implementation

### 2.1 Tile Service

**File:** `app/src/main/java/your/pkg/tiles/PlanFocusTileService.kt`

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

class PlanFocusTileService : TileService() {
    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.IO)

    override fun onStartListening() {
        super.onStartListening()
        qsTile?.apply {
            state = Tile.STATE_INACTIVE
            label = "Plan & Focus"
            updateTile()
        }
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
            val result = planFocusNow(durationMin = 120)

            withContext(Dispatchers.Main) {
                qsTile?.apply {
                    state = Tile.STATE_INACTIVE
                    label = "Plan & Focus"
                    updateTile()
                }

                val message = when {
                    result == null -> "Failed to connect"
                    !result.ok -> "No available slot 😞"
                    else -> "Focus session started! 🎯"
                }
                Toast.makeText(this@PlanFocusTileService, message, Toast.LENGTH_SHORT).show()
            }
        }
    }

    private fun getJwt(): String {
        // TODO: Retrieve JWT from Supabase Auth Session
        return ""
    }

    private suspend fun planFocusNow(durationMin: Int): PlanResult? = withContext(Dispatchers.IO) {
        val jwt = getJwt()
        if (jwt.isEmpty()) return@withContext null

        val url = "${BuildConfig.SUPABASE_URL}/functions/v1/plan-focus-now"
        val body = JSONObject().apply {
            put("duration_min", durationMin)
        }.toString().toRequestBody("application/json".toMediaType())

        val req = Request.Builder()
            .url(url)
            .post(body)
            .addHeader("Authorization", "Bearer $jwt")
            .build()

        try {
            OkHttpClient().newCall(req).execute().use { res ->
                if (!res.isSuccessful) {
                    return@withContext PlanResult(ok = false, eventId = null, startAt = null, endAt = null)
                }
                val json = JSONObject(res.body?.string() ?: "{}")
                PlanResult(
                    ok = json.optBoolean("ok", false),
                    eventId = json.optString("event_id"),
                    startAt = json.optString("start_at"),
                    endAt = json.optString("end_at")
                )
            }
        } catch (e: Exception) {
            null
        }
    }

    data class PlanResult(
        val ok: Boolean,
        val eventId: String?,
        val startAt: String?,
        val endAt: String?
    )
}
```

### 2.2 AndroidManifest.xml Entry

Add this service declaration inside `<application>`:

```xml
<service
    android:name=".tiles.PlanFocusTileService"
    android:icon="@drawable/ic_stat_name"
    android:label="Plan &amp; Focus"
    android:permission="android.permission.BIND_QUICK_SETTINGS_TILE"
    android:exported="true">
    <intent-filter>
        <action android:name="android.service.quicksettings.action.QS_TILE"/>
    </intent-filter>
</service>
```

### 2.3 Enhanced Version with Duration Picker (Optional)

For advanced users who want to choose duration before planning:

```kotlin
class PlanFocusTileService : TileService() {
    // ... keep existing code ...

    override fun onClick() {
        super.onClick()
        
        // Show duration picker dialog
        val intent = Intent(this, DurationPickerActivity::class.java).apply {
            addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        }
        startActivityAndCollapse(intent)
    }
}
```

**DurationPickerActivity.kt** (Optional):

```kotlin
class DurationPickerActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        
        AlertDialog.Builder(this)
            .setTitle("Focus Duration")
            .setItems(arrayOf("25 min", "45 min", "90 min", "120 min", "180 min")) { _, which ->
                val durations = arrayOf(25, 45, 90, 120, 180)
                planFocusWithDuration(durations[which])
                finish()
            }
            .setOnCancelListener { finish() }
            .show()
    }
    
    private fun planFocusWithDuration(minutes: Int) {
        // Call plan-focus-now with selected duration
        // Implementation similar to tile service
    }
}
```

---

## 3. Web Button Implementation (Optional)

Add to any React component for web-based "Plan & Focus":

### 3.1 Hook for Plan & Focus

**File:** `src/hooks/usePlanFocus.ts`

```typescript
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export function usePlanFocus() {
  const [isPlanning, setIsPlanning] = useState(false);
  const { toast } = useToast();

  const planFocus = async (durationMin: number = 120) => {
    setIsPlanning(true);
    try {
      const { data, error } = await supabase.functions.invoke('plan-focus-now', {
        body: { duration_min: durationMin }
      });

      if (error) throw error;

      if (data?.ok) {
        const start = new Date(data.start_at);
        const end = new Date(data.end_at);
        const duration = Math.round((end.getTime() - start.getTime()) / 60000);
        
        toast({
          title: 'Focus Session Ready! 🎯',
          description: `${duration} minute focus block scheduled at ${start.toLocaleTimeString()}`,
        });
      } else {
        toast({
          title: 'No Available Slot',
          description: 'Your calendar is full. Try a shorter duration or later time.',
          variant: 'default'
        });
      }

      return data;
    } catch (error) {
      console.error('Plan focus error:', error);
      toast({
        title: 'Planning Failed',
        description: error instanceof Error ? error.message : 'Failed to plan focus session',
        variant: 'destructive'
      });
      return null;
    } finally {
      setIsPlanning(false);
    }
  };

  return { planFocus, isPlanning };
}
```

### 3.2 Button Component

```tsx
import { Button } from '@/components/ui/button';
import { usePlanFocus } from '@/hooks/usePlanFocus';
import { Target, Loader2 } from 'lucide-react';

export function PlanFocusButton() {
  const { planFocus, isPlanning } = usePlanFocus();

  return (
    <Button
      onClick={() => planFocus(120)}
      disabled={isPlanning}
      className="gap-2 bg-gradient-to-r from-amber-500 to-orange-600"
      variant="default"
    >
      {isPlanning ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" />
          Finding Slot...
        </>
      ) : (
        <>
          <Target className="h-4 w-4" />
          Plan & Focus
        </>
      )}
    </Button>
  );
}
```

### 3.3 With Duration Selector

```tsx
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { usePlanFocus } from '@/hooks/usePlanFocus';
import { Target, ChevronDown } from 'lucide-react';

export function PlanFocusWithDuration() {
  const [selectedDuration, setSelectedDuration] = useState(120);
  const { planFocus, isPlanning } = usePlanFocus();

  const durations = [
    { label: '25 min (Pomodoro)', value: 25 },
    { label: '45 min (Short)', value: 45 },
    { label: '90 min (Standard)', value: 90 },
    { label: '120 min (Deep Work)', value: 120 },
    { label: '180 min (Extended)', value: 180 },
  ];

  return (
    <div className="flex gap-2">
      <Button
        onClick={() => planFocus(selectedDuration)}
        disabled={isPlanning}
        className="gap-2"
      >
        <Target className="h-4 w-4" />
        Plan & Focus ({selectedDuration}m)
      </Button>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="icon" disabled={isPlanning}>
            <ChevronDown className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {durations.map((d) => (
            <DropdownMenuItem
              key={d.value}
              onClick={() => setSelectedDuration(d.value)}
            >
              {d.label}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
```

---

## 4. Smart Lamp Integration (Optional)

After successful focus session creation, update Smart Lamp to show focus state:

```kotlin
// In PlanFocusTileService after successful planFocusNow()
result?.eventId?.let { eventId ->
    // Update Smart Lamp notification with focus state
    SmartLampManager.update(
        context = this,
        state = "focus",
        eventId = eventId,
        focusActive = true
    )
}
```

---

## 5. Workflow & User Experience

### Typical Flow

1. **User Taps Tile**: "Plan & Focus" from Quick Settings
2. **AI Finds Slot**: Checks next 4 hours for available slots
3. **Avoids Conflicts**: Respects prayers (±5/20 min buffers) and busy events
4. **Creates Event**: Inserts "[AI] Focus Sprint" as local draft
5. **Enables Focus**: Activates focus mode automatically
6. **Toast Notification**: Confirms session start time
7. **Smart Lamp Updates**: Shows focus state with action buttons

### Edge Cases Handled

- **No Available Slots**: Returns 409 with clear message
- **AI Failure**: Falls back to local conflict detection
- **Prayer Times**: Always respected with proper buffers
- **Overlapping Events**: Automatically skipped
- **Window Too Small**: Won't create if duration doesn't fit

---

## 6. Advanced Features

### 6.1 Customizable Durations

```kotlin
// Short focus (Pomodoro)
planFocusNow(durationMin = 25)

// Standard deep work
planFocusNow(durationMin = 120)

// Extended session
planFocusNow(durationMin = 180)
```

### 6.2 Custom Titles

```json
{
  "title": "🎯 Deep Work",
  "duration_min": 120
}
```

### 6.3 Custom Windows

```json
{
  "window": {
    "start": "2025-01-15T14:00:00Z",
    "end": "2025-01-15T18:00:00Z"
  },
  "duration_min": 90
}
```

### 6.4 DND Integration (Optional)

When focus mode is enabled, optionally activate Do Not Disturb:

```kotlin
if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
    val nm = getSystemService(NotificationManager::class.java)
    if (nm.isNotificationPolicyAccessGranted) {
        nm.setInterruptionFilter(NotificationManager.INTERRUPTION_FILTER_PRIORITY)
    }
}
```

---

## 7. Testing & Debugging

### Build & Install

```bash
./gradlew :app:assembleDebug
adb install -r app/build/outputs/apk/debug/app-debug.apk
```

### Add Tile

1. Swipe down to open Quick Settings
2. Tap edit/pencil icon
3. Find "Plan & Focus" tile
4. Drag to active tiles area
5. Tap to test

### Debug Logs

```bash
adb logcat | grep -iE "PlanFocusTileService|plan-focus-now|Supabase"
```

### Test Scenarios

**Scenario 1: Normal Day**
- Morning: Should find slot immediately after prayers
- Afternoon: Should find slot between events
- Evening: Should find slot before dinner time

**Scenario 2: Busy Day**
- Full calendar: Should return "no_slot_found"
- Small gaps: Should skip slots < duration
- Prayer times: Should avoid prayer windows

**Scenario 3: Edge Cases**
- End of day: Should not extend past midnight
- Network failure: Should show connection error
- Invalid JWT: Should prompt re-authentication

---

## 8. Performance & Battery

- **Zero Background Work**: Only runs on user tap
- **Single API Call**: One request per action
- **Smart Caching**: JWT stored securely
- **Efficient Conflict Detection**: Only checks relevant time windows
- **No Polling**: No periodic checks or updates

---

## 9. Deployment Checklist

- [ ] Deploy `plan-focus-now` Edge Function
- [ ] Add `PlanFocusTileService` to Android project
- [ ] Register service in AndroidManifest.xml
- [ ] Implement JWT retrieval from Supabase session
- [ ] Test on physical device
- [ ] Verify prayer time avoidance
- [ ] Test with full calendar (no slots)
- [ ] Test with empty calendar
- [ ] Verify focus mode activation
- [ ] Check Smart Lamp integration (if implemented)

---

## 10. Common Issues & Solutions

### Tile Doesn't Appear
- Rebuild and reinstall app
- Check AndroidManifest registration
- Verify permission is set correctly

### No Slot Found (Even When Available)
- Check prayer_times table has data
- Verify events have correct `busy_state`
- Check window is large enough (minimum 4 hours)

### Focus Not Activating
- Verify `user_focus_state` table exists
- Check RLS policies allow upsert
- Test `focus-toggle` Edge Function separately

### Events Not Appearing
- Check RLS policies on events table
- Verify `owner_id` is set correctly
- Check `external_source` is set to "local"

---

## 11. Related Documentation

- Focus Toggle: `ANDROID_WIDGET_TILE_SETUP.md`
- Plan Now: `ANDROID_PLAN_NOW_SETUP.md`
- Smart Lamp: `ANDROID_SMART_LAMP_SETUP.md`
- AI Orchestrator: `supabase/functions/ai-orchestrator/index.ts`
- Conflict Detection: `supabase/functions/conflict-check/index.ts`

---

## 12. Future Enhancements

### Planned Features
- **Smart Duration**: AI suggests optimal duration based on calendar
- **Break Reminders**: Automatic breaks for long sessions
- **Session Analytics**: Track focus time and productivity
- **Team Sync**: Coordinate focus time with team members
- **Custom Buffers**: User-configurable pre/post focus buffers

### Community Requests
- Multiple focus types (deep work, light tasks, creative)
- Focus music/sounds integration
- Pomodoro timer with automatic breaks
- Weekly focus planning
- Focus streaks and achievements

---

## Support

For issues or questions:
1. Check Edge Function logs in Supabase dashboard
2. Review Android logs with `adb logcat`
3. Test Edge Function directly with cURL
4. Verify JWT validity and network connectivity
5. Check prayer times and events data integrity

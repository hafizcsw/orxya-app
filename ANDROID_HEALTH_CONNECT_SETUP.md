# Android Health Connect Integration Guide

## Overview
This guide covers the setup and implementation of Health Connect integration for Android to sync health metrics (steps, sleep, HRV) to the backend.

## Prerequisites
- Android 14+ (API 34+)
- Health Connect app installed on device
- Supabase backend with tables: `signals_raw`, `signals_daily`, `user_metrics_baseline`

## Setup Steps

### 1. Add Dependencies to `app/build.gradle`

```kotlin
dependencies {
    // Health Connect
    implementation("androidx.health.connect:connect-client:1.1.0-alpha07")
    
    // WorkManager for background sync
    implementation("androidx.work:work-runtime-ktx:2.9.0")
    
    // Coroutines
    implementation("org.jetbrains.kotlinx:kotlinx-coroutines-android:1.7.3")
    
    // Networking
    implementation("com.squareup.okhttp3:okhttp:4.12.0")
    implementation("org.jetbrains.kotlinx:kotlinx-serialization-json:1.6.0")
}
```

### 2. Permissions

No manifest permissions needed for Health Connect. Permissions are requested at runtime through the Health Connect app.

### 3. Initialize Health Sync on App Start

In your `MainActivity.kt` or `Application` class:

```kotlin
import com.oryxa.app.health.HealthPerms
import com.oryxa.app.health.HealthSyncScheduler

class MainActivity : ComponentActivity() {
    private lateinit var healthPerms: HealthPerms

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        
        healthPerms = HealthPerms(this)
        
        lifecycleScope.launch {
            if (healthPerms.isAvailable()) {
                // Request permissions
                if (healthPerms.ensurePermissions(this@MainActivity)) {
                    // Schedule background sync
                    HealthSyncScheduler.scheduleHealthSync(applicationContext)
                }
            }
        }
    }
}
```

### 4. Set JWT Token for Authentication

When user logs in, store the JWT token:

```kotlin
getSharedPreferences("auth", Context.MODE_PRIVATE)
    .edit()
    .putString("jwt_token", jwtToken)
    .apply()
```

### 5. Manual Sync Trigger (Optional)

To trigger immediate sync from UI:

```kotlin
import com.oryxa.app.health.HealthSyncScheduler

// In a button click or UI action
HealthSyncScheduler.scheduleImmediateSync(context)
```

## How It Works

### Data Flow

1. **Health Connect** stores health data from various sources (Samsung Health, Google Fit, etc.)
2. **HealthSyncWorker** runs periodically (every 12h) or on-demand
3. Uses **Change Tokens** to fetch only new/updated data efficiently
4. Converts health records to `SignalsRawRow` format
5. Uploads batches to Edge Function `ingest-signals-raw`
6. Backend stores in `signals_raw` table with RLS protection

### ETL Process

Daily at 02:15 UTC, the `etl-health-daily` function:
1. Aggregates raw signals into daily summaries (`signals_daily`)
2. Updates 14-day rolling baseline for HRV (`user_metrics_baseline`)
3. Calculates HRV Z-Score for personalized insights

### Metrics Tracked

- **Steps**: Total daily steps from step counter
- **Sleep**: Total sleep duration in minutes
- **HRV RMSSD**: Heart Rate Variability (Root Mean Square of Successive Differences)
- **HRV Z-Score**: Personalized HRV score based on user's 14-day baseline

## Battery Optimization

- **No polling**: Uses Health Connect's change token system
- **Constrained sync**: Periodic sync only on WiFi + charging
- **Immediate sync**: Only when app is opened or manually triggered
- **WorkManager**: Handles scheduling with OS battery optimization

## Privacy & Security

- All data scoped to authenticated user via RLS policies
- JWT authentication required for all API calls
- No cross-user data access possible
- User can revoke Health Connect permissions anytime

## Troubleshooting

### Health Connect Not Available
- Ensure device is Android 14+
- Install Health Connect from Play Store
- Check device compatibility

### No Data Syncing
- Verify permissions granted in Health Connect app
- Check JWT token is valid
- Review WorkManager logs: `adb logcat -s WM-WorkerWrapper`
- Ensure network connectivity

### Edge Function Errors
- Check Supabase logs for `ingest-signals-raw`
- Verify RLS policies allow user to insert
- Confirm JWT token format

## Testing

1. Grant Health Connect permissions
2. Add sample data in Health Connect or connected apps
3. Trigger immediate sync: `HealthSyncScheduler.scheduleImmediateSync(context)`
4. Check `signals_raw` table in Supabase
5. Run ETL manually if needed
6. Verify `signals_daily` and `user_metrics_baseline` populated

## Next Steps

- Add UI to display health metrics (see `HealthMetricsCard.tsx`)
- Implement data visualization charts
- Add more health metrics (heart rate, activity, nutrition)
- Enable user control over sync frequency

package com.oryxa.app.health

import android.content.Context
import androidx.work.*
import java.util.concurrent.TimeUnit

object HealthSyncScheduler {
    
    fun scheduleHealthSync(context: Context) {
        // Constraints: WiFi + Charging for periodic sync
        val constraints = Constraints.Builder()
            .setRequiredNetworkType(NetworkType.UNMETERED)
            .setRequiresCharging(true)
            .build()

        // Periodic sync every 12 hours (minimum is 15 minutes, but we use longer for battery)
        val periodicWork = PeriodicWorkRequestBuilder<HealthSyncWorker>(
            12, TimeUnit.HOURS
        )
            .setConstraints(constraints)
            .addTag("health_sync_periodic")
            .build()

        WorkManager.getInstance(context).enqueueUniquePeriodicWork(
            "HealthSyncPeriodic",
            ExistingPeriodicWorkPolicy.KEEP,
            periodicWork
        )

        // Also enqueue one-time immediate sync
        scheduleImmediateSync(context)
    }

    fun scheduleImmediateSync(context: Context) {
        val oneTimeWork = OneTimeWorkRequestBuilder<HealthSyncWorker>()
            .setConstraints(
                Constraints.Builder()
                    .setRequiredNetworkType(NetworkType.CONNECTED)
                    .build()
            )
            .addTag("health_sync_immediate")
            .build()

        WorkManager.getInstance(context).enqueueUniqueWork(
            "HealthSyncImmediate",
            ExistingWorkPolicy.REPLACE,
            oneTimeWork
        )
    }

    fun cancelHealthSync(context: Context) {
        WorkManager.getInstance(context).cancelUniqueWork("HealthSyncPeriodic")
        WorkManager.getInstance(context).cancelAllWorkByTag("health_sync_periodic")
        WorkManager.getInstance(context).cancelAllWorkByTag("health_sync_immediate")
    }
}

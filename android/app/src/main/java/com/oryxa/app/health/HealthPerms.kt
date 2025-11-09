package com.oryxa.app.health

import android.app.Activity
import android.content.Context
import androidx.health.connect.client.HealthConnectClient
import androidx.health.connect.client.PermissionController
import androidx.health.connect.client.permission.HealthPermission
import androidx.health.connect.client.records.HeartRateVariabilityRmssdRecord
import androidx.health.connect.client.records.SleepSessionRecord
import androidx.health.connect.client.records.StepsRecord

class HealthPerms(private val context: Context) {
    private val hc by lazy { 
        HealthConnectClient.getOrCreate(context) 
    }

    suspend fun isAvailable(): Boolean {
        return HealthConnectClient.getSdkStatus(context) == HealthConnectClient.SDK_AVAILABLE
    }

    // Required read permissions
    val readPerms = setOf(
        HealthPermission.getReadPermission(StepsRecord::class),
        HealthPermission.getReadPermission(SleepSessionRecord::class),
        HealthPermission.getReadPermission(HeartRateVariabilityRmssdRecord::class)
    )

    suspend fun hasPermissions(): Boolean {
        val granted = hc.permissionController.getGrantedPermissions()
        return readPerms.subtract(granted).isEmpty()
    }

    suspend fun requestPermissions(activity: Activity) {
        val requestPermissionActivityContract = 
            PermissionController.createRequestPermissionResultContract()
        
        val requestPermissions = activity.registerForActivityResult(
            requestPermissionActivityContract
        ) { granted ->
            // Handle result if needed
        }
        
        requestPermissions.launch(readPerms)
    }

    suspend fun ensurePermissions(activity: Activity): Boolean {
        if (hasPermissions()) return true
        requestPermissions(activity)
        // Re-check after request
        return hasPermissions()
    }
}

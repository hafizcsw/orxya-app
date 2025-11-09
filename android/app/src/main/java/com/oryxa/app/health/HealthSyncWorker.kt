package com.oryxa.app.health

import android.content.Context
import com.oryxa.app.security.SecureStorage
import androidx.health.connect.client.HealthConnectClient
import androidx.health.connect.client.changes.DeletionChange
import androidx.health.connect.client.changes.UpsertionChange
import androidx.health.connect.client.records.HeartRateVariabilityRmssdRecord
import androidx.health.connect.client.records.SleepSessionRecord
import androidx.health.connect.client.records.StepsRecord
import androidx.health.connect.client.request.ChangesTokenRequest
import androidx.work.CoroutineWorker
import androidx.work.WorkerParameters
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import kotlinx.serialization.Serializable
import kotlinx.serialization.encodeToString
import kotlinx.serialization.json.Json
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import java.time.Duration
import java.time.ZoneId

class HealthSyncWorker(
    appContext: Context,
    params: WorkerParameters
) : CoroutineWorker(appContext, params) {

    private val hc by lazy { HealthConnectClient.getOrCreate(applicationContext) }
    private val client = OkHttpClient()
    private val json = Json { ignoreUnknownKeys = true }

    override suspend fun doWork(): Result = withContext(Dispatchers.IO) {
        try {
            // Get or create changes token
            var token = HcStore.getToken(applicationContext)
            if (token == null) {
                token = hc.getChangesToken(
                    ChangesTokenRequest(
                        setOf(
                            StepsRecord::class,
                            SleepSessionRecord::class,
                            HeartRateVariabilityRmssdRecord::class
                        )
                    )
                )
                HcStore.putToken(applicationContext, token)
            }

            // Fetch changes in batches
            val rows = mutableListOf<SignalsRawRow>()
            var nextToken = token

            while (true) {
                val changes = hc.getChanges(nextToken)
                
                changes.changes.forEach { change ->
                    when (change) {
                        is UpsertionChange -> when (val record = change.record) {
                            is StepsRecord -> rows.addAll(record.toRawRows())
                            is SleepSessionRecord -> rows.add(record.toRawRow())
                            is HeartRateVariabilityRmssdRecord -> rows.add(record.toRawRow())
                        }
                        is DeletionChange -> {
                            // Handle deletions if needed
                        }
                    }
                }

                if (changes.hasMore) {
                    nextToken = changes.nextChangesToken
                } else {
                    HcStore.putToken(applicationContext, changes.nextChangesToken)
                    break
                }
            }

            // Send to Supabase if we have data
            if (rows.isNotEmpty()) {
                uploadToSupabase(rows)
            }

            Result.success()
        } catch (e: Exception) {
            e.printStackTrace()
            Result.retry()
        }
    }

    private fun StepsRecord.toRawRows(): List<SignalsRawRow> {
        return samples.map { sample ->
            SignalsRawRow(
                metric = "steps",
                source = "HealthConnect",
                startAt = sample.startTime.atZone(ZoneId.systemDefault()).toInstant().toString(),
                endAt = sample.endTime.atZone(ZoneId.systemDefault()).toInstant().toString(),
                value = sample.count.toDouble()
            )
        }
    }

    private fun SleepSessionRecord.toRawRow(): SignalsRawRow {
        val start = startTime.atZone(ZoneId.systemDefault()).toInstant().toString()
        val end = endTime.atZone(ZoneId.systemDefault()).toInstant().toString()
        val minutes = Duration.between(startTime, endTime).toMinutes().toDouble()
        
        return SignalsRawRow(
            metric = "sleep_minutes",
            source = "HealthConnect",
            startAt = start,
            endAt = end,
            value = minutes
        )
    }

    private fun HeartRateVariabilityRmssdRecord.toRawRow(): SignalsRawRow {
        val instant = time.atZone(ZoneId.systemDefault()).toInstant().toString()
        
        return SignalsRawRow(
            metric = "hrv_rmssd",
            source = "HealthConnect",
            startAt = instant,
            endAt = instant,
            value = heartRateVariabilityMillis
        )
    }

    private suspend fun uploadToSupabase(rows: List<SignalsRawRow>) {
        // Get JWT from local storage or preferences
        val jwt = getJwtToken() ?: return
        
        val payload = UploadPayload(rows)
        val jsonBody = json.encodeToString(payload)
        
        val request = Request.Builder()
            .url("${getSupabaseUrl()}/functions/v1/ingest-signals-raw")
            .addHeader("Authorization", "Bearer $jwt")
            .addHeader("Content-Type", "application/json")
            .post(jsonBody.toRequestBody("application/json".toMediaType()))
            .build()

        client.newCall(request).execute().use { response ->
            if (!response.isSuccessful) {
                throw Exception("Upload failed: ${response.code}")
            }
        }
    }

    private fun getJwtToken(): String? {
        // Use SecureStorage for JWT token retrieval
        return SecureStorage(applicationContext).getString(SecureStorage.KEY_SESSION)
    }

    private fun getSupabaseUrl(): String {
        // Use resource string instead of hardcoded URL
        return applicationContext.getString(
            applicationContext.resources.getIdentifier(
                "supabase_url", "string", applicationContext.packageName
            )
        )
    }
}

@Serializable
data class SignalsRawRow(
    val metric: String,
    val source: String,
    val startAt: String,
    val endAt: String,
    val value: Double
)

@Serializable
data class UploadPayload(
    val rows: List<SignalsRawRow>
)

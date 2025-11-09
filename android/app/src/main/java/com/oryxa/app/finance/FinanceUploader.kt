package com.oryxa.app.finance

import android.content.Context
import android.util.Log
import com.oryxa.app.security.SecureStorage
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.GlobalScope
import kotlinx.coroutines.launch
import kotlinx.serialization.Serializable
import kotlinx.serialization.encodeToString
import kotlinx.serialization.json.Json
import okhttp3.*
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.RequestBody.Companion.toRequestBody

data class FinancialEventDTO(
  val occurredAt: String,
  val direction: String,
  val amount: Double,
  val currency: String,
  val merchant: String?,
  val category: String?,
  val sourceType: String,
  val confidence: Double,
  val isSubscription: Boolean
)

object FinanceUploader {
  private val client = OkHttpClient()
  private val json = Json { ignoreUnknownKeys = true }

  fun enqueue(ctx: Context, dto: FinancialEventDTO, fingerprint: String) {
    GlobalScope.launch(Dispatchers.IO) {
      runCatching {
        // Use SecureStorage instead of plain SharedPreferences
        val storage = SecureStorage(ctx)
        val token = storage.getString(SecureStorage.KEY_SESSION) 
          ?: throw Exception("No JWT token found")
        
        val event = mapOf(
          "occurred_at" to dto.occurredAt,
          "direction" to dto.direction,
          "amount" to dto.amount,
          "currency" to dto.currency,
          "merchant" to dto.merchant,
          "category" to dto.category,
          "source_type" to dto.sourceType,
          "confidence" to dto.confidence,
          "is_subscription" to dto.isSubscription,
          "client_fp" to fingerprint
        )
        
        val body = mapOf("events" to listOf(event))
        val jsonBody = json.encodeToString(body)
        
        // Use resource string instead of hardcoded URL
        val supabaseUrl = ctx.getString(
          ctx.resources.getIdentifier("supabase_url", "string", ctx.packageName)
        )
        
        val request = Request.Builder()
          .url("$supabaseUrl/functions/v1/ingest-financial-events")
          .addHeader("Authorization", "Bearer $token")
          .addHeader("Content-Type", "application/json")
          .post(jsonBody.toRequestBody("application/json".toMediaType()))
          .build()
        
        client.newCall(request).execute().use { response ->
          if (response.isSuccessful) {
            Log.d("FinanceUpload", "✅ Success: ${dto.amount} ${dto.currency}")
          } else {
            Log.e("FinanceUpload", "❌ Failed: ${response.code} - ${response.message}")
          }
        }
      }.onFailure { e ->
        Log.e("FinanceUpload", "💥 Error uploading financial event", e)
      }
    }
  }
}

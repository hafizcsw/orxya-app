package com.oryxa.app.finance

import android.content.Context
import android.util.Log
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.GlobalScope
import kotlinx.coroutines.launch
import okhttp3.*
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.RequestBody.Companion.toRequestBody
import org.json.JSONArray
import org.json.JSONObject

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

  fun enqueue(ctx: Context, dto: FinancialEventDTO, fingerprint: String) {
    GlobalScope.launch(Dispatchers.IO) {
      runCatching {
        val token = getSupabaseToken(ctx) ?: return@runCatching
        
        val event = JSONObject().apply {
          put("occurred_at", dto.occurredAt)
          put("direction", dto.direction)
          put("amount", dto.amount)
          put("currency", dto.currency)
          put("merchant", dto.merchant)
          put("category", dto.category)
          put("source_type", dto.sourceType)
          put("confidence", dto.confidence)
          put("is_subscription", dto.isSubscription)
          put("client_fp", fingerprint)
        }
        
        val body = JSONObject().apply {
          put("events", JSONArray().put(event))
        }
        
        val supabaseUrl = ctx.getString(ctx.resources.getIdentifier(
          "supabase_url", "string", ctx.packageName
        ))
        
        val request = Request.Builder()
          .url("$supabaseUrl/functions/v1/ingest-financial-events")
          .addHeader("Authorization", "Bearer $token")
          .addHeader("Content-Type", "application/json")
          .post(body.toString().toRequestBody("application/json".toMediaType()))
          .build()
        
        client.newCall(request).execute().use { response ->
          if (response.isSuccessful) {
            Log.d("FinanceUpload", "Success: ${dto.amount} ${dto.currency}")
          } else {
            Log.e("FinanceUpload", "Failed: ${response.code}")
          }
        }
      }.onFailure { e ->
        Log.e("FinanceUpload", "Error uploading", e)
      }
    }
  }

  private fun getSupabaseToken(ctx: Context): String? {
    // TODO: استرجاع JWT من SharedPreferences أو Capacitor
    // هذا placeholder - يجب ربطه بنظام المصادقة الفعلي
    val prefs = ctx.getSharedPreferences("supabase_auth", Context.MODE_PRIVATE)
    return prefs.getString("access_token", null)
  }
}

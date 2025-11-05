package com.oryxa.app

import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.Context
import android.content.SharedPreferences
import android.widget.RemoteViews
import androidx.work.*
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import org.json.JSONObject
import java.net.HttpURLConnection
import java.net.URL
import java.text.SimpleDateFormat
import java.util.*
import java.util.concurrent.TimeUnit

class TodayWidgetProvider : AppWidgetProvider() {
    
    override fun onUpdate(
        context: Context,
        appWidgetManager: AppWidgetManager,
        appWidgetIds: IntArray
    ) {
        // Update all widgets
        for (appWidgetId in appWidgetIds) {
            updateWidget(context, appWidgetManager, appWidgetId)
        }
        
        // Schedule periodic updates
        scheduleWidgetUpdate(context)
    }
    
    override fun onEnabled(context: Context) {
        super.onEnabled(context)
        scheduleWidgetUpdate(context)
    }
    
    override fun onDisabled(context: Context) {
        super.onDisabled(context)
        WorkManager.getInstance(context).cancelUniqueWork("GlancesWidgetUpdate")
    }
    
    private fun scheduleWidgetUpdate(context: Context) {
        val updateRequest = PeriodicWorkRequestBuilder<GlancesUpdateWorker>(
            15, TimeUnit.MINUTES
        ).setConstraints(
            Constraints.Builder()
                .setRequiredNetworkType(NetworkType.CONNECTED)
                .build()
        ).build()
        
        WorkManager.getInstance(context).enqueueUniquePeriodicWork(
            "GlancesWidgetUpdate",
            ExistingPeriodicWorkPolicy.KEEP,
            updateRequest
        )
    }
    
    companion object {
        fun updateWidget(
            context: Context,
            appWidgetManager: AppWidgetManager,
            appWidgetId: Int
        ) {
            val prefs = context.getSharedPreferences("oryxa_widget", Context.MODE_PRIVATE)
            val glancesData = prefs.getString("glances_data", null)
            
            val views = RemoteViews(context.packageName, R.layout.widget_today)
            
            if (glancesData != null) {
                try {
                    val json = JSONObject(glancesData)
                    val glances = json.getJSONObject("glances")
                    
                    // Next Task
                    if (glances.has("next_task") && !glances.isNull("next_task")) {
                        val nextTask = glances.getJSONObject("next_task")
                        val title = nextTask.optString("title", "لا توجد مهام")
                        val startAt = nextTask.optString("start_at", "")
                        
                        views.setTextViewText(R.id.next_task_title, title)
                        if (startAt.isNotEmpty()) {
                            val timeRemaining = calculateTimeRemaining(startAt)
                            views.setTextViewText(R.id.next_task_time, timeRemaining)
                        }
                    } else {
                        views.setTextViewText(R.id.next_task_title, "لا توجد مهام قادمة")
                        views.setTextViewText(R.id.next_task_time, "")
                    }
                    
                    // Prayer Next
                    if (glances.has("prayer_next") && !glances.isNull("prayer_next")) {
                        val prayer = glances.getJSONObject("prayer_next")
                        val name = prayer.optString("name", "")
                        val time = prayer.optString("time", "")
                        
                        views.setTextViewText(R.id.prayer_name, "صلاة $name")
                        views.setTextViewText(R.id.prayer_time, time)
                    }
                    
                    // Steps Today
                    if (glances.has("steps_today") && !glances.isNull("steps_today")) {
                        val steps = glances.getJSONObject("steps_today")
                        val count = steps.optInt("steps", 0)
                        views.setTextViewText(R.id.steps_count, "$count خطوة")
                    }
                    
                    // Work Progress
                    if (glances.has("work_progress") && !glances.isNull("work_progress")) {
                        val work = glances.getJSONObject("work_progress")
                        val hours = work.optInt("hours", 0)
                        val minutes = work.optInt("minutes", 0)
                        views.setTextViewText(R.id.work_progress, "${hours}س ${minutes}د")
                    }
                    
                    // Conflicts Badge
                    if (glances.has("conflicts_badge") && !glances.isNull("conflicts_badge")) {
                        val conflicts = glances.getJSONObject("conflicts_badge")
                        val count = conflicts.optInt("count", 0)
                        views.setTextViewText(R.id.conflicts_count, "$count")
                    }
                    
                } catch (e: Exception) {
                    e.printStackTrace()
                    views.setTextViewText(R.id.next_task_title, "خطأ في تحميل البيانات")
                }
            } else {
                views.setTextViewText(R.id.next_task_title, "جاري التحميل...")
            }
            
            appWidgetManager.updateAppWidget(appWidgetId, views)
        }
        
        private fun calculateTimeRemaining(startAt: String): String {
            try {
                val format = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss", Locale.getDefault())
                format.timeZone = TimeZone.getTimeZone("UTC")
                val startDate = format.parse(startAt) ?: return ""
                
                val now = Date()
                val diff = startDate.time - now.time
                
                if (diff < 0) return "الآن"
                
                val hours = TimeUnit.MILLISECONDS.toHours(diff)
                val minutes = TimeUnit.MILLISECONDS.toMinutes(diff) % 60
                
                return when {
                    hours > 0 -> "${hours}س ${minutes}د"
                    minutes > 0 -> "${minutes} دقيقة"
                    else -> "قريباً"
                }
            } catch (e: Exception) {
                return ""
            }
        }
    }
}

class GlancesUpdateWorker(
    context: Context,
    params: WorkerParameters
) : CoroutineWorker(context, params) {
    
    override suspend fun doWork(): Result = withContext(Dispatchers.IO) {
        try {
            val prefs = applicationContext.getSharedPreferences("oryxa_prefs", Context.MODE_PRIVATE)
            val jwt = prefs.getString("jwt_token", null) ?: return@withContext Result.failure()
            
            val url = URL("https://gcjggazmatipzqnxixhp.supabase.co/functions/v1/glances-feed")
            val connection = url.openConnection() as HttpURLConnection
            
            connection.requestMethod = "POST"
            connection.setRequestProperty("Authorization", "Bearer $jwt")
            connection.setRequestProperty("Content-Type", "application/json")
            connection.doOutput = true
            
            val responseCode = connection.responseCode
            if (responseCode == HttpURLConnection.HTTP_OK) {
                val response = connection.inputStream.bufferedReader().use { it.readText() }
                
                // Save to SharedPreferences
                val widgetPrefs = applicationContext.getSharedPreferences("oryxa_widget", Context.MODE_PRIVATE)
                widgetPrefs.edit().putString("glances_data", response).apply()
                
                // Update all widgets
                val appWidgetManager = AppWidgetManager.getInstance(applicationContext)
                val widgetIds = appWidgetManager.getAppWidgetIds(
                    android.content.ComponentName(applicationContext, TodayWidgetProvider::class.java)
                )
                
                for (widgetId in widgetIds) {
                    TodayWidgetProvider.updateWidget(applicationContext, appWidgetManager, widgetId)
                }
                
                Result.success()
            } else {
                Result.retry()
            }
        } catch (e: Exception) {
            e.printStackTrace()
            Result.retry()
        }
    }
}

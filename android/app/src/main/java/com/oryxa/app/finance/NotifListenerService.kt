package com.oryxa.app.finance

import android.service.notification.NotificationListenerService
import android.service.notification.StatusBarNotification
import android.util.Log
import java.time.Instant
import java.time.ZoneId

class NotifListenerService : NotificationListenerService() {

  private val allowedPkgs = setOf(
    // تطبيقات الرسائل الشائعة
    "com.samsung.android.messaging",
    "com.google.android.apps.messaging",
    // أمثلة بنوك (أضف حسب منطقتك)
    "com.enbd.mobilebanking",
    "com.adib.mobilebanking",
    "com.dib.app",
    "sa.com.stc.mystc",
    "com.alrajhibank.mobile"
  )

  override fun onNotificationPosted(sbn: StatusBarNotification) {
    try {
      val pkg = sbn.packageName ?: return
      if (!allowedPkgs.contains(pkg)) return

      val extras = sbn.notification.extras
      val title = extras.getCharSequence("android.title")?.toString().orEmpty()
      val text = extras.getCharSequence("android.text")?.toString().orEmpty()
      val big = extras.getCharSequence("android.bigText")?.toString().orEmpty()
      val body = listOf(title, text, big).filter { it.isNotBlank() }.joinToString(" | ")
      
      if (body.isBlank()) return

      val occurredAtIso = Instant.ofEpochMilli(sbn.postTime)
        .atZone(ZoneId.systemDefault()).toInstant().toString()

      // تحليل محلي
      val parsed = TxnParser.parse(body)

      // حد أدنى من الثقة
      if (parsed.confidence >= 0.5) {
        val fingerprint = Fingerprint.of(body, occurredAtIso)
        
        // تحقق من عدم التكرار
        if (!DedupStore.isDuplicate(this, fingerprint)) {
          DedupStore.markSeen(this, fingerprint)
          
          FinanceUploader.enqueue(
            this,
            FinancialEventDTO(
              occurredAtIso,
              parsed.direction,
              parsed.amount,
              parsed.currency,
              parsed.merchant,
              parsed.category,
              "notification",
              parsed.confidence,
              parsed.isSubscription
            ),
            fingerprint
          )
          
          Log.d("FinanceNotif", "Parsed: ${parsed.amount} ${parsed.currency} @ ${parsed.merchant}")
        }
      }
    } catch (e: Throwable) {
      Log.e("FinanceNotif", "Error processing notification", e)
    }
  }

  override fun onNotificationRemoved(sbn: StatusBarNotification) {
    // لا نفعل شيئًا
  }
}

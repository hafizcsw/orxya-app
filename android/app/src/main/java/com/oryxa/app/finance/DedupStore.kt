package com.oryxa.app.finance

import android.content.Context

object DedupStore {
  private const val PREFS_NAME = "finance_dedup"
  private const val KEY_FINGERPRINTS = "fingerprints"
  private const val MAX_SIZE = 100
  private const val EXPIRY_MS = 30 * 60 * 1000L // 30 دقيقة

  fun isDuplicate(ctx: Context, fingerprint: String): Boolean {
    val prefs = ctx.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
    val stored = prefs.getStringSet(KEY_FINGERPRINTS, emptySet()) ?: emptySet()
    
    // تنظيف القديمة
    val now = System.currentTimeMillis()
    val valid = stored.filter { entry ->
      val parts = entry.split("|")
      if (parts.size != 2) return@filter false
      val timestamp = parts[1].toLongOrNull() ?: 0L
      (now - timestamp) < EXPIRY_MS
    }.toSet()
    
    if (valid.size != stored.size) {
      prefs.edit().putStringSet(KEY_FINGERPRINTS, valid).apply()
    }
    
    return valid.any { it.startsWith("$fingerprint|") }
  }

  fun markSeen(ctx: Context, fingerprint: String) {
    val prefs = ctx.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
    val stored = prefs.getStringSet(KEY_FINGERPRINTS, emptySet())?.toMutableSet() ?: mutableSetOf()
    
    val now = System.currentTimeMillis()
    stored.add("$fingerprint|$now")
    
    // احتفظ بآخر MAX_SIZE فقط
    val sorted = stored.sortedByDescending { 
      it.split("|").getOrNull(1)?.toLongOrNull() ?: 0L 
    }
    
    prefs.edit()
      .putStringSet(KEY_FINGERPRINTS, sorted.take(MAX_SIZE).toSet())
      .apply()
  }
}

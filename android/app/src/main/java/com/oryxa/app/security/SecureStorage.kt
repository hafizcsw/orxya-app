package com.oryxa.app.security

import android.content.Context
import android.content.SharedPreferences
import androidx.security.crypto.EncryptedSharedPreferences
import androidx.security.crypto.MasterKey

/**
 * Secure storage for sensitive data using EncryptedSharedPreferences
 * 
 * Usage:
 * val storage = SecureStorage(context)
 * storage.saveString("key", "value")
 * val value = storage.getString("key")
 */
class SecureStorage(context: Context) {
    
    private val masterKey: MasterKey = MasterKey.Builder(context)
        .setKeyScheme(MasterKey.KeyScheme.AES256_GCM)
        .build()

    private val prefs: SharedPreferences = EncryptedSharedPreferences.create(
        context,
        "oryxa_secure",
        masterKey,
        EncryptedSharedPreferences.PrefKeyEncryptionScheme.AES256_SIV,
        EncryptedSharedPreferences.PrefValueEncryptionScheme.AES256_GCM
    )

    fun saveString(key: String, value: String) {
        prefs.edit().putString(key, value).apply()
    }

    fun getString(key: String, defaultValue: String? = null): String? {
        return prefs.getString(key, defaultValue)
    }

    fun saveBoolean(key: String, value: Boolean) {
        prefs.edit().putBoolean(key, value).apply()
    }

    fun getBoolean(key: String, defaultValue: Boolean = false): Boolean {
        return prefs.getBoolean(key, defaultValue)
    }

    fun saveLong(key: String, value: Long) {
        prefs.edit().putLong(key, value).apply()
    }

    fun getLong(key: String, defaultValue: Long = 0L): Long {
        return prefs.getLong(key, defaultValue)
    }

    fun remove(key: String) {
        prefs.edit().remove(key).apply()
    }

    fun clear() {
        prefs.edit().clear().apply()
    }

    fun contains(key: String): Boolean {
        return prefs.contains(key)
    }

    companion object {
        // Common keys used in the app
        const val KEY_SESSION = "sb_session"
        const val KEY_ACCESS_TOKEN = "access_token"
        const val KEY_REFRESH_TOKEN = "refresh_token"
        const val KEY_LAST_SYNC = "last_sync"
        const val KEY_WIDGET_TOKEN = "widget_token"
        
        // Privacy consent keys
        const val KEY_HEALTH_CONSENT = "health_consent"
        const val KEY_FINANCE_CONSENT = "finance_consent"
        const val KEY_CALENDAR_CONSENT = "calendar_consent"
        const val KEY_LOCATION_CONSENT = "location_consent"
    }
}

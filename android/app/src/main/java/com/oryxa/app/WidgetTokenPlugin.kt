package com.oryxa.app

import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.CapacitorPlugin
import android.content.Context
import android.content.SharedPreferences
import androidx.security.crypto.EncryptedSharedPreferences
import androidx.security.crypto.MasterKey

@CapacitorPlugin(name = "WidgetToken")
class WidgetTokenPlugin : Plugin() {
    
    private val PREFS_NAME = "oryxa_prefs"
    private val KEY_JWT_TOKEN = "jwt_token"
    
    private fun getEncryptedPrefs(): SharedPreferences {
        val masterKey = MasterKey.Builder(context)
            .setKeyScheme(MasterKey.KeyScheme.AES256_GCM)
            .build()
            
        return EncryptedSharedPreferences.create(
            context,
            PREFS_NAME,
            masterKey,
            EncryptedSharedPreferences.PrefKeyEncryptionScheme.AES256_SIV,
            EncryptedSharedPreferences.PrefValueEncryptionScheme.AES256_GCM
        )
    }
    
    @PluginMethod
    fun saveToken(call: PluginCall) {
        val token = call.getString("token")
        
        if (token.isNullOrEmpty()) {
            call.reject("Token is required")
            return
        }
        
        try {
            val prefs = getEncryptedPrefs()
            prefs.edit().putString(KEY_JWT_TOKEN, token).apply()
            
            val ret = com.getcapacitor.JSObject()
            ret.put("success", true)
            call.resolve(ret)
            
            // Log for debugging
            android.util.Log.d("WidgetToken", "Token saved successfully")
        } catch (e: Exception) {
            android.util.Log.e("WidgetToken", "Failed to save token", e)
            call.reject("Failed to save token: ${e.message}")
        }
    }
    
    @PluginMethod
    fun removeToken(call: PluginCall) {
        try {
            val prefs = getEncryptedPrefs()
            prefs.edit().remove(KEY_JWT_TOKEN).apply()
            
            val ret = com.getcapacitor.JSObject()
            ret.put("success", true)
            call.resolve(ret)
            
            android.util.Log.d("WidgetToken", "Token removed successfully")
        } catch (e: Exception) {
            android.util.Log.e("WidgetToken", "Failed to remove token", e)
            call.reject("Failed to remove token: ${e.message}")
        }
    }
    
    @PluginMethod
    fun getToken(call: PluginCall) {
        try {
            val prefs = getEncryptedPrefs()
            val token = prefs.getString(KEY_JWT_TOKEN, null)
            
            val ret = com.getcapacitor.JSObject()
            ret.put("token", token)
            call.resolve(ret)
        } catch (e: Exception) {
            android.util.Log.e("WidgetToken", "Failed to get token", e)
            call.reject("Failed to get token: ${e.message}")
        }
    }
}

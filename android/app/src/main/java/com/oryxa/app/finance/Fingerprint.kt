package com.oryxa.app.finance

import java.security.MessageDigest

object Fingerprint {
  fun of(body: String, occurredAtIso: String): String {
    val norm = body.lowercase()
      .replace(Regex("\\s+"), " ")
      .take(160)
    val seed = "$norm|$occurredAtIso"
    
    val md = MessageDigest.getInstance("SHA-256")
    return md.digest(seed.toByteArray())
      .joinToString("") { "%02x".format(it) }
      .take(32)
  }
}

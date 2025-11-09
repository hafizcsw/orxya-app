package com.oryxa.app.finance

import java.util.Locale

data class ParsedTxn(
  val amount: Double,
  val currency: String,
  val direction: String,
  val merchant: String?,
  val category: String?,
  val isSubscription: Boolean,
  val confidence: Double
)

object TxnParser {
  private val currs = listOf("SAR", "AED", "USD", "EUR", "GBP", "KWD", "QAR", "OMR", "BHD", "EGP")
  private val currMap = mapOf(
    "ر.س" to "SAR", "ريال" to "SAR", "د.إ" to "AED", "درهم" to "AED",
    "\$" to "USD", "€" to "EUR", "£" to "GBP"
  )

  private val debitKw = listOf(
    "خصم", "شراء", "دفع", "سحب", "مشتريات",
    "debit", "purchase", "spent", "withdrawal", "pos", "payment"
  )
  
  private val creditKw = listOf(
    "ايداع", "إيداع", "إضافة", "حوالة", "رصيد",
    "credit", "refund", "received", "inward", "deposit"
  )

  private val amtRegex = Regex(
    """(?ix)
      (?:
        (?:(${currs.joinToString("|")})|\$|€|£|ر\.س|ريال|د\.إ|درهم)\s*([0-9]+(?:[.,][0-9]{1,2})?)
      )
      |
      (?:
        ([0-9]+(?:[.,][0-9]{1,2})?)\s*(?:${currs.joinToString("|")}|\$|€|£|ر\.س|ريال|د\.إ|درهم)
      )
    """.trimIndent()
  )

  private val merchRegex = Regex("""(?i)(?:\bat\b|في|من|to|at)\s+([A-Za-z0-9\u0600-\u06FF .,_-]{2,40})""")

  private val subKw = listOf(
    "اشتراك", "تجديد", "renewal", "subscription", 
    "auto-debit", "autopay", "recurring"
  )

  fun parse(textIn: String): ParsedTxn {
    val text = textIn.replace('\n', ' ').trim()
    val tLower = text.lowercase(Locale.ROOT)

    // 1) مبلغ وعملة
    var amount = 0.0
    var currency = "USD"
    val m = amtRegex.find(text)
    if (m != null) {
      val g1 = m.groups[1]?.value
      val g2 = m.groups[2]?.value
      val g3 = m.groups[3]?.value
      
      val (numStr, curStr) = when {
        g1 != null && g2 != null -> g2 to g1
        g3 != null -> {
          val cur = m.value.replace(Regex("[^A-Za-z\u0600-\u06FF\$€£.]"), "").ifBlank { "USD" }
          g3 to cur
        }
        else -> "0" to "USD"
      }
      
      amount = numStr.replace(",", ".").toDoubleOrNull() ?: 0.0
      currency = normalizeCurrency(curStr)
    }

    // 2) اتجاه
    val direction = when {
      creditKw.any { tLower.contains(it) } -> "incoming"
      debitKw.any { tLower.contains(it) } -> "outgoing"
      text.contains("-") -> "outgoing"
      else -> "outgoing"
    }

    // 3) تاجر
    val merchant = merchRegex.find(text)?.groupValues?.getOrNull(1)?.trim()
      ?.replace(Regex("""[|،,.]$"""), "")
      ?.take(50)

    // 4) فئة
    val category = when {
      tLower.contains("atm") || tLower.contains("صراف") -> "atm"
      tLower.contains("pos") || tLower.contains("متجر") || tLower.contains("شراء") -> "pos"
      tLower.contains("transfer") || tLower.contains("حوالة") -> "transfer"
      tLower.contains("fee") || tLower.contains("رسوم") -> "fee"
      tLower.contains("salary") || tLower.contains("راتب") -> "salary"
      else -> null
    }

    // 5) اشتراك؟
    val isSub = subKw.any { tLower.contains(it) }

    // 6) ثقة
    val cAmt = if (amount > 0) 0.55 else 0.0
    val cDir = 0.25
    val cMer = if (!merchant.isNullOrBlank()) 0.15 else 0.0
    val cCat = if (!category.isNullOrBlank()) 0.05 else 0.0
    val confidence = (cAmt + cDir + cMer + cCat).coerceIn(0.0, 1.0)

    return ParsedTxn(amount, currency, direction, merchant, category, isSub, confidence)
  }

  private fun normalizeCurrency(cur: String): String {
    val c = cur.uppercase(Locale.ROOT).replace(".", "")
    return when {
      currs.contains(c) -> c
      currMap.containsKey(cur) -> currMap[cur]!!
      c.contains("$") || c == "USD" -> "USD"
      c.contains("ر") || c.contains("ريال") -> "SAR"
      c.contains("د") || c.contains("درهم") -> "AED"
      c.contains("€") || c == "EUR" -> "EUR"
      c.contains("£") || c == "GBP" -> "GBP"
      else -> "USD"
    }
  }
}

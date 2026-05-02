package org.smarthealthit.checkin.wallet

import java.util.Base64

object SmartMdocBase64 {
    fun encodeUrl(bytes: ByteArray): String = Base64.getUrlEncoder().withoutPadding().encodeToString(bytes)

    fun decodeUrl(value: String): ByteArray {
        val normalized = value + "=".repeat((4 - value.length % 4) % 4)
        return Base64.getUrlDecoder().decode(normalized)
    }
}

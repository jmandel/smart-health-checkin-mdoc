package org.smarthealthit.checkin.wallet

import java.security.interfaces.ECPublicKey
import org.json.JSONObject

data class DirectMdocRequest(
    val origin: String,
    val protocol: String,
    val data: JSONObject,
    val deviceRequestBase64Url: String,
    val encryptionInfoBase64Url: String,
    val deviceRequestBytes: ByteArray,
    val encryptionInfoBytes: ByteArray,
    val itemsRequest: DecodedItemsRequest,
    val encryptionInfo: DirectMdocEncryptionInfo,
    val sessionTranscriptBytes: ByteArray,
    val readerAuth: ReaderAuthVerification,
)

data class DirectMdocEncryptionInfo(
    val nonce: ByteArray,
    val recipientPublicKey: ECPublicKey,
    val recipientPublicKeyCose: Map<*, *>,
)

object DirectMdocRequestParser {
    private const val PROTOCOL_ORG_ISO_MDOC = "org-iso-mdoc"
    private const val PROTOCOL_ORG_DOT_ISO_MDOC = "org.iso.mdoc"

    fun parseRequestJson(requestJson: String, origin: String): DirectMdocRequest {
        val outerJson = JSONObject(requestJson)
        val data = findOrgIsoMdocData(outerJson)
            ?: error("No org-iso-mdoc request found.")
        return parseData(data, origin)
    }

    fun parseData(data: JSONObject, origin: String): DirectMdocRequest {
        val deviceRequestBase64Url = data.optString("deviceRequest")
        require(deviceRequestBase64Url.isNotBlank()) { "data.deviceRequest is missing." }
        val encryptionInfoBase64Url = data.optString("encryptionInfo")
        require(encryptionInfoBase64Url.isNotBlank()) { "data.encryptionInfo is missing." }

        val deviceRequestBytes = SmartMdocBase64.decodeUrl(deviceRequestBase64Url)
        val encryptionInfoBytes = SmartMdocBase64.decodeUrl(encryptionInfoBase64Url)
        val itemsRequest = DeviceRequestParser.parseBytes(deviceRequestBytes)
            ?: error("DeviceRequest is not a SMART Health Check-in request.")
        val encryptionInfo = parseEncryptionInfo(encryptionInfoBytes)
        val sessionTranscriptBytes = buildSessionTranscript(encryptionInfoBase64Url, origin)
        val readerAuth = verifyReaderAuth(
            itemsRequest = itemsRequest,
            sessionTranscriptBytes = sessionTranscriptBytes,
        )

        return DirectMdocRequest(
            origin = origin,
            protocol = PROTOCOL_ORG_ISO_MDOC,
            data = data,
            deviceRequestBase64Url = deviceRequestBase64Url,
            encryptionInfoBase64Url = encryptionInfoBase64Url,
            deviceRequestBytes = deviceRequestBytes,
            encryptionInfoBytes = encryptionInfoBytes,
            itemsRequest = itemsRequest,
            encryptionInfo = encryptionInfo,
            sessionTranscriptBytes = sessionTranscriptBytes,
            readerAuth = readerAuth,
        )
    }

    fun findOrgIsoMdocData(outerJson: JSONObject): JSONObject? {
        if (outerJson.has("deviceRequest")) return outerJson
        findInRequests(outerJson.optJSONArray("requests"))?.let { return it }
        outerJson.optJSONObject("digital")?.let { digital ->
            findInRequests(digital.optJSONArray("requests"))?.let { return it }
        }

        val providers = outerJson.optJSONArray("providers")
        if (providers != null) {
            for (i in 0 until providers.length()) {
                val provider = providers.optJSONObject(i) ?: continue
                if (!isMdocProtocol(provider.optString("protocol"))) continue
                val raw = provider.opt("request") ?: continue
                val request = when (raw) {
                    is JSONObject -> raw
                    is String -> runCatching { JSONObject(raw) }.getOrNull()
                    else -> null
                } ?: continue
                return request.optJSONObject("data") ?: request
            }
        }
        return null
    }

    private fun findInRequests(requests: org.json.JSONArray?): JSONObject? {
        if (requests == null) return null
        for (i in 0 until requests.length()) {
            val request = requests.optJSONObject(i) ?: continue
            if (!isMdocProtocol(request.optString("protocol"))) continue
            return request.optJSONObject("data")
        }
        return null
    }

    private fun isMdocProtocol(protocol: String): Boolean {
        return protocol == PROTOCOL_ORG_ISO_MDOC || protocol == PROTOCOL_ORG_DOT_ISO_MDOC
    }

    private fun parseEncryptionInfo(bytes: ByteArray): DirectMdocEncryptionInfo {
        val decoded = MdocCbor.decode(bytes) as? List<*> ?: error("encryptionInfo must be a CBOR array")
        require(decoded.size == 2 && decoded[0] == "dcapi") { "malformed dcapi encryptionInfo" }
        val fields = decoded[1] as? Map<*, *> ?: error("encryptionInfo fields must be a map")
        val nonce = fields["nonce"] as? ByteArray ?: error("encryptionInfo.nonce missing")
        val cose = fields["recipientPublicKey"] as? Map<*, *> ?: error("encryptionInfo.recipientPublicKey missing")
        return DirectMdocEncryptionInfo(
            nonce = nonce,
            recipientPublicKey = SmartMdocCrypto.publicKeyFromCose(cose),
            recipientPublicKeyCose = cose,
        )
    }

    fun buildSessionTranscript(encryptionInfoBase64Url: String, origin: String): ByteArray {
        val dcapiInfo = MdocCbor.encode(listOf(encryptionInfoBase64Url, origin))
        val handover = listOf("dcapi", SmartMdocCrypto.sha256(dcapiInfo))
        return MdocCbor.encode(listOf(null, null, handover))
    }

    private fun verifyReaderAuth(
        itemsRequest: DecodedItemsRequest,
        sessionTranscriptBytes: ByteArray,
    ): ReaderAuthVerification {
        val readerAuthBytes = itemsRequest.readerAuthBytes ?: return ReaderAuthVerification.ABSENT
        val detachedPayload = SmartMdocCrypto.readerAuthenticationBytes(
            sessionTranscriptBytes = sessionTranscriptBytes,
            itemsRequestTag24Bytes = itemsRequest.itemsRequestTag24Bytes,
        )
        val verified = SmartMdocCrypto.verifyDetachedCoseSign1(
            coseSign1Bytes = readerAuthBytes,
            detachedPayload = detachedPayload,
        )
        return ReaderAuthVerification(
            present = true,
            signatureValid = verified.signatureValid,
            certificateSubject = verified.certificate.subjectX500Principal.name,
        )
    }
}

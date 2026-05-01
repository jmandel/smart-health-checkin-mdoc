package org.smarthealthit.checkin.wallet

import java.security.SecureRandom
import java.security.KeyPair
import java.time.Instant
import org.json.JSONObject

internal data class DirectMdocWalletResponse(
    val credentialJson: String,
    val deviceResponseBytes: ByteArray,
    val dcapiResponseBytes: ByteArray,
    val hpkeEnc: ByteArray,
    val hpkeCipherText: ByteArray,
    val issuerSignedItemTag24Bytes: ByteArray,
    val valueDigest: ByteArray,
    val msoBytes: ByteArray,
    val issuerAuthBytes: ByteArray,
    val deviceAuthenticationBytes: ByteArray,
)

internal data class MdocResponderTestMaterial(
    val nowMillis: Long,
    val issuerKeyPair: KeyPair,
    val deviceKeyPair: KeyPair,
    val hpkeEphemeralKeyPair: KeyPair,
    val itemRandom: ByteArray,
    val signatureRandom: SecureRandom,
)

internal object SmartHealthMdocResponder {
    private const val DOC_TYPE = "org.smarthealthit.checkin.1"
    private const val NAMESPACE = "org.smarthealthit.checkin"
    private const val ELEMENT = "smart_health_checkin_response"

    fun buildCredentialResponse(
        request: DirectMdocRequest,
        smartResponse: JSONObject,
        nowMillis: Long = System.currentTimeMillis(),
        random: SecureRandom = SecureRandom(),
        testMaterial: MdocResponderTestMaterial? = null,
    ): DirectMdocWalletResponse {
        val effectiveNowMillis = testMaterial?.nowMillis ?: nowMillis
        val smartResponseJson = smartResponse.toString()
        val issuerKey = testMaterial?.issuerKeyPair ?: SmartMdocCrypto.generateP256KeyPair(random)
        val deviceKey = testMaterial?.deviceKeyPair ?: SmartMdocCrypto.generateP256KeyPair(random)
        val signatureRandom = testMaterial?.signatureRandom ?: random
        val issuerCert = SmartMdocCrypto.selfSignedCertificate(
            keyPair = issuerKey,
            nowMillis = effectiveNowMillis,
            random = signatureRandom,
        )

        val itemRandom = testMaterial?.itemRandom?.also {
            require(it.size == 16) { "IssuerSignedItem random must be 16 bytes." }
        } ?: ByteArray(16).also(random::nextBytes)
        val issuerSignedItem = linkedMapOf<Any, Any>(
            "digestID" to 0L,
            "random" to itemRandom,
            "elementIdentifier" to ELEMENT,
            "elementValue" to smartResponseJson,
        )
        val issuerSignedItemTag24Bytes = MdocCbor.tag24Bytes(MdocCbor.encode(issuerSignedItem))
        val valueDigest = SmartMdocCrypto.sha256(issuerSignedItemTag24Bytes)

        val msoBytes = buildMsoBytes(
            deviceKeyPublicCose = SmartMdocCrypto.coseEc2PublicKey(deviceKey.public),
            valueDigest = valueDigest,
            nowMillis = nowMillis,
        )
        val msoTag24Bytes = MdocCbor.tag24Bytes(msoBytes)
        val issuerAuth = SmartMdocCrypto.signCoseSign1(
            privateKey = issuerKey.private,
            payload = msoTag24Bytes,
            includeX5Chain = issuerCert,
            random = signatureRandom,
        )

        val deviceNameSpacesBytes = MdocCbor.encode(linkedMapOf<Any, Any>())
        val deviceAuthentication = MdocCbor.encode(
            listOf(
                "DeviceAuthentication",
                MdocCbor.CborRaw(request.sessionTranscriptBytes),
                DOC_TYPE,
                MdocCbor.CborTag(MdocCbor.TAG_ENCODED_CBOR, deviceNameSpacesBytes),
            )
        )
        val deviceAuthenticationBytes = MdocCbor.tag24Bytes(deviceAuthentication)
        val deviceSignature = SmartMdocCrypto.signCoseSign1(
            privateKey = deviceKey.private,
            payload = deviceAuthenticationBytes,
            random = signatureRandom,
        )

        val document = linkedMapOf<Any, Any>(
            "docType" to DOC_TYPE,
            "issuerSigned" to linkedMapOf<Any, Any>(
                "nameSpaces" to linkedMapOf<Any, Any>(
                    NAMESPACE to listOf(MdocCbor.CborRaw(issuerSignedItemTag24Bytes)),
                ),
                "issuerAuth" to MdocCbor.CborRaw(issuerAuth),
            ),
            "deviceSigned" to linkedMapOf<Any, Any>(
                "nameSpaces" to MdocCbor.CborTag(MdocCbor.TAG_ENCODED_CBOR, deviceNameSpacesBytes),
                "deviceAuth" to linkedMapOf<Any, Any>(
                    "deviceSignature" to MdocCbor.CborRaw(deviceSignature),
                ),
            ),
        )
        val deviceResponseBytes = MdocCbor.encode(
            linkedMapOf<Any, Any>(
                "version" to "1.0",
                "documents" to listOf(document),
                "status" to 0L,
            )
        )

        val sealed = SmartMdocCrypto.hpkeSeal(
            plaintext = deviceResponseBytes,
            recipientPublicKey = request.encryptionInfo.recipientPublicKey,
            info = request.sessionTranscriptBytes,
            random = random,
            ephemeralKeyPair = testMaterial?.hpkeEphemeralKeyPair,
        )
        val dcapiResponseBytes = MdocCbor.encode(
            listOf(
                "dcapi",
                linkedMapOf<Any, Any>(
                    "enc" to sealed.enc,
                    "cipherText" to sealed.cipherText,
                ),
            )
        )
        val credentialJson = JSONObject()
            .put("protocol", Registration.PROTOCOL)
            .put("data", JSONObject().put("response", SmartMdocBase64.encodeUrl(dcapiResponseBytes)))
            .toString()

        return DirectMdocWalletResponse(
            credentialJson = credentialJson,
            deviceResponseBytes = deviceResponseBytes,
            dcapiResponseBytes = dcapiResponseBytes,
            hpkeEnc = sealed.enc,
            hpkeCipherText = sealed.cipherText,
            issuerSignedItemTag24Bytes = issuerSignedItemTag24Bytes,
            valueDigest = valueDigest,
            msoBytes = msoBytes,
            issuerAuthBytes = issuerAuth,
            deviceAuthenticationBytes = deviceAuthenticationBytes,
        )
    }

    private fun buildMsoBytes(
        deviceKeyPublicCose: Map<Any, Any>,
        valueDigest: ByteArray,
        nowMillis: Long,
    ): ByteArray {
        val signed = wholeSecondIso(nowMillis)
        val validUntil = wholeSecondIso(nowMillis + 86_400_000L)
        val mso = linkedMapOf<Any, Any>(
            "version" to "1.0",
            "digestAlgorithm" to "SHA-256",
            "docType" to DOC_TYPE,
            "valueDigests" to linkedMapOf<Any, Any>(
                NAMESPACE to linkedMapOf<Any, Any>(
                    0L to valueDigest,
                ),
            ),
            "deviceKeyInfo" to linkedMapOf<Any, Any>(
                "deviceKey" to deviceKeyPublicCose,
            ),
            "validityInfo" to linkedMapOf<Any, Any>(
                "signed" to MdocCbor.CborTag(0, signed),
                "validFrom" to MdocCbor.CborTag(0, signed),
                "validUntil" to MdocCbor.CborTag(0, validUntil),
            ),
        )
        return MdocCbor.encode(mso)
    }

    private fun wholeSecondIso(millis: Long): String {
        return Instant.ofEpochMilli((millis / 1000L) * 1000L).toString()
    }
}

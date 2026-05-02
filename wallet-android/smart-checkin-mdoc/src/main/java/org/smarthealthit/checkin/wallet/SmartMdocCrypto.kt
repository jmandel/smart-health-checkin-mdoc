package org.smarthealthit.checkin.wallet

import java.math.BigInteger
import java.io.ByteArrayInputStream
import java.io.ByteArrayOutputStream
import java.security.AlgorithmParameters
import java.security.KeyFactory
import java.security.KeyPair
import java.security.KeyPairGenerator
import java.security.MessageDigest
import java.security.PrivateKey
import java.security.PublicKey
import java.security.SecureRandom
import java.security.Security
import java.security.Signature
import java.security.cert.CertificateFactory
import java.security.cert.X509Certificate
import java.security.interfaces.ECPublicKey
import java.security.spec.ECGenParameterSpec
import java.security.spec.ECParameterSpec
import java.security.spec.ECPoint
import java.security.spec.ECPublicKeySpec
import java.util.Date
import javax.crypto.Cipher
import javax.crypto.KeyAgreement
import javax.crypto.Mac
import javax.crypto.spec.GCMParameterSpec
import javax.crypto.spec.SecretKeySpec
import org.bouncycastle.asn1.ASN1EncodableVector
import org.bouncycastle.asn1.ASN1Integer
import org.bouncycastle.asn1.ASN1Sequence
import org.bouncycastle.asn1.DERSequence
import org.bouncycastle.asn1.x500.X500Name
import org.bouncycastle.cert.jcajce.JcaX509CertificateConverter
import org.bouncycastle.cert.jcajce.JcaX509v3CertificateBuilder
import org.bouncycastle.jce.provider.BouncyCastleProvider
import org.bouncycastle.operator.jcajce.JcaContentSignerBuilder

object SmartMdocCrypto {
    private const val P256_SIZE = 32
    private const val HPKE_KEM_DHKEM_P256_HKDF_SHA256 = 0x0010
    private const val HPKE_KDF_HKDF_SHA256 = 0x0001
    private const val HPKE_AEAD_AES_128_GCM = 0x0001
    private const val HPKE_NH = 32
    private const val HPKE_NK = 16
    private const val HPKE_NN = 12

    fun sha256(bytes: ByteArray): ByteArray = MessageDigest.getInstance("SHA-256").digest(bytes)

    fun generateP256KeyPair(random: SecureRandom = SecureRandom()): KeyPair {
        val generator = KeyPairGenerator.getInstance("EC")
        generator.initialize(ECGenParameterSpec("secp256r1"), random)
        return generator.generateKeyPair()
    }

    fun coseEc2PublicKey(publicKey: PublicKey): Map<Any, Any> {
        val ec = publicKey as ECPublicKey
        return linkedMapOf(
            1L to 2L,
            -1L to 1L,
            -2L to unsignedFixed(ec.w.affineX, P256_SIZE),
            -3L to unsignedFixed(ec.w.affineY, P256_SIZE),
        )
    }

    fun publicKeyFromCose(coseKey: Map<*, *>): ECPublicKey {
        val x = coseKey[-2L] as? ByteArray ?: error("recipientPublicKey missing x")
        val y = coseKey[-3L] as? ByteArray ?: error("recipientPublicKey missing y")
        val params = p256Params()
        val spec = ECPublicKeySpec(
            ECPoint(BigInteger(1, x), BigInteger(1, y)),
            params,
        )
        return KeyFactory.getInstance("EC").generatePublic(spec) as ECPublicKey
    }

    fun rawUncompressed(publicKey: ECPublicKey): ByteArray {
        return byteArrayOf(0x04.toByte()) +
            unsignedFixed(publicKey.w.affineX, P256_SIZE) +
            unsignedFixed(publicKey.w.affineY, P256_SIZE)
    }

    fun signCoseSign1(
        privateKey: PrivateKey,
        payload: ByteArray,
        includeX5Chain: X509Certificate? = null,
        random: SecureRandom = SecureRandom(),
    ): ByteArray {
        val protectedBytes = MdocCbor.encode(linkedMapOf<Any, Any>(1L to -7L))
        val unprotected = linkedMapOf<Any, Any>().apply {
            if (includeX5Chain != null) put(33L, listOf(includeX5Chain.encoded))
        }
        val sigStructure = MdocCbor.encode(
            listOf(
                "Signature1",
                protectedBytes,
                ByteArray(0),
                payload,
            )
        )
        val signature = Signature.getInstance("SHA256withECDSA")
        signature.initSign(privateKey, random)
        signature.update(sigStructure)
        val rawSignature = derEcdsaToRaw(signature.sign(), P256_SIZE)
        return MdocCbor.encode(listOf(protectedBytes, unprotected, payload, rawSignature))
    }

    fun readerAuthenticationBytes(
        sessionTranscriptBytes: ByteArray,
        itemsRequestTag24Bytes: ByteArray,
    ): ByteArray {
        val payload = MdocCbor.encode(
            listOf(
                "ReaderAuthentication",
                MdocCbor.CborRaw(sessionTranscriptBytes),
                MdocCbor.CborRaw(itemsRequestTag24Bytes),
            )
        )
        return MdocCbor.tag24Bytes(payload)
    }

    fun verifyDetachedCoseSign1(
        coseSign1Bytes: ByteArray,
        detachedPayload: ByteArray,
    ): DetachedCoseSign1Verification {
        val coseSign1 = MdocCbor.decode(coseSign1Bytes) as? List<*>
            ?: error("readerAuth must be a COSE_Sign1 array")
        require(coseSign1.size == 4) { "readerAuth COSE_Sign1 must have four entries" }
        val protectedBytes = coseSign1[0] as? ByteArray
            ?: error("readerAuth protected header must be a bstr")
        val protectedHeaders = MdocCbor.decode(protectedBytes) as? Map<*, *>
            ?: error("readerAuth protected header must decode to a map")
        val unprotectedHeaders = coseSign1[1] as? Map<*, *> ?: emptyMap<Any?, Any?>()
        require(coseSign1[2] == null) { "readerAuth payload must be detached (null)" }
        val rawSignature = coseSign1[3] as? ByteArray
            ?: error("readerAuth signature must be a bstr")
        require(rawSignature.size == P256_SIZE * 2) {
            "readerAuth ES256 signature must be ${P256_SIZE * 2} raw bytes"
        }

        val alg = protectedHeaders[1L] as? Long
            ?: error("readerAuth protected header missing alg")
        require(alg == -7L) { "readerAuth alg must be ES256 (-7), got $alg" }
        val certificateBytes = extractX5Chain(protectedHeaders[33L])
            ?: extractX5Chain(unprotectedHeaders[33L])
            ?: error("readerAuth missing x5chain header")
        require(certificateBytes.isNotEmpty()) { "readerAuth x5chain must not be empty" }
        val certificate = parseX509Certificate(certificateBytes.first())
        val sigStructure = MdocCbor.encode(
            listOf(
                "Signature1",
                protectedBytes,
                ByteArray(0),
                detachedPayload,
            )
        )
        val verifier = Signature.getInstance("SHA256withECDSA")
        verifier.initVerify(certificate.publicKey)
        verifier.update(sigStructure)
        return DetachedCoseSign1Verification(
            alg = alg,
            certificate = certificate,
            signatureValid = verifier.verify(rawEcdsaToDer(rawSignature, P256_SIZE)),
        )
    }

    fun selfSignedCertificate(
        keyPair: KeyPair,
        nowMillis: Long,
        random: SecureRandom = SecureRandom(),
    ): X509Certificate {
        ensureBouncyCastle()
        val subject = X500Name("CN=SMART Health Check-in Demo")
        val notBefore = Date(nowMillis - 60_000L)
        val notAfter = Date(nowMillis + 86_400_000L)
        val serial = BigInteger.valueOf(nowMillis).abs().max(BigInteger.ONE)
        val builder = JcaX509v3CertificateBuilder(
            subject,
            serial,
            notBefore,
            notAfter,
            subject,
            keyPair.public,
        )
        val signer = JcaContentSignerBuilder("SHA256withECDSA")
            .setSecureRandom(random)
            .build(keyPair.private)
        return JcaX509CertificateConverter().getCertificate(builder.build(signer))
    }

    fun hpkeSeal(
        plaintext: ByteArray,
        recipientPublicKey: ECPublicKey,
        info: ByteArray,
        random: SecureRandom = SecureRandom(),
        ephemeralKeyPair: KeyPair? = null,
    ): HpkeSealResult {
        val ephemeral = ephemeralKeyPair ?: generateP256KeyPair(random)
        val enc = rawUncompressed(ephemeral.public as ECPublicKey)
        val recipientRaw = rawUncompressed(recipientPublicKey)
        val dh = ecdh(ephemeral.private, recipientPublicKey)
        val context = hpkeContext(dh, enc, recipientRaw, info)
        val cipher = Cipher.getInstance("AES/GCM/NoPadding")
        cipher.init(
            Cipher.ENCRYPT_MODE,
            SecretKeySpec(context.key, "AES"),
            GCMParameterSpec(128, hpkeNonce(context.baseNonce)),
        )
        val cipherText = cipher.doFinal(plaintext)
        return HpkeSealResult(enc, cipherText)
    }

    private fun hpkeContext(
        dh: ByteArray,
        enc: ByteArray,
        recipientPublicBytes: ByteArray,
        info: ByteArray,
    ): HpkeContext {
        val kemSuiteId = "KEM".toByteArray() + i2osp(HPKE_KEM_DHKEM_P256_HKDF_SHA256, 2)
        val hpkeSuiteId = "HPKE".toByteArray() +
            i2osp(HPKE_KEM_DHKEM_P256_HKDF_SHA256, 2) +
            i2osp(HPKE_KDF_HKDF_SHA256, 2) +
            i2osp(HPKE_AEAD_AES_128_GCM, 2)
        val kemContext = enc + recipientPublicBytes
        val eaePrk = hpkeLabeledExtract(kemSuiteId, ByteArray(0), "eae_prk", dh)
        val sharedSecret = hpkeLabeledExpand(kemSuiteId, eaePrk, "shared_secret", kemContext, HPKE_NH)
        val pskIdHash = hpkeLabeledExtract(hpkeSuiteId, ByteArray(0), "psk_id_hash", ByteArray(0))
        val infoHash = hpkeLabeledExtract(hpkeSuiteId, ByteArray(0), "info_hash", info)
        val keyScheduleContext = byteArrayOf(0) + pskIdHash + infoHash
        val secret = hpkeLabeledExtract(hpkeSuiteId, sharedSecret, "secret", ByteArray(0))
        return HpkeContext(
            key = hpkeLabeledExpand(hpkeSuiteId, secret, "key", keyScheduleContext, HPKE_NK),
            baseNonce = hpkeLabeledExpand(hpkeSuiteId, secret, "base_nonce", keyScheduleContext, HPKE_NN),
        )
    }

    private fun ecdh(privateKey: PrivateKey, publicKey: PublicKey): ByteArray {
        val agreement = KeyAgreement.getInstance("ECDH")
        agreement.init(privateKey)
        agreement.doPhase(publicKey, true)
        return agreement.generateSecret()
    }

    private fun hpkeLabeledExtract(suiteId: ByteArray, salt: ByteArray, label: String, ikm: ByteArray): ByteArray {
        return hmacSha256(
            if (salt.isEmpty()) ByteArray(HPKE_NH) else salt,
            "HPKE-v1".toByteArray() + suiteId + label.toByteArray() + ikm,
        )
    }

    private fun hpkeLabeledExpand(suiteId: ByteArray, prk: ByteArray, label: String, info: ByteArray, length: Int): ByteArray {
        return hkdfExpand(prk, i2osp(length, 2) + "HPKE-v1".toByteArray() + suiteId + label.toByteArray() + info, length)
    }

    private fun hkdfExpand(prk: ByteArray, info: ByteArray, length: Int): ByteArray {
        val n = (length + HPKE_NH - 1) / HPKE_NH
        require(n <= 255) { "HKDF expand length too large" }
        var previous = ByteArray(0)
        val out = ByteArrayOutputStream()
        for (i in 1..n) {
            previous = hmacSha256(prk, previous + info + byteArrayOf(i.toByte()))
            out.write(previous)
        }
        return out.toByteArray().copyOf(length)
    }

    private fun hmacSha256(key: ByteArray, data: ByteArray): ByteArray {
        val mac = Mac.getInstance("HmacSHA256")
        mac.init(SecretKeySpec(key, "HmacSHA256"))
        return mac.doFinal(data)
    }

    private fun hpkeNonce(baseNonce: ByteArray): ByteArray = baseNonce.copyOf()

    private fun i2osp(value: Int, length: Int): ByteArray {
        var v = value
        val out = ByteArray(length)
        for (i in length - 1 downTo 0) {
            out[i] = (v and 0xff).toByte()
            v = v ushr 8
        }
        return out
    }

    private fun p256Params(): ECParameterSpec {
        val parameters = AlgorithmParameters.getInstance("EC")
        parameters.init(ECGenParameterSpec("secp256r1"))
        return parameters.getParameterSpec(ECParameterSpec::class.java)
    }

    private fun unsignedFixed(value: BigInteger, size: Int): ByteArray {
        val raw = value.toByteArray()
        val unsigned = if (raw.size > 1 && raw[0] == 0.toByte()) raw.copyOfRange(1, raw.size) else raw
        require(unsigned.size <= size) { "integer does not fit in $size bytes" }
        return ByteArray(size - unsigned.size) + unsigned
    }

    private fun derEcdsaToRaw(der: ByteArray, fieldSize: Int): ByteArray {
        val seq = ASN1Sequence.getInstance(der)
        val r = (seq.getObjectAt(0) as ASN1Integer).positiveValue
        val s = (seq.getObjectAt(1) as ASN1Integer).positiveValue
        return unsignedFixed(r, fieldSize) + unsignedFixed(s, fieldSize)
    }

    private fun rawEcdsaToDer(raw: ByteArray, fieldSize: Int): ByteArray {
        require(raw.size == fieldSize * 2) { "raw ECDSA signature has wrong length" }
        val vector = ASN1EncodableVector()
        vector.add(ASN1Integer(BigInteger(1, raw.copyOfRange(0, fieldSize))))
        vector.add(ASN1Integer(BigInteger(1, raw.copyOfRange(fieldSize, fieldSize * 2))))
        return DERSequence(vector).encoded
    }

    private fun extractX5Chain(value: Any?): List<ByteArray>? {
        return when (value) {
            null -> null
            is ByteArray -> listOf(value)
            is List<*> -> value.map {
                it as? ByteArray ?: error("readerAuth x5chain entries must be bstr")
            }
            else -> error("readerAuth x5chain must be bstr or array of bstr")
        }
    }

    private fun parseX509Certificate(bytes: ByteArray): X509Certificate {
        val factory = CertificateFactory.getInstance("X.509")
        return factory.generateCertificate(ByteArrayInputStream(bytes)) as X509Certificate
    }

    private fun ensureBouncyCastle() {
        if (Security.getProvider(BouncyCastleProvider.PROVIDER_NAME) == null) {
            Security.addProvider(BouncyCastleProvider())
        }
    }

    data class HpkeSealResult(val enc: ByteArray, val cipherText: ByteArray)

    data class DetachedCoseSign1Verification(
        val alg: Long,
        val certificate: X509Certificate,
        val signatureValid: Boolean,
    )

    private data class HpkeContext(val key: ByteArray, val baseNonce: ByteArray)
}

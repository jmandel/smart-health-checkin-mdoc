package org.smarthealthit.checkin.wallet

import org.json.JSONArray
import org.json.JSONObject
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertNull
import org.junit.Assert.fail
import org.junit.Test

/**
 * Cross-implementation regression: every byte sequence asserted here was
 * produced by the TS verifier library (`rp-web/src/protocol/index.ts`). The
 * generator script at `app/src/test/resources/gen-test-vectors.ts` calls
 * that library directly. Re-run the script after the TS lib changes its
 * byte output and commit the regenerated `test-vectors.json` so CI catches
 * drift in either direction.
 *
 *   bun run wallet-android/app/src/test/resources/gen-test-vectors.ts
 *
 * Tests in this class fail loudly if:
 *   - the wallet's CBOR decoder disagrees with the TS encoder on
 *     DeviceRequest layout, OR
 *   - the wallet's `["dcapi", sha256(...)]` SessionTranscript derivation
 *     diverges from `buildDcapiSessionTranscript` in the TS lib.
 */
class GeneratedVectorsTest {
    private val vectors: TestVectors by lazy { loadVectors() }

    @Test
    fun parsesEveryRequestVector() {
        for (v in vectors.requestVectors) {
            val bytes = v.deviceRequestHex.hexToBytes()
            val parsed = DeviceRequestParser.parseBytes(bytes)
                ?: run { fail("vector '${v.name}': parser returned null"); return }
            assertEquals(
                "vector '${v.name}': docType",
                vectors.doctype,
                parsed.docType,
            )
            val ns = parsed.namespaces[vectors.namespace]
                ?: run { fail("vector '${v.name}': namespace not found"); return }
            assertNotNull(
                "vector '${v.name}': namespace must include the response element key",
                ns[vectors.responseElement],
            )
            val smart = parsed.smartRequestJson
                ?: run { fail("vector '${v.name}': smartRequestJson is null"); return }
            assertEquals(
                "vector '${v.name}': SMART request JSON round-trip",
                JSONObject(v.smartRequestJson).toString(),
                smart.toString(),
            )
        }
    }

    @Test
    fun rejectsAllNegativeVectors() {
        // Real captured DeviceRequest bytes that arrive over `org-iso-mdoc`
        // but ask for a different doctype (mDL etc.). The wallet's parser
        // must return null rather than try to extract a SMART payload.
        for (v in vectors.rejectionVectors) {
            val bytes = v.deviceRequestHex.hexToBytes()
            val parsed = DeviceRequestParser.parseBytes(bytes)
            assertNull(
                "vector '${v.name}': parser must return null for foreign doctype",
                parsed,
            )
        }
    }

    @Test
    fun reproducesSessionTranscriptForEveryVector() {
        for (v in vectors.sessionTranscriptVectors) {
            val st = DirectMdocRequestParser.buildSessionTranscript(
                encryptionInfoBase64Url = v.encryptionInfoBase64Url,
                origin = v.origin,
            )
            assertEquals(
                "vector '${v.name}': SessionTranscript hex must match TS lib output",
                v.sessionTranscriptHex,
                st.toHex(),
            )
        }
    }

    @Test
    fun coversTheExpectedFixtureMatrix() {
        // Drift-detector: fail if the generator stops emitting one of these
        // shapes. Forces a deliberate CI update when the matrix changes.
        val names = vectors.requestVectors.map { it.name }.toSet()
        for (required in REQUIRED_REQUEST_VECTOR_NAMES) {
            assertEquals(
                "expected request vector '$required' to be present in test-vectors.json",
                true,
                required in names,
            )
        }
    }

    private fun loadVectors(): TestVectors {
        val stream = javaClass.classLoader!!.getResourceAsStream("test-vectors.json")
            ?: error("test-vectors.json missing from test classpath; run gen-test-vectors.ts")
        val raw = stream.bufferedReader(Charsets.UTF_8).use { it.readText() }
        val root = JSONObject(raw)
        return TestVectors(
            doctype = root.getString("doctype"),
            namespace = root.getString("namespace"),
            responseElement = root.getString("responseElement"),
            requestVectors = root.getJSONArray("requestVectors").toRequestVectors(),
            rejectionVectors =
                root.getJSONArray("rejectionVectors").toRejectionVectors(),
            sessionTranscriptVectors =
                root.getJSONArray("sessionTranscriptVectors").toSessionTranscriptVectors(),
        )
    }

    private fun JSONArray.toRequestVectors(): List<RequestVector> =
        (0 until length()).map { i ->
            val v = getJSONObject(i)
            RequestVector(
                name = v.getString("name"),
                description = v.optString("description"),
                smartRequestJson = v.getString("smartRequestJson"),
                deviceRequestHex = v.getString("deviceRequestHex"),
            )
        }

    private fun JSONArray.toRejectionVectors(): List<RejectionVector> =
        (0 until length()).map { i ->
            val v = getJSONObject(i)
            RejectionVector(
                name = v.getString("name"),
                description = v.optString("description"),
                deviceRequestHex = v.getString("deviceRequestHex"),
            )
        }

    private fun JSONArray.toSessionTranscriptVectors(): List<SessionTranscriptVector> =
        (0 until length()).map { i ->
            val v = getJSONObject(i)
            SessionTranscriptVector(
                name = v.getString("name"),
                origin = v.getString("origin"),
                encryptionInfoBase64Url = v.getString("encryptionInfoBase64Url"),
                sessionTranscriptHex = v.getString("sessionTranscriptHex"),
            )
        }

    private data class TestVectors(
        val doctype: String,
        val namespace: String,
        val responseElement: String,
        val requestVectors: List<RequestVector>,
        val rejectionVectors: List<RejectionVector>,
        val sessionTranscriptVectors: List<SessionTranscriptVector>,
    )

    private data class RequestVector(
        val name: String,
        val description: String,
        val smartRequestJson: String,
        val deviceRequestHex: String,
    )

    private data class RejectionVector(
        val name: String,
        val description: String,
        val deviceRequestHex: String,
    )

    private data class SessionTranscriptVector(
        val name: String,
        val origin: String,
        val encryptionInfoBase64Url: String,
        val sessionTranscriptHex: String,
    )

    private companion object {
        val REQUIRED_REQUEST_VECTOR_NAMES = setOf(
            "patient-only",
            "patient-and-coverage",
            "questionnaire-inline",
            "us-core-checkin",
        )

        fun String.hexToBytes(): ByteArray {
            require(length % 2 == 0) { "odd-length hex: $length" }
            return ByteArray(length / 2) { i ->
                substring(i * 2, i * 2 + 2).toInt(16).toByte()
            }
        }

        fun ByteArray.toHex(): String =
            joinToString("") { "%02x".format(it.toInt() and 0xff) }
    }
}

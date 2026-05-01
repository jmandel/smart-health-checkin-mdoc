package org.smarthealthit.checkin.wallet

import java.io.File
import java.security.SecureRandom
import org.json.JSONObject
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

class AndroidMdocValidationFixtureTest {
    @Test
    fun writesDeterministicResponseFixtureForRpWebValidation() {
        val requestFixture = File("../../fixtures/dcapi-requests/ts-smart-checkin-basic")
        val outputDir = File("build/generated/mdoc-validation/ts-smart-checkin-basic")
        val requestMetadata = JSONObject(File(requestFixture, "metadata.json").readText())
        val parsedRequest = DirectMdocRequestParser.parseRequestJson(
            requestJson = File(requestFixture, "request.json").readText(),
            origin = requestMetadata.getString("origin"),
        )
        val hydratedSmartRequest = withLocalQuestionnaire(
            JSONObject(File(requestFixture, "smart-request.expected.json").readText()),
        )
        val verifiedRequest = SmartRequestAdapter.build(
            verifierOrigin = requestMetadata.getString("origin"),
            nonce = "",
            smartRequest = hydratedSmartRequest,
        )
        val store = DemoWalletStore { path -> File("src/main/assets", path).readText() }
        val selectedItems = verifiedRequest.items.associate { it.id to true }
        val questionnaireAnswers = store.prefillQuestionnaireAnswers(verifiedRequest.items)
        val smartResponse = SmartCheckinResponseFactory.build(
            request = verifiedRequest,
            selectedItems = selectedItems,
            questionnaireAnswers = questionnaireAnswers,
            walletStore = store,
        )
        val walletResponse = SmartHealthMdocResponder.buildCredentialResponse(
            request = parsedRequest,
            smartResponse = smartResponse,
            random = seededRandom("fallback"),
            testMaterial = testMaterial(),
        )

        outputDir.mkdirs()
        File(outputDir, "credential.json").writeText("${JSONObject(walletResponse.credentialJson).toString(2)}\n")
        File(outputDir, "device-response.cbor").writeBytes(walletResponse.deviceResponseBytes)
        File(outputDir, "dcapi-response.cbor").writeBytes(walletResponse.dcapiResponseBytes)
        File(outputDir, "issuer-signed-item-tag24.cbor").writeBytes(walletResponse.issuerSignedItemTag24Bytes)
        File(outputDir, "mso.cbor").writeBytes(walletResponse.msoBytes)
        File(outputDir, "issuer-auth.cbor").writeBytes(walletResponse.issuerAuthBytes)
        File(outputDir, "device-authentication.cbor").writeBytes(walletResponse.deviceAuthenticationBytes)
        File(outputDir, "smart-response.expected.json").writeText("${smartResponse.toString(2)}\n")
        File(outputDir, "metadata.json").writeText(
            JSONObject()
                .put("sourceRequestFixture", "fixtures/dcapi-requests/ts-smart-checkin-basic")
                .put("origin", requestMetadata.getString("origin"))
                .put("nowMillis", TEST_NOW_MILLIS)
                .toString(2) + "\n",
        )

        val decodedResponse = MdocCbor.decode(walletResponse.deviceResponseBytes) as Map<*, *>
        assertEquals("1.0", decodedResponse["version"])
        assertEquals(0L, decodedResponse["status"])
        val statuses = smartResponse.getJSONArray("requestStatus")
        assertTrue((0 until statuses.length()).any { index ->
            val status = statuses.getJSONObject(index)
            status.optString("item") == "intake" && status.optString("status") == "fulfilled"
        })
    }

    private fun withLocalQuestionnaire(smartRequest: JSONObject): JSONObject {
        val copy = JSONObject(smartRequest.toString())
        val questionnaire = JSONObject(File("src/main/assets/demo-data/migraine-questionnaire.json").readText())
        val items = copy.getJSONArray("items")
        for (i in 0 until items.length()) {
            val item = items.getJSONObject(i)
            val content = item.optJSONObject("content") ?: continue
            val spec = content.opt("questionnaire")
            val canonical = when (spec) {
                is String -> spec
                is JSONObject -> spec.optString("canonical")
                else -> ""
            }
            if (canonical == questionnaire.optString("url")) {
                content.put(
                    "questionnaire",
                    JSONObject()
                        .put("canonical", canonical)
                        .put("resource", questionnaire),
                )
            }
        }
        return copy
    }

    private fun testMaterial(): MdocResponderTestMaterial {
        return MdocResponderTestMaterial(
            nowMillis = TEST_NOW_MILLIS,
            issuerKeyPair = SmartMdocCrypto.generateP256KeyPair(seededRandom("issuer-key")),
            deviceKeyPair = SmartMdocCrypto.generateP256KeyPair(seededRandom("device-key")),
            hpkeEphemeralKeyPair = SmartMdocCrypto.generateP256KeyPair(seededRandom("hpke-ephemeral-key")),
            itemRandom = ByteArray(16) { it.toByte() },
            signatureRandom = seededRandom("signatures"),
        )
    }

    private fun seededRandom(label: String): SecureRandom {
        return SecureRandom.getInstance("SHA1PRNG").apply {
            setSeed(label.toByteArray(Charsets.UTF_8))
        }
    }

    private companion object {
        const val TEST_NOW_MILLIS = 1_700_000_000_000L
    }
}

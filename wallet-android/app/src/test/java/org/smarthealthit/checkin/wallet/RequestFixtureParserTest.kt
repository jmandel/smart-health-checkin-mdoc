package org.smarthealthit.checkin.wallet

import java.io.File
import org.json.JSONObject
import org.junit.Assert.assertArrayEquals
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertThrows
import org.junit.Assert.assertTrue
import org.junit.Test

class RequestFixtureParserTest {
    @Test
    fun parsesPositiveDcapiRequestFixtures() {
        for (id in POSITIVE_FIXTURES) {
            parsesPositiveDcapiRequestFixture(id)
        }
    }

    private fun parsesPositiveDcapiRequestFixture(id: String) {
        val fixture = fixtureDir(id)
        val metadata = JSONObject(File(fixture, "metadata.json").readText())
        val requestJson = File(fixture, "request.json").readText()
        val expectedSmartRequest = JSONObject(File(fixture, "smart-request.expected.json").readText())

        val parsed = DirectMdocRequestParser.parseRequestJson(
            requestJson = requestJson,
            origin = metadata.getString("origin"),
        )

        assertEquals("org-iso-mdoc", parsed.protocol)
        assertEquals("org.smarthealthit.checkin.1", parsed.itemsRequest.docType)
        assertTrue(parsed.itemsRequest.namespaces.containsKey("org.smarthealthit.checkin"))
        assertTrue(
            parsed.itemsRequest.namespaces
                .getValue("org.smarthealthit.checkin")
                .containsKey("smart_health_checkin_response"),
        )
        assertTrue(expectedSmartRequest.similar(parsed.itemsRequest.smartRequestJson))
        assertTrue(parsed.itemsRequest.smartRequestJson!!.getJSONArray("items").length() > 0)
        assertTrue(parsed.itemsRequest.itemsRequestTag24Bytes.isNotEmpty())
        assertEquals(File(fixture, "device-request.b64u").readText().trim(), parsed.deviceRequestBase64Url)
        assertEquals(File(fixture, "encryption-info.b64u").readText().trim(), parsed.encryptionInfoBase64Url)

        val sessionTranscript = File(fixture, "session-transcript.cbor")
        if (sessionTranscript.exists()) {
            assertArrayEquals(sessionTranscript.readBytes(), parsed.sessionTranscriptBytes)
        }

        if (id == "ts-smart-checkin-readerauth") {
            assertNotNull(parsed.itemsRequest.readerAuthBytes)
            assertTrue(parsed.readerAuth.present)
            assertTrue(parsed.readerAuth.signatureValid)
            assertNotNull(parsed.readerAuth.certificateSubject)
        }
    }

    @Test
    fun parsesDirectDataObjectFromFixtures() {
        for (id in POSITIVE_FIXTURES) {
            val fixture = fixtureDir(id)
            val metadata = JSONObject(File(fixture, "metadata.json").readText())
            val request = JSONObject(File(fixture, "request.json").readText())
            val data = DirectMdocRequestParser.findOrgIsoMdocData(request)

            assertNotNull(data)
            val parsed = DirectMdocRequestParser.parseData(data!!, metadata.getString("origin"))

            assertNotNull(parsed.itemsRequest.smartRequestJson)
            assertEquals(metadata.getString("origin"), parsed.origin)
        }
    }

    @Test
    fun rejectsUnrelatedMdlDirectMdocCapture() {
        val capture = File(
            "../../fixtures/captures/2026-04-30-mattr-safari-org-iso-mdoc/" +
                "navigator-credentials-get.arg.json",
        )

        val thrown = assertThrows(IllegalStateException::class.java) {
            DirectMdocRequestParser.parseRequestJson(capture.readText(), "https://example.com")
        }

        assertTrue(thrown.message!!.contains("SMART Health Check-in"))
    }

    private fun fixtureDir(id: String): File {
        return File("../../fixtures/dcapi-requests/$id")
    }

    private companion object {
        val POSITIVE_FIXTURES = listOf(
            "ts-smart-checkin-basic",
            "ts-smart-checkin-readerauth",
            "real-chrome-android-smart-checkin",
        )
    }
}

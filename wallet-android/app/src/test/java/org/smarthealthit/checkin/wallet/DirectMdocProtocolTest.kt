package org.smarthealthit.checkin.wallet

import org.json.JSONObject
import org.junit.Assert.assertArrayEquals
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertTrue
import org.junit.Test

class DirectMdocProtocolTest {
    @Test
    fun parsesTsGeneratedDeviceRequest() {
        val request = DeviceRequestParser.parseBytes(PATIENT_DEVICE_REQUEST)

        assertNotNull(request)
        assertEquals("org.smarthealthit.checkin.1", request!!.docType)
        assertTrue(request.namespaces["org.smarthealthit.checkin"]!!.containsKey("smart_health_checkin_response"))
        val smartRequest = request.smartRequestJson!!
        assertEquals("1", smartRequest.getString("version"))
        val item = smartRequest.getJSONArray("items").getJSONObject(0)
        assertEquals("patient", item.getString("id"))
        assertEquals("http://hl7.org/fhir/us/core/StructureDefinition/us-core-patient", item.getString("profile"))
        assertEquals(true, item.getBoolean("required"))
        assertEquals("Demographics for check-in", item.getString("description"))
    }

    @Test
    fun buildsSessionTranscriptFromTsVector() {
        val encryptionInfoB64u = SmartMdocBase64.encodeUrl(ENCRYPTION_INFO)
        val transcript = DirectMdocRequestParser.buildSessionTranscript(
            encryptionInfoBase64Url = encryptionInfoB64u,
            origin = "https://example.com",
        )

        assertEquals(
            "83f6f68265646361706958205a25f4d8f908196531efbeab91dbec31ed302869ca51db96f9abe9db1ba04334",
            transcript.toHex(),
        )
    }

    @Test
    fun parsesEncryptionInfoAndBuildsWalletResponseShape() {
        val data = JSONObject()
            .put("deviceRequest", SmartMdocBase64.encodeUrl(PATIENT_DEVICE_REQUEST))
            .put("encryptionInfo", SmartMdocBase64.encodeUrl(ENCRYPTION_INFO))
        val request = DirectMdocRequestParser.parseData(data, "https://clinic.example")
        val smartResponse = JSONObject()
            .put("version", "1")
            .put("artifacts", org.json.JSONArray().put(
                JSONObject()
                    .put("id", "a1")
                    .put("type", "fhir_resource")
                    .put("data", JSONObject().put("resourceType", "Patient")),
            ))
            .put("answers", JSONObject().put("patient", org.json.JSONArray().put("a1")))

        val response = SmartHealthMdocResponder.buildCredentialResponse(
            request = request,
            smartResponse = smartResponse,
            nowMillis = 1_700_000_000_000L,
        )

        val credentialJson = JSONObject(response.credentialJson)
        assertEquals("org-iso-mdoc", credentialJson.getString("protocol"))
        val dcapiResponseBytes = SmartMdocBase64.decodeUrl(credentialJson.getJSONObject("data").getString("response"))
        assertArrayEquals(response.dcapiResponseBytes, dcapiResponseBytes)

        val deviceResponse = MdocCbor.decode(response.deviceResponseBytes) as Map<*, *>
        assertEquals("1.0", deviceResponse["version"])
        assertEquals(0L, deviceResponse["status"])
        val document = (deviceResponse["documents"] as List<*>).single() as Map<*, *>
        assertEquals("org.smarthealthit.checkin.1", document["docType"])

        val issuerSigned = document["issuerSigned"] as Map<*, *>
        val namespaces = issuerSigned["nameSpaces"] as Map<*, *>
        val items = namespaces["org.smarthealthit.checkin"] as List<*>
        assertEquals(1, items.size)
        assertArrayEquals(response.issuerSignedItemTag24Bytes, (items.single() as MdocCbor.CborTag).let {
            MdocCbor.encode(it)
        })
        assertArrayEquals(SmartMdocCrypto.sha256(response.issuerSignedItemTag24Bytes), response.valueDigest)

        val decodedItem = MdocCbor.decodeTag24(items.single()) as Map<*, *>
        assertEquals(0L, decodedItem["digestID"])
        assertEquals("smart_health_checkin_response", decodedItem["elementIdentifier"])
        assertEquals(smartResponse.toString(), decodedItem["elementValue"])

        val issuerAuth = issuerSigned["issuerAuth"] as List<*>
        val msoTag = MdocCbor.decode(issuerAuth[2] as ByteArray) as MdocCbor.CborTag
        assertEquals(MdocCbor.TAG_ENCODED_CBOR, msoTag.tag)
        assertArrayEquals(response.msoBytes, msoTag.value as ByteArray)
        val mso = MdocCbor.decode(msoTag.value as ByteArray) as Map<*, *>
        assertEquals("1.0", mso["version"])
        assertEquals("SHA-256", mso["digestAlgorithm"])
        assertEquals("org.smarthealthit.checkin.1", mso["docType"])
        val valueDigests = mso["valueDigests"] as Map<*, *>
        val namespaceDigests = valueDigests["org.smarthealthit.checkin"] as Map<*, *>
        assertArrayEquals(response.valueDigest, namespaceDigests[0L] as ByteArray)

        val deviceSigned = document["deviceSigned"] as Map<*, *>
        val deviceNameSpaces = deviceSigned["nameSpaces"] as MdocCbor.CborTag
        assertEquals(MdocCbor.TAG_ENCODED_CBOR, deviceNameSpaces.tag)
        assertEquals(emptyMap<Any?, Any?>(), MdocCbor.decode(deviceNameSpaces.value as ByteArray))
        val deviceAuthenticationTag = MdocCbor.decode(response.deviceAuthenticationBytes) as MdocCbor.CborTag
        assertEquals(MdocCbor.TAG_ENCODED_CBOR, deviceAuthenticationTag.tag)
        val deviceAuthentication = MdocCbor.decode(deviceAuthenticationTag.value as ByteArray) as List<*>
        assertEquals("DeviceAuthentication", deviceAuthentication[0])
        assertArrayEquals(request.sessionTranscriptBytes, MdocCbor.encode(deviceAuthentication[1]))
        assertEquals("org.smarthealthit.checkin.1", deviceAuthentication[2])
        val deviceAuthNamespaces = deviceAuthentication[3] as MdocCbor.CborTag
        assertEquals(MdocCbor.TAG_ENCODED_CBOR, deviceAuthNamespaces.tag)
        assertArrayEquals(deviceNameSpaces.value as ByteArray, deviceAuthNamespaces.value as ByteArray)

        val dcapiResponse = MdocCbor.decode(response.dcapiResponseBytes) as List<*>
        assertEquals("dcapi", dcapiResponse[0])
        val encrypted = dcapiResponse[1] as Map<*, *>
        assertTrue((encrypted["enc"] as ByteArray).isNotEmpty())
        assertTrue((encrypted["cipherText"] as ByteArray).isNotEmpty())
    }

    private companion object {
        const val PATIENT_REQUEST_JSON =
            """{"version":"1","items":[{"id":"patient","profile":"http://hl7.org/fhir/us/core/StructureDefinition/us-core-patient","required":true,"description":"Demographics for check-in"}]}"""

        val PATIENT_DEVICE_REQUEST = (
            "a26776657273696f6e63312e306b646f63526571756573747381a16c6974656d7352657175657374" +
                "d818590142a367646f6354797065781b6f72672e736d6172746865616c746869742e636865636b696e2e316a" +
                "6e616d65537061636573a178196f72672e736d6172746865616c746869742e636865636b696ea1781d736d61" +
                "72745f6865616c74685f636865636b696e5f726573706f6e7365f46b72657175657374496e666fa174736d61" +
                "72745f6865616c74685f636865636b696e78b07b2276657273696f6e223a2231222c226974656d73223a5b7b" +
                "226964223a2270617469656e74222c2270726f66696c65223a22687474703a2f2f686c372e6f72672f666869" +
                "722f75732f636f72652f537472756374757265446566696e6974696f6e2f75732d636f72652d70617469656e" +
                "74222c227265717569726564223a747275652c226465736372697074696f6e223a2244656d6f677261706869" +
                "637320666f7220636865636b2d696e227d5d7d"
            ).hexToBytes()

        val ENCRYPTION_INFO = (
            "82656463617069a2656e6f6e63655820000102030405060708090a0b0c0d0e0f101112131415161718191a" +
                "1b1c1d1e1f72726563697069656e745075626c69634b6579a4010220012158200f1887e50e18c7752bba4136" +
                "956084aeaf0df1ba82f421cb2eb0302f3e41984d2258205ed2cce3ede1e68dc7507d0c1d5255d24caad220" +
                "65ac1c2587ca840cc678f8f7"
            ).hexToBytes()

        fun String.hexToBytes(): ByteArray {
            require(length % 2 == 0)
            return ByteArray(length / 2) { i ->
                substring(i * 2, i * 2 + 2).toInt(16).toByte()
            }
        }

        fun ByteArray.toHex(): String = joinToString("") { "%02x".format(it.toInt() and 0xff) }
    }
}

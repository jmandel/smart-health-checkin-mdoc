package org.smarthealthit.checkin.wallet

import org.json.JSONObject
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertTrue
import org.junit.Test

class SmartRequestAdapterTest {
    @Test
    fun rejectsMalformedRequiredFields() {
        assertFailsWithMessage(
            """{"type":"smart-health-checkin-request","version":"1","items":[]}""",
            "id missing",
        )
        assertFailsWithMessage(
            """{"type":"smart-health-checkin-request","version":"1","id":"r1","items":[{"title":"Missing id","content":{"kind":"fhir.resources"},"accept":["application/fhir+json"]}]}""",
            "items[0].id missing",
        )
        assertFailsWithMessage(
            """{"type":"smart-health-checkin-request","version":"1","id":"r1","items":[{"id":"patient","title":"Patient","content":{"kind":"fhir.resources"},"accept":[]}]}""",
            "items[0].accept",
        )
    }

    @Test
    fun supportsBroadFhirResourceRequests() {
        val request = parse(
            """{"type":"smart-health-checkin-request","version":"1","id":"r1","items":[{"id":"anything","title":"Any FHIR resources","content":{"kind":"fhir.resources"},"accept":["application/fhir+json"]}]}""",
        )

        assertEquals(RequestKind.Unknown, request.items.single().kind)
    }

    @Test
    fun routesByCanonicalProfilesInsteadOfKeywordSubstrings() {
        val request = parse(
            """{"type":"smart-health-checkin-request","version":"1","id":"r1","items":[{"id":"insuranceplan","title":"Coverage","content":{"kind":"fhir.resources","profiles":["http://hl7.org/fhir/us/insurance-card/StructureDefinition/C4DIC-Coverage|1.0.0"]},"accept":["application/fhir+json"]}]}""",
        )

        assertEquals(RequestKind.Coverage, request.items.single().kind)
    }

    @Test
    fun routesUsCoreProfileFamilyArraysAsClinical() {
        val request = parse(
            """{"type":"smart-health-checkin-request","version":"1","id":"r1","items":[{"id":"clinical-history","title":"US Core clinical resources","summary":"US Core resources, including patient demographics, problems, medications, and allergies.","content":{"kind":"fhir.resources","profilesFrom":["http://hl7.org/fhir/us/core"],"profiles":["http://hl7.org/fhir/us/core/StructureDefinition/us-core-patient","http://hl7.org/fhir/us/core/StructureDefinition/us-core-medicationrequest"]},"accept":["application/fhir+json"]}]}""",
        )

        val item = request.items.single()
        assertEquals(RequestKind.Clinical, item.kind)
        assertEquals("US Core clinical resources", item.title)
        assertEquals(
            "US Core resources, including patient demographics, problems, medications, and allergies.",
            item.subtitle,
        )
    }

    @Test
    fun stripsCanonicalVersionBeforeQuestionnaireFetch() {
        assertEquals(
            "https://example.org/fhir/Questionnaire/intake",
            SmartQuestionnaireFetcher.canonicalUrlForFetch("https://example.org/fhir/Questionnaire/intake|1.2.3"),
        )
    }

    private fun parse(raw: String): VerifiedRequest =
        SmartRequestAdapter.build(
            verifierOrigin = "https://clinic.example",
            nonce = "",
            smartRequest = JSONObject(raw),
        )

    private fun assertFailsWithMessage(raw: String, expectedMessage: String) {
        val failure = runCatching { parse(raw) }.exceptionOrNull()
        assertNotNull("Expected request parsing to fail", failure)
        assertTrue(
            "Expected '${failure?.message}' to contain '$expectedMessage'",
            failure?.message?.contains(expectedMessage) == true,
        )
    }
}

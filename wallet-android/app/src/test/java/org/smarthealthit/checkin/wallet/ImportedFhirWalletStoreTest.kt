package org.smarthealthit.checkin.wallet

import java.io.ByteArrayInputStream
import java.io.ByteArrayOutputStream
import java.util.zip.ZipEntry
import java.util.zip.ZipOutputStream
import org.json.JSONArray
import org.json.JSONObject
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

class ImportedFhirWalletStoreTest {
    @Test
    fun importsHealthSkillzSkillZipDataEntries() {
        val zip = healthSkillzZip(
            "health-record-assistant/data/epic-sandbox.json",
            providerPayload().toString(),
        )

        val records = HealthSkillzImportParser.parse(ByteArrayInputStream(zip), "download")

        val summary = records.summary()
        assertEquals(1, summary.providerCount)
        assertEquals(5, summary.totalResources)
        assertEquals(1, summary.resourceCounts["Patient"])
        assertEquals(2, summary.resourceCounts["Condition"])
        assertEquals(1, summary.resourceCounts["Observation"])
        assertEquals("Camila Lopez", summary.patientSummary())
    }

    @Test
    fun importedStoreTreatsUsCoreProfileFamilyAsBroadImportedRecordSet() {
        val records = ImportedHealthRecords(
            importedAt = "now",
            providers = listOf(providerRecords()),
        )
        val store = ImportedFhirWalletStore(records)
        val request = verifiedRequest(
            item = RequestItem(
                id = "clinical",
                title = "Clinical summary",
                subtitle = "US Core-derived records",
                kind = RequestKind.Clinical,
                meta = JSONObject()
                    .put(
                        "content",
                        JSONObject()
                            .put("kind", "selection.fhir")
                            .put("profilesFrom", JSONArray().put("http://hl7.org/fhir/us/core")),
                    ),
            ),
        )

        val resolutions = store.resolveItems(request.items)

        assertEquals(1, resolutions.size)
        val resolution = resolutions.single()
        assertEquals(WalletItemAvailability.Available, resolution.availability)
        assertEquals("5 matching records available", resolution.matchSummary)
        assertTrue(resolution.candidates.any { it.label == "Asthma" })
        assertTrue(resolution.candidates.any { it.label == "Metformin" })
    }

    @Test
    fun profilesAndProfilesFromAreAdditiveSelectors() {
        val store = ImportedFhirWalletStore(
            ImportedHealthRecords(importedAt = "now", providers = listOf(providerRecords())),
        )
        val request = verifiedRequest(
            item = RequestItem(
                id = "clinical",
                title = "Clinical summary",
                subtitle = "US Core-derived records",
                kind = RequestKind.Clinical,
                meta = JSONObject()
                    .put(
                        "content",
                        JSONObject()
                            .put("kind", "selection.fhir")
                            .put("profilesFrom", JSONArray().put("http://hl7.org/fhir/us/core"))
                            .put(
                                "profiles",
                                JSONArray().put(
                                    "http://hl7.org/fhir/us/core/StructureDefinition/us-core-condition-problems-health-concerns",
                                ),
                            ),
                    ),
            ),
        )

        val resolution = store.resolveItems(request.items).single()

        assertEquals("5 matching records available", resolution.matchSummary)
        assertTrue(resolution.candidates.any { it.resourceType == "Condition" })
        assertTrue(resolution.candidates.any { it.resourceType == "Observation" })
    }

    @Test
    fun importedStoreLabelsQuestionnaireCandidateFromQuestionnaireTitle() {
        val store = ImportedFhirWalletStore(
            ImportedHealthRecords(importedAt = "now", providers = listOf(providerRecords())),
        )
        val request = verifiedRequest(
            item = RequestItem(
                id = "intake",
                title = "Questionnaire",
                subtitle = "Form answers requested by the verifier.",
                kind = RequestKind.Questionnaire,
                meta = JSONObject().put(
                    "questionnaire",
                    JSONObject()
                        .put("resourceType", "Questionnaire")
                        .put("title", "Migraine follow-up"),
                ),
            ),
        )

        val resolution = store.resolveItems(request.items).single()

        assertEquals("Migraine follow-up", resolution.candidates.single().label)
    }

    @Test
    fun importedStoreBuildsBundleFromSelectedCandidates() {
        val records = ImportedHealthRecords(
            importedAt = "now",
            providers = listOf(providerRecords()),
        )
        val store = ImportedFhirWalletStore(records)
        val request = verifiedRequest(
            item = RequestItem(
                id = "conditions",
                title = "Conditions",
                subtitle = "Problem list",
                kind = RequestKind.Clinical,
                meta = JSONObject()
                    .put(
                        "content",
                        JSONObject()
                            .put("kind", "selection.fhir")
                            .put("resourceTypes", JSONArray().put("Condition")),
                    ),
            ),
        )
        val resolution = store.resolveItems(request.items).single()

        val response = SmartCheckinResponseFactory.build(
            request = request,
            selectedItems = mapOf("conditions" to true),
            questionnaireAnswers = emptyMap(),
            walletStore = store,
            resolutions = listOf(resolution),
            selectedCandidates = mapOf("conditions" to setOf(resolution.candidates.first().id)),
        )

        val status = response.getJSONArray("requestStatus").getJSONObject(0)
        assertEquals("partial", status.getString("status"))
        val bundle = response.getJSONArray("artifacts").getJSONObject(0).getJSONObject("value")
        assertEquals("Bundle", bundle.getString("resourceType"))
        assertEquals(1, bundle.getJSONArray("entry").length())
        assertEquals(
            "condition-1",
            bundle.getJSONArray("entry").getJSONObject(0).getJSONObject("resource").getString("id"),
        )
    }

    @Test
    fun importedStoreReportsUnavailableWhenUnderstoodDataIsMissing() {
        val store = ImportedFhirWalletStore(
            ImportedHealthRecords(importedAt = "now", providers = listOf(providerRecords())),
        )
        val request = verifiedRequest(
            item = RequestItem(
                id = "immunizations",
                title = "Immunizations",
                subtitle = "Shots",
                kind = RequestKind.Clinical,
                meta = JSONObject()
                    .put(
                        "content",
                        JSONObject()
                            .put("kind", "selection.fhir")
                            .put("resourceTypes", JSONArray().put("Immunization")),
                    ),
            ),
        )

        val response = SmartCheckinResponseFactory.build(
            request = request,
            selectedItems = mapOf("immunizations" to true),
            questionnaireAnswers = emptyMap(),
            walletStore = store,
        )

        val status = response.getJSONArray("requestStatus").getJSONObject(0)
        assertEquals("unavailable", status.getString("status"))
        assertEquals(0, response.getJSONArray("artifacts").length())
    }

    private fun verifiedRequest(item: RequestItem): VerifiedRequest {
        return VerifiedRequest(
            requestId = "import-test",
            verifierOrigin = "https://clinic.example",
            clientId = "",
            requestUri = "",
            responseUri = "",
            state = "",
            nonce = "",
            completion = "dc-api",
            clientMetadata = JSONObject(),
            dcqlQuery = JSONObject(),
            rawSmartRequestJson = "{}",
            items = listOf(item),
        )
    }

    private fun providerRecords(): ImportedProviderRecords {
        return HealthSkillzImportParser
            .parse(ByteArrayInputStream(providerPayload().toString().toByteArray()), "health-records.json")
            .providers
            .single()
    }

    private fun providerPayload(): JSONObject {
        return JSONObject()
            .put("provider", "Epic Sandbox")
            .put("patientDisplayName", "Camila Lopez")
            .put("patientBirthDate", "1979-06-12")
            .put(
                "fhir",
                JSONObject()
                    .put(
                        "Patient",
                        JSONArray().put(
                            JSONObject()
                                .put("resourceType", "Patient")
                                .put("id", "patient-1")
                                .put(
                                    "name",
                                    JSONArray().put(
                                        JSONObject()
                                            .put("family", "Lopez")
                                            .put("given", JSONArray().put("Camila")),
                                    ),
                                ),
                        ),
                    )
                    .put(
                        "Condition",
                        JSONArray()
                            .put(
                                JSONObject()
                                    .put("resourceType", "Condition")
                                    .put("id", "condition-1")
                                    .put("code", JSONObject().put("text", "Asthma")),
                            )
                            .put(
                                JSONObject()
                                    .put("resourceType", "Condition")
                                    .put("id", "condition-2")
                                    .put("code", JSONObject().put("text", "Migraine")),
                            ),
                    )
                    .put(
                        "MedicationRequest",
                        JSONArray().put(
                            JSONObject()
                                .put("resourceType", "MedicationRequest")
                                .put("id", "med-1")
                                .put("medicationCodeableConcept", JSONObject().put("text", "Metformin")),
                        ),
                    )
                    .put(
                        "Observation",
                        JSONArray().put(
                            JSONObject()
                                .put("resourceType", "Observation")
                                .put("id", "observation-1")
                                .put("status", "final")
                                .put("code", JSONObject().put("text", "Blood pressure")),
                        ),
                    ),
            )
            .put("attachments", JSONArray())
            .put("fetchedAt", "2026-01-01T00:00:00Z")
    }

    private fun healthSkillzZip(name: String, contents: String): ByteArray {
        val out = ByteArrayOutputStream()
        ZipOutputStream(out).use { zip ->
            zip.putNextEntry(ZipEntry(name))
            zip.write(contents.toByteArray())
            zip.closeEntry()
        }
        return out.toByteArray()
    }
}

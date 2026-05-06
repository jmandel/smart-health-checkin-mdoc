package org.smarthealthit.checkin.wallet

import java.io.File
import org.json.JSONObject
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class DemoWalletStoreTest {
    private val store = DemoWalletStore { path ->
        File("src/main/assets", path).readText()
    }

    @Test
    fun prefillsQuestionnaireAnswersByCanonicalVersionAndLinkId() {
        val request = verifiedRequestWithDemoQuestionnaire()

        val prefills = store.prefillQuestionnaireAnswers(request.items)

        assertEquals("24", prefills[smartQuestionnaireAnswerKey("intake", "migraine-days-90")])
        assertEquals("9", prefills[smartQuestionnaireAnswerKey("intake", "moderate-severe-days-90")])
        assertEquals("12", prefills[smartQuestionnaireAnswerKey("intake", "acute-med-days-30")])
        assertEquals("somewhat-better", prefills[smartQuestionnaireAnswerKey("intake", "overall-change")])
        assertEquals(
            "Fewer missed workdays and an acute plan that reliably works within two hours.",
            prefills[smartQuestionnaireAnswerKey("intake", "visit-priority")],
        )
    }

    @Test
    fun responseFactoryLoadsFixtureArtifactsAndQuestionnaireResponse() {
        val request = verifiedRequestWithDemoQuestionnaire()
        val prefills = store.prefillQuestionnaireAnswers(request.items)
        val selected = request.items.associate { it.id to true }

        val response = SmartCheckinResponseFactory.build(
            request = request,
            selectedItems = selected,
            questionnaireAnswers = prefills,
            walletStore = store,
        )

        val artifacts = response.getJSONArray("artifacts")
        assertEquals(4, artifacts.length())
        val byId = (0 until artifacts.length())
            .associate { index ->
                val artifact = artifacts.getJSONObject(index)
                assertFalse("Artifacts should use mediaType/value, not a legacy type discriminator.", artifact.has("type"))
                assertEquals("application/fhir+json", artifact.getString("mediaType"))
                assertEquals("4.0.1", artifact.getString("fhirVersion"))
                artifact.getString("id") to artifact.getJSONObject("value")
            }

        assertEquals("smart-health-checkin-response", response.getString("type"))
        assertEquals("demo-request", response.getString("requestId"))
        assertEquals("Coverage", byId.getValue("artifact-coverage").getString("resourceType"))
        assertEquals("coverage-1", byId.getValue("artifact-coverage").getString("id"))
        assertEquals("Bundle", byId.getValue("artifact-clinical").getString("resourceType"))
        assertEquals("InsurancePlan", byId.getValue("artifact-plan").getString("resourceType"))

        val questionnaireResponse = byId.getValue("artifact-intake")
        assertEquals("QuestionnaireResponse", questionnaireResponse.getString("resourceType"))
        assertEquals(
            "https://smart-health-checkin.example.org/fhir/Questionnaire/chronic-migraine-followup|2026.04",
            questionnaireResponse.getString("questionnaire"),
        )
        assertTrue(questionnaireResponse.toString().contains("\"valueInteger\":24"))
        assertTrue(questionnaireResponse.toString().contains("\"code\":\"somewhat-better\""))
        assertTrue(questionnaireResponse.toString().contains("Medication-use pattern may be worth reviewing"))
        assertEquals(4, response.getJSONArray("requestStatus").length())
    }

    @Test
    fun responseFactoryEmitsSmartHealthCardWithoutOuterFhirVersionWhenPreferred() {
        val request = verifiedRequestWithSingleClinicalItem(
            acceptedMediaTypes = listOf("application/smart-health-card", "application/fhir+json"),
        )

        val response = SmartCheckinResponseFactory.build(
            request = request,
            selectedItems = mapOf("clinical" to true),
            questionnaireAnswers = emptyMap(),
            walletStore = store,
        )

        val artifact = response.getJSONArray("artifacts").getJSONObject(0)
        assertEquals("application/smart-health-card", artifact.getString("mediaType"))
        assertFalse(artifact.has("fhirVersion"))
        assertTrue(
            artifact.getJSONObject("value")
                .getJSONArray("verifiableCredential")
                .getString(0)
                .isNotBlank(),
        )
    }

    @Test
    fun demoStoreResolvesAvailabilityBeforeConsent() {
        val request = verifiedRequestWithDemoQuestionnaire()

        val resolutions = store.resolveItems(request.items)

        assertEquals(request.items.map { it.id }, resolutions.map { it.itemId })
        resolutions.forEach { resolution ->
            assertEquals(WalletItemAvailability.Available, resolution.availability)
            assertEquals("1 demo record available", resolution.matchSummary)
            assertEquals(1, resolution.candidates.size)
            assertTrue(resolution.candidates.single().selectedByDefault)
        }
        assertEquals("Demo insurance coverage", resolutions.first { it.itemId == "coverage" }.candidates.single().label)
        assertEquals("Demo clinical history", resolutions.first { it.itemId == "clinical" }.candidates.single().label)
        assertEquals(
            "Chronic Migraine 3-Month Check-in - Dr. Mandel's Clinic",
            resolutions.first { it.itemId == "intake" }.candidates.single().label,
        )
    }

    @Test
    fun selectedCandidateSubsetProducesPartialStatus() {
        val request = verifiedRequestWithSingleClinicalItem()
        val candidateA = WalletCandidate(
            id = "condition-a",
            label = "Asthma",
            subtitle = "Condition",
            resourceType = "Condition",
            value = JSONObject("""{"resourceType":"Condition","id":"a"}"""),
        )
        val candidateB = WalletCandidate(
            id = "condition-b",
            label = "Migraine",
            subtitle = "Condition",
            resourceType = "Condition",
            value = JSONObject("""{"resourceType":"Condition","id":"b"}"""),
        )
        val resolution = RequestItemResolution(
            itemId = "clinical",
            availability = WalletItemAvailability.Available,
            candidates = listOf(candidateA, candidateB),
            matchSummary = "2 matching records available",
        )
        val candidateStore = object : SmartHealthWalletStore {
            override fun resolveItems(items: List<RequestItem>): List<RequestItemResolution> = listOf(resolution)

            override fun buildArtifact(
                item: RequestItem,
                selectedCandidates: List<WalletCandidate>,
                questionnaireAnswers: Map<String, Any>,
            ): SmartHealthWalletArtifact {
                val bundle = org.json.JSONArray()
                selectedCandidates.forEach { bundle.put(JSONObject(it.value.toString())) }
                return SmartHealthWalletArtifact(
                    value = JSONObject()
                        .put("resourceType", "Bundle")
                        .put("type", "collection")
                        .put("entry", bundle),
                )
            }

            override fun prefillQuestionnaireAnswers(items: List<RequestItem>): Map<String, Any> = emptyMap()
        }

        val response = SmartCheckinResponseFactory.build(
            request = request,
            selectedItems = mapOf("clinical" to true),
            questionnaireAnswers = emptyMap(),
            walletStore = candidateStore,
            resolutions = listOf(resolution),
            selectedCandidates = mapOf("clinical" to setOf("condition-a")),
        )

        val statuses = response.getJSONArray("requestStatus")
        assertEquals("partial", statuses.getJSONObject(0).getString("status"))
        val entries = response.getJSONArray("artifacts")
            .getJSONObject(0)
            .getJSONObject("value")
            .getJSONArray("entry")
        assertEquals(1, entries.length())
        assertEquals("a", entries.getJSONObject(0).getString("id"))
    }

    @Test
    fun responseFactoryRejectsBlankRequestId() {
        val failure = runCatching {
            SmartCheckinResponseFactory.build(
                request = verifiedRequestWithSingleClinicalItem(requestId = ""),
                selectedItems = mapOf("clinical" to true),
                questionnaireAnswers = emptyMap(),
                walletStore = store,
            )
        }.exceptionOrNull()

        assertTrue(failure?.message?.contains("SMART request id") == true)
    }

    @Test
    fun prefillsWellbeingSummaryMarkdown() {
        val questionnaire = JSONObject(
            """{"resourceType":"Questionnaire","url":"https://example.org/q","version":"1","item":[{"linkId":"wellbeing","text":"How have you been?","type":"text"}]}""",
        )
        val item = RequestItem(
            id = "intake",
            title = "Intake",
            subtitle = "Patient-authored summary",
            kind = RequestKind.Questionnaire,
            meta = JSONObject().put("questionnaire", questionnaire),
        )

        val prefills = store.prefillQuestionnaireAnswers(listOf(item))

        assertTrue(
            prefills.getValue(smartQuestionnaireAnswerKey("intake", "wellbeing"))
                .toString()
                .contains("How I've been since the last visit"),
        )
    }

    @Test
    fun selectedItemsControlWhichArtifactsAreIncluded() {
        val request = verifiedRequestWithDemoQuestionnaire()
        val prefills = store.prefillQuestionnaireAnswers(request.items)
        val selected = mapOf(
            "coverage" to true,
            "clinical" to false,
            "plan" to false,
            "intake" to true,
        )

        val response = SmartCheckinResponseFactory.build(
            request = request,
            selectedItems = selected,
            questionnaireAnswers = prefills,
            walletStore = store,
        )

        val artifacts = response.getJSONArray("artifacts")
        assertEquals(2, artifacts.length())
        val statuses = (0 until response.getJSONArray("requestStatus").length())
            .associate { index ->
                val status = response.getJSONArray("requestStatus").getJSONObject(index)
                status.getString("item") to status.getString("status")
            }
        assertEquals("fulfilled", statuses["coverage"])
        assertEquals("fulfilled", statuses["intake"])
        assertEquals("declined", statuses["clinical"])
        assertEquals("declined", statuses["plan"])
    }

    private fun verifiedRequestWithDemoQuestionnaire(): VerifiedRequest {
        val questionnaire = JSONObject(File("src/main/assets/demo-data/migraine-questionnaire.json").readText())
        return VerifiedRequest(
            requestId = "demo-request",
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
            items = listOf(
                RequestItem(
                    id = "coverage",
                    title = "Digital Insurance Card",
                    subtitle = "Member coverage and payer details.",
                    kind = RequestKind.Coverage,
                    meta = JSONObject().put(
                        "profile",
                        "http://hl7.org/fhir/us/insurance-card/StructureDefinition/C4DIC-Coverage",
                    ),
                ),
                RequestItem(
                    id = "clinical",
                    title = "Clinical History",
                    subtitle = "Patient summary.",
                    kind = RequestKind.Clinical,
                    meta = JSONObject().put(
                        "profile",
                        "http://hl7.org/fhir/us/core/StructureDefinition/us-core-patient",
                    ),
                ),
                RequestItem(
                    id = "plan",
                    title = "Plan Benefits Summary",
                    subtitle = "Benefits and plan limits.",
                    kind = RequestKind.Plan,
                    meta = JSONObject().put(
                        "profile",
                        "http://hl7.org/fhir/us/insurance-card/StructureDefinition/sbc-insurance-plan",
                    ),
                ),
                RequestItem(
                    id = "intake",
                    title = "Questionnaire",
                    subtitle = "Form answers requested by the verifier.",
                    kind = RequestKind.Questionnaire,
                    meta = JSONObject().put("questionnaire", questionnaire),
                ),
            ),
        )
    }

    private fun verifiedRequestWithSingleClinicalItem(
        requestId: String = "demo-request",
        acceptedMediaTypes: List<String> = listOf("application/fhir+json"),
    ): VerifiedRequest {
        return VerifiedRequest(
            requestId = requestId,
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
            items = listOf(
                RequestItem(
                    id = "clinical",
                    title = "Clinical History",
                    subtitle = "Patient summary.",
                    kind = RequestKind.Clinical,
                    meta = JSONObject(),
                    acceptedMediaTypes = acceptedMediaTypes,
                ),
            ),
        )
    }
}

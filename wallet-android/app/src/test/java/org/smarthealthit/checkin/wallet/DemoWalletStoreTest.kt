package org.smarthealthit.checkin.wallet

import java.io.File
import org.json.JSONObject
import org.junit.Assert.assertEquals
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
                artifact.getString("id") to artifact.getJSONObject("data")
            }

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
        val answers = response.getJSONObject("answers")
        assertTrue(answers.has("coverage"))
        assertTrue(answers.has("intake"))
        assertEquals(false, answers.has("clinical"))
        assertEquals(false, answers.has("plan"))
    }

    private fun verifiedRequestWithDemoQuestionnaire(): VerifiedRequest {
        val questionnaire = JSONObject(File("src/main/assets/demo-data/migraine-questionnaire.json").readText())
        return VerifiedRequest(
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
}

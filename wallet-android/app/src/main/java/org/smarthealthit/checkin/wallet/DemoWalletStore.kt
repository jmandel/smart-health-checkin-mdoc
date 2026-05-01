package org.smarthealthit.checkin.wallet

import android.content.res.AssetManager
import java.io.BufferedReader
import java.io.InputStream
import java.io.InputStreamReader
import java.nio.charset.StandardCharsets
import org.json.JSONObject

internal interface SmartHealthWalletStore {
    fun resolveArtifact(item: RequestItem, questionnaireAnswers: Map<String, Any>): SmartHealthWalletArtifact

    fun prefillQuestionnaireAnswers(items: List<RequestItem>): Map<String, Any>
}

internal data class SmartHealthWalletArtifact(
    val type: String = "fhir_resource",
    val data: JSONObject,
)

internal data class QuestionnaireAnswerKey(
    val questionnaireUrl: String,
    val questionnaireVersion: String,
    val linkId: String,
)

internal class DemoWalletStore(
    private val readAssetText: (String) -> String,
) : SmartHealthWalletStore {
    companion object {
        private const val DEMO_DATA_ROOT = "demo-data"
        private const val COVERAGE_FIXTURE = "carin-coverage.json"
        private const val CLINICAL_FIXTURE = "clinical-history-bundle.json"
        private const val PLAN_FIXTURE = "sbc-insurance-plan.json"
        private const val MIGRAINE_QUESTIONNAIRE_FIXTURE = "migraine-questionnaire.json"
        private const val MIGRAINE_ANSWERS_FIXTURE = "migraine-autofill-values.json"

        fun fromAssets(assets: AssetManager): DemoWalletStore {
            return DemoWalletStore { path ->
                assets.open(path).use(::readUtf8)
            }
        }

        private fun readUtf8(input: InputStream): String {
            val builder = StringBuilder()
            BufferedReader(InputStreamReader(input, StandardCharsets.UTF_8)).use { reader ->
                var line = reader.readLine()
                while (line != null) {
                    builder.append(line)
                    line = reader.readLine()
                }
            }
            return builder.toString()
        }
    }

    private val cannedQuestionnaireAnswers: Map<QuestionnaireAnswerKey, Any> by lazy {
        loadCannedQuestionnaireAnswers()
    }

    override fun resolveArtifact(item: RequestItem, questionnaireAnswers: Map<String, Any>): SmartHealthWalletArtifact {
        val data = when (item.kind) {
            RequestKind.Coverage -> readDemoJson(COVERAGE_FIXTURE)
            RequestKind.Plan -> readDemoJson(PLAN_FIXTURE)
            RequestKind.Clinical -> readDemoJson(CLINICAL_FIXTURE)
            RequestKind.Questionnaire -> QuestionnaireResponseBuilder.build(item, questionnaireAnswers)
            RequestKind.Unknown -> JSONObject()
                .put("resourceType", "Basic")
                .put("id", item.id)
                .put("code", JSONObject().put("text", item.title))
        }
        return SmartHealthWalletArtifact(data = data)
    }

    override fun prefillQuestionnaireAnswers(items: List<RequestItem>): Map<String, Any> {
        val out = LinkedHashMap<String, Any>()
        items
            .filter { it.kind == RequestKind.Questionnaire }
            .forEach { item ->
                val questionnaire = item.meta.optJSONObject("questionnaire") ?: return@forEach
                collectPrefills(
                    credentialId = item.id,
                    questionnaireUrl = questionnaire.optString("url"),
                    questionnaireVersion = questionnaire.optString("version"),
                    sourceItems = questionnaire.optJSONArray("item"),
                    out = out,
                )
            }
        return out
    }

    private fun collectPrefills(
        credentialId: String,
        questionnaireUrl: String,
        questionnaireVersion: String,
        sourceItems: org.json.JSONArray?,
        out: MutableMap<String, Any>,
    ) {
        jsonObjectItems(sourceItems).forEach { item ->
            val linkId = item.optString("linkId")
            if (linkId.isNotBlank() && item.optString("type") !in setOf("group", "display")) {
                val key = QuestionnaireAnswerKey(questionnaireUrl, questionnaireVersion, linkId)
                cannedQuestionnaireAnswers[key]?.let { value ->
                    out[smartQuestionnaireAnswerKey(credentialId, linkId)] = jsonValue(value) ?: JSONObject.NULL
                }
            }
            collectPrefills(
                credentialId = credentialId,
                questionnaireUrl = questionnaireUrl,
                questionnaireVersion = questionnaireVersion,
                sourceItems = item.optJSONArray("item"),
                out = out,
            )
        }
    }

    private fun loadCannedQuestionnaireAnswers(): Map<QuestionnaireAnswerKey, Any> {
        val questionnaire = readDemoJson(MIGRAINE_QUESTIONNAIRE_FIXTURE)
        val answers = readDemoJson(MIGRAINE_ANSWERS_FIXTURE)
        val questionnaireUrl = questionnaire.optString("url")
        val questionnaireVersion = questionnaire.optString("version")
        val out = LinkedHashMap<QuestionnaireAnswerKey, Any>()
        answers.keys().forEach { linkId ->
            val value = answers.opt(linkId)
            if (linkId.isNotBlank() && value != null && value != JSONObject.NULL) {
                out[QuestionnaireAnswerKey(questionnaireUrl, questionnaireVersion, linkId)] = jsonValue(value) ?: JSONObject.NULL
            }
        }
        return out
    }

    private fun readDemoJson(fileName: String): JSONObject {
        return JSONObject(readAssetText("$DEMO_DATA_ROOT/$fileName"))
    }
}

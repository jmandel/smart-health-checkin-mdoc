package org.smarthealthit.checkin.wallet

import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import org.json.JSONObject
import java.io.BufferedReader
import java.io.InputStream
import java.io.InputStreamReader
import java.net.HttpURLConnection
import java.net.URL
import java.nio.charset.StandardCharsets

internal object SmartQuestionnaireFetcher {
    suspend fun hydrateQuestionnaireUrls(smartRequest: JSONObject): JSONObject = withContext(Dispatchers.IO) {
        val copy = JSONObject(smartRequest.toString())
        val items = copy.optJSONArray("items") ?: return@withContext copy

        for (i in 0 until items.length()) {
            val item = items.optJSONObject(i) ?: continue
            val content = item.optJSONObject("content") ?: continue
            if (content.optString("kind") != "questionnaire") continue

            when (val questionnaireSpec = content.opt("questionnaire")) {
                is String -> {
                    val questionnaire = fetchAndValidate(i, questionnaireSpec)
                    content.put(
                        "questionnaire",
                        JSONObject()
                            .put("canonical", questionnaireSpec)
                            .put("resource", questionnaire),
                    )
                }
                is JSONObject -> {
                    val resource = questionnaireSpec.optJSONObject("resource")
                    if (resource != null) {
                        require(resource.optString("resourceType") == "Questionnaire") {
                            "items[$i].content.questionnaire.resource is not a Questionnaire"
                        }
                    } else if (questionnaireSpec.optString("resourceType") == "Questionnaire") {
                        // Inline Questionnaire resource: already hydrated.
                    } else {
                        val canonical = questionnaireSpec.optString("canonical")
                        require(canonical.isNotBlank()) {
                            "items[$i].content.questionnaire object must include canonical or resource"
                        }
                        questionnaireSpec.put("resource", fetchAndValidate(i, canonical))
                    }
                }
                else -> error("items[$i].content.questionnaire must be a canonical string or object")
            }
        }

        copy
    }

    private fun fetchAndValidate(index: Int, canonical: String): JSONObject {
        require(canonical.isNotBlank()) { "items[$index].content.questionnaire canonical is blank" }
        val questionnaire = fetchQuestionnaire(canonical)
        require(questionnaire.optString("resourceType") == "Questionnaire") {
            "items[$index].content.questionnaire did not return a Questionnaire"
        }
        return questionnaire
    }

    private fun fetchQuestionnaire(rawUrl: String): JSONObject {
        val url = URL(rawUrl)
        require(url.protocol == "https" || url.protocol == "http") {
            "Unsupported questionnaireUrl scheme: ${url.protocol}"
        }
        val connection = url.openConnection() as HttpURLConnection
        connection.requestMethod = "GET"
        connection.connectTimeout = 10_000
        connection.readTimeout = 15_000
        connection.setRequestProperty("Accept", "application/fhir+json, application/json")

        val status = connection.responseCode
        val body = readStream(if (status in 200..299) connection.inputStream else connection.errorStream)
        if (status !in 200..299) {
            error("HTTP $status fetching questionnaireUrl $rawUrl: $body")
        }
        return JSONObject(body)
    }

    private fun readStream(input: InputStream?): String {
        if (input == null) return ""
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

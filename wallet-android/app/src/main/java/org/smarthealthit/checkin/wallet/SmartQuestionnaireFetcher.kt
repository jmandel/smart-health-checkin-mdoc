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

            require(!content.has("questionnaire")) {
                "items[$i].content.questionnaire is not a SMART Health Check-in 1.0 selector member; use canonical and resource directly"
            }

            val existingResource = content.optJSONObject("resource")
            if (existingResource != null) {
                require(existingResource.optString("resourceType") == "Questionnaire") {
                    "items[$i].content.resource is not a Questionnaire"
                }
                continue
            }

            val canonical = content.optString("canonical")
            require(canonical.isNotBlank()) {
                "items[$i].content must include canonical or resource"
            }
            content.put("resource", fetchAndValidate(i, canonical))
        }

        copy
    }

    private fun fetchAndValidate(index: Int, canonical: String): JSONObject {
        require(canonical.isNotBlank()) { "items[$index].content.canonical is blank" }
        val questionnaire = fetchQuestionnaire(canonical)
        require(questionnaire.optString("resourceType") == "Questionnaire") {
            "items[$index].content.canonical did not return a Questionnaire"
        }
        return questionnaire
    }

    internal fun canonicalUrlForFetch(canonical: String): String {
        val rawUrl = canonical.substringBefore('|')
        require(rawUrl.isNotBlank()) { "Questionnaire canonical URL is blank" }
        return rawUrl
    }

    private fun fetchQuestionnaire(rawUrl: String): JSONObject {
        val fetchUrl = canonicalUrlForFetch(rawUrl)
        val url = URL(fetchUrl)
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

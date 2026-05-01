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
            if (item.has("questionnaire") || !item.has("questionnaireUrl")) continue

            val url = item.optString("questionnaireUrl")
            require(url.isNotBlank()) { "items[$i].questionnaireUrl is blank" }
            val questionnaire = fetchQuestionnaire(url)
            require(questionnaire.optString("resourceType") == "Questionnaire") {
                "items[$i].questionnaireUrl did not return a Questionnaire"
            }
            item.put("questionnaire", questionnaire)
        }

        copy
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

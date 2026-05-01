package org.smarthealthit.checkin.wallet

import org.json.JSONArray
import org.json.JSONObject

/**
 * Hydrates a `VerifiedRequest` (the Compose UI's existing model) from a SMART
 * Health Check-in request JSON pulled out of
 * `requestInfo["org.smarthealthit.checkin.request"]`.
 */
internal object SmartRequestAdapter {
    fun build(
        verifierOrigin: String,
        nonce: String,
        smartRequest: JSONObject,
        readerAuth: ReaderAuthVerification = ReaderAuthVerification.ABSENT,
    ): VerifiedRequest {
        return VerifiedRequest(
            requestId = smartRequest.optString("id").ifBlank { "smart-health-checkin-request" },
            verifierOrigin = verifierOrigin,
            clientId = "",
            requestUri = "",
            responseUri = "",
            state = "",
            nonce = nonce,
            completion = "dc-api",
            clientMetadata = JSONObject(),
            dcqlQuery = JSONObject(),
            rawSmartRequestJson = smartRequest.toString(2),
            readerAuth = readerAuth,
            items = parseItems(smartRequest.optJSONArray("items")),
        )
    }

    private fun parseItems(requestsArray: JSONArray?): List<RequestItem> {
        if (requestsArray == null) return emptyList()
        val out = ArrayList<RequestItem>(requestsArray.length())
        for (i in 0 until requestsArray.length()) {
            val item = requestsArray.optJSONObject(i) ?: continue
            val id = item.optString("id").ifBlank { "item-${i + 1}" }
            val content = item.optJSONObject("content") ?: JSONObject()
            val accept = stringList(item.optJSONArray("accept")).ifEmpty { listOf("application/fhir+json") }
            out += when (content.optString("kind")) {
                "questionnaire" -> parseQuestionnaireItem(id, item, content, accept)
                "fhir.resources" -> parseFhirResourcesItem(id, item, content, accept)
                else -> RequestItem(
                    id = id,
                    title = item.optString("title").ifBlank { id },
                    subtitle = item.optString("summary").ifBlank { "Requested artifact." },
                    kind = RequestKind.Unknown,
                    meta = JSONObject(item.toString()),
                    acceptedMediaTypes = accept,
                )
            }
        }
        return out
    }

    private fun parseQuestionnaireItem(
        id: String,
        item: JSONObject,
        content: JSONObject,
        accept: List<String>,
    ): RequestItem {
        val meta = JSONObject(item.toString())
        val questionnaire = content.opt("questionnaire")
        val resource = questionnaireResource(questionnaire)
        val canonical = questionnaireCanonical(questionnaire, resource)
        if (resource != null) meta.put("questionnaire", resource)
        if (!canonical.isNullOrBlank()) {
            meta.put("questionnaireCanonical", canonical)
            meta.put("questionnaireUrl", canonical)
        }
        return RequestItem(
            id = id,
            title = item.optString("title").ifBlank {
                resource?.optString("title")?.ifBlank { null } ?: "Questionnaire"
            },
            subtitle = item.optString("summary").ifBlank {
                resource?.optString("description")?.ifBlank { null } ?: "Form answers requested by the verifier."
            },
            kind = RequestKind.Questionnaire,
            meta = meta,
            acceptedMediaTypes = accept,
        )
    }

    private fun parseFhirResourcesItem(
        id: String,
        item: JSONObject,
        content: JSONObject,
        accept: List<String>,
    ): RequestItem {
        val selector = buildString {
            append(id)
            append(' ')
            append(stringList(content.optJSONArray("profiles")).joinToString(" "))
            append(' ')
            append(stringList(content.optJSONArray("resourceTypes")).joinToString(" "))
            append(' ')
            append(content.opt("profilesFrom")?.toString().orEmpty())
        }.lowercase()
        val summary = item.optString("summary")
        return when {
            "coverage" in selector -> RequestItem(
                id = id,
                title = item.optString("title").ifBlank { "Digital Insurance Card" },
                subtitle = summary.ifBlank { "Member coverage and payer details." },
                kind = RequestKind.Coverage,
                meta = JSONObject(item.toString()),
                acceptedMediaTypes = accept,
            )
            "insuranceplan" in selector || "sbc" in selector -> RequestItem(
                id = id,
                title = item.optString("title").ifBlank { "Plan Benefits Summary" },
                subtitle = summary.ifBlank { "Benefits, cost sharing, and plan limits." },
                kind = RequestKind.Plan,
                meta = JSONObject(item.toString()),
                acceptedMediaTypes = accept,
            )
            "patient" in selector || "ips" in selector || "bundle" in selector ||
                "immunization" in selector || "condition" in selector ||
                "allergyintolerance" in selector -> RequestItem(
                id = id,
                title = item.optString("title").ifBlank { "Clinical History" },
                subtitle = summary.ifBlank { "Patient summary, conditions, medications, and allergies." },
                kind = RequestKind.Clinical,
                meta = JSONObject(item.toString()),
                acceptedMediaTypes = accept,
            )
            else -> RequestItem(
                id = id,
                title = item.optString("title").ifBlank { id },
                subtitle = summary.ifBlank { "Requested FHIR resources." },
                kind = RequestKind.Unknown,
                meta = JSONObject(item.toString()),
                acceptedMediaTypes = accept,
            )
        }
    }

    private fun questionnaireResource(value: Any?): JSONObject? {
        return when (value) {
            is JSONObject -> {
                when {
                    value.optString("resourceType") == "Questionnaire" -> JSONObject(value.toString())
                    value.optJSONObject("resource") != null -> value.optJSONObject("resource")
                    else -> null
                }
            }
            else -> null
        }
    }

    private fun questionnaireCanonical(value: Any?, resource: JSONObject?): String? {
        return when (value) {
            is String -> value
            is JSONObject -> value.optString("canonical").ifBlank { null }
            else -> null
        } ?: resource?.let { questionnaire ->
            val url = questionnaire.optString("url")
            if (url.isBlank()) null else {
                val version = questionnaire.optString("version")
                if (version.isBlank()) url else "$url|$version"
            }
        }
    }

    private fun stringList(array: JSONArray?): List<String> {
        if (array == null) return emptyList()
        val out = ArrayList<String>(array.length())
        for (i in 0 until array.length()) {
            array.optString(i).takeIf { it.isNotBlank() }?.let(out::add)
        }
        return out
    }
}

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
        require(smartRequest.optString("type") == "smart-health-checkin-request") {
            "type must be \"smart-health-checkin-request\""
        }
        require(smartRequest.optString("version") == "1") { "version must be \"1\"" }
        val requestId = requiredString(smartRequest, "id", "id")
        return VerifiedRequest(
            requestId = requestId,
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
        require(requestsArray != null) { "items must be an array" }
        val out = ArrayList<RequestItem>(requestsArray.length())
        val ids = LinkedHashSet<String>()
        for (i in 0 until requestsArray.length()) {
            val item = requestsArray.optJSONObject(i) ?: error("items[$i] must be an object")
            val id = requiredString(item, "id", "items[$i].id")
            require(ids.add(id)) { "items[$i].id is duplicated" }
            requiredString(item, "title", "items[$i].title")
            val content = item.optJSONObject("content") ?: error("items[$i].content must be an object")
            val accept = requiredStringArray(item.optJSONArray("accept"), "items[$i].accept")
            out += when (content.optString("kind")) {
                "questionnaire" -> parseQuestionnaireItem(id, item, content, accept)
                "fhir.resources" -> parseFhirResourcesItem(id, item, content, accept)
                else -> error("items[$i].content.kind must be fhir.resources or questionnaire")
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
        require(resource != null || !canonical.isNullOrBlank()) {
            "questionnaire content must include a canonical or Questionnaire resource"
        }
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
        val profiles = stringList(content.optJSONArray("profiles"))
            .map { it.substringBefore('|').lowercase() }
            .toSet()
        val resourceTypes = stringList(content.optJSONArray("resourceTypes")).map { it.lowercase() }.toSet()
        val profileCollections = profilesFromCanonicals(content.opt("profilesFrom"))
        val summary = item.optString("summary")
        return when {
            profiles.any { it.endsWith("/structuredefinition/c4dic-coverage") } ||
                "coverage" in resourceTypes -> RequestItem(
                id = id,
                title = item.optString("title").ifBlank { "Digital Insurance Card" },
                subtitle = summary.ifBlank { "Member coverage and payer details." },
                kind = RequestKind.Coverage,
                meta = JSONObject(item.toString()),
                acceptedMediaTypes = accept,
            )
            profiles.any {
                it.endsWith("/structuredefinition/c4dic-insuranceplan") ||
                    it.endsWith("/structuredefinition/sbc-insurance-plan")
            } || "insuranceplan" in resourceTypes -> RequestItem(
                id = id,
                title = item.optString("title").ifBlank { "Plan Benefits Summary" },
                subtitle = summary.ifBlank { "Benefits, cost sharing, and plan limits." },
                kind = RequestKind.Plan,
                meta = JSONObject(item.toString()),
                acceptedMediaTypes = accept,
            )
            profiles.any {
                it.endsWith("/structuredefinition/us-core-patient") ||
                    it.endsWith("/structuredefinition/bundle-uv-ips")
            } || profileCollections.any {
                it == "http://hl7.org/fhir/us/core" ||
                    it == "http://hl7.org/fhir/uv/ips"
            } || resourceTypes.any {
                it in setOf("patient", "bundle", "immunization", "condition", "allergyintolerance", "diagnosticreport", "observation")
            } -> RequestItem(
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

    private fun profilesFromCanonicals(value: Any?): Set<String> {
        val out = LinkedHashSet<String>()
        fun addOne(v: Any?) {
            when (v) {
                is String -> if (v.isNotBlank()) out += v.substringBefore('|').lowercase()
                is JSONObject -> {
                    val canonical = v.optString("canonical")
                    if (canonical.isNotBlank()) out += canonical.substringBefore('|').lowercase()
                }
                is JSONArray -> {
                    for (i in 0 until v.length()) addOne(v.opt(i))
                }
            }
        }
        addOne(value)
        return out
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

    private fun requiredString(obj: JSONObject, key: String, diagnosticPath: String): String {
        val value = obj.opt(key)
        require(value is String && value.isNotBlank()) { "$diagnosticPath missing or not a string" }
        return value
    }

    private fun requiredStringArray(array: JSONArray?, path: String): List<String> {
        require(array != null && array.length() > 0) { "$path must be a non-empty string array" }
        val out = ArrayList<String>(array.length())
        for (i in 0 until array.length()) {
            val value = array.opt(i)
            require(value is String && value.isNotBlank()) { "$path[$i] must be a non-empty string" }
            out += value
        }
        return out
    }
}

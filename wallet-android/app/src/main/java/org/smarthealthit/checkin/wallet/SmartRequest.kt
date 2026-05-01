package org.smarthealthit.checkin.wallet

import org.json.JSONArray
import org.json.JSONObject

/**
 * Hydrates a `VerifiedRequest` (the Compose UI's existing model) from a SMART
 * Health Check-in request JSON pulled out of `requestInfo.smart_health_checkin`.
 *
 * SMART request shape (see `profiles/org-iso-mdoc.md` §SMART payload location):
 *
 *   {
 *     "version": "1",
 *     "items": [
 *       { "id": "patient",  "profile": "...us-core-patient", "required": true },
 *       { "id": "intake",   "questionnaire": { ... } },
 *       { "id": "coverage", "profile": "...C4DIC-Coverage" }
 *     ]
 *   }
 */
internal object SmartRequestAdapter {
    fun build(
        verifierOrigin: String,
        nonce: String,
        smartRequest: JSONObject,
        readerAuth: ReaderAuthVerification = ReaderAuthVerification.ABSENT,
    ): VerifiedRequest {
        return VerifiedRequest(
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

    private fun parseItems(itemsArray: JSONArray?): List<RequestItem> {
        if (itemsArray == null) return emptyList()
        val out = ArrayList<RequestItem>(itemsArray.length())
        for (i in 0 until itemsArray.length()) {
            val item = itemsArray.optJSONObject(i) ?: continue
            val id = item.optString("id").ifBlank { "item-${i + 1}" }
            val parsed = if (item.has("questionnaire") || item.has("questionnaireUrl")) {
                val q = item.optJSONObject("questionnaire")
                RequestItem(
                    id = id,
                    title = q?.optString("title")?.ifBlank { null } ?: "Questionnaire",
                    subtitle = q?.optString("description")?.ifBlank { null }
                        ?: item.optString("description").ifBlank { "Form answers requested by the verifier." },
                    kind = RequestKind.Questionnaire,
                    meta = item, // pass through; UI reads `questionnaire`/`questionnaireUrl` from here
                )
            } else {
                val profile = item.optString("profile").lowercase()
                val description = item.optString("description")
                when {
                    "coverage" in profile -> RequestItem(
                        id = id,
                        title = "Digital Insurance Card",
                        subtitle = description.ifBlank { "Member coverage and payer details." },
                        kind = RequestKind.Coverage,
                        meta = item,
                    )
                    "insuranceplan" in profile || "sbc" in profile -> RequestItem(
                        id = id,
                        title = "Plan Benefits Summary",
                        subtitle = description.ifBlank { "Benefits, cost sharing, and plan limits." },
                        kind = RequestKind.Plan,
                        meta = item,
                    )
                    "patient" in profile || "ips" in profile || "bundle" in profile ||
                        "immunization" in profile || "condition" in profile ||
                        "allergyintolerance" in profile -> RequestItem(
                        id = id,
                        title = "Clinical History",
                        subtitle = description.ifBlank { "Patient summary, conditions, medications, and allergies." },
                        kind = RequestKind.Clinical,
                        meta = item,
                    )
                    else -> RequestItem(
                        id = id,
                        title = id,
                        subtitle = description.ifBlank { "Requested artifact." },
                        kind = RequestKind.Unknown,
                        meta = item,
                    )
                }
            }
            out += parsed
        }
        return out
    }
}

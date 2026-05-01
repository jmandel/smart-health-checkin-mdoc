package org.smarthealthit.checkin.wallet

import org.json.JSONArray
import org.json.JSONObject

internal object SmartCheckinResponseFactory {
    fun build(
        request: VerifiedRequest,
        selectedItems: Map<String, Boolean>,
        questionnaireAnswers: Map<String, Any>,
        walletStore: SmartHealthWalletStore,
    ): JSONObject {
        require(request.requestId.isNotBlank()) { "SMART request id is required" }
        val artifacts = JSONArray()
        val requestStatus = JSONArray()

        request.items
            .forEach { item ->
                if (selectedItems[item.id] == false) {
                    requestStatus.put(
                        JSONObject()
                            .put("item", item.id)
                            .put("status", "declined"),
                    )
                    return@forEach
                }

                val artifactId = "artifact-${item.id}"
                val artifact = walletStore.resolveArtifact(item, questionnaireAnswers)
                if (!item.acceptedMediaTypes.contains(artifact.mediaType)) {
                    requestStatus.put(
                        JSONObject()
                            .put("item", item.id)
                            .put("status", "unsupported")
                            .put("message", "Wallet cannot produce an accepted media type for this request."),
                    )
                    return@forEach
                }

                val artifactJson = JSONObject()
                    .put("id", artifactId)
                    .put("mediaType", artifact.mediaType)
                    .put("fulfills", JSONArray().put(item.id))
                    .put("value", artifact.value)
                if (artifact.mediaType == "application/fhir+json") {
                    require(artifact.fhirVersion.isNotBlank()) {
                        "FHIR JSON artifact $artifactId must declare fhirVersion"
                    }
                    artifactJson.put("fhirVersion", artifact.fhirVersion)
                }
                artifacts.put(artifactJson)
                requestStatus.put(
                    JSONObject()
                        .put("item", item.id)
                        .put("status", "fulfilled"),
                )
            }

        return JSONObject()
            .put("type", "smart-health-checkin-response")
            .put("version", "1")
            .put("requestId", request.requestId)
            .put("artifacts", artifacts)
            .put("requestStatus", requestStatus)
    }
}

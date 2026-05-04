package org.smarthealthit.checkin.wallet

import org.json.JSONArray
import org.json.JSONObject

object SmartCheckinResponseFactory {
    fun build(
        request: VerifiedRequest,
        selectedItems: Map<String, Boolean>,
        questionnaireAnswers: Map<String, Any>,
        walletStore: SmartHealthWalletStore,
        resolutions: List<RequestItemResolution> = walletStore.resolveItems(request.items),
        selectedCandidates: Map<String, Set<String>> = emptyMap(),
    ): JSONObject {
        require(request.requestId.isNotBlank()) { "SMART request id is required" }
        val artifacts = JSONArray()
        val requestStatus = JSONArray()
        val resolutionsByItem = resolutions.associateBy { it.itemId }

        request.items
            .forEach { item ->
                if (selectedItems[item.id] == false) {
                    requestStatus.put(statusJson(item.id, RequestItemStatusCode.Declined))
                    return@forEach
                }

                val resolution = resolutionsByItem[item.id]
                    ?: RequestItemResolution(
                        itemId = item.id,
                        availability = WalletItemAvailability.Error,
                        candidates = emptyList(),
                        matchSummary = "Could not prepare this item.",
                        statusIfShared = RequestItemStatusCode.Error,
                    )

                when (resolution.availability) {
                    WalletItemAvailability.Unsupported -> {
                        requestStatus.put(
                            statusJson(item.id, RequestItemStatusCode.Unsupported, resolution.detail ?: resolution.matchSummary),
                        )
                        return@forEach
                    }
                    WalletItemAvailability.Error -> {
                        requestStatus.put(
                            statusJson(item.id, RequestItemStatusCode.Error, resolution.detail ?: resolution.matchSummary),
                        )
                        return@forEach
                    }
                    WalletItemAvailability.Unavailable -> {
                        requestStatus.put(
                            statusJson(item.id, RequestItemStatusCode.Unavailable, resolution.detail ?: resolution.matchSummary),
                        )
                        return@forEach
                    }
                    WalletItemAvailability.Available,
                    WalletItemAvailability.PartiallyAvailable -> Unit
                }

                val selectedCandidateIds = selectedCandidates[item.id]
                val candidatesToShare = when (selectedCandidateIds) {
                    null -> resolution.candidates.filter { it.selectedByDefault }
                    else -> resolution.candidates.filter { it.id in selectedCandidateIds }
                }
                if (candidatesToShare.isEmpty()) {
                    requestStatus.put(statusJson(item.id, RequestItemStatusCode.Declined))
                    return@forEach
                }

                val artifactId = "artifact-${item.id}"
                val artifact = walletStore.buildArtifact(item, candidatesToShare, questionnaireAnswers)
                if (!item.acceptedMediaTypes.contains(artifact.mediaType)) {
                    requestStatus.put(
                        statusJson(
                            item.id,
                            RequestItemStatusCode.Unsupported,
                            "Wallet cannot produce an accepted media type for this request.",
                        ),
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
                val status = when {
                    resolution.statusIfShared != RequestItemStatusCode.Fulfilled -> resolution.statusIfShared
                    candidatesToShare.size < resolution.candidates.size -> RequestItemStatusCode.Partial
                    else -> RequestItemStatusCode.Fulfilled
                }
                requestStatus.put(
                    statusJson(item.id, status, if (status == RequestItemStatusCode.Fulfilled) null else resolution.detail),
                )
            }

        return JSONObject()
            .put("type", "smart-health-checkin-response")
            .put("version", "1")
            .put("requestId", request.requestId)
            .put("artifacts", artifacts)
            .put("requestStatus", requestStatus)
    }

    private fun statusJson(itemId: String, status: RequestItemStatusCode, message: String? = null): JSONObject {
        val out = JSONObject()
            .put("item", itemId)
            .put("status", status.wireValue)
        if (!message.isNullOrBlank()) out.put("message", message)
        return out
    }
}

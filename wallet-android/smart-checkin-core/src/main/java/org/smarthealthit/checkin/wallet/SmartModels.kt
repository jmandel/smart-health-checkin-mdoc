package org.smarthealthit.checkin.wallet

import org.json.JSONObject

data class ReaderAuthVerification(
    val present: Boolean,
    val signatureValid: Boolean,
    val certificateSubject: String?,
) {
    companion object {
        val ABSENT = ReaderAuthVerification(
            present = false,
            signatureValid = false,
            certificateSubject = null,
        )
    }
}

data class VerifiedRequest(
    val requestId: String = "",
    val verifierOrigin: String,
    val clientId: String,
    val requestUri: String,
    val responseUri: String,
    val state: String,
    val nonce: String,
    val completion: String,
    val clientMetadata: JSONObject,
    val dcqlQuery: JSONObject,
    val rawSmartRequestJson: String = "",
    val readerAuth: ReaderAuthVerification = ReaderAuthVerification.ABSENT,
    val requestCarrierDebug: SmartRequestCarrierDebug = SmartRequestCarrierDebug(),
    val items: List<RequestItem>,
)

data class SmartRequestCarrierDebug(
    val source: String = "none",
    val requestInfoPresent: Boolean = false,
    val companionPresent: Boolean = false,
    val matchStatus: String = "not-applicable",
    val companionElementLength: Int = 0,
    val companionElementPreview: String = "",
) {
    fun label(): String {
        val found = listOfNotNull(
            if (requestInfoPresent) "requestInfo" else null,
            if (companionPresent) "companion" else null,
        ).ifEmpty { listOf("none") }.joinToString(" + ")
        val match = if (requestInfoPresent && companionPresent) " ($matchStatus)" else ""
        return "$found$match; using $source"
    }
}

data class RequestItem(
    val id: String,
    val title: String,
    val subtitle: String,
    val kind: RequestKind,
    val meta: JSONObject,
    val acceptedMediaTypes: List<String> = listOf("application/fhir+json"),
)

enum class RequestKind {
    Coverage,
    Plan,
    Clinical,
    Questionnaire,
    Unknown,
}

enum class RequestItemStatusCode(val wireValue: String) {
    Fulfilled("fulfilled"),
    Partial("partial"),
    Unavailable("unavailable"),
    Declined("declined"),
    Unsupported("unsupported"),
    Error("error"),
}

enum class WalletItemAvailability {
    Available,
    PartiallyAvailable,
    Unavailable,
    Unsupported,
    Error,
}

data class WalletCandidate(
    val id: String,
    val label: String,
    val subtitle: String,
    val resourceType: String? = null,
    val sourceName: String? = null,
    val selectedByDefault: Boolean = true,
    val value: JSONObject? = null,
)

data class RequestItemResolution(
    val itemId: String,
    val availability: WalletItemAvailability,
    val candidates: List<WalletCandidate>,
    val matchSummary: String,
    val detail: String? = null,
    val statusIfShared: RequestItemStatusCode = RequestItemStatusCode.Fulfilled,
)

interface SmartHealthWalletStore {
    fun resolveItems(items: List<RequestItem>): List<RequestItemResolution>

    fun buildArtifact(
        item: RequestItem,
        selectedCandidates: List<WalletCandidate>,
        questionnaireAnswers: Map<String, Any>,
    ): SmartHealthWalletArtifact

    fun prefillQuestionnaireAnswers(items: List<RequestItem>): Map<String, Any>
}

data class SmartHealthWalletArtifact(
    val mediaType: String = "application/fhir+json",
    val fhirVersion: String = "4.0.1",
    val value: JSONObject,
)

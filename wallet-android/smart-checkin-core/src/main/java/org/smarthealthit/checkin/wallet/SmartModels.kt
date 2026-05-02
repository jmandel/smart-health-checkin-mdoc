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
    val items: List<RequestItem>,
)

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

interface SmartHealthWalletStore {
    fun resolveArtifact(item: RequestItem, questionnaireAnswers: Map<String, Any>): SmartHealthWalletArtifact

    fun prefillQuestionnaireAnswers(items: List<RequestItem>): Map<String, Any>
}

data class SmartHealthWalletArtifact(
    val mediaType: String = "application/fhir+json",
    val fhirVersion: String = "4.0.1",
    val value: JSONObject,
)

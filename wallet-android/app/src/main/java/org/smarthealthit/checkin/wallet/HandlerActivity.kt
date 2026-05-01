package org.smarthealthit.checkin.wallet

import android.app.Activity
import android.content.Intent
import android.graphics.Color as AndroidColor
import android.os.Bundle
import android.util.Log
import androidx.activity.ComponentActivity
import androidx.activity.SystemBarStyle
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateMapOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.credentials.DigitalCredential
import androidx.credentials.ExperimentalDigitalCredentialApi
import androidx.credentials.GetDigitalCredentialOption
import androidx.credentials.GetCredentialResponse
import androidx.credentials.exceptions.GetCredentialUnknownException
import androidx.credentials.provider.CallingAppInfo
import androidx.credentials.provider.PendingIntentHandler
import androidx.credentials.provider.ProviderGetCredentialRequest
import androidx.credentials.provider.SigningInfoCompat
import androidx.credentials.registry.provider.selectedEntryId
import androidx.lifecycle.lifecycleScope
import org.json.JSONArray
import kotlinx.coroutines.launch
import org.json.JSONObject
import java.io.File
import java.security.MessageDigest
import java.time.Instant

/**
 * The activity Credential Manager launches via PendingIntent when the user
 * picks our SMART Health Check-in entry.
 *
 * Stage C scope:
 *   - Read ProviderGetCredentialRequest.
 *   - Find the org-iso-mdoc option and parse the SMART request out of
 *     `ItemsRequest.requestInfo["org.smarthealthit.checkin.request"]`.
 *   - Drive the existing Compose consent UI (DemoApp + ConsentScreen).
 *   - On submit, package the SMART-shaped response JSON as a direct mdoc
 *     DeviceResponse and return it as a DigitalCredential.
 */
@OptIn(ExperimentalDigitalCredentialApi::class)
class HandlerActivity : ComponentActivity() {
    companion object {
        private const val TAG = "SHCHandler"
    }

    private var screenState by mutableStateOf<ScreenState>(ScreenState.Loading("Reading request", "Decoding the SMART Health Check-in request."))
    private var verifiedRequest: VerifiedRequest? = null
    private var directMdocRequest: DirectMdocRequest? = null
    private var providerRequest: ProviderGetCredentialRequest? = null
    private val selectedItems = mutableStateMapOf<String, Boolean>()
    private val questionnaireAnswers = mutableStateMapOf<String, Any>()
    private val walletStore: SmartHealthWalletStore by lazy { DemoWalletStore.fromAssets(assets) }
    private var runId: String = "run-${Instant.now().toEpochMilli()}"

    private data class OriginResolution(
        val origin: String,
        val source: String,
        val isOriginPopulated: Boolean,
        val allowlistFingerprintCount: Int,
        val allowlistJson: String?,
        val error: String?,
    )

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge(
            statusBarStyle = SystemBarStyle.light(AndroidColor.TRANSPARENT, AndroidColor.TRANSPARENT),
            navigationBarStyle = SystemBarStyle.light(AndroidColor.TRANSPARENT, AndroidColor.TRANSPARENT),
        )

        setContent {
            SampleHealthTheme {
                DemoApp(
                    state = screenState,
                    selectedItems = selectedItems,
                    questionnaireAnswers = questionnaireAnswers,
                    onItemSelected = { id, selected -> selectedItems[id] = selected },
                    onAnswerChanged = ::setQuestionnaireAnswer,
                    onShare = { submit(declined = false) },
                    onDecline = { submit(declined = true) },
                    onClose = { finishWithCancel() },
                )
            }
        }

        try {
            val req = PendingIntentHandler.retrieveProviderGetCredentialRequest(intent)
            if (req == null) {
                screenState = ScreenState.Error("No Credential Manager request found in the launch intent.")
                return
            }
            handleRequest(req)
        } catch (t: Throwable) {
            Log.e(TAG, "onCreate retrieve failed", t)
            screenState = ScreenState.Error(t.message ?: t::class.java.simpleName)
        }
    }

    private fun handleRequest(req: ProviderGetCredentialRequest) {
        providerRequest = req
        val callingAppInfo = req.callingAppInfo
        val originResolution = resolveOrigin(callingAppInfo)
        val origin = originResolution.origin
        val selectedEntryId = runCatching { req.selectedEntryId }.getOrNull()
        Log.i(
            TAG,
            "request origin=$origin source=${originResolution.source} " +
                "originPopulated=${originResolution.isOriginPopulated} " +
                "pkg=${callingAppInfo.packageName} selectedEntryId=$selectedEntryId " +
                "originError=${originResolution.error}",
        )

        val mdocOption = req.credentialOptions
            .filterIsInstance<GetDigitalCredentialOption>()
            .firstOrNull()
        if (mdocOption == null) {
            screenState = ScreenState.Error("No GetDigitalCredentialOption in the request.")
            return
        }

        val parsed = runCatching {
            DirectMdocRequestParser.parseRequestJson(mdocOption.requestJson, origin)
        }
            .onFailure { Log.e(TAG, "DeviceRequest decode failed", it) }
            .getOrNull()
        if (parsed == null) {
            screenState = ScreenState.Error("DeviceRequest is not a SMART Health Check-in request.")
            return
        }
        directMdocRequest = parsed

        val smartJson = parsed.itemsRequest.smartRequestJson
        if (smartJson == null) {
            screenState = ScreenState.Error(
                "ItemsRequest.requestInfo[\"org.smarthealthit.checkin.request\"] is absent. " +
                    "Verifier may have used the dynamic-element fallback (shc1j.<b64u>), " +
                    "which is not yet implemented."
            )
            return
        }

        // Persist the raw request for adb-pulled debugging.
        saveDebugBundle(
            origin = origin,
            packageName = callingAppInfo.packageName,
            selectedEntryId = selectedEntryId,
            originResolution = originResolution,
            outerJson = runCatching { JSONObject(mdocOption.requestJson).toString(2) }.getOrElse { mdocOption.requestJson },
            deviceRequestB64u = parsed.deviceRequestBase64Url,
            encryptionInfoB64u = parsed.encryptionInfoBase64Url,
            smartJson = smartJson,
            deviceRequestBytes = parsed.deviceRequestBytes,
            encryptionInfoBytes = parsed.encryptionInfoBytes,
            sessionTranscriptBytes = parsed.sessionTranscriptBytes,
            itemsRequestTag24Bytes = parsed.itemsRequest.itemsRequestTag24Bytes,
            readerAuthBytes = parsed.itemsRequest.readerAuthBytes,
            readerAuth = parsed.readerAuth,
        )

        screenState = ScreenState.Loading("Loading request forms", "Fetching any questionnaires referenced by the verifier.")
        lifecycleScope.launch {
            val hydratedSmartJson = runCatching {
                SmartQuestionnaireFetcher.hydrateQuestionnaireUrls(smartJson)
            }.onFailure { Log.e(TAG, "questionnaireUrl fetch failed", it) }
                .getOrElse {
                    screenState = ScreenState.Error(it.message ?: it::class.java.simpleName)
                    return@launch
                }
            appendToDebugBundle("smart-request.hydrated.json", hydratedSmartJson.toString(2))
            prepareConsent(origin, hydratedSmartJson, parsed.readerAuth)
        }
    }

    private fun resolveOrigin(callingAppInfo: CallingAppInfo): OriginResolution {
        val allowlist = runCatching { buildCallerAllowlist(callingAppInfo) }.getOrElse { error ->
            val fallback = "android-app:${callingAppInfo.packageName}"
            return OriginResolution(
                origin = fallback,
                source = "android-app-fallback",
                isOriginPopulated = runCatching { callingAppInfo.isOriginPopulated() }.getOrDefault(false),
                allowlistFingerprintCount = 0,
                allowlistJson = null,
                error = "${error::class.java.simpleName}: ${error.message}",
            )
        }
        val webOrigin = runCatching { callingAppInfo.getOrigin(allowlist.json) }
            .onFailure { Log.w(TAG, "callingAppInfo.getOrigin failed", it) }
            .getOrNull()
        if (webOrigin != null) {
            return OriginResolution(
                origin = webOrigin,
                source = "web-origin",
                isOriginPopulated = callingAppInfo.isOriginPopulated(),
                allowlistFingerprintCount = allowlist.fingerprintCount,
                allowlistJson = allowlist.json,
                error = null,
            )
        }
        return OriginResolution(
            origin = "android-app:${callingAppInfo.packageName}",
            source = "android-app-fallback",
            isOriginPopulated = callingAppInfo.isOriginPopulated(),
            allowlistFingerprintCount = allowlist.fingerprintCount,
            allowlistJson = allowlist.json,
            error = "getOrigin returned null or rejected caller",
        )
    }

    private data class CallerAllowlist(val json: String, val fingerprintCount: Int)

    private fun buildCallerAllowlist(callingAppInfo: CallingAppInfo): CallerAllowlist {
        // AndroidX reveals the browser-supplied web origin only after the caller app
        // package/signature matches this allowlist. This dev build trusts the actual
        // caller reported by Credential Manager so we can verify origin plumbing
        // end-to-end across browsers. A production wallet should not reflect the
        // caller back into the allowlist; it should keep an up-to-date allowlist of
        // trusted browser package names and official APK signing cert fingerprints.
        val fingerprints = originVerificationFingerprints(callingAppInfo.signingInfoCompat)
        val signatures = JSONArray()
        fingerprints.forEach { fingerprint ->
            signatures.put(JSONObject().put("cert_fingerprint_sha256", fingerprint))
        }
        val allowlist = JSONObject()
            .put(
                "apps",
                JSONArray().put(
                    JSONObject()
                        .put("type", "android")
                        .put(
                            "info",
                            JSONObject()
                                .put("package_name", callingAppInfo.packageName)
                                .put("signatures", signatures),
                        ),
                ),
            )
        return CallerAllowlist(
            json = allowlist.toString(),
            fingerprintCount = fingerprints.size,
        )
    }

    private fun originVerificationFingerprints(signingInfo: SigningInfoCompat): List<String> {
        val signatures = if (signingInfo.hasMultipleSigners && signingInfo.apkContentsSigners.isNotEmpty()) {
            signingInfo.apkContentsSigners
        } else {
            signingInfo.signingCertificateHistory.take(1)
        }
        return signatures
            .map { signatureFingerprint(it.toByteArray()) }
            .distinct()
    }

    private fun signatureFingerprint(bytes: ByteArray): String {
        val digest = MessageDigest.getInstance("SHA-256").digest(bytes)
        return digest.joinToString(":") { "%02X".format(it) }
    }

    private fun prepareConsent(
        origin: String,
        smartJson: JSONObject,
        readerAuth: ReaderAuthVerification,
    ) {
        val request = runCatching {
            SmartRequestAdapter.build(
                verifierOrigin = origin,
                nonce = "", // TODO: pull from EncryptionInfo when wired
                smartRequest = smartJson,
                readerAuth = readerAuth,
            )
        }.onFailure { Log.e(TAG, "SMART request validation failed", it) }
            .getOrElse {
                screenState = ScreenState.Error(it.message ?: it::class.java.simpleName)
                return
            }
        verifiedRequest = request
        selectedItems.clear()
        questionnaireAnswers.clear()
        request.items.forEach { item ->
            selectedItems[item.id] = true
        }
        val prefills = runCatching { walletStore.prefillQuestionnaireAnswers(request.items) }
            .onFailure { Log.e(TAG, "questionnaire prefill failed", it) }
            .getOrElse {
                screenState = ScreenState.Error(it.message ?: it::class.java.simpleName)
                return
            }
        questionnaireAnswers.putAll(prefills)
        screenState = ScreenState.Consent(request)
    }

    private fun setQuestionnaireAnswer(key: String, value: Any?) {
        if (value == null) {
            questionnaireAnswers.remove(key)
        } else if (value is String && value.isBlank()) {
            questionnaireAnswers.remove(key)
        } else if (value is Collection<*> && value.isEmpty()) {
            questionnaireAnswers.remove(key)
        } else {
            questionnaireAnswers[key] = value
        }
    }

    private fun submit(declined: Boolean) {
        val req = verifiedRequest ?: return
        val mdocRequest = directMdocRequest ?: run {
            screenState = ScreenState.Error("No decoded mdoc request is available.")
            return
        }
        val selectedSummary = JSONObject()
        selectedItems.forEach { (k, v) -> selectedSummary.put(k, v) }
        val summary = JSONObject()
            .put("declined", declined)
            .put("selectedItems", selectedSummary)
            .put("answerCount", questionnaireAnswers.size)
            .put("origin", req.verifierOrigin)
            .put("itemCount", req.items.size)
        appendToDebugBundle("submit.json", summary.toString(2))

        if (declined) {
            val resultData = Intent()
            PendingIntentHandler.setGetCredentialException(
                resultData,
                GetCredentialUnknownException("User declined to share."),
            )
            setResult(Activity.RESULT_OK, resultData)
            finish()
            return
        }

        screenState = ScreenState.Submitting("Building response", "Packaging selected data as an encrypted mdoc response.")
        val smartResponse = runCatching {
            SmartCheckinResponseFactory.build(
                request = req,
                selectedItems = selectedItems.toMap(),
                questionnaireAnswers = questionnaireAnswers.toMap(),
                walletStore = walletStore,
            )
        }.onFailure { Log.e(TAG, "SMART response build failed", it) }
            .getOrElse {
                screenState = ScreenState.Error(it.message ?: it::class.java.simpleName)
                return
            }
        appendToDebugBundle("smart-response.json", smartResponse.toString(2))

        val walletResponse = runCatching {
            SmartHealthMdocResponder.buildCredentialResponse(
                request = mdocRequest,
                smartResponse = smartResponse,
            )
        }.onFailure { Log.e(TAG, "DeviceResponse build failed", it) }
            .getOrElse {
                screenState = ScreenState.Error(it.message ?: it::class.java.simpleName)
                return
            }
        appendToDebugBundle("wallet-response.digital-credential.json", JSONObject(walletResponse.credentialJson).toString(2))
        appendToDebugBundle("credential.json", JSONObject(walletResponse.credentialJson).toString(2))
        appendToDebugBundle("smart-response.expected.json", smartResponse.toString(2))
        appendBinaryArtifact("device-response.cbor", walletResponse.deviceResponseBytes)
        appendBinaryArtifact("dcapi-response.cbor", walletResponse.dcapiResponseBytes)
        appendBinaryArtifact("hpke-enc.bin", walletResponse.hpkeEnc)
        appendBinaryArtifact("hpke-ciphertext.bin", walletResponse.hpkeCipherText)
        appendBinaryArtifact("issuer-signed-item-tag24.cbor", walletResponse.issuerSignedItemTag24Bytes)
        appendBinaryArtifact("value-digest.bin", walletResponse.valueDigest)
        appendBinaryArtifact("mso.cbor", walletResponse.msoBytes)
        appendBinaryArtifact("issuer-auth.cbor", walletResponse.issuerAuthBytes)
        appendBinaryArtifact("device-authentication.cbor", walletResponse.deviceAuthenticationBytes)

        val resultData = Intent()
        val response = GetCredentialResponse(DigitalCredential(walletResponse.credentialJson))
        PendingIntentHandler.setGetCredentialResponse(resultData, response)
        setResult(Activity.RESULT_OK, resultData)
        finish()
    }

    private fun finishWithCancel() {
        val resultData = Intent()
        PendingIntentHandler.setGetCredentialException(
            resultData,
            GetCredentialUnknownException("Wallet UI closed without a selection."),
        )
        setResult(Activity.RESULT_OK, resultData)
        finish()
    }

    private fun debugRunDir(): File {
        val parent = File(filesDir, "handler-runs/$runId")
        parent.mkdirs()
        return parent
    }

    private fun saveDebugBundle(
        origin: String,
        packageName: String,
        selectedEntryId: String?,
        originResolution: OriginResolution,
        outerJson: String,
        deviceRequestB64u: String,
        encryptionInfoB64u: String,
        smartJson: JSONObject,
        deviceRequestBytes: ByteArray,
        encryptionInfoBytes: ByteArray,
        sessionTranscriptBytes: ByteArray,
        itemsRequestTag24Bytes: ByteArray,
        readerAuthBytes: ByteArray?,
        readerAuth: ReaderAuthVerification,
    ) {
        val dir = debugRunDir()
        val manifest = JSONObject()
            .put("runId", runId)
            .put("at", Instant.now().toString())
            .put("origin", origin)
            .put("packageName", packageName)
            .put("selectedEntryId", selectedEntryId ?: JSONObject.NULL)
            .put("originSource", originResolution.source)
            .put("originIsPopulated", originResolution.isOriginPopulated)
            .put("originAllowlistFingerprintCount", originResolution.allowlistFingerprintCount)
            .put("originError", originResolution.error ?: JSONObject.NULL)
            .put("protocol", Registration.PROTOCOL)
            .put("deviceRequestB64uSize", deviceRequestB64u.length)
            .put("deviceRequestByteSize", deviceRequestBytes.size)
            .put("encryptionInfoB64uSize", encryptionInfoB64u.length)
            .put("encryptionInfoByteSize", encryptionInfoBytes.size)
            .put("sessionTranscriptByteSize", sessionTranscriptBytes.size)
            .put("readerAuthPresent", readerAuth.present)
            .put("readerAuthSignatureValid", if (readerAuth.present) readerAuth.signatureValid else JSONObject.NULL)
            .put("readerAuthCertificateSubject", readerAuth.certificateSubject ?: JSONObject.NULL)
        if (originResolution.allowlistJson != null) {
            manifest.put("originAllowlist", JSONObject(originResolution.allowlistJson))
        }
        File(dir, "manifest.json").writeText(manifest.toString(2))
        File(dir, "metadata.json").writeText(manifest.toString(2))
        File(dir, "credential-manager-request.json").writeText(outerJson)
        File(dir, "navigator-credentials-get.arg.json").writeText(outerJson)
        File(dir, "request.json").writeText(outerJson)
        File(dir, "device-request.b64u").writeText("$deviceRequestB64u\n")
        File(dir, "encryption-info.b64u").writeText("$encryptionInfoB64u\n")
        writeBinaryArtifact(dir, "device-request.cbor", deviceRequestBytes)
        writeBinaryArtifact(dir, "encryption-info.cbor", encryptionInfoBytes)
        writeBinaryArtifact(dir, "session-transcript.cbor", sessionTranscriptBytes)
        writeBinaryArtifact(dir, "items-request-tag24.cbor", itemsRequestTag24Bytes)
        if (readerAuthBytes != null) {
            writeBinaryArtifact(dir, "reader-auth.cbor", readerAuthBytes)
            writeBinaryArtifact(
                dir,
                "reader-auth-detached-payload.cbor",
                SmartMdocCrypto.readerAuthenticationBytes(
                    sessionTranscriptBytes = sessionTranscriptBytes,
                    itemsRequestTag24Bytes = itemsRequestTag24Bytes,
                ),
            )
        }
        File(dir, "smart-request.json").writeText(smartJson.toString(2))
        File(dir, "smart-request.expected.json").writeText(smartJson.toString(2))
        Log.i(TAG, "wrote debug bundle to ${dir.absolutePath}")
    }

    private fun appendToDebugBundle(name: String, contents: String) {
        runCatching {
            File(debugRunDir(), name).writeText(contents)
        }.onFailure { Log.w(TAG, "failed to append $name", it) }
    }

    private fun appendBinaryArtifact(name: String, contents: ByteArray) {
        runCatching {
            writeBinaryArtifact(debugRunDir(), name, contents)
        }.onFailure { Log.w(TAG, "failed to append $name", it) }
    }

    private fun writeBinaryArtifact(dir: File, name: String, contents: ByteArray) {
        File(dir, name).writeBytes(contents)
        File(dir, "$name.hex").writeText("${hex(contents)}\n")
        File(dir, "$name.b64u").writeText("${SmartMdocBase64.encodeUrl(contents)}\n")
    }

    private fun hex(bytes: ByteArray): String {
        val chars = CharArray(bytes.size * 2)
        val alphabet = "0123456789abcdef"
        bytes.forEachIndexed { i, b ->
            val v = b.toInt() and 0xff
            chars[i * 2] = alphabet[v ushr 4]
            chars[i * 2 + 1] = alphabet[v and 0x0f]
        }
        return String(chars)
    }
}

package org.smarthealthit.checkin.wallet

import android.content.Context
import android.util.Log
import androidx.credentials.DigitalCredential
import androidx.credentials.ExperimentalDigitalCredentialApi
import androidx.credentials.registry.provider.ClearCredentialRegistryRequest
import androidx.credentials.registry.provider.RegisterCredentialsRequest
import androidx.credentials.registry.provider.RegistryManager
import androidx.credentials.registry.provider.digitalcredentials.DigitalCredentialRegistry
import org.smarthealthit.checkin.wallet.credentialmanager.BuildConfig
import org.json.JSONArray
import org.json.JSONObject

/**
 * Registers our SMART Health Check-in credential with Android Credential
 * Manager so it shows up in the system picker.
 *
 * The registration carries:
 *   - credentialsBlob: a small JSON describing what the wallet offers
 *     (consumed at match time by the WASM matcher);
 *   - matcherBytes: the WASM matcher from `wallet-android/app/matcher-rs/`.
 */
object Registration {
    private const val TAG = "SHCRegistration"
    const val PROTOCOL = "org-iso-mdoc"
    const val REGISTRATION_ID = "smart-health-checkin-org-iso-mdoc"

    @OptIn(ExperimentalDigitalCredentialApi::class)
    suspend fun register(context: Context): RegistrationResult {
        return try {
            val matcherBytes = context.assets.open("matcher.wasm").use { it.readBytes() }
            val credentialsBlob = buildCredentialsBlob(context).toByteArray(Charsets.UTF_8)

            val registry = RegistryManager.create(context)
            val attempts = registrationAttempts()

            clearExistingRegistrations(registry)

            attempts.forEach { attempt ->
                Log.i(
                    TAG,
                    "registering ${attempt.label} type=${attempt.type} id=${attempt.id} " +
                        "matcher=${matcherBytes.size}B blob=${credentialsBlob.size}B",
                )
                registry.registerCredentials(attempt.request(credentialsBlob, matcherBytes))
                Log.i(TAG, "registered ${attempt.label} type=${attempt.type} id=${attempt.id}")
            }

            val registeredTypes = attempts.joinToString(", ") { it.label }
            Log.i(
                TAG,
                "registered SMART Health Check-in mode=${BuildConfig.REGISTRATION_MODE} " +
                    "types=[$registeredTypes] (${matcherBytes.size}B matcher, ${credentialsBlob.size}B blob)",
            )
            RegistrationResult.Success(matcherBytes.size, credentialsBlob.size, BuildConfig.REGISTRATION_MODE, registeredTypes)
        } catch (t: Throwable) {
            Log.e(TAG, "registerCredentials failed", t)
            RegistrationResult.Failure(t.message ?: t::class.java.simpleName)
        }
    }

    @OptIn(ExperimentalDigitalCredentialApi::class)
    private suspend fun clearExistingRegistrations(registry: RegistryManager) {
        registry.clearCredentialRegistry(ClearCredentialRegistryRequest(isDeleteAll = true))
        Log.i(TAG, "cleared existing credential registry records for this app")
    }

    @OptIn(ExperimentalDigitalCredentialApi::class)
    private fun registrationAttempts(): List<RegistrationAttempt> {
        val legacy = RegistrationAttempt.Legacy
        val modern = RegistrationAttempt.Modern
        return when (BuildConfig.REGISTRATION_MODE) {
            "legacy-only" -> listOf(legacy)
            "modern-only" -> listOf(modern)
            else -> listOf(legacy, modern)
        }
    }

    /**
     * Wallet-defined credential blob. The matcher reads these bytes via
     * `credman.ReadCredentialsBuffer`. We use plain JSON so the matcher can
     * parse with serde / minicbor / cJSON depending on language.
     *
     * For now this carries one entry describing the SMART Health Check-in
     * credential. Format is internal — the matcher and this code are the
     * only things that interpret it.
     */
    private fun buildCredentialsBlob(context: Context): String {
        val entry = JSONObject()
            .put("id", "checkin-default")
            .put("title", "SMART Health Check-in")
            .put("subtitle", "Share FHIR data on demand")
            .put("docType", "org.smarthealthit.checkin.1")
            .put("namespace", "org.smarthealthit.checkin")
            .put("element", "smart_health_checkin_response")
            .put("packageName", context.packageName)
        return JSONObject()
            .put("credentials", JSONArray().put(entry))
            .toString()
    }
}

sealed interface RegistrationResult {
    data class Success(
        val matcherBytes: Int,
        val credentialsBytes: Int,
        val mode: String,
        val registeredTypes: String,
    ) : RegistrationResult
    data class Failure(val message: String) : RegistrationResult
}

@OptIn(ExperimentalDigitalCredentialApi::class)
private sealed class RegistrationAttempt(
    val label: String,
    val type: String,
    val id: String,
) {
    abstract fun request(credentialsBlob: ByteArray, matcherBytes: ByteArray): RegisterCredentialsRequest

    data object Modern : RegistrationAttempt(
        label = "modern",
        type = DigitalCredential.TYPE_DIGITAL_CREDENTIAL,
        id = Registration.REGISTRATION_ID,
    ) {
        override fun request(credentialsBlob: ByteArray, matcherBytes: ByteArray): RegisterCredentialsRequest {
            return object : DigitalCredentialRegistry(
                id = id,
                credentials = credentialsBlob,
                matcher = matcherBytes,
            ) {}
        }
    }

    data object Legacy : RegistrationAttempt(
        label = "legacy",
        type = "com.credman.IdentityCredential",
        id = "smart-health-checkin-org-iso-mdoc-legacy",
    ) {
        override fun request(credentialsBlob: ByteArray, matcherBytes: ByteArray): RegisterCredentialsRequest {
            return object : RegisterCredentialsRequest(
                type,
                id,
                credentialsBlob,
                matcherBytes,
            ) {}
        }
    }
}

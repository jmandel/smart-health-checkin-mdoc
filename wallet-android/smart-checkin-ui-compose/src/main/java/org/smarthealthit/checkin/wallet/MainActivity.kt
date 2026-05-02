package org.smarthealthit.checkin.wallet

import android.graphics.Color as AndroidColor
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.SystemBarStyle
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ColumnScope
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.safeDrawing
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.Checkbox
import androidx.compose.material3.CheckboxDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.RadioButton
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Surface
import androidx.compose.material3.SegmentedButton
import androidx.compose.material3.SegmentedButtonDefaults
import androidx.compose.material3.SingleChoiceSegmentedButtonRow
import androidx.compose.material3.Slider
import androidx.compose.material3.SliderDefaults
import androidx.compose.material3.Switch
import androidx.compose.material3.SwitchDefaults
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateMapOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.runtime.snapshots.SnapshotStateMap
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.lifecycle.lifecycleScope
import kotlinx.coroutines.launch
import org.json.JSONArray
import org.json.JSONObject
import java.io.BufferedReader
import java.io.InputStream
import java.io.InputStreamReader
import java.nio.charset.StandardCharsets
import java.time.Instant

class MainActivity : ComponentActivity() {
    // State held here will be wired into the DC API HandlerActivity in Stage C.
    // For Stage B, MainActivity is just the home screen — registration status,
    // bundled demo-data summary, and a build stamp. The remaining state +
    // helper methods below are intentionally preserved so the HandlerActivity
    // can be added with minimal churn.
    @Suppress("unused")
    private var screenState by mutableStateOf<ScreenState>(ScreenState.Empty)
    @Suppress("unused")
    private var verifiedRequest: VerifiedRequest? = null
    private val selectedItems = mutableStateMapOf<String, Boolean>()
    private val questionnaireAnswers = mutableStateMapOf<String, Any>()

    private var registration: RegistrationState by mutableStateOf(RegistrationState.Idle)

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge(
            statusBarStyle = SystemBarStyle.light(AndroidColor.TRANSPARENT, AndroidColor.TRANSPARENT),
            navigationBarStyle = SystemBarStyle.light(AndroidColor.TRANSPARENT, AndroidColor.TRANSPARENT),
        )

        setContent {
            SampleHealthTheme {
                HomeScreen(
                    registration = registration,
                    onRegister = ::registerWithCredentialManager,
                    onClose = { finish() },
                )
            }
        }
    }

    private fun registerWithCredentialManager() {
        if (registration is RegistrationState.Pending) return
        registration = RegistrationState.Pending
        lifecycleScope.launch {
            registration = when (val r = Registration.register(this@MainActivity)) {
                is RegistrationResult.Success -> RegistrationState.Registered(
                    matcherBytes = r.matcherBytes,
                    credentialsBytes = r.credentialsBytes,
                    mode = r.mode,
                    registeredTypes = r.registeredTypes,
                )
                is RegistrationResult.Failure -> RegistrationState.Failed(r.message)
            }
        }
    }

    @Suppress("unused") // wired in Stage C via HandlerActivity
    private fun prepareConsent(request: VerifiedRequest) {
        verifiedRequest = request
        selectedItems.clear()
        questionnaireAnswers.clear()

        request.items.forEach { item ->
            selectedItems[item.id] = true
            val questionnaire = item.meta.optJSONObject("questionnaire")
            if (item.kind == RequestKind.Questionnaire && questionnaire != null) {
                seedQuestionnaireAnswers(
                    credentialId = item.id,
                    items = questionnaire.optJSONArray("item"),
                    prefill = demoPrefillFor(questionnaire),
                )
            }
        }

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

    // submit / complete / resolveRequest / verifyRequestObject / extractRequestItems
    // were removed in Stage B. The DC API path replaces them: HandlerActivity
    // (Stage C) reads a ProviderGetCredentialRequest, decodes the org-iso-mdoc
    // DeviceRequest, pulls the SMART request JSON out of
    // ItemsRequest.requestInfo["org.smarthealthit.checkin.request"], builds a SMART-request-shape
    // VerifiedRequest, and calls prepareConsent below. DeviceResponse build +
    // HPKE seal arrive after that.

    @Suppress("unused") // wired in Stage C
    private fun seedQuestionnaireAnswers(credentialId: String, items: JSONArray?, prefill: JSONObject) {
        jsonObjects(items).forEach { item ->
            when (item.optString("type")) {
                "group" -> seedQuestionnaireAnswers(credentialId, item.optJSONArray("item"), prefill)
                "display" -> Unit
                else -> {
                    val linkId = item.optString("linkId")
                    val initial = normalizeInitialValue(item, initialValueForItem(item, prefill))
                    if (linkId.isNotBlank() && initial != null) {
                        questionnaireAnswers[answerKey(credentialId, linkId)] = initial
                    }
                }
            }
        }
    }

    private fun demoPrefillFor(questionnaire: JSONObject): JSONObject {
        val url = questionnaire.optString("url", "")
        if (!url.endsWith("/chronic-migraine-followup")) return JSONObject()
        return try {
            readAssetJson("demo-data/migraine-autofill-values.json")
        } catch (_: Exception) {
            JSONObject()
        }
    }

    private fun initialValueForItem(item: JSONObject, prefill: JSONObject): Any? {
        val linkId = item.optString("linkId")
        if (prefill.has(linkId)) return prefill.opt(linkId)

        val options = item.optJSONArray("answerOption")
        if (options != null) {
            val selected = jsonObjects(options)
                .filter { it.optBoolean("initialSelected") }
                .map { answerOptionKey(it) }
            if (selected.isNotEmpty()) return if (item.optBoolean("repeats")) selected else selected.first()
        }

        val initial = item.optJSONArray("initial")
        if (initial != null && initial.length() > 0) {
            return questionnaireValueFromObject(initial.optJSONObject(0))
        }

        return null
    }

    private fun normalizeInitialValue(item: JSONObject, value: Any?): Any? {
        if (value == null || value == JSONObject.NULL) return null
        if (!item.optBoolean("repeats")) return value

        return when (value) {
            is JSONArray -> (0 until value.length()).mapNotNull { value.opt(it)?.takeUnless { item -> item == JSONObject.NULL }?.toString() }
            is Collection<*> -> value.mapNotNull { it?.toString() }
            else -> value.toString().split(",").map { it.trim() }.filter { it.isNotEmpty() }
        }
    }

    // buildErrorPayload / buildSuccessPayload / presentationFor were removed in
    // Stage B — they assembled OID4VP vp_token JSON. The Stage C
    // DeviceResponse builder takes their place: it places the SMART response
    // JSON (artifacts + per-item statuses) as the elementValue of the lone
    // IssuerSignedItem in an mdoc Document.

    @Suppress("unused") // wired in Stage C
    private fun dataForItem(item: RequestItem, answerSnapshot: Map<String, Any>): JSONObject? {
        return when (item.kind) {
            RequestKind.Coverage -> readAssetJson("demo-data/carin-coverage.json")
            RequestKind.Plan -> readAssetJson("demo-data/sbc-insurance-plan.json")
            RequestKind.Clinical -> readAssetJson("demo-data/clinical-history-bundle.json")
            RequestKind.Questionnaire -> buildQuestionnaireResponse(item, answerSnapshot)
            RequestKind.Unknown -> null
        }
    }

    private fun buildQuestionnaireResponse(requestItem: RequestItem, answerSnapshot: Map<String, Any>): JSONObject {
        val questionnaire = requestItem.meta.optJSONObject("questionnaire")
        val values = collectQuestionnaireValues(requestItem.id, answerSnapshot)
        val response = JSONObject()
            .put("resourceType", "QuestionnaireResponse")
            .put("status", "completed")
            .put("authored", Instant.now().toString())

        if (questionnaire != null) {
            var questionnaireRef = questionnaire.optString("url", "")
            if (questionnaireRef.isBlank() && questionnaire.optString("id").isNotBlank()) {
                questionnaireRef = "Questionnaire/${questionnaire.optString("id")}"
            }
            if (questionnaireRef.isNotBlank()) response.put("questionnaire", questionnaireRef)
            response.put("item", buildQuestionnaireItems(questionnaire.optJSONArray("item"), values))
        }

        return response
    }

    private fun collectQuestionnaireValues(credentialId: String, answerSnapshot: Map<String, Any>): JSONObject {
        val values = JSONObject()
        val prefix = "$credentialId::"
        answerSnapshot.forEach { (key, value) ->
            if (key.startsWith(prefix)) {
                values.put(key.removePrefix(prefix), jsonValue(value))
            }
        }
        return values
    }

    private fun jsonValue(value: Any): Any {
        return when (value) {
            is Collection<*> -> JSONArray(value)
            else -> value
        }
    }

    private fun buildQuestionnaireItems(sourceItems: JSONArray?, values: JSONObject): JSONArray {
        val out = JSONArray()

        jsonObjects(sourceItems).forEach { source ->
            if (!isEnabled(source, values)) return@forEach

            val type = source.optString("type")
            val target = JSONObject().put("linkId", source.optString("linkId"))
            if (source.optString("text").isNotBlank()) target.put("text", source.optString("text"))

            when (type) {
                "group" -> {
                    val children = buildQuestionnaireItems(source.optJSONArray("item"), values)
                    if (children.length() > 0) {
                        target.put("item", children)
                        out.put(target)
                    }
                }
                "display" -> out.put(target)
                else -> {
                    val answers = answersFor(source, values.opt(source.optString("linkId")))
                    if (answers.length() > 0) {
                        target.put("answer", answers)
                        out.put(target)
                    }
                }
            }
        }

        return out
    }

    private fun isEnabled(item: JSONObject, values: JSONObject): Boolean {
        val enableWhen = item.optJSONArray("enableWhen")
        if (enableWhen == null || enableWhen.length() == 0) return true

        val any = item.optString("enableBehavior") == "any"
        var aggregate = !any

        jsonObjects(enableWhen).forEach { condition ->
            val result = compare(values.opt(condition.optString("question")), condition)
            aggregate = if (any) aggregate || result else aggregate && result
        }

        return aggregate
    }

    private fun compare(actual: Any?, condition: JSONObject): Boolean {
        val operator = condition.optString("operator")
        val expected = when {
            condition.has("answerInteger") -> condition.opt("answerInteger")
            condition.has("answerBoolean") -> condition.opt("answerBoolean")
            condition.has("answerString") -> condition.opt("answerString")
            condition.has("answerCoding") -> condition.optJSONObject("answerCoding")?.optString("code")
            else -> null
        }

        if (operator == "exists") return (actual != null && actual != JSONObject.NULL) == (expected == true)
        if (actual == null || actual == JSONObject.NULL || expected == null || expected == JSONObject.NULL) return false
        if (operator == "=") return valuesContain(actual, expected)
        if (operator == "!=") return !valuesContain(actual, expected)

        return runCatching {
            val left = actual.toString().toDouble()
            val right = expected.toString().toDouble()
            when (operator) {
                ">" -> left > right
                "<" -> left < right
                ">=" -> left >= right
                "<=" -> left <= right
                else -> false
            }
        }.getOrDefault(false)
    }

    private fun answersFor(item: JSONObject, value: Any?): JSONArray {
        val answers = JSONArray()
        if (value == null || value == JSONObject.NULL || value.toString().isBlank()) return answers

        if (value is JSONArray) {
            for (index in 0 until value.length()) {
                val answer = answerForScalar(item, value.opt(index))
                if (answer.length() > 0) answers.put(answer)
            }
            return answers
        }

        answers.put(answerForScalar(item, value))
        return answers
    }

    private fun answerForScalar(item: JSONObject, value: Any?): JSONObject {
        val answer = JSONObject()
        if (value == null || value == JSONObject.NULL) return answer

        when (item.optString("type")) {
            "integer" -> answer.put("valueInteger", value.toString().toInt())
            "decimal" -> answer.put("valueDecimal", value.toString().toDouble())
            "boolean" -> answer.put("valueBoolean", value.toString().toBoolean())
            "date" -> answer.put("valueDate", value.toString())
            "choice", "open-choice" -> {
                val option = findAnswerOption(item.optJSONArray("answerOption"), value.toString())
                val coding = option?.optJSONObject("valueCoding")
                if (coding != null) answer.put("valueCoding", coding) else answer.put("valueString", value.toString())
            }
            else -> answer.put("valueString", value.toString())
        }

        return answer
    }

    private fun findAnswerOption(options: JSONArray?, key: String): JSONObject? {
        return jsonObjects(options).firstOrNull { option ->
            val coding = option.optJSONObject("valueCoding")
            val optionKey = coding?.optString("code", coding.optString("display")) ?: option.optString("valueString")
            key == optionKey
        }
    }

    private fun valuesContain(actual: Any, expected: Any): Boolean {
        if (actual is JSONArray) {
            for (index in 0 until actual.length()) {
                if (actual.opt(index).toString() == expected.toString()) return true
            }
            return false
        }
        return actual.toString() == expected.toString()
    }

    private fun answerOptionKey(option: JSONObject): String {
        val coding = option.optJSONObject("valueCoding")
        if (coding != null) return coding.optString("code", coding.optString("display", coding.toString()))
        if (option.has("valueString")) return option.optString("valueString")
        if (option.has("valueInteger")) return option.optInt("valueInteger").toString()
        if (option.has("valueDate")) return option.optString("valueDate")
        if (option.has("valueTime")) return option.optString("valueTime")
        return option.toString()
    }

    private fun answerOptionLabel(option: JSONObject): String {
        val coding = option.optJSONObject("valueCoding")
        if (coding != null) return coding.optString("display", coding.optString("code", coding.toString()))
        if (option.has("valueString")) return option.optString("valueString")
        if (option.has("valueInteger")) return option.optInt("valueInteger").toString()
        if (option.has("valueDate")) return option.optString("valueDate")
        if (option.has("valueTime")) return option.optString("valueTime")
        return option.toString()
    }

    private fun questionnaireValueFromObject(value: JSONObject?): Any? {
        if (value == null) return null
        if (value.has("valueBoolean")) return value.optBoolean("valueBoolean")
        if (value.has("valueInteger")) return value.optInt("valueInteger")
        if (value.has("valueDecimal")) return value.optDouble("valueDecimal")
        if (value.has("valueDate")) return value.optString("valueDate")
        if (value.has("valueDateTime")) return value.optString("valueDateTime")
        if (value.has("valueTime")) return value.optString("valueTime")
        if (value.has("valueString")) return value.optString("valueString")
        val coding = value.optJSONObject("valueCoding")
        if (coding != null) return coding.optString("code", coding.optString("display", coding.toString()))
        return null
    }

    // encryptResponse / postResponse / getJson / fetchText (×2) and the
    // requireString / isBareOrigin / isLocalDemoHost / audienceIsValid URL
    // helpers were removed in Stage B. The Stage C path replaces them with:
    //   - HPKE seal (DHKEM-P256 + HKDF-SHA256 + AES-128-GCM, AAD =
    //     SessionTranscript) producing the response bytes.
    //   - Credential Manager `setGetCredentialResponse` for delivery (no
    //     network call).
    //   - browser-supplied callingAppInfo.origin for verifier identity (no
    //     well-known fetch, no JWS signature check).

    private fun readAssetJson(path: String): JSONObject {
        return assets.open(path).use { JSONObject(readStream(it)) }
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

internal sealed interface RegistrationState {
    data object Idle : RegistrationState
    data object Pending : RegistrationState
    data class Registered(
        val matcherBytes: Int,
        val credentialsBytes: Int,
        val mode: String,
        val registeredTypes: String,
    ) : RegistrationState
    data class Failed(val message: String) : RegistrationState
}

// HomeScreen is the MainActivity home: registration status, demo-data
// summary, and a build stamp. The DC API HandlerActivity reuses DemoApp +
// the Consent screens below.
@Composable
private fun HomeScreen(
    registration: RegistrationState,
    onRegister: () -> Unit,
    onClose: () -> Unit,
) {
    Scaffold(
        containerColor = AppColors.Page,
        contentWindowInsets = WindowInsets.safeDrawing,
    ) { padding ->
        CenterPanel(padding) {
            BrandMark()
            Spacer(Modifier.height(24.dp))
            Text(
                text = "SMART Health Check-in Wallet",
                style = MaterialTheme.typography.headlineSmall,
                fontWeight = FontWeight.SemiBold,
                color = AppColors.Ink,
            )
            Spacer(Modifier.height(8.dp))
            Text(
                text = "Register with Credential Manager to receive SMART Health Check-in requests over the Digital Credentials API (org-iso-mdoc).",
                style = MaterialTheme.typography.bodyLarge,
                color = AppColors.Muted,
            )

            Spacer(Modifier.height(24.dp))
            ElevatedPanel {
                Text(
                    text = "Credential Manager",
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.SemiBold,
                    color = AppColors.Ink,
                )
                Spacer(Modifier.height(8.dp))
                val statusLine = when (registration) {
                    RegistrationState.Idle -> "Not yet registered."
                    RegistrationState.Pending -> "Registering…"
                    is RegistrationState.Registered ->
                        "Registered ${registration.registeredTypes} (${registration.mode}; matcher: ${registration.matcherBytes} B, blob: ${registration.credentialsBytes} B)."
                    is RegistrationState.Failed -> "Failed: ${registration.message}"
                }
                Text(
                    text = statusLine,
                    style = MaterialTheme.typography.bodyMedium,
                    color = AppColors.Muted,
                )
                Spacer(Modifier.height(12.dp))
                Button(
                    onClick = onRegister,
                    enabled = registration !is RegistrationState.Pending,
                    modifier = Modifier.fillMaxWidth(),
                ) {
                    Text(
                        when (registration) {
                            is RegistrationState.Registered -> "Re-register"
                            else -> "Register with Credential Manager"
                        },
                    )
                }
            }

            Spacer(Modifier.height(24.dp))
            ElevatedPanel {
                Text(
                    text = "Bundled demo data",
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.SemiBold,
                    color = AppColors.Ink,
                )
                Spacer(Modifier.height(8.dp))
                listOf(
                    "carin-coverage.json — CARIN-IG Coverage",
                    "clinical-history-bundle.json — US Core clinical history bundle",
                    "migraine-questionnaire.json — Chronic Migraine 3-month follow-up",
                    "migraine-autofill-values.json — prefill answers",
                    "sbc-insurance-plan.json — Summary of Benefits and Coverage",
                ).forEach { line ->
                    Text(
                        text = line,
                        style = MaterialTheme.typography.bodyMedium,
                        color = AppColors.Muted,
                    )
                }
            }

            Spacer(Modifier.height(24.dp))
            OutlinedButton(onClick = onClose, modifier = Modifier.fillMaxWidth()) {
                Text("Close")
            }
        }
    }
}

@Composable
fun DemoApp(
    state: ScreenState,
    selectedItems: SnapshotStateMap<String, Boolean>,
    questionnaireAnswers: SnapshotStateMap<String, Any>,
    onItemSelected: (String, Boolean) -> Unit,
    onAnswerChanged: (String, Any?) -> Unit,
    onShare: () -> Unit,
    onDecline: () -> Unit,
    onClose: () -> Unit,
) {
    Scaffold(
        containerColor = AppColors.Page,
        contentWindowInsets = WindowInsets.safeDrawing,
        bottomBar = {
            if (state is ScreenState.Consent) {
                ConsentActions(onShare = onShare, onDecline = onDecline)
            }
        },
    ) { padding ->
        when (state) {
            is ScreenState.Empty -> EmptyScreen(padding, onClose)
            is ScreenState.Loading -> LoadingScreen(state, padding)
            is ScreenState.Submitting -> SubmittingScreen(state, padding)
            is ScreenState.Error -> ErrorScreen(state, padding, onClose)
            is ScreenState.Complete -> CompleteScreen(padding)
            is ScreenState.Consent -> ConsentScreen(
                request = state.request,
                selectedItems = selectedItems,
                questionnaireAnswers = questionnaireAnswers,
                onItemSelected = onItemSelected,
                onAnswerChanged = onAnswerChanged,
                padding = padding,
            )
        }
    }
}

@Composable
private fun EmptyScreen(padding: PaddingValues, onClose: () -> Unit) {
    CenterPanel(padding) {
        BrandMark()
        Spacer(Modifier.height(24.dp))
        Text(
            text = "Open from a check-in link",
            style = MaterialTheme.typography.headlineSmall,
            fontWeight = FontWeight.SemiBold,
            color = AppColors.Ink,
        )
        Spacer(Modifier.height(8.dp))
        Text(
            text = "This sample app appears in the SMART Health Check-in picker and opens verified requests from the demo verifier.",
            style = MaterialTheme.typography.bodyLarge,
            color = AppColors.Muted,
        )
        Spacer(Modifier.height(24.dp))
        Button(onClick = onClose, modifier = Modifier.fillMaxWidth()) {
            Text("Close")
        }
    }
}

@Composable
private fun LoadingScreen(state: ScreenState.Loading, padding: PaddingValues) {
    CenterPanel(padding) {
        CircularProgressIndicator(color = AppColors.Primary)
        Spacer(Modifier.height(24.dp))
        Text(
            text = state.title,
            style = MaterialTheme.typography.headlineSmall,
            fontWeight = FontWeight.SemiBold,
            color = AppColors.Ink,
        )
        Spacer(Modifier.height(8.dp))
        Text(
            text = state.message,
            style = MaterialTheme.typography.bodyLarge,
            color = AppColors.Muted,
        )
    }
}

@Composable
private fun SubmittingScreen(state: ScreenState.Submitting, padding: PaddingValues) {
    CenterPanel(padding) {
        CircularProgressIndicator(color = AppColors.Primary)
        Spacer(Modifier.height(24.dp))
        Text(
            text = state.title,
            style = MaterialTheme.typography.headlineSmall,
            fontWeight = FontWeight.SemiBold,
            color = AppColors.Ink,
        )
        Spacer(Modifier.height(8.dp))
        Text(
            text = state.message,
            style = MaterialTheme.typography.bodyLarge,
            color = AppColors.Muted,
        )
    }
}

@Composable
private fun ErrorScreen(state: ScreenState.Error, padding: PaddingValues, onClose: () -> Unit) {
    CenterPanel(padding) {
        StatusDot(AppColors.Error, AppColors.ErrorSoft)
        Spacer(Modifier.height(24.dp))
        Text(
            text = "Could not complete request",
            style = MaterialTheme.typography.headlineSmall,
            fontWeight = FontWeight.SemiBold,
            color = AppColors.Ink,
        )
        Spacer(Modifier.height(8.dp))
        Text(
            text = state.message,
            style = MaterialTheme.typography.bodyLarge,
            color = AppColors.Muted,
        )
        Spacer(Modifier.height(24.dp))
        Button(onClick = onClose, modifier = Modifier.fillMaxWidth()) {
            Text("Close")
        }
    }
}

@Composable
private fun CompleteScreen(padding: PaddingValues) {
    CenterPanel(padding) {
        StatusDot(AppColors.Success, AppColors.SuccessSoft)
        Spacer(Modifier.height(24.dp))
        Text(
            text = "Submission complete",
            style = MaterialTheme.typography.headlineSmall,
            fontWeight = FontWeight.SemiBold,
            color = AppColors.Ink,
        )
        Spacer(Modifier.height(8.dp))
        Text(
            text = "Your selected sample health data was encrypted and shared with the verifier.",
            style = MaterialTheme.typography.bodyLarge,
            color = AppColors.Muted,
        )
    }
}

@Composable
private fun ConsentScreen(
    request: VerifiedRequest,
    selectedItems: SnapshotStateMap<String, Boolean>,
    questionnaireAnswers: SnapshotStateMap<String, Any>,
    onItemSelected: (String, Boolean) -> Unit,
    onAnswerChanged: (String, Any?) -> Unit,
    padding: PaddingValues,
) {
    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(padding)
            .verticalScroll(rememberScrollState())
            .padding(horizontal = 20.dp, vertical = 18.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp),
    ) {
        HeaderCard(request)

        Text(
            text = "Choose what to share",
            style = MaterialTheme.typography.titleMedium,
            fontWeight = FontWeight.SemiBold,
            color = AppColors.Ink,
        )

        request.items.forEach { item ->
            val selected = selectedItems[item.id] != false
            DataRequestCard(
                item = item,
                selected = selected,
                onSelectedChange = { onItemSelected(item.id, it) },
            )

            if (selected && item.kind == RequestKind.Questionnaire) {
                val questionnaire = item.meta.optJSONObject("questionnaire")
                if (questionnaire != null) {
                    QuestionnaireCard(
                        credentialId = item.id,
                        questionnaire = questionnaire,
                        answers = questionnaireAnswers,
                        onAnswerChanged = onAnswerChanged,
                    )
                } else {
                    NoticeCard("This questionnaire was referenced by URL. Inline rendering requires the verifier to include the Questionnaire resource.")
                }
            }
        }

        TechnicalSummary(request)
        Spacer(Modifier.height(96.dp))
    }
}

@Composable
private fun HeaderCard(request: VerifiedRequest) {
    ElevatedPanel {
        Row(verticalAlignment = Alignment.CenterVertically) {
            BrandMark()
            Spacer(Modifier.width(14.dp))
            Column(Modifier.weight(1f)) {
                Text(
                    text = "Sample Health Android Demo",
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.SemiBold,
                    color = AppColors.Ink,
                )
                Text(
                    text = "Native Android sample holder app",
                    style = MaterialTheme.typography.bodyMedium,
                    color = AppColors.Muted,
                )
            }
        }

        Spacer(Modifier.height(22.dp))

        Text(
            text = "Share sample health information",
            style = MaterialTheme.typography.headlineSmall,
            fontWeight = FontWeight.Bold,
            color = AppColors.Ink,
        )
        Spacer(Modifier.height(8.dp))
        val readerAuthText = when {
            request.readerAuth.present && request.readerAuth.signatureValid ->
                "The verifier signed this request with readerAuth; review the requested data before sharing."
            request.readerAuth.present ->
                "The verifier sent readerAuth, but its signature did not verify. Review carefully before sharing."
            else ->
                "This request did not include readerAuth; the browser-provided origin is shown below."
        }
        Text(
            text = readerAuthText,
            style = MaterialTheme.typography.bodyLarge,
            color = AppColors.Muted,
        )

        Spacer(Modifier.height(18.dp))

        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            val readerAuthLabel = when {
                request.readerAuth.present && request.readerAuth.signatureValid -> "readerAuth verified"
                request.readerAuth.present -> "readerAuth failed"
                else -> "No readerAuth"
            }
            val readerAuthTone = when {
                request.readerAuth.present && request.readerAuth.signatureValid -> ChipTone.Success
                request.readerAuth.present -> ChipTone.Warning
                else -> ChipTone.Neutral
            }
            StatusChip(readerAuthLabel, readerAuthTone)
            StatusChip("${request.items.size} item${if (request.items.size == 1) "" else "s"}", ChipTone.Neutral)
        }

        Spacer(Modifier.height(18.dp))

        VerifierStrip(request.verifierOrigin, request.readerAuth)
    }
}

@Composable
private fun VerifierStrip(verifierOrigin: String, readerAuth: ReaderAuthVerification) {
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(16.dp))
            .background(AppColors.PanelAlt)
            .border(BorderStroke(1.dp, AppColors.Line), RoundedCornerShape(16.dp))
            .padding(14.dp),
    ) {
        Text(
            text = "Verifier",
            style = MaterialTheme.typography.labelLarge,
            fontWeight = FontWeight.SemiBold,
            color = AppColors.Muted,
        )
        Spacer(Modifier.height(4.dp))
        Text(
            text = verifierOrigin,
            style = MaterialTheme.typography.bodyMedium,
            color = AppColors.Ink,
            maxLines = 1,
            overflow = TextOverflow.Ellipsis,
        )
        if (readerAuth.present && readerAuth.certificateSubject != null) {
            Spacer(Modifier.height(8.dp))
            Text(
                text = "Reader certificate: ${readerAuth.certificateSubject}",
                style = MaterialTheme.typography.bodySmall,
                color = if (readerAuth.signatureValid) AppColors.Success else AppColors.Amber,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis,
            )
        }
    }
}

@Composable
private fun DataRequestCard(
    item: RequestItem,
    selected: Boolean,
    onSelectedChange: (Boolean) -> Unit,
) {
    ElevatedPanel {
        Row(verticalAlignment = Alignment.CenterVertically) {
            DataGlyph(item.kind)
            Spacer(Modifier.width(14.dp))
            Column(Modifier.weight(1f)) {
                Text(
                    text = item.title,
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.SemiBold,
                    color = AppColors.Ink,
                )
                Spacer(Modifier.height(3.dp))
                Text(
                    text = item.subtitle,
                    style = MaterialTheme.typography.bodyMedium,
                    color = AppColors.Muted,
                )
            }
            Switch(
                checked = selected,
                onCheckedChange = onSelectedChange,
                colors = SwitchDefaults.colors(
                    checkedThumbColor = Color.White,
                    checkedTrackColor = AppColors.Primary,
                    uncheckedThumbColor = Color.White,
                    uncheckedTrackColor = AppColors.SwitchOff,
                ),
            )
        }
    }
}

@Composable
private fun QuestionnaireCard(
    credentialId: String,
    questionnaire: JSONObject,
    answers: SnapshotStateMap<String, Any>,
    onAnswerChanged: (String, Any?) -> Unit,
) {
    ElevatedPanel {
        Text(
            text = "Form answers",
            style = MaterialTheme.typography.titleMedium,
            fontWeight = FontWeight.SemiBold,
            color = AppColors.Ink,
        )
        val description = questionnaire.optString("description", "")
        if (description.isNotBlank()) {
            Spacer(Modifier.height(6.dp))
            Text(
                text = description,
                style = MaterialTheme.typography.bodyMedium,
                color = AppColors.Muted,
            )
        }
        Spacer(Modifier.height(18.dp))
        QuestionnaireItems(
            credentialId = credentialId,
            items = questionnaire.optJSONArray("item"),
            answers = answers,
            onAnswerChanged = onAnswerChanged,
            depth = 0,
        )
    }
}

@Composable
private fun QuestionnaireItems(
    credentialId: String,
    items: JSONArray?,
    answers: SnapshotStateMap<String, Any>,
    onAnswerChanged: (String, Any?) -> Unit,
    depth: Int,
) {
    val values = questionnaireValuesFromAnswerState(credentialId, answers)
    Column(verticalArrangement = Arrangement.spacedBy(14.dp)) {
        jsonObjects(items).forEach { item ->
            if (!isEnabledForUi(item, values)) return@forEach

            when (item.optString("type")) {
                "display" -> DisplayText(item.optString("text", item.optString("linkId")), depth)
                "group" -> QuestionGroup(credentialId, item, answers, onAnswerChanged, depth)
                else -> QuestionnaireField(credentialId, item, answers, onAnswerChanged, depth)
            }
        }
    }
}

@Composable
private fun QuestionGroup(
    credentialId: String,
    item: JSONObject,
    answers: SnapshotStateMap<String, Any>,
    onAnswerChanged: (String, Any?) -> Unit,
    depth: Int,
) {
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .padding(start = (depth * 8).dp),
        verticalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        Text(
            text = item.optString("text", item.optString("linkId")),
            style = MaterialTheme.typography.titleSmall,
            fontWeight = FontWeight.SemiBold,
            color = AppColors.Ink,
        )
        QuestionnaireItems(
            credentialId = credentialId,
            items = item.optJSONArray("item"),
            answers = answers,
            onAnswerChanged = onAnswerChanged,
            depth = depth + 1,
        )
    }
}

@Composable
private fun QuestionnaireField(
    credentialId: String,
    item: JSONObject,
    answers: SnapshotStateMap<String, Any>,
    onAnswerChanged: (String, Any?) -> Unit,
    depth: Int,
) {
    val linkId = item.optString("linkId")
    val key = answerKey(credentialId, linkId)
    val value = answers[key]
    val type = item.optString("type")
    val label = buildString {
        append(item.optString("text", linkId))
        if (item.optBoolean("required")) append(" *")
    }

    Column(
        modifier = Modifier
            .fillMaxWidth()
            .padding(start = (depth * 8).dp),
        verticalArrangement = Arrangement.spacedBy(8.dp),
    ) {
        Text(
            text = label,
            style = MaterialTheme.typography.bodyMedium,
            fontWeight = FontWeight.SemiBold,
            color = AppColors.Ink,
        )

        when {
            type == "boolean" -> BooleanAnswer(value, onChange = { onAnswerChanged(key, it) })
            type == "date" -> DateAnswer(value, onChange = { onAnswerChanged(key, it) })
            type == "integer" && integerBounds(item) != null ->
                IntegerSliderAnswer(item, value, onChange = { onAnswerChanged(key, it) })
            type in setOf("choice", "open-choice") && item.optJSONArray("answerOption") != null && item.optBoolean("repeats") ->
                MultiChoiceAnswer(item, value, onChange = { onAnswerChanged(key, it) })
            type in setOf("choice", "open-choice") && item.optJSONArray("answerOption") != null ->
                SingleChoiceAnswer(item, value, onChange = { onAnswerChanged(key, it) })
            else -> TextAnswer(item, value, onChange = { onAnswerChanged(key, it) })
        }
    }
}

@Composable
private fun DisplayText(text: String, depth: Int) {
    Text(
        text = text,
        modifier = Modifier
            .fillMaxWidth()
            .padding(start = (depth * 8).dp)
            .clip(RoundedCornerShape(12.dp))
            .background(AppColors.PanelAlt)
            .padding(horizontal = 14.dp, vertical = 12.dp),
        style = MaterialTheme.typography.bodyMedium,
        color = AppColors.Muted,
    )
}

@Composable
private fun BooleanAnswer(value: Any?, onChange: (Boolean) -> Unit) {
    val current = when (value) {
        is Boolean -> value
        is String -> when (value.lowercase()) {
            "true" -> true
            "false" -> false
            else -> null
        }
        else -> null
    }
    SingleChoiceSegmentedButtonRow(modifier = Modifier.fillMaxWidth()) {
        SegmentedButton(
            selected = current == true,
            onClick = { onChange(true) },
            shape = SegmentedButtonDefaults.itemShape(index = 0, count = 2),
        ) {
            Text("Yes")
        }
        SegmentedButton(
            selected = current == false,
            onClick = { onChange(false) },
            shape = SegmentedButtonDefaults.itemShape(index = 1, count = 2),
        ) {
            Text("No")
        }
    }
}

private fun integerBounds(item: JSONObject): IntRange? {
    var min: Int? = null
    var max: Int? = null
    val extensions = item.optJSONArray("extension") ?: return null
    for (i in 0 until extensions.length()) {
        val ext = extensions.optJSONObject(i) ?: continue
        when (ext.optString("url")) {
            "http://hl7.org/fhir/StructureDefinition/minValue" ->
                if (ext.has("valueInteger")) min = ext.optInt("valueInteger")
            "http://hl7.org/fhir/StructureDefinition/maxValue" ->
                if (ext.has("valueInteger")) max = ext.optInt("valueInteger")
        }
    }
    return if (min != null && max != null && max > min) min..max else null
}

@Composable
private fun IntegerSliderAnswer(item: JSONObject, value: Any?, onChange: (Int) -> Unit) {
    val bounds = integerBounds(item) ?: return
    val current = (value as? Number)?.toInt()
        ?: value?.toString()?.toIntOrNull()
        ?: bounds.first
    val clamped = current.coerceIn(bounds)
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(14.dp))
            .border(BorderStroke(1.dp, AppColors.Line), RoundedCornerShape(14.dp))
            .padding(horizontal = 14.dp, vertical = 10.dp),
        verticalArrangement = Arrangement.spacedBy(6.dp),
    ) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Text(
                text = bounds.first.toString(),
                style = MaterialTheme.typography.bodySmall,
                color = AppColors.Muted,
            )
            Spacer(Modifier.weight(1f))
            Text(
                text = clamped.toString(),
                style = MaterialTheme.typography.titleMedium,
                fontWeight = FontWeight.SemiBold,
                color = AppColors.Ink,
            )
            Spacer(Modifier.weight(1f))
            Text(
                text = bounds.last.toString(),
                style = MaterialTheme.typography.bodySmall,
                color = AppColors.Muted,
            )
        }
        Slider(
            value = clamped.toFloat(),
            onValueChange = { onChange(it.toInt()) },
            valueRange = bounds.first.toFloat()..bounds.last.toFloat(),
            steps = (bounds.last - bounds.first - 1).coerceAtLeast(0),
            colors = SliderDefaults.colors(
                thumbColor = AppColors.Primary,
                activeTrackColor = AppColors.Primary,
            ),
        )
    }
}

@Composable
private fun DateAnswer(value: Any?, onChange: (String) -> Unit) {
    val parts = parseDateParts(value?.toString())
    var year by remember { mutableStateOf(parts.year) }
    var month by remember { mutableStateOf(parts.month) }
    var day by remember { mutableStateOf(parts.day) }

    fun emit() {
        onChange(formatDateParts(year, month, day))
    }

    Row(
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(14.dp))
            .border(BorderStroke(1.dp, AppColors.Line), RoundedCornerShape(14.dp))
            .padding(horizontal = 10.dp, vertical = 8.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(6.dp),
    ) {
        OutlinedTextField(
            value = year,
            onValueChange = { input ->
                val sanitized = input.filter(Char::isDigit).take(4)
                year = sanitized
                emit()
            },
            modifier = Modifier.weight(1.4f),
            singleLine = true,
            placeholder = { Text("YYYY") },
            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
            shape = RoundedCornerShape(10.dp),
        )
        OutlinedTextField(
            value = month,
            onValueChange = { input ->
                val sanitized = input.filter(Char::isDigit).take(2)
                month = sanitized
                emit()
            },
            modifier = Modifier.weight(1f),
            singleLine = true,
            placeholder = { Text("MM") },
            enabled = year.length == 4,
            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
            shape = RoundedCornerShape(10.dp),
        )
        OutlinedTextField(
            value = day,
            onValueChange = { input ->
                val sanitized = input.filter(Char::isDigit).take(2)
                day = sanitized
                emit()
            },
            modifier = Modifier.weight(1f),
            singleLine = true,
            placeholder = { Text("DD") },
            enabled = year.length == 4 && month.length in 1..2,
            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
            shape = RoundedCornerShape(10.dp),
        )
    }
}

private data class DateParts(val year: String, val month: String, val day: String)

private fun parseDateParts(raw: String?): DateParts {
    if (raw.isNullOrBlank()) return DateParts("", "", "")
    val tokens = raw.split('-')
    val y = tokens.getOrNull(0)?.filter(Char::isDigit)?.take(4).orEmpty()
    val m = tokens.getOrNull(1)?.filter(Char::isDigit)?.take(2).orEmpty()
    val d = tokens.getOrNull(2)?.filter(Char::isDigit)?.take(2).orEmpty()
    return DateParts(y, m, d)
}

private fun formatDateParts(year: String, month: String, day: String): String {
    if (year.length != 4) return ""
    val mm = month.takeIf { it.isNotBlank() }?.padStart(2, '0') ?: return year
    val dd = day.takeIf { it.isNotBlank() }?.padStart(2, '0') ?: return "$year-$mm"
    return "$year-$mm-$dd"
}

@Composable
private fun SingleChoiceAnswer(item: JSONObject, value: Any?, onChange: (String) -> Unit) {
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(14.dp))
            .border(BorderStroke(1.dp, AppColors.Line), RoundedCornerShape(14.dp))
            .padding(vertical = 4.dp),
    ) {
        jsonObjects(item.optJSONArray("answerOption")).forEach { option ->
            val key = answerOptionKeyForUi(option)
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 10.dp, vertical = 4.dp),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                RadioButton(
                    selected = value?.toString() == key,
                    onClick = { onChange(key) },
                )
                Text(
                    text = answerOptionLabelForUi(option),
                    style = MaterialTheme.typography.bodyMedium,
                    color = AppColors.Ink,
                    modifier = Modifier.weight(1f),
                )
            }
        }
    }
}

@Composable
private fun MultiChoiceAnswer(item: JSONObject, value: Any?, onChange: (List<String>) -> Unit) {
    val selected = when (value) {
        is Collection<*> -> value.mapNotNull { it?.toString() }.toSet()
        is JSONArray -> (0 until value.length()).map { value.optString(it) }.toSet()
        null -> emptySet()
        else -> value.toString().split(",").map { it.trim() }.filter { it.isNotEmpty() }.toSet()
    }

    Column(
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(14.dp))
            .border(BorderStroke(1.dp, AppColors.Line), RoundedCornerShape(14.dp))
            .padding(vertical = 4.dp),
    ) {
        jsonObjects(item.optJSONArray("answerOption")).forEach { option ->
            val key = answerOptionKeyForUi(option)
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 10.dp, vertical = 4.dp),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Checkbox(
                    checked = key in selected,
                    onCheckedChange = { checked ->
                        val next = if (checked) selected + key else selected - key
                        onChange(next.toList())
                    },
                    colors = CheckboxDefaults.colors(checkedColor = AppColors.Primary),
                )
                Text(
                    text = answerOptionLabelForUi(option),
                    style = MaterialTheme.typography.bodyMedium,
                    color = AppColors.Ink,
                    modifier = Modifier.weight(1f),
                )
            }
        }
    }
}

@Composable
private fun TextAnswer(item: JSONObject, value: Any?, onChange: (String) -> Unit) {
    val type = item.optString("type")
    val multiLine = type == "text"
    val keyboardType = when (type) {
        "integer" -> KeyboardType.Number
        "decimal" -> KeyboardType.Decimal
        else -> KeyboardType.Text
    }

    OutlinedTextField(
        value = value?.toString().orEmpty(),
        onValueChange = onChange,
        modifier = Modifier.fillMaxWidth(),
        minLines = if (multiLine) 3 else 1,
        maxLines = if (multiLine) 5 else 1,
        enabled = !item.optBoolean("readOnly"),
        placeholder = {
            if (type == "date") Text("YYYY-MM-DD")
        },
        keyboardOptions = KeyboardOptions(keyboardType = keyboardType),
        shape = RoundedCornerShape(14.dp),
    )
}

@Composable
private fun ConsentActions(onShare: () -> Unit, onDecline: () -> Unit) {
    Surface(
        color = Color.White,
        shadowElevation = 12.dp,
        tonalElevation = 4.dp,
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 20.dp, vertical = 14.dp),
            verticalArrangement = Arrangement.spacedBy(10.dp),
        ) {
            Button(
                onClick = onShare,
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(14.dp),
                colors = ButtonDefaults.buttonColors(containerColor = AppColors.Primary),
            ) {
                Text("Share selected data")
            }
            OutlinedButton(
                onClick = onDecline,
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(14.dp),
                border = BorderStroke(1.dp, AppColors.LineStrong),
            ) {
                Text("Decline")
            }
        }
    }
}

@Composable
private fun TechnicalSummary(request: VerifiedRequest) {
    var expanded by remember { mutableStateOf(false) }
    ElevatedPanel {
        Row(verticalAlignment = Alignment.CenterVertically) {
            Text(
                text = "Technical details",
                modifier = Modifier.weight(1f),
                style = MaterialTheme.typography.titleSmall,
                fontWeight = FontWeight.SemiBold,
                color = AppColors.Ink,
            )
            TextButton(onClick = { expanded = !expanded }) {
                Text(if (expanded) "Hide" else "Show")
            }
        }
        Spacer(Modifier.height(8.dp))
        Text(
            text = "Optional raw request details for debugging and test captures.",
            style = MaterialTheme.typography.bodySmall,
            color = AppColors.Muted,
        )
        if (expanded) {
            Spacer(Modifier.height(12.dp))
            Text(
                text = "SMART request JSON",
                style = MaterialTheme.typography.labelLarge,
                fontWeight = FontWeight.SemiBold,
                color = AppColors.Muted,
            )
            Spacer(Modifier.height(6.dp))
            Text(
                text = request.rawSmartRequestJson.ifBlank { "{}" },
                modifier = Modifier
                    .fillMaxWidth()
                    .clip(RoundedCornerShape(14.dp))
                    .background(AppColors.PanelAlt)
                    .padding(12.dp),
                style = MaterialTheme.typography.bodySmall.copy(fontFamily = FontFamily.Monospace),
                color = AppColors.Ink,
            )
        }
    }
}

@Composable
private fun NoticeCard(text: String) {
    ElevatedPanel {
        Text(text = text, style = MaterialTheme.typography.bodyMedium, color = AppColors.Muted)
    }
}

@Composable
private fun ElevatedPanel(content: @Composable ColumnScope.() -> Unit) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(22.dp),
        colors = CardDefaults.cardColors(containerColor = Color.White),
        border = BorderStroke(1.dp, AppColors.Line),
        elevation = CardDefaults.cardElevation(defaultElevation = 1.dp),
    ) {
        Column(
            modifier = Modifier.padding(18.dp),
            content = content,
        )
    }
}

@Composable
private fun CenterPanel(padding: PaddingValues, content: @Composable ColumnScope.() -> Unit) {
    Box(
        modifier = Modifier
            .fillMaxSize()
            .padding(padding)
            .padding(24.dp),
        contentAlignment = Alignment.Center,
    ) {
        Card(
            modifier = Modifier.fillMaxWidth(),
            shape = RoundedCornerShape(26.dp),
            colors = CardDefaults.cardColors(containerColor = Color.White),
            border = BorderStroke(1.dp, AppColors.Line),
            elevation = CardDefaults.cardElevation(defaultElevation = 2.dp),
        ) {
            Column(
                modifier = Modifier.padding(24.dp),
                horizontalAlignment = Alignment.Start,
                content = content,
            )
        }
    }
}

@Composable
private fun BrandMark() {
    Box(
        modifier = Modifier
            .size(48.dp)
            .clip(RoundedCornerShape(16.dp))
            .background(AppColors.Primary),
        contentAlignment = Alignment.Center,
    ) {
        Text(
            text = "SH",
            color = Color.White,
            style = MaterialTheme.typography.titleMedium,
            fontWeight = FontWeight.Bold,
        )
    }
}

@Composable
private fun StatusDot(color: Color, background: Color) {
    Box(
        modifier = Modifier
            .size(54.dp)
            .clip(CircleShape)
            .background(background),
        contentAlignment = Alignment.Center,
    ) {
        Box(
            modifier = Modifier
                .size(18.dp)
                .clip(CircleShape)
                .background(color),
        )
    }
}

@Composable
private fun StatusChip(text: String, tone: ChipTone) {
    val colors = when (tone) {
        ChipTone.Success -> AppColors.SuccessSoft to AppColors.Success
        ChipTone.Warning -> AppColors.AmberSoft to AppColors.Amber
        ChipTone.Neutral -> AppColors.PanelAlt to AppColors.Muted
    }
    Surface(
        shape = RoundedCornerShape(999.dp),
        color = colors.first,
        border = BorderStroke(1.dp, AppColors.Line),
    ) {
        Text(
            text = text,
            modifier = Modifier.padding(horizontal = 12.dp, vertical = 7.dp),
            style = MaterialTheme.typography.labelMedium,
            fontWeight = FontWeight.SemiBold,
            color = colors.second,
        )
    }
}

@Composable
private fun DataGlyph(kind: RequestKind) {
    val label = when (kind) {
        RequestKind.Coverage -> "ID"
        RequestKind.Plan -> "PL"
        RequestKind.Clinical -> "CL"
        RequestKind.Questionnaire -> "QA"
        RequestKind.Unknown -> "DT"
    }
    val background = when (kind) {
        RequestKind.Coverage -> AppColors.BlueSoft
        RequestKind.Plan -> AppColors.TealSoft
        RequestKind.Clinical -> AppColors.VioletSoft
        RequestKind.Questionnaire -> AppColors.AmberSoft
        RequestKind.Unknown -> AppColors.PanelAlt
    }
    val foreground = when (kind) {
        RequestKind.Coverage -> AppColors.Primary
        RequestKind.Plan -> AppColors.Teal
        RequestKind.Clinical -> AppColors.Violet
        RequestKind.Questionnaire -> AppColors.Amber
        RequestKind.Unknown -> AppColors.Muted
    }

    Box(
        modifier = Modifier
            .size(44.dp)
            .clip(RoundedCornerShape(14.dp))
            .background(background),
        contentAlignment = Alignment.Center,
    ) {
        Text(
            text = label,
            color = foreground,
            style = MaterialTheme.typography.labelLarge,
            fontWeight = FontWeight.Bold,
        )
    }
}

@Composable
fun SampleHealthTheme(content: @Composable () -> Unit) {
    MaterialTheme(
        colorScheme = lightColorScheme(
            primary = AppColors.Primary,
            secondary = AppColors.Teal,
            background = AppColors.Page,
            surface = Color.White,
            error = AppColors.Error,
        ),
        content = content,
    )
}

private fun questionnaireValuesFromAnswerState(credentialId: String, answers: Map<String, Any>): JSONObject {
    val values = JSONObject()
    val prefix = "$credentialId::"
    answers.forEach { (key, value) ->
        if (key.startsWith(prefix)) {
            values.put(key.removePrefix(prefix), if (value is Collection<*>) JSONArray(value) else value)
        }
    }
    return values
}

private fun isEnabledForUi(item: JSONObject, values: JSONObject): Boolean {
    val enableWhen = item.optJSONArray("enableWhen")
    if (enableWhen == null || enableWhen.length() == 0) return true

    val any = item.optString("enableBehavior") == "any"
    var aggregate = !any

    jsonObjects(enableWhen).forEach { condition ->
        val result = compareForUi(values.opt(condition.optString("question")), condition)
        aggregate = if (any) aggregate || result else aggregate && result
    }

    return aggregate
}

private fun compareForUi(actual: Any?, condition: JSONObject): Boolean {
    val operator = condition.optString("operator")
    val expected = when {
        condition.has("answerInteger") -> condition.opt("answerInteger")
        condition.has("answerBoolean") -> condition.opt("answerBoolean")
        condition.has("answerString") -> condition.opt("answerString")
        condition.has("answerCoding") -> condition.optJSONObject("answerCoding")?.optString("code")
        else -> null
    }
    if (operator == "exists") return (actual != null && actual != JSONObject.NULL) == (expected == true)
    if (actual == null || actual == JSONObject.NULL || expected == null || expected == JSONObject.NULL) return false
    if (operator == "=") return containsForUi(actual, expected)
    if (operator == "!=") return !containsForUi(actual, expected)

    return runCatching {
        val left = actual.toString().toDouble()
        val right = expected.toString().toDouble()
        when (operator) {
            ">" -> left > right
            "<" -> left < right
            ">=" -> left >= right
            "<=" -> left <= right
            else -> false
        }
    }.getOrDefault(false)
}

private fun containsForUi(actual: Any, expected: Any): Boolean {
    if (actual is JSONArray) {
        for (index in 0 until actual.length()) {
            if (actual.opt(index).toString() == expected.toString()) return true
        }
        return false
    }
    return actual.toString() == expected.toString()
}

private fun answerOptionKeyForUi(option: JSONObject): String {
    val coding = option.optJSONObject("valueCoding")
    if (coding != null) return coding.optString("code", coding.optString("display", coding.toString()))
    if (option.has("valueString")) return option.optString("valueString")
    if (option.has("valueInteger")) return option.optInt("valueInteger").toString()
    if (option.has("valueDate")) return option.optString("valueDate")
    if (option.has("valueTime")) return option.optString("valueTime")
    return option.toString()
}

private fun answerOptionLabelForUi(option: JSONObject): String {
    val coding = option.optJSONObject("valueCoding")
    if (coding != null) return coding.optString("display", coding.optString("code", coding.toString()))
    if (option.has("valueString")) return option.optString("valueString")
    if (option.has("valueInteger")) return option.optInt("valueInteger").toString()
    if (option.has("valueDate")) return option.optString("valueDate")
    if (option.has("valueTime")) return option.optString("valueTime")
    return option.toString()
}

private fun answerKey(credentialId: String, linkId: String): String = "$credentialId::$linkId"

private fun jsonObjects(array: JSONArray?): List<JSONObject> {
    if (array == null) return emptyList()
    val values = ArrayList<JSONObject>(array.length())
    for (index in 0 until array.length()) {
        array.optJSONObject(index)?.let(values::add)
    }
    return values
}

sealed interface ScreenState {
    data object Empty : ScreenState
    data class Loading(val title: String, val message: String) : ScreenState
    data class Consent(val request: VerifiedRequest) : ScreenState
    data class Submitting(val title: String, val message: String) : ScreenState
    data class Error(val message: String) : ScreenState
    data object Complete : ScreenState
}

private enum class ChipTone {
    Success,
    Warning,
    Neutral,
}

private object AppColors {
    val Page = Color(0xFFF6F8FB)
    val PanelAlt = Color(0xFFF1F5F9)
    val Line = Color(0xFFE2E8F0)
    val LineStrong = Color(0xFFCBD5E1)
    val Ink = Color(0xFF102033)
    val Muted = Color(0xFF526173)
    val Subtle = Color(0xFF7A8898)
    val Primary = Color(0xFF1D5FD1)
    val BlueSoft = Color(0xFFE8F0FF)
    val Teal = Color(0xFF0F766E)
    val TealSoft = Color(0xFFE2F7F4)
    val Violet = Color(0xFF6D4AFF)
    val VioletSoft = Color(0xFFF0EDFF)
    val Amber = Color(0xFF9A5B00)
    val AmberSoft = Color(0xFFFFF3D6)
    val Success = Color(0xFF087443)
    val SuccessSoft = Color(0xFFE5F6EC)
    val Error = Color(0xFFB42318)
    val ErrorSoft = Color(0xFFFFE7E5)
    val SwitchOff = Color(0xFF94A3B8)
}

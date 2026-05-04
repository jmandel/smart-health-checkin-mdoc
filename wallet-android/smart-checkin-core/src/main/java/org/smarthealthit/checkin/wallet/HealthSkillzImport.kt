package org.smarthealthit.checkin.wallet

import java.io.ByteArrayInputStream
import java.io.File
import java.io.InputStream
import java.nio.charset.StandardCharsets
import java.time.Instant
import java.util.zip.ZipInputStream
import org.json.JSONArray
import org.json.JSONObject

data class ImportedProviderRecords(
    val provider: String,
    val patientDisplayName: String?,
    val patientBirthDate: String?,
    val fetchedAt: String?,
    val fhir: Map<String, List<JSONObject>>,
    val attachments: List<JSONObject> = emptyList(),
)

data class ImportedHealthRecords(
    val importedAt: String,
    val providers: List<ImportedProviderRecords>,
) {
    fun summary(): ImportedHealthRecordsSummary {
        val counts = linkedMapOf<String, Int>()
        providers.forEach { provider ->
            provider.fhir.forEach { (resourceType, resources) ->
                counts[resourceType] = (counts[resourceType] ?: 0) + resources.size
            }
        }
        val patients = providers.mapNotNull { it.patientDisplayName?.takeIf(String::isNotBlank) }.distinct()
        return ImportedHealthRecordsSummary(
            importedAt = importedAt,
            providerCount = providers.size,
            patientNames = patients,
            resourceCounts = counts,
            totalResources = counts.values.sum(),
        )
    }

    fun toJson(): JSONObject {
        return JSONObject()
            .put("version", 1)
            .put("importedAt", importedAt)
            .put(
                "providers",
                JSONArray().also { array ->
                    providers.forEach { provider ->
                        array.put(provider.toJson())
                    }
                },
            )
    }

    companion object {
        fun fromJson(json: JSONObject): ImportedHealthRecords {
            val providers = jsonObjectItems(json.optJSONArray("providers")).map(::providerFromJson)
            require(providers.isNotEmpty()) { "Imported records must include at least one provider payload." }
            return ImportedHealthRecords(
                importedAt = json.optString("importedAt").ifBlank { Instant.now().toString() },
                providers = providers,
            )
        }
    }
}

data class ImportedHealthRecordsSummary(
    val importedAt: String,
    val providerCount: Int,
    val patientNames: List<String>,
    val resourceCounts: Map<String, Int>,
    val totalResources: Int,
) {
    fun patientSummary(): String {
        return when {
            patientNames.isEmpty() -> "Patient identity not listed"
            patientNames.size == 1 -> patientNames.single()
            else -> patientNames.joinToString(limit = 2, truncated = "and ${patientNames.size - 2} more")
        }
    }

    fun resourceSummary(limit: Int = 5): String {
        if (resourceCounts.isEmpty()) return "No FHIR resources"
        return resourceCounts.entries
            .sortedWith(compareByDescending<Map.Entry<String, Int>> { it.value }.thenBy { it.key })
            .take(limit)
            .joinToString { "${it.key} ${it.value}" }
    }
}

object HealthSkillzImportParser {
    fun parse(input: InputStream, fileName: String? = null): ImportedHealthRecords {
        val bytes = input.readBytes()
        val payloads = if (fileName?.lowercase()?.endsWith(".zip") == true || bytes.looksLikeZip()) {
            parseZip(ByteArrayInputStream(bytes))
        } else {
            parseJsonPayloads(bytes.toString(StandardCharsets.UTF_8))
        }
        require(payloads.isNotEmpty()) {
            "No Health Skillz provider payloads found. Expected health-record-assistant/data/*.json or health-records.json."
        }
        return ImportedHealthRecords(
            importedAt = Instant.now().toString(),
            providers = payloads.map(::providerFromHealthSkillzPayload),
        )
    }

    private fun parseZip(input: InputStream): List<JSONObject> {
        val payloads = mutableListOf<JSONObject>()
        ZipInputStream(input).use { zip ->
            var entry = zip.nextEntry
            while (entry != null) {
                val name = entry.name
                if (!entry.isDirectory && name.endsWith(".json") && isHealthSkillzDataEntry(name)) {
                    val text = zip.readBytes().toString(StandardCharsets.UTF_8)
                    payloads += parseJsonPayloads(text)
                }
                zip.closeEntry()
                entry = zip.nextEntry
            }
        }
        return payloads
    }

    private fun isHealthSkillzDataEntry(name: String): Boolean {
        return name.startsWith("data/") ||
            name.contains("/data/") ||
            name == "health-records.json"
    }

    private fun parseJsonPayloads(text: String): List<JSONObject> {
        val trimmed = text.trim()
        require(trimmed.isNotEmpty()) { "Imported JSON is empty." }
        return when (trimmed.first()) {
            '[' -> jsonObjectItems(JSONArray(trimmed))
            '{' -> {
                val obj = JSONObject(trimmed)
                when {
                    obj.has("providers") -> jsonObjectItems(obj.optJSONArray("providers"))
                    obj.has("fhir") -> listOf(obj)
                    else -> emptyList()
                }
            }
            else -> emptyList()
        }
    }
}

private fun ByteArray.looksLikeZip(): Boolean {
    return size >= 4 && this[0] == 0x50.toByte() && this[1] == 0x4b.toByte()
}

object ImportedHealthRecordsRepository {
    private const val FILE_NAME = "imported-health-records.normalized.json"

    fun importFromStream(root: File, fileName: String?, input: InputStream): ImportedHealthRecords {
        val records = HealthSkillzImportParser.parse(input, fileName)
        save(root, records)
        return records
    }

    fun load(root: File): ImportedHealthRecords? {
        val file = File(root, FILE_NAME)
        if (!file.exists()) return null
        return ImportedHealthRecords.fromJson(JSONObject(file.readText()))
    }

    fun loadSummary(root: File): ImportedHealthRecordsSummary? = load(root)?.summary()

    fun save(root: File, records: ImportedHealthRecords) {
        root.mkdirs()
        File(root, FILE_NAME).writeText(records.toJson().toString(2))
    }

    fun clear(root: File): Boolean = File(root, FILE_NAME).delete()
}

class ImportedFhirWalletStore(
    private val records: ImportedHealthRecords,
) : SmartHealthWalletStore {
    override fun resolveItems(items: List<RequestItem>): List<RequestItemResolution> {
        return items.map { item ->
            val mediaType = item.acceptedMediaTypes.firstOrNull { it == "application/fhir+json" }
            if (mediaType == null) {
                return@map RequestItemResolution(
                    itemId = item.id,
                    availability = WalletItemAvailability.Unsupported,
                    candidates = emptyList(),
                    matchSummary = "This wallet cannot produce an accepted media type for this item.",
                    statusIfShared = RequestItemStatusCode.Unsupported,
                )
            }
            if (item.kind == RequestKind.Questionnaire) {
                return@map RequestItemResolution(
                    itemId = item.id,
                    availability = WalletItemAvailability.Available,
                    candidates = listOf(
                        WalletCandidate(
                            id = "form-${item.id}",
                            label = "Form answers",
                            subtitle = "QuestionnaireResponse built from reviewed answers",
                            resourceType = "QuestionnaireResponse",
                            sourceName = "This wallet",
                        ),
                    ),
                    matchSummary = "Form can be completed now",
                )
            }

            val resourceTypes = requestedResourceTypes(item)
            if (resourceTypes == null) {
                return@map RequestItemResolution(
                    itemId = item.id,
                    availability = WalletItemAvailability.Unsupported,
                    candidates = emptyList(),
                    matchSummary = "This wallet cannot interpret this selector.",
                    statusIfShared = RequestItemStatusCode.Unsupported,
                )
            }

            val candidates = candidatesForResourceTypes(resourceTypes)
            if (candidates.isEmpty()) {
                RequestItemResolution(
                    itemId = item.id,
                    availability = WalletItemAvailability.Unavailable,
                    candidates = emptyList(),
                    matchSummary = "No matching records found",
                    detail = "Imported Health Skillz records are treated as a US Core-derived patient record set for this demo.",
                    statusIfShared = RequestItemStatusCode.Unavailable,
                )
            } else {
                RequestItemResolution(
                    itemId = item.id,
                    availability = WalletItemAvailability.Available,
                    candidates = candidates,
                    matchSummary = "${candidates.size} matching ${if (candidates.size == 1) "record" else "records"} available",
                    detail = "Matched from imported Health Skillz records.",
                )
            }
        }
    }

    override fun buildArtifact(
        item: RequestItem,
        selectedCandidates: List<WalletCandidate>,
        questionnaireAnswers: Map<String, Any>,
    ): SmartHealthWalletArtifact {
        if (item.kind == RequestKind.Questionnaire) {
            return SmartHealthWalletArtifact(
                value = QuestionnaireResponseBuilder.build(item, questionnaireAnswers),
            )
        }
        val resources = selectedCandidates.mapNotNull { it.value }.map { JSONObject(it.toString()) }
        val value = JSONObject()
            .put("resourceType", "Bundle")
            .put("type", "collection")
            .put(
                "entry",
                JSONArray().also { entries ->
                    resources.forEach { resource ->
                        entries.put(JSONObject().put("resource", resource))
                    }
                },
            )
        return SmartHealthWalletArtifact(value = value)
    }

    override fun prefillQuestionnaireAnswers(items: List<RequestItem>): Map<String, Any> = emptyMap()

    private fun candidatesForResourceTypes(resourceTypes: Set<String>): List<WalletCandidate> {
        val out = mutableListOf<WalletCandidate>()
        records.providers.forEachIndexed { providerIndex, provider ->
            resourceTypes.forEach { resourceType ->
                provider.fhir[resourceType].orEmpty().forEachIndexed { resourceIndex, resource ->
                    out += WalletCandidate(
                        id = "p$providerIndex:$resourceType:$resourceIndex:${resource.optString("id")}",
                        label = resourceLabel(provider, resource, resourceIndex),
                        subtitle = resourceSubtitle(provider, resource),
                        resourceType = resourceType,
                        sourceName = provider.provider,
                        selectedByDefault = true,
                        value = JSONObject(resource.toString()),
                    )
                }
            }
        }
        return out
    }

    private fun requestedResourceTypes(item: RequestItem): Set<String>? {
        val content = item.meta.optJSONObject("content")
        val explicitTypes = stringValues(content?.opt("resourceTypes")).map(::normalizeResourceType).toSet()
        val profileTypes = stringValues(content?.opt("profiles"))
            .flatMap(::resourceTypesForProfile)
            .toSet()
        val profileFamilies = stringValues(content?.opt("profilesFrom")).map { it.substringBefore('|').lowercase() }
        val requested = linkedSetOf<String>()
        requested += explicitTypes
        requested += profileTypes
        if (profileFamilies.any { it == US_CORE_CANONICAL }) requested += BROAD_US_CORE_RESOURCE_TYPES
        if (requested.isNotEmpty()) return requested

        return when (item.kind) {
            RequestKind.Coverage -> setOf("Coverage")
            RequestKind.Plan -> setOf("InsurancePlan")
            RequestKind.Clinical -> BROAD_US_CORE_RESOURCE_TYPES
            RequestKind.Questionnaire -> emptySet()
            RequestKind.Unknown -> null
        }
    }

    private fun resourceTypesForProfile(profile: String): Set<String> {
        val p = profile.substringBefore('|').lowercase()
        return when {
            p.contains("c4dic-coverage") -> setOf("Coverage")
            p.contains("sbc-insurance-plan") || p.contains("c4dic-insuranceplan") -> setOf("InsurancePlan")
            p.contains("us-core-patient") -> setOf("Patient")
            p.contains("us-core-condition") -> setOf("Condition")
            p.contains("us-core-allergyintolerance") -> setOf("AllergyIntolerance")
            p.contains("us-core-medicationrequest") -> setOf("MedicationRequest")
            p.contains("us-core-medicationstatement") -> setOf("MedicationStatement")
            p.contains("us-core-immunization") -> setOf("Immunization")
            p.contains("us-core-observation") -> setOf("Observation")
            p.contains("us-core-diagnosticreport") -> setOf("DiagnosticReport")
            p.contains("us-core-documentreference") -> setOf("DocumentReference")
            p.contains("us-core-procedure") -> setOf("Procedure")
            p.contains("us-core-encounter") -> setOf("Encounter")
            p.contains("us-core-careplan") -> setOf("CarePlan")
            p.contains("us-core-careteam") -> setOf("CareTeam")
            p.contains("us-core-goal") -> setOf("Goal")
            p.contains("us-core-device") -> setOf("Device")
            p.contains("us-core-servicerequest") -> setOf("ServiceRequest")
            else -> emptySet()
        }
    }

    private fun resourceLabel(provider: ImportedProviderRecords, resource: JSONObject, index: Int): String {
        val resourceType = resource.optString("resourceType").ifBlank { "Resource" }
        val name = firstHumanName(resource.optJSONArray("name"))
        val code = when (resourceType) {
            "Coverage" -> coverageLabel(resource)
            "MedicationRequest",
            "MedicationStatement",
            "MedicationDispense" -> medicationLabel(provider, resource)
            "Immunization" -> codeText(resource.optJSONObject("vaccineCode"))
            "DiagnosticReport",
            "Observation",
            "Procedure",
            "ServiceRequest" -> codeText(resource.optJSONObject("code"))
            "DocumentReference" -> codeText(resource.optJSONObject("type"))
            "Encounter" -> firstCodeText(resource.optJSONArray("type")) ?: classText(resource.optJSONObject("class"))
            "CarePlan",
            "CareTeam" -> firstCodeText(resource.optJSONArray("category"))
            "Goal" -> codeText(resource.optJSONObject("description"))
            "Specimen" -> codeText(resource.optJSONObject("type"))
            "Location",
            "Organization" -> resource.optString("name").ifBlank { null }
            else -> codeText(resource.optJSONObject("code"))
        }
        val title = resource.optString("title").ifBlank { null }
        val description = resource.optString("description").ifBlank { null }
        val id = resource.optString("id").ifBlank { null }
        return listOf(name, code, title, description, id).firstOrNull { !it.isNullOrBlank() }
            ?: "$resourceType ${index + 1}"
    }

    private fun resourceSubtitle(provider: ImportedProviderRecords, resource: JSONObject): String {
        val resourceType = resource.optString("resourceType").ifBlank { "FHIR resource" }
        val parts = mutableListOf(resourceType)
        when (resourceType) {
            "Coverage" -> coverageSubtitle(resource)
            "MedicationRequest",
            "MedicationStatement",
            "MedicationDispense" -> medicationSubtitle(provider, resource)
            "Observation" -> observationSubtitle(resource)
            "DocumentReference" -> documentSubtitle(resource)
            "Encounter" -> encounterSubtitle(resource)
            else -> genericSubtitle(resource)
        }.filterTo(parts) { it.isNotBlank() }
        return parts.distinct().joinToString(" · ")
    }

    private fun firstHumanName(names: JSONArray?): String? {
        val first = names?.optJSONObject(0) ?: return null
        first.optString("text").takeIf(String::isNotBlank)?.let { return it }
        val given = stringValues(first.opt("given")).joinToString(" ")
        val family = first.optString("family")
        return "$given $family".trim().ifBlank { null }
    }

    private fun codeText(code: JSONObject?): String? {
        if (code == null) return null
        code.optString("text").takeIf(String::isNotBlank)?.let { return it }
        val coding = code.optJSONArray("coding") ?: return null
        for (i in 0 until coding.length()) {
            val item = coding.optJSONObject(i) ?: continue
            item.optString("display").takeIf(String::isNotBlank)?.let { return it }
            item.optString("code").takeIf(String::isNotBlank)?.let { return it }
        }
        return null
    }

    private fun firstCodeText(codes: JSONArray?): String? {
        return jsonObjectItems(codes).firstNotNullOfOrNull(::codeText)
    }

    private fun classText(code: JSONObject?): String? {
        if (code == null) return null
        code.optString("display").takeIf(String::isNotBlank)?.let { return it }
        return code.optString("code").ifBlank { null }
    }

    private fun coverageLabel(resource: JSONObject): String? {
        val payor = firstReferenceDisplay(resource.optJSONArray("payor"))
        val type = codeText(resource.optJSONObject("type"))
        val plan = coverageClass(resource, "plan") ?: coverageClass(resource, "group")
        return listOf(plan?.name, type, payor, plan?.value).firstOrNull { !it.isNullOrBlank() }
    }

    private fun coverageSubtitle(resource: JSONObject): List<String> {
        val parts = mutableListOf<String>()
        resource.optString("status").takeIf(String::isNotBlank)?.let(parts::add)
        firstReferenceDisplay(resource.optJSONArray("payor"))?.let { parts += "Payor: $it" }
        resource.optString("subscriberId").takeIf(String::isNotBlank)?.let { parts += "Subscriber: $it" }
        coverageClass(resource, "group")?.let { parts += "Group: ${it.display}" }
        coverageClass(resource, "plan")?.let { parts += "Plan: ${it.display}" }
        periodSummary(resource.optJSONObject("period"))?.let(parts::add)
        return parts
    }

    private fun medicationLabel(provider: ImportedProviderRecords, resource: JSONObject): String? {
        codeText(resource.optJSONObject("medicationCodeableConcept"))?.let { return it }
        val medicationReference = resource.optJSONObject("medicationReference")
        medicationReference?.optString("display")?.takeIf(String::isNotBlank)?.let { return it }
        val medication = referencedResource(provider, medicationReference)
        return medication?.let { codeText(it.optJSONObject("code")) }
    }

    private fun medicationSubtitle(provider: ImportedProviderRecords, resource: JSONObject): List<String> {
        val parts = genericSubtitle(resource).toMutableList()
        resource.optJSONObject("requester")?.optString("display")?.takeIf(String::isNotBlank)?.let {
            parts += "Requester: $it"
        }
        resource.optJSONObject("medicationReference")?.let { reference ->
            if (medicationLabel(provider, resource).isNullOrBlank()) {
                reference.optString("reference").takeIf(String::isNotBlank)?.let(parts::add)
            }
        }
        return parts
    }

    private fun observationSubtitle(resource: JSONObject): List<String> {
        return genericSubtitle(resource) + listOfNotNull(valueSummary(resource))
    }

    private fun documentSubtitle(resource: JSONObject): List<String> {
        val parts = genericSubtitle(resource).toMutableList()
        resource.optString("docStatus").takeIf(String::isNotBlank)?.let(parts::add)
        return parts
    }

    private fun encounterSubtitle(resource: JSONObject): List<String> {
        val parts = genericSubtitle(resource).toMutableList()
        periodSummary(resource.optJSONObject("period"))?.let(parts::add)
        return parts
    }

    private fun genericSubtitle(resource: JSONObject): List<String> {
        val parts = mutableListOf<String>()
        resource.optString("status").takeIf(String::isNotBlank)?.let(parts::add)
        codeText(resource.optJSONObject("clinicalStatus"))?.let(parts::add)
        resource.optString("recordedDate").takeIf(String::isNotBlank)?.let(parts::add)
        resource.optString("effectiveDateTime").takeIf(String::isNotBlank)?.let(parts::add)
        resource.optString("issued").takeIf(String::isNotBlank)?.let(parts::add)
        resource.optString("authoredOn").takeIf(String::isNotBlank)?.let(parts::add)
        resource.optString("occurrenceDateTime").takeIf(String::isNotBlank)?.let(parts::add)
        resource.optString("performedDateTime").takeIf(String::isNotBlank)?.let(parts::add)
        resource.optString("date").takeIf(String::isNotBlank)?.let(parts::add)
        return parts
    }

    private data class CoverageClass(val name: String?, val value: String?) {
        val display: String
            get() = listOfNotNull(name, value).joinToString(" ").ifBlank { name ?: value.orEmpty() }
    }

    private fun coverageClass(resource: JSONObject, code: String): CoverageClass? {
        return jsonObjectItems(resource.optJSONArray("class"))
            .firstOrNull { coverageClassCode(it.optJSONObject("type")) == code }
            ?.let { item ->
                CoverageClass(
                    name = item.optString("name").ifBlank { null },
                    value = item.optString("value").ifBlank { null },
                )
            }
    }

    private fun coverageClassCode(type: JSONObject?): String? {
        val coding = type?.optJSONArray("coding") ?: return null
        return jsonObjectItems(coding).firstNotNullOfOrNull { codingItem ->
            codingItem.optString("code").lowercase().ifBlank { null }
        }
    }

    private fun firstReferenceDisplay(references: JSONArray?): String? {
        return jsonObjectItems(references).firstNotNullOfOrNull { reference ->
            reference.optString("display").ifBlank {
                reference.optString("reference").substringAfterLast('/').ifBlank { null }
            }
        }
    }

    private fun referencedResource(provider: ImportedProviderRecords, reference: JSONObject?): JSONObject? {
        val ref = reference?.optString("reference")?.takeIf(String::isNotBlank) ?: return null
        val parts = ref.split('/')
        if (parts.size < 2) return null
        val resourceType = parts[parts.size - 2]
        val id = parts.last()
        return provider.fhir[resourceType].orEmpty().firstOrNull { it.optString("id") == id }
    }

    private fun periodSummary(period: JSONObject?): String? {
        if (period == null) return null
        val start = period.optString("start").ifBlank { null }
        val end = period.optString("end").ifBlank { null }
        return when {
            start != null && end != null -> "$start to $end"
            start != null -> "Since $start"
            end != null -> "Until $end"
            else -> null
        }
    }

    private fun valueSummary(resource: JSONObject): String? {
        resource.optJSONObject("valueQuantity")?.let { quantity ->
            val value = quantity.opt("value")?.toString()?.takeIf(String::isNotBlank)
            val unit = quantity.optString("unit").ifBlank { quantity.optString("code") }
            return listOfNotNull(value, unit.ifBlank { null }).joinToString(" ").ifBlank { null }
        }
        resource.optString("valueString").takeIf(String::isNotBlank)?.let { return it }
        codeText(resource.optJSONObject("valueCodeableConcept"))?.let { return it }
        val components = resource.optJSONArray("component")
        if (components != null && components.length() > 0) return "${components.length()} component values"
        return null
    }

    private fun normalizeResourceType(value: String): String {
        return value.trim().replaceFirstChar { if (it.isLowerCase()) it.titlecase() else it.toString() }
    }

    private companion object {
        private const val US_CORE_CANONICAL = "http://hl7.org/fhir/us/core"
        private val BROAD_US_CORE_RESOURCE_TYPES = linkedSetOf(
            "Patient",
            "RelatedPerson",
            "Coverage",
            "Condition",
            "AllergyIntolerance",
            "MedicationRequest",
            "MedicationStatement",
            "Immunization",
            "Observation",
            "DiagnosticReport",
            "DocumentReference",
            "Procedure",
            "Encounter",
            "CarePlan",
            "CareTeam",
            "Goal",
            "Device",
            "ServiceRequest",
        )
    }
}

private fun ImportedProviderRecords.toJson(): JSONObject {
    return JSONObject()
        .put("provider", provider)
        .put("patientDisplayName", patientDisplayName ?: JSONObject.NULL)
        .put("patientBirthDate", patientBirthDate ?: JSONObject.NULL)
        .put("fetchedAt", fetchedAt ?: JSONObject.NULL)
        .put(
            "fhir",
            JSONObject().also { fhirJson ->
                fhir.forEach { (resourceType, resources) ->
                    fhirJson.put(
                        resourceType,
                        JSONArray().also { array ->
                            resources.forEach { array.put(JSONObject(it.toString())) }
                        },
                    )
                }
            },
        )
        .put(
            "attachments",
            JSONArray().also { array ->
                attachments.forEach { array.put(JSONObject(it.toString())) }
            },
        )
}

private fun providerFromJson(json: JSONObject): ImportedProviderRecords {
    val fhir = linkedMapOf<String, List<JSONObject>>()
    val fhirJson = json.optJSONObject("fhir") ?: JSONObject()
    fhirJson.keys().forEach { resourceType ->
        fhir[resourceType] = jsonObjectItems(fhirJson.optJSONArray(resourceType))
            .map { JSONObject(it.toString()) }
    }
    return ImportedProviderRecords(
        provider = json.optString("provider").ifBlank { "Imported records" },
        patientDisplayName = json.optString("patientDisplayName").ifBlank { null },
        patientBirthDate = json.optString("patientBirthDate").ifBlank { null },
        fetchedAt = json.optString("fetchedAt").ifBlank { null },
        fhir = fhir,
        attachments = jsonObjectItems(json.optJSONArray("attachments")).map { JSONObject(it.toString()) },
    )
}

private fun providerFromHealthSkillzPayload(payload: JSONObject): ImportedProviderRecords {
    val fhirJson = payload.optJSONObject("fhir")
        ?: throw IllegalArgumentException("Health Skillz provider payload is missing fhir.")
    val fhir = linkedMapOf<String, MutableList<JSONObject>>()
    fhirJson.keys().forEach { sourceType ->
        jsonObjectItems(fhirJson.optJSONArray(sourceType)).forEach { resource ->
            val resourceType = resource.optString("resourceType").ifBlank { sourceType }
            fhir.getOrPut(resourceType) { mutableListOf() }.add(JSONObject(resource.toString()))
        }
    }
    require(fhir.values.any { it.isNotEmpty() }) { "Health Skillz provider payload has no FHIR resources." }
    return ImportedProviderRecords(
        provider = payload.optString("provider").ifBlank {
            payload.optString("name").ifBlank { "Imported records" }
        },
        patientDisplayName = payload.optString("patientDisplayName").ifBlank { null },
        patientBirthDate = payload.optString("patientBirthDate").ifBlank { null },
        fetchedAt = payload.optString("fetchedAt").ifBlank {
            payload.optString("connectedAt").ifBlank { null }
        },
        fhir = fhir.mapValues { (_, resources) -> resources.toList() },
        attachments = jsonObjectItems(payload.optJSONArray("attachments")).map { JSONObject(it.toString()) },
    )
}

private fun stringValues(value: Any?): List<String> {
    return when (value) {
        is String -> listOf(value).filter { it.isNotBlank() }
        is JSONArray -> {
            val out = mutableListOf<String>()
            for (i in 0 until value.length()) {
                out += stringValues(value.opt(i))
            }
            out
        }
        is JSONObject -> listOf(value.optString("canonical")).filter { it.isNotBlank() }
        else -> emptyList()
    }
}

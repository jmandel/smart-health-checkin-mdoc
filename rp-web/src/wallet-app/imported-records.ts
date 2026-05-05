import JSZip from "jszip";
import type {
  SmartCheckinRequest,
  SmartCheckinRequestItem,
  SmartCheckinResponse,
  SmartCheckinItemStatus,
} from "../sdk/core.ts";
import {
  DEMO_BUNDLE,
  DEMO_COVERAGE,
  DEMO_PATIENT,
} from "./demo-data.ts";
import {
  buildQuestionnaireResponse,
  questionnaireReferenceForRequestItem,
  type QuestionnaireAnswerValue,
} from "./questionnaire.ts";

export type FhirResource = Record<string, unknown> & {
  resourceType?: string;
  id?: string;
};

export type ImportedProviderRecords = {
  provider: string;
  patientDisplayName?: string;
  patientBirthDate?: string;
  fetchedAt?: string;
  fhir: Record<string, FhirResource[]>;
  attachments: unknown[];
};

export type ImportedHealthRecords = {
  version: 1;
  importedAt: string;
  providers: ImportedProviderRecords[];
};

export type ImportedHealthRecordsSummary = {
  importedAt: string;
  providerCount: number;
  patientNames: string[];
  resourceCounts: Record<string, number>;
  totalResources: number;
  patientSummary: string;
  resourceSummary: string;
};

export type WalletItemAvailability =
  | "available"
  | "partially-available"
  | "unavailable"
  | "unsupported"
  | "error";

export type WalletCandidate = {
  id: string;
  label: string;
  subtitle: string;
  resourceType: string;
  sourceName: string;
  selectedByDefault: boolean;
  value: FhirResource;
};

export type RequestItemResolution = {
  itemId: string;
  availability: WalletItemAvailability;
  candidates: WalletCandidate[];
  matchSummary: string;
  detail?: string;
  statusIfShared?: SmartCheckinResponse["requestStatus"][number]["status"];
};

const DB_NAME = "smart-web-wallet";
const STORE_NAME = "wallet-state";
const IMPORT_KEY = "imported-health-records.normalized.json";
const US_CORE_CANONICAL = "http://hl7.org/fhir/us/core";
const BROAD_US_CORE_RESOURCE_TYPES = [
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
] as const;

export function bundledDemoRecords(): ImportedHealthRecords {
  return {
    version: 1,
    importedAt: new Date(0).toISOString(),
    providers: [
      {
        provider: "Bundled demo data",
        patientDisplayName: "Tony Stark",
        patientBirthDate: DEMO_PATIENT.birthDate,
        fhir: {
          Patient: [copyResource(DEMO_PATIENT)],
          Coverage: [copyResource(DEMO_COVERAGE)],
          Bundle: [copyResource(DEMO_BUNDLE)],
          AllergyIntolerance: [copyResource(DEMO_BUNDLE.entry[0]!.resource)],
          MedicationStatement: [copyResource(DEMO_BUNDLE.entry[1]!.resource)],
          Condition: [copyResource(DEMO_BUNDLE.entry[2]!.resource)],
        },
        attachments: [],
      },
    ],
  };
}

export async function parseHealthSkillzFile(file: File): Promise<ImportedHealthRecords> {
  const bytes = new Uint8Array(await file.arrayBuffer());
  return parseHealthSkillzImport(bytes, file.name);
}

export async function parseHealthSkillzImport(
  bytes: Uint8Array,
  fileName?: string,
): Promise<ImportedHealthRecords> {
  const payloads =
    fileName?.toLowerCase().endsWith(".zip") || looksLikeZip(bytes)
      ? await parseZip(bytes)
      : parseJsonPayloads(new TextDecoder().decode(bytes));
  if (payloads.length === 0) {
    throw new Error(
      "No Health Skillz provider payloads found. Expected health-record-assistant/data/*.json or health-records.json.",
    );
  }
  return {
    version: 1,
    importedAt: new Date().toISOString(),
    providers: payloads.map(providerFromHealthSkillzPayload),
  };
}

export async function loadImportedRecords(): Promise<ImportedHealthRecords | undefined> {
  const text = await idbGet(IMPORT_KEY);
  return typeof text === "string" ? normalizeImportedRecords(JSON.parse(text)) : undefined;
}

export async function saveImportedRecords(records: ImportedHealthRecords): Promise<void> {
  await idbSet(IMPORT_KEY, JSON.stringify(records));
}

export async function clearImportedRecords(): Promise<void> {
  await idbDelete(IMPORT_KEY);
}

export function summarizeImportedRecords(
  records: ImportedHealthRecords,
): ImportedHealthRecordsSummary {
  const resourceCounts: Record<string, number> = {};
  for (const provider of records.providers) {
    for (const [resourceType, resources] of Object.entries(provider.fhir)) {
      resourceCounts[resourceType] = (resourceCounts[resourceType] ?? 0) + resources.length;
    }
  }
  const patientNames = unique(
    records.providers
      .map((p) => p.patientDisplayName)
      .filter((v): v is string => Boolean(v?.trim())),
  );
  const totalResources = Object.values(resourceCounts).reduce((a, b) => a + b, 0);
  return {
    importedAt: records.importedAt,
    providerCount: records.providers.length,
    patientNames,
    resourceCounts,
    totalResources,
    patientSummary:
      patientNames.length === 0
        ? "Patient identity not listed"
        : patientNames.length === 1
          ? patientNames[0]!
          : patientNames.slice(0, 2).join(", ") +
            (patientNames.length > 2 ? ` and ${patientNames.length - 2} more` : ""),
    resourceSummary: resourceSummary(resourceCounts),
  };
}

export function resolveImportedItems(
  records: ImportedHealthRecords,
  items: ReadonlyArray<SmartCheckinRequestItem>,
): RequestItemResolution[] {
  return items.map((item) => {
    const mediaType = item.accept.find((a) => a === "application/fhir+json");
    if (!mediaType) {
      return {
        itemId: item.id,
        availability: "unsupported",
        candidates: [],
        matchSummary: "This wallet cannot produce an accepted media type for this item.",
        statusIfShared: "unsupported",
      };
    }

    if (item.content.kind === "form.fhir") {
      const reference = questionnaireReferenceForRequestItem(item);
      return {
        itemId: item.id,
        availability: "available",
        candidates: [
          {
            id: `form-${item.id}`,
            label: "Form answers",
            subtitle: reference
              ? `QuestionnaireResponse for ${reference}`
              : "QuestionnaireResponse built from reviewed answers",
            resourceType: "QuestionnaireResponse",
            sourceName: "This wallet",
            selectedByDefault: true,
            value: { resourceType: "QuestionnaireResponse", id: `${item.id}-response` },
          },
        ],
        matchSummary: item.content.questionnaire
          ? "Form can be completed now"
          : "Referenced form can be acknowledged",
        detail: item.content.questionnaire
          ? "Review and edit the form answers before sharing."
          : "The verifier referenced a Questionnaire by URL but did not include the Questionnaire resource, so no inline fields can be rendered.",
      };
    }

    const resourceTypes = requestedResourceTypes(item);
    if (!resourceTypes) {
      return {
        itemId: item.id,
        availability: "unsupported",
        candidates: [],
        matchSummary: "This wallet cannot interpret this selector.",
        statusIfShared: "unsupported",
      };
    }

    const candidates = candidatesForResourceTypes(records, resourceTypes);
    if (candidates.length === 0) {
      return {
        itemId: item.id,
        availability: "unavailable",
        candidates: [],
        matchSummary: "No matching records found",
        detail: "Imported Health Skillz records are treated as a US Core-derived patient record set for this demo.",
        statusIfShared: "unavailable",
      };
    }

    return {
      itemId: item.id,
      availability: "available",
      candidates,
      matchSummary: `${candidates.length} matching ${candidates.length === 1 ? "record" : "records"} available`,
      detail: records.importedAt === new Date(0).toISOString()
        ? "Matched from bundled demo data."
        : "Matched from imported Health Skillz records.",
    };
  });
}

export function buildSmartResponseFromSelections(input: {
  request: SmartCheckinRequest;
  resolutions: ReadonlyArray<RequestItemResolution>;
  selectedItems: Readonly<Record<string, boolean>>;
  selectedCandidates: Readonly<Record<string, ReadonlySet<string>>>;
  questionnaireAnswers?: Readonly<Record<string, QuestionnaireAnswerValue>>;
  authored?: string;
}): SmartCheckinResponse {
  const artifacts: SmartCheckinResponse["artifacts"][number][] = [];
  const requestStatus: SmartCheckinItemStatus[] = [];
  const byItem = new Map(input.resolutions.map((r) => [r.itemId, r]));
  let counter = 0;

  for (const item of input.request.items) {
    const selected = input.selectedItems[item.id] !== false;
    if (!selected) {
      requestStatus.push({ item: item.id, status: "declined" });
      continue;
    }
    const resolution = byItem.get(item.id);
    if (!resolution || resolution.candidates.length === 0) {
      requestStatus.push({
        item: item.id,
        status: resolution?.statusIfShared ?? "unavailable",
        message: resolution?.matchSummary,
      });
      continue;
    }
    if (resolution.availability !== "available" && resolution.availability !== "partially-available") {
      requestStatus.push({
        item: item.id,
        status: resolution.statusIfShared ?? "unsupported",
        message: resolution.matchSummary,
      });
      continue;
    }
    const selectedIds =
      input.selectedCandidates[item.id] ??
      new Set(resolution.candidates.filter((c) => c.selectedByDefault).map((c) => c.id));
    const selectedCandidates = resolution.candidates.filter((c) => selectedIds.has(c.id));
    if (selectedCandidates.length === 0) {
      requestStatus.push({ item: item.id, status: "declined" });
      continue;
    }
    const value =
      item.content.kind === "form.fhir"
        ? buildQuestionnaireResponse({
            requestItem: item,
            answers: input.questionnaireAnswers ?? {},
            authored: input.authored,
          })
        : bundleFromResources(selectedCandidates.map((c) => c.value));
    artifacts.push({
      id: `art-${++counter}`,
      mediaType: "application/fhir+json",
      fulfills: [item.id],
      fhirVersion: input.request.fhirVersions?.[0] ?? "4.0.1",
      value,
    });
    requestStatus.push({
      item: item.id,
      status: selectedCandidates.length < resolution.candidates.length ? "partial" : "fulfilled",
    });
  }

  return {
    type: "smart-health-checkin-response",
    version: "1",
    requestId: input.request.id,
    artifacts,
    requestStatus,
  };
}

export function resourceTypeLabel(resourceType: string): string {
  const known: Record<string, string> = {
    AllergyIntolerance: "Allergies",
    CarePlan: "Care plans",
    CareTeam: "Care teams",
    DiagnosticReport: "Diagnostic reports",
    DocumentReference: "Documents",
    MedicationRequest: "Medication requests",
    MedicationStatement: "Medication statements",
    ServiceRequest: "Service requests",
    Coverage: "Coverage",
  };
  return known[resourceType] ?? `${splitCamelCase(resourceType)}s`;
}

function parseJsonPayloads(text: string): unknown[] {
  const trimmed = text.trim();
  if (!trimmed) throw new Error("Imported JSON is empty.");
  const parsed = JSON.parse(trimmed) as unknown;
  if (Array.isArray(parsed)) return parsed.filter(isRecord);
  if (isRecord(parsed)) {
    if (Array.isArray(parsed.providers)) return parsed.providers.filter(isRecord);
    if (isRecord(parsed.fhir)) return [parsed];
  }
  return [];
}

async function parseZip(bytes: Uint8Array): Promise<unknown[]> {
  const zip = await JSZip.loadAsync(bytes);
  const payloads: unknown[] = [];
  const files = Object.values(zip.files).filter(
    (entry) =>
      !entry.dir &&
      entry.name.endsWith(".json") &&
      isHealthSkillzDataEntry(entry.name),
  );
  for (const entry of files) {
    payloads.push(...parseJsonPayloads(await entry.async("text")));
  }
  return payloads;
}

function isHealthSkillzDataEntry(name: string): boolean {
  return name.startsWith("data/") ||
    name.includes("/data/") ||
    name.endsWith("/health-records.json") ||
    name === "health-records.json";
}

function providerFromHealthSkillzPayload(payload: unknown): ImportedProviderRecords {
  if (!isRecord(payload) || !isRecord(payload.fhir)) {
    throw new Error("Health Skillz provider payload is missing fhir.");
  }
  const fhir: Record<string, FhirResource[]> = {};
  for (const [sourceType, value] of Object.entries(payload.fhir)) {
    if (!Array.isArray(value)) continue;
    for (const raw of value) {
      if (!isRecord(raw)) continue;
      const resource = copyResource(raw);
      const resourceType =
        typeof resource.resourceType === "string" && resource.resourceType
          ? resource.resourceType
          : sourceType;
      resource.resourceType = resourceType;
      (fhir[resourceType] ??= []).push(resource);
    }
  }
  if (!Object.values(fhir).some((resources) => resources.length > 0)) {
    throw new Error("Health Skillz provider payload has no FHIR resources.");
  }
  return {
    provider: stringValue(payload.provider) || stringValue(payload.name) || "Imported records",
    patientDisplayName: stringValue(payload.patientDisplayName),
    patientBirthDate: stringValue(payload.patientBirthDate),
    fetchedAt: stringValue(payload.fetchedAt) || stringValue(payload.connectedAt),
    fhir,
    attachments: Array.isArray(payload.attachments) ? payload.attachments : [],
  };
}

function normalizeImportedRecords(raw: unknown): ImportedHealthRecords {
  if (!isRecord(raw) || !Array.isArray(raw.providers)) {
    throw new Error("Stored imported records are malformed.");
  }
  return {
    version: 1,
    importedAt: stringValue(raw.importedAt) || new Date().toISOString(),
    providers: raw.providers.map(providerFromHealthSkillzPayload),
  };
}

function requestedResourceTypes(item: SmartCheckinRequestItem): Set<string> | undefined {
  if (item.content.kind !== "selection.fhir") return undefined;
  const requested = new Set<string>();
  for (const t of item.content.resourceTypes ?? []) requested.add(normalizeResourceType(t));
  for (const p of item.content.profiles ?? []) {
    for (const t of resourceTypesForProfile(p)) requested.add(t);
  }
  for (const family of item.content.profilesFrom ?? []) {
    if (family.substring(0, family.indexOf("|") >= 0 ? family.indexOf("|") : family.length).toLowerCase() === US_CORE_CANONICAL) {
      for (const t of BROAD_US_CORE_RESOURCE_TYPES) requested.add(t);
    }
  }
  if (requested.size > 0) return requested;

  const title = item.title.toLowerCase();
  if (title.includes("coverage") || title.includes("insurance")) return new Set(["Coverage"]);
  if (title.includes("plan")) return new Set(["InsurancePlan"]);
  if (title.includes("patient")) return new Set(["Patient"]);
  if (title.includes("clinical") || title.includes("history")) {
    return new Set(BROAD_US_CORE_RESOURCE_TYPES);
  }
  return new Set(BROAD_US_CORE_RESOURCE_TYPES);
}

function candidatesForResourceTypes(
  records: ImportedHealthRecords,
  resourceTypes: Set<string>,
): WalletCandidate[] {
  const candidates: WalletCandidate[] = [];
  records.providers.forEach((provider, providerIndex) => {
    for (const resourceType of resourceTypes) {
      (provider.fhir[resourceType] ?? []).forEach((resource, resourceIndex) => {
        candidates.push({
          id: `p${providerIndex}:${resourceType}:${resourceIndex}:${stringValue(resource.id) ?? ""}`,
          label: resourceLabel(provider, resource, resourceIndex),
          subtitle: resourceSubtitle(provider, resource),
          resourceType,
          sourceName: provider.provider,
          selectedByDefault: true,
          value: copyResource(resource),
        });
      });
    }
  });
  return candidates;
}

function resourceTypesForProfile(profile: string): Set<string> {
  const p = profile.split("|")[0]!.toLowerCase();
  if (p.includes("c4dic-coverage")) return new Set(["Coverage"]);
  if (p.includes("sbc-insurance-plan") || p.includes("c4dic-insuranceplan")) return new Set(["InsurancePlan"]);
  if (p.includes("us-core-patient")) return new Set(["Patient"]);
  if (p.includes("us-core-condition")) return new Set(["Condition"]);
  if (p.includes("us-core-allergyintolerance")) return new Set(["AllergyIntolerance"]);
  if (p.includes("us-core-medicationrequest")) return new Set(["MedicationRequest"]);
  if (p.includes("us-core-medicationstatement")) return new Set(["MedicationStatement"]);
  if (p.includes("us-core-immunization")) return new Set(["Immunization"]);
  if (p.includes("us-core-observation")) return new Set(["Observation"]);
  if (p.includes("us-core-diagnosticreport")) return new Set(["DiagnosticReport"]);
  if (p.includes("us-core-documentreference")) return new Set(["DocumentReference"]);
  if (p.includes("us-core-procedure")) return new Set(["Procedure"]);
  if (p.includes("us-core-encounter")) return new Set(["Encounter"]);
  if (p.includes("us-core-careplan")) return new Set(["CarePlan"]);
  if (p.includes("us-core-careteam")) return new Set(["CareTeam"]);
  if (p.includes("us-core-goal")) return new Set(["Goal"]);
  if (p.includes("us-core-device")) return new Set(["Device"]);
  if (p.includes("us-core-servicerequest")) return new Set(["ServiceRequest"]);
  return new Set();
}

function resourceLabel(provider: ImportedProviderRecords, resource: FhirResource, index: number): string {
  const resourceType = stringValue(resource.resourceType) || "Resource";
  const values = [
    firstHumanName(resource.name),
    typeSpecificLabel(provider, resourceType, resource),
    stringValue(resource.title),
    stringValue(resource.description),
    stringValue(resource.id),
  ];
  return values.find(Boolean) ?? `${resourceType} ${index + 1}`;
}

function typeSpecificLabel(
  provider: ImportedProviderRecords,
  resourceType: string,
  resource: FhirResource,
): string | undefined {
  switch (resourceType) {
    case "Coverage":
      return [
        coverageClass(resource, "plan")?.display,
        coverageClass(resource, "group")?.display,
        codeText(recordValue(resource.type)),
        firstReferenceDisplay(resource.payor),
      ].find(Boolean);
    case "MedicationRequest":
    case "MedicationStatement":
    case "MedicationDispense":
      return medicationLabel(provider, resource);
    case "Immunization":
      return codeText(recordValue(resource.vaccineCode));
    case "DiagnosticReport":
    case "Observation":
    case "Procedure":
    case "ServiceRequest":
      return codeText(recordValue(resource.code));
    case "DocumentReference":
      return codeText(recordValue(resource.type));
    case "Encounter":
      return firstCodeText(resource.type) ?? classText(resource.class);
    case "CarePlan":
    case "CareTeam":
      return firstCodeText(resource.category);
    case "Goal":
      return codeText(recordValue(resource.description));
    case "Specimen":
      return codeText(recordValue(resource.type));
    case "Location":
    case "Organization":
      return stringValue(resource.name);
    default:
      return codeText(recordValue(resource.code));
  }
}

function resourceSubtitle(provider: ImportedProviderRecords, resource: FhirResource): string {
  const resourceType = stringValue(resource.resourceType) || "FHIR resource";
  const parts = [resourceType];
  if (resourceType === "Coverage") {
    parts.push(...[
      stringValue(resource.status),
      firstReferenceDisplay(resource.payor)?.replace(/^/, "Payor: "),
      stringValue(resource.subscriberId)?.replace(/^/, "Subscriber: "),
      coverageClass(resource, "group")?.display.replace(/^/, "Group: "),
      coverageClass(resource, "plan")?.display.replace(/^/, "Plan: "),
      periodSummary(recordValue(resource.period)),
    ].filter((v): v is string => Boolean(v)));
  } else if (resourceType === "MedicationRequest" || resourceType === "MedicationStatement" || resourceType === "MedicationDispense") {
    parts.push(...genericSubtitle(resource));
    const requester = recordValue(resource.requester);
    if (requester) {
      const display = stringValue(requester.display);
      if (display) parts.push(`Requester: ${display}`);
    }
    const ref = recordValue(resource.medicationReference);
    if (ref && !medicationLabel(provider, resource)) {
      const reference = stringValue(ref.reference);
      if (reference) parts.push(reference);
    }
  } else {
    parts.push(...genericSubtitle(resource));
    const value = valueSummary(resource);
    if (value) parts.push(value);
  }
  return unique(parts.filter(Boolean)).join(" · ");
}

function medicationLabel(provider: ImportedProviderRecords, resource: FhirResource): string | undefined {
  const direct = codeText(recordValue(resource.medicationCodeableConcept));
  if (direct) return direct;
  const reference = recordValue(resource.medicationReference);
  const display = stringValue(reference?.display);
  if (display) return display;
  const medication = referencedResource(provider, reference);
  return medication ? codeText(recordValue(medication.code)) : undefined;
}

function genericSubtitle(resource: FhirResource): string[] {
  return [
    stringValue(resource.status),
    codeText(recordValue(resource.clinicalStatus)),
    stringValue(resource.recordedDate),
    stringValue(resource.effectiveDateTime),
    stringValue(resource.issued),
    stringValue(resource.authoredOn),
    stringValue(resource.occurrenceDateTime),
    stringValue(resource.performedDateTime),
    stringValue(resource.date),
  ].filter((v): v is string => Boolean(v));
}

function bundleFromResources(resources: FhirResource[]): FhirResource {
  return {
    resourceType: "Bundle",
    type: "collection",
    entry: resources.map((resource) => ({ resource: copyResource(resource) })),
  };
}

function copyResource(value: unknown): FhirResource {
  return JSON.parse(JSON.stringify(value)) as FhirResource;
}

function normalizeResourceType(value: string): string {
  const trimmed = value.trim();
  return trimmed ? trimmed[0]!.toUpperCase() + trimmed.slice(1) : value;
}

function firstHumanName(value: unknown): string | undefined {
  const first = Array.isArray(value) ? recordValue(value[0]) : undefined;
  if (!first) return undefined;
  const text = stringValue(first.text);
  if (text) return text;
  const given = stringValues(first.given).join(" ");
  const family = stringValue(first.family) ?? "";
  return `${given} ${family}`.trim() || undefined;
}

function codeText(code: Record<string, unknown> | undefined): string | undefined {
  if (!code) return undefined;
  const text = stringValue(code.text);
  if (text) return text;
  const coding = Array.isArray(code.coding) ? code.coding : [];
  for (const item of coding) {
    const c = recordValue(item);
    const display = stringValue(c?.display);
    if (display) return display;
    const rawCode = stringValue(c?.code);
    if (rawCode) return rawCode;
  }
  return undefined;
}

function firstCodeText(value: unknown): string | undefined {
  return (Array.isArray(value) ? value : [])
    .map((v) => codeText(recordValue(v)))
    .find(Boolean);
}

function classText(value: unknown): string | undefined {
  const code = recordValue(value);
  return stringValue(code?.display) ?? stringValue(code?.code);
}

function coverageClass(resource: FhirResource, code: string): { name?: string; value?: string; display: string } | undefined {
  const classes = Array.isArray(resource.class) ? resource.class : [];
  for (const item of classes) {
    const c = recordValue(item);
    if (coverageClassCode(recordValue(c?.type)) !== code) continue;
    const name = stringValue(c?.name);
    const value = stringValue(c?.value);
    const display = [name, value].filter(Boolean).join(" ");
    return { name, value, display: display || name || value || "" };
  }
  return undefined;
}

function coverageClassCode(type: Record<string, unknown> | undefined): string | undefined {
  const coding = Array.isArray(type?.coding) ? type.coding : [];
  for (const item of coding) {
    const code = stringValue(recordValue(item)?.code)?.toLowerCase();
    if (code) return code;
  }
  return undefined;
}

function firstReferenceDisplay(value: unknown): string | undefined {
  const refs = Array.isArray(value) ? value : [];
  for (const item of refs) {
    const ref = recordValue(item);
    const display = stringValue(ref?.display);
    if (display) return display;
    const reference = stringValue(ref?.reference);
    if (reference) return reference.split("/").pop();
  }
  return undefined;
}

function referencedResource(
  provider: ImportedProviderRecords,
  reference: Record<string, unknown> | undefined,
): FhirResource | undefined {
  const ref = stringValue(reference?.reference);
  if (!ref) return undefined;
  const parts = ref.split("/");
  const resourceType = parts.at(-2);
  const id = parts.at(-1);
  if (!resourceType || !id) return undefined;
  return (provider.fhir[resourceType] ?? []).find((r) => r.id === id);
}

function periodSummary(period: Record<string, unknown> | undefined): string | undefined {
  if (!period) return undefined;
  const start = stringValue(period.start);
  const end = stringValue(period.end);
  if (start && end) return `${start} to ${end}`;
  if (start) return `Since ${start}`;
  if (end) return `Until ${end}`;
  return undefined;
}

function valueSummary(resource: FhirResource): string | undefined {
  const quantity = recordValue(resource.valueQuantity);
  if (quantity) {
    const value = stringValue(quantity.value);
    const unit = stringValue(quantity.unit) ?? stringValue(quantity.code);
    return [value, unit].filter(Boolean).join(" ") || undefined;
  }
  return stringValue(resource.valueString) ??
    codeText(recordValue(resource.valueCodeableConcept)) ??
    (Array.isArray(resource.component) && resource.component.length > 0
      ? `${resource.component.length} component values`
      : undefined);
}

function resourceSummary(resourceCounts: Record<string, number>, limit = 5): string {
  const entries = Object.entries(resourceCounts);
  if (entries.length === 0) return "No FHIR resources";
  return entries
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, limit)
    .map(([resourceType, count]) => `${resourceType} ${count}`)
    .join(", ");
}

function splitCamelCase(value: string): string {
  return value
    .replace(/(?<=[a-z])(?=[A-Z])/g, " ")
    .toLowerCase()
    .replace(/^./, (c) => c.toUpperCase());
}

function looksLikeZip(bytes: Uint8Array): boolean {
  return bytes.length >= 4 && bytes[0] === 0x50 && bytes[1] === 0x4b;
}

function stringValues(value: unknown): string[] {
  if (typeof value === "string") return value ? [value] : [];
  if (Array.isArray(value)) return value.flatMap(stringValues);
  if (isRecord(value) && typeof value.canonical === "string") return [value.canonical];
  return [];
}

function stringValue(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value : undefined;
}

function recordValue(value: unknown): Record<string, unknown> | undefined {
  return isRecord(value) ? value : undefined;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function unique(values: string[]): string[] {
  return [...new Set(values)];
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      request.result.createObjectStore(STORE_NAME);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("failed to open IndexedDB"));
  });
}

async function idbGet(key: string): Promise<unknown> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const request = tx.objectStore(STORE_NAME).get(key);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("failed to read IndexedDB"));
    tx.oncomplete = () => db.close();
  });
}

async function idbSet(key: string, value: string): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).put(value, key);
    tx.oncomplete = () => {
      db.close();
      resolve();
    };
    tx.onerror = () => reject(tx.error ?? new Error("failed to write IndexedDB"));
  });
}

async function idbDelete(key: string): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).delete(key);
    tx.oncomplete = () => {
      db.close();
      resolve();
    };
    tx.onerror = () => reject(tx.error ?? new Error("failed to delete IndexedDB"));
  });
}

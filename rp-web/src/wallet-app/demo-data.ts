// Bundled holder data for the web-wallet app. Used only when the browser has
// no imported Health Skillz records.

import type { SmartCheckinResponse } from "../sdk/core.ts";

export type DemoArtifactSummary = {
  id: string;
  label: string;
  resourceTypes: string[];
};

export const DEMO_PATIENT = {
  resourceType: "Patient",
  id: "demo-patient",
  name: [{ family: "Stark", given: ["Tony"] }],
  gender: "male",
  birthDate: "1970-05-29",
  telecom: [{ system: "phone", value: "+1-555-0100" }],
  address: [
    {
      line: ["10880 Malibu Point"],
      city: "Malibu",
      state: "CA",
      postalCode: "90265",
      country: "US",
    },
  ],
} as const;

export const DEMO_COVERAGE = {
  resourceType: "Coverage",
  id: "demo-coverage",
  status: "active",
  beneficiary: { reference: "Patient/demo-patient" },
  payor: [{ display: "Stark Industries Health Plan" }],
  subscriberId: "STK-0001-A",
} as const;

export const DEMO_BUNDLE = {
  resourceType: "Bundle",
  id: "demo-bundle",
  type: "collection",
  entry: [
    {
      resource: {
        resourceType: "AllergyIntolerance",
        id: "ai-1",
        clinicalStatus: {
          coding: [
            {
              system:
                "http://terminology.hl7.org/CodeSystem/allergyintolerance-clinical",
              code: "active",
            },
          ],
        },
        code: { text: "Latex" },
        patient: { reference: "Patient/demo-patient" },
      },
    },
    {
      resource: {
        resourceType: "MedicationStatement",
        id: "ms-1",
        status: "active",
        medicationCodeableConcept: { text: "Atorvastatin 10 mg oral tablet" },
        subject: { reference: "Patient/demo-patient" },
      },
    },
    {
      resource: {
        resourceType: "Condition",
        id: "cond-1",
        clinicalStatus: {
          coding: [
            {
              system:
                "http://terminology.hl7.org/CodeSystem/condition-clinical",
              code: "active",
            },
          ],
        },
        code: { text: "Essential hypertension" },
        subject: { reference: "Patient/demo-patient" },
      },
    },
  ],
} as const;

/**
 * Build a SMART response that fulfills as many requested items as possible
 * from the demo dataset. Items that can't be matched return `unsupported`.
 */
export function buildDemoSmartResponse(input: {
  request: {
    id: string;
    items: ReadonlyArray<{
      id: string;
      title: string;
      content: { kind: string; resourceTypes?: ReadonlyArray<string> };
      accept: ReadonlyArray<string>;
    }>;
  };
}): SmartCheckinResponse {
  const artifacts: SmartCheckinResponse["artifacts"][number][] = [];
  const status: SmartCheckinResponse["requestStatus"][number][] = [];
  let counter = 0;

  for (const item of input.request.items) {
    const acceptsFhir = item.accept.includes("application/fhir+json");
    if (!acceptsFhir) {
      status.push({ item: item.id, status: "unsupported", message: "demo holder only emits application/fhir+json" });
      continue;
    }

    if (item.content.kind === "selection.fhir") {
      const requestedTypes = item.content.resourceTypes;
      const value = pickResourceForItem(item, requestedTypes);
      if (value) {
        const id = `art-${++counter}`;
        artifacts.push({
          id,
          mediaType: "application/fhir+json",
          fulfills: [item.id],
          fhirVersion: "4.0.1",
          value,
        });
        status.push({ item: item.id, status: "fulfilled" });
        continue;
      }
      status.push({ item: item.id, status: "unavailable" });
      continue;
    }

    // form.fhir not handled in v1.
    status.push({
      item: item.id,
      status: "unsupported",
      message: "demo wallet does not implement form.fhir",
    });
  }

  return {
    type: "smart-health-checkin-response",
    version: "1",
    requestId: input.request.id,
    artifacts,
    requestStatus: status,
  };
}

function pickResourceForItem(
  item: { title: string },
  requestedTypes?: ReadonlyArray<string>,
): unknown {
  const lower = item.title.toLowerCase();
  if (requestedTypes && requestedTypes.length > 0) {
    if (requestedTypes.includes("Patient")) return DEMO_PATIENT;
    if (requestedTypes.includes("Coverage")) return DEMO_COVERAGE;
    if (requestedTypes.includes("Bundle")) return DEMO_BUNDLE;
    if (requestedTypes.some((t) => ["AllergyIntolerance", "Condition", "MedicationStatement"].includes(t))) {
      return DEMO_BUNDLE;
    }
    return undefined;
  }
  if (lower.includes("patient")) return DEMO_PATIENT;
  if (lower.includes("coverage") || lower.includes("insurance")) return DEMO_COVERAGE;
  if (lower.includes("history") || lower.includes("bundle") || lower.includes("clinical")) {
    return DEMO_BUNDLE;
  }
  // Default: hand over the patient if nothing else matches.
  return DEMO_PATIENT;
}

export function summarizeArtifacts(
  artifacts: ReadonlyArray<{
    id: string;
    fulfills: ReadonlyArray<string>;
    value: unknown;
  }>,
): DemoArtifactSummary[] {
  return artifacts.map((a) => ({
    id: a.id,
    label: labelArtifact(a.value),
    resourceTypes: extractResourceTypes(a.value),
  }));
}

function labelArtifact(value: unknown): string {
  if (typeof value !== "object" || value === null) return "unknown";
  const v = value as { resourceType?: unknown; type?: unknown; entry?: unknown };
  if (v.resourceType === "Bundle" && Array.isArray(v.entry)) {
    return `Bundle (${v.entry.length} resources)`;
  }
  if (typeof v.resourceType === "string") return v.resourceType;
  return "unknown";
}

function extractResourceTypes(value: unknown): string[] {
  if (typeof value !== "object" || value === null) return [];
  const v = value as { resourceType?: unknown; entry?: unknown };
  if (v.resourceType === "Bundle" && Array.isArray(v.entry)) {
    const out: string[] = [];
    for (const e of v.entry) {
      const r = (e as { resource?: { resourceType?: unknown } }).resource;
      if (r && typeof r.resourceType === "string") out.push(r.resourceType);
    }
    return out;
  }
  if (typeof v.resourceType === "string") return [v.resourceType];
  return [];
}

import { describe, expect, test } from "bun:test";
import JSZip from "jszip";
import type { SmartCheckinRequest } from "../sdk/core.ts";
import {
  buildSmartResponseFromSelections,
  bundledDemoRecords,
  parseHealthSkillzImport,
  resolveImportedItems,
  summarizeImportedRecords,
} from "./imported-records.ts";

describe("web wallet imported-records model", () => {
  test("imports Health Skillz ZIP data entries", async () => {
    const zip = new JSZip();
    zip.file("health-record-assistant/data/epic-sandbox.json", JSON.stringify(providerPayload()));
    const bytes = new Uint8Array(await zip.generateAsync({ type: "uint8array" }));

    const records = await parseHealthSkillzImport(bytes, "download.zip");
    const summary = summarizeImportedRecords(records);

    expect(summary.providerCount).toBe(1);
    expect(summary.totalResources).toBe(5);
    expect(summary.resourceCounts.Patient).toBe(1);
    expect(summary.resourceCounts.Condition).toBe(2);
    expect(summary.resourceCounts.Observation).toBe(1);
    expect(summary.patientSummary).toBe("Camila Lopez");
  });

  test("profiles and profilesFrom are additive selectors", async () => {
    const records = await parseHealthSkillzImport(
      new TextEncoder().encode(JSON.stringify(providerPayload())),
      "health-records.json",
    );
    const request = requestFor({
      profilesFrom: ["http://hl7.org/fhir/us/core"],
      profiles: [
        "http://hl7.org/fhir/us/core/StructureDefinition/us-core-condition-problems-health-concerns",
      ],
    });

    const resolution = resolveImportedItems(records, request.items)[0]!;

    expect(resolution.matchSummary).toBe("5 matching records available");
    expect(resolution.candidates.some((c) => c.resourceType === "Condition")).toBe(true);
    expect(resolution.candidates.some((c) => c.resourceType === "Observation")).toBe(true);
  });

  test("builds a Bundle artifact from selected imported candidates", async () => {
    const records = await parseHealthSkillzImport(
      new TextEncoder().encode(JSON.stringify(providerPayload())),
      "health-records.json",
    );
    const request = requestFor({ resourceTypes: ["Condition"] });
    const resolution = resolveImportedItems(records, request.items)[0]!;
    const response = buildSmartResponseFromSelections({
      request,
      resolutions: [resolution],
      selectedItems: { clinical: true },
      selectedCandidates: {
        clinical: new Set([resolution.candidates[0]!.id]),
      },
    });

    expect(response.requestStatus[0]!.status).toBe("partial");
    const bundle = response.artifacts[0]!.value as {
      resourceType: string;
      entry: Array<{ resource: { id: string } }>;
    };
    expect(bundle.resourceType).toBe("Bundle");
    expect(bundle.entry).toHaveLength(1);
    expect(bundle.entry[0]!.resource.id).toBe("condition-1");
  });

  test("renders form.fhir as a QuestionnaireResponse artifact", async () => {
    const request: SmartCheckinRequest = {
      type: "smart-health-checkin-request",
      version: "1",
      id: "form-test",
      fhirVersions: ["4.0.1"],
      items: [
        {
          id: "intake",
          title: "Intake form",
          content: {
            kind: "form.fhir",
            questionnaire: {
              resourceType: "Questionnaire",
              id: "migraine",
              url: "https://example.org/fhir/Questionnaire/migraine",
              status: "active",
              item: [
                { linkId: "wellbeing", text: "How are you?", type: "text" },
                { linkId: "headache", text: "Headache today?", type: "boolean" },
                {
                  linkId: "severity",
                  text: "Pain severity",
                  type: "integer",
                  enableWhen: [{ question: "headache", operator: "=", answerBoolean: true }],
                },
                {
                  linkId: "started",
                  text: "When did symptoms start?",
                  type: "date",
                },
              ],
            },
          },
          accept: ["application/fhir+json"],
        },
      ],
    };

    const resolution = resolveImportedItems(bundledDemoRecords(), request.items)[0]!;
    const response = buildSmartResponseFromSelections({
      request,
      resolutions: [resolution],
      selectedItems: { intake: true },
      selectedCandidates: { intake: new Set(["form-intake"]) },
      questionnaireAnswers: {
        "intake::wellbeing": "Improving",
        "intake::headache": true,
        "intake::severity": 6,
        "intake::started": "2026-05",
      },
      authored: "2026-05-05T00:00:00.000Z",
    });

    expect(resolution.matchSummary).toBe("Form can be completed now");
    expect(response.requestStatus[0]!.status).toBe("fulfilled");
    const qr = response.artifacts[0]!.value as {
      resourceType: string;
      questionnaire: string;
      item: Array<{ linkId: string; answer?: Array<Record<string, unknown>> }>;
    };
    expect(qr.resourceType).toBe("QuestionnaireResponse");
    expect(qr.questionnaire).toBe("https://example.org/fhir/Questionnaire/migraine");
    expect(qr.item.find((item) => item.linkId === "headache")?.answer?.[0]?.valueBoolean).toBe(true);
    expect(qr.item.find((item) => item.linkId === "severity")?.answer?.[0]?.valueInteger).toBe(6);
    expect(qr.item.find((item) => item.linkId === "started")?.answer?.[0]?.valueDate).toBe("2026-05");
  });
});

function requestFor(content: {
  resourceTypes?: string[];
  profiles?: string[];
  profilesFrom?: string[];
}): SmartCheckinRequest {
  return {
    type: "smart-health-checkin-request",
    version: "1",
    id: "import-test",
    items: [
      {
        id: "clinical",
        title: "Clinical summary",
        content: {
          kind: "selection.fhir",
          ...content,
        },
        accept: ["application/fhir+json"],
      },
    ],
  };
}

function providerPayload() {
  return {
    provider: "Epic Sandbox",
    patientDisplayName: "Camila Lopez",
    patientBirthDate: "1979-06-12",
    fhir: {
      Patient: [
        {
          resourceType: "Patient",
          id: "patient-1",
          name: [{ family: "Lopez", given: ["Camila"] }],
        },
      ],
      Condition: [
        {
          resourceType: "Condition",
          id: "condition-1",
          code: { text: "Asthma" },
        },
        {
          resourceType: "Condition",
          id: "condition-2",
          code: { text: "Migraine" },
        },
      ],
      Observation: [
        {
          resourceType: "Observation",
          id: "observation-1",
          code: { text: "Blood pressure" },
        },
      ],
      MedicationStatement: [
        {
          resourceType: "MedicationStatement",
          id: "medication-1",
          medicationCodeableConcept: { text: "Metformin" },
        },
      ],
    },
  };
}

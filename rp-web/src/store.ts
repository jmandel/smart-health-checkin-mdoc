import { create } from "zustand";
import {
  validateSmartCheckinRequest,
  type SmartCheckinRequest,
} from "./sdk/core.ts";
import {
  detectDcApiSupport,
  type DcApiSupport,
} from "./sdk/dcapi-verifier.ts";
import { emit, getRunId, newRunId } from "./debug/events.ts";

export type Preset = {
  id: string;
  label: string;
  description: string;
  request: SmartCheckinRequest;
};

const INTAKE_QUESTIONNAIRE = {
  resourceType: "Questionnaire",
  title: "Migraine Check-in",
  status: "active",
  item: [
    {
      linkId: "wellbeing",
      text: "How have you been feeling since your last visit?",
      type: "text",
    },
    {
      linkId: "headache",
      text: "Are you experiencing a headache today?",
      type: "boolean",
    },
    {
      linkId: "severity",
      text: "Pain severity (0-10)",
      type: "integer",
      extension: [
        {
          url: "http://hl7.org/fhir/StructureDefinition/minValue",
          valueInteger: 0,
        },
        {
          url: "http://hl7.org/fhir/StructureDefinition/maxValue",
          valueInteger: 10,
        },
      ],
    },
    {
      linkId: "started",
      text: "When did your symptoms start?",
      type: "date",
    },
  ],
};

const ACCEPT_FHIR = ["application/fhir+json"];
const ACCEPT_SHC_OR_FHIR = ["application/smart-health-card", "application/fhir+json"];

const ALL_OF_THE_ABOVE: SmartCheckinRequest = {
  type: "smart-health-checkin-request",
  version: "1",
  id: "demo-all-of-the-above",
  purpose: "Clinic check-in",
  fhirVersions: ["4.0.1"],
  items: [
    {
      id: "patient",
      title: "Patient demographics",
      summary: "Demographics for check-in",
      required: true,
      content: {
        kind: "fhir.resources",
        profiles: ["http://hl7.org/fhir/us/core/StructureDefinition/us-core-patient"],
      },
      accept: ACCEPT_FHIR,
    },
    {
      id: "insurance",
      title: "Insurance card",
      summary: "Insurance card for billing",
      required: true,
      content: {
        kind: "fhir.resources",
        profiles: [
          "http://hl7.org/fhir/us/insurance-card/StructureDefinition/C4DIC-Coverage",
        ],
      },
      accept: ACCEPT_FHIR,
    },
    {
      id: "ips",
      title: "Health summary",
      summary: "Problems, medications, allergies, and immunizations",
      content: {
        kind: "fhir.resources",
        profiles: ["http://hl7.org/fhir/uv/ips/StructureDefinition/Bundle-uv-ips"],
      },
      accept: ACCEPT_SHC_OR_FHIR,
    },
    {
      id: "intake",
      title: "Intake form",
      content: {
        kind: "questionnaire",
        questionnaire: INTAKE_QUESTIONNAIRE,
      },
      accept: ACCEPT_FHIR,
    },
  ],
};

export const PRESETS: ReadonlyArray<Preset> = [
  {
    id: "all-of-the-above",
    label: "All of the above",
    description:
      "Patient + Coverage + IPS (SHC-signed) + an inline intake Questionnaire.",
    request: ALL_OF_THE_ABOVE,
  },
  {
    id: "patient-only",
    label: "Patient (US Core)",
    description: "Single FHIR profile request — Demographics for check-in.",
    request: {
      type: "smart-health-checkin-request",
      version: "1",
      id: "demo-patient-only",
      purpose: "Clinic check-in",
      fhirVersions: ["4.0.1"],
      items: [
        {
          id: "patient",
          title: "Patient demographics",
          summary: "Demographics for check-in",
          required: true,
          content: {
            kind: "fhir.resources",
            profiles: ["http://hl7.org/fhir/us/core/StructureDefinition/us-core-patient"],
          },
          accept: ACCEPT_FHIR,
        },
      ],
    },
  },
  {
    id: "patient-and-coverage",
    label: "Patient + Coverage",
    description: "Demographics plus an insurance card (C4DIC).",
    request: {
      type: "smart-health-checkin-request",
      version: "1",
      id: "demo-patient-and-coverage",
      purpose: "Clinic check-in",
      fhirVersions: ["4.0.1"],
      items: [
        {
          id: "patient",
          title: "Patient demographics",
          required: true,
          content: {
            kind: "fhir.resources",
            profiles: ["http://hl7.org/fhir/us/core/StructureDefinition/us-core-patient"],
          },
          accept: ACCEPT_FHIR,
        },
        {
          id: "insurance",
          title: "Insurance card",
          summary: "Insurance card from your wallet",
          required: false,
          content: {
            kind: "fhir.resources",
            profiles: [
              "http://hl7.org/fhir/us/insurance-card/StructureDefinition/C4DIC-Coverage",
            ],
          },
          accept: ACCEPT_FHIR,
        },
      ],
    },
  },
  {
    id: "questionnaire-inline",
    label: "Inline Questionnaire",
    description: "A small inline FHIR Questionnaire to fill out.",
    request: {
      type: "smart-health-checkin-request",
      version: "1",
      id: "demo-questionnaire-inline",
      purpose: "Clinic check-in",
      fhirVersions: ["4.0.1"],
      items: [
        {
          id: "intake",
          title: "Intake form",
          content: {
            kind: "questionnaire",
            questionnaire: INTAKE_QUESTIONNAIRE,
          },
          accept: ACCEPT_FHIR,
        },
      ],
    },
  },
];

type State = {
  presetId: string;
  requestText: string;
  validation: { ok: true } | { ok: false; error: string };
  dcApi: DcApiSupport;
  runId: string;

  selectPreset: (id: string) => void;
  setRequestText: (text: string) => void;
  resetRunId: () => void;
};

const firstPreset = PRESETS[0]!;
const initialText = JSON.stringify(firstPreset.request, null, 2);

export const useStore = create<State>((set) => ({
  presetId: firstPreset.id,
  requestText: initialText,
  validation: { ok: true },
  dcApi: detectDcApiSupport(),
  runId: getRunId(),

  selectPreset: (id) => {
    const p = PRESETS.find((x) => x.id === id);
    if (!p) return;
    const text = JSON.stringify(p.request, null, 2);
    emit("PRESET_SELECTED", { presetId: p.id });
    set({ presetId: p.id, requestText: text, validation: { ok: true } });
  },

  setRequestText: (text) => {
    let validation: State["validation"];
    try {
      const parsed = JSON.parse(text);
      const r = validateSmartCheckinRequest(parsed);
      validation = r.ok ? { ok: true } : { ok: false, error: r.error };
    } catch (e) {
      validation = {
        ok: false,
        error: e instanceof Error ? e.message : "JSON parse error",
      };
    }
    set({ requestText: text, validation });
  },

  resetRunId: () => {
    const id = newRunId();
    set({ runId: id });
  },
}));

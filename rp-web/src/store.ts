import { create } from "zustand";
import {
  validateSmartCheckinRequest,
  type SmartCheckinRequest,
} from "./protocol/index.ts";
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
      linkId: "headache",
      text: "Are you experiencing a headache today?",
      type: "boolean",
    },
    {
      linkId: "severity",
      text: "Pain severity (0-10)",
      type: "integer",
    },
    {
      linkId: "started",
      text: "When did your symptoms start?",
      type: "date",
    },
  ],
};

const ALL_OF_THE_ABOVE: SmartCheckinRequest = {
  version: "1",
  items: [
    {
      id: "patient",
      profile: "http://hl7.org/fhir/us/core/StructureDefinition/us-core-patient",
      required: true,
      description: "Demographics for check-in",
    },
    {
      id: "insurance",
      profile:
        "http://hl7.org/fhir/us/insurance-card/StructureDefinition/C4DIC-Coverage",
      required: true,
      description: "Insurance card",
    },
    {
      id: "ips",
      profile: "http://hl7.org/fhir/uv/ips/StructureDefinition/Bundle-uv-ips",
      signing: ["shc_v1", "none"],
      description: "International Patient Summary (problems, meds, allergies, immunizations)",
    },
    {
      id: "intake",
      description: "Intake form",
      questionnaire: INTAKE_QUESTIONNAIRE,
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
      version: "1",
      items: [
        {
          id: "patient",
          profile: "http://hl7.org/fhir/us/core/StructureDefinition/us-core-patient",
          required: true,
          description: "Demographics for check-in",
        },
      ],
    },
  },
  {
    id: "patient-and-coverage",
    label: "Patient + Coverage",
    description: "Demographics plus an insurance card (C4DIC).",
    request: {
      version: "1",
      items: [
        {
          id: "patient",
          profile: "http://hl7.org/fhir/us/core/StructureDefinition/us-core-patient",
          required: true,
        },
        {
          id: "insurance",
          profile:
            "http://hl7.org/fhir/us/insurance-card/StructureDefinition/C4DIC-Coverage",
          required: false,
          description: "Insurance card from your wallet",
        },
      ],
    },
  },
  {
    id: "questionnaire-inline",
    label: "Inline Questionnaire",
    description: "A small inline FHIR Questionnaire to fill out.",
    request: {
      version: "1",
      items: [
        {
          id: "intake",
          questionnaire: INTAKE_QUESTIONNAIRE,
        },
      ],
    },
  },
];

export type DcApiSupport =
  | { state: "checking" }
  | { state: "supported" }
  | { state: "unsupported"; reason: string };

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

function detectDcApi(): DcApiSupport {
  if (typeof navigator === "undefined") {
    return { state: "unsupported", reason: "no navigator (SSR?)" };
  }
  // Chrome 141+ exposes navigator.credentials.get with a `digital` option.
  // We can't feature-detect the option key without calling it, but we can at
  // least require navigator.credentials to exist and be a CredentialsContainer.
  const cc = (navigator as Navigator & { credentials?: unknown }).credentials;
  if (!cc || typeof (cc as { get?: unknown }).get !== "function") {
    return {
      state: "unsupported",
      reason: "navigator.credentials.get is not available",
    };
  }
  // Heuristic: Chrome 141+ ships a global `IdentityCredential` and/or
  // `DigitalCredential`. Treat presence of either as a positive signal,
  // absence as not-yet-supported.
  const w = window as unknown as {
    DigitalCredential?: unknown;
    IdentityCredential?: unknown;
  };
  if (!w.DigitalCredential && !w.IdentityCredential) {
    return {
      state: "unsupported",
      reason: "no DigitalCredential / IdentityCredential global (need Chrome 141+ or Safari 26+)",
    };
  }
  return { state: "supported" };
}

const firstPreset = PRESETS[0]!;
const initialText = JSON.stringify(firstPreset.request, null, 2);

export const useStore = create<State>((set) => ({
  presetId: firstPreset.id,
  requestText: initialText,
  validation: { ok: true },
  dcApi: detectDcApi(),
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

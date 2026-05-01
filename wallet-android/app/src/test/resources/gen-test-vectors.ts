#!/usr/bin/env bun
/**
 * Generate cross-checked test vectors for the Android wallet.
 *
 * Source of truth: the TypeScript verifier protocol library
 * (`rp-web/src/protocol`). This script imports it directly, builds the byte
 * artifacts the wallet has to interoperate with, and serializes them as JSON
 * to `test-vectors.json` next to this file. Kotlin tests load the JSON at
 * runtime via the test classpath.
 *
 * Run from the repo root:
 *   bun run wallet-android/app/src/test/resources/gen-test-vectors.ts
 *
 * Re-run after the TS lib changes its byte output. Commit the regenerated
 * `test-vectors.json` so CI catches drift.
 */
import {
  buildDcapiSessionTranscript,
  buildDeviceRequestBytes,
  buildEncryptionInfoBytes,
} from "../../../../../rp-web/src/protocol/index.ts";

import type { SmartCheckinRequest } from "../../../../../rp-web/src/protocol/index.ts";

type Vector = {
  name: string;
  description: string;
  smartRequestJson: string;
  deviceRequestHex: string;
};

type RejectionVector = {
  name: string;
  description: string;
  deviceRequestHex: string;
};

/**
 * Real captured DeviceRequest bytes that the wallet **must** reject (right
 * `org-iso-mdoc` protocol envelope, wrong doctype). The path is relative
 * to this script's location.
 */
const REJECTION_HEX_FIXTURES = [
  {
    name: "mattr-safari-mdl",
    description:
      "captured Mattr Safari-UA request asking for org.iso.18013.5.1.mDL",
    relPath:
      "../../../../../fixtures/captures/2026-04-30-mattr-safari-org-iso-mdoc/device-request.cbor.hex",
  },
];

type SessionTranscriptVector = {
  name: string;
  origin: string;
  encryptionInfoHex: string;
  sessionTranscriptHex: string;
};

const SMART_REQUESTS: Array<{
  name: string;
  description: string;
  request: SmartCheckinRequest;
}> = [
  {
    name: "patient-only",
    description: "single FHIR profile request for US Core Patient",
    request: {
      type: "smart-health-checkin-request",
      version: "1",
      id: "test-patient-request",
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
          accept: ["application/fhir+json"],
        },
      ],
    },
  },
  {
    name: "patient-and-coverage",
    description: "Patient + CARIN Coverage",
    request: {
      type: "smart-health-checkin-request",
      version: "1",
      id: "test-patient-coverage-request",
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
          accept: ["application/fhir+json"],
        },
        {
          id: "coverage",
          title: "Coverage",
          content: {
            kind: "fhir.resources",
            profiles: [
              "http://hl7.org/fhir/us/insurance-card/StructureDefinition/C4DIC-Coverage",
            ],
          },
          accept: ["application/fhir+json"],
        },
      ],
    },
  },
  {
    name: "questionnaire-inline",
    description: "single inline FHIR Questionnaire",
    request: {
      type: "smart-health-checkin-request",
      version: "1",
      id: "test-questionnaire-request",
      purpose: "Clinic check-in",
      fhirVersions: ["4.0.1"],
      items: [
        {
          id: "intake",
          title: "Migraine Check-in",
          content: {
            kind: "questionnaire",
            questionnaire: {
              resourceType: "Questionnaire",
              title: "Migraine Check-in",
              status: "active",
              item: [
                { linkId: "headache", text: "Headache?", type: "boolean" },
              ],
            },
          },
          accept: ["application/fhir+json"],
        },
      ],
    },
  },
  {
    name: "all-of-the-above",
    description: "Patient + Coverage + IPS + inline Questionnaire",
    request: {
      type: "smart-health-checkin-request",
      version: "1",
      id: "test-all-of-the-above-request",
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
          accept: ["application/fhir+json"],
        },
        {
          id: "coverage",
          title: "Coverage",
          content: {
            kind: "fhir.resources",
            profiles: [
              "http://hl7.org/fhir/us/insurance-card/StructureDefinition/C4DIC-Coverage",
            ],
          },
          accept: ["application/fhir+json"],
        },
        {
          id: "ips",
          title: "International Patient Summary",
          content: {
            kind: "fhir.resources",
            profiles: ["http://hl7.org/fhir/uv/ips/StructureDefinition/Bundle-uv-ips"],
          },
          accept: ["application/smart-health-card", "application/fhir+json"],
        },
        {
          id: "intake",
          title: "Migraine Check-in",
          content: {
            kind: "questionnaire",
            questionnaire: {
              resourceType: "Questionnaire",
              title: "Migraine Check-in",
              status: "active",
              item: [
                { linkId: "headache", text: "Headache?", type: "boolean" },
              ],
            },
          },
          accept: ["application/fhir+json"],
        },
      ],
    },
  },
];

const SESSION_TRANSCRIPT_INPUTS = [
  {
    name: "fixed-nonce-example-com",
    origin: "https://example.com",
    nonce: hexToBytes(
      "000102030405060708090a0b0c0d0e0f101112131415161718191a1b1c1d1e1f",
    ),
    publicJwk: {
      kty: "EC",
      crv: "P-256",
      // Test public key (RFC 7515 Appendix A.3); paired with a public-only verifier in the TS lib.
      x: "DxiH5Q4Yx3UrukE2lWCErq8N8bqC9CHLLrAwLz5BmE0",
      y: "XtLM4-3h5o3HUH0MHVJV0kyq0iBlrBwlh8qEDMZ4-Pc",
      use: "enc",
      alg: "ECDH-ES",
      kid: "1",
    },
  },
  {
    name: "fixed-nonce-clinic-example",
    origin: "https://clinic.example",
    nonce: hexToBytes(
      "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
    ),
    publicJwk: {
      kty: "EC",
      crv: "P-256",
      x: "DxiH5Q4Yx3UrukE2lWCErq8N8bqC9CHLLrAwLz5BmE0",
      y: "XtLM4-3h5o3HUH0MHVJV0kyq0iBlrBwlh8qEDMZ4-Pc",
      use: "enc",
      alg: "ECDH-ES",
      kid: "1",
    },
  },
];

function hex(bytes: Uint8Array): string {
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

function hexToBytes(s: string): Uint8Array {
  if (s.length % 2 !== 0) throw new Error(`bad hex length: ${s.length}`);
  const out = new Uint8Array(s.length / 2);
  for (let i = 0; i < out.length; i++) {
    out[i] = Number.parseInt(s.slice(i * 2, i * 2 + 2), 16);
  }
  return out;
}

function base64UrlEncode(bytes: Uint8Array): string {
  let bin = "";
  for (let i = 0; i < bytes.length; i += 0x8000) {
    bin += String.fromCharCode(...bytes.slice(i, i + 0x8000));
  }
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

const vectors: Vector[] = SMART_REQUESTS.map((v) => {
  const smartRequestJson = JSON.stringify(v.request);
  const deviceRequestBytes = buildDeviceRequestBytes({ smartRequestJson });
  return {
    name: v.name,
    description: v.description,
    smartRequestJson,
    deviceRequestHex: hex(deviceRequestBytes),
  };
});

const sessionTranscriptVectors: SessionTranscriptVector[] = await Promise.all(
  SESSION_TRANSCRIPT_INPUTS.map(async (input) => {
    const encryptionInfoBytes = buildEncryptionInfoBytes({
      nonce: input.nonce,
      recipientPublicJwk: input.publicJwk,
    });
    const sessionTranscriptBytes = await buildDcapiSessionTranscript({
      origin: input.origin,
      encryptionInfo: encryptionInfoBytes,
    });
    return {
      name: input.name,
      origin: input.origin,
      encryptionInfoHex: hex(encryptionInfoBytes),
      encryptionInfoBase64Url: base64UrlEncode(encryptionInfoBytes),
      sessionTranscriptHex: hex(sessionTranscriptBytes),
    } as SessionTranscriptVector & { encryptionInfoBase64Url: string };
  }),
);

const rejectionVectors: RejectionVector[] = [];
for (const r of REJECTION_HEX_FIXTURES) {
  const filePath = new URL(r.relPath, import.meta.url).pathname;
  const text = await Bun.file(filePath).text();
  rejectionVectors.push({
    name: r.name,
    description: r.description,
    deviceRequestHex: text.trim(),
  });
}

const out = {
  generatedAt: new Date().toISOString(),
  source: "rp-web/src/protocol/index.ts via gen-test-vectors.ts",
  doctype: "org.smarthealthit.checkin.1",
  namespace: "org.smarthealthit.checkin",
  responseElement: "smart_health_checkin_response",
  requestInfoKey: "org.smarthealthit.checkin.request",
  requestVectors: vectors,
  rejectionVectors,
  sessionTranscriptVectors,
};

const here = new URL(".", import.meta.url).pathname;
await Bun.write(`${here}test-vectors.json`, JSON.stringify(out, null, 2) + "\n");
console.log(
  `wrote ${here}test-vectors.json — ${vectors.length} request, ${rejectionVectors.length} rejection, ${sessionTranscriptVectors.length} ST vectors`,
);

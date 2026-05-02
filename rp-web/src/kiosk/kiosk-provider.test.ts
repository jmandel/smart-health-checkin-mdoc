import { expect, test } from "bun:test";
import type { SmartCheckinRequest } from "../sdk/core.ts";
import { DEMO_KIOSK_CRYPTO_CONFIG } from "./demo-keys.ts";
import {
  completeKioskRequest,
  initiateKioskRequest,
  openKioskSubmission,
  resolveKioskRequest,
  type KioskRequestRow,
  type KioskSubmissionRow,
  type KioskTransportProvider,
} from "./kiosk-provider.ts";
import {
  type EncryptedPayload,
  type SubmissionPlaintext,
  type VerifiedKioskRequest,
} from "./protocol.ts";

const SMART_REQUEST: SmartCheckinRequest = {
  type: "smart-health-checkin-request",
  version: "1",
  id: "test-kiosk-request",
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
    {
      id: "intake",
      title: "Intake form",
      summary: "Migraine Check-in",
      content: {
        kind: "questionnaire",
        questionnaire: {
          resourceType: "Questionnaire",
          status: "active",
          title: "Migraine Check-in",
        },
      },
      accept: ["application/fhir+json"],
    },
  ],
};

test("kiosk provider workflow stores opaque requests and opens encrypted submissions", async () => {
  const provider = createMemoryProvider();
  const initiated = await initiateKioskRequest({
    provider,
    cryptoConfig: DEMO_KIOSK_CRYPTO_CONFIG,
    submitBaseUrl: "https://clinic.example/verifier/submit.html",
    smartRequest: SMART_REQUEST,
  });

  expect(initiated.submitUrl).toStartWith("https://clinic.example/verifier/submit.html#r=");
  expect(initiated.submitUrl).not.toContain("Migraine");

  const stored = await provider.readRequest(initiated.verified.payload.requestId);
  const storedRequestTransport = JSON.stringify(stored.encryptedRequest);
  expect(storedRequestTransport).not.toContain("Migraine");
  expect(storedRequestTransport).not.toContain("us-core-patient");

  const resolved = await resolveKioskRequest({
    provider,
    cryptoConfig: DEMO_KIOSK_CRYPTO_CONFIG,
    requestId: initiated.verified.payload.requestId,
  });
  expect(Object.prototype.hasOwnProperty.call(resolved.verified.payload.smartRequest, "request")).toBe(false);
  expect(Object.prototype.hasOwnProperty.call(resolved.verified.payload.smartRequest, "presetId")).toBe(false);
  expect(resolved.verified.payload.smartRequest.items[1]?.summary).toBe("Migraine Check-in");

  const completed = await completeKioskRequest({
    provider,
    request: resolved.verified,
    payload: {
      kind: "smart-health-checkin-response",
      smartResponse: {
        type: "smart-health-checkin-response",
        version: "1",
        requestId: SMART_REQUEST.id,
        artifacts: [],
        requestStatus: [
          { item: "patient", status: "unavailable" },
          { item: "intake", status: "fulfilled" },
        ],
      },
    },
  });

  const opened = await openKioskSubmission({
    provider,
    request: initiated.verified,
    desktopPrivateKey: initiated.desktopPrivateKey,
    row: completed.row,
  });
  expect(opened.plaintext.requestId).toBe(initiated.verified.payload.requestId);
  expect(opened.plaintext.payload.kind).toBe("smart-health-checkin-response");
  expect(JSON.stringify(opened.plaintext.payload)).not.toContain("dcapiResponse");
  expect(JSON.stringify(opened.plaintext.payload)).not.toContain("deviceResponse");
});

function createMemoryProvider(): KioskTransportProvider {
  const requests = new Map<string, KioskRequestRow>();
  const submissions: KioskSubmissionRow[] = [];
  const blobs = new Map<string, Uint8Array<ArrayBuffer>>();
  return {
    name: "memory",
    appId: "memory-app",
    configured: true,
    async writeRequest(input) {
      const row: KioskRequestRow = {
        id: crypto.randomUUID(),
        requestId: input.payload.requestId,
        encryptedRequest: input.encryptedRequest,
      };
      requests.set(row.requestId, row);
      return row;
    },
    async readRequest(requestId) {
      const row = requests.get(requestId);
      if (!row) throw new Error("missing request");
      return row;
    },
    async writeSubmission(input) {
      const row = memorySubmissionRow(input);
      const ciphertext = new Uint8Array(input.encrypted.ciphertext.byteLength);
      ciphertext.set(input.encrypted.ciphertext);
      blobs.set(row.storagePath, ciphertext);
      submissions.push(row);
      return row;
    },
    async downloadSubmissionBlob(row) {
      const blob = blobs.get(row.storagePath);
      if (!blob) throw new Error("missing blob");
      return blob;
    },
    useSubmissionRows(requestId) {
      return {
        rows: requestId ? submissions.filter((row) => row.requestId === requestId) : [],
        isLoading: false,
      };
    },
  };
}

function memorySubmissionRow(input: {
  request: VerifiedKioskRequest;
  plaintext: SubmissionPlaintext;
  encrypted: EncryptedPayload;
  totalPlaintextBytes: number;
}): KioskSubmissionRow {
  const submissionId = crypto.randomUUID();
  const storagePath = `submissions/${input.request.payload.requestId}/${submissionId}.bin`;
  return {
    id: crypto.randomUUID(),
    submissionId,
    requestId: input.request.payload.requestId,
    iv: input.encrypted.iv,
    storagePath,
    storageFileId: crypto.randomUUID(),
    phoneEphemeralPublicKeyJwk: input.encrypted.phoneEphemeralPublicKeyJwk,
  };
}

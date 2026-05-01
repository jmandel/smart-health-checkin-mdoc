#!/usr/bin/env bun
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import {
  base64UrlEncodeBytes,
  buildOrgIsoMdocRequest,
  hex,
  inspectOrgIsoMdocNavigatorArgument,
  type SmartCheckinRequest,
} from "../src/protocol/index.ts";

const OUT_ROOT = new URL("../../fixtures/dcapi-requests", import.meta.url).pathname;
const FIXTURE_ID = "ts-smart-checkin-basic";
const READER_AUTH_FIXTURE_ID = "ts-smart-checkin-readerauth";
const ORIGIN = "https://clinic.example";
const NONCE = new Uint8Array(Array.from({ length: 32 }, (_, i) => i));

const RECIPIENT_PUBLIC_JWK: JsonWebKey = {
  key_ops: [],
  ext: true,
  kty: "EC",
  x: "N5aDZqoKD8ogW-c16y2_2oNenFc49g0T1VdfZFg08wE",
  y: "ZkR0HDtltBt0DV-z7KYPTi4t1Pc79giukGsd9_62x-g",
  crv: "P-256",
};

const RECIPIENT_PRIVATE_JWK: JsonWebKey = {
  key_ops: ["deriveBits"],
  ext: true,
  kty: "EC",
  x: "N5aDZqoKD8ogW-c16y2_2oNenFc49g0T1VdfZFg08wE",
  y: "ZkR0HDtltBt0DV-z7KYPTi4t1Pc79giukGsd9_62x-g",
  crv: "P-256",
  d: "889MrUs4EgNIJzv878XeQz9ygYgfFpJv8mwQCjMoLkM",
};

const SMART_REQUEST: SmartCheckinRequest = {
  type: "smart-health-checkin-request",
  version: "1",
  id: "fixture-smart-checkin-basic",
  purpose: "Clinic check-in",
  fhirVersions: ["4.0.1"],
  items: [
    {
      id: "coverage",
      title: "Coverage",
      summary: "Member coverage and payer details.",
      required: true,
      content: {
        kind: "fhir.resources",
        profiles: [
          "http://hl7.org/fhir/us/insurance-card/StructureDefinition/C4DIC-Coverage",
        ],
      },
      accept: ["application/fhir+json"],
    },
    {
      id: "clinical",
      title: "Clinical summary",
      summary: "Patient demographics and clinical summary.",
      required: true,
      content: {
        kind: "fhir.resources",
        profiles: ["http://hl7.org/fhir/us/core/StructureDefinition/us-core-patient"],
      },
      accept: ["application/fhir+json"],
    },
    {
      id: "plan",
      title: "Insurance plan",
      summary: "Summary of Benefits and Coverage.",
      required: false,
      content: {
        kind: "fhir.resources",
        profiles: [
          "http://hl7.org/fhir/us/insurance-card/StructureDefinition/sbc-insurance-plan",
        ],
      },
      accept: ["application/fhir+json"],
    },
    {
      id: "intake",
      title: "Migraine follow-up",
      summary: "Migraine follow-up form.",
      required: false,
      content: {
        kind: "questionnaire",
        questionnaire:
          "https://smart-health-checkin.example.org/fhir/Questionnaire/chronic-migraine-followup",
      },
      accept: ["application/fhir+json"],
    },
  ],
};

const privateKey = await crypto.subtle.importKey(
  "jwk",
  RECIPIENT_PRIVATE_JWK,
  { name: "ECDH", namedCurve: "P-256" },
  true,
  ["deriveBits"],
);
const publicKey = await crypto.subtle.importKey(
  "jwk",
  RECIPIENT_PUBLIC_JWK,
  { name: "ECDH", namedCurve: "P-256" },
  true,
  [],
);

const bundle = await buildOrgIsoMdocRequest(SMART_REQUEST, {
  nonce: NONCE,
  verifierKeyPair: { privateKey, publicKey },
});
const inspection = await inspectOrgIsoMdocNavigatorArgument(bundle.navigatorArgument, {
  origin: ORIGIN,
});

const dir = join(OUT_ROOT, FIXTURE_ID);
await mkdir(dir, { recursive: true });
await writeJson(join(dir, "request.json"), bundle.navigatorArgument);
await writeJson(join(dir, "navigator-credentials-get.arg.json"), bundle.navigatorArgument);
await writeFile(join(dir, "device-request.b64u"), `${base64UrlEncodeBytes(bundle.deviceRequestBytes)}\n`);
await writeFile(join(dir, "encryption-info.b64u"), `${base64UrlEncodeBytes(bundle.encryptionInfoBytes)}\n`);
await writeFile(join(dir, "device-request.cbor.hex"), `${hex(bundle.deviceRequestBytes)}\n`);
await writeFile(join(dir, "encryption-info.cbor.hex"), `${hex(bundle.encryptionInfoBytes)}\n`);
await writeJson(join(dir, "smart-request.expected.json"), SMART_REQUEST);
await writeJson(join(dir, "recipient-public.jwk.json"), RECIPIENT_PUBLIC_JWK);
await writeJson(join(dir, "recipient-private.jwk.json"), RECIPIENT_PRIVATE_JWK);
await writeJson(join(dir, "inspection.json"), inspection);
await writeJson(join(dir, "metadata.json"), {
  id: FIXTURE_ID,
  kind: "positive-smart-health-checkin",
  source: "rp-web/scripts/generate-dcapi-request-fixtures.ts",
  origin: ORIGIN,
  protocol: "org-iso-mdoc",
  note: "Synthetic deterministic request fixture. Private key is a test vector only.",
  containsQuestionnaireUrl: true,
});

const readerAuthBundle = await buildOrgIsoMdocRequest(SMART_REQUEST, {
  nonce: NONCE,
  verifierKeyPair: { privateKey, publicKey },
  origin: ORIGIN,
});
const readerAuthInspection = await inspectOrgIsoMdocNavigatorArgument(readerAuthBundle.navigatorArgument, {
  origin: ORIGIN,
});
if (!readerAuthBundle.sessionTranscriptBytes || !readerAuthBundle.readerAuthBytes) {
  throw new Error("readerAuth fixture generation did not produce readerAuth artifacts");
}

const readerAuthDir = join(OUT_ROOT, READER_AUTH_FIXTURE_ID);
await mkdir(readerAuthDir, { recursive: true });
await writeJson(join(readerAuthDir, "request.json"), readerAuthBundle.navigatorArgument);
await writeJson(join(readerAuthDir, "navigator-credentials-get.arg.json"), readerAuthBundle.navigatorArgument);
await writeFile(join(readerAuthDir, "device-request.b64u"), `${base64UrlEncodeBytes(readerAuthBundle.deviceRequestBytes)}\n`);
await writeFile(join(readerAuthDir, "encryption-info.b64u"), `${base64UrlEncodeBytes(readerAuthBundle.encryptionInfoBytes)}\n`);
await writeFile(join(readerAuthDir, "device-request.cbor.hex"), `${hex(readerAuthBundle.deviceRequestBytes)}\n`);
await writeFile(join(readerAuthDir, "encryption-info.cbor.hex"), `${hex(readerAuthBundle.encryptionInfoBytes)}\n`);
await writeFile(join(readerAuthDir, "session-transcript.cbor"), readerAuthBundle.sessionTranscriptBytes);
await writeFile(join(readerAuthDir, "items-request-tag24.cbor"), readerAuthBundle.itemsRequestTag24Bytes);
await writeFile(join(readerAuthDir, "reader-auth.cbor"), readerAuthBundle.readerAuthBytes);
await writeFile(join(readerAuthDir, "reader-certificate.der"), readerAuthBundle.readerCertificateDer!);
await writeJson(join(readerAuthDir, "smart-request.expected.json"), SMART_REQUEST);
await writeJson(join(readerAuthDir, "recipient-public.jwk.json"), RECIPIENT_PUBLIC_JWK);
await writeJson(join(readerAuthDir, "recipient-private.jwk.json"), RECIPIENT_PRIVATE_JWK);
await writeJson(join(readerAuthDir, "reader-public.jwk.json"), readerAuthBundle.readerPublicJwk);
await writeJson(join(readerAuthDir, "inspection.json"), readerAuthInspection);
await writeJson(join(readerAuthDir, "metadata.json"), {
  id: READER_AUTH_FIXTURE_ID,
  kind: "positive-smart-health-checkin-readerauth",
  source: "rp-web/scripts/generate-dcapi-request-fixtures.ts",
  origin: ORIGIN,
  protocol: "org-iso-mdoc",
  note: "Synthetic request fixture with per-DocRequest readerAuth. Private keys and the reader certificate are test vectors only.",
  containsQuestionnaireUrl: true,
  readerAuth: {
    present: true,
    certificateDerBase64Url: base64UrlEncodeBytes(readerAuthBundle.readerCertificateDer!),
  },
});

const negativeDir = join(OUT_ROOT, "negative-mattr-mdl");
await mkdir(negativeDir, { recursive: true });
await writeJson(join(negativeDir, "metadata.json"), {
  id: "negative-mattr-mdl",
  kind: "negative-mdoc-request",
  source: "fixtures/captures/2026-04-30-mattr-safari-org-iso-mdoc/navigator-credentials-get.arg.json",
  protocol: "org-iso-mdoc",
  expectedSmartHealthCheckin: false,
});

console.log(`wrote ${dir}`);
console.log(`wrote ${readerAuthDir}`);
console.log(`wrote ${negativeDir}`);

async function writeJson(path: string, value: unknown): Promise<void> {
  await writeFile(path, `${JSON.stringify(value, null, 2)}\n`);
}

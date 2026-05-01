#!/usr/bin/env bun
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import {
  base64UrlDecodeBytes,
  buildDcapiSessionTranscript,
  openWalletResponse,
  PROTOCOL_ID,
} from "../src/protocol/index.ts";

type Options = {
  generatedDir: string;
  requestFixtureDir: string;
  outDir?: string;
};

const options = parseArgs(process.argv.slice(2));

const credential = JSON.parse(await readFile(join(options.generatedDir, "credential.json"), "utf8"));
const expectedSmartResponse = JSON.parse(
  await readFile(join(options.generatedDir, "smart-response.expected.json"), "utf8"),
);
const smartRequest = JSON.parse(
  await readFile(join(options.requestFixtureDir, "smart-request.expected.json"), "utf8"),
);
const requestMetadata = JSON.parse(
  await readFile(join(options.requestFixtureDir, "metadata.json"), "utf8"),
) as { origin: string };
const encryptionInfoB64u = (await readFile(join(options.requestFixtureDir, "encryption-info.b64u"), "utf8")).trim();
const recipientPrivateJwk = JSON.parse(
  await readFile(join(options.requestFixtureDir, "recipient-private.jwk.json"), "utf8"),
) as JsonWebKey;
const recipientPublicJwk = JSON.parse(
  await readFile(join(options.requestFixtureDir, "recipient-public.jwk.json"), "utf8"),
) as JsonWebKey;

assert(credential.protocol === PROTOCOL_ID, `credential protocol must be ${PROTOCOL_ID}`);
const recipientPrivateKey = await crypto.subtle.importKey(
  "jwk",
  recipientPrivateJwk,
  { name: "ECDH", namedCurve: "P-256" },
  true,
  ["deriveBits"],
);
const sessionTranscript = await buildDcapiSessionTranscript({
  origin: requestMetadata.origin,
  encryptionInfo: base64UrlDecodeBytes(encryptionInfoB64u),
});
const opened = await openWalletResponse({
  response: credential,
  recipientPrivateKey,
  recipientPublicJwk,
  sessionTranscript,
  smartRequest,
});

assert(opened.deviceResponse.version === "1.0", "DeviceResponse.version must be 1.0");
assert(opened.deviceResponse.status === 0, "DeviceResponse.status must be 0");
const document = opened.deviceResponse.documents[0];
assert(document !== undefined, "DeviceResponse must contain a document");
assert(document.docType === "org.smarthealthit.checkin.1", "Document docType mismatch");
assert(document.issuerAuth?.digestAlgorithm === "SHA-256", "MSO digestAlgorithm mismatch");
const element = document.elements.find(
  (e) =>
    e.namespace === "org.smarthealthit.checkin" &&
    e.elementIdentifier === "smart_health_checkin_response",
);
assert(element !== undefined, "Missing SMART Health Check-in response element");
assert(element.valueDigest?.matches === true, "IssuerSignedItem digest does not match MSO valueDigest");
assert(element.smartHealthCheckinResponse.present, "SMART response is absent");
assert(element.smartHealthCheckinResponse.valid, "SMART response is invalid");
const smartValue = element.smartHealthCheckinResponse.value;
assert(stableJson(smartValue) === stableJson(expectedSmartResponse), "SMART response JSON mismatch");

if (options.outDir) {
  await mkdir(options.outDir, { recursive: true });
  await writeFile(
    join(options.outDir, "opened-response-inspection.json"),
    `${JSON.stringify(opened, null, 2)}\n`,
  );
}

console.log("Android mdoc response validated with RP web HPKE open + DeviceResponse inspector.");

function parseArgs(args: string[]): Options {
  const rest: string[] = [];
  let outDir: string | undefined;
  for (let i = 0; i < args.length; i++) {
    const arg = args[i]!;
    if (arg === "--out") {
      outDir = args[++i];
    } else if (arg === "--help" || arg === "-h") {
      usage(0);
    } else {
      rest.push(arg);
    }
  }
  if (rest.length !== 2) usage(1);
  return {
    generatedDir: rest[0]!,
    requestFixtureDir: rest[1]!,
    outDir,
  };
}

function usage(code: number): never {
  const msg = `Usage:
  bun scripts/validate-android-mdoc-response.ts <generated-response-dir> <request-fixture-dir> [--out <dir>]

Inputs:
  generated-response-dir  Contains credential.json and smart-response.expected.json from Android JVM tests.
  request-fixture-dir     Contains encryption-info.b64u and recipient private/public JWK fixture files.
`;
  (code === 0 ? console.log : console.error)(msg);
  process.exit(code);
}

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function stableJson(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableJson).join(",")}]`;
  const obj = value as Record<string, unknown>;
  return `{${Object.keys(obj)
    .sort()
    .map((key) => `${JSON.stringify(key)}:${stableJson(obj[key])}`)
    .join(",")}}`;
}

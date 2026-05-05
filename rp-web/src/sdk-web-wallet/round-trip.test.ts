// Round-trip conformance test for sdk-web-wallet/wallet-core.ts.
//
// Goal: prove the existing verifier opens what the new wallet code packs.
// We:
//   1. prepare a verifier request with createBrowserLocalVerifierAuthority;
//   2. feed deviceRequest + encryptionInfo + origin into
//      buildWebWalletDcapiResponse with a synthetic SMART response;
//   3. open the result with the existing openCredential path;
//   4. assert HPKE opens, MSO valueDigest matches, and the SMART response
//      schema-validates against the request.

import { describe, expect, test } from "bun:test";
import {
  createBrowserLocalVerifierAuthority,
  prepareDcapiCredentialRequest,
  requestCredentialWithAuthority,
} from "../sdk/dcapi-verifier.ts";
import {
  base64UrlDecodeBytes,
  base64UrlEncodeBytes,
  CborTag,
  cborDecode,
  hex,
  inspectDeviceResponseBytes,
  MDOC_DOC_TYPE,
  MDOC_NAMESPACE,
  SMART_RESPONSE_ELEMENT_ID,
} from "../protocol/index.ts";
import type { SmartCheckinRequest, SmartCheckinResponse } from "../sdk/core.ts";
import {
  buildWebWalletDcapiResponse,
  type WebWalletDeviceKey,
  type WebWalletIssuerKey,
} from "./wallet-core.ts";

const REQUEST: SmartCheckinRequest = {
  type: "smart-health-checkin-request",
  version: "1",
  id: "web-wallet-roundtrip",
  fhirVersions: ["4.0.1"],
  items: [
    {
      id: "patient",
      title: "Patient demographics",
      content: { kind: "selection.fhir" },
      accept: ["application/fhir+json"],
    },
  ],
};

const RESPONSE: SmartCheckinResponse = {
  type: "smart-health-checkin-response",
  version: "1",
  requestId: "web-wallet-roundtrip",
  artifacts: [
    {
      id: "patient-1",
      mediaType: "application/fhir+json",
      fulfills: ["patient"],
      fhirVersion: "4.0.1",
      value: {
        resourceType: "Patient",
        id: "demo-patient",
        name: [{ family: "Stark", given: ["Tony"] }],
      },
    },
  ],
  requestStatus: [{ item: "patient", status: "fulfilled" }],
};

async function generateP256KeyPair(): Promise<{
  keyPair: CryptoKeyPair;
  publicJwk: JsonWebKey;
}> {
  const keyPair = (await crypto.subtle.generateKey(
    { name: "ECDSA", namedCurve: "P-256" },
    true,
    ["sign", "verify"],
  )) as CryptoKeyPair;
  const publicJwk = await crypto.subtle.exportKey("jwk", keyPair.publicKey);
  return { keyPair, publicJwk };
}

async function makeKeys(): Promise<{
  issuerKey: WebWalletIssuerKey;
  deviceKey: WebWalletDeviceKey;
}> {
  const issuer = await generateP256KeyPair();
  const device = await generateP256KeyPair();
  return {
    issuerKey: { privateKey: issuer.keyPair.privateKey, publicJwk: issuer.publicJwk },
    deviceKey: { privateKey: device.keyPair.privateKey, publicJwk: device.publicJwk },
  };
}

describe("sdk-web-wallet round-trip", () => {
  test("buildWebWalletDcapiResponse produces a response openWalletResponse opens", async () => {
    const origin = "https://clinic.example";
    const context = await prepareDcapiCredentialRequest({
      request: REQUEST,
      origin,
    });

    const { issuerKey, deviceKey } = await makeKeys();
    const built = await buildWebWalletDcapiResponse({
      deviceRequestBase64Url: context.artifacts.deviceRequest.base64url,
      encryptionInfoBase64Url: context.artifacts.encryptionInfo.base64url,
      origin,
      smartResponse: RESPONSE,
      issuerKey,
      deviceKey,
    });

    expect(hex(built.sessionTranscript)).toBe(
      context.artifacts.sessionTranscript.hex,
    );

    const opened = await context.openCredential(built.response);

    expect(opened.deviceResponse.version).toBe("1.0");
    expect(opened.deviceResponse.status).toBe(0);
    const doc = opened.deviceResponse.documents[0]!;
    expect(doc.docType).toBe(MDOC_DOC_TYPE);
    expect(doc.issuerAuth?.digestAlgorithm).toBe("SHA-256");
    const element = doc.elements[0]!;
    expect(element.namespace).toBe(MDOC_NAMESPACE);
    expect(element.elementIdentifier).toBe(SMART_RESPONSE_ELEMENT_ID);
    expect(element.valueDigest?.matches).toBe(true);
    if (
      !element.smartHealthCheckinResponse.present ||
      !element.smartHealthCheckinResponse.valid
    ) {
      throw new Error(
        `SMART response did not decode: ${JSON.stringify(element.smartHealthCheckinResponse)}`,
      );
    }
    expect(element.smartHealthCheckinResponse.value.requestId).toBe(REQUEST.id);
    expect(opened.smartResponseValidation?.ok).toBe(true);
  });

  test("works through requestCredentialWithAuthority with an in-process getter", async () => {
    const origin = "https://clinic.example";
    const authority = createBrowserLocalVerifierAuthority({ origin });
    const { issuerKey, deviceKey } = await makeKeys();

    const result = await requestCredentialWithAuthority({
      authority,
      request: REQUEST,
      getCredential: async (_options, prepared) => {
        if (!prepared) throw new Error("prepared request missing");
        const built = await buildWebWalletDcapiResponse({
          deviceRequestBase64Url:
            prepared.publicArtifacts.deviceRequest.base64url,
          encryptionInfoBase64Url:
            prepared.publicArtifacts.encryptionInfo.base64url,
          origin,
          smartResponse: RESPONSE,
          issuerKey,
          deviceKey,
        });
        return built.response;
      },
    });

    expect(result.completion.openedResponse.smartResponseValidation?.ok).toBe(
      true,
    );
    const doc = result.completion.openedResponse.deviceResponse.documents[0]!;
    expect(doc.elements[0]!.valueDigest?.matches).toBe(true);
  });

  test("DeviceResponse contains a deviceSigned envelope and an issuer COSE_Sign1", async () => {
    const origin = "https://clinic.example";
    const context = await prepareDcapiCredentialRequest({
      request: REQUEST,
      origin,
    });
    const { issuerKey, deviceKey } = await makeKeys();
    const built = await buildWebWalletDcapiResponse({
      deviceRequestBase64Url: context.artifacts.deviceRequest.base64url,
      encryptionInfoBase64Url: context.artifacts.encryptionInfo.base64url,
      origin,
      smartResponse: RESPONSE,
      issuerKey,
      deviceKey,
    });

    const inspection = await inspectDeviceResponseBytes(built.deviceResponseBytes);
    const decoded = cborDecode(built.deviceResponseBytes);
    expect(decoded instanceof Map).toBe(true);
    const documents = (decoded as Map<unknown, unknown>).get("documents") as unknown[];
    expect(Array.isArray(documents)).toBe(true);
    const doc0 = documents[0] as Map<unknown, unknown>;
    const deviceSigned = doc0.get("deviceSigned") as Map<unknown, unknown>;
    expect(deviceSigned).toBeInstanceOf(Map);
    const deviceAuth = deviceSigned.get("deviceAuth") as Map<unknown, unknown>;
    expect(deviceAuth.has("deviceSignature")).toBe(true);
    const issuerSigned = doc0.get("issuerSigned") as Map<unknown, unknown>;
    const issuerAuth = issuerSigned.get("issuerAuth") as unknown[];
    expect(Array.isArray(issuerAuth)).toBe(true);
    expect(issuerAuth.length).toBe(4); // [protected, unprotected, payload, signature]
    expect(issuerAuth[3]).toBeInstanceOf(Uint8Array);
    expect((issuerAuth[3] as Uint8Array).length).toBe(64); // raw P-256 ECDSA

    expect(inspection.documents[0]?.elements[0]?.valueDigest?.matches).toBe(true);
  });

  test("rejects mismatched docType in the device request", async () => {
    const origin = "https://clinic.example";
    const context = await prepareDcapiCredentialRequest({
      request: REQUEST,
      origin,
    });
    const { issuerKey, deviceKey } = await makeKeys();

    // Tamper with the docType inside the device request bytes.
    const tampered = await tamperDocType(
      context.artifacts.deviceRequest.base64url,
      "org.smarthealthit.checkin.9",
    );
    await expect(
      buildWebWalletDcapiResponse({
        deviceRequestBase64Url: tampered,
        encryptionInfoBase64Url: context.artifacts.encryptionInfo.base64url,
        origin,
        smartResponse: RESPONSE,
        issuerKey,
        deviceKey,
      }),
    ).rejects.toThrow(/unexpected docType/);
  });
});

async function tamperDocType(
  deviceRequestBase64Url: string,
  newDocType: string,
): Promise<string> {
  const bytes = base64UrlDecodeBytes(deviceRequestBase64Url);
  // The verifier's ItemsRequest includes the original docType verbatim.
  // Replace it with newDocType. This is a brittle string-bytes hack but
  // sufficient for a "rejects" smoke test.
  const original = MDOC_DOC_TYPE;
  const enc = new TextEncoder();
  const orig = enc.encode(original);
  const repl = enc.encode(newDocType);
  // Find the first occurrence and replace; CBOR text-string headers will be
  // size-prefixed, so for a same-length replacement we can substitute in
  // place. If lengths differ, this hack would corrupt CBOR — but we only
  // need it for one test.
  if (orig.length !== repl.length) {
    throw new Error("tamperDocType requires a same-length replacement");
  }
  outer: for (let i = 0; i + orig.length <= bytes.length; i++) {
    for (let j = 0; j < orig.length; j++) {
      if (bytes[i + j] !== orig[j]) continue outer;
    }
    for (let j = 0; j < repl.length; j++) bytes[i + j] = repl[j]!;
    return base64UrlEncodeBytes(bytes);
  }
  throw new Error("docType bytes not found in device request");
}

// Unused but referenced via import elsewhere — keep import side-effect-free.
void CborTag;

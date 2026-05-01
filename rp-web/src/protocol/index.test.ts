import { describe, expect, test } from "bun:test";
import {
  base64UrlEncodeBytes,
  buildDcapiMdocResponse,
  buildDcapiSessionTranscript,
  buildDeviceRequestBytes,
  buildEncryptionInfoBytes,
  buildOrgIsoMdocRequest,
  buildReaderAuthenticationBytes,
  cborDecode,
  decodeDynamicElement,
  DYNAMIC_ELEMENT_PREFIX,
  encodeDynamicElement,
  hex,
  hpkeSealDirectMdoc,
  inspectDcapiMdocResponse,
  inspectDeviceResponseBytes,
  inspectOrgIsoMdocNavigatorArgument,
  MDOC_DOC_TYPE,
  MDOC_NAMESPACE,
  PROTOCOL_ID,
  SMART_RESPONSE_ELEMENT_ID,
  SMART_REQUEST_INFO_KEY,
  openWalletResponse,
  validateResponseAgainstRequest,
  validateSmartCheckinRequest,
  validateSmartCheckinResponse,
  verifyReaderAuthSignature,
  type SmartCheckinRequest,
} from "./index.ts";

const PATIENT_REQUEST: SmartCheckinRequest = {
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
};

const PATIENT_REQUEST_JSON = JSON.stringify(PATIENT_REQUEST);

const PATIENT_DYNAMIC_ELEMENT =
  `${DYNAMIC_ELEMENT_PREFIX}.${base64UrlEncodeBytes(new TextEncoder().encode(PATIENT_REQUEST_JSON))}`;

const VERIFIER_PUBLIC_JWK: JsonWebKey = {
  kty: "EC",
  crv: "P-256",
  x: "DxiH5Q4Yx3UrukE2lWCErq8N8bqC9CHLLrAwLz5BmE0",
  y: "XtLM4-3h5o3HUH0MHVJV0kyq0iBlrBwlh8qEDMZ4-Pc",
  use: "enc",
  alg: "ECDH-ES",
};

describe("fallback dynamic SMART Check-in element", () => {
  test("encodes and decodes compact JSON", () => {
    const element = encodeDynamicElement(PATIENT_REQUEST);

    expect(element).toBe(PATIENT_DYNAMIC_ELEMENT);
    expect(element.startsWith(`${DYNAMIC_ELEMENT_PREFIX}.`)).toBe(true);
    expect(element).not.toContain("=");
    expect(decodeDynamicElement(element)).toEqual(PATIENT_REQUEST);
  });

  test("validates request shape", () => {
    expect(validateSmartCheckinRequest(PATIENT_REQUEST).ok).toBe(true);
    expect(validateSmartCheckinRequest({ version: "1", items: [{ id: "x" }] }).ok).toBe(false);
  });

  test("validates response shape", () => {
    expect(
      validateSmartCheckinResponse({
        type: "smart-health-checkin-response",
        version: "1",
        requestId: "test-patient-request",
        artifacts: [
          {
            id: "a1",
            mediaType: "application/fhir+json",
            fhirVersion: "4.0.1",
            fulfills: ["patient"],
            value: { resourceType: "Patient" },
          },
        ],
        requestStatus: [{ item: "patient", status: "fulfilled" }],
      }).ok,
    ).toBe(true);
    expect(validateSmartCheckinResponse({ version: "1", artifacts: [], requestStatus: [] }).ok).toBe(false);
  });

  test("validates SMART Health Card response artifacts", async () => {
    const shc = await Bun.file("../fixtures/sample-shc/samples/spec-example-00/credential.json").json();
    const response = {
      type: "smart-health-checkin-response",
      version: "1",
      requestId: "test-patient-request",
      artifacts: [
        {
          id: "a1",
          mediaType: "application/smart-health-card",
          fulfills: ["patient"],
          value: shc,
        },
      ],
      requestStatus: [{ item: "patient", status: "fulfilled" }],
    };

    expect(validateSmartCheckinResponse(response).ok).toBe(true);
    expect(validateResponseAgainstRequest(PATIENT_REQUEST, response).ok).toBe(true);
    expect(
      validateSmartCheckinResponse({
        ...response,
        artifacts: [{ ...response.artifacts[0], fhirVersion: "4.0.1" }],
      }).ok,
    ).toBe(false);
  });

  test("validates response references against request items", () => {
    const validResponse = {
      type: "smart-health-checkin-response",
      version: "1",
      requestId: "test-patient-request",
      artifacts: [
        {
          id: "a1",
          mediaType: "application/fhir+json",
          fhirVersion: "4.0.1",
          fulfills: ["patient"],
          value: { resourceType: "Patient" },
        },
      ],
      requestStatus: [{ item: "patient", status: "fulfilled" }],
    };

    expect(validateResponseAgainstRequest(PATIENT_REQUEST, validResponse).ok).toBe(true);
    expect(
      validateResponseAgainstRequest(PATIENT_REQUEST, {
        ...validResponse,
        artifacts: [{ ...validResponse.artifacts[0], fulfills: ["missing"] }],
      }).ok,
    ).toBe(false);
    expect(
      validateResponseAgainstRequest(PATIENT_REQUEST, {
        ...validResponse,
        requestStatus: [],
      }).ok,
    ).toBe(false);
  });

  test("constants match the active direct mdoc mapping", () => {
    expect(PROTOCOL_ID).toBe("org-iso-mdoc");
    expect(MDOC_DOC_TYPE).toBe("org.smarthealthit.checkin.1");
    expect(MDOC_NAMESPACE).toBe("org.smarthealthit.checkin");
    expect(SMART_REQUEST_INFO_KEY).toBe("org.smarthealthit.checkin.request");
    expect(SMART_RESPONSE_ELEMENT_ID).toBe("smart_health_checkin_response");
  });
});

describe("org-iso-mdoc request vectors", () => {
  test("builds a deterministic DeviceRequest with stable response element and requestInfo payload", () => {
    const deviceRequest = buildDeviceRequestBytes({
      smartRequestJson: PATIENT_REQUEST_JSON,
    });
    const decoded = cborDecode(deviceRequest) as Map<string, unknown>;
    const docRequests = decoded.get("docRequests") as Array<Map<string, unknown>>;
    const itemsRequestTag = docRequests[0]?.get("itemsRequest") as { value: Uint8Array };
    const itemsRequest = cborDecode(itemsRequestTag.value) as Map<string, unknown>;
    const requestInfo = itemsRequest.get("requestInfo") as Map<string, unknown>;
    const namespaces = itemsRequest.get("nameSpaces") as Map<string, Map<string, boolean>>;

    expect(decoded.get("version")).toBe("1.0");
    expect(itemsRequest.get("docType")).toBe(MDOC_DOC_TYPE);
    expect(requestInfo.get(SMART_REQUEST_INFO_KEY)).toBe(PATIENT_REQUEST_JSON);
    expect(namespaces.get(MDOC_NAMESPACE)?.get(SMART_RESPONSE_ELEMENT_ID)).toBe(true);
    expect(hex(deviceRequest).length).toBeGreaterThan(100);
  });

  test("builds deterministic dcapi encryptionInfo", () => {
    const nonce = new Uint8Array(Array.from({ length: 32 }, (_, i) => i));
    const encryptionInfo = buildEncryptionInfoBytes({
      nonce,
      recipientPublicJwk: VERIFIER_PUBLIC_JWK,
    });

    expect(hex(encryptionInfo)).toBe(
      "82656463617069a2656e6f6e63655820000102030405060708090a0b0c0d0e0f101112131415161718191a1b1c1d1e1f72726563697069656e745075626c69634b6579a4010220012158200f1887e50e18c7752bba4136956084aeaf0df1ba82f421cb2eb0302f3e41984d2258205ed2cce3ede1e68dc7507d0c1d5255d24caad22065ac1c2587ca840cc678f8f7",
    );
  });

  test("builds deterministic dcapi SessionTranscript", async () => {
    const nonce = new Uint8Array(Array.from({ length: 32 }, (_, i) => i));
    const encryptionInfo = buildEncryptionInfoBytes({
      nonce,
      recipientPublicJwk: VERIFIER_PUBLIC_JWK,
    });
    const sessionTranscript = await buildDcapiSessionTranscript({
      origin: "https://example.com",
      encryptionInfo,
    });

    expect(hex(sessionTranscript)).toBe(
      "83f6f68265646361706958205a25f4d8f908196531efbeab91dbec31ed302869ca51db96f9abe9db1ba04334",
    );
  });

  test("builds navigator.credentials.get argument with raw mdoc request fields", async () => {
    const bundle = await buildOrgIsoMdocRequest(PATIENT_REQUEST, {
      nonce: new Uint8Array(Array.from({ length: 32 }, (_, i) => i)),
    });

    expect(bundle.navigatorArgument.mediation).toBe("required");
    expect(bundle.navigatorArgument.digital.requests[0].protocol).toBe("org-iso-mdoc");
    expect(bundle.navigatorArgument.digital.requests[0].data.deviceRequest).toBe(
      base64UrlEncodeBytes(bundle.deviceRequestBytes),
    );
    expect(bundle.navigatorArgument.digital.requests[0].data.encryptionInfo).toBe(
      base64UrlEncodeBytes(bundle.encryptionInfoBytes),
    );
    expect(bundle.requestedElementIdentifier).toBe(SMART_RESPONSE_ELEMENT_ID);
  });

  test("inspects generated requestInfo payload and stable response element", async () => {
    const bundle = await buildOrgIsoMdocRequest(PATIENT_REQUEST, {
      nonce: new Uint8Array(Array.from({ length: 32 }, (_, i) => i)),
    });
    const inspection = await inspectOrgIsoMdocNavigatorArgument(bundle.navigatorArgument, {
      origin: "https://clinic.example",
    });
    const items = inspection.deviceRequest.docRequests[0]!;

    expect(items.docType).toBe(MDOC_DOC_TYPE);
    expect(items.requestedElements).toEqual([
      {
        namespace: MDOC_NAMESPACE,
        elementIdentifier: SMART_RESPONSE_ELEMENT_ID,
        intentToRetain: true,
      },
    ]);
    expect(items.smartHealthCheckin).toEqual({
      present: true,
      json: PATIENT_REQUEST_JSON,
      valid: true,
      value: PATIENT_REQUEST,
    });
    expect(inspection.sessionTranscript?.origin).toBe("https://clinic.example");
  });

  test("builds per-DocRequest readerAuth as detached COSE_Sign1", async () => {
    const bundle = await buildOrgIsoMdocRequest(PATIENT_REQUEST, {
      nonce: new Uint8Array(Array.from({ length: 32 }, (_, i) => i)),
      origin: "https://clinic.example",
    });

    expect(bundle.readerAuthBytes).toBeDefined();
    expect(bundle.readerKeyPair).toBeDefined();
    expect(bundle.readerCertificateDer?.length).toBeGreaterThan(200);
    expect(bundle.sessionTranscriptBytes).toBeDefined();

    const deviceRequest = cborDecode(bundle.deviceRequestBytes) as Map<string, unknown>;
    const docRequests = deviceRequest.get("docRequests") as unknown[];
    const docRequest = docRequests[0] as Map<string, unknown>;
    const readerAuth = docRequest.get("readerAuth") as unknown[];
    const readerAuthProtected = readerAuth[0] as Uint8Array;
    const readerAuthPayload = readerAuth[2];
    const readerAuthSignature = readerAuth[3] as Uint8Array;

    expect(readerAuthPayload).toBe(null);
    expect(readerAuthSignature.length).toBe(64);
    expect(cborDecode(readerAuthProtected)).toEqual(new Map([[1, -7]]));
    expect(hex(buildReaderAuthenticationBytes({
      sessionTranscriptBytes: bundle.sessionTranscriptBytes!,
      itemsRequestTag24Bytes: bundle.itemsRequestTag24Bytes,
    }))).toContain(hex(bundle.itemsRequestTag24Bytes.slice(0, 8)));
    expect(await verifyReaderAuthSignature({
      readerAuthBytes: bundle.readerAuthBytes!,
      readerPublicKey: bundle.readerKeyPair!.publicKey,
      sessionTranscriptBytes: bundle.sessionTranscriptBytes!,
      itemsRequestTag24Bytes: bundle.itemsRequestTag24Bytes,
    })).toBe(true);

    const inspection = await inspectOrgIsoMdocNavigatorArgument(bundle.navigatorArgument, {
      origin: "https://clinic.example",
    });
    expect(inspection.deviceRequest.docRequests[0]?.readerAuth?.payloadIsDetached).toBe(true);
  });

  test("inspects checked-in Mattr direct-mdoc fixture", async () => {
    const fixture = await Bun.file(
      "../fixtures/captures/2026-04-30-mattr-safari-org-iso-mdoc/navigator-credentials-get.arg.json",
    ).json();
    const inspection = await inspectOrgIsoMdocNavigatorArgument(fixture);
    const items = inspection.deviceRequest.docRequests[0]!;

    expect(items.docType).toBe("org.iso.18013.5.1.mDL");
    expect(items.smartHealthCheckin.present).toBe(false);
    expect(items.requestedElements).toHaveLength(25);
    expect(inspection.encryptionInfo?.nonce?.hex).toBe(
      "ad378dc6ab471c1e5d7279f44f72312b370dbd9d554b0bb638513b2246a43f42",
    );
  });

  test("inspects checked-in real Chrome/Android SMART request fixture", async () => {
    const fixture = await Bun.file(
      "../fixtures/dcapi-requests/real-chrome-android-smart-checkin/navigator-credentials-get.arg.json",
    ).json();
    const metadata = (await Bun.file(
      "../fixtures/dcapi-requests/real-chrome-android-smart-checkin/metadata.json",
    ).json()) as { origin: string };
    const inspection = await inspectOrgIsoMdocNavigatorArgument(fixture, {
      origin: metadata.origin,
    });
    const items = inspection.deviceRequest.docRequests[0]!;

    expect(items.docType).toBe(MDOC_DOC_TYPE);
    expect(items.requestedElements).toEqual([
      {
        namespace: MDOC_NAMESPACE,
        elementIdentifier: SMART_RESPONSE_ELEMENT_ID,
        intentToRetain: true,
      },
    ]);
    if (!items.smartHealthCheckin.present || !items.smartHealthCheckin.valid) {
      throw new Error(`SMART request did not decode: ${JSON.stringify(items.smartHealthCheckin)}`);
    }
    expect(items.smartHealthCheckin.value.items.map((i) => i.id)).toEqual([
      "patient",
      "insurance",
      "ips",
      "intake",
    ]);
    expect(inspection.sessionTranscript?.hex).toBe(
      (
        await Bun.file(
          "../fixtures/dcapi-requests/real-chrome-android-smart-checkin/session-transcript.cbor.hex",
        ).text()
      ).trim(),
    );
  });
});

describe("org-iso-mdoc response wrapper", () => {
  test("wraps HPKE output in the observed dcapi response envelope", () => {
    const response = buildDcapiMdocResponse({
      enc: new Uint8Array([1, 2, 3]),
      cipherText: new Uint8Array([4, 5, 6, 7]),
    });

    expect(response).toEqual({
      protocol: "org-iso-mdoc",
      data: {
        response: "gmVkY2FwaaJjZW5jQwECA2pjaXBoZXJUZXh0RAQFBgc",
      },
    });
  });

  test("inspects direct dcapi response envelope", () => {
    const response = buildDcapiMdocResponse({
      enc: new Uint8Array([1, 2, 3]),
      cipherText: new Uint8Array([4, 5, 6, 7]),
    });
    const inspection = inspectDcapiMdocResponse(response);

    expect(inspection.enc?.hex).toBe("010203");
    expect(inspection.cipherText?.hex).toBe("04050607");
    expect(inspection.dcapiResponseDiagnostic).toBe(
      '["dcapi", {"enc": h\'010203\', "cipherText": h\'04050607\'}]',
    );
  });

  test("inspects plaintext DeviceResponse fixture after HPKE open", async () => {
    const bytes = new Uint8Array(
      await Bun.file("../fixtures/responses/pymdoc-minimal/document.cbor").arrayBuffer(),
    );
    const inspection = await inspectDeviceResponseBytes(bytes);
    const doc = inspection.documents[0]!;
    const element = doc.elements[0]!;

    expect(inspection.version).toBe("1.0");
    expect(inspection.status).toBe(0);
    expect(doc.docType).toBe(MDOC_DOC_TYPE);
    expect(doc.issuerAuth?.digestAlgorithm).toBe("SHA-256");
    expect(element.namespace).toBe(MDOC_NAMESPACE);
    expect(element.elementIdentifier).toBe(SMART_RESPONSE_ELEMENT_ID);
    expect(element.valueDigest?.matches).toBe(true);
    if (!element.smartHealthCheckinResponse.present || !element.smartHealthCheckinResponse.valid) {
      throw new Error(
        `SMART response did not decode: ${JSON.stringify(element.smartHealthCheckinResponse)}`,
      );
    }
    expect(element.smartHealthCheckinResponse.value).toEqual({
      type: "smart-health-checkin-response",
      version: "1",
      requestId: "fixture-minimal-request",
      artifacts: [
        {
          id: "a1",
          mediaType: "application/fhir+json",
          fhirVersion: "4.0.1",
          fulfills: ["patient"],
          value: { id: "demo", resourceType: "Patient" },
        },
      ],
      requestStatus: [{ item: "patient", status: "fulfilled" }],
    });
  });

  test("inspects checked-in real Android DeviceResponse fixture", async () => {
    const bytes = new Uint8Array(
      await Bun.file("../fixtures/responses/real-chrome-android-smart-checkin/device-response.cbor").arrayBuffer(),
    );
    const inspection = await inspectDeviceResponseBytes(bytes);
    const doc = inspection.documents[0]!;
    const element = doc.elements[0]!;

    expect(inspection.version).toBe("1.0");
    expect(inspection.status).toBe(0);
    expect(doc.docType).toBe(MDOC_DOC_TYPE);
    expect(element.namespace).toBe(MDOC_NAMESPACE);
    expect(element.elementIdentifier).toBe(SMART_RESPONSE_ELEMENT_ID);
    expect(element.valueDigest.matches).toBe(true);
    if (!element.smartHealthCheckinResponse.present || !element.smartHealthCheckinResponse.valid) {
      throw new Error(
        `SMART response did not decode: ${JSON.stringify(element.smartHealthCheckinResponse)}`,
      );
    }
    const smartResponse = element.smartHealthCheckinResponse.value;
    const validation = validateSmartCheckinResponse(smartResponse);
    if (!validation.ok) throw new Error(validation.error);
    const pairedRequest = await Bun.file("../fixtures/dcapi-requests/real-chrome-android-smart-checkin/smart-request.json").json();
    const pairedValidation = validateResponseAgainstRequest(pairedRequest, smartResponse);
    if (!pairedValidation.ok) throw new Error(pairedValidation.error);
    expect(smartResponse.artifacts.length).toBe(4);
    expect(smartResponse.requestStatus.map((status) => status.item).sort()).toEqual([
      "insurance",
      "intake",
      "ips",
      "patient",
    ]);
  });

  test("opens checked-in real Android dcapi response fixture with captured HPKE key", async () => {
    const response = await Bun.file(
      "../fixtures/responses/real-chrome-android-smart-checkin/credential.json",
    ).json();
    const recipientPrivateJwk = (await Bun.file(
      "../fixtures/dcapi-requests/real-chrome-android-smart-checkin/recipient-private.jwk.json",
    ).json()) as JsonWebKey;
    const recipientPublicJwk = (await Bun.file(
      "../fixtures/dcapi-requests/real-chrome-android-smart-checkin/recipient-public.jwk.json",
    ).json()) as JsonWebKey;
    const sessionTranscript = new Uint8Array(
      await Bun.file(
        "../fixtures/dcapi-requests/real-chrome-android-smart-checkin/session-transcript.cbor",
      ).arrayBuffer(),
    );
    const expectedPlaintext = new Uint8Array(
      await Bun.file(
        "../fixtures/responses/real-chrome-android-smart-checkin/device-response.cbor",
      ).arrayBuffer(),
    );
    const recipientPrivateKey = await crypto.subtle.importKey(
      "jwk",
      recipientPrivateJwk,
      { name: "ECDH", namedCurve: "P-256" },
      true,
      ["deriveBits"],
    );

    const opened = await openWalletResponse({
      response,
      recipientPrivateKey,
      recipientPublicJwk,
      sessionTranscript,
      smartRequest: await Bun.file("../fixtures/dcapi-requests/real-chrome-android-smart-checkin/smart-request.json").json(),
    });

    expect(hex(opened.deviceResponseBytes)).toBe(hex(expectedPlaintext));
    expect(opened.deviceResponse.documents[0]?.elements[0]?.valueDigest?.matches).toBe(true);
    expect(opened.smartResponseValidation?.ok).toBe(true);
  });

  test("seals and opens a direct mdoc wallet response with HPKE", async () => {
    const bundle = await buildOrgIsoMdocRequest(PATIENT_REQUEST, {
      nonce: new Uint8Array(Array.from({ length: 32 }, (_, i) => i)),
    });
    const sessionTranscript = await buildDcapiSessionTranscript({
      origin: "https://clinic.example",
      encryptionInfo: bundle.encryptionInfoBytes,
    });
    const plaintext = new Uint8Array(
      await Bun.file("../fixtures/responses/pymdoc-minimal/document.cbor").arrayBuffer(),
    );
    const sealed = await hpkeSealDirectMdoc({
      plaintext,
      recipientPublicJwk: bundle.verifierPublicJwk,
      info: sessionTranscript,
    });
    const opened = await openWalletResponse({
      response: sealed.response,
      recipientPrivateKey: bundle.verifierKeyPair.privateKey,
      recipientPublicJwk: bundle.verifierPublicJwk,
      sessionTranscript,
    });

    expect(hex(opened.deviceResponseBytes)).toBe(hex(plaintext));
    expect(opened.dcapiResponse.enc?.hex).toBe(hex(sealed.enc));
    expect(opened.dcapiResponse.cipherText?.hex).toBe(hex(sealed.cipherText));
    expect(opened.deviceResponse.documents[0]?.elements[0]?.smartHealthCheckinResponse.present).toBe(true);
  });

  test("openWalletResponse rejects SMART responses that do not match the original request", async () => {
    const bundle = await buildOrgIsoMdocRequest(PATIENT_REQUEST, {
      nonce: new Uint8Array(Array.from({ length: 32 }, (_, i) => i)),
    });
    const sessionTranscript = await buildDcapiSessionTranscript({
      origin: "https://clinic.example",
      encryptionInfo: bundle.encryptionInfoBytes,
    });
    const plaintext = new Uint8Array(
      await Bun.file("../fixtures/responses/pymdoc-minimal/document.cbor").arrayBuffer(),
    );
    const sealed = await hpkeSealDirectMdoc({
      plaintext,
      recipientPublicJwk: bundle.verifierPublicJwk,
      info: sessionTranscript,
    });

    expect(
      openWalletResponse({
        response: sealed.response,
        recipientPrivateKey: bundle.verifierKeyPair.privateKey,
        recipientPublicJwk: bundle.verifierPublicJwk,
        sessionTranscript,
        smartRequest: PATIENT_REQUEST,
      }),
    ).rejects.toThrow("SMART response does not match request");
  });
});

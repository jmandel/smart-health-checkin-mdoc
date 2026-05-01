// SMART Health Check-in protocol helpers.
//
// Active mapping:
//   Digital Credentials API protocol: "org-iso-mdoc"
//   SMART request carrier: ItemsRequest.requestInfo["org.smarthealthit.checkin.request"]
//   Requested mdoc element: smart_health_checkin_response
//
// A dynamic element-identifier fallback (shc1j/shc1d) is documented and kept as
// utility code, but the active path assumes requestInfo is available to the
// wallet library and uses it as the load-bearing carrier.

export type FhirCanonical = string;
export type FhirVersion = string;
export type FhirResourceType = string;
export type SmartHealthCheckinAcceptedMediaType =
  | "application/smart-health-card"
  | "application/fhir+json"
  | (string & {});

export type FhirProfileCollectionRef =
  | FhirCanonical
  | {
      canonical: FhirCanonical;
      package?: string;
      version?: string;
    };

export type SmartCheckinContentSelector =
  | {
      kind: "fhir.resources";
      profiles?: ReadonlyArray<FhirCanonical>;
      profilesFrom?: FhirProfileCollectionRef | ReadonlyArray<FhirProfileCollectionRef>;
      resourceTypes?: ReadonlyArray<FhirResourceType>;
    }
  | {
      kind: "questionnaire";
      questionnaire:
        | FhirCanonical
        | unknown
        | {
            canonical?: FhirCanonical;
            resource?: unknown;
          };
    };

export type SmartCheckinRequestItem = {
  id: string;
  title: string;
  summary?: string;
  required?: boolean;
  content: SmartCheckinContentSelector;
  accept: ReadonlyArray<SmartHealthCheckinAcceptedMediaType>;
};

export type SmartCheckinRequest = {
  type: "smart-health-checkin-request";
  version: "1";
  id: string;
  purpose?: string;
  fhirVersions?: ReadonlyArray<FhirVersion>;
  items: ReadonlyArray<SmartCheckinRequestItem>;
};

export type SmartCheckinItemStatus = {
  item: string;
  status: "fulfilled" | "partial" | "unavailable" | "declined" | "unsupported" | "error";
  message?: string;
};

export type SmartArtifactBase = {
  id: string;
  mediaType: string;
  fulfills: ReadonlyArray<string>;
};

export type SmartArtifact =
  | (SmartArtifactBase & {
      mediaType: "application/smart-health-card";
      value: { verifiableCredential: ReadonlyArray<string> };
    })
  | (SmartArtifactBase & {
      mediaType: "application/fhir+json";
      fhirVersion: FhirVersion;
      value: unknown;
    })
  | (SmartArtifactBase & {
      value?: unknown;
      url?: string;
      data?: string;
      filename?: string;
      fhirVersion?: FhirVersion;
    });

export type SmartCheckinResponse = {
  type: "smart-health-checkin-response";
  version: "1";
  requestId: string;
  artifacts: ReadonlyArray<SmartArtifact>;
  requestStatus: ReadonlyArray<SmartCheckinItemStatus>;
};

export const PROTOCOL_ID = "org-iso-mdoc" as const;
export const MDOC_DOC_TYPE = "org.smarthealthit.checkin.1" as const;
export const MDOC_NAMESPACE = "org.smarthealthit.checkin" as const;
export const SMART_REQUEST_INFO_KEY = "org.smarthealthit.checkin.request" as const;
export const SMART_RESPONSE_ELEMENT_ID = "smart_health_checkin_response" as const;
export const DYNAMIC_ELEMENT_PREFIX = "shc1j" as const;
export const RESERVED_COMPRESSED_ELEMENT_PREFIX = "shc1d" as const;

export type OrgIsoMdocNavigatorArgument = {
  mediation: "required";
  digital: {
    requests: [
      {
        protocol: typeof PROTOCOL_ID;
        data: {
          deviceRequest: string;
          encryptionInfo: string;
        };
      },
    ];
  };
};

export type OrgIsoMdocRequestBundle = {
  navigatorArgument: OrgIsoMdocNavigatorArgument;
  verifierKeyPair: CryptoKeyPair;
  verifierPublicJwk: JsonWebKey;
  nonce: Uint8Array;
  requestedElementIdentifier: string;
  smartRequestJson: string;
  deviceRequestBytes: Uint8Array;
  encryptionInfoBytes: Uint8Array;
  itemsRequestTag24Bytes: Uint8Array;
  sessionTranscriptBytes?: Uint8Array;
  readerAuthBytes?: Uint8Array;
  readerKeyPair?: CryptoKeyPair;
  readerPublicJwk?: JsonWebKey;
  readerCertificateDer?: Uint8Array;
};

export type ReaderIdentity = {
  keyPair: CryptoKeyPair;
  publicJwk: JsonWebKey;
  certificateDer: Uint8Array;
};

export type DcapiMdocResponse = {
  protocol: typeof PROTOCOL_ID;
  data: {
    response: string;
  };
};

export type DcapiResponseInspection = {
  dcapiResponseHex: string;
  dcapiResponseDiagnostic: string;
  dcapiResponse: JsonValue;
  enc?: { hex: string; base64url: string };
  cipherText?: { hex: string; base64url: string };
};

export type JsonValue =
  | null
  | boolean
  | number
  | string
  | JsonValue[]
  | { [key: string]: JsonValue };

export type SmartRequestInspection =
  | {
      present: true;
      json: string;
      valid: true;
      value: SmartCheckinRequest;
    }
  | {
      present: true;
      json: string;
      valid: false;
      error: string;
    }
  | {
      present: false;
    };

export type ItemsRequestInspection = {
  itemsRequestHex: string;
  itemsRequestDiagnostic: string;
  itemsRequest: JsonValue;
  docType?: string;
  requestedElements: Array<{
    namespace: string;
    elementIdentifier: string;
    intentToRetain: boolean;
  }>;
  requestInfo?: JsonValue;
  smartHealthCheckin: SmartRequestInspection;
  readerAuth?: {
    readerAuthHex: string;
    payloadIsDetached: boolean;
    protectedHeaders?: JsonValue;
    unprotectedHeaders?: JsonValue;
    signatureHex?: string;
  };
};

export type DeviceRequestInspection = {
  deviceRequestHex: string;
  deviceRequestDiagnostic: string;
  deviceRequest: JsonValue;
  docRequests: ItemsRequestInspection[];
};

export type EncryptionInfoInspection = {
  encryptionInfoHex: string;
  encryptionInfoDiagnostic: string;
  encryptionInfo: JsonValue;
  nonce?: { hex: string; base64url: string };
  recipientPublicKey?: JsonValue;
};

export type OrgIsoMdocInspection = {
  protocol: typeof PROTOCOL_ID;
  deviceRequest: DeviceRequestInspection;
  encryptionInfo?: EncryptionInfoInspection;
  sessionTranscript?: {
    origin: string;
    hex: string;
    diagnostic: string;
  };
};

export type SmartResponseInspection =
  | {
      present: true;
      json: string;
      valid: true;
      value: SmartCheckinResponse;
    }
  | {
      present: true;
      json: string;
      valid: false;
      error: string;
    }
  | {
      present: false;
    };

export type IssuerSignedElementInspection = {
  namespace: string;
  digestID?: number;
  random?: { hex: string; base64url: string };
  elementIdentifier?: string;
  elementValue?: JsonValue;
  issuerSignedItemTag24Hex: string;
  issuerSignedItemDiagnostic: string;
  valueDigest?: {
    recomputedSha256: string;
    msoSha256?: string;
    matches?: boolean;
  };
  smartHealthCheckinResponse: SmartResponseInspection;
};

export type DeviceResponseDocumentInspection = {
  docType?: string;
  issuerAuth?: {
    mso?: JsonValue;
    msoDiagnostic?: string;
    digestAlgorithm?: string;
  };
  elements: IssuerSignedElementInspection[];
};

export type DeviceResponseInspection = {
  deviceResponseHex: string;
  deviceResponseDiagnostic: string;
  deviceResponse: JsonValue;
  version?: string;
  status?: number;
  documents: DeviceResponseDocumentInspection[];
};

export type HpkeSealResult = {
  enc: Uint8Array;
  cipherText: Uint8Array;
  response: DcapiMdocResponse;
};

export type OpenWalletResponseResult = {
  dcapiResponse: DcapiResponseInspection;
  deviceResponseBytes: Uint8Array;
  deviceResponse: DeviceResponseInspection;
  smartResponseValidation?: { ok: true; value: SmartCheckinResponse };
};

export function encodeDynamicElement(request: SmartCheckinRequest): string {
  return `${DYNAMIC_ELEMENT_PREFIX}.${base64UrlEncodeUtf8(JSON.stringify(request))}`;
}

export function decodeDynamicElement(element: string): SmartCheckinRequest {
  const prefix = `${DYNAMIC_ELEMENT_PREFIX}.`;
  if (!element.startsWith(prefix)) {
    throw new Error(`unsupported SMART Check-in element prefix: ${element.slice(0, 16)}`);
  }
  return JSON.parse(base64UrlDecodeUtf8(element.slice(prefix.length))) as SmartCheckinRequest;
}

export async function buildOrgIsoMdocRequest(
  smartRequest: SmartCheckinRequest,
  options: {
    nonce?: Uint8Array;
    verifierKeyPair?: CryptoKeyPair;
    deviceRequestVersion?: "1.0" | "1.1";
    responseElementIdentifier?: string;
    origin?: string;
    readerAuth?: boolean;
    readerIdentity?: ReaderIdentity;
  } = {},
): Promise<OrgIsoMdocRequestBundle> {
  const verifierKeyPair =
    options.verifierKeyPair ??
    ((await crypto.subtle.generateKey(
      { name: "ECDH", namedCurve: "P-256" },
      true,
      ["deriveBits"],
    )) as CryptoKeyPair);
  const verifierPublicJwk = await crypto.subtle.exportKey("jwk", verifierKeyPair.publicKey);
  const nonce = options.nonce ?? crypto.getRandomValues(new Uint8Array(32));
  if (nonce.length < 16) throw new Error("dcapi nonce must be at least 16 bytes");

  const smartRequestJson = JSON.stringify(smartRequest);
  const requestedElementIdentifier =
    options.responseElementIdentifier ?? SMART_RESPONSE_ELEMENT_ID;
  const encryptionInfoBytes = buildEncryptionInfoBytes({
    nonce,
    recipientPublicJwk: verifierPublicJwk,
  });
  const itemsRequestTag24Bytes = buildItemsRequestTag24Bytes({
    smartRequestJson,
    responseElementIdentifier: requestedElementIdentifier,
  });
  const shouldSignReaderAuth = options.readerAuth ?? options.origin !== undefined;
  const sessionTranscriptBytes = options.origin
    ? await buildDcapiSessionTranscript({
        origin: options.origin,
        encryptionInfo: encryptionInfoBytes,
      })
    : undefined;
  const readerIdentity =
    shouldSignReaderAuth && sessionTranscriptBytes
      ? options.readerIdentity ?? (await createEphemeralReaderIdentity())
      : undefined;
  const readerAuthBytes =
    readerIdentity && sessionTranscriptBytes
      ? await signReaderAuth({
          readerPrivateKey: readerIdentity.keyPair.privateKey,
          readerCertificateDer: readerIdentity.certificateDer,
          sessionTranscriptBytes,
          itemsRequestTag24Bytes,
        })
      : undefined;
  const deviceRequestBytes = buildDeviceRequestBytesFromParts({
    itemsRequestTag24Bytes,
    readerAuthBytes,
    version: options.deviceRequestVersion ?? "1.0",
  });

  return {
    navigatorArgument: {
      mediation: "required",
      digital: {
        requests: [
          {
            protocol: PROTOCOL_ID,
            data: {
              deviceRequest: base64UrlEncodeBytes(deviceRequestBytes),
              encryptionInfo: base64UrlEncodeBytes(encryptionInfoBytes),
            },
          },
        ],
      },
    },
    verifierKeyPair,
    verifierPublicJwk,
    nonce,
    requestedElementIdentifier,
    smartRequestJson,
    deviceRequestBytes,
    encryptionInfoBytes,
    itemsRequestTag24Bytes,
    sessionTranscriptBytes,
    readerAuthBytes,
    readerKeyPair: readerIdentity?.keyPair,
    readerPublicJwk: readerIdentity?.publicJwk,
    readerCertificateDer: readerIdentity?.certificateDer,
  };
}

export function buildDeviceRequestBytes(input: {
  smartRequestJson: string;
  responseElementIdentifier?: string;
  version?: "1.0" | "1.1";
}): Uint8Array {
  return buildDeviceRequestBytesFromParts({
    itemsRequestTag24Bytes: buildItemsRequestTag24Bytes(input),
    version: input.version ?? "1.0",
  });
}

export function buildItemsRequestTag24Bytes(input: {
  smartRequestJson: string;
  responseElementIdentifier?: string;
}): Uint8Array {
  const responseElementIdentifier =
    input.responseElementIdentifier ?? SMART_RESPONSE_ELEMENT_ID;
  const itemsRequest: Record<string, unknown> = {
    docType: MDOC_DOC_TYPE,
    nameSpaces: {
      [MDOC_NAMESPACE]: {
        [responseElementIdentifier]: true,
      },
    },
    requestInfo: {
      [SMART_REQUEST_INFO_KEY]: input.smartRequestJson,
    },
  };
  return cborEncode(new CborTag(24, cborEncode(itemsRequest)));
}

function buildDeviceRequestBytesFromParts(input: {
  itemsRequestTag24Bytes: Uint8Array;
  readerAuthBytes?: Uint8Array;
  version: "1.0" | "1.1";
}): Uint8Array {
  const deviceRequest: Record<string, unknown> = {
    version: input.version,
    docRequests: [
      {
        itemsRequest: cborDecode(input.itemsRequestTag24Bytes),
        readerAuth: input.readerAuthBytes ? cborDecode(input.readerAuthBytes) : undefined,
      },
    ],
  };
  return cborEncode(deviceRequest);
}

export function publicJwkToCoseKey(jwk: JsonWebKey): Map<number, number | Uint8Array> {
  if (jwk.kty !== "EC" || jwk.crv !== "P-256" || !jwk.x || !jwk.y) {
    throw new Error("expected P-256 EC public JWK");
  }
  return new Map<number, number | Uint8Array>([
    [1, 2], // kty: EC2
    [-1, 1], // crv: P-256
    [-2, base64UrlDecodeBytes(jwk.x)],
    [-3, base64UrlDecodeBytes(jwk.y)],
  ]);
}

export function buildEncryptionInfoBytes(input: {
  nonce: Uint8Array;
  recipientPublicJwk: JsonWebKey;
}): Uint8Array {
  return cborEncode([
    "dcapi",
    new Map<unknown, unknown>([
      ["nonce", input.nonce],
      ["recipientPublicKey", publicJwkToCoseKey(input.recipientPublicJwk)],
    ]),
  ]);
}

export async function buildDcapiSessionTranscript(input: {
  origin: string;
  encryptionInfo: string | Uint8Array;
}): Promise<Uint8Array> {
  const encryptionInfo =
    typeof input.encryptionInfo === "string"
      ? input.encryptionInfo
      : base64UrlEncodeBytes(input.encryptionInfo);
  const dcapiInfo = cborEncode([encryptionInfo, input.origin]);
  const handover = ["dcapi", await sha256(dcapiInfo)];
  return cborEncode([null, null, handover]);
}

export async function createEphemeralReaderIdentity(
  subjectCommonName = "SMART Health Check-in Demo Verifier",
): Promise<ReaderIdentity> {
  const keyPair = (await crypto.subtle.generateKey(
    { name: "ECDSA", namedCurve: "P-256" },
    true,
    ["sign", "verify"],
  )) as CryptoKeyPair;
  const publicJwk = await crypto.subtle.exportKey("jwk", keyPair.publicKey);
  const certificateDer = await createSelfSignedP256Certificate({
    subjectCommonName,
    keyPair,
  });
  return { keyPair, publicJwk, certificateDer };
}

export function buildReaderAuthenticationBytes(input: {
  sessionTranscriptBytes: Uint8Array;
  itemsRequestTag24Bytes: Uint8Array;
}): Uint8Array {
  return cborEncode(
    new CborTag(24, cborEncode([
      "ReaderAuthentication",
      cborDecode(input.sessionTranscriptBytes),
      cborDecode(input.itemsRequestTag24Bytes),
    ])),
  );
}

export async function signReaderAuth(input: {
  readerPrivateKey: CryptoKey;
  readerCertificateDer: Uint8Array;
  sessionTranscriptBytes: Uint8Array;
  itemsRequestTag24Bytes: Uint8Array;
}): Promise<Uint8Array> {
  const protectedBytes = cborEncode(new Map<unknown, unknown>([[1, -7]]));
  const unprotected = new Map<unknown, unknown>([[33, [input.readerCertificateDer]]]);
  const detachedPayload = buildReaderAuthenticationBytes(input);
  const sigStructure = cborEncode(["Signature1", protectedBytes, new Uint8Array(), detachedPayload]);
  const signature = new Uint8Array(
    await crypto.subtle.sign(
      { name: "ECDSA", hash: "SHA-256" },
      input.readerPrivateKey,
      arrayBufferCopy(sigStructure),
    ),
  );
  return cborEncode([protectedBytes, unprotected, null, signature]);
}

export async function verifyReaderAuthSignature(input: {
  readerAuthBytes: Uint8Array;
  readerPublicKey: CryptoKey;
  sessionTranscriptBytes: Uint8Array;
  itemsRequestTag24Bytes: Uint8Array;
}): Promise<boolean> {
  const decoded = cborDecode(input.readerAuthBytes);
  if (!Array.isArray(decoded) || decoded.length !== 4) return false;
  const [protectedBytes, , payload, signature] = decoded;
  if (!(protectedBytes instanceof Uint8Array) || payload !== null || !(signature instanceof Uint8Array)) {
    return false;
  }
  const detachedPayload = buildReaderAuthenticationBytes(input);
  const sigStructure = cborEncode(["Signature1", protectedBytes, new Uint8Array(), detachedPayload]);
  return crypto.subtle.verify(
    { name: "ECDSA", hash: "SHA-256" },
    input.readerPublicKey,
    arrayBufferCopy(signature),
    arrayBufferCopy(sigStructure),
  );
}

export function buildDcapiMdocResponse(input: {
  enc: Uint8Array;
  cipherText: Uint8Array;
}): DcapiMdocResponse {
  const response = cborEncode([
    "dcapi",
    new Map<unknown, unknown>([
      ["enc", input.enc],
      ["cipherText", input.cipherText],
    ]),
  ]);
  return {
    protocol: PROTOCOL_ID,
    data: {
      response: base64UrlEncodeBytes(response),
    },
  };
}

export function inspectDcapiMdocResponse(input: string | DcapiMdocResponse): DcapiResponseInspection {
  const response =
    typeof input === "string"
      ? input
      : typeof input.data?.response === "string"
        ? input.data.response
        : undefined;
  if (!response) throw new Error("missing direct mdoc data.response");

  const bytes = base64UrlDecodeBytes(response);
  const decoded = cborDecode(bytes);
  const fields = Array.isArray(decoded) ? decoded[1] : undefined;
  const enc = mapGet(fields, "enc");
  const cipherText = mapGet(fields, "cipherText");
  return {
    dcapiResponseHex: hex(bytes),
    dcapiResponseDiagnostic: cborDiagnostic(decoded),
    dcapiResponse: cborToJsonValue(decoded),
    enc: enc instanceof Uint8Array ? { hex: hex(enc), base64url: base64UrlEncodeBytes(enc) } : undefined,
    cipherText:
      cipherText instanceof Uint8Array
        ? { hex: hex(cipherText), base64url: base64UrlEncodeBytes(cipherText) }
        : undefined,
  };
}

export async function inspectDeviceResponseBytes(bytes: Uint8Array): Promise<DeviceResponseInspection> {
  const decoded = cborDecode(bytes);
  const version = mapGet(decoded, "version");
  const status = mapGet(decoded, "status");
  const documents = mapGet(decoded, "documents");
  const documentInspections: DeviceResponseDocumentInspection[] = [];

  if (Array.isArray(documents)) {
    for (const document of documents) {
      documentInspections.push(await inspectDeviceResponseDocument(document));
    }
  }

  return {
    deviceResponseHex: hex(bytes),
    deviceResponseDiagnostic: cborDiagnostic(decoded),
    deviceResponse: cborToJsonValue(decoded),
    version: typeof version === "string" ? version : undefined,
    status: typeof status === "number" ? status : undefined,
    documents: documentInspections,
  };
}

export async function hpkeSealDirectMdoc(input: {
  plaintext: Uint8Array;
  recipientPublicJwk: JsonWebKey;
  info: Uint8Array;
  aad?: Uint8Array;
}): Promise<HpkeSealResult> {
  const recipientPublicKey = await crypto.subtle.importKey(
    "jwk",
    input.recipientPublicJwk,
    { name: "ECDH", namedCurve: "P-256" },
    true,
    [],
  );
  const ephemeralKeyPair = (await crypto.subtle.generateKey(
    { name: "ECDH", namedCurve: "P-256" },
    true,
    ["deriveBits"],
  )) as CryptoKeyPair;
  const enc = new Uint8Array(await crypto.subtle.exportKey("raw", ephemeralKeyPair.publicKey));
  const dh = new Uint8Array(
    await crypto.subtle.deriveBits(
      { name: "ECDH", public: recipientPublicKey },
      ephemeralKeyPair.privateKey,
      256,
    ),
  );
  const recipientPublicBytes = publicJwkToRawP256(input.recipientPublicJwk);
  const context = await hpkeContext({
    dh,
    enc,
    recipientPublicBytes,
    info: input.info,
  });
  const cipherText = await hpkeAesGcm(true, {
    key: context.key,
    nonce: hpkeNonce(context.baseNonce),
    aad: input.aad ?? new Uint8Array(),
    data: input.plaintext,
  });
  return {
    enc,
    cipherText,
    response: buildDcapiMdocResponse({ enc, cipherText }),
  };
}

export async function openWalletResponse(input: {
  response: string | DcapiMdocResponse;
  recipientPrivateKey: CryptoKey;
  recipientPublicJwk: JsonWebKey;
  sessionTranscript: Uint8Array;
  smartRequest?: unknown;
  aad?: Uint8Array;
}): Promise<OpenWalletResponseResult> {
  const dcapiResponse = inspectDcapiMdocResponse(input.response);
  if (!dcapiResponse.enc || !dcapiResponse.cipherText) {
    throw new Error("direct dcapi response missing enc or cipherText");
  }
  const enc = base64UrlDecodeBytes(dcapiResponse.enc.base64url);
  const cipherText = base64UrlDecodeBytes(dcapiResponse.cipherText.base64url);
  const ephemeralPublicKey = await crypto.subtle.importKey(
    "raw",
    arrayBufferCopy(enc),
    { name: "ECDH", namedCurve: "P-256" },
    true,
    [],
  );
  const dh = new Uint8Array(
    await crypto.subtle.deriveBits(
      { name: "ECDH", public: ephemeralPublicKey },
      input.recipientPrivateKey,
      256,
    ),
  );
  const context = await hpkeContext({
    dh,
    enc,
    recipientPublicBytes: publicJwkToRawP256(input.recipientPublicJwk),
    info: input.sessionTranscript,
  });
  const deviceResponseBytes = await hpkeAesGcm(false, {
    key: context.key,
    nonce: hpkeNonce(context.baseNonce),
    aad: input.aad ?? new Uint8Array(),
    data: cipherText,
  });
  const deviceResponse = await inspectDeviceResponseBytes(deviceResponseBytes);
  const smartResponseValidation =
    input.smartRequest === undefined
      ? undefined
      : validateOpenedSmartResponseAgainstRequest(input.smartRequest, deviceResponse);
  return {
    dcapiResponse,
    deviceResponseBytes,
    deviceResponse,
    smartResponseValidation,
  };
}

function validateOpenedSmartResponseAgainstRequest(
  smartRequest: unknown,
  deviceResponse: DeviceResponseInspection,
): { ok: true; value: SmartCheckinResponse } {
  const response = firstSmartCheckinResponse(deviceResponse);
  if (!response.present) {
    throw new Error("SMART response is absent");
  }
  if (!response.valid) {
    throw new Error(`SMART response failed schema validation: ${response.error}`);
  }
  const validation = validateResponseAgainstRequest(smartRequest, response.value);
  if (!validation.ok) {
    throw new Error(`SMART response does not match request: ${validation.error}`);
  }
  return validation;
}

function firstSmartCheckinResponse(deviceResponse: DeviceResponseInspection): SmartResponseInspection {
  for (const document of deviceResponse.documents) {
    for (const element of document.elements) {
      if (element.smartHealthCheckinResponse.present) return element.smartHealthCheckinResponse;
    }
  }
  return { present: false };
}

export async function inspectOrgIsoMdocNavigatorArgument(
  arg: unknown,
  options: { origin?: string } = {},
): Promise<OrgIsoMdocInspection> {
  const request = extractOrgIsoMdocRequest(arg);
  const deviceRequestBytes = base64UrlDecodeBytes(request.data.deviceRequest);
  const encryptionInfoBytes = request.data.encryptionInfo
    ? base64UrlDecodeBytes(request.data.encryptionInfo)
    : undefined;
  const inspection: OrgIsoMdocInspection = {
    protocol: PROTOCOL_ID,
    deviceRequest: inspectDeviceRequestBytes(deviceRequestBytes),
  };

  if (encryptionInfoBytes) {
    inspection.encryptionInfo = inspectEncryptionInfoBytes(encryptionInfoBytes);
    if (options.origin) {
      const sessionTranscript = await buildDcapiSessionTranscript({
        origin: options.origin,
        encryptionInfo: encryptionInfoBytes,
      });
      inspection.sessionTranscript = {
        origin: options.origin,
        hex: hex(sessionTranscript),
        diagnostic: cborDiagnostic(cborDecode(sessionTranscript)),
      };
    }
  }

  return inspection;
}

export function inspectDeviceRequestBytes(bytes: Uint8Array): DeviceRequestInspection {
  const decoded = cborDecode(bytes);
  const docRequests = mapGet(decoded, "docRequests");
  const inspections: ItemsRequestInspection[] = [];

  if (Array.isArray(docRequests)) {
    for (const docRequest of docRequests) {
      const itemsRequestTag = mapGet(docRequest, "itemsRequest");
      if (!(itemsRequestTag instanceof CborTag) || itemsRequestTag.tag !== 24) {
        continue;
      }
      if (!(itemsRequestTag.value instanceof Uint8Array)) {
        continue;
      }
      const inspection = inspectItemsRequestBytes(itemsRequestTag.value);
      const readerAuth = mapGet(docRequest, "readerAuth");
      if (readerAuth !== undefined) {
        inspection.readerAuth = inspectReaderAuth(readerAuth);
      }
      inspections.push(inspection);
    }
  }

  return {
    deviceRequestHex: hex(bytes),
    deviceRequestDiagnostic: cborDiagnostic(decoded),
    deviceRequest: cborToJsonValue(decoded),
    docRequests: inspections,
  };
}

export function inspectItemsRequestBytes(bytes: Uint8Array): ItemsRequestInspection {
  const decoded = cborDecode(bytes);
  const docType = mapGet(decoded, "docType");
  const nameSpaces = mapGet(decoded, "nameSpaces");
  const requestInfo = mapGet(decoded, "requestInfo");
  const smartRequestJson = mapGet(requestInfo, SMART_REQUEST_INFO_KEY);
  const requestedElements: ItemsRequestInspection["requestedElements"] = [];

  if (nameSpaces instanceof Map) {
    for (const [namespace, elements] of nameSpaces.entries()) {
      if (typeof namespace !== "string" || !(elements instanceof Map)) continue;
      for (const [elementIdentifier, intentToRetain] of elements.entries()) {
        if (typeof elementIdentifier !== "string") continue;
        requestedElements.push({
          namespace,
          elementIdentifier,
          intentToRetain: intentToRetain === true,
        });
      }
    }
  }

  return {
    itemsRequestHex: hex(bytes),
    itemsRequestDiagnostic: cborDiagnostic(decoded),
    itemsRequest: cborToJsonValue(decoded),
    docType: typeof docType === "string" ? docType : undefined,
    requestedElements,
    requestInfo: requestInfo === undefined ? undefined : cborToJsonValue(requestInfo),
    smartHealthCheckin: inspectSmartRequestInfoValue(smartRequestJson),
  };
}

function inspectReaderAuth(readerAuth: unknown): NonNullable<ItemsRequestInspection["readerAuth"]> {
  const protectedBytes = Array.isArray(readerAuth) ? readerAuth[0] : undefined;
  const unprotected = Array.isArray(readerAuth) ? readerAuth[1] : undefined;
  const payload = Array.isArray(readerAuth) ? readerAuth[2] : undefined;
  const signature = Array.isArray(readerAuth) ? readerAuth[3] : undefined;
  return {
    readerAuthHex: hex(cborEncode(readerAuth)),
    payloadIsDetached: payload === null,
    protectedHeaders: protectedBytes instanceof Uint8Array
      ? cborToJsonValue(cborDecode(protectedBytes))
      : undefined,
    unprotectedHeaders: unprotected === undefined ? undefined : cborToJsonValue(unprotected),
    signatureHex: signature instanceof Uint8Array ? hex(signature) : undefined,
  };
}

export function inspectEncryptionInfoBytes(bytes: Uint8Array): EncryptionInfoInspection {
  const decoded = cborDecode(bytes);
  const fields = Array.isArray(decoded) ? decoded[1] : undefined;
  const nonce = mapGet(fields, "nonce");
  const recipientPublicKey = mapGet(fields, "recipientPublicKey");

  return {
    encryptionInfoHex: hex(bytes),
    encryptionInfoDiagnostic: cborDiagnostic(decoded),
    encryptionInfo: cborToJsonValue(decoded),
    nonce:
      nonce instanceof Uint8Array
        ? { hex: hex(nonce), base64url: base64UrlEncodeBytes(nonce) }
        : undefined,
    recipientPublicKey:
      recipientPublicKey === undefined ? undefined : cborToJsonValue(recipientPublicKey),
  };
}

async function inspectDeviceResponseDocument(
  document: unknown,
): Promise<DeviceResponseDocumentInspection> {
  const docType = mapGet(document, "docType");
  const issuerSigned = mapGet(document, "issuerSigned");
  const nameSpaces = mapGet(issuerSigned, "nameSpaces");
  const issuerAuth = inspectIssuerAuth(mapGet(issuerSigned, "issuerAuth"));
  const elements: IssuerSignedElementInspection[] = [];

  if (nameSpaces instanceof Map) {
    for (const [namespace, items] of nameSpaces.entries()) {
      if (typeof namespace !== "string" || !Array.isArray(items)) continue;
      for (const item of items) {
        elements.push(await inspectIssuerSignedItem(namespace, item, issuerAuth?.mso));
      }
    }
  }

  return {
    docType: typeof docType === "string" ? docType : undefined,
    issuerAuth,
    elements,
  };
}

function inspectIssuerAuth(issuerAuth: unknown): DeviceResponseDocumentInspection["issuerAuth"] | undefined {
  if (!Array.isArray(issuerAuth) || !(issuerAuth[2] instanceof Uint8Array)) {
    return undefined;
  }
  const msoTag = cborDecode(issuerAuth[2]);
  if (!(msoTag instanceof CborTag) || msoTag.tag !== 24 || !(msoTag.value instanceof Uint8Array)) {
    return undefined;
  }
  const mso = cborDecode(msoTag.value);
  const digestAlgorithm = mapGet(mso, "digestAlgorithm");
  return {
    mso: cborToJsonValue(mso),
    msoDiagnostic: cborDiagnostic(mso),
    digestAlgorithm: typeof digestAlgorithm === "string" ? digestAlgorithm : undefined,
  };
}

async function inspectIssuerSignedItem(
  namespace: string,
  item: unknown,
  msoJson?: JsonValue,
): Promise<IssuerSignedElementInspection> {
  if (!(item instanceof CborTag) || item.tag !== 24 || !(item.value instanceof Uint8Array)) {
    throw new Error("issuer signed item must be tag 24 around CBOR bytes");
  }

  const tag24Bytes = cborEncode(item);
  const issuerSignedItem = cborDecode(item.value);
  const digestID = mapGet(issuerSignedItem, "digestID");
  const random = mapGet(issuerSignedItem, "random");
  const elementIdentifier = mapGet(issuerSignedItem, "elementIdentifier");
  const elementValue = mapGet(issuerSignedItem, "elementValue");
  const recomputedDigest = await sha256(tag24Bytes);
  const msoDigest = lookupMsoDigest(msoJson, namespace, digestID);
  const smartHealthCheckinResponse =
    elementIdentifier === SMART_RESPONSE_ELEMENT_ID
      ? inspectSmartResponseValue(elementValue)
      : { present: false as const };

  return {
    namespace,
    digestID: typeof digestID === "number" ? digestID : undefined,
    random:
      random instanceof Uint8Array
        ? { hex: hex(random), base64url: base64UrlEncodeBytes(random) }
        : undefined,
    elementIdentifier: typeof elementIdentifier === "string" ? elementIdentifier : undefined,
    elementValue: elementValue === undefined ? undefined : cborToJsonValue(elementValue),
    issuerSignedItemTag24Hex: hex(tag24Bytes),
    issuerSignedItemDiagnostic: cborDiagnostic(issuerSignedItem),
    valueDigest: {
      recomputedSha256: hex(recomputedDigest),
      msoSha256: msoDigest ? hex(msoDigest) : undefined,
      matches: msoDigest ? compareBytes(recomputedDigest, msoDigest) === 0 : undefined,
    },
    smartHealthCheckinResponse,
  };
}

function lookupMsoDigest(msoJson: JsonValue | undefined, namespace: string, digestID: unknown): Uint8Array | undefined {
  if (
    typeof msoJson !== "object" ||
    msoJson === null ||
    Array.isArray(msoJson) ||
    typeof digestID !== "number"
  ) {
    return undefined;
  }
  const valueDigests = msoJson.valueDigests;
  if (typeof valueDigests !== "object" || valueDigests === null || Array.isArray(valueDigests)) {
    return undefined;
  }
  const namespaceDigests = valueDigests[namespace];
  if (
    typeof namespaceDigests !== "object" ||
    namespaceDigests === null ||
    Array.isArray(namespaceDigests)
  ) {
    return undefined;
  }
  const digest = namespaceDigests[String(digestID)];
  if (typeof digest !== "object" || digest === null || Array.isArray(digest)) {
    return undefined;
  }
  const encoded = digest.$bytes;
  return typeof encoded === "string" ? base64UrlDecodeBytes(encoded) : undefined;
}

function inspectSmartResponseValue(value: unknown): SmartResponseInspection {
  if (value === undefined) return { present: false };
  if (typeof value !== "string") {
    return { present: true, json: "", valid: false, error: "SMART response elementValue is not a string" };
  }
  try {
    const parsed = JSON.parse(value);
    const validated = validateSmartCheckinResponse(parsed);
    if (!validated.ok) {
      return { present: true, json: value, valid: false, error: validated.error };
    }
    return { present: true, json: value, valid: true, value: validated.value };
  } catch (e) {
    return {
      present: true,
      json: value,
      valid: false,
      error: e instanceof Error ? e.message : String(e),
    };
  }
}

export function cborDecode(bytes: Uint8Array): unknown {
  const decoder = new CborDecoder(bytes);
  const value = decoder.read();
  decoder.assertDone();
  return value;
}

export function cborDiagnostic(value: unknown): string {
  if (value === null) return "null";
  if (value === false) return "false";
  if (value === true) return "true";
  if (typeof value === "number") return String(value);
  if (typeof value === "string") return JSON.stringify(value);
  if (value instanceof Uint8Array) return `h'${hex(value)}'`;
  if (value instanceof CborTag) {
    return `${value.tag}(${cborDiagnostic(value.value)})`;
  }
  if (Array.isArray(value)) {
    return `[${value.map(cborDiagnostic).join(", ")}]`;
  }
  if (value instanceof Map) {
    return `{${[...value.entries()]
      .map(([k, v]) => `${cborDiagnostic(k)}: ${cborDiagnostic(v)}`)
      .join(", ")}}`;
  }
  throw new Error(`unsupported diagnostic CBOR value: ${String(value)}`);
}

export function cborToJsonValue(value: unknown): JsonValue {
  if (
    value === null ||
    typeof value === "boolean" ||
    typeof value === "number" ||
    typeof value === "string"
  ) {
    return value;
  }
  if (value instanceof Uint8Array) {
    return {
      $bytes: base64UrlEncodeBytes(value),
      hex: hex(value),
    };
  }
  if (value instanceof CborTag) {
    return {
      $tag: value.tag,
      value: cborToJsonValue(value.value),
    };
  }
  if (Array.isArray(value)) {
    return value.map(cborToJsonValue);
  }
  if (value instanceof Map) {
    if ([...value.keys()].every((k) => typeof k === "string" || typeof k === "number")) {
      const out: Record<string, JsonValue> = {};
      for (const [k, v] of value.entries()) out[String(k)] = cborToJsonValue(v);
      return out;
    }
    return {
      $map: [...value.entries()].map(([key, val]) => ({
        key: cborToJsonValue(key),
        value: cborToJsonValue(val),
      })),
    };
  }
  throw new Error(`unsupported JSON conversion value: ${String(value)}`);
}

// Validate a candidate SMART request JSON object. Lightweight; the real
// library replacing this will likely return a richer Result type.
export function validateSmartCheckinRequest(
  v: unknown,
): { ok: true; value: SmartCheckinRequest } | { ok: false; error: string } {
  if (!isRecord(v)) {
    return { ok: false, error: "request must be an object" };
  }
  const obj = v;
  if (obj.type !== "smart-health-checkin-request") {
    return { ok: false, error: 'type must be "smart-health-checkin-request"' };
  }
  if (obj.version !== "1") return { ok: false, error: 'version must be "1"' };
  if (!nonEmptyString(obj.id)) return { ok: false, error: "id missing or not a string" };
  if (obj.purpose !== undefined && typeof obj.purpose !== "string") {
    return { ok: false, error: "purpose must be a string" };
  }
  if (obj.fhirVersions !== undefined && !stringArray(obj.fhirVersions)) {
    return { ok: false, error: "fhirVersions must be an array of strings" };
  }
  if (!Array.isArray(obj.items)) return { ok: false, error: "items must be an array" };
  const ids = new Set<string>();
  for (let i = 0; i < obj.items.length; i++) {
    const item = obj.items[i];
    if (!isRecord(item)) {
      return { ok: false, error: `items[${i}] is not an object` };
    }
    if (!nonEmptyString(item.id)) {
      return { ok: false, error: `items[${i}].id missing or not a string` };
    }
    if (ids.has(item.id)) return { ok: false, error: `items[${i}].id is duplicated` };
    ids.add(item.id);
    if (!nonEmptyString(item.title)) {
      return { ok: false, error: `items[${i}].title missing or not a string` };
    }
    if (item.summary !== undefined && typeof item.summary !== "string") {
      return { ok: false, error: `items[${i}].summary must be a string` };
    }
    if (item.required !== undefined && typeof item.required !== "boolean") {
      return { ok: false, error: `items[${i}].required must be a boolean` };
    }
    if (!stringArray(item.accept) || item.accept.length === 0) {
      return { ok: false, error: `items[${i}].accept must be a non-empty string array` };
    }
    const content = item.content;
    if (!isRecord(content)) {
      return { ok: false, error: `items[${i}].content must be an object` };
    }
    const contentError = validateContentSelector(content, `items[${i}].content`);
    if (contentError) return { ok: false, error: contentError };
  }
  return { ok: true, value: obj as unknown as SmartCheckinRequest };
}

function validateContentSelector(content: Record<string, unknown>, path: string): string | undefined {
  if (content.kind === "fhir.resources") {
    if (content.profiles !== undefined && !stringArray(content.profiles)) {
      return `${path}.profiles must be an array of strings`;
    }
    if (content.resourceTypes !== undefined && !stringArray(content.resourceTypes)) {
      return `${path}.resourceTypes must be an array of strings`;
    }
    if (content.profilesFrom !== undefined && !validProfilesFrom(content.profilesFrom)) {
      return `${path}.profilesFrom must be a canonical URL string or object`;
    }
    return undefined;
  }
  if (content.kind === "questionnaire") {
    const questionnaire = content.questionnaire;
    if (typeof questionnaire === "string") {
      return questionnaire.length > 0 ? undefined : `${path}.questionnaire must not be blank`;
    }
    if (!isRecord(questionnaire)) return `${path}.questionnaire must be a canonical string or object`;
    if (questionnaire.resourceType === "Questionnaire") return undefined;
    if (questionnaire.canonical === undefined && questionnaire.resource === undefined) {
      return `${path}.questionnaire object must include canonical or resource`;
    }
    if (questionnaire.canonical !== undefined && !nonEmptyString(questionnaire.canonical)) {
      return `${path}.questionnaire.canonical must be a string`;
    }
    if (questionnaire.resource !== undefined && !isRecord(questionnaire.resource)) {
      return `${path}.questionnaire.resource must be an object`;
    }
    return undefined;
  }
  return `${path}.kind must be fhir.resources or questionnaire`;
}

function validProfilesFrom(value: unknown): boolean {
  if (typeof value === "string") return isCanonicalUrl(value);
  if (Array.isArray(value)) return value.length > 0 && value.every(validProfilesFrom);
  if (!isRecord(value)) return false;
  return isCanonicalUrl(value.canonical);
}

export function validateSmartCheckinResponse(
  v: unknown,
): { ok: true; value: SmartCheckinResponse } | { ok: false; error: string } {
  if (!isRecord(v)) {
    return { ok: false, error: "response must be an object" };
  }
  const obj = v;
  if (obj.type !== "smart-health-checkin-response") {
    return { ok: false, error: 'type must be "smart-health-checkin-response"' };
  }
  if (obj.version !== "1") return { ok: false, error: 'version must be "1"' };
  if (!nonEmptyString(obj.requestId)) return { ok: false, error: "requestId missing or not a string" };
  if (!Array.isArray(obj.artifacts)) return { ok: false, error: "artifacts must be an array" };
  if (!Array.isArray(obj.requestStatus)) {
    return { ok: false, error: "requestStatus must be an array" };
  }
  const artifactIds = new Set<string>();
  for (let i = 0; i < obj.artifacts.length; i++) {
    const artifact = obj.artifacts[i];
    if (!isRecord(artifact)) {
      return { ok: false, error: `artifacts[${i}] is not an object` };
    }
    if (!nonEmptyString(artifact.id)) {
      return { ok: false, error: `artifacts[${i}].id missing or not a string` };
    }
    if (artifactIds.has(artifact.id)) {
      return { ok: false, error: `artifacts[${i}].id is duplicated` };
    }
    artifactIds.add(artifact.id);
    if (!nonEmptyString(artifact.mediaType)) {
      return { ok: false, error: `artifacts[${i}].mediaType missing or not a string` };
    }
    if (!stringArray(artifact.fulfills) || artifact.fulfills.length === 0) {
      return { ok: false, error: `artifacts[${i}].fulfills must be a non-empty array of strings` };
    }
    const artifactError = validateArtifact(artifact, `artifacts[${i}]`);
    if (artifactError) return { ok: false, error: artifactError };
  }
  const seenStatus = new Set<string>();
  for (let i = 0; i < obj.requestStatus.length; i++) {
    const status = obj.requestStatus[i];
    if (!isRecord(status)) return { ok: false, error: `requestStatus[${i}] is not an object` };
    if (!nonEmptyString(status.item)) {
      return { ok: false, error: `requestStatus[${i}].item missing or not a string` };
    }
    if (seenStatus.has(status.item)) {
      return { ok: false, error: `requestStatus[${i}].item is duplicated` };
    }
    seenStatus.add(status.item);
    if (!["fulfilled", "partial", "unavailable", "declined", "unsupported", "error"].includes(String(status.status))) {
      return { ok: false, error: `requestStatus[${i}].status invalid` };
    }
    if (status.message !== undefined && typeof status.message !== "string") {
      return { ok: false, error: `requestStatus[${i}].message must be a string` };
    }
  }
  return { ok: true, value: obj as unknown as SmartCheckinResponse };
}

function validateArtifact(artifact: Record<string, unknown>, path: string): string | undefined {
  if (artifact.mediaType === "application/smart-health-card") {
    if (artifact.fhirVersion !== undefined) {
      return `${path}.fhirVersion must not be present for application/smart-health-card`;
    }
    const value = artifact.value;
    if (!isRecord(value) || !stringArray(value.verifiableCredential) || value.verifiableCredential.length === 0) {
      return `${path}.value.verifiableCredential must be a non-empty string array`;
    }
    return undefined;
  }
  if (artifact.mediaType === "application/fhir+json") {
    if (!nonEmptyString(artifact.fhirVersion)) return `${path}.fhirVersion missing or not a string`;
    if (!("value" in artifact)) return `${path}.value missing`;
    return undefined;
  }
  if (!("value" in artifact) && !("url" in artifact) && !("data" in artifact)) {
    return `${path} must include value, url, or data`;
  }
  return undefined;
}

export function validateResponseAgainstRequest(
  request: unknown,
  response: unknown,
): { ok: true; value: SmartCheckinResponse } | { ok: false; error: string } {
  const requestValidation = validateSmartCheckinRequest(request);
  if (!requestValidation.ok) return { ok: false, error: `request invalid: ${requestValidation.error}` };
  const responseValidation = validateSmartCheckinResponse(response);
  if (!responseValidation.ok) return responseValidation;

  const req = requestValidation.value;
  const resp = responseValidation.value;
  if (resp.requestId !== req.id) {
    return { ok: false, error: `requestId must match request id ${req.id}` };
  }

  const itemIds = new Set(req.items.map((item) => item.id));
  for (let i = 0; i < resp.artifacts.length; i++) {
    const artifact = resp.artifacts[i]!;
    for (const itemId of artifact.fulfills) {
      if (!itemIds.has(itemId)) {
        return { ok: false, error: `artifacts[${i}].fulfills references unknown item ${itemId}` };
      }
    }
  }

  const statusItems = new Set(resp.requestStatus.map((status) => status.item));
  for (let i = 0; i < resp.requestStatus.length; i++) {
    const itemId = resp.requestStatus[i]!.item;
    if (!itemIds.has(itemId)) {
      return { ok: false, error: `requestStatus[${i}].item references unknown item ${itemId}` };
    }
  }
  for (const itemId of itemIds) {
    if (!statusItems.has(itemId)) {
      return { ok: false, error: `requestStatus missing item ${itemId}` };
    }
  }

  return responseValidation;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function nonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.length > 0;
}

function stringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

function isCanonicalUrl(value: unknown): value is string {
  return typeof value === "string" && /^https?:\/\//.test(value);
}

export function base64UrlEncodeUtf8(s: string): string {
  return base64UrlEncodeBytes(new TextEncoder().encode(s));
}

export function base64UrlDecodeUtf8(s: string): string {
  return new TextDecoder().decode(base64UrlDecodeBytes(s));
}

export function base64UrlEncodeBytes(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.length; i += 0x8000) {
    binary += String.fromCharCode(...bytes.slice(i, i + 0x8000));
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

export function base64UrlDecodeBytes(s: string): Uint8Array {
  const padded = s.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(s.length / 4) * 4, "=");
  const binary = atob(padded);
  const out = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) out[i] = binary.charCodeAt(i);
  return out;
}

export function hex(bytes: Uint8Array): string {
  return [...bytes].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export class CborTag {
  constructor(
    readonly tag: number,
    readonly value: unknown,
  ) {}
}

function extractOrgIsoMdocRequest(arg: unknown): {
  protocol: typeof PROTOCOL_ID;
  data: { deviceRequest: string; encryptionInfo?: string };
} {
  if (typeof arg !== "object" || arg === null) {
    throw new Error("navigator argument must be an object");
  }
  const requests =
    (arg as { digital?: { requests?: unknown } }).digital?.requests ??
    (arg as { requests?: unknown }).requests;
  if (!Array.isArray(requests)) {
    throw new Error("navigator argument missing digital.requests[] or requests[]");
  }
  const request = requests.find(
    (r) => typeof r === "object" && r !== null && (r as { protocol?: unknown }).protocol === PROTOCOL_ID,
  );
  if (typeof request !== "object" || request === null) {
    throw new Error(`navigator argument has no ${PROTOCOL_ID} request`);
  }
  const data = (request as { data?: unknown }).data;
  if (typeof data !== "object" || data === null) {
    throw new Error(`${PROTOCOL_ID} request missing data object`);
  }
  const deviceRequest = (data as { deviceRequest?: unknown }).deviceRequest;
  const encryptionInfo = (data as { encryptionInfo?: unknown }).encryptionInfo;
  if (typeof deviceRequest !== "string") {
    throw new Error(`${PROTOCOL_ID} request data.deviceRequest must be a string`);
  }
  if (encryptionInfo !== undefined && typeof encryptionInfo !== "string") {
    throw new Error(`${PROTOCOL_ID} request data.encryptionInfo must be a string`);
  }
  return {
    protocol: PROTOCOL_ID,
    data: { deviceRequest, encryptionInfo },
  };
}

function inspectSmartRequestInfoValue(value: unknown): SmartRequestInspection {
  if (value === undefined) return { present: false };
  if (typeof value !== "string") {
    return {
      present: true,
      json: "",
      valid: false,
      error: `requestInfo["${SMART_REQUEST_INFO_KEY}"] is not a string`,
    };
  }
  try {
    const parsed = JSON.parse(value);
    const validated = validateSmartCheckinRequest(parsed);
    if (!validated.ok) {
      return { present: true, json: value, valid: false, error: validated.error };
    }
    return { present: true, json: value, valid: true, value: validated.value };
  } catch (e) {
    return {
      present: true,
      json: value,
      valid: false,
      error: e instanceof Error ? e.message : String(e),
    };
  }
}

function mapGet(value: unknown, key: string): unknown {
  if (!(value instanceof Map)) return undefined;
  return value.get(key);
}

const HPKE_KEM_DHKEM_P256_HKDF_SHA256 = 0x0010;
const HPKE_KDF_HKDF_SHA256 = 0x0001;
const HPKE_AEAD_AES_128_GCM = 0x0001;
const HPKE_NH = 32;
const HPKE_NK = 16;
const HPKE_NN = 12;

function publicJwkToRawP256(jwk: JsonWebKey): Uint8Array {
  if (jwk.kty !== "EC" || jwk.crv !== "P-256" || !jwk.x || !jwk.y) {
    throw new Error("expected P-256 EC public JWK");
  }
  return concatBytes([
    new Uint8Array([0x04]),
    base64UrlDecodeBytes(jwk.x),
    base64UrlDecodeBytes(jwk.y),
  ]);
}

async function hpkeContext(input: {
  dh: Uint8Array;
  enc: Uint8Array;
  recipientPublicBytes: Uint8Array;
  info: Uint8Array;
}): Promise<{ key: Uint8Array; baseNonce: Uint8Array }> {
  const kemSuiteId = concatBytes([
    utf8("KEM"),
    i2osp(HPKE_KEM_DHKEM_P256_HKDF_SHA256, 2),
  ]);
  const hpkeSuiteId = concatBytes([
    utf8("HPKE"),
    i2osp(HPKE_KEM_DHKEM_P256_HKDF_SHA256, 2),
    i2osp(HPKE_KDF_HKDF_SHA256, 2),
    i2osp(HPKE_AEAD_AES_128_GCM, 2),
  ]);
  const kemContext = concatBytes([input.enc, input.recipientPublicBytes]);
  const eaePrk = await hpkeLabeledExtract(kemSuiteId, new Uint8Array(), "eae_prk", input.dh);
  const sharedSecret = await hpkeLabeledExpand(kemSuiteId, eaePrk, "shared_secret", kemContext, HPKE_NH);

  const pskIdHash = await hpkeLabeledExtract(hpkeSuiteId, new Uint8Array(), "psk_id_hash", new Uint8Array());
  const infoHash = await hpkeLabeledExtract(hpkeSuiteId, new Uint8Array(), "info_hash", input.info);
  const keyScheduleContext = concatBytes([new Uint8Array([0]), pskIdHash, infoHash]);
  const secret = await hpkeLabeledExtract(hpkeSuiteId, sharedSecret, "secret", new Uint8Array());
  const key = await hpkeLabeledExpand(hpkeSuiteId, secret, "key", keyScheduleContext, HPKE_NK);
  const baseNonce = await hpkeLabeledExpand(hpkeSuiteId, secret, "base_nonce", keyScheduleContext, HPKE_NN);
  return { key, baseNonce };
}

async function hpkeLabeledExtract(
  suiteId: Uint8Array,
  salt: Uint8Array,
  label: string,
  ikm: Uint8Array,
): Promise<Uint8Array> {
  return hkdfExtract(
    salt,
    concatBytes([utf8("HPKE-v1"), suiteId, utf8(label), ikm]),
  );
}

async function hpkeLabeledExpand(
  suiteId: Uint8Array,
  prk: Uint8Array,
  label: string,
  info: Uint8Array,
  length: number,
): Promise<Uint8Array> {
  return hkdfExpand(
    prk,
    concatBytes([i2osp(length, 2), utf8("HPKE-v1"), suiteId, utf8(label), info]),
    length,
  );
}

async function hkdfExtract(salt: Uint8Array, ikm: Uint8Array): Promise<Uint8Array> {
  const hmacKey = await crypto.subtle.importKey(
    "raw",
    arrayBufferCopy(salt.length === 0 ? new Uint8Array(HPKE_NH) : salt),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  return new Uint8Array(await crypto.subtle.sign("HMAC", hmacKey, arrayBufferCopy(ikm)));
}

async function hkdfExpand(prk: Uint8Array, info: Uint8Array, length: number): Promise<Uint8Array> {
  const n = Math.ceil(length / HPKE_NH);
  if (n > 255) throw new Error("HKDF expand length too large");
  const hmacKey = await crypto.subtle.importKey(
    "raw",
    arrayBufferCopy(prk),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const chunks: Uint8Array[] = [];
  let previous = new Uint8Array();
  for (let i = 1; i <= n; i++) {
    previous = new Uint8Array(
      await crypto.subtle.sign(
        "HMAC",
        hmacKey,
        arrayBufferCopy(concatBytes([previous, info, new Uint8Array([i])])),
      ),
    );
    chunks.push(previous);
  }
  return concatBytes(chunks).slice(0, length);
}

async function hpkeAesGcm(
  encrypt: boolean,
  input: { key: Uint8Array; nonce: Uint8Array; aad: Uint8Array; data: Uint8Array },
): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey(
    "raw",
    arrayBufferCopy(input.key),
    { name: "AES-GCM", length: 128 },
    false,
    encrypt ? ["encrypt"] : ["decrypt"],
  );
  const params: AesGcmParams = {
    name: "AES-GCM",
    iv: arrayBufferCopy(input.nonce),
    additionalData: arrayBufferCopy(input.aad),
    tagLength: 128,
  };
  const out = encrypt
    ? await crypto.subtle.encrypt(params, key, arrayBufferCopy(input.data))
    : await crypto.subtle.decrypt(params, key, arrayBufferCopy(input.data));
  return new Uint8Array(out);
}

function hpkeNonce(baseNonce: Uint8Array, sequenceNumber = 0): Uint8Array {
  const nonce = new Uint8Array(baseNonce);
  const sequence = i2osp(sequenceNumber, HPKE_NN);
  for (let i = 0; i < nonce.length; i++) nonce[i] = nonce[i]! ^ sequence[i]!;
  return nonce;
}

function arrayBufferCopy(bytes: Uint8Array): ArrayBuffer {
  const copy = new Uint8Array(bytes.length);
  copy.set(bytes);
  return copy.buffer;
}

function i2osp(value: number, length: number): Uint8Array {
  if (!Number.isSafeInteger(value) || value < 0) throw new Error("i2osp value must be a non-negative safe integer");
  const out = new Uint8Array(length);
  for (let i = length - 1, v = value; i >= 0; i--) {
    out[i] = v & 0xff;
    v = Math.floor(v / 256);
  }
  return out;
}

class CborDecoder {
  private offset = 0;

  constructor(private readonly bytes: Uint8Array) {}

  read(): unknown {
    const initial = this.readByte();
    const majorType = initial >> 5;
    const additional = initial & 0x1f;
    switch (majorType) {
      case 0:
        return this.readArgument(additional);
      case 1:
        return -1 - this.readArgument(additional);
      case 2: {
        const length = this.readArgument(additional);
        return this.readBytes(length);
      }
      case 3: {
        const length = this.readArgument(additional);
        return new TextDecoder().decode(this.readBytes(length));
      }
      case 4: {
        const length = this.readArgument(additional);
        const out: unknown[] = [];
        for (let i = 0; i < length; i++) out.push(this.read());
        return out;
      }
      case 5: {
        const length = this.readArgument(additional);
        const out = new Map<unknown, unknown>();
        for (let i = 0; i < length; i++) out.set(this.read(), this.read());
        return out;
      }
      case 6:
        return new CborTag(this.readArgument(additional), this.read());
      case 7:
        return this.readSimple(additional);
      default:
        throw new Error(`unsupported CBOR major type ${majorType}`);
    }
  }

  assertDone(): void {
    if (this.offset !== this.bytes.length) {
      throw new Error(`CBOR decoder stopped at ${this.offset}, ${this.bytes.length - this.offset} trailing bytes`);
    }
  }

  private readSimple(additional: number): unknown {
    if (additional === 20) return false;
    if (additional === 21) return true;
    if (additional === 22) return null;
    if (additional === 23) return undefined;
    throw new Error(`unsupported CBOR simple/float additional info ${additional}`);
  }

  private readArgument(additional: number): number {
    if (additional < 24) return additional;
    if (additional === 24) return this.readByte();
    if (additional === 25) return this.readUint(2);
    if (additional === 26) return this.readUint(4);
    if (additional === 27) {
      const hi = this.readUint(4);
      const lo = this.readUint(4);
      const value = hi * 0x100000000 + lo;
      if (!Number.isSafeInteger(value)) throw new Error("CBOR integer exceeds Number safe range");
      return value;
    }
    if (additional === 31) throw new Error("indefinite-length CBOR is not supported");
    throw new Error(`invalid CBOR additional info ${additional}`);
  }

  private readUint(length: number): number {
    let out = 0;
    for (let i = 0; i < length; i++) out = out * 256 + this.readByte();
    return out;
  }

  private readBytes(length: number): Uint8Array {
    if (this.offset + length > this.bytes.length) {
      throw new Error(`CBOR byte string exceeds input at offset ${this.offset}`);
    }
    const out = this.bytes.slice(this.offset, this.offset + length);
    this.offset += length;
    return out;
  }

  private readByte(): number {
    if (this.offset >= this.bytes.length) throw new Error("unexpected end of CBOR input");
    return this.bytes[this.offset++]!;
  }
}

function utf8(s: string): Uint8Array {
  return new TextEncoder().encode(s);
}

async function sha256(bytes: Uint8Array): Promise<Uint8Array> {
  const copy = new Uint8Array(bytes);
  return new Uint8Array(await crypto.subtle.digest("SHA-256", copy.buffer as ArrayBuffer));
}

function cborEncode(value: unknown): Uint8Array {
  if (value === null) return new Uint8Array([0xf6]);
  if (value === false) return new Uint8Array([0xf4]);
  if (value === true) return new Uint8Array([0xf5]);
  if (typeof value === "number") {
    if (!Number.isInteger(value)) throw new Error("CBOR number must be an integer");
    if (value >= 0) return cborHead(0, value);
    return cborHead(1, -1 - value);
  }
  if (typeof value === "string") return concatBytes([cborHead(3, utf8(value).length), utf8(value)]);
  if (value instanceof Uint8Array) return concatBytes([cborHead(2, value.length), value]);
  if (value instanceof CborTag) {
    return concatBytes([cborHead(6, value.tag), cborEncode(value.value)]);
  }
  if (Array.isArray(value)) {
    return concatBytes([cborHead(4, value.length), ...value.map(cborEncode)]);
  }
  if (value instanceof Map) {
    return encodeMap([...value.entries()]);
  }
  if (typeof value === "object" && value !== null) {
    const entries = Object.entries(value as Record<string, unknown>).filter(
      ([, v]) => v !== undefined,
    );
    return encodeMap(entries);
  }
  throw new Error(`unsupported CBOR value: ${String(value)}`);
}

function encodeMap(entries: ReadonlyArray<readonly [unknown, unknown]>): Uint8Array {
  const encoded = entries.map(([key, value]) => ({
    key: cborEncode(key),
    value: cborEncode(value),
  }));
  encoded.sort((a, b) => compareBytes(a.key, b.key));
  const parts: Uint8Array[] = [cborHead(5, encoded.length)];
  for (const entry of encoded) {
    parts.push(entry.key, entry.value);
  }
  return concatBytes(parts);
}

function compareBytes(a: Uint8Array, b: Uint8Array): number {
  const n = Math.min(a.length, b.length);
  for (let i = 0; i < n; i++) {
    const delta = a[i]! - b[i]!;
    if (delta !== 0) return delta;
  }
  return a.length - b.length;
}

function cborHead(majorType: number, value: number): Uint8Array {
  const mt = majorType << 5;
  if (value < 24) return new Uint8Array([mt | value]);
  if (value <= 0xff) return new Uint8Array([mt | 24, value]);
  if (value <= 0xffff) return new Uint8Array([mt | 25, (value >> 8) & 0xff, value & 0xff]);
  if (value <= 0xffffffff) {
    return new Uint8Array([
      mt | 26,
      (value >>> 24) & 0xff,
      (value >>> 16) & 0xff,
      (value >>> 8) & 0xff,
      value & 0xff,
    ]);
  }
  throw new Error("CBOR value too large");
}

function concatBytes(parts: ReadonlyArray<Uint8Array>): Uint8Array {
  const total = parts.reduce((n, p) => n + p.length, 0);
  const out = new Uint8Array(total);
  let offset = 0;
  for (const part of parts) {
    out.set(part, offset);
    offset += part.length;
  }
  return out;
}

async function createSelfSignedP256Certificate(input: {
  subjectCommonName: string;
  keyPair: CryptoKeyPair;
}): Promise<Uint8Array> {
  const spki = new Uint8Array(await crypto.subtle.exportKey("spki", input.keyPair.publicKey));
  const algorithm = derSequence(derOid("1.2.840.10045.4.3.2")); // ecdsa-with-SHA256
  const name = derSequence(
    derSet(
      derSequence(
        derOid("2.5.4.3"), // commonName
        derUtf8String(input.subjectCommonName),
      ),
    ),
  );
  const now = Date.now();
  const validity = derSequence(
    derUtcTime(new Date(now - 60_000)),
    derUtcTime(new Date(now + 30 * 86_400_000)),
  );
  const serial = crypto.getRandomValues(new Uint8Array(16));
  serial[0] = serial[0]! & 0x7f;
  if (serial.every((b) => b === 0)) serial[serial.length - 1] = 1;
  const tbsCertificate = derSequence(
    derInteger(serial),
    algorithm,
    name,
    validity,
    name,
    spki,
  );
  const rawSignature = new Uint8Array(
    await crypto.subtle.sign(
      { name: "ECDSA", hash: "SHA-256" },
      input.keyPair.privateKey,
      arrayBufferCopy(tbsCertificate),
    ),
  );
  return derSequence(
    tbsCertificate,
    algorithm,
    derBitString(ecdsaRawToDer(rawSignature)),
  );
}

function derSequence(...items: Uint8Array[]): Uint8Array {
  return derValue(0x30, concatBytes(items));
}

function derSet(...items: Uint8Array[]): Uint8Array {
  return derValue(0x31, concatBytes(items));
}

function derUtf8String(value: string): Uint8Array {
  return derValue(0x0c, utf8(value));
}

function derUtcTime(value: Date): Uint8Array {
  const year = value.getUTCFullYear();
  if (year < 1950 || year >= 2050) throw new Error("UTCTime year out of range");
  const yy = String(year % 100).padStart(2, "0");
  const mm = String(value.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(value.getUTCDate()).padStart(2, "0");
  const hh = String(value.getUTCHours()).padStart(2, "0");
  const mi = String(value.getUTCMinutes()).padStart(2, "0");
  const ss = String(value.getUTCSeconds()).padStart(2, "0");
  return derValue(0x17, utf8(`${yy}${mm}${dd}${hh}${mi}${ss}Z`));
}

function derOid(oid: string): Uint8Array {
  const parts = oid.split(".").map((part) => Number(part));
  if (parts.length < 2 || parts.some((part) => !Number.isInteger(part) || part < 0)) {
    throw new Error(`invalid OID ${oid}`);
  }
  const [first, second, ...rest] = parts as [number, number, ...number[]];
  return derValue(0x06, new Uint8Array([
    40 * first + second,
    ...rest.flatMap(derBase128),
  ]));
}

function derInteger(value: Uint8Array): Uint8Array {
  let start = 0;
  while (start < value.length - 1 && value[start] === 0) start++;
  let bytes = value.slice(start);
  if (bytes.length === 0) bytes = new Uint8Array([0]);
  if ((bytes[0]! & 0x80) !== 0) bytes = concatBytes([new Uint8Array([0]), bytes]);
  return derValue(0x02, bytes);
}

function derBitString(value: Uint8Array): Uint8Array {
  return derValue(0x03, concatBytes([new Uint8Array([0]), value]));
}

function derValue(tag: number, value: Uint8Array): Uint8Array {
  return concatBytes([new Uint8Array([tag]), derLength(value.length), value]);
}

function derLength(length: number): Uint8Array {
  if (length < 0x80) return new Uint8Array([length]);
  const bytes: number[] = [];
  for (let value = length; value > 0; value = Math.floor(value / 256)) {
    bytes.unshift(value & 0xff);
  }
  return new Uint8Array([0x80 | bytes.length, ...bytes]);
}

function derBase128(value: number): number[] {
  if (value === 0) return [0];
  const out: number[] = [];
  for (let v = value; v > 0; v = Math.floor(v / 128)) {
    out.unshift(v & 0x7f);
  }
  for (let i = 0; i < out.length - 1; i++) out[i] = out[i]! | 0x80;
  return out;
}

function ecdsaRawToDer(rawSignature: Uint8Array): Uint8Array {
  if (rawSignature.length !== 64) throw new Error("expected raw P-256 signature");
  return derSequence(
    derInteger(rawSignature.slice(0, 32)),
    derInteger(rawSignature.slice(32)),
  );
}

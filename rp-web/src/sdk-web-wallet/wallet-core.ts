// Wallet-side packaging for org-iso-mdoc SMART Health Check-in responses.
//
// `buildWebWalletDcapiResponse` reads the verifier-supplied `deviceRequest`
// and `encryptionInfo` bytes, plus a SMART response JSON and demo issuer
// and device keys, and produces a verifier-openable mdoc response
// `{ protocol: "org-iso-mdoc", data: { response } }`.
//
// All issuer-direction CBOR builders (IssuerSignedItem tag-24, MSO,
// issuer/device COSE_Sign1, DeviceAuthentication, DeviceResponse envelope)
// are local to this file. The only `protocol/` exports we reuse are
// `buildDcapiSessionTranscript`, `hpkeSealDirectMdoc`, `cborDecode`,
// `CborTag`, and `base64Url*` helpers. We do NOT add new exports to
// `protocol/` and we do NOT modify `hpkeSealDirectMdoc`.

import {
  base64UrlDecodeBytes,
  base64UrlEncodeBytes,
  buildDcapiSessionTranscript,
  CborTag,
  cborDecode,
  hpkeSealDirectMdoc,
  MDOC_DOC_TYPE,
  MDOC_NAMESPACE,
  PROTOCOL_ID,
  resolveSmartRequestJsonFromMdocCarriers,
  SMART_REQUEST_INFO_KEY,
  SMART_RESPONSE_ELEMENT_ID,
  type DcapiMdocResponse,
} from "../protocol/index.ts";
import {
  validateSmartCheckinResponse,
  type SmartCheckinResponse,
} from "../sdk/core.ts";

// --- Public API ------------------------------------------------------------

export type WebWalletIssuerKey = {
  /** P-256 private key with sign usage. Demo-only; rotate per session. */
  privateKey: CryptoKey;
  /** Public JWK matching the private key. Used to construct an x5chain-free
   * unprotected header (we leave x5chain out for v1; verifiers in this repo
   * do not enforce signature verification yet). */
  publicJwk: JsonWebKey;
};

export type WebWalletDeviceKey = {
  /** P-256 private key for device auth signature. */
  privateKey: CryptoKey;
  /** Public JWK so MSO can include `deviceKeyInfo.deviceKey` (COSE_Key). */
  publicJwk: JsonWebKey;
};

export type BuildWebWalletDcapiResponseInput = {
  /** Verifier-supplied DeviceRequest bytes (base64url). */
  deviceRequestBase64Url: string;
  /** Verifier-supplied EncryptionInfo bytes (base64url). */
  encryptionInfoBase64Url: string;
  /** Origin to bind into SessionTranscript. Same value the verifier used. */
  origin: string;
  /** SMART Health Check-in response payload to deliver. */
  smartResponse: SmartCheckinResponse;
  /** Issuer signing key (demo). */
  issuerKey: WebWalletIssuerKey;
  /** Device signing key (demo). */
  deviceKey: WebWalletDeviceKey;
  /** Override the validity window (`signed`, `validFrom`, `validUntil`). */
  validityInfo?: {
    signed?: Date;
    validFrom?: Date;
    validUntil?: Date;
  };
  /** Optional digestID for the single IssuerSignedItem. Defaults to 0. */
  digestID?: number;
  /** Optional override for the random salt in the IssuerSignedItem. */
  random?: Uint8Array;
};

export type BuildWebWalletDcapiResponseResult = {
  /** The dcapi response object the verifier expects. */
  response: DcapiMdocResponse;
  /** Plaintext DeviceResponse bytes (pre-HPKE) — useful for diagnostics. */
  deviceResponseBytes: Uint8Array;
  /** Computed SessionTranscript bytes — useful for diagnostics. */
  sessionTranscript: Uint8Array;
  /** The recipient public JWK recovered from the EncryptionInfo. */
  recipientPublicJwk: JsonWebKey;
};

/**
 * Build a verifier-openable mdoc response for the given device request,
 * encryption info, origin, and SMART response payload. The output is
 * wire-compatible with the existing `openWalletResponse` path.
 */
export async function buildWebWalletDcapiResponse(
  input: BuildWebWalletDcapiResponseInput,
): Promise<BuildWebWalletDcapiResponseResult> {
  const validated = validateSmartCheckinResponse(input.smartResponse);
  if (!validated.ok) {
    throw new Error(`SMART response invalid: ${validated.error}`);
  }

  const deviceRequestBytes = base64UrlDecodeBytes(input.deviceRequestBase64Url);
  const encryptionInfoBytes = base64UrlDecodeBytes(input.encryptionInfoBase64Url);

  const parsedRequest = parseDeviceRequest(deviceRequestBytes);
  if (parsedRequest.docType !== MDOC_DOC_TYPE) {
    throw new Error(`unexpected docType: ${parsedRequest.docType}`);
  }
  if (parsedRequest.responseElementIdentifier !== SMART_RESPONSE_ELEMENT_ID) {
    throw new Error(
      `unexpected requested element: ${parsedRequest.responseElementIdentifier}`,
    );
  }

  const recipientPublicJwk = recoverRecipientPublicJwk(encryptionInfoBytes);

  const sessionTranscript = await buildDcapiSessionTranscript({
    origin: input.origin,
    encryptionInfo: encryptionInfoBytes,
  });

  const smartResponseJson = JSON.stringify(validated.value);
  const digestID = input.digestID ?? 0;
  const random = input.random ?? crypto.getRandomValues(new Uint8Array(16));

  // 1. Build IssuerSignedItem (tag-24 around CBOR of inner map).
  const issuerSignedItemInner = orderedMap([
    ["digestID", digestID],
    ["random", random],
    ["elementIdentifier", SMART_RESPONSE_ELEMENT_ID],
    ["elementValue", smartResponseJson],
  ]);
  const issuerSignedItemTag24Bytes = cborEncode(
    new CborTag(24, cborEncode(issuerSignedItemInner)),
  );
  const valueDigest = await sha256(issuerSignedItemTag24Bytes);

  // 2. Build MSO (Mobile Security Object).
  const now = input.validityInfo?.signed ?? new Date();
  const validFrom = input.validityInfo?.validFrom ?? now;
  const validUntil =
    input.validityInfo?.validUntil ?? new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000);

  const valueDigestsForNs = orderedMap([[digestID, valueDigest]]);
  const valueDigests = orderedMap([[MDOC_NAMESPACE, valueDigestsForNs]]);
  const deviceKeyCose = publicJwkToCoseKey(input.deviceKey.publicJwk);
  const deviceKeyInfo = orderedMap([["deviceKey", deviceKeyCose]]);
  const validityInfo = orderedMap([
    ["signed", new CborTag(0, formatTdate(now))],
    ["validFrom", new CborTag(0, formatTdate(validFrom))],
    ["validUntil", new CborTag(0, formatTdate(validUntil))],
  ]);
  const mso = orderedMap([
    ["version", "1.0"],
    ["digestAlgorithm", "SHA-256"],
    ["valueDigests", valueDigests],
    ["deviceKeyInfo", deviceKeyInfo],
    ["docType", MDOC_DOC_TYPE],
    ["validityInfo", validityInfo],
  ]);
  const msoBytes = cborEncode(mso);
  const msoTag24Bytes = cborEncode(new CborTag(24, msoBytes));

  // 3. Issuer COSE_Sign1 over MSO bytes (tag-24 wrapped, embedded payload).
  const issuerSign1 = await coseSign1({
    privateKey: input.issuerKey.privateKey,
    payload: msoTag24Bytes,
    detachedPayload: false,
    // No x5chain in v1: this repo's verifier inspects MSO digests but does
    // not (yet) enforce x5chain trust. Demo grade.
  });

  // 4. DeviceAuthentication payload.
  // DeviceNameSpaces is an empty map in this minimal flow.
  const deviceNameSpacesBytes = cborEncode(orderedMap([]));
  const deviceAuthenticationStruct = [
    "DeviceAuthentication",
    cborDecode(sessionTranscript),
    MDOC_DOC_TYPE,
    new CborTag(24, deviceNameSpacesBytes),
  ];
  const deviceAuthenticationBytes = cborEncode(
    new CborTag(24, cborEncode(deviceAuthenticationStruct)),
  );
  const deviceSign1 = await coseSign1({
    privateKey: input.deviceKey.privateKey,
    payload: deviceAuthenticationBytes,
    detachedPayload: true,
  });

  // 5. Assemble DeviceResponse.
  const issuerNamespaces = orderedMap([
    [MDOC_NAMESPACE, [new CborTag(24, cborEncode(issuerSignedItemInner))]],
  ]);
  const issuerSigned = orderedMap([
    ["nameSpaces", issuerNamespaces],
    ["issuerAuth", issuerSign1],
  ]);
  const deviceSigned = orderedMap([
    ["nameSpaces", new CborTag(24, deviceNameSpacesBytes)],
    ["deviceAuth", orderedMap([["deviceSignature", deviceSign1]])],
  ]);
  const document = orderedMap([
    ["docType", MDOC_DOC_TYPE],
    ["issuerSigned", issuerSigned],
    ["deviceSigned", deviceSigned],
  ]);
  const deviceResponse = orderedMap([
    ["version", "1.0"],
    ["documents", [document]],
    ["status", 0],
  ]);
  const deviceResponseBytes = cborEncode(deviceResponse);

  // 6. HPKE seal — reuse existing protocol helper unchanged.
  const sealed = await hpkeSealDirectMdoc({
    plaintext: deviceResponseBytes,
    recipientPublicJwk,
    info: sessionTranscript,
  });

  return {
    response: sealed.response,
    deviceResponseBytes,
    sessionTranscript,
    recipientPublicJwk,
  };
}

// --- Internals: parse verifier inputs --------------------------------------

type ParsedDeviceRequest = {
  docType: string;
  responseElementIdentifier: string;
  smartRequestJson: string | undefined;
};

function parseDeviceRequest(bytes: Uint8Array): ParsedDeviceRequest {
  const decoded = cborDecode(bytes);
  const docRequests = mapGet(decoded, "docRequests");
  if (!Array.isArray(docRequests) || docRequests.length === 0) {
    throw new Error("DeviceRequest has no docRequests");
  }
  const itemsRequestTag = mapGet(docRequests[0], "itemsRequest");
  if (
    !(itemsRequestTag instanceof CborTag) ||
    itemsRequestTag.tag !== 24 ||
    !(itemsRequestTag.value instanceof Uint8Array)
  ) {
    throw new Error("itemsRequest is not a tag-24 byte string");
  }
  const itemsRequest = cborDecode(itemsRequestTag.value);
  const docType = mapGet(itemsRequest, "docType");
  if (typeof docType !== "string") {
    throw new Error("itemsRequest missing docType");
  }
  const nameSpaces = mapGet(itemsRequest, "nameSpaces");
  const elementIdentifiers: string[] = [];
  if (nameSpaces instanceof Map) {
    const elements = nameSpaces.get(MDOC_NAMESPACE);
    if (elements instanceof Map) {
      for (const key of elements.keys()) {
        if (typeof key === "string") {
          elementIdentifiers.push(key);
        }
      }
    }
  }
  if (!elementIdentifiers.includes(SMART_RESPONSE_ELEMENT_ID)) {
    throw new Error(
      `itemsRequest does not request ${MDOC_NAMESPACE}.${SMART_RESPONSE_ELEMENT_ID}`,
    );
  }
  const requestInfo = mapGet(itemsRequest, "requestInfo");
  const carrier = resolveSmartRequestJsonFromMdocCarriers({
    requestInfoValue: mapGet(requestInfo, SMART_REQUEST_INFO_KEY),
    elementIdentifiers,
  });

  return {
    docType,
    responseElementIdentifier: SMART_RESPONSE_ELEMENT_ID,
    smartRequestJson: carrier.json,
  };
}

function recoverRecipientPublicJwk(encryptionInfoBytes: Uint8Array): JsonWebKey {
  const decoded = cborDecode(encryptionInfoBytes);
  if (!Array.isArray(decoded) || decoded[0] !== "dcapi") {
    throw new Error('encryptionInfo is not ["dcapi", { ... }]');
  }
  const fields = decoded[1];
  const recipientCose = mapGet(fields, "recipientPublicKey");
  if (!(recipientCose instanceof Map)) {
    throw new Error("encryptionInfo missing recipientPublicKey COSE_Key");
  }
  return coseKeyToPublicJwk(recipientCose);
}

// --- Internals: COSE / CBOR helpers (local; not exported from protocol/) ---

async function coseSign1(input: {
  privateKey: CryptoKey;
  payload: Uint8Array;
  detachedPayload: boolean;
}): Promise<unknown[]> {
  const protectedMap = orderedMap([[1, -7]]); // alg = ES256
  const protectedBytes = cborEncode(protectedMap);
  const unprotected = orderedMap([]);
  const sigStructure = cborEncode([
    "Signature1",
    protectedBytes,
    new Uint8Array(),
    input.payload,
  ]);
  const signature = new Uint8Array(
    await crypto.subtle.sign(
      { name: "ECDSA", hash: "SHA-256" },
      input.privateKey,
      copyToArrayBuffer(sigStructure),
    ),
  );
  return [
    protectedBytes,
    unprotected,
    input.detachedPayload ? null : input.payload,
    signature,
  ];
}

function publicJwkToCoseKey(jwk: JsonWebKey): Map<number, number | Uint8Array> {
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

function coseKeyToPublicJwk(coseKey: Map<unknown, unknown>): JsonWebKey {
  const kty = coseKey.get(1);
  const crv = coseKey.get(-1);
  const x = coseKey.get(-2);
  const y = coseKey.get(-3);
  if (kty !== 2) throw new Error("COSE_Key kty must be EC2 (2)");
  if (crv !== 1) throw new Error("COSE_Key crv must be P-256 (1)");
  if (!(x instanceof Uint8Array) || !(y instanceof Uint8Array)) {
    throw new Error("COSE_Key x/y must be byte strings");
  }
  return {
    kty: "EC",
    crv: "P-256",
    x: base64UrlEncodeBytes(x),
    y: base64UrlEncodeBytes(y),
  };
}

function mapGet(value: unknown, key: string): unknown {
  if (!(value instanceof Map)) return undefined;
  return value.get(key);
}

function orderedMap(entries: ReadonlyArray<readonly [unknown, unknown]>): Map<unknown, unknown> {
  return new Map(entries);
}

function formatTdate(date: Date): string {
  // ISO 8601 with seconds precision and trailing Z (CDDL #6.0 tdate).
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  const hh = String(date.getUTCHours()).padStart(2, "0");
  const mm = String(date.getUTCMinutes()).padStart(2, "0");
  const ss = String(date.getUTCSeconds()).padStart(2, "0");
  return `${year}-${month}-${day}T${hh}:${mm}:${ss}Z`;
}

async function sha256(bytes: Uint8Array): Promise<Uint8Array> {
  return new Uint8Array(
    await crypto.subtle.digest("SHA-256", copyToArrayBuffer(bytes)),
  );
}

function copyToArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  const out = new Uint8Array(bytes.length);
  out.set(bytes);
  return out.buffer;
}

// --- Internals: deterministic-canonical CBOR encoder -----------------------
// Mirrors the canonical encoder in src/protocol/index.ts. We duplicate it
// here rather than export it from `protocol/` so the side surface adds
// nothing to the existing module's public API.

function cborEncode(value: unknown): Uint8Array {
  if (value === null) return new Uint8Array([0xf6]);
  if (value === false) return new Uint8Array([0xf4]);
  if (value === true) return new Uint8Array([0xf5]);
  if (typeof value === "number") {
    if (!Number.isInteger(value)) throw new Error("CBOR number must be integer");
    if (value >= 0) return cborHead(0, value);
    return cborHead(1, -1 - value);
  }
  if (typeof value === "string") {
    const bytes = new TextEncoder().encode(value);
    return concatBytes([cborHead(3, bytes.length), bytes]);
  }
  if (value instanceof Uint8Array) {
    return concatBytes([cborHead(2, value.length), value]);
  }
  if (value instanceof CborTag) {
    return concatBytes([cborHead(6, value.tag), cborEncode(value.value)]);
  }
  if (Array.isArray(value)) {
    return concatBytes([cborHead(4, value.length), ...value.map(cborEncode)]);
  }
  if (value instanceof Map) {
    return encodeMap([...value.entries()]);
  }
  if (typeof value === "object") {
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

function cborHead(majorType: number, value: number): Uint8Array {
  const mt = majorType << 5;
  if (value < 24) return new Uint8Array([mt | value]);
  if (value <= 0xff) return new Uint8Array([mt | 24, value]);
  if (value <= 0xffff) {
    return new Uint8Array([mt | 25, (value >> 8) & 0xff, value & 0xff]);
  }
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

function compareBytes(a: Uint8Array, b: Uint8Array): number {
  const n = Math.min(a.length, b.length);
  for (let i = 0; i < n; i++) {
    const delta = a[i]! - b[i]!;
    if (delta !== 0) return delta;
  }
  return a.length - b.length;
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

// Re-exported so callers building issuer keys etc. can use the same protocol
// constants without reaching into `protocol/`.
export { PROTOCOL_ID, MDOC_DOC_TYPE, MDOC_NAMESPACE, SMART_RESPONSE_ELEMENT_ID };

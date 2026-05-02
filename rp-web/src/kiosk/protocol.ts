import { validateSmartCheckinRequest, type SmartCheckinRequest } from "../sdk/core.ts";

export const KIOSK_MAX_PAYLOAD_BYTES = 25 * 1024 * 1024;
export const KIOSK_MAX_BLOB_BYTES = KIOSK_MAX_PAYLOAD_BYTES + 1024;
export const KIOSK_BLOB_CONTENT_TYPE = "application/octet-stream";
export const KIOSK_ENCRYPTED_REQUEST_CONTENT_TYPE = "application/smart-health-checkin-kiosk-request+jws+aesgcm";
export const KIOSK_TTL_MS = 10 * 60 * 1000;
export const KIOSK_RESPONSE_INFO = "smart-health-checkin-kiosk-response-v1";
export const KIOSK_REQUEST_INFO = "smart-health-checkin-kiosk-request-v1";
export const KIOSK_REQUEST_JWS_TYP = "smart-health-checkin+kiosk-request+jws";
export const KIOSK_CREATOR_ISSUER = "smart-health-checkin-demo-creator";
export const KIOSK_SUBMISSION_SERVICE_AUDIENCE = "smart-health-checkin-demo-submission-service";

export type KioskRequestJwsHeader = {
  alg: "ES256";
  kid: string;
  typ: typeof KIOSK_REQUEST_JWS_TYP;
};

export type KioskRequestPayload = {
  v: 1;
  iss: typeof KIOSK_CREATOR_ISSUER;
  aud: typeof KIOSK_SUBMISSION_SERVICE_AUDIENCE;
  requestId: string;
  createdAt: number;
  expiresAt: number;
  submitTo: {
    backend: "instantdb";
    appId: string;
  };
  smartRequest: SmartCheckinRequest;
  encryptRequestTo: {
    alg: "ECDH-P256+HKDF-SHA256+AES-GCM";
    keyId: string;
  };
  encryptResponseTo: {
    alg: "ECDH-P256+HKDF-SHA256+AES-GCM";
    desktopPublicKeyJwk: JsonWebKey;
  };
  constraints: {
    maxPlaintextBytes: number;
  };
  minter: {
    keyId: string;
  };
};

export type EncryptedKioskRequest = {
  v: 1;
  alg: "ECDH-P256+HKDF-SHA256+AES-GCM";
  enc: "A256GCM";
  contentType: typeof KIOSK_ENCRYPTED_REQUEST_CONTENT_TYPE;
  requestId: string;
  createdAt: number;
  expiresAt: number;
  creatorKeyId: string;
  recipientKeyId: string;
  iv: string;
  ciphertext: string;
  ephemeralPublicKeyJwk: JsonWebKey;
};

export type VerifiedKioskRequest = {
  header: KioskRequestJwsHeader;
  payload: KioskRequestPayload;
  jws: string;
};

export type KioskRequestPointer = {
  requestId: string;
};

export type SubmissionPlaintext = {
  requestId: string;
  submittedAt: number;
  payload: Record<string, unknown>;
};

export type EncryptedPayload = {
  iv: string;
  ciphertext: Uint8Array;
  payloadSha256: string;
  phoneEphemeralPublicKeyJwk: JsonWebKey;
};

export async function generateDesktopEncryptionKeyPair(): Promise<CryptoKeyPair> {
  return crypto.subtle.generateKey(
    {
      name: "ECDH",
      namedCurve: "P-256",
    },
    true,
    ["deriveBits"],
  );
}

export async function exportPublicJwk(key: CryptoKey): Promise<JsonWebKey> {
  return crypto.subtle.exportKey("jwk", key);
}

export async function exportPrivateJwk(key: CryptoKey): Promise<JsonWebKey> {
  return crypto.subtle.exportKey("jwk", key);
}

export async function importCreatorPrivateKey(jwk: JsonWebKey): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "jwk",
    jwk,
    { name: "ECDSA", namedCurve: "P-256" },
    false,
    ["sign"],
  );
}

export async function importCreatorPublicKey(jwk: JsonWebKey): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "jwk",
    jwk,
    { name: "ECDSA", namedCurve: "P-256" },
    false,
    ["verify"],
  );
}

export async function importSubmissionServicePublicKey(jwk: JsonWebKey): Promise<CryptoKey> {
  return importEcdhPublicKey(jwk);
}

export async function importSubmissionServicePrivateKey(jwk: JsonWebKey): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "jwk",
    jwk,
    { name: "ECDH", namedCurve: "P-256" },
    false,
    ["deriveBits"],
  );
}

export async function createKioskRequestJws(input: {
  transportAppId: string;
  creatorPrivateKey: CryptoKey;
  creatorKeyId: string;
  submissionServiceKeyId: string;
  desktopPublicKeyJwk: JsonWebKey;
  smartRequest: SmartCheckinRequest;
  now?: number;
}): Promise<VerifiedKioskRequest> {
  const now = input.now ?? Date.now();
  const requestId = randomBase64Url(32);
  const payload: KioskRequestPayload = {
    v: 1,
    iss: KIOSK_CREATOR_ISSUER,
    aud: KIOSK_SUBMISSION_SERVICE_AUDIENCE,
    requestId,
    createdAt: now,
    expiresAt: now + KIOSK_TTL_MS,
    submitTo: {
      backend: "instantdb",
      appId: input.transportAppId,
    },
    smartRequest: input.smartRequest,
    encryptRequestTo: {
      alg: "ECDH-P256+HKDF-SHA256+AES-GCM",
      keyId: input.submissionServiceKeyId,
    },
    encryptResponseTo: {
      alg: "ECDH-P256+HKDF-SHA256+AES-GCM",
      desktopPublicKeyJwk: input.desktopPublicKeyJwk,
    },
    constraints: {
      maxPlaintextBytes: KIOSK_MAX_PAYLOAD_BYTES,
    },
    minter: {
      keyId: input.creatorKeyId,
    },
  };
  const header: KioskRequestJwsHeader = {
    alg: "ES256",
    kid: input.creatorKeyId,
    typ: KIOSK_REQUEST_JWS_TYP,
  };
  const jws = await signCompactJws(header, payload, input.creatorPrivateKey);
  return {
    header,
    payload,
    jws,
  };
}

export async function encryptKioskRequestJws(input: {
  verified: VerifiedKioskRequest;
  submissionServicePublicKeyJwk: JsonWebKey;
}): Promise<EncryptedKioskRequest> {
  const recipientPublicKey = await importSubmissionServicePublicKey(input.submissionServicePublicKeyJwk);
  const ephemeralKeyPair = await crypto.subtle.generateKey(
    { name: "ECDH", namedCurve: "P-256" },
    true,
    ["deriveBits"],
  );
  const key = await deriveAesKey({
    privateKey: ephemeralKeyPair.privateKey,
    publicKey: recipientPublicKey,
    salt: input.verified.payload.requestId,
    info: KIOSK_REQUEST_INFO,
  });
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encoded = utf8(input.verified.jws);
  const ciphertext = new Uint8Array(await crypto.subtle.encrypt(
    {
      name: "AES-GCM",
      iv: bufferSource(iv),
      additionalData: bufferSource(utf8(input.verified.payload.requestId)),
    },
    key,
    bufferSource(encoded),
  ));
  return {
    v: 1,
    alg: "ECDH-P256+HKDF-SHA256+AES-GCM",
    enc: "A256GCM",
    contentType: KIOSK_ENCRYPTED_REQUEST_CONTENT_TYPE,
    requestId: input.verified.payload.requestId,
    createdAt: input.verified.payload.createdAt,
    expiresAt: input.verified.payload.expiresAt,
    creatorKeyId: input.verified.header.kid,
    recipientKeyId: input.verified.payload.encryptRequestTo.keyId,
    iv: base64UrlEncode(iv),
    ciphertext: base64UrlEncode(ciphertext),
    ephemeralPublicKeyJwk: await exportPublicJwk(ephemeralKeyPair.publicKey),
  };
}

export async function openEncryptedKioskRequest(input: {
  encrypted: EncryptedKioskRequest;
  submissionServicePrivateKey: CryptoKey;
  trustedCreatorPublicKeys: Record<string, JsonWebKey>;
  expectedTransportAppId: string;
  now?: number;
}): Promise<VerifiedKioskRequest> {
  assertEncryptedKioskRequest(input.encrypted);
  if (input.encrypted.expiresAt <= (input.now ?? Date.now())) throw new Error("This kiosk request has expired.");
  const ephemeralPublicKey = await importEcdhPublicKey(input.encrypted.ephemeralPublicKeyJwk);
  const key = await deriveAesKey({
    privateKey: input.submissionServicePrivateKey,
    publicKey: ephemeralPublicKey,
    salt: input.encrypted.requestId,
    info: KIOSK_REQUEST_INFO,
  });
  const plaintext = await crypto.subtle.decrypt(
    {
      name: "AES-GCM",
      iv: bufferSource(base64UrlDecode(input.encrypted.iv)),
      additionalData: bufferSource(utf8(input.encrypted.requestId)),
    },
    key,
    bufferSource(base64UrlDecode(input.encrypted.ciphertext)),
  );
  const jws = utf8Decode(new Uint8Array(plaintext));
  const verified = await verifyKioskRequestJws({
    jws,
    trustedCreatorPublicKeys: input.trustedCreatorPublicKeys,
    expectedTransportAppId: input.expectedTransportAppId,
    now: input.now,
  });
  if (verified.payload.requestId !== input.encrypted.requestId) {
    throw new Error("Encrypted request pointer does not match the signed request.");
  }
  return verified;
}

export async function verifyKioskRequestJws(input: {
  jws: string;
  trustedCreatorPublicKeys: Record<string, JsonWebKey>;
  expectedTransportAppId: string;
  now?: number;
}): Promise<VerifiedKioskRequest> {
  const parts = input.jws.split(".");
  if (parts.length !== 3 || parts.some((part) => part.length === 0)) {
    throw new Error("Invalid compact JWS.");
  }
  const [encodedHeader, encodedPayload, encodedSignature] = parts as [string, string, string];
  const header = JSON.parse(utf8Decode(base64UrlDecode(encodedHeader)));
  assertKioskRequestJwsHeader(header);
  const publicJwk = input.trustedCreatorPublicKeys[header.kid];
  if (!publicJwk) throw new Error(`Untrusted kiosk request signing key: ${header.kid}`);
  const publicKey = await importCreatorPublicKey(publicJwk);
  const signingInput = `${encodedHeader}.${encodedPayload}`;
  const ok = await crypto.subtle.verify(
    { name: "ECDSA", hash: "SHA-256" },
    publicKey,
    bufferSource(base64UrlDecode(encodedSignature)),
    bufferSource(utf8(signingInput)),
  );
  if (!ok) throw new Error("Kiosk request JWS signature is invalid.");

  const payload = JSON.parse(utf8Decode(base64UrlDecode(encodedPayload)));
  assertKioskRequestPayload(payload);
  const validationError = await validateKioskRequestPayload(payload, input.expectedTransportAppId, input.now);
  if (validationError) throw new Error(validationError);
  return {
    header,
    payload,
    jws: input.jws,
  };
}

export async function encryptSubmissionPlaintext(
  request: Pick<VerifiedKioskRequest, "payload">,
  plaintext: SubmissionPlaintext,
): Promise<EncryptedPayload> {
  const encoded = utf8(canonicalJson(plaintext));
  if (encoded.byteLength > request.payload.constraints.maxPlaintextBytes) {
    throw new Error(`Payload is ${encoded.byteLength} bytes; maximum is ${request.payload.constraints.maxPlaintextBytes}.`);
  }
  const phoneKeyPair = await crypto.subtle.generateKey(
    { name: "ECDH", namedCurve: "P-256" },
    true,
    ["deriveBits"],
  );
  const desktopPublicKey = await importEcdhPublicKey(request.payload.encryptResponseTo.desktopPublicKeyJwk);
  const key = await deriveAesKey({
    privateKey: phoneKeyPair.privateKey,
    publicKey: desktopPublicKey,
    salt: request.payload.requestId,
    info: KIOSK_RESPONSE_INFO,
  });
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ciphertext = new Uint8Array(await crypto.subtle.encrypt(
    { name: "AES-GCM", iv: bufferSource(iv), additionalData: bufferSource(utf8(request.payload.requestId)) },
    key,
    bufferSource(encoded),
  ));
  if (ciphertext.byteLength > KIOSK_MAX_BLOB_BYTES) {
    throw new Error(`Encrypted blob is ${ciphertext.byteLength} bytes; maximum is ${KIOSK_MAX_BLOB_BYTES}.`);
  }
  return {
    iv: base64UrlEncode(iv),
    ciphertext,
    payloadSha256: await sha256Base64Url(encoded),
    phoneEphemeralPublicKeyJwk: await exportPublicJwk(phoneKeyPair.publicKey),
  };
}

export async function decryptSubmissionPlaintext(input: {
  request: Pick<VerifiedKioskRequest, "payload">;
  desktopPrivateKey: CryptoKey;
  phoneEphemeralPublicKeyJwk: JsonWebKey;
  iv: string;
  ciphertext: Uint8Array;
}): Promise<SubmissionPlaintext> {
  const phonePublicKey = await importEcdhPublicKey(input.phoneEphemeralPublicKeyJwk);
  const key = await deriveAesKey({
    privateKey: input.desktopPrivateKey,
    publicKey: phonePublicKey,
    salt: input.request.payload.requestId,
    info: KIOSK_RESPONSE_INFO,
  });
  const plaintext = await crypto.subtle.decrypt(
    {
      name: "AES-GCM",
      iv: bufferSource(base64UrlDecode(input.iv)),
      additionalData: bufferSource(utf8(input.request.payload.requestId)),
    },
    key,
    bufferSource(input.ciphertext),
  );
  const parsed = JSON.parse(utf8Decode(new Uint8Array(plaintext)));
  assertSubmissionPlaintext(parsed);
  return parsed;
}

export function buildSubmitUrl(baseUrl: string | URL, pointer: KioskRequestPointer): string {
  const url = new URL(String(baseUrl));
  url.hash = `r=${encodeURIComponent(pointer.requestId)}`;
  return url.toString();
}

export function kioskRequestPointerFromLocationHash(hash: string): KioskRequestPointer {
  const params = new URLSearchParams(hash.replace(/^#/, ""));
  const requestId = params.get("r");
  if (!requestId) throw new Error("Missing #r= kiosk request pointer.");
  return { requestId };
}

export function storagePrefixForRequestId(requestId: string): string {
  return `submissions/${requestId}/`;
}

async function signCompactJws(
  header: KioskRequestJwsHeader,
  payload: KioskRequestPayload,
  privateKey: CryptoKey,
): Promise<string> {
  const encodedHeader = base64UrlEncode(utf8(canonicalJson(header)));
  const encodedPayload = base64UrlEncode(utf8(canonicalJson(payload)));
  const signingInput = `${encodedHeader}.${encodedPayload}`;
  const sig = await crypto.subtle.sign(
    { name: "ECDSA", hash: "SHA-256" },
    privateKey,
    bufferSource(utf8(signingInput)),
  );
  return `${signingInput}.${base64UrlEncode(new Uint8Array(sig))}`;
}

async function validateKioskRequestPayload(
  payload: KioskRequestPayload,
  expectedTransportAppId: string,
  now = Date.now(),
): Promise<string | undefined> {
  if (payload.v !== 1) return "Unsupported kiosk request version.";
  if (payload.iss !== KIOSK_CREATOR_ISSUER) return "Unsupported kiosk request issuer.";
  if (payload.aud !== KIOSK_SUBMISSION_SERVICE_AUDIENCE) return "Kiosk request has the wrong audience.";
  if (payload.submitTo.backend !== "instantdb") return "Unsupported mailbox backend.";
  if (payload.submitTo.appId !== expectedTransportAppId) return "Kiosk request was minted for a different transport app.";
  if (payload.expiresAt <= now) return "This kiosk request has expired.";
  if (payload.createdAt > now + 60_000) return "This kiosk request appears to be from the future.";
  if (payload.constraints.maxPlaintextBytes > KIOSK_MAX_PAYLOAD_BYTES) {
    return "Kiosk request allows a payload size above this app's limit.";
  }
  if (payload.encryptRequestTo.alg !== "ECDH-P256+HKDF-SHA256+AES-GCM") {
    return "Unsupported kiosk request encryption algorithm.";
  }
  if (payload.encryptResponseTo.alg !== "ECDH-P256+HKDF-SHA256+AES-GCM") {
    return "Unsupported response encryption algorithm.";
  }
  if (payload.minter.keyId.length === 0) return "Kiosk request is missing its minter key id.";
  const requestValidation = validateSmartCheckinRequest(payload.smartRequest);
  if (!requestValidation.ok) return `Embedded SMART request is invalid: ${requestValidation.error}`;
  return undefined;
}

async function deriveAesKey(input: {
  privateKey: CryptoKey;
  publicKey: CryptoKey;
  salt: string;
  info: string;
}): Promise<CryptoKey> {
  const sharedSecret = await crypto.subtle.deriveBits(
    { name: "ECDH", public: input.publicKey },
    input.privateKey,
    256,
  );
  const hkdfKey = await crypto.subtle.importKey(
    "raw",
    sharedSecret,
    "HKDF",
    false,
    ["deriveKey"],
  );
  return crypto.subtle.deriveKey(
    {
      name: "HKDF",
      hash: "SHA-256",
      salt: bufferSource(utf8(input.salt)),
      info: bufferSource(utf8(input.info)),
    },
    hkdfKey,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
}

function importEcdhPublicKey(jwk: JsonWebKey): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "jwk",
    jwk,
    { name: "ECDH", namedCurve: "P-256" },
    false,
    [],
  );
}

function assertKioskRequestJwsHeader(value: unknown): asserts value is KioskRequestJwsHeader {
  if (!isRecord(value)) throw new Error("Kiosk request JWS header is not an object.");
  if (value.alg !== "ES256") throw new Error("Kiosk request JWS must use ES256.");
  if (value.typ !== KIOSK_REQUEST_JWS_TYP) throw new Error("Kiosk request JWS has the wrong type.");
  if (typeof value.kid !== "string" || value.kid.length === 0) {
    throw new Error("Kiosk request JWS is missing kid.");
  }
}

function assertKioskRequestPayload(value: unknown): asserts value is KioskRequestPayload {
  if (!isRecord(value)) throw new Error("Kiosk request payload is not an object.");
  if (typeof value.requestId !== "string") {
    throw new Error("Kiosk request is missing its request identifier.");
  }
  if (!isRecord(value.submitTo) || !isRecord(value.smartRequest) || !isRecord(value.constraints)) {
    throw new Error("Kiosk request is missing required sections.");
  }
  if (!isRecord(value.encryptRequestTo) || !isRecord(value.encryptResponseTo) || !isRecord(value.minter)) {
    throw new Error("Kiosk request is missing cryptographic metadata.");
  }
}

function assertEncryptedKioskRequest(value: unknown): asserts value is EncryptedKioskRequest {
  if (!isRecord(value)) throw new Error("Encrypted kiosk request is not an object.");
  if (value.v !== 1) throw new Error("Unsupported encrypted kiosk request version.");
  if (value.alg !== "ECDH-P256+HKDF-SHA256+AES-GCM" || value.enc !== "A256GCM") {
    throw new Error("Unsupported encrypted kiosk request algorithm.");
  }
  if (value.contentType !== KIOSK_ENCRYPTED_REQUEST_CONTENT_TYPE) {
    throw new Error("Unsupported encrypted kiosk request content type.");
  }
  for (const field of ["requestId", "creatorKeyId", "recipientKeyId", "iv", "ciphertext"] as const) {
    if (typeof value[field] !== "string" || value[field].length === 0) {
      throw new Error(`Encrypted kiosk request is missing ${field}.`);
    }
  }
  if (!isRecord(value.ephemeralPublicKeyJwk)) throw new Error("Encrypted kiosk request is missing ephemeral public key.");
}

function assertSubmissionPlaintext(value: unknown): asserts value is SubmissionPlaintext {
  if (!isRecord(value)) throw new Error("Submission plaintext is not an object.");
  if (typeof value.requestId !== "string") {
    throw new Error("Submission is missing its request identifier.");
  }
  if (!isRecord(value.payload)) throw new Error("Submission payload is invalid.");
}

export function base64UrlEncode(bytes: Uint8Array): string {
  const parts: string[] = [];
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    parts.push(String.fromCharCode(...bytes.subarray(i, i + chunkSize)));
  }
  const binary = parts.join("");
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

export function base64UrlDecode(value: string): Uint8Array<ArrayBuffer> {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(value.length / 4) * 4, "=");
  const binary = atob(padded);
  const out = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) out[i] = binary.charCodeAt(i);
  return out;
}

export function randomBase64Url(bytes: number): string {
  return base64UrlEncode(crypto.getRandomValues(new Uint8Array(bytes)));
}

export async function sha256Base64Url(bytes: Uint8Array): Promise<string> {
  return base64UrlEncode(new Uint8Array(await crypto.subtle.digest("SHA-256", bufferSource(bytes))));
}

export function utf8(value: string): Uint8Array<ArrayBuffer> {
  const encoded = new TextEncoder().encode(value);
  const out = new Uint8Array(encoded.byteLength);
  out.set(encoded);
  return out;
}

export function utf8Decode(bytes: Uint8Array): string {
  return new TextDecoder().decode(bytes);
}

export function canonicalJson(value: unknown): string {
  return JSON.stringify(canonicalize(value));
}

function canonicalize(value: unknown): unknown {
  if (value === null || typeof value !== "object") return value;
  if (Array.isArray(value)) return value.map(canonicalize);
  const obj = value as Record<string, unknown>;
  const out: Record<string, unknown> = {};
  for (const key of Object.keys(obj).sort()) {
    const v = obj[key];
    if (v !== undefined) out[key] = canonicalize(v);
  }
  return out;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function bufferSource(bytes: Uint8Array): Uint8Array<ArrayBuffer> {
  const out = new Uint8Array(bytes.byteLength);
  out.set(bytes);
  return out;
}

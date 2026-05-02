import type { SmartCheckinRequest } from "../sdk/core.ts";
import {
  canonicalJson,
  createKioskRequestJws,
  decryptSubmissionPlaintext,
  encryptKioskRequestJws,
  encryptSubmissionPlaintext,
  exportPrivateJwk,
  exportPublicJwk,
  generateDesktopEncryptionKeyPair,
  importCreatorPrivateKey,
  importSubmissionServicePrivateKey,
  KIOSK_BLOB_CONTENT_TYPE,
  KIOSK_FORM_ID,
  KIOSK_MAX_BLOB_BYTES,
  KIOSK_MAX_PAYLOAD_BYTES,
  openEncryptedKioskRequest,
  utf8,
  type EncryptedKioskRequest,
  type EncryptedPayload,
  type KioskRequestPayload,
  type SubmissionPlaintext,
  type VerifiedKioskRequest,
} from "./protocol.ts";

export type { SubmissionPlaintext, VerifiedKioskRequest } from "./protocol.ts";
export { KIOSK_MAX_PAYLOAD_BYTES } from "./protocol.ts";

export type KioskRequestRow = {
  id: string;
  requestId: string;
  routeId: string;
  sessionId: string;
  requestHash: string;
  createdAt: number;
  expiresAt: number;
  creatorKeyId: string;
  serviceKeyId: string;
  encryptedRequest: EncryptedKioskRequest;
};

export type KioskSubmissionRow = {
  id: string;
  routeId: string;
  sessionId: string;
  submissionId: string;
  requestId: string;
  requestHash?: string;
  certHash: string;
  nonce: string;
  createdAt: number;
  expiresAt: number;
  formId: typeof KIOSK_FORM_ID;
  totalPlaintextBytes: number;
  totalCiphertextBytes: number;
  payloadSha256: string;
  iv: string;
  storagePath: string;
  storageFileId: string;
  contentType: string;
  phoneEphemeralPublicKeyJwk: JsonWebKey;
};

export type KioskSubmissionRows = {
  rows: KioskSubmissionRow[];
  isLoading: boolean;
  error?: { message: string };
};

export type KioskTransportProvider = {
  name: string;
  appId: string;
  configured: boolean;
  writeRequest(input: {
    payload: KioskRequestPayload;
    requestHash: string;
    encryptedRequest: EncryptedKioskRequest;
  }): Promise<KioskRequestRow>;
  readRequest(requestId: string): Promise<KioskRequestRow>;
  writeSubmission(input: {
    request: VerifiedKioskRequest;
    plaintext: SubmissionPlaintext;
    encrypted: EncryptedPayload;
    totalPlaintextBytes: number;
  }): Promise<KioskSubmissionRow>;
  downloadSubmissionBlob(row: KioskSubmissionRow): Promise<Uint8Array<ArrayBuffer>>;
  useSubmissionRows(routeId: string | undefined): KioskSubmissionRows;
};

export type KioskCryptoConfig = {
  creatorKeyId: string;
  creatorPrivateJwk: JsonWebKey;
  submissionServiceKeyId: string;
  submissionServicePublicJwk: JsonWebKey;
  submissionServicePrivateJwk: JsonWebKey;
  trustedCreatorPublicKeys: Record<string, JsonWebKey>;
};

export type InitiatedKioskRequest = {
  verified: VerifiedKioskRequest;
  encryptedRequest: EncryptedKioskRequest;
  requestRow: KioskRequestRow;
  submitUrl: string;
  desktopPrivateKey: CryptoKey;
  desktopPrivateJwk: JsonWebKey;
};

export type ResolvedKioskRequest = {
  pointer: { requestId: string };
  requestRow: KioskRequestRow;
  verified: VerifiedKioskRequest;
};

export type CompletedKioskRequest = {
  row: KioskSubmissionRow;
  plaintext: SubmissionPlaintext;
  totalPlaintextBytes: number;
};

export type OpenedKioskSubmission = {
  row: KioskSubmissionRow;
  plaintext: SubmissionPlaintext;
};

export async function initiateKioskRequest(input: {
  provider: KioskTransportProvider;
  cryptoConfig: Pick<
    KioskCryptoConfig,
    "creatorKeyId" | "creatorPrivateJwk" | "submissionServiceKeyId" | "submissionServicePublicJwk"
  >;
  submitBaseUrl: string | URL;
  smartRequest: {
    presetId: string;
    title: string;
    request: SmartCheckinRequest;
  };
}): Promise<InitiatedKioskRequest> {
  ensureProviderConfigured(input.provider);
  const creatorPrivateKey = await importCreatorPrivateKey(input.cryptoConfig.creatorPrivateJwk);
  const desktopKeyPair = await generateDesktopEncryptionKeyPair();
  const desktopPublicKeyJwk = await exportPublicJwk(desktopKeyPair.publicKey);
  const verified = await createKioskRequestJws({
    transportAppId: input.provider.appId,
    creatorPrivateKey,
    creatorKeyId: input.cryptoConfig.creatorKeyId,
    submissionServiceKeyId: input.cryptoConfig.submissionServiceKeyId,
    desktopPublicKeyJwk,
    smartRequest: input.smartRequest,
  });
  const encryptedRequest = await encryptKioskRequestJws({
    verified,
    submissionServicePublicKeyJwk: input.cryptoConfig.submissionServicePublicJwk,
  });
  const requestRow = await input.provider.writeRequest({
    payload: verified.payload,
    requestHash: verified.requestHash,
    encryptedRequest,
  });
  return {
    verified,
    encryptedRequest,
    requestRow,
    submitUrl: buildPointerSubmitUrl(input.submitBaseUrl, verified.payload.requestId),
    desktopPrivateKey: desktopKeyPair.privateKey,
    desktopPrivateJwk: await exportPrivateJwk(desktopKeyPair.privateKey),
  };
}

export async function resolveKioskRequest(input: {
  provider: KioskTransportProvider;
  cryptoConfig: Pick<KioskCryptoConfig, "submissionServicePrivateJwk" | "trustedCreatorPublicKeys">;
  requestId: string;
}): Promise<ResolvedKioskRequest> {
  ensureProviderConfigured(input.provider);
  const requestRow = await input.provider.readRequest(input.requestId);
  const submissionServicePrivateKey = await importSubmissionServicePrivateKey(input.cryptoConfig.submissionServicePrivateJwk);
  const verified = await openEncryptedKioskRequest({
    encrypted: requestRow.encryptedRequest,
    submissionServicePrivateKey,
    trustedCreatorPublicKeys: input.cryptoConfig.trustedCreatorPublicKeys,
    expectedTransportAppId: input.provider.appId,
  });
  if (requestRow.requestId !== verified.payload.requestId) throw new Error("Request row id does not match signed request.");
  if (requestRow.requestHash !== verified.requestHash) throw new Error("Request row hash does not match signed request.");
  if (requestRow.routeId !== verified.payload.routeId) throw new Error("Request row route does not match signed request.");
  if (requestRow.sessionId !== verified.payload.sessionId) throw new Error("Request row session does not match signed request.");
  return {
    pointer: { requestId: input.requestId },
    requestRow,
    verified,
  };
}

export async function completeKioskRequest(input: {
  provider: KioskTransportProvider;
  request: VerifiedKioskRequest;
  payload: Record<string, unknown>;
  now?: number;
}): Promise<CompletedKioskRequest> {
  ensureProviderConfigured(input.provider);
  const plaintext: SubmissionPlaintext = {
    requestId: input.request.payload.requestId,
    sessionId: input.request.payload.sessionId,
    routeId: input.request.payload.routeId,
    requestHash: input.request.requestHash,
    certHash: input.request.requestHash,
    nonce: crypto.randomUUID(),
    submittedAt: input.now ?? Date.now(),
    formId: KIOSK_FORM_ID,
    payload: input.payload,
  };
  const totalPlaintextBytes = utf8(canonicalJson(plaintext)).byteLength;
  if (totalPlaintextBytes > KIOSK_MAX_PAYLOAD_BYTES) {
    throw new Error(`Payload is ${totalPlaintextBytes} bytes; maximum is ${KIOSK_MAX_PAYLOAD_BYTES}.`);
  }
  const encrypted = await encryptSubmissionPlaintext(input.request, plaintext);
  const row = await input.provider.writeSubmission({
    request: input.request,
    plaintext,
    encrypted,
    totalPlaintextBytes,
  });
  return { row, plaintext, totalPlaintextBytes };
}

export async function openKioskSubmission(input: {
  provider: KioskTransportProvider;
  request: VerifiedKioskRequest;
  desktopPrivateKey: CryptoKey;
  row: KioskSubmissionRow;
}): Promise<OpenedKioskSubmission> {
  const ciphertext = await input.provider.downloadSubmissionBlob(input.row);
  const plaintext = await decryptSubmissionPlaintext({
    request: input.request,
    desktopPrivateKey: input.desktopPrivateKey,
    phoneEphemeralPublicKeyJwk: input.row.phoneEphemeralPublicKeyJwk,
    iv: input.row.iv,
    ciphertext,
  });
  if (plaintext.requestId !== input.request.payload.requestId) throw new Error("requestId mismatch");
  if (plaintext.sessionId !== input.request.payload.sessionId) throw new Error("sessionId mismatch");
  if (plaintext.routeId !== input.request.payload.routeId) throw new Error("routeId mismatch");
  if (plaintext.requestHash !== input.request.requestHash) throw new Error("requestHash mismatch");
  if (plaintext.nonce !== input.row.nonce) throw new Error("nonce mismatch");
  if (plaintext.formId !== input.row.formId) throw new Error("formId mismatch");
  return { row: input.row, plaintext };
}

export function buildPointerSubmitUrl(baseUrl: string | URL, requestId: string): string {
  const url = new URL(String(baseUrl));
  url.hash = `r=${encodeURIComponent(requestId)}`;
  return url.toString();
}

export function filterRowsForRequest(input: {
  rows: KioskSubmissionRow[];
  routeId: string;
  requestHash: string;
}): KioskSubmissionRow[] {
  return input.rows.filter((row) =>
    row.routeId === input.routeId &&
    (row.requestHash ?? row.certHash) === input.requestHash &&
    row.storagePath.startsWith(`submissions/${row.routeId}/`) &&
    row.contentType === KIOSK_BLOB_CONTENT_TYPE &&
    row.formId === KIOSK_FORM_ID &&
    row.totalPlaintextBytes <= KIOSK_MAX_PAYLOAD_BYTES &&
    row.totalCiphertextBytes <= KIOSK_MAX_BLOB_BYTES
  );
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KiB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MiB`;
}

function ensureProviderConfigured(provider: KioskTransportProvider): void {
  if (!provider.configured) throw new Error(`${provider.name} kiosk transport is not configured.`);
}

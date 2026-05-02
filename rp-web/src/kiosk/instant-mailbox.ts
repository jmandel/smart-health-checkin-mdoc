import { id } from "@instantdb/react";
import { db, INSTANT_APP_ID, instantConfigured } from "../instant/db.ts";
import type { KioskRequestRow, KioskSubmissionRow, KioskTransportProvider } from "./kiosk-provider.ts";
import {
  KIOSK_BLOB_CONTENT_TYPE,
  KIOSK_FORM_ID,
  KIOSK_MAX_BLOB_BYTES,
  KIOSK_MAX_PAYLOAD_BYTES,
  randomBase64Url,
  storagePrefixForRouteId,
  type EncryptedPayload,
} from "./protocol.ts";

export async function writeEncryptedKioskRequest(
  input: Parameters<KioskTransportProvider["writeRequest"]>[0],
): Promise<KioskRequestRow> {
  if (input.payload.requestId !== input.encryptedRequest.requestId) {
    throw new Error("Encrypted request pointer does not match signed request payload.");
  }
  if (input.requestHash !== input.encryptedRequest.jwsSha256) {
    throw new Error("Encrypted request hash does not match signed request hash.");
  }
  const row: KioskRequestRow = {
    id: id(),
    requestId: input.payload.requestId,
    routeId: input.payload.routeId,
    sessionId: input.payload.sessionId,
    requestHash: input.requestHash,
    createdAt: input.payload.createdAt,
    expiresAt: input.payload.expiresAt,
    creatorKeyId: input.payload.minter.keyId,
    serviceKeyId: input.payload.encryptRequestTo.keyId,
    encryptedRequest: input.encryptedRequest,
  };
  await db.transact(
    db.tx.requests[row.id]!
      .ruleParams({ requestId: row.requestId })
      .update(row),
  );
  return row;
}

export async function readEncryptedKioskRequest(requestId: string): Promise<KioskRequestRow> {
  const result = await db.queryOnce(
    {
      requests: {
        $: {
          where: { requestId },
        },
      },
    },
    { ruleParams: { requestId } },
  );
  const row = (result.data.requests as KioskRequestRow[]).find((item) => item.requestId === requestId);
  if (!row) throw new Error("Kiosk request pointer was not found.");
  return row;
}

export async function writeEncryptedSubmission(input: {
  request: Parameters<KioskTransportProvider["writeSubmission"]>[0]["request"];
  plaintext: Parameters<KioskTransportProvider["writeSubmission"]>[0]["plaintext"];
  encrypted: EncryptedPayload;
  totalPlaintextBytes: number;
}): Promise<KioskSubmissionRow> {
  if (input.totalPlaintextBytes > KIOSK_MAX_PAYLOAD_BYTES) {
    throw new Error(`Payload exceeds ${formatBytes(KIOSK_MAX_PAYLOAD_BYTES)}.`);
  }
  if (input.encrypted.ciphertext.byteLength > KIOSK_MAX_BLOB_BYTES) {
    throw new Error(`Encrypted blob exceeds ${formatBytes(KIOSK_MAX_BLOB_BYTES)}.`);
  }
  if (input.plaintext.requestId !== input.request.payload.requestId) throw new Error("Submission requestId does not match kiosk request.");
  if (input.plaintext.routeId !== input.request.payload.routeId) throw new Error("Submission routeId does not match kiosk request.");
  if (input.plaintext.sessionId !== input.request.payload.sessionId) throw new Error("Submission sessionId does not match kiosk request.");
  if (input.plaintext.requestHash !== input.request.requestHash) throw new Error("Submission request hash does not match kiosk request.");
  if (!input.request.payload.constraints.allowedContentTypes.includes(KIOSK_BLOB_CONTENT_TYPE)) {
    throw new Error("Kiosk request does not allow encrypted blob uploads.");
  }
  const routeId = input.request.payload.routeId;
  const storagePath = storagePathForSubmission(routeId, input.plaintext.nonce);
  const uploaded = await db.storage.uploadFile(
    storagePath,
    new Blob([arrayBufferCopy(input.encrypted.ciphertext)], { type: KIOSK_BLOB_CONTENT_TYPE }),
    {
      contentType: KIOSK_BLOB_CONTENT_TYPE,
      contentDisposition: `attachment; filename="${input.plaintext.nonce}.bin"`,
    },
  );
  const row: KioskSubmissionRow = {
    id: id(),
    routeId,
    sessionId: input.request.payload.sessionId,
    submissionId: randomBase64Url(18),
    requestId: input.request.payload.requestId,
    requestHash: input.request.requestHash,
    certHash: input.request.requestHash,
    nonce: input.plaintext.nonce,
    createdAt: Date.now(),
    expiresAt: input.request.payload.expiresAt,
    formId: KIOSK_FORM_ID,
    totalPlaintextBytes: input.totalPlaintextBytes,
    totalCiphertextBytes: input.encrypted.ciphertext.byteLength,
    payloadSha256: input.encrypted.payloadSha256,
    iv: input.encrypted.iv,
    storagePath,
    storageFileId: uploaded.data.id,
    contentType: KIOSK_BLOB_CONTENT_TYPE,
    phoneEphemeralPublicKeyJwk: input.encrypted.phoneEphemeralPublicKeyJwk,
  };

  await db.transact(
    db.tx.submissions[row.id]!
      .ruleParams({ routeId })
      .update(row),
  );
  return row;
}

export async function downloadEncryptedSubmissionBlob(row: KioskSubmissionRow): Promise<Uint8Array<ArrayBuffer>> {
  const expectedPath = storagePathForSubmission(row.routeId, row.nonce);
  if (row.storagePath !== expectedPath) throw new Error("storagePath does not match route and nonce.");
  if (row.contentType !== KIOSK_BLOB_CONTENT_TYPE) throw new Error("Unsupported encrypted blob content type.");
  if (row.totalCiphertextBytes > KIOSK_MAX_BLOB_BYTES) throw new Error("Encrypted blob size exceeds this app's limit.");

  const result = await db.queryOnce({
    $files: {
      $: {
        where: { path: row.storagePath },
      },
    },
  });
  const file = result.data.$files.find((item) => item.path === row.storagePath);
  if (!file?.url || typeof file.url !== "string") throw new Error("Encrypted blob is not available in Instant Storage.");

  const response = await fetch(file.url);
  if (!response.ok) throw new Error(`Encrypted blob download failed: ${response.status} ${response.statusText}`);
  const bytes = new Uint8Array(await response.arrayBuffer());
  if (bytes.byteLength !== row.totalCiphertextBytes) {
    throw new Error(`Encrypted blob size mismatch: expected ${row.totalCiphertextBytes}, got ${bytes.byteLength}.`);
  }
  return bytes;
}

export function filterRowsForSession(input: {
  rows: KioskSubmissionRow[];
  routeId: string;
  requestHash: string;
}): KioskSubmissionRow[] {
  return input.rows.filter((row) =>
    row.routeId === input.routeId &&
    (row.requestHash ?? row.certHash) === input.requestHash &&
    row.storagePath === storagePathForSubmission(row.routeId, row.nonce) &&
    row.contentType === KIOSK_BLOB_CONTENT_TYPE &&
    row.formId === KIOSK_FORM_ID &&
    row.totalPlaintextBytes <= KIOSK_MAX_PAYLOAD_BYTES &&
    row.totalCiphertextBytes <= KIOSK_MAX_BLOB_BYTES
  );
}

export function storagePathForSubmission(routeId: string, nonce: string): string {
  return `${storagePrefixForRouteId(routeId)}${nonce}.bin`;
}

function arrayBufferCopy(bytes: Uint8Array): ArrayBuffer {
  const out = new Uint8Array(bytes.byteLength);
  out.set(bytes);
  return out.buffer;
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KiB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MiB`;
}

export const instantKioskProvider: KioskTransportProvider = {
  name: "InstantDB",
  appId: INSTANT_APP_ID,
  configured: instantConfigured,
  writeRequest: writeEncryptedKioskRequest,
  readRequest: readEncryptedKioskRequest,
  writeSubmission: writeEncryptedSubmission,
  downloadSubmissionBlob: downloadEncryptedSubmissionBlob,
  useSubmissionRows(routeId) {
    const query = routeId
      ? {
          submissions: {
            $: {
              where: { routeId },
              order: { createdAt: "asc" as const },
            },
          },
        }
      : null;
    const result = db.useQuery(query, routeId ? { ruleParams: { routeId } } : undefined);
    return {
      rows: routeId && result.data?.submissions ? (result.data.submissions as KioskSubmissionRow[]) : [],
      isLoading: result.isLoading,
      error: result.error,
    };
  },
};

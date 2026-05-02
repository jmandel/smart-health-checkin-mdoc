import { id } from "@instantdb/react";
import { db, INSTANT_APP_ID, instantConfigured } from "../instant/db.ts";
import type { KioskRequestRow, KioskSubmissionRow, KioskTransportProvider } from "./kiosk-provider.ts";
import {
  KIOSK_BLOB_CONTENT_TYPE,
  KIOSK_MAX_BLOB_BYTES,
  KIOSK_MAX_PAYLOAD_BYTES,
  randomBase64Url,
  storagePrefixForRequestId,
  type EncryptedPayload,
} from "./protocol.ts";

const KIOSK_SYNC_TIMEOUT_MS = 15_000;
const KIOSK_SYNC_POLL_MS = 500;

export async function writeEncryptedKioskRequest(
  input: Parameters<KioskTransportProvider["writeRequest"]>[0],
): Promise<KioskRequestRow> {
  if (input.payload.requestId !== input.encryptedRequest.requestId) {
    throw new Error("Encrypted request pointer does not match signed request payload.");
  }
  const row: KioskRequestRow = {
    id: id(),
    requestId: input.payload.requestId,
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
  return waitForRequestRow(row.requestId);
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
  const requestId = input.request.payload.requestId;
  const submissionId = randomBase64Url(18);
  const storagePath = storagePathForSubmission(requestId, submissionId);
  const uploaded = await db.storage.uploadFile(
    storagePath,
    new Blob([arrayBufferCopy(input.encrypted.ciphertext)], { type: KIOSK_BLOB_CONTENT_TYPE }),
    {
      contentType: KIOSK_BLOB_CONTENT_TYPE,
      contentDisposition: `attachment; filename="${submissionId}.bin"`,
    },
  );
  const row: KioskSubmissionRow = {
    id: id(),
    submissionId,
    requestId,
    createdAt: Date.now(),
    expiresAt: input.request.payload.expiresAt,
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
      .ruleParams({ requestId })
      .update(row),
  );
  return waitForSubmissionRow(requestId, submissionId);
}

export async function downloadEncryptedSubmissionBlob(row: KioskSubmissionRow): Promise<Uint8Array<ArrayBuffer>> {
  const expectedPath = storagePathForSubmission(row.requestId, row.submissionId);
  if (row.storagePath !== expectedPath) throw new Error("storagePath does not match request and submission.");
  if (row.contentType !== KIOSK_BLOB_CONTENT_TYPE) throw new Error("Unsupported encrypted blob content type.");
  if (row.totalCiphertextBytes > KIOSK_MAX_BLOB_BYTES) throw new Error("Encrypted blob size exceeds this app's limit.");

  const result = await db.queryOnce({
    $files: {
      $: {
        where: { path: row.storagePath },
      },
    },
  }, { ruleParams: { requestId: row.requestId, storagePath: row.storagePath } });
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

export async function readSubmissionRows(requestId: string): Promise<KioskSubmissionRow[]> {
  const result = await db.queryOnce(
    {
      submissions: {
        $: {
          where: { requestId },
          order: { createdAt: "asc" as const },
        },
      },
    },
    { ruleParams: { requestId } },
  );
  return result.data?.submissions ? (result.data.submissions as KioskSubmissionRow[]) : [];
}

async function waitForRequestRow(requestId: string): Promise<KioskRequestRow> {
  return waitForVisibleRow(
    async () => readEncryptedKioskRequest(requestId),
    `Timed out waiting for kiosk request ${requestId} to sync.`,
  );
}

async function waitForSubmissionRow(requestId: string, submissionId: string): Promise<KioskSubmissionRow> {
  return waitForVisibleRow(async () => {
    const rows = await readSubmissionRows(requestId);
    const row = rows.find((item) => item.submissionId === submissionId);
    if (!row) throw new Error("Submission row is not visible yet.");
    return row;
  }, `Timed out waiting for phone response ${submissionId} to sync.`);
}

async function waitForVisibleRow<T>(
  read: () => Promise<T>,
  timeoutMessage: string,
): Promise<T> {
  const deadline = Date.now() + KIOSK_SYNC_TIMEOUT_MS;
  let lastError: unknown;
  while (Date.now() <= deadline) {
    try {
      return await read();
    } catch (e) {
      lastError = e;
      await sleep(KIOSK_SYNC_POLL_MS);
    }
  }
  const reason = lastError instanceof Error ? ` Last error: ${lastError.message}` : "";
  throw new Error(`${timeoutMessage}${reason}`);
}

export function storagePathForSubmission(requestId: string, submissionId: string): string {
  return `${storagePrefixForRequestId(requestId)}${submissionId}.bin`;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => globalThis.setTimeout(resolve, ms));
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
  useSubmissionRows(requestId) {
    const query = requestId
      ? {
          submissions: {
            $: {
              where: { requestId },
              order: { createdAt: "asc" as const },
            },
          },
        }
      : null;
    const result = db.useQuery(query, requestId ? { ruleParams: { requestId } } : undefined);
    return {
      rows: requestId && result.data?.submissions ? (result.data.submissions as KioskSubmissionRow[]) : [],
      isLoading: result.isLoading,
      error: result.error,
    };
  },
};

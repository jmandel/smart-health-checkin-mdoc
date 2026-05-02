# Slim the InstantDB kiosk transport rows

## Problem

The InstantDB kiosk mailbox (see `docs/plans/kioskmode-transport.md` and its
addendum) currently carries far more columns than the protocol actually needs.
Today `requests` rows duplicate fields that already live inside the encrypted
JWS envelope, and `submissions` rows carry size/integrity metadata that is
redundant with AES‑GCM's authenticated tag and the request's own size limits.

Because Instant is treated as an **untrusted realtime mailbox**, every column
that exists must justify itself either as

1. lookup/identity needed to retrieve the row, or
2. material the receiver cannot derive from the envelope itself, or
3. a top‑level field that a permission rule must inspect (rules can't see
   inside a `json` column).

Anything else is noise, and noise expands the trust surface of the row schema
for no security benefit.

## Goal

Reduce both rows to the minimum information needed to:

- look the row up by request id,
- locate the encrypted blob in Storage (submission only),
- decrypt the blob with ECDH+HKDF+AES‑GCM,
- preserve the existing permission rules' anti‑enumeration property
  (`knowsRequest` / `knownStoragePath`).

No protocol/crypto changes. The encrypted envelope (`EncryptedKioskRequest`
JSON) and the response ciphertext format are unchanged. `requestId` continues
to be the random per‑session id used as the HKDF salt and AES‑GCM AAD on both
legs — see `rp-web/src/kiosk/protocol.ts:200-212, 243-253, 321-329, 352-362`.

## Target schema

```ts
// rp-web/src/instant/schema.ts
requests: i.entity({
  requestId: i.string().unique().indexed(),
  encryptedRequest: i.json<EncryptedKioskRequest>(),
}),
submissions: i.entity({
  submissionId: i.string().unique().indexed(),
  requestId: i.string().indexed(),
  storagePath: i.string().unique().indexed(),
  storageFileId: i.string().indexed(),
  iv: i.string(),
  phoneEphemeralPublicKeyJwk: i.json<JsonWebKey>(),
}),
```

### Dropped from `requests`
- `createdAt`, `expiresAt` — already inside the signed JWS payload; verified
  client‑side in `verifyKioskRequestJws` / `validateKioskRequestPayload`.
- `creatorKeyId`, `serviceKeyId` — duplicates of `EncryptedKioskRequest.creatorKeyId`
  / `recipientKeyId` and the JWS header `kid`. Nothing queries by them.

### Dropped from `submissions`
- `createdAt`, `expiresAt` — only consumed for UI display strings and the
  `order:` clause on the live query (which is already filtered to a single
  `requestId`, so ordering of duplicate/retry rows in one session is cosmetic).
- `totalPlaintextBytes`, `totalCiphertextBytes` — `KIOSK_MAX_PAYLOAD_BYTES`
  is enforced inside `encryptSubmissionPlaintext` (phone) and again on the
  decrypted plaintext (desktop). AES‑GCM auth tag + JWS expiration handle
  freshness/integrity.
- `payloadSha256` — AES‑GCM's authenticated tag already covers ciphertext
  integrity; the plaintext requestId check inside `decryptSubmissionPlaintext`
  + `openKioskSubmission` already ensures the right session.
- `contentType` — fixed by protocol; not used by any rule once `pathOk`
  handles the storage path shape.

### Kept and why

| Field | Why it stays |
| --- | --- |
| `requests.requestId` | Lookup key + `knowsRequest` rule (`data.requestId == ruleParams.requestId`). |
| `requests.encryptedRequest` | The encrypted envelope itself. |
| `submissions.submissionId` | Component of `storagePath`, validated by the `pathOk` rule. |
| `submissions.requestId` | Foreign key + `knowsRequest` rule + path rule. |
| `submissions.storagePath` / `storageFileId` | Pointer into Instant Storage where the ciphertext lives. |
| `submissions.iv` | Required by AES‑GCM at decrypt time and not stored inside the blob. |
| `submissions.phoneEphemeralPublicKeyJwk` | Required for ECDH key agreement at decrypt time. |

## Permission rules after the cleanup

`rp-web/instant.perms.ts`:

- `requests`
  - `knowsRequest` — keep.
  - `allowedFields` — narrow to `['requestId', 'encryptedRequest']`.
  - **Drop** `timeShapeOk`.
  - `view`/`create` keep their existing predicate composition minus the dropped
    bind.
- `submissions`
  - `knowsRequest` — keep.
  - `allowedFields` — narrow to
    `['submissionId', 'requestId', 'storagePath', 'storageFileId', 'iv', 'phoneEphemeralPublicKeyJwk']`.
  - `pathOk` — keep (still validates `storagePath` shape).
  - **Drop** `sizeOk`, `contentOk`, `timeShapeOk`.
  - `view`/`create` keep `knowsRequest && allowedFields && pathOk`.
- `$files`
  - Unchanged. `kioskBlobPath` (path prefix) and `knownStoragePath` (rule‑param
    pinning) still cover anti‑enumeration.

The defense‑in‑depth properties that survive: rows can only be read by a caller
that already knows the `requestId`; submission storage paths must be tied to
that `requestId`; storage blobs can only be fetched by a caller presenting both
`requestId` and the exact `storagePath`. The rules that go away (size, content
type, expiry shape) were never the security root — JWS + AES‑GCM are.

## Code that must change

1. `rp-web/src/instant/schema.ts` — drop the listed fields from both entities.
2. `rp-web/instant.perms.ts` — narrow `allowedFields` whitelists, drop
   `timeShapeOk` / `sizeOk` / `contentOk` binds and references.
3. `rp-web/instant.perms.test.ts` — update / remove assertions that referenced
   dropped fields if any; verify the kept `knowsRequest` / `knownStoragePath`
   tests still pass unchanged.
4. `rp-web/src/kiosk/kiosk-provider.ts`
   - Trim `KioskRequestRow` and `KioskSubmissionRow` to the new shape.
   - Update `filterRowsForRequest` to drop the `contentType` and size checks
     (it can keep the `requestId` and `storagePath.startsWith(...)` guards).
5. `rp-web/src/kiosk/instant-mailbox.ts`
   - `writeEncryptedKioskRequest`: stop populating dropped fields.
   - `writeEncryptedSubmission`: stop populating dropped fields; keep the
     local `KIOSK_MAX_PAYLOAD_BYTES` / `KIOSK_MAX_BLOB_BYTES` guards on the
     incoming `totalPlaintextBytes` / `encrypted.ciphertext.byteLength` (these
     are write‑side checks, not row data).
   - `downloadEncryptedSubmissionBlob`: remove the `row.contentType`,
     `row.totalCiphertextBytes`, and post‑download size‑mismatch checks.
     Keep the `storagePath == storagePathForSubmission(...)` invariant and
     re‑apply the `KIOSK_MAX_BLOB_BYTES` cap on `bytes.byteLength` to bound
     memory.
   - `useSubmissionRows`: remove the `order: { createdAt: "asc" }` clause.
6. `rp-web/src/kiosk/creator-main.tsx`
   - `submissionDebugRow` (line ~360): drop the `createdAt`, `expiresAt`,
     `totalPlaintextBytes`, `totalCiphertextBytes`, `payloadSha256`,
     `contentType` properties.
7. `rp-web/src/kiosk/submit-main.tsx`
   - `submissionDebugRow` (line ~340): same trim as above.
   - `Encrypted blob` field (line 246) currently displays
     `formatBytes(row.totalCiphertextBytes)`. Replace with the local
     ciphertext size we already computed (or drop the field).
8. `rp-web/src/kiosk/kiosk-provider.test.ts` — update the in‑memory test
   provider's row shape to match (lines ~120–180).
9. No protocol changes: `rp-web/src/kiosk/protocol.ts` is untouched.
10. No documentation rewrites required:
    - `site/kiosk-flow-explainer.html` does not reference field names.
    - `docs/plans/kioskmode-transport.md` and its addendum describe the
      conceptual model, not the column list.

## Out of scope

- Content‑addressable request id (`id = sha256(ct)`). Considered and rejected
  for this pass — would require moving the AAD/HKDF‑salt binding inward and
  doesn't improve security materially over the random `requestId`.
- Folding `iv` / `phoneEphemeralPublicKeyJwk` into the storage blob as a
  self‑describing envelope. Considered; chose to keep them on the row to keep
  the storage blob a raw ciphertext.
- Renaming `requestId` to a content hash; requires protocol revisioning.
- Any change to the JWS/AES‑GCM crypto.

## Validation

- `cd rp-web && bun run typecheck` (or whatever the equivalent script is) —
  must compile after row type narrowing.
- `cd rp-web && bun test instant.perms.test.ts` — kept tests still pass.
- `cd rp-web && bun test src/kiosk/kiosk-provider.test.ts` — provider test
  updated and green.
- Manual smoke: run the desktop creator + phone submitter pages, scan QR,
  submit, confirm the desktop receives + decrypts the response.
- Verify no leftover references to dropped fields:
  `rg 'totalPlaintextBytes|totalCiphertextBytes|payloadSha256|creatorKeyId\b|serviceKeyId\b' rp-web/`
  should return only protocol‑internal hits (`EncryptedKioskRequest.creatorKeyId`
  / `recipientKeyId` etc.) and no row‑shape hits.

## Risk and rollout

- **Schema migration:** Instant treats schema additions as non‑breaking but
  field removals require a `bun instant push` after the change. There is no
  long‑lived data here (TTL ≤ 10 minutes, ephemeral mailbox), so any in‑flight
  rows just expire. No data migration script needed.
- **Compatibility:** Both desktop and phone are static Pages from the same
  build, so the row reader and writer always ship together. No rolling‑update
  concern.
- **Reversibility:** Re‑adding columns later is cheap; nothing about the
  cleanup is lossy because each dropped column is either duplicated in the
  envelope or recomputable from the request constraints.

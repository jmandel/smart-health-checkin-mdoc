Yes. The previous plan mostly stays the same, but the **transport layer changes** because 5 MB submissions are too large for the realtime row itself.

> **Status (historical planning doc):** Documents the move from inline‑ciphertext
> rows to Instant Storage pointer rows. Field names below (`routeId`,
> `certHash`, `nonce`, `ciphertextBytes`, `contentType`, `createdAt`,
> `expiresAt`, `sessionId`) predate the shipped implementation. Today the
> pointer row is `{ submissionId, requestId, storagePath, storageFileId, iv,
> phoneEphemeralPublicKeyJwk }`. See
> [`docs/plans/kiosk-transport-row-slim.md`](kiosk-transport-row-slim.md) and
> `rp-web/src/instant/schema.ts` for the current shape.

# Plan update: support large blobs

## What changes

### Before

```text id="lcm9mj"
Phone encrypts payload
→ writes ciphertext directly into InstantDB submissions row
→ desktop receives row
→ desktop decrypts row contents
```

### After

```text id="isdc93"
Phone encrypts payload/blob
→ uploads encrypted blob to Instant Storage
→ writes small pointer row to InstantDB
→ desktop receives pointer row
→ desktop downloads encrypted blob from Storage
→ desktop decrypts blob locally
```

# Why this changes

InstantDB rows are good for small realtime messages, but a 5 MB response should not live directly in a realtime query row. It would make subscriptions heavy, slower, and more fragile.

Storage is a better fit for:

```text id="dfm88v"
5 MB files
photos
audio
PDFs
large JSON blobs
binary responses
```

InstantDB remains useful as the realtime notification channel.

# Updated architecture

```text id="2bi0ts"
GitHub Pages creator page
  - mints signed QR cert
  - subscribes to submissions by routeId
  - receives small pointer rows
  - downloads encrypted blobs
  - decrypts locally

GitHub Pages phone page
  - verifies signed QR cert
  - encrypts payload/blob locally
  - uploads encrypted blob to Instant Storage
  - writes pointer row to InstantDB

InstantDB
  - untrusted realtime pointer mailbox

Instant Storage
  - untrusted encrypted blob storage
```

# Updated data model

## Session row

Same as before:

```ts id="xbtnd6"
sessions: {
  id: sessionId,
  creatorId: auth.id,
  routeIdHash: hash(routeId),
  createdAt,
  expiresAt
}
```

## Submission pointer row

Changed from “contains ciphertext” to “points to ciphertext.”

```ts id="0oiclc"
submissions: {
  id,
  sessionId,
  routeId,
  certHash,
  nonce,

  storagePath,
  ciphertextBytes,
  contentType,

  phoneEphemeralPublicKeyJwk,

  createdAt,
  expiresAt
}
```

## Storage object

New:

```text id="5myn6x"
submissions/<routeId>/<nonce>.bin
```

Contents:

```text id="ofreex"
encrypted blob bytes
```

The plaintext inside the encrypted blob still includes:

```ts id="zfxtdv"
{
  sessionId,
  routeId,
  certHash,
  nonce,
  submittedAt,
  formId,
  payload
}
```

# Updated QR cert

Add blob limits and storage prefix:

```ts id="d20hcx"
type QrCert = {
  sessionId: string;
  routeId: string;
  expiresAt: number;

  submitTo: {
    backend: "instantdb";
    appId: string;
    pointerNamespace: "submissions";
    storagePrefix: `submissions/${routeId}/`;
  };

  constraints: {
    maxBlobBytes: 10_000_000;
    allowedContentTypes: [
      "application/octet-stream"
    ];
  };

  encryptTo: {
    alg: "ECDH-P256+HKDF-SHA256+AES-GCM";
    desktopPublicKeyJwk: JsonWebKey;
  };

  minter: {
    keyId: string;
  };
};
```

Because this is signed, Instant cannot alter the destination, storage prefix, expiry, size limit, or encryption key without breaking verification.

# Updated phone flow

```text id="j4s3lv"
1. Scan QR.
2. Verify signed QR cert.
3. Check expiry and maxBlobBytes.
4. Collect payload or file.
5. Generate nonce.
6. Encrypt payload/blob locally.
7. Upload encrypted bytes to:
   submissions/<routeId>/<nonce>.bin
8. Write small InstantDB row:
   routeId, nonce, certHash, storagePath, size, phonePublicKey, expiry
9. Show success.
```

# Updated desktop flow

```text id="lo67ca"
1. Subscribe to InstantDB submissions with ruleParams.routeId.
2. Receive pointer row.
3. Check routeId, certHash, expiry, size, storagePath prefix.
4. Download encrypted blob from Storage.
5. Derive key using desktop private key + phone public key.
6. Decrypt blob.
7. Verify decrypted sessionId, routeId, certHash, nonce.
8. Display result.
9. Delete pointer row and blob if authorized, or let cleanup job handle it.
```

# Updated permissions

## DB rows

Keep route-gated read/create:

```ts id="xud8r4"
submissions: {
  allow: {
    view: "data.routeId == ruleParams.routeId",

    create:
      "newData.routeId == ruleParams.routeId && " +
      "newData.storagePath.startsWith('submissions/' + ruleParams.routeId + '/')",

    update: "false",

    delete:
      "auth.id != null && auth.id in data.ref('session.creatorId')"
  }
}
```

## Storage

Storage is less expressive for your exact capability model, so treat it as encrypted untrusted storage.

Conceptually:

```ts id="vd1ego"
$files: {
  allow: {
    create: "data.path.startsWith('submissions/')",
    view: "data.path.startsWith('submissions/')",
    delete: "auth.id != null"
  }
}
```

Then security comes from:

```text id="pbq9ry"
unguessable paths
encrypted contents
desktop only downloading paths from valid pointer rows
signed QR cert binding routeId/storagePrefix
scheduled cleanup
```

# New risk introduced

The main new risk is **anonymous upload spam**.

Before, attackers could spam DB rows. Now they could also upload junk blobs if Storage allows anonymous upload under `submissions/`.

Mitigations:

```text id="6mjbd7"
short QR/session expiry
maxBlobBytes in signed cert
Instant Storage size limits if available
desktop ignores anything not referenced by valid pointer row
scheduled cleanup deletes expired orphan blobs
consider requiring phone auth for higher-abuse deployments
```

# What stays the same

These parts of the previous plan do not change:

```text id="lnwl2l"
creator signing key
signed QR certificate
phone verifies QR before submitting
desktop ephemeral encryption key
routeId as high-entropy mailbox capability
Instant treated as untrusted
desktop-side decrypt and verification
expiry and replay protection
scheduled cleanup
```

# Revised MVP milestones

## Milestone 1

Same as before: signed QR and local encrypt/decrypt.

## Milestone 2

Changed:

```text id="rny10h"
Add Storage upload/download for encrypted blobs.
Add DB pointer rows.
Desktop receives pointer row, downloads blob, decrypts.
```

## Milestone 3

Same: creator key UX.

## Milestone 4

Expanded hardening:

```text id="u1k37i"
blob size limits
storage path validation
orphan blob cleanup
upload progress UI
download retry handling
delete blob after successful decrypt
```

# Bottom line

The updated plan is:

```text id="qzcwyj"
InstantDB = realtime pointer mailbox
Instant Storage = encrypted blob bucket
Crypto = actual trust layer
QR cert = signed routing/encryption contract
Desktop = verifier/decryptor/consumer
Cleanup job = physical deletion
```

This is the right shape for 5 MB submissions.


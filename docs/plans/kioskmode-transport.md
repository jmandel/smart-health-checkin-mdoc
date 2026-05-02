Below is the shape I’d build.

> **Status (historical planning doc):** This file captures the original
> design exploration and uses earlier terminology (`sessionId`, `routeId`,
> `certHash`, `nonce`). The shipped implementation collapses these into a
> single random `requestId` and ships a slimmer transport row schema. See
> [`docs/plans/kiosk-transport-row-slim.md`](kiosk-transport-row-slim.md) for
> the current schema, and `rp-web/src/kiosk/protocol.ts`,
> `rp-web/src/kiosk/instant-mailbox.ts`, and `rp-web/instant.perms.ts` for the
> code of record.

# Goal

A GitHub Pages static app where:

```text
Authorized creator opens desktop page
→ unlocks creator signing credential
→ page mints QR session
→ phone scans QR
→ phone verifies QR was minted by trusted creator key
→ phone encrypts payload to that desktop session
→ phone writes encrypted blob to InstantDB
→ desktop page listens to mailbox route
→ desktop decrypts locally
```

InstantDB is treated as an **untrusted realtime mailbox**. It can deliver rows, but it is not trusted to authorize, validate, or read meaningful data.

# Trust model

Trust these:

```text
Creator signing private key
Trusted creator public key baked into the static app
Desktop browser runtime, while page is open
Phone browser runtime, after loading your static submit page
Web Crypto / vetted crypto library
```

Do **not** trust these:

```text
InstantDB contents
InstantDB access control as the root of security
Other clients
Mailbox row metadata
The QR transport itself
```

Use Instant permissions anyway to reduce public enumeration and spam. Instant supports per-namespace `view`, `create`, `update`, and `delete` rules, and its docs say `view` rules are evaluated server-side before objects are returned to clients. But because you do not want to trust Instant, these rules are only defense-in-depth, not the security root. ([InstantDB][1])

# Main objects

## 1. Creator signing key

Long-term key used only to mint QR certificates.

```ts
type CreatorKey = {
  keyId: string;              // "creator-main-2026-05"
  publicKey: string;          // baked into app
  encryptedPrivateKey?: string; // optional, if embedding encrypted key
};
```

Preferred storage options:

```text
Best static-only option:
  user imports local encrypted key file

Acceptable demo option:
  encrypted private key blob is shipped with site
  creator unlocks with strong passphrase

Best production option:
  hardware key / passkey / tiny signer service
```

Since the static page is public, never place a raw private key in the app bundle.

## 2. QR session certificate

This is the core artifact.

```ts
type QrCert = {
  v: 1;

  sessionId: string;       // random 128–256 bit id
  routeId: string;         // random 128–256 bit mailbox id
  createdAt: number;       // ms since epoch
  expiresAt: number;       // short TTL, e.g. 5–15 minutes

  submitTo: {
    backend: "instantdb";
    appId: string;
    namespace: "submissions";
    routeId: string;
  };

  encryptTo: {
    alg: "ECDH-P256+HKDF-SHA256+AES-GCM"; // practical browser-native choice
    desktopPublicKeyJwk: JsonWebKey;
  };

  constraints: {
    maxSubmissions: number;
    maxCiphertextBytes: number;
    formId: string;
  };

  minter: {
    keyId: string;
  };
};

type SignedQrCert = {
  cert: QrCert;
  sig: string; // base64url signature over canonical JSON(cert)
};
```

The phone accepts a QR only if:

```text
signature is valid
expiresAt is still valid
submitTo.appId and namespace are expected
desktopPublicKey is valid
routeId in submitTo matches routeId in cert
```

## 3. Submission row

Stored in InstantDB.

```ts
type SubmissionRow = {
  id: string;

  routeId: string;        // capability / mailbox id
  certHash: string;       // hash of signed QR cert
  nonce: string;          // random per submission
  createdAt: number;

  ciphertext: string;     // base64url AES-GCM output
  phoneEphemeralPublicKeyJwk: JsonWebKey;

  // Optional anti-spam / cleanup metadata:
  expiresAt: number;
  size: number;
};
```

The encrypted plaintext should include redundant integrity fields:

```ts
type SubmissionPlaintext = {
  sessionId: string;
  routeId: string;
  certHash: string;
  nonce: string;
  submittedAt: number;

  formId: string;

  payload: {
    // your actual form data
  };
};
```

The desktop decrypts and rejects unless the decrypted `sessionId`, `routeId`, `certHash`, and `formId` match the active QR session.

# Pages

## `/creator.html`

Desktop/source page.

Responsibilities:

```text
Load static app
Unlock/import creator signing key
Generate ephemeral desktop encryption keypair
Generate sessionId and routeId
Create signed QR certificate
Subscribe to InstantDB submissions where routeId == active routeId
Show QR
Decrypt incoming submissions
Display result on original page
```

State that must stay private:

```text
creator signing private key
desktop encryption private key
```

Ideally the desktop encryption private key is **non-exportable** and lives only in memory.

## `/submit.html`

Phone page.

Responsibilities:

```text
Read signed QR cert from URL fragment
Verify creator signature
Check expiry and constraints
Collect user data
Generate phone ephemeral ECDH keypair
Derive shared AES-GCM key from phone private key + desktop public key
Encrypt payload
Write ciphertext row to InstantDB
Show success/failure
```

The phone does **not** need to authenticate with Instant if your rules allow capability-based writes. It only needs the `routeId` capability from the QR.

## `/admin-key.html` or local script

Tooling page/script for key generation and rotation.

Responsibilities:

```text
Generate creator signing keypair
Export public key for app config
Encrypt private key with strong passphrase
Export creator-key.json
Rotate key IDs
Revoke old key IDs from trusted public key list
```

# Crypto plan

Use:

```text
Signing:
  Ed25519 if using a vetted library, or ECDSA P-256 via Web Crypto

Encryption:
  ECDH P-256 via Web Crypto
  HKDF-SHA256
  AES-GCM
```

Reason: Web Crypto is available only in secure contexts and provides low-level primitives for key generation, encryption, signing, verification, derivation, and related operations; MDN also warns that these primitives are easy to misuse, so keep the protocol small and use well-reviewed libraries where browser support is inconsistent. ([MDN Web Docs][2])

For browser-native compatibility, P-256 ECDSA and P-256 ECDH are a safe practical starting point. MDN documents `SubtleCrypto.generateKey()` for ECDSA/ECDH-style key generation and lists key usages including `sign`, `verify`, `deriveKey`, and `deriveBits`. ([MDN Web Docs][3]) MDN also documents `SubtleCrypto.sign()` and says the corresponding `verify()` method can verify signatures. ([MDN Web Docs][4])

Canonicalize before signing:

```ts
const bytes = utf8(canonicalJson(cert));
const sig = await sign(creatorPrivateKey, bytes);
```

Do **not** sign ordinary `JSON.stringify()` output unless you fully control ordering and serialization. Use a canonical JSON implementation.

# QR encoding

The QR should contain a compact encoded `SignedQrCert`.

```text
https://yourname.github.io/your-app/submit.html#q=<base64url(zstd-or-deflate(canonical-json(signedQrCert)))>
```

For MVP, skip compression unless the QR gets too dense:

```text
#q=<base64url(canonical-json(signedQrCert))>
```

Keep the cert small:

```text
short field names in production
short key IDs
compact public key encoding if needed
short expiry
no verbose labels
```

# InstantDB schema shape

Use minimal namespaces.

```ts
submissions: {
  id: string;
  routeId: string;
  certHash: string;
  nonce: string;
  createdAt: number;
  expiresAt: number;
  ciphertext: string;
  phoneEphemeralPublicKeyJwk: object;
  size: number;
}

seenNonces?: {
  id: string;
  routeId: string;
  nonce: string;
  createdAt: number;
}
```

You may not need `mailboxes` at all. The QR can carry the mailbox route directly.

That is cleaner because Instant does not need to know valid sessions in advance. The desktop simply subscribes to `submissions` with a known `routeId`.

# Instant permissions

You want two things from Instant permissions:

```text
Prevent casual global enumeration
Prevent schema/attribute abuse
```

Instant docs say permissions default to true if a rule is not set, so explicitly deny by default. ([InstantDB][1]) Also lock down attribute creation; Instant’s patterns docs show using `attrs: { allow: { "$default": "false" } }` to prevent new attributes. ([InstantDB][5])

Conceptual rules:

```ts
export default {
  "$default": {
    allow: {
      "$default": "false",
    },
  },

  attrs: {
    allow: {
      "$default": "false",
    },
  },

  submissions: {
    bind: {
      knowsRoute: "data.routeId == ruleParams.routeId",
      validCreateShape:
        "request.modifiedFields.all(field, field in [" +
        "'routeId', 'certHash', 'nonce', 'createdAt', 'expiresAt', " +
        "'ciphertext', 'phoneEphemeralPublicKeyJwk', 'size'" +
        "])",
      sizeOk: "newData.size <= 65536",
      notExpired: "timestamp(newData.expiresAt) > request.time",
    },

    allow: {
      view: "knowsRoute",

      create:
        "newData.routeId == ruleParams.routeId && " +
        "validCreateShape && sizeOk && notExpired",

      update: "false",
      delete: "false",
    },
  },
};
```

The exact CEL syntax may need adjustment in Instant’s sandbox, but the important idea is:

```text
view row only if ruleParams.routeId matches row.routeId
create row only if client proves knowledge of same routeId
never update
never delete from public client
```

Instant specifically documents `ruleParams` for “only people who know my document’s id can access it,” including passing values to queries/transactions and checking `data.id == ruleParams.knownDocId`. ([InstantDB][1]) It also documents `request.modifiedFields`, which is useful for preventing clients from setting unexpected fields. ([InstantDB][1])

The desktop query should always pass the route capability:

```ts
const query = {
  submissions: {
    $: {
      where: {
        routeId,
      },
    },
  },
};

const { data, error, isLoading } = db.useQuery(query, {
  ruleParams: { routeId },
});
```

The phone write should also pass it:

```ts
await db.transact(
  db.tx.submissions[id]
    .ruleParams({ routeId })
    .update({
      routeId,
      certHash,
      nonce,
      createdAt,
      expiresAt,
      ciphertext,
      phoneEphemeralPublicKeyJwk,
      size,
    })
);
```

# End-to-end flow

## Session minting

```text
creator.html
1. User unlocks creator signing key.
2. Browser generates:
   - sessionId = random 32 bytes
   - routeId = random 32 bytes
   - desktop ECDH keypair
3. Browser builds QrCert.
4. Browser signs canonical QrCert.
5. Browser computes certHash.
6. Browser renders QR containing SignedQrCert.
7. Browser subscribes to Instant submissions where routeId matches.
```

No session metadata needs to be stored before the phone submits.

## Phone submit

```text
submit.html
1. Parse QR cert.
2. Verify signature against baked-in trusted public key.
3. Check expiry.
4. Check expected backend/app/namespace.
5. Generate phone ECDH keypair.
6. Derive shared secret with desktopPublicKey.
7. Derive AES-GCM key.
8. Encrypt form payload.
9. Write SubmissionRow to Instant using ruleParams.routeId.
10. Show confirmation.
```

## Desktop receive

```text
creator.html
1. Instant subscription receives rows for routeId.
2. For each row:
   - ignore if certHash mismatch
   - ignore if nonce already seen
   - derive AES key using desktop private key + phone public key
   - decrypt ciphertext
   - validate decrypted sessionId, routeId, certHash, formId
   - display payload
   - mark nonce as seen locally
```

# Replay handling

Because Instant is untrusted, assume it may replay old rows.

Desktop should keep:

```ts
const seenNonces = new Set<string>();
```

Reject:

```text
same nonce twice
createdAt outside session window
certHash mismatch
decrypted sessionId mismatch
decrypted routeId mismatch
payload too large
malformed ciphertext
```

For a kiosk or long-running page, persist seen nonces in `sessionStorage` or `IndexedDB`.

# Cleanup

Because public anonymous writes can create junk, add lifecycle cleanup.

Static-only options:

```text
Desktop ignores expired rows.
A manual admin page deletes old rows after creator login.
Short expiry reduces useful spam.
Instant rules reject creates where expiresAt is already past.
```

Better operational option:

```text
Scheduled cleanup via Instant admin API / GitHub Action / tiny cron worker.
```

But that introduces an admin token somewhere outside the browser. Do not put admin tokens in GitHub Pages.

# MVP build order

## Milestone 1 — Local crypto only

Build without Instant first.

```text
creator.html generates signed QR cert
submit.html verifies QR cert
phone encrypts payload
desktop can decrypt copied JSON manually
```

Acceptance test:

```text
Tamper with routeId → phone rejects cert
Tamper with desktop public key → phone rejects cert
Expired QR → phone rejects cert
Wrong public creator key → phone rejects cert
```

## Milestone 2 — Instant mailbox

Add Instant.

```text
phone writes encrypted SubmissionRow
desktop subscribes by routeId
desktop decrypts and displays
```

Acceptance test:

```text
Global query returns no rows
Wrong ruleParams.routeId returns no rows
Correct routeId returns only that mailbox’s rows
Junk row does not break UI
```

## Milestone 3 — Creator key UX

Add one of:

```text
import creator-key.json
or encrypted embedded key unlocked by passphrase
```

Acceptance test:

```text
wrong passphrase cannot mint QR
right passphrase can mint QR
private key never appears in localStorage
```

## Milestone 4 — Hardening

Add:

```text
short QR expiration
nonce replay rejection
payload size limits
form schema validation
certHash binding
routeId 256-bit randomness
QR density test on real phones
Instant permission sandbox tests
```

## Milestone 5 — Production polish

Add:

```text
key rotation
trusted key list
session status UI
copy fallback for QR failures
offline/error states
old-row cleanup process
security review
```

# Recommended folder structure

```text
src/
  app/
    creator.tsx
    submit.tsx
    admin-key.tsx

  crypto/
    canonical.ts
    random.ts
    signing.ts
    encryption.ts
    cert.ts
    encoding.ts

  instant/
    db.ts
    schema.ts
    permissions.ts
    mailbox.ts

  protocol/
    types.ts
    validate.ts
    constants.ts

  ui/
    QrDisplay.tsx
    ScannerHelp.tsx
    SubmissionForm.tsx
    InboxView.tsx
```

# Core protocol functions

```ts
// crypto/cert.ts
export async function createSignedQrCert(args): Promise<SignedQrCert>;

export async function verifySignedQrCert(
  signed: SignedQrCert,
  trustedKeys: Record<string, CryptoKey>
): Promise<QrCert>;

// crypto/encryption.ts
export async function generateDesktopKeypair(): Promise<CryptoKeyPair>;

export async function encryptForDesktop(
  cert: QrCert,
  plaintext: SubmissionPlaintext
): Promise<{
  phoneEphemeralPublicKeyJwk: JsonWebKey;
  ciphertext: string;
}>;

export async function decryptFromPhone(
  desktopPrivateKey: CryptoKey,
  row: SubmissionRow
): Promise<SubmissionPlaintext>;
```

# Important product/security decisions

I would choose these defaults:

```text
QR expires in 10 minutes.
routeId = 32 random bytes, base64url.
sessionId = 32 random bytes, base64url.
Desktop private encryption key is memory-only.
Creator signing key is imported from local encrypted file.
Instant permissions block global enumeration.
Phone does not need Instant auth.
Payloads are encrypted before writing.
Desktop validates everything after decrypting.
```

# What this design guarantees

It gives you:

```text
Only holders of creator signing key can mint valid QR certificates.
Phone can verify QR before submitting.
Instant cannot alter route/encryption details without invalidating signature.
Instant cannot read payload contents.
Random public clients cannot list mailboxes without routeId, assuming Instant permissions work.
Desktop can reject forged, replayed, malformed, or wrong-session messages.
```

It does not give you:

```text
Instant cannot see that rows exist.
Instant cannot see routeId, ciphertext size, timing, and write frequency.
Instant cannot be forced to deliver messages.
Anonymous write spam is impossible.
The literal browser tab is cryptographically identifiable.
```

The identity is the **creator signing key**, not “the page.” That is the right primitive for this system.

[1]: https://www.instantdb.com/docs/permissions "Permissions"
[2]: https://developer.mozilla.org/en-US/docs/Web/API/Web_Crypto_API "Web Crypto API - Web APIs | MDN"
[3]: https://developer.mozilla.org/en-US/docs/Web/API/SubtleCrypto/generateKey "SubtleCrypto: generateKey() method - Web APIs | MDN"
[4]: https://developer.mozilla.org/en-US/docs/Web/API/SubtleCrypto/sign "SubtleCrypto: sign() method - Web APIs | MDN"
[5]: https://www.instantdb.com/docs/patterns "Patterns"


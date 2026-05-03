# T4.D attempt 01 — Kiosk pseudo-CDDL and fixture material

## Appendix C additions: Kiosk wrapper pseudo-CDDL and JSON shape guidance

This appendix subsection gives profile constraints and diagnostic pseudo-CDDL for the cross-device kiosk wrapper defined in §9. It is intended to make the kiosk JWS, encrypted request envelope, response-submission plaintext, encrypted submission metadata, and provider row boundaries reviewable for implementers, fixture authors, and conformance-tool authors.

The snippets below are profile pseudo-CDDL and JSON-shape guidance. They are not complete JOSE, JWK, JSON Schema, InstantDB, ISO/IEC 18013-5, COSE, CBOR, or HPKE definitions. RFC 7515 owns compact JWS processing. JWK processing is constrained here only enough to identify P-256 public keys used by this profile. Provider-row examples abstract the active InstantDB/Instant Storage implementation rather than defining a universal database schema. If this appendix conflicts with §9, §9 controls.

The kiosk wrapper crypto is distinct from §8 same-device HPKE. In particular:

* the request-envelope suite encrypts the compact kiosk request JWS with `info = utf8("smart-health-checkin-kiosk-request-v1")`;
* the response-submission suite encrypts `SubmissionPlaintext` with `info = utf8("smart-health-checkin-kiosk-response-v1")`; and
* §8 HPKE remains the phone-local `org-iso-mdoc` response encryption using the §8 `SessionTranscript` as HPKE `info`.

Active implementation evidence for these shapes appears in `rp-web/src/kiosk/protocol.ts`, `rp-web/src/kiosk/kiosk-provider.ts`, `rp-web/src/kiosk/instant-mailbox.ts`, `rp-web/src/instant/schema.ts`, `rp-web/instant.perms.ts`, `rp-web/src/kiosk/creator-main.tsx`, and `rp-web/src/kiosk/submit-main.tsx`.

### C.x.1 Notation and constants

`b64u` means base64url without padding. `json-text` means a UTF-8 JSON text serialization. `deterministic-json(x)` means the kiosk-wrapper deterministic JSON rule from §§9.3 and 9.8.2: recursively sort object member names lexicographically, omit `undefined` members, preserve array order, JSON-stringify, and UTF-8 encode the result. This rule applies only to the named kiosk wrapper inputs and does not define canonical JSON for SMART requests or SMART responses outside those wrappers.

```text
kiosk-request-jws-typ       = "smart-health-checkin+kiosk-request+jws"
kiosk-request-content-type  = "application/smart-health-checkin-kiosk-request+jws+aesgcm"
kiosk-aead-alg-label        = "ECDH-P256+HKDF-SHA256+AES-GCM"
kiosk-content-enc           = "A256GCM"
kiosk-response-payload-kind = "smart-health-checkin-response"
kiosk-request-info          = "smart-health-checkin-kiosk-request-v1"
kiosk-response-info         = "smart-health-checkin-kiosk-response-v1"
kiosk-blob-content-type     = "application/octet-stream"
```

Timestamps in the active kiosk profile are JSON numbers containing milliseconds since the Unix epoch. The active prototype uses a ten-minute request lifetime and a 25 MiB plaintext limit, with an encrypted-blob ceiling of plaintext limit plus 1024 bytes (`rp-web/src/kiosk/protocol.ts`). Those numeric defaults are useful for implementation alignment but are not universal clinical data-model maxima unless adopted by a conformance profile or deployment policy.

### C.x.2 Compact kiosk request JWS

The compact kiosk request JWS is a three-segment compact JWS. Its protected header and payload are base64url encodings of deterministic JSON bytes. The signing input is exactly:

```text
b64u(utf8(deterministic-json(kiosk-jws-protected-header))) || "." ||
b64u(utf8(deterministic-json(KioskRequestPayload)))
```

For this profile, the protected header is constrained to:

```cddl
; JSON shape guidance, not full JOSE CDDL.
kiosk-jws-protected-header = {
  "alg" => "ES256",
  "kid" => non-empty-string,
  "typ" => "smart-health-checkin+kiosk-request+jws",
  * tstr => any
}
```

A Kiosk creator SHALL sign using ES256 and SHALL place the signed `KioskRequestPayload` as the JWS payload. A Phone presenter SHALL verify the compact JWS before using any payload member. The JWS payload is the kiosk wrapper request; it is not a §8 `DeviceRequest`, not §8 `encryptionInfo`, not a SMART response, and not the response-submission plaintext.

### C.x.3 `KioskRequestPayload`

`KioskRequestPayload` binds one wrapper `requestId`, provider routing metadata, request-envelope metadata, response-submission public-key metadata, processing constraints, and one embedded SMART request. The SMART request is embedded directly as `smartRequest`; the wrapper does not carry presets, IPS shortcuts, request-profile wrappers, profile labels, or “all of the above” shortcuts.

```cddl
; Pseudo-CDDL / JSON shape guidance.
kiosk-request-payload = {
  "v" => 1,
  "iss" => non-empty-string,
  "aud" => non-empty-string,
  "requestId" => wrapper-request-id,
  "createdAt" => epoch-ms-number,
  "expiresAt" => epoch-ms-number,
  "submitTo" => kiosk-submit-to,
  "smartRequest" => SmartHealthCheckinRequest,
  "encryptRequestTo" => kiosk-request-recipient,
  "encryptResponseTo" => kiosk-response-recipient,
  "constraints" => kiosk-constraints,
  "minter" => kiosk-minter,
  * tstr => any
}

kiosk-submit-to = {
  "backend" => "instantdb",          ; active provider profile value
  "appId" => non-empty-string,
  * tstr => any
}

kiosk-request-recipient = {
  "alg" => "ECDH-P256+HKDF-SHA256+AES-GCM",
  "keyId" => non-empty-string,
  * tstr => any
}

kiosk-response-recipient = {
  "alg" => "ECDH-P256+HKDF-SHA256+AES-GCM",
  "desktopPublicKeyJwk" => p256-ecdh-public-jwk,
  * tstr => any
}

kiosk-constraints = {
  "maxPlaintextBytes" => uint,
  * tstr => any
}

kiosk-minter = {
  "keyId" => non-empty-string,
  * tstr => any
}
```

`KioskRequestPayload.requestId` is the kiosk wrapper id. It binds the pointer, request row, encrypted request envelope, signed payload, response-submission AAD, provider submission row, and decrypted `SubmissionPlaintext`. `KioskRequestPayload.smartRequest.id` is the clinical SMART request id that the SMART response later echoes under §6. Implementations SHALL NOT substitute either identifier for the other.

For the active profile, `encryptResponseTo.desktopPublicKeyJwk` is a P-256 ECDH public JWK selected by the Kiosk creator for the later phone-to-desktop submission leg. It SHALL be read from the verified signed kiosk payload, not from an unauthenticated pointer, provider row, or page cache. A minimal public-key shape is:

```cddl
p256-ecdh-public-jwk = {
  "kty" => "EC",
  "crv" => "P-256",
  "x" => b64u-string,
  "y" => b64u-string,
  ? "ext" => bool,
  ? "key_ops" => [* tstr],
  * tstr => any
}
```

The profile does not make checked-in demo JWKs production trust anchors. `rp-web/src/kiosk/demo-keys.ts` explicitly labels demo keys as intentionally checked-in demonstration material, not secrets and not production keys.

### C.x.4 `EncryptedKioskRequest`

`EncryptedKioskRequest` is the request-publication envelope stored or served by the provider. Its plaintext is the compact kiosk request JWS encoded as UTF-8 text. It is not the signed payload by itself, not the raw `smartRequest`, and not a response-submission object.

```cddl
; Pseudo-CDDL / JSON shape guidance.
encrypted-kiosk-request = {
  "v" => 1,
  "alg" => "ECDH-P256+HKDF-SHA256+AES-GCM",
  "enc" => "A256GCM",
  "contentType" => "application/smart-health-checkin-kiosk-request+jws+aesgcm",
  "requestId" => wrapper-request-id,
  "createdAt" => epoch-ms-number,
  "expiresAt" => epoch-ms-number,
  "creatorKeyId" => non-empty-string,
  "recipientKeyId" => non-empty-string,
  "iv" => b64u-96-bit-iv,
  "ciphertext" => b64u-aes-gcm-ciphertext-and-tag,
  "ephemeralPublicKeyJwk" => p256-ecdh-public-jwk,
  * tstr => any
}
```

The request-envelope construction is:

```text
ECDH P-256 shared secret = ECDH(sender ephemeral private key, request-opening public key)
HKDF-SHA-256 salt        = utf8(requestId)
HKDF-SHA-256 info        = utf8("smart-health-checkin-kiosk-request-v1")
AES-GCM key length       = 256 bits
AES-GCM IV               = b64u-decode(iv), 96 bits
AES-GCM AAD              = utf8(requestId)
plaintext                = compact kiosk request JWS UTF-8 bytes
```

The `requestId`, `createdAt`, `expiresAt`, `creatorKeyId`, and `recipientKeyId` fields mirror signed or protected-header values so that providers and Phone presenters can perform early routing and diagnostics. The Phone presenter still verifies the JWS and enforces the request-id, timestamp, key-id, audience, provider, and SMART request bindings defined in §9.7.

### C.x.5 `SubmissionPlaintext`

`SubmissionPlaintext` is the UTF-8 JSON plaintext encrypted by the Phone presenter for the Completion display after phone-local §8 processing. For the active successful SMART-response payload:

```cddl
; Pseudo-CDDL / JSON shape guidance.
submission-plaintext = {
  "requestId" => wrapper-request-id,
  "submittedAt" => epoch-ms-number,
  "payload" => smart-response-submission-payload,
  * tstr => any
}

smart-response-submission-payload = {
  "kind" => "smart-health-checkin-response",
  "smartResponse" => SmartHealthCheckinResponse,
  * tstr => any
}
```

The Phone presenter SHALL set top-level `SubmissionPlaintext.requestId` to the wrapper `KioskRequestPayload.requestId`. It SHALL NOT set this member to `smartRequest.id`, `SmartHealthCheckinResponse.requestId`, a provider row id, or a §8 presentation-session id. The inner `payload.smartResponse.requestId` remains the clinical SMART response binding to `KioskRequestPayload.smartRequest.id`.

For byte counting and encryption input, the active profile serializes `SubmissionPlaintext` as deterministic JSON bytes. A Phone presenter SHALL enforce the signed `constraints.maxPlaintextBytes` over the exact bytes it will encrypt.

The active successful `SubmissionPlaintext.payload` does not include plaintext §8 `DeviceResponse` CBOR, Digital Credentials API `dcapiResponse`, §8 HPKE `enc` or `cipherText`, §8 `deviceRequest`, §8 `encryptionInfo`, private keys, provider credentials, or unrelated diagnostics. The active phone UI builds the submission payload as `{ "kind": "smart-health-checkin-response", "smartResponse": <validated SMART response> }` in `rp-web/src/kiosk/submit-main.tsx`.

### C.x.6 Encrypted response submission metadata

The response-submission ciphertext bytes are stored as an opaque blob or equivalent encrypted byte string. The row metadata carries only routing and decryption metadata needed by the Completion display.

```cddl
; Pseudo-CDDL / JSON shape guidance for the active provider row.
kiosk-submission-row = {
  "submissionId" => non-empty-string,
  "requestId" => wrapper-request-id,
  "storagePath" => storage-path-string,
  "storageFileId" => non-empty-string,
  "iv" => b64u-96-bit-iv,
  "phoneEphemeralPublicKeyJwk" => p256-ecdh-public-jwk,
  * tstr => any
}

storage-path-string = tstr ; active convention: "submissions/<requestId>/<submissionId>.bin"
```

The response-submission construction is:

```text
ECDH P-256 shared secret = ECDH(phone ephemeral private key, desktop public key from signed payload)
HKDF-SHA-256 salt        = utf8(KioskRequestPayload.requestId)
HKDF-SHA-256 info        = utf8("smart-health-checkin-kiosk-response-v1")
AES-GCM key length       = 256 bits
AES-GCM IV               = b64u-decode(row.iv), 96 bits
AES-GCM AAD              = utf8(KioskRequestPayload.requestId)
plaintext                = SubmissionPlaintext deterministic JSON UTF-8 bytes
ciphertext blob          = AES-GCM ciphertext including authentication tag
```

The active provider stores ciphertext bytes with content type `application/octet-stream` and row metadata with `submissionId`, `requestId`, `storagePath`, `storageFileId`, `iv`, and `phoneEphemeralPublicKeyJwk` (`rp-web/src/kiosk/instant-mailbox.ts`, `rp-web/src/instant/schema.ts`). Provider permissions restrict request reads to the exact pointer and submission-file reads to the exact request/storage path (`rp-web/instant.perms.ts`), but those controls are defense in depth and do not replace encryption or Completion-display validation.

### C.x.7 Provider row abstractions

The active request-row abstraction is:

```cddl
kiosk-request-row = {
  "requestId" => wrapper-request-id,
  "encryptedRequest" => encrypted-kiosk-request,
  * tstr => any
}
```

The active submission-row abstraction is `kiosk-submission-row` from C.x.6 plus an out-of-row ciphertext blob addressed by `storagePath`/`storageFileId`. Other providers can use different row ids, queues, callback mechanisms, blob stores, or inline ciphertext fields if they provide equivalent protocol-visible behavior: write encrypted request, read encrypted request by wrapper id, write encrypted submission bytes plus metadata, download exact ciphertext bytes, and observe candidate submission rows for one wrapper id.

A Submission service SHALL NOT require plaintext `KioskRequestPayload`, plaintext `smartRequest`, plaintext `SubmissionPlaintext`, plaintext `payload.smartResponse`, raw FHIR content, SMART Health Cards, §8 plaintext, request-opening private key material, desktop private keys, Wallet secrets, or shared secrets to route kiosk request or submission state.

### C.x.8 Scalar helper shapes

```cddl
non-empty-string = tstr .size (1..)
wrapper-request-id = non-empty-string
epoch-ms-number = int / float64 ; JSON number; finite milliseconds since Unix epoch
uint = 0..18446744073709551615
b64u-string = tstr
b64u-96-bit-iv = b64u-string ; decodes to exactly 12 bytes for this profile
b64u-aes-gcm-ciphertext-and-tag = b64u-string
```

A final JSON Schema appendix or conformance-vector profile can replace these helper shapes with exact regular expressions, integer ranges, duplicate-member handling, and JWK import rules. This appendix intentionally does not claim to be that complete schema.

## Appendix D additions: Kiosk fixture index and vector plan

This appendix subsection indexes kiosk-related checked-in material and recommends future kiosk vectors. A fixture path is listed only when repository evidence confirms it exists. Labels are conservative: checked-in code, demos, and live captures are not normative conformance vectors merely because they exist.

### D.x.1 Classification scheme for kiosk material

Use the Appendix D classification scheme from the same-device fixture material, with these kiosk-specific refinements:

| Class | Kiosk-specific use |
| --- | --- |
| **Normative example** | A fully specified example whose field names and expected processing outcome are intentionally part of the specification text. It still is not a byte-level oracle unless the example says so. |
| **Conformance candidate** | Stable-looking material that can become a pass/fail vector after deterministic keys, timestamps, ids, byte inputs, expected errors, and trust assumptions are frozen. |
| **Diagnostic / implementation regression** | Material useful for implementation tests or debugging active code paths, without universal conformance status. |
| **Historical capture** | Real platform or earlier prototype behavior retained as evidence; it should not define current kiosk conformance after §9 changes. |
| **Future vector placeholder** | A vector class needed for the final suite, but not presently backed by checked-in deterministic files. |

Each final kiosk vector entry should state whether validation is byte-exact, structure-exact, semantic, or diagnostic-only; whether it contains PHI; whether private keys are intentionally public test material; whether timestamps and random values are deterministic; and whether failures are expected before request lookup, before Wallet invocation, before provider write, before decryption, or after SMART response validation.

### D.x.2 Checked-in kiosk-related implementation material

The repository contains active kiosk implementation and regression-test material, but no checked-in deterministic kiosk byte-vector root comparable to `fixtures/dcapi-requests/...` or `fixtures/responses/...`.

| Path | Evidence-supported classification | Notes |
| --- | --- | --- |
| `rp-web/src/kiosk/protocol.ts` | Implementation regression evidence; source for future vectors | Defines active constants, TypeScript shapes, deterministic JSON helper, compact JWS creation/verification, request-envelope encryption/decryption, submission encryption/decryption, pointer `#r=`, base64url helpers, and limits. It is source code, not a published fixture. |
| `rp-web/src/kiosk/kiosk-provider.ts` | Implementation regression evidence | Defines provider abstraction types and workflow helpers: `KioskRequestRow`, `KioskSubmissionRow`, `writeRequest`, `readRequest`, `writeSubmission`, `downloadSubmissionBlob`, and `useSubmissionRows`. |
| `rp-web/src/kiosk/instant-mailbox.ts` | Diagnostic / implementation regression | Active InstantDB/Instant Storage adapter. Confirms request row, submission row, storage path `submissions/<requestId>/<submissionId>.bin`, blob upload content type, and size checks. |
| `rp-web/src/instant/schema.ts` | Diagnostic / implementation regression | Active InstantDB entity schema for `requests` and `submissions`. It is not a normative database schema. |
| `rp-web/instant.perms.ts` and `rp-web/instant.perms.test.ts` | Diagnostic / implementation regression | Confirms defensive provider permissions for exact request pointer and exact storage path. These controls do not replace encryption. |
| `rp-web/src/kiosk/kiosk-provider.test.ts` | Implementation regression; conformance-candidate scenario source | Exercises opaque request storage, pointer URL without clinical plaintext, encrypted submission open, direct `smartRequest`, and absence of `dcapiResponse`/`deviceResponse` from submission payload. It uses live randomness and demo keys, so it is not a deterministic byte vector. |
| `rp-web/src/kiosk/demo-keys.ts` | Diagnostic test material only | Contains intentionally checked-in demo P-256 key material and warns not to use it for production traffic. Future vectors can reuse or replace this test material only when labeled test-only. |
| `rp-web/src/kiosk/creator-main.tsx` and `rp-web/src/kiosk/submit-main.tsx` | Diagnostic implementation evidence | Show active demo UI behavior: creator selects a SMART request, displays a pointer QR, writes request state, observes rows, and phone submission writes `{kind, smartResponse}` after DC API validation. Debug panels may display demo-only details; this is not production guidance. |
| `docs/plans/kioskmode-transport.md`, `docs/plans/kioskmode-transport.addendum.md`, `docs/plans/kiosk-transport-row-slim.md` | Historical / design notes | Planning documents can explain design evolution, but Appendix D should not treat them as normative examples or current fixtures without reconciliation against §9 and active code. |
| `site/kiosk-flow-explainer.html` and `_site/kiosk-flow-explainer.html` | Illustrative / historical generated explainer | Useful for background only; not a fixture root and not current normative schema material. |

No `fixtures/...` directory containing kiosk JWS signing inputs, encrypted kiosk request envelopes, pointer URLs, response-submission ciphertext blobs, or provider rows was found in the checked-in fixture listing. Therefore Appendix D should state that deterministic kiosk byte vectors are future work until generated and reviewed.

### D.x.3 Existing same-device captures and whether to cite them for kiosk

The existing Chrome/Android roots are same-device material:

* `fixtures/dcapi-requests/real-chrome-android-smart-checkin/`
* `fixtures/responses/real-chrome-android-smart-checkin/`

They demonstrate the §8 direct `org-iso-mdoc` request and response path that the phone re-enters after kiosk pointer resolution. They do not contain the kiosk wrapper artifacts: compact kiosk request JWS, `EncryptedKioskRequest`, pointer-only URL, provider request row, `SubmissionPlaintext`, response-submission ciphertext blob, or submission row metadata.

For T4.D, these roots should remain same-device diagnostic/historical captures and may be cross-referenced only as evidence for the §8 leg reused by kiosk. They should not be promoted to kiosk conformance examples. A refreshed end-to-end kiosk capture is needed before Appendix D can claim a current real-platform kiosk fixture.

### D.x.4 Recommended future kiosk fixture vectors

The final kiosk fixture suite should include deterministic vectors for at least these classes:

1. **Deterministic compact JWS signing input.** Fixed test-only ES256 key, fixed `kid`, fixed `requestId`, fixed timestamps, fixed `submitTo.appId`, fixed request-opening `keyId`, fixed `encryptResponseTo.desktopPublicKeyJwk`, fixed `constraints.maxPlaintextBytes`, and fixed direct `smartRequest`. Expected outputs should include protected header JSON, payload JSON, deterministic JSON bytes or hashes, encoded header/payload segments, signing input, signature policy, compact JWS, and JWS verification result. If ECDSA remains nondeterministic in the generating library, the vector should compare signing input and semantic verification rather than a fixed signature.
2. **Encrypted request envelope.** Fixed test-only request-opening key pair, fixed sender ephemeral key, fixed IV, fixed compact JWS plaintext, fixed `requestId` salt/AAD, `info = "smart-health-checkin-kiosk-request-v1"`, expected `EncryptedKioskRequest`, and expected opened compact JWS.
3. **Pointer URL.** Fixed base URL and wrapper `requestId`; expected URL uses fragment-only `#r=<requestId>` and contains no inline JWS, encrypted request, SMART request, §8 `deviceRequest`, or §8 `encryptionInfo`.
4. **Phone resolution and re-entry preconditions.** Provider request row, encrypted envelope, verified payload, and expected validation result showing pointer/row/envelope/payload `requestId` equality; direct `smartRequest` validation; distinction between wrapper `requestId` and `smartRequest.id`; and construction boundary for a fresh §8 request.
5. **Response submission encryption/decryption.** Fixed test-only desktop key pair, phone ephemeral key, IV, `SubmissionPlaintext`, wrapper `requestId` salt/AAD, `info = "smart-health-checkin-kiosk-response-v1"`, expected ciphertext blob, submission row metadata, and expected decrypted plaintext.
6. **Wrong requestId / AAD failures.** Mutations where provider row `requestId`, envelope `requestId`, signed payload `requestId`, submission row `requestId`, decrypted `SubmissionPlaintext.requestId`, AES-GCM AAD, or `smartResponse.requestId` is wrong. Expected results should identify whether failure occurs before Wallet invocation, during AES-GCM authentication, after plaintext binding, or during §6.6 SMART response validation.
7. **Expired request.** Fixed `createdAt`/`expiresAt` and validation time showing rejection before Wallet invocation; include future-created and inverted `createdAt`/`expiresAt` cases if §9.7 freshness policy freezes them.
8. **Oversized plaintext and oversized blob.** `SubmissionPlaintext` over signed `constraints.maxPlaintextBytes` and encrypted blob over implementation/provider limit; expected no successful submission row for plaintext overflow and rejection before processing for blob overflow.
9. **Malformed row, JWK, IV, and base64url fields.** Missing `encryptedRequest`, malformed provider rows, invalid `iv`, wrong IV length, missing or unusable P-256 JWK coordinates, wrong curve, wrong `alg`/`enc`/`contentType`, malformed compact JWS, and invalid base64url.
10. **Duplicate rows and replay.** Two rows for one wrapper id, replay of identical row/blob, later `submittedAt`, and first-success workflow behavior. Expected result should not merge SMART responses from multiple submissions.
11. **No plaintext leakage.** Assert pointer URL, provider request row, encrypted envelope, submission row, and ciphertext blob do not contain recognizable clinical strings from the `smartRequest` or `smartResponse`; permit plaintext only inside decrypted JWS payload, local `SubmissionPlaintext`, and explicitly marked diagnostic outputs.
12. **Provider abstraction equivalence.** Structure-exact vectors for request row and submission row abstractions, including the active InstantDB storage path convention, while making clear that InstantDB-specific row ids and app ids are provider-profile material.

### D.x.5 Prerequisites for a refreshed end-to-end kiosk capture

A refreshed kiosk capture should be produced only after §8, §9, §16.6, Appendix C, and Appendix D expectations are stable enough that the capture will not become stale immediately. The stable prerequisites are:

* final active SMART request and SMART response JSON examples for the kiosk byte ladder;
* final wrapper `requestId`, timestamp, and size-limit policy for fixtures;
* chosen test-only creator signing key, request-opening key, desktop response key, and any deterministic ephemeral keys/IVs for byte-exact vectors;
* final decision on whether ECDSA signatures are byte-exact or verification-only;
* final provider row abstraction and any InstantDB-specific row metadata to preserve;
* final same-device §8 capture expectations for the phone-local request and Wallet response; and
* final privacy decision on which debug outputs may include decrypted JWS payloads, plaintext submissions, demo private keys, or clinical example strings.

The desired refreshed outputs are:

* compact kiosk request JWS, protected header, payload, deterministic signing input, and verification metadata;
* `EncryptedKioskRequest`, request-opening ephemeral public key, IV, ciphertext, and opened JWS oracle;
* Pointer URL and QR payload text;
* provider request row;
* phone-resolution validation transcript showing pointer/row/envelope/payload bindings and validated `smartRequest`;
* phone-local §8 request and response artifacts, either by reference to refreshed same-device fixtures or by inclusion in a cross-device capture root;
* `SubmissionPlaintext`, deterministic JSON bytes or hash, response-submission IV, phone ephemeral public JWK, ciphertext blob, storage content type, and submission row;
* completion-side decrypted plaintext and SMART response validation result; and
* negative-vector mutations for wrong ids, expired request, malformed rows/JWK/IV, oversized data, duplicate rows, and plaintext-leakage checks.

Until such a capture exists, Appendix D should cite kiosk implementation tests and source files as diagnostic evidence only, not as normative kiosk vectors.

## Organizer notes

### Strengths

* The draft keeps Appendix C aligned with accepted §9 facts: direct `smartRequest`, compact ES256 JWS, encrypted request envelope content type, pointer-only `#r=`, phone re-entry into fresh §8, response-submission `SubmissionPlaintext`, response encryption info string, wrapper `requestId` AAD/salt, and opaque provider storage.
* It mirrors T3.D's conservative style: pseudo-CDDL only, no fabricated full JOSE/JWK/InstantDB schema, and no byte-level vectors invented without repository evidence.
* It distinguishes request-envelope crypto, response-submission crypto, and §8 HPKE in one place.

### Caveats

* The active code has nondeterministic request ids, timestamps, ECDSA signatures, ECDH ephemeral keys, and IVs; existing tests are workflow regressions, not deterministic vectors.
* `docs/profiles/org-iso-mdoc.md` still contains an older request example without the final typed request shape in one section, so it should not be used as the source for kiosk examples.
* Demo UI debug panels can display signed payloads and demo private keys for development; Appendix D should label any capture from those panels as diagnostic and scrubbed/test-only before publication.

### Open issues

* Decide whether final kiosk JWS vectors require deterministic ECDSA signatures or compare only deterministic signing input plus signature verification.
* Decide exact JSON Schema treatment for kiosk wrapper fields, especially timestamp numeric ranges, base64url regexes, duplicate JSON member handling, and JWK `key_ops`/`ext` requirements.
* Decide whether `submitTo.backend = "instantdb"` remains merely the active provider example or becomes one named provider profile in Appendix D/§15.
* Decide whether the active 25 MiB plaintext limit and blob limit become conformance-profile limits or remain prototype defaults.
* Generate refreshed kiosk fixture roots before claiming normative examples beyond the illustrative shapes in §9 and Appendix C.

### Downstream dependencies

* T5 security/privacy should consume the no-plaintext-leakage, metadata-minimization, replay, duplicate-row, and untrusted-provider notes.
* T6.B §16.6 should define the worked cross-device kiosk byte ladder before final Appendix D vector promotion.
* T6.C should align generated kiosk vectors, same-device captures, and the final fixture index; this is the right checkpoint to decide whether a new Android real-platform kiosk capture replaces historical same-device-only captures.

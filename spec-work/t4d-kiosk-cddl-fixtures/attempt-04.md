# T4.D attempt 04: kiosk pseudo-CDDL, schema guidance, and fixture material

## Appendix C additions: kiosk JWS, encrypted envelopes, submission rows, and provider abstractions

These additions extend Appendix C after the same-device material. They describe the profile-constrained JSON shapes used by the cross-device kiosk wrapper in §9. They are **pseudo-CDDL / JSON shape guidance**, not a complete JOSE, JWK, JSON Schema, InstantDB schema, ISO/IEC 18013-5, or provider-database definition. If this appendix conflicts with §9, §9 controls.

The kiosk wrapper uses three separate cryptographic contexts that MUST remain distinct:

1. the **request-envelope** context for encrypting the compact kiosk request JWS into `EncryptedKioskRequest`, with HKDF `info = "smart-health-checkin-kiosk-request-v1"`;
2. the **response-submission** context for encrypting `SubmissionPlaintext` to the desktop key, with HKDF `info = "smart-health-checkin-kiosk-response-v1"`; and
3. the §8 same-device `org-iso-mdoc` HPKE context, which uses the §8 `SessionTranscript` as HPKE `info` and is not carried in the kiosk Pointer URL, provider request row, kiosk request JWS, or `EncryptedKioskRequest`.

The active TypeScript implementation evidence for these shapes is in `rp-web/src/kiosk/protocol.ts`, `rp-web/src/kiosk/kiosk-provider.ts`, `rp-web/src/kiosk/instant-mailbox.ts`, `rp-web/src/instant/schema.ts`, and `rp-web/instant.perms.ts`. The old `rp-web/src/sdk/kiosk-session.ts` fragment format that includes `deviceRequest` and `encryptionInfo` is legacy/stale evidence and is not the active kiosk profile.

### C.K.1 JSON and string notation for kiosk artifacts

```cddl
; Pseudo-CDDL conventions for kiosk JSON artifacts.
json-object = { * tstr => any }
json-array  = [ * any ]
b64u        = tstr ; base64url without padding
ms-epoch    = number ; milliseconds since Unix epoch as a JSON number
p256-jwk    = json-object ; JSON Web Key for an EC P-256 public key
smart-request-json  = json-object ; SmartHealthCheckinRequest from §5
smart-response-json = json-object ; SmartHealthCheckinResponse from §6
```

`b64u` fields in this appendix are JSON strings using base64url without `=` padding. `iv` fields for the active AES-GCM profiles contain a 96-bit IV. `ciphertext` values contain the AEAD ciphertext concatenated with the authentication tag for the corresponding plaintext.

`p256-jwk` is intentionally a placeholder. Implementations SHALL import and validate the JWK according to the JOSE/WebCrypto/COSE environment they use, including `kty = "EC"`, `crv = "P-256"`, usable `x` and `y` coordinates, and key-use constraints appropriate for ECDSA verification or ECDH key agreement. This appendix does not define complete JWK validation or trust-chain processing.

### C.K.2 Compact kiosk request JWS

The signed kiosk request is a compact JWS with exactly three non-empty base64url segments:

```text
BASE64URL(UTF8(deterministic-json(kiosk-request-jws-header))) "."
BASE64URL(UTF8(deterministic-json(kiosk-request-payload))) "."
BASE64URL(ES256-signature)
```

For this profile, deterministic JSON for the JWS protected header and payload recursively sorts object member names lexicographically, omits members whose value is `undefined`, preserves array order, and serializes with ordinary JSON stringification before UTF-8 encoding. This deterministic JSON rule applies to the kiosk-wrapper JWS input and response-submission plaintext bytes for this profile; it does not define canonical JSON for SMART requests, SMART responses, JOSE generally, or FHIR content outside these wrapper bytes.

```cddl
kiosk-request-jws-header = {
  "alg" => "ES256",
  "kid" => tstr,
  "typ" => "smart-health-checkin+kiosk-request+jws",
  * tstr => any
}
```

A processor SHALL reject a kiosk request JWS whose protected header does not use `alg = "ES256"`, whose `typ` is not `"smart-health-checkin+kiosk-request+jws"`, whose `kid` is absent or empty, whose `kid` does not resolve to a trusted creator key under deployment policy, or whose signature does not verify over the exact compact-JWS signing input. The `kid` and `minter.keyId` values are creator-key metadata; they are not requester identity, clinical-source provenance, Holder consent, or downstream authorization.

### C.K.3 `KioskRequestPayload`

```cddl
kiosk-request-payload = {
  "v" => 1,
  "iss" => tstr,
  "aud" => tstr,
  "requestId" => tstr,
  "createdAt" => ms-epoch,
  "expiresAt" => ms-epoch,
  "submitTo" => kiosk-submit-to,
  "smartRequest" => smart-request-json,
  "encryptRequestTo" => kiosk-encrypt-request-to,
  "encryptResponseTo" => kiosk-encrypt-response-to,
  "constraints" => kiosk-constraints,
  "minter" => kiosk-minter,
  * tstr => any
}

kiosk-submit-to = {
  "backend" => "instantdb",
  "appId" => tstr,
  * tstr => any
}

kiosk-encrypt-request-to = {
  "alg" => "ECDH-P256+HKDF-SHA256+AES-GCM",
  "keyId" => tstr,
  * tstr => any
}

kiosk-encrypt-response-to = {
  "alg" => "ECDH-P256+HKDF-SHA256+AES-GCM",
  "desktopPublicKeyJwk" => p256-jwk,
  * tstr => any
}

kiosk-constraints = {
  "maxPlaintextBytes" => uint,
  * tstr => any
}

kiosk-minter = {
  "keyId" => tstr,
  * tstr => any
}
```

A Kiosk creator SHALL embed the complete §5 SMART request directly as `smartRequest`. It SHALL NOT substitute a request-profile wrapper, preset id, IPS shortcut, “all of the above” selector, SDK helper object, inline §8 `deviceRequest`, inline §8 `encryptionInfo`, or another wrapper for the clinical request. A Phone presenter SHALL validate `smartRequest` under §5 before invoking the phone-local §8 flow.

`KioskRequestPayload.requestId` is the kiosk wrapper identifier. `KioskRequestPayload.smartRequest.id` is the clinical SMART request identifier. These identifiers are distinct. The response-submission wrapper binds to `KioskRequestPayload.requestId`, while the inner `SmartHealthCheckinResponse.requestId` binds to `KioskRequestPayload.smartRequest.id`.

The active implementation evidence sets `submitTo.backend = "instantdb"`, signs `submitTo.appId`, uses demo `iss` and `aud` constants, generates a 32-byte random base64url wrapper request id, sets a ten-minute TTL, includes `encryptResponseTo.desktopPublicKeyJwk`, and sets `constraints.maxPlaintextBytes` to 25 MiB (`rp-web/src/kiosk/protocol.ts`). These values are useful prototype evidence. Only values made normative in §9 or a future conformance profile become universal production values.

### C.K.4 `EncryptedKioskRequest`

```cddl
encrypted-kiosk-request = {
  "v" => 1,
  "alg" => "ECDH-P256+HKDF-SHA256+AES-GCM",
  "enc" => "A256GCM",
  "contentType" => "application/smart-health-checkin-kiosk-request+jws+aesgcm",
  "requestId" => tstr,
  "createdAt" => ms-epoch,
  "expiresAt" => ms-epoch,
  "creatorKeyId" => tstr,
  "recipientKeyId" => tstr,
  "iv" => b64u,
  "ciphertext" => b64u,
  "ephemeralPublicKeyJwk" => p256-jwk,
  * tstr => any
}
```

The plaintext of `encrypted-kiosk-request` is the compact kiosk request JWS encoded as UTF-8 text. It is not the unsigned `KioskRequestPayload` alone and not the raw `smartRequest` alone.

For the request-envelope suite:

```text
ECDH P-256 shared secret = ECDH(sender ephemeral private key, request-opening recipient public key)
HKDF-SHA-256 salt        = utf8(KioskRequestPayload.requestId)
HKDF-SHA-256 info        = utf8("smart-health-checkin-kiosk-request-v1")
AES-GCM key length       = 256 bits
AES-GCM IV               = base64url-decode(EncryptedKioskRequest.iv)
AES-GCM AAD              = utf8(KioskRequestPayload.requestId)
plaintext                = compact kiosk request JWS UTF-8 text
```

A producer SHALL set the envelope `requestId`, `createdAt`, and `expiresAt` to the corresponding signed payload values, `creatorKeyId` from the JWS protected-header `kid`, and `recipientKeyId` from `KioskRequestPayload.encryptRequestTo.keyId`. A consumer SHALL bind the pointer `r`, provider row `requestId` when exposed, envelope `requestId`, and verified payload `requestId` by exact string equality.

The `contentType` value identifies the encrypted kiosk-request envelope profile. It is not the content type for response-submission blobs, which are active-provider opaque `application/octet-stream` bytes.

### C.K.5 Pointer and request provider row abstraction

The active pointer URL carries only a fragment parameter `r`:

```text
https://clinic.example/verifier/submit.html#r=<url-encoded-kiosk-wrapper-requestId>
```

The Pointer URL SHALL NOT carry the compact JWS, `EncryptedKioskRequest`, plaintext `smartRequest`, §8 `DeviceRequest`, §8 `encryptionInfo`, §8 `SessionTranscript`, Wallet response bytes, response-submission ciphertext, or secrets.

The active request provider row is equivalent to:

```cddl
kiosk-request-row = {
  "requestId" => tstr,
  "encryptedRequest" => encrypted-kiosk-request,
  * tstr => any
}
```

Provider row identifiers, database ids, and access-control rule parameters are provider-local metadata. They do not replace the wrapper `requestId` binding checks performed by the Phone presenter. The active InstantDB schema stores request rows as `requestId` plus `encryptedRequest` (`rp-web/src/instant/schema.ts`) and read permissions require knowledge of the exact request id as defense in depth (`rp-web/instant.perms.ts`), but provider permissions are not the root of clinical confidentiality or trust.

### C.K.6 `SubmissionPlaintext`

```cddl
submission-plaintext = {
  "requestId" => tstr,
  "submittedAt" => ms-epoch,
  "payload" => submission-payload,
  * tstr => any
}

submission-payload = smart-response-submission-payload / json-object

smart-response-submission-payload = {
  "kind" => "smart-health-checkin-response",
  "smartResponse" => smart-response-json,
  * tstr => any
}
```

For the active successful payload, `payload.kind` SHALL be `"smart-health-checkin-response"`, and `payload.smartResponse` SHALL be a §6 `SmartHealthCheckinResponse`. The top-level `SubmissionPlaintext.requestId` is the kiosk wrapper id; the inner `payload.smartResponse.requestId` is the embedded SMART request id.

A Phone presenter SHALL enforce the signed `KioskRequestPayload.constraints.maxPlaintextBytes` over the exact UTF-8 JSON bytes it will encrypt. Active code uses deterministic key-sorted JSON for this byte count and encryption input. If the encoded plaintext exceeds the signed limit or a stricter local maximum, the Phone presenter SHALL fail safely and SHALL NOT write a successful encrypted-submission row.

`SubmissionPlaintext` SHALL NOT include plaintext §8 `DeviceResponse`, raw `dcapiResponse`, §8 HPKE fields, §8 `deviceRequest`, §8 `encryptionInfo`, request-opening private keys, desktop private keys, Wallet secrets, provider credentials, or unrelated diagnostics in the active successful payload.

### C.K.7 Response-submission encrypted payload and submission row abstraction

The response-submission ciphertext is not a JOSE object and not the §8 HPKE ciphertext. It is the output of the kiosk response-submission suite over `SubmissionPlaintext` bytes.

```cddl
encrypted-submission-metadata = {
  "iv" => b64u,
  "phoneEphemeralPublicKeyJwk" => p256-jwk,
  * tstr => any
}

kiosk-submission-row = {
  "submissionId" => tstr,
  "requestId" => tstr,
  "storagePath" => tstr,
  "storageFileId" => tstr,
  "iv" => b64u,
  "phoneEphemeralPublicKeyJwk" => p256-jwk,
  * tstr => any
}
```

For the active InstantDB/Instant Storage profile, the ciphertext bytes are stored as an opaque `application/octet-stream` blob at:

```text
submissions/<requestId>/<submissionId>.bin
```

The row carries routing and decryption metadata only. `storagePath`, `storageFileId`, provider write timestamps, provider authorization, subscription events, and row order are not Holder consent, patient identity, SMART response validity, mdoc issuer/device trust, clinical-source provenance, or downstream authorization.

For the response-submission suite:

```text
ECDH P-256 shared secret = ECDH(phone ephemeral private key, KioskRequestPayload.encryptResponseTo.desktopPublicKeyJwk)
HKDF-SHA-256 salt        = utf8(KioskRequestPayload.requestId)
HKDF-SHA-256 info        = utf8("smart-health-checkin-kiosk-response-v1")
AES-GCM key length       = 256 bits
AES-GCM IV               = base64url-decode(kiosk-submission-row.iv)
AES-GCM AAD              = utf8(KioskRequestPayload.requestId)
plaintext                = SubmissionPlaintext UTF-8 JSON bytes
```

A Completion display SHALL decrypt only with the desktop private key corresponding to the signed `encryptResponseTo.desktopPublicKeyJwk` from the verified kiosk request. It SHALL reject rows with wrong row-level `requestId`, malformed storage locator under the selected provider profile, unacceptable IV, unacceptable phone ephemeral P-256 JWK, oversized blob, AES-GCM authentication failure, UTF-8 or JSON parse failure, or decrypted `SubmissionPlaintext.requestId` mismatch.

Provider profiles MAY add optional digest or integrity-hint metadata for diagnostics, but such metadata SHALL NOT replace AES-GCM authentication, decrypted `requestId` validation, §6 response validation, §6.6 cross-validation, §7 trust interpretation, or §8 validation accounting.

### C.K.8 Provider capability abstraction

A provider profile for the active kiosk wrapper should expose capabilities equivalent to:

```cddl
kiosk-provider = {
  "name" => tstr,
  "appId" => tstr,
  "configured" => bool,
  ; write encrypted request by wrapper requestId
  ; read encrypted request by wrapper requestId
  ; write encrypted submission bytes plus row metadata
  ; download encrypted submission blob/bytes by selected row
  ; observe/list submission rows for one wrapper requestId
  * tstr => any
}
```

This is an abstraction, not an API signature. The active TypeScript adapter names these capabilities `writeRequest`, `readRequest`, `writeSubmission`, `downloadSubmissionBlob`, and `useSubmissionRows` (`rp-web/src/kiosk/kiosk-provider.ts`). A conforming provider SHALL NOT require plaintext `KioskRequestPayload`, plaintext `smartRequest`, plaintext `SubmissionPlaintext`, plaintext `smartResponse`, raw FHIR content, SMART Health Cards, private keys, or shared secrets merely to route, store, notify, or make available kiosk request and submission state.

## Appendix D additions: kiosk fixture index and vector plan

### D.K.1 Kiosk fixture classification rules

The Appendix D classification scheme from the same-device section applies here. Kiosk fixture material should be listed only when it exists in the repository and should state whether it is a normative example, diagnostic/historical capture, implementation regression, illustrative material, or future vector. A fixture entry should identify byte-exact versus structure-exact versus semantic checks, PHI status, test-only key material, production relevance, and whether ciphertext is deterministic or intentionally nondeterministic.

At this cutpoint, the repository does **not** appear to contain a checked-in deterministic kiosk JWS/envelope/submission fixture root equivalent to a public Appendix D kiosk vector suite. The active evidence is implementation code and implementation tests, not frozen byte-level vectors.

### D.K.2 Checked-in kiosk-related material

| Path | Evidence-supported classification | Use in this draft |
| --- | --- | --- |
| `rp-web/src/kiosk/protocol.ts` | Implementation evidence / implementation regression source | Defines active constants, JWS header/payload types, `EncryptedKioskRequest`, `SubmissionPlaintext`, deterministic JSON function, request-envelope crypto, response-submission crypto, base64url helpers, and validation functions. Not a normative fixture. |
| `rp-web/src/kiosk/kiosk-provider.ts` | Implementation evidence | Defines provider-facing row types, pointer URL construction, resolution, submission completion, row filtering, and open-submission behavior. Not a normative fixture. |
| `rp-web/src/kiosk/instant-mailbox.ts` | Implementation evidence for active provider example | Defines InstantDB request rows, submission rows, storage paths, blob content type, and blob size checks. Not a normative fixture. |
| `rp-web/src/instant/schema.ts` and `rp-web/instant.perms.ts` | Provider-profile implementation evidence | Shows the active InstantDB row schema and defense-in-depth access rules. Not a universal provider schema. |
| `rp-web/src/kiosk/kiosk-provider.test.ts` | Implementation regression | Tests pointer-only URL behavior, no plaintext clinical strings in URL/encrypted request row, direct `smartRequest` embedding, active submission payload kind, wrapper request-id binding, and no raw `dcapiResponse`/`deviceResponse` in the submitted payload. It is a regression test, not a public conformance vector. |
| `rp-web/src/kiosk/demo-keys.ts` | Diagnostic/demo key material | Contains intentionally checked-in demo-only P-256 signing and ECDH keys. It can support demo fixtures, but the keys are not production trust anchors. |
| `rp-web/src/kiosk/creator-main.tsx` and `rp-web/src/kiosk/submit-main.tsx` | Prototype UI evidence | Shows the current desktop and phone demo flows, including pointer display, phone resolution, same-device invocation, and encrypted submission. Not a fixture oracle. |
| `rp-web/src/sdk/kiosk-session.ts` | Historical/stale prototype evidence | Defines an older inline kiosk fragment carrying §8 `deviceRequest` and `encryptionInfo`. This conflicts with accepted T4.A/T4.B pointer-only behavior and should be labelled historical if mentioned. It is not an active fixture. |
| `docs/plans/kioskmode-transport.md`, `docs/plans/kioskmode-transport.addendum.md`, `docs/plans/kiosk-transport-row-slim.md` | Historical/planning plus implementation rationale | Useful background for untrusted relay, blob storage, row slimming, and provider limits. Normative Appendix D should cite active code over planning prose where they differ. |
| `site/kiosk-flow-explainer.html` | Illustrative documentation | Useful for explaining the flow, not a conformance fixture. |

No checked-in path under `fixtures/` was found that is specifically a kiosk request JWS, encrypted kiosk request envelope, pointer URL vector, encrypted response-submission blob, or kiosk provider row vector. Therefore Appendix D should not claim an existing normative kiosk vector suite.

### D.K.3 Same-device Chrome/Android captures and kiosk status

The existing real Chrome/Android capture roots:

- `fixtures/dcapi-requests/real-chrome-android-smart-checkin/`
- `fixtures/responses/real-chrome-android-smart-checkin/`

remain same-device §8 diagnostic/historical captures. They are valuable for validating `org-iso-mdoc`, `ItemsRequest.requestInfo`, `encryptionInfo`, `SessionTranscript`, HPKE-opened `DeviceResponse`, issuer-signed SMART response carriage, and real Chrome/Android behavior. They do **not** exercise the active kiosk pointer-only wrapper, compact kiosk request JWS, `EncryptedKioskRequest`, phone-side pointer resolution, response-submission encryption, InstantDB request/submission rows, or desktop completion processing.

The captures should therefore remain classified as diagnostic real-platform captures and historical evidence for the same-device leg until a refreshed kiosk capture is produced after §9, §16.6, Appendix C, and Appendix D expectations stabilize. They should not be cited as current kiosk conformance vectors.

### D.K.4 Recommended future kiosk fixture vectors

A future kiosk fixture suite should add deterministic or fixture-profile-stabilized vectors for the following. Where production algorithms are nondeterministic because of ECDSA nonces, ECDH ephemeral keys, IVs, or timestamps, the fixture profile should either inject test randomness or compare decoded structure and validation outcomes rather than raw ciphertext bytes.

1. **Deterministic kiosk JWS signing input**
   - Inputs: fixed `KioskRequestPayload`, fixed protected header, deterministic JSON rule, fixed creator public/private test key or deterministic signature strategy.
   - Outputs: protected-header JSON bytes, payload JSON bytes, base64url segments, signing input, compact JWS, and expected verification result.
   - Checks: key-sorted JSON, three compact segments, `alg`, `kid`, `typ`, direct `smartRequest`, `requestId` distinct from `smartRequest.id`, and rejected tampered payload/signature.

2. **Encrypted request envelope**
   - Inputs: compact JWS, fixed wrapper `requestId`, fixed recipient request-opening P-256 test key, fixed sender ephemeral key, fixed IV.
   - Outputs: `EncryptedKioskRequest`, base64url IV and ciphertext, ephemeral public JWK, and opened JWS.
   - Checks: content type `application/smart-health-checkin-kiosk-request+jws+aesgcm`, algorithm labels, salt/AAD wrapper `requestId`, info `smart-health-checkin-kiosk-request-v1`, envelope/payload id binding, expiration handling, and no plaintext clinical strings in relay row.

3. **Pointer URL**
   - Inputs: submit base URL and wrapper `requestId`.
   - Outputs: URL with only fragment parameter `r` for the active profile.
   - Checks: no compact JWS, no `EncryptedKioskRequest`, no `deviceRequest`, no `encryptionInfo`, no clinical content, and correct decoding of URL-encoded request ids.

4. **Phone resolution and same-device re-entry handoff**
   - Inputs: pointer URL, provider request row, request-opening key, creator trust set, expected provider app id.
   - Outputs: verified `KioskRequestPayload` and embedded `smartRequest` prepared for fresh §8 construction.
   - Checks: pointer/row/envelope/payload `requestId` equality, JWS verification, provider binding, timestamp checks, `smartRequest` §5 validation, and absence of legacy inline §8 artifacts.

5. **Response submission encryption/decryption**
   - Inputs: verified kiosk request with signed `desktopPublicKeyJwk`, fixed desktop private key, fixed phone ephemeral key, fixed IV, and `SubmissionPlaintext` containing `payload.kind = "smart-health-checkin-response"`.
   - Outputs: encrypted blob bytes, submission row metadata, and decrypted plaintext.
   - Checks: deterministic JSON byte count, signed `constraints.maxPlaintextBytes`, salt/AAD wrapper `requestId`, info `smart-health-checkin-kiosk-response-v1`, storage path `submissions/<requestId>/<submissionId>.bin`, decrypted wrapper id binding, and inner SMART response `requestId = smartRequest.id`.

6. **Wrong `requestId` / AAD failures**
   - Mutations: pointer `r` differs from row id; row id differs from envelope id; envelope id differs from signed payload id; response-submission row id differs from decrypted plaintext id; AES-GCM AAD uses a different wrapper id.
   - Expected result: rejection before Wallet invocation for request mutations or before completion acceptance for submission mutations.

7. **Expired or future request**
   - Mutations: `expiresAt` in past; `createdAt` too far in future; `expiresAt <= createdAt`.
   - Expected result: safe rejection with no Wallet invocation or successful submission.

8. **Oversized plaintext or blob**
   - Mutations: `SubmissionPlaintext` serialized bytes exceed signed `constraints.maxPlaintextBytes`; ciphertext/blob exceeds implementation cap.
   - Expected result: no successful submission row for plaintext oversize and no completion acceptance for oversized blob.

9. **Malformed row, JWK, IV, or ciphertext fields**
   - Mutations: missing `encryptedRequest`; missing `iv`; invalid base64url; wrong IV length for profile; malformed P-256 JWK; wrong `alg`/`enc`/`contentType`; non-object `payload`; nonnumeric `submittedAt`; storage path outside `submissions/<requestId>/`.
   - Expected result: rejection at row validation, import, decoding, AES-GCM, UTF-8, JSON, or profile-shape validation as applicable.

10. **Duplicate rows and replay**
    - Inputs: two valid rows for one wrapper request id, repeated same row/blob, later `submittedAt` with valid ciphertext.
    - Expected result: decryption may succeed, but fixture expectations should distinguish cryptographic validity from single-use workflow acceptance; production completion should not accept duplicates merely because they decrypt.

11. **No plaintext leakage**
    - Inputs: request with distinctive clinical display strings and response with distinctive artifact strings.
    - Outputs to inspect: Pointer URL, provider request row, `EncryptedKioskRequest`, submission row, storage path, blob metadata, logs/debug summaries selected for publication.
    - Checks: clinical strings appear only in decrypted and authorized fixture views, not in pointer, row metadata, ciphertext JSON, storage locator, or provider schema.

### D.K.5 Stable prerequisites for a refreshed kiosk capture

A refreshed kiosk capture should be requested only after the following are stable:

- final §9 request, resolution, submission, provider, replay, and completion rules;
- Appendix C kiosk pseudo-CDDL/schema field names and byte-boundary labels;
- §16.6 kiosk worked example content and expected SMART request/response JSON;
- test-only creator, request-opening, desktop, and phone ephemeral key policy for fixtures;
- deterministic fixture controls for timestamps, random request ids, ECDSA signatures, ECDH ephemeral keys, and AES-GCM IVs, or a clear decision to compare structure/semantics instead of fixed ciphertext;
- fixture PHI policy, metadata minimization policy, and marking for intentionally public private keys; and
- expected failure vectors and result labels for conformance-tool output.

The desired outputs for such a capture are:

- compact kiosk request JWS, decoded header and payload, deterministic signing input, creator public JWK, and signature verification result;
- `EncryptedKioskRequest`, request-opening public/private test JWKs if intentionally public, envelope-open result, and negative envelope mutations;
- Pointer URL and decoded pointer parameters;
- provider request row as stored by the selected provider profile;
- phone-side resolved request state and the freshly constructed §8 request fixture used for Wallet invocation;
- same-device §8 request/response artifacts or references to existing same-device fixture roots when reused;
- `SubmissionPlaintext`, response-submission encryption metadata, encrypted blob bytes, submission row, desktop private/public test JWKs if intentionally public, and decrypted plaintext;
- completion validation report covering wrapper id binding, SMART response §6/§6.6 validation, §8 validation accounting, and duplicate/expiration decisions; and
- a manifest with SHA-256 hashes, PHI status, software versions, origin/package metadata where applicable, fixture classification, and caveats.

## Organizer notes

### Strengths

- Aligns the Appendix C kiosk material with accepted T4.A/T4.B/T4.C field names and cryptographic labels without claiming complete JOSE, JWK, ISO, JSON Schema, or InstantDB schema coverage.
- Keeps request-envelope crypto, response-submission crypto, and §8 HPKE separate.
- Explicitly preserves pointer-only URLs and direct `smartRequest` embedding.
- Classifies existing kiosk code/tests as implementation evidence or regression material, not normative fixtures.
- Conservatively keeps Chrome/Android captures as same-device diagnostic/historical material until a kiosk-specific refresh exists.

### Caveats

- No deterministic kiosk byte vectors are checked in today; any Appendix D conformance-vector language should be future-facing until fixture files exist.
- Active demo key material is intentionally public and browser-delivered; it can support diagnostics but must not be treated as production key custody.
- Active desktop prototype display opens submissions but does not itself prove complete clinical workflow validation; normative completion validation remains in §9.9 and later conformance/security text.
- `rp-web/src/sdk/kiosk-session.ts` is stale relative to accepted pointer-only kiosk behavior and should not be promoted accidentally.

### Open issues

- Decide whether canonical Appendix C should require strict mirrored metadata equality for envelope `createdAt`, `expiresAt`, `creatorKeyId`, and `recipientKeyId`, or leave non-id mirrors to provider/profile validation.
- Decide whether `submittedAt` numeric validation should be added to active code or only specified in the profile text.
- Decide whether future fixtures need deterministic ES256 signatures or can compare signing input plus successful verification with test keys.
- Decide whether optional ciphertext digest/storage-integrity metadata belongs in a provider-profile extension registry.

### Downstream dependencies

- §11 and §12 should carry production key custody, stale QR, relay abuse, logging, telemetry, metadata, and privacy guidance.
- §13 should register or stabilize algorithm labels, JWS `typ`, kiosk content type, payload kinds, and any provider-profile identifiers.
- §15 can document InstantDB-specific deployment guidance without making InstantDB normative.
- §16.6 and T6.C should create or align the future kiosk byte ladder and fixture manifest once the above prerequisites are stable.

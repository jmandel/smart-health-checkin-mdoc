# Appendix C: Kiosk wrapper JSON shapes and profile constraints

This appendix gives profile constraints and JSON-shape pseudo-CDDL for the cross-device kiosk wrapper defined in §9. It is intended to make request JWS, encrypted request envelope, pointer, response-submission plaintext, and provider-row boundaries reviewable for implementers, fixture authors, and conformance-tool authors.

The snippets below are not complete JOSE, JWK, JSON Schema, InstantDB, ISO/IEC 18013-5, COSE, CBOR, or HPKE definitions. They constrain only SMART Health Check-in kiosk wrapper portions. `SmartCheckinRequest` is the §5 request model, `SmartHealthCheckinResponse` is the §6 response model, `JsonWebKey` is a constrained JSON Web Key placeholder, and `CompactJWS` is a compact JWS string. If this appendix conflicts with §§5, 6, 8, or 9, those sections control.

## C.K.1 Notation and helper value constraints

```text
base64url         = JSON string using A-Z / a-z / 0-9 / "-" / "_", no "=" padding
millis-epoch      = JSON number, milliseconds since the Unix epoch
request-id        = high-entropy opaque JSON string for the kiosk wrapper session
compact-jws       = base64url "." base64url "." base64url
p256-public-jwk   = JsonWebKey with kty="EC", crv="P-256", x=base64url, y=base64url, no private d
```

A Kiosk creator SHOULD generate `request-id` values with enough entropy to resist guessing during the request lifetime and within the provider namespace. The active implementation uses 32 random bytes encoded as unpadded base64url. A conformance-vector profile MAY freeze a stricter lexical pattern for reproducibility, but the core protocol treats request ids as opaque strings.

`createdAt`, `expiresAt`, and `submittedAt` are JSON numbers containing milliseconds since the Unix epoch. Kiosk processors SHOULD reject non-numeric timestamps, expired requests, unacceptable future `createdAt` values, and lifetimes outside the selected deployment or conformance profile.

String fields named `iv`, `ciphertext`, and JWS segments use unpadded base64url. For the active request-envelope and response-submission profiles, decoded IVs are 96 bits. Public JWKs used for ECDH are P-256 public keys; private key members such as `d` MUST NOT appear in provider rows, request envelopes, pointer URLs, or signed public encryption metadata.

## C.K.2 Compact kiosk request JWS

The kiosk request JWS is a compact JWS whose protected header is equivalent to:

```json
{
  "alg": "ES256",
  "kid": "<creator-key-id>",
  "typ": "smart-health-checkin+kiosk-request+jws"
}
```

A Kiosk creator implementing this profile SHALL set protected-header `alg` to `ES256`, `typ` to `smart-health-checkin+kiosk-request+jws`, and `kid` to a non-empty creator signing key identifier. A Phone presenter SHALL reject a compact kiosk request JWS with another algorithm, absent/empty `kid`, wrong `typ`, malformed compact serialization, an unknown or untrusted creator key, or an invalid signature.

For this profile, the JWS signing input is:

```text
base64url(UTF8(deterministic-json(protected-header))) || "." ||
base64url(UTF8(deterministic-json(KioskRequestPayload)))
```

`deterministic-json` recursively sorts JSON object member names lexicographically, omits members whose value is `undefined`, preserves array order, and serializes with JSON stringification before UTF-8 encoding. This deterministic JSON rule applies to the kiosk-wrapper JWS input and response-submission wrapper bytes where stated; it does not define canonical JSON for all SMART request or SMART response use outside the kiosk wrapper.

## C.K.3 `KioskRequestPayload` signed payload

```cddl
; JSON-shape pseudo-CDDL, not complete JSON Schema.
KioskRequestPayload = {
  "v": 1,
  "iss": non-empty-text,
  "aud": non-empty-text,
  "requestId": request-id,
  "createdAt": millis-epoch,
  "expiresAt": millis-epoch,
  "submitTo": SubmitTo,
  "smartRequest": SmartCheckinRequest,
  "encryptRequestTo": RequestEncryptionRecipient,
  "encryptResponseTo": ResponseEncryptionRecipient,
  "constraints": KioskConstraints,
  "minter": MinterMetadata
}

SubmitTo = {
  "backend": non-empty-text,       ; active value: "instantdb"
  "appId": non-empty-text
}

RequestEncryptionRecipient = {
  "alg": "ECDH-P256+HKDF-SHA256+AES-GCM",
  "keyId": non-empty-text
}

ResponseEncryptionRecipient = {
  "alg": "ECDH-P256+HKDF-SHA256+AES-GCM",
  "desktopPublicKeyJwk": p256-public-jwk
}

KioskConstraints = {
  "maxPlaintextBytes": positive-integer
}

MinterMetadata = {
  "keyId": non-empty-text
}
```

A Kiosk creator SHALL embed the complete §5 `SmartCheckinRequest` directly as `smartRequest` before signing. It SHALL NOT replace `smartRequest` with a request-profile wrapper, preset id, IPS shortcut, “all of the above” label, SDK helper object, inline §8 request fragment, or other alternate clinical request wrapper.

`requestId` is the kiosk wrapper identifier. `smartRequest.id` is the clinical SMART request identifier. Kiosk creators, Phone presenters, Completion displays, and provider profiles MUST keep them distinct: wrapper `requestId` binds the pointer, provider rows, request envelope, request/submission AAD, and top-level `SubmissionPlaintext`; `smartRequest.id` is the value later echoed by `SmartHealthCheckinResponse.requestId` under §6.

`constraints.maxPlaintextBytes` is signed processing metadata for the response-submission plaintext. A Phone presenter SHALL enforce it over the exact UTF-8 bytes it will encrypt. Implementations MAY apply stricter local limits and SHOULD reject signed limits they cannot safely enforce. The active prototype uses 25 MiB for `maxPlaintextBytes`; that number is not a universal clinical data-model maximum unless adopted by a deployment or conformance profile.

The active implementation uses demo `iss`, `aud`, and `submitTo.backend`/`appId` checks. Production issuer, audience, provider, and creator-key acceptance are deployment or registry policy; demo strings and checked-in demo keys are not production trust anchors.

## C.K.4 `EncryptedKioskRequest` envelope

```cddl
EncryptedKioskRequest = {
  "v": 1,
  "alg": "ECDH-P256+HKDF-SHA256+AES-GCM",
  "enc": "A256GCM",
  "contentType": "application/smart-health-checkin-kiosk-request+jws+aesgcm",
  "requestId": request-id,
  "createdAt": millis-epoch,
  "expiresAt": millis-epoch,
  "creatorKeyId": non-empty-text,
  "recipientKeyId": non-empty-text,
  "iv": base64url,                 ; decoded length 12 octets
  "ciphertext": base64url,         ; AES-GCM ciphertext || tag over CompactJWS
  "ephemeralPublicKeyJwk": p256-public-jwk
}
```

The plaintext of `EncryptedKioskRequest.ciphertext` is the compact kiosk request JWS encoded as UTF-8 text. It is not the unsigned payload alone and not the raw `smartRequest` alone.

The request-envelope encryption construction is:

```text
ECDH P-256 shared secret = ECDH(sender ephemeral private key, request-opening public key)
HKDF-SHA-256 salt        = utf8(requestId)
HKDF-SHA-256 info        = utf8("smart-health-checkin-kiosk-request-v1")
AES-GCM key length       = 256 bits
AES-GCM IV               = base64url-decode(iv) ; 96 bits
AES-GCM AAD              = utf8(requestId)
plaintext                = compact kiosk request JWS UTF-8 text
```

A Kiosk creator SHALL set `requestId`, `createdAt`, and `expiresAt` to the corresponding signed payload values, `creatorKeyId` from the JWS protected-header `kid`, and `recipientKeyId` from `KioskRequestPayload.encryptRequestTo.keyId`. A Phone presenter SHALL bind the pointer `r`, provider row `requestId` when present, envelope `requestId`, and verified payload `requestId` by exact string equality. For the version-1 profile, it SHOULD also reject non-id mirrored metadata mismatches unless a deployment profile explicitly defines another compatibility rule. Active code is stricter on id, algorithm, content type, and expiration than on every mirrored non-id field; conformance vectors should make the desired stricter behavior explicit.

A relay request row for the active provider profile is logically:

```cddl
KioskRequestRow = {
  "requestId": request-id,
  "encryptedRequest": EncryptedKioskRequest
}
```

The relay MAY store provider-local row ids or operational metadata, but it SHALL NOT require plaintext `KioskRequestPayload` or plaintext `smartRequest` to route the request.

## C.K.5 Pointer URL shape

The active pointer profile carries only the wrapper request id in URL fragment parameter `r`:

```text
https://clinic.example/verifier/submit.html#r=<url-encoded-requestId>
```

A Kiosk creator using this profile SHALL set `r` to the same wrapper `requestId` used in the signed payload, encrypted envelope, provider lookup row, request-envelope HKDF salt/AAD, and later submission binding. A Phone presenter SHALL reject a missing, empty, malformed, or unsupported pointer.

The Pointer URL or QR code SHALL NOT contain plaintext `smartRequest`, FHIR resources, SMART Health Cards, Questionnaire answers, compact kiosk request JWS, `EncryptedKioskRequest`, §8 `DeviceRequest`, §8 `encryptionInfo`, §8 `SessionTranscript`, §8 HPKE ciphertext, Wallet `DeviceResponse`, SMART response, response-submission ciphertext, storage blob, private keys, bearer credentials, or requester-trust assertions intended to bypass §7/§8 validation.

## C.K.6 `SubmissionPlaintext` and active successful payload

```cddl
SubmissionPlaintext = {
  "requestId": request-id,          ; wrapper KioskRequestPayload.requestId
  "submittedAt": millis-epoch,
  "payload": SubmissionPayload
}

SubmissionPayload = SmartResponseSubmission / ExtensionSubmission

SmartResponseSubmission = {
  "kind": "smart-health-checkin-response",
  "smartResponse": SmartHealthCheckinResponse
}

ExtensionSubmission = {
  "kind": non-empty-text,
  * text => any
}
```

For the active successful SMART-response completion profile, `payload.kind` SHALL be `smart-health-checkin-response`, and `payload.smartResponse` SHALL be a §6 `SmartHealthCheckinResponse`. `SubmissionPlaintext.requestId` SHALL equal the kiosk wrapper `requestId`; `payload.smartResponse.requestId` SHALL equal the embedded `smartRequest.id` under §6 and §6.6.

A Phone presenter SHALL NOT include plaintext §8 `DeviceResponse` CBOR, `dcapiResponse`, §8 HPKE `enc`/`cipherText`, §8 `deviceRequest`, §8 `encryptionInfo`, request-opening private keys, desktop private keys, Wallet secrets, provider credentials, or unrelated diagnostics in the active `SubmissionPlaintext.payload`. Extension payload kinds require a future deployment or registry profile and MUST NOT weaken §6, §7, §8, or §9 validation semantics or require the untrusted provider to receive plaintext clinical content.

## C.K.7 Response-submission encryption and provider row

The response-submission ciphertext is distinct from the request-envelope ciphertext and from §8 HPKE. The response-submission construction is:

```text
ECDH P-256 shared secret = ECDH(phone ephemeral private key, signed desktopPublicKeyJwk)
HKDF-SHA-256 salt        = utf8(KioskRequestPayload.requestId)
HKDF-SHA-256 info        = utf8("smart-health-checkin-kiosk-response-v1")
AES-GCM key length       = 256 bits
AES-GCM IV               = 96 fresh random bits
AES-GCM AAD              = utf8(KioskRequestPayload.requestId)
plaintext                = UTF-8 JSON SubmissionPlaintext bytes
ciphertext blob          = AES-GCM ciphertext || tag, content type application/octet-stream
```

A Phone presenter SHALL use a fresh phone ephemeral P-256 key for each encrypted submission and SHALL encrypt only to the signed `KioskRequestPayload.encryptResponseTo.desktopPublicKeyJwk`. It SHALL NOT reuse §8 HPKE keys, §8 `SessionTranscript`, request-envelope keys, provider-row keys, Pointer URL values, or unauthenticated page state as the response-submission recipient.

The active provider submission row is logically:

```cddl
KioskSubmissionRow = {
  "submissionId": non-empty-text,
  "requestId": request-id,
  "storagePath": non-empty-text,    ; active convention: "submissions/<requestId>/<submissionId>.bin"
  "storageFileId": non-empty-text,
  "iv": base64url,                  ; decoded length 12 octets
  "phoneEphemeralPublicKeyJwk": p256-public-jwk
}
```

The ciphertext bytes are stored or transmitted as an opaque `application/octet-stream` blob. Provider row metadata and storage locators are routing and decryption metadata only. They are not Holder consent, patient identity, requester identity, SMART response validity, mdoc issuer/device trust, clinical-source provenance, or downstream authorization.

A Completion display SHALL filter candidate rows by wrapper `requestId`, validate provider row shape and storage-locator conventions for the selected provider profile, download bounded ciphertext bytes, decrypt with the retained desktop private key and response-submission construction above, compare decrypted `SubmissionPlaintext.requestId` to the active wrapper `requestId`, validate the active payload under §6/§6.6 against the original `smartRequest`, and account for §8 and §7 validation before clinical workflow use.

## C.K.8 Crypto-boundary separation

The three encryption contexts are separate and MUST NOT be conflated:

| Context | Plaintext | Recipient | Info / transcript | AAD | Ciphertext field |
| --- | --- | --- | --- | --- | --- |
| §9 request envelope | Compact kiosk request JWS | Request-opening P-256 key named by `encryptRequestTo.keyId` / `recipientKeyId` | `smart-health-checkin-kiosk-request-v1` | wrapper `requestId` | `EncryptedKioskRequest.ciphertext` base64url |
| §9 response submission | `SubmissionPlaintext` JSON | Signed desktop P-256 public JWK in `encryptResponseTo.desktopPublicKeyJwk` | `smart-health-checkin-kiosk-response-v1` | wrapper `requestId` | Opaque `application/octet-stream` blob |
| §8 same-device presentation | mdoc `DeviceResponse` CBOR | Phone-local §8 verifier HPKE key from `encryptionInfo` | §8 `SessionTranscript` bytes | empty AAD | §8 `dcapiResponse` `cipherText` |

Request-envelope keys, response-submission keys, and §8 HPKE keys have different recipients, info strings/transcripts, ciphertext fields, and validation semantics. A conforming implementation SHALL NOT substitute one context's key, info, AAD, transcript, or ciphertext for another.

## C.K.9 Provider abstraction constraints

A kiosk transport provider used for the active flow supplies capabilities equivalent to writing and reading encrypted request rows, writing encrypted submission rows/blobs, downloading submission blobs, and observing candidate submission rows for one wrapper `requestId`. The active TypeScript adapter names these `writeRequest`, `readRequest`, `writeSubmission`, `downloadSubmissionBlob`, and `useSubmissionRows`; other implementations may use different API names.

The provider SHALL NOT need plaintext SMART requests, plaintext SMART responses, raw FHIR content, SMART Health Cards, Holder decisions, §8 response plaintext, desktop private keys, Wallet secrets, request-opening private key material, or shared secrets merely to route, store, notify, or make available kiosk state.

Provider profiles SHOULD define row and blob size limits, expiration and cleanup behavior, duplicate handling, storage-path validation, anti-enumeration policy, access-control defense in depth, observation semantics, idempotency, retry behavior, logging limits, metadata minimization, and error reporting. These provider controls do not replace cryptographic validation, SMART response validation, §8 validation, §7 trust interpretation, or workflow authorization.

# Appendix D: Kiosk fixture index and future vector plan

This appendix indexes checked-in material relevant to kiosk-wrapper review and identifies future kiosk vectors. A fixture path is listed as checked in only when it exists in the repository. Checked-in material is not a normative kiosk conformance vector merely because it exists.

## D.K.1 Classification scheme

| Class | Meaning |
| --- | --- |
| **Kiosk conformance candidate** | Future or generated material that can become an automated pass/fail kiosk wrapper vector after Appendix A/§13/T6.C identify exact producer assumptions, byte boundaries, and expected results. |
| **Same-device prerequisite** | Fixture material for §8 re-entry that kiosk uses after pointer resolution, but not a §9 kiosk-wrapper vector. |
| **Diagnostic / historical capture** | Real-platform or older behavior useful as evidence or debugging material, but not current kiosk conformance authority. |
| **Implementation regression** | Repository test resources for a specific implementation or cross-language check. |
| **Illustrative / planning** | Documentation or examples that inform future work but are not pass/fail vectors. |

Final fixture entries should state whether validation is byte-exact, structure-exact, semantic, or diagnostic-only; whether material contains PHI; whether private keys are intentionally public test material; and whether trust material is production, test-only, self-signed, demo, or unknown.

## D.K.2 Verified checked-in fixture roots and files

| Path | Status / classification | Notes |
| --- | --- | --- |
| `fixtures/README.md` | Fixture policy / index | Defines checked-in fixture rules and current fixture roots. No `fixtures/kiosk/` root is listed. |
| `fixtures/dcapi-requests/ts-smart-checkin-basic/` | Same-device prerequisite; conformance candidate for §8 request construction, not kiosk wrapper | Synthetic deterministic direct-mdoc request fixture without readerAuth. Useful for phone-local §8 re-entry prerequisites. Does not contain kiosk request JWS, `EncryptedKioskRequest`, pointer, or submission ciphertext. |
| `fixtures/dcapi-requests/ts-smart-checkin-readerauth/` | Same-device prerequisite; conformance candidate for optional §8 readerAuth, not kiosk wrapper | Synthetic direct-mdoc request with per-`DocRequest.readerAuth`, tag-24 bytes, transcript, and demo reader material. Not a kiosk wrapper vector. |
| `fixtures/dcapi-requests/real-chrome-android-smart-checkin/` | Diagnostic / historical same-device real-platform capture | Real Chrome/Android same-device request with demo data, readerAuth, requestInfo carrier, and intentionally public test-only recipient private JWK for paired response opening. It remains historical/diagnostic for kiosk until refreshed. |
| `fixtures/responses/pymdoc-minimal/` | Same-device diagnostic response byte-walk | Independent mdoc response material for §8 response substructure and value-digest review. It does not exercise kiosk request/response wrappers. |
| `fixtures/responses/real-chrome-android-smart-checkin/` | Diagnostic / historical same-device real-platform response capture | Paired Android wallet response artifacts for the real Chrome/Android request, including `dcapiResponse`, HPKE-opened `DeviceResponse`, SMART response extraction, and byte checks. Not a kiosk response-submission vector. |
| `fixtures/captures/2026-04-30-mattr-safari-org-iso-mdoc/` | Historical external direct-mdoc capture / negative prerequisite | Captured Mattr/Safari-UA direct-mdoc request material; useful as compatibility/background and negative wallet-vector input, not a SMART Check-in kiosk fixture. |
| `fixtures/dcapi-requests/negative-mattr-mdl/metadata.json` | Implementation regression / negative same-device fixture | Metadata for a non-SMART mdoc request used by generator/tests. Not kiosk-specific. |
| `wallet-android/app/src/test/resources/test-vectors.json` | Implementation regression; same-device prerequisite vectors | Generated from TypeScript same-device protocol code. Contains identifiers, direct-mdoc request vectors, rejection vectors, and SessionTranscript vectors. Not kiosk wrapper JWS/envelope/submission vectors. |
| `wallet-android/app/src/test/resources/gen-test-vectors.ts` | Fixture generator / implementation regression | Regenerates Android same-device vectors after TypeScript protocol byte-output changes. Useful model for future kiosk vector generation. |
| `rp-web/scripts/generate-dcapi-request-fixtures.ts` | Same-device fixture generator | Generates current `fixtures/dcapi-requests/*` roots. A future kiosk generator should be separate or clearly add `fixtures/kiosk/` outputs. |
| `rp-web/src/kiosk/kiosk-provider.test.ts` | Implementation regression test, not fixture root | Verifies active kiosk opacity, direct `smartRequest`, pointer-only URL, response payload kind, and no raw §8 response leakage. It is useful evidence but not a public fixture bundle. |
| `docs/plans/kiosk-transport-row-slim.md` | Illustrative / planning evidence | Documents row slimming rationale and target InstantDB row fields. It supports provider-row classification but is not normative fixture material. |

No checked-in deterministic `fixtures/kiosk/` suite was verified at this cutpoint.

## D.K.3 Current Chrome/Android capture freshness decision

The existing Chrome/Android SMART Check-in roots remain diagnostic/historical for kiosk purposes. They are current enough to demonstrate the active §8 same-device request/response path and to support kiosk re-entry prerequisites, but they do not contain the §9 compact kiosk request JWS, `EncryptedKioskRequest`, pointer-only provider lookup, request-envelope decryption transcript, response-submission ciphertext, submission row, or desktop decryption evidence. They therefore SHOULD NOT be promoted as current normative kiosk examples until a refreshed kiosk capture is produced and reviewed.

If the orchestrator wants a refreshed kiosk capture after T4.D review, the prerequisites are:

1. finalized §9 request, resolution, submission, and provider-field expectations;
2. finalized §11/§12 guidance on key custody, retention, logs, and debug artifact handling;
3. finalized §13 identifiers for JWS `typ`, content type, algorithm labels, and any provider/profile ids;
4. a configured InstantDB or equivalent provider using the current slim row shape;
5. current kiosk creator and submit pages using non-PHI demo data;
6. a supported phone browser / Credential Manager / Wallet path for phone-local §8;
7. capture tooling that records only intentional test/demo key material and marks it clearly.

Expected refreshed outputs should include, at minimum: pointer URL text/QR payload; provider request row; `EncryptedKioskRequest`; decrypted compact JWS only in controlled fixture diagnostics; decoded protected header and signed payload; request-envelope ephemeral public key, IV, and ciphertext; phone-local §8 request/response fixtures or references; response `SubmissionPlaintext`; response-submission IV, phone ephemeral public JWK, ciphertext blob, and submission row; desktop decryption and validation report; metadata declaring non-PHI/demo status, intentionally public test keys, producer versions, origin/provider context, timestamps, and expected pass/fail outcomes.

## D.K.4 Future kiosk vector checklist

A future `fixtures/kiosk/` suite SHOULD include positive and negative vectors for:

- deterministic request-JWS signing input: protected-header JSON, payload JSON, deterministic JSON bytes, base64url segments, signing input, and ES256 signature verification;
- `KioskRequestPayload` with direct `smartRequest`, signed `submitTo`, `encryptRequestTo`, `encryptResponseTo`, `constraints.maxPlaintextBytes`, `minter.keyId`, wrapper `requestId`, and distinct `smartRequest.id`;
- rejection of `requestProfile`, preset/presetId, IPS shortcuts, “all of the above,” SDK helper wrappers, missing/non-object `smartRequest`, or inline §8 objects in place of `smartRequest`;
- request-envelope encryption/decryption with fixed test keys and deterministic test IV/ephemeral key only for vector generation, including wrong `requestId` AAD/salt failure and wrong HKDF info failure;
- envelope field validation: bad `v`, `alg`, `enc`, content type, empty ids, malformed base64url `iv`/`ciphertext`, wrong IV length, invalid or private-member JWK, expired timestamps, future `createdAt`, and mirrored metadata mismatch;
- pointer URL parsing: valid `#r=<requestId>`, missing/empty `r`, duplicate or malformed fragment parameters as defined by the pointer profile, and proof that pointer strings contain no JWS, envelope, SMART request, §8 artifacts, response, ciphertext, or keys;
- provider request rows: missing row, ambiguous/duplicate rows, row/envelope/payload `requestId` mismatch, malformed `encryptedRequest`, and row metadata not treated as trust evidence;
- phone resolution and same-device re-entry: validated request produces a fresh §8 request from `smartRequest`; QR/pointer/envelope/JWS §8 artifacts are not reused;
- response-submission plaintext: correct wrapper `requestId`, numeric `submittedAt`, active `payload.kind`, inner `smartResponse.requestId == smartRequest.id`, and rejection of wrapper id substituted as SMART response id;
- response-submission encryption/decryption with fixed test keys/IV only for vectors, including wrong request-id AAD/salt failure, wrong HKDF info failure, wrong desktop key failure, malformed phone ephemeral JWK failure, and modified ciphertext/tag failure;
- submission rows/blobs: valid `submissionId`, `requestId`, `storagePath`, `storageFileId`, `iv`, and `phoneEphemeralPublicKeyJwk`; malformed row/JWK/IV; missing blob; oversized blob; storage path not matching `submissions/<requestId>/<submissionId>.bin`; duplicate rows; replay of same valid ciphertext;
- size limits: plaintext over signed `constraints.maxPlaintextBytes`, implementation-local maximum lower than signed limit, blob exceeding selected maximum, and no truncation-on-overflow behavior;
- expiration and replay: expired request before phone resolution, expiry during phone interaction with selected grace policy, stale QR, completed session receiving a later valid duplicate, and provider replay for same wrapper id;
- no plaintext leakage: pointer, provider request row, provider submission row, ciphertext blob metadata, logs/diagnostics allowed in public fixtures, and QR payload do not contain clinical strings, FHIR resources, SMART Health Cards, decrypted JWS payloads, raw `dcapiResponse`, `deviceResponse`, or private keys except intentionally marked test keys in controlled fixture files;
- cross-boundary separation: request-envelope vectors fail when response-submission info/key/AAD are used; response-submission vectors fail when request-envelope or §8 HPKE context is used; §8 HPKE vectors remain distinct.

Each vector should identify whether expected comparison is byte-exact, structure-exact, semantic, or diagnostic-only; list all fixed randomness/test keys; mark private test keys as intentionally public; declare PHI status; and reference the exact §9/App C obligations exercised.

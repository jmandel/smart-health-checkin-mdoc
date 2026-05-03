# T4.D attempt 02 — kiosk pseudo-CDDL and fixture material

## Appendix C additions: kiosk wrapper JSON shape guidance

These subsections extend Appendix C with profile-constrained JSON shapes for the cross-device kiosk wrapper defined in §9. They use pseudo-CDDL and schema-like notation to identify required fields, fixed strings, byte boundaries, and request-id bindings for fixture authors and conformance-tool authors.

This material is not complete CDDL for JOSE, JWK, JSON Schema, InstantDB, ISO/IEC 18013-5, COSE, CBOR, or HPKE. JOSE owns compact JWS syntax and ES256 validation. JWK specifications own EC key encoding. The selected provider owns its database schema. Section 8 and the same-device Appendix C material own `DeviceRequest`, `encryptionInfo`, `SessionTranscript`, HPKE, `DeviceResponse`, and `dcapiResponse` behavior.

If this appendix conflicts with §9, §9 controls. The kiosk request-envelope crypto, kiosk response-submission crypto, and §8 HPKE crypto are distinct constructions and MUST NOT be merged into one generic “kiosk encryption” rule.

### C.k1 Kiosk JSON notation and constants

The kiosk wrapper uses JSON objects with unique member names. JSON strings carrying bytes use base64url without padding unless the field definition says otherwise. Time fields in the active profile are JSON numbers containing milliseconds since the Unix epoch.

```text
kiosk-wrapper-version       = 1
kiosk-jws-alg               = "ES256"
kiosk-request-jws-typ       = "smart-health-checkin+kiosk-request+jws"
kiosk-aead-alg-label        = "ECDH-P256+HKDF-SHA256+AES-GCM"
kiosk-request-enc-label     = "A256GCM"
kiosk-request-content-type  = "application/smart-health-checkin-kiosk-request+jws+aesgcm"
kiosk-request-hkdf-info     = "smart-health-checkin-kiosk-request-v1"
kiosk-response-hkdf-info    = "smart-health-checkin-kiosk-response-v1"
kiosk-success-payload-kind  = "smart-health-checkin-response"
kiosk-blob-content-type     = "application/octet-stream"
```

The active TypeScript implementation defines these labels and constants in `rp-web/src/kiosk/protocol.ts` lines 3-12 and uses the InstantDB provider row shapes in `rp-web/src/kiosk/kiosk-provider.ts` lines 26-65 and `rp-web/src/instant/schema.ts` lines 10-21.

### C.k2 Compact kiosk request JWS

The signed kiosk request is a compact JWS. The protected header is constrained to:

```cddl
; Pseudo-CDDL / JSON shape guidance only.
kiosk-request-jws-protected-header = {
  "alg": "ES256",
  "kid": non-empty-string,
  "typ": "smart-health-checkin+kiosk-request+jws"
}
```

The compact JWS has exactly three non-empty base64url segments:

```text
BASE64URL(UTF8(deterministic-json(kiosk-request-jws-protected-header))) "."
BASE64URL(UTF8(deterministic-json(KioskRequestPayload))) "."
BASE64URL(ES256-signature)
```

For this kiosk-wrapper JWS only, deterministic JSON means recursively sorting object member names lexicographically, omitting members whose value is `undefined`, preserving array order, applying ordinary JSON stringification, and UTF-8 encoding the resulting JSON text. This deterministic JSON rule is evidenced by `canonicalJson()` and `signCompactJws()` in `rp-web/src/kiosk/protocol.ts` lines 387-400 and 556-570. It does not define canonical JSON for a standalone `SmartHealthCheckinRequest`, `SmartHealthCheckinResponse`, §8 `ItemsRequest.requestInfo`, or other future transports.

A fixture that claims to test the kiosk request JWS signing input should include at least the protected-header JSON bytes, payload JSON bytes, the two base64url segments, the exact signing input string, the signature segment, and the complete compact JWS. The fixture should also identify whether ECDSA signing used a deterministic or recorded signature. The repository currently has active code and tests, but it does not contain a checked-in deterministic kiosk JWS byte vector.

### C.k3 `KioskRequestPayload`

`KioskRequestPayload` is the compact JWS payload. It binds a wrapper request id, provider routing, request-envelope metadata, response-submission metadata, processing constraints, minter metadata, and the embedded clinical SMART request.

```cddl
; Pseudo-CDDL / JSON shape guidance only.
KioskRequestPayload = {
  "v": 1,
  "iss": non-empty-string,
  "aud": non-empty-string,
  "requestId": kiosk-request-id,
  "createdAt": unix-time-ms-number,
  "expiresAt": unix-time-ms-number,
  "submitTo": SubmitTo,
  "smartRequest": SmartHealthCheckinRequest,
  "encryptRequestTo": EncryptRequestTo,
  "encryptResponseTo": EncryptResponseTo,
  "constraints": KioskConstraints,
  "minter": KioskMinter,
  * json-member => json-value
}

SubmitTo = {
  "backend": "instantdb",
  "appId": non-empty-string,
  * json-member => json-value
}

EncryptRequestTo = {
  "alg": "ECDH-P256+HKDF-SHA256+AES-GCM",
  "keyId": non-empty-string,
  * json-member => json-value
}

EncryptResponseTo = {
  "alg": "ECDH-P256+HKDF-SHA256+AES-GCM",
  "desktopPublicKeyJwk": P256PublicJwk,
  * json-member => json-value
}

KioskConstraints = {
  "maxPlaintextBytes": non-negative-safe-integer,
  * json-member => json-value
}

KioskMinter = {
  "keyId": non-empty-string,
  * json-member => json-value
}

P256PublicJwk = {
  "kty": "EC",
  "crv": "P-256",
  "x": base64url-string,
  "y": base64url-string,
  * json-member => json-value
}
```

A Kiosk creator SHALL embed the complete §5 `SmartHealthCheckinRequest` directly as `smartRequest`. It SHALL NOT replace `smartRequest` with a preset id, request-profile wrapper, IPS shortcut, profile label, “all of the above” shortcut, SDK helper object, or inline §8 `DeviceRequest`/`encryptionInfo` fragment.

The wrapper `requestId` is the kiosk wrapper identifier used for the Pointer URL, provider lookup, request-envelope AAD/HKDF salt, signed-payload binding, response-submission AAD/HKDF salt, submission-row filtering, and desktop completion correlation. It is distinct from `smartRequest.id`. The later `SmartHealthCheckinResponse.requestId` equals `smartRequest.id`, not the wrapper `requestId`.

The active implementation uses a 32-random-byte unpadded-base64url wrapper request id, ten-minute request lifetime, `submitTo.backend: "instantdb"`, `constraints.maxPlaintextBytes` of 25 MiB, and demo issuer/audience strings (`rp-web/src/kiosk/protocol.ts` lines 138-181 and 403-428). These values are active prototype evidence, not universal production trust-anchor or deployment-policy values unless a conformance profile adopts them.

### C.k4 `EncryptedKioskRequest`

`EncryptedKioskRequest` is the request-pickup envelope stored or served by the untrusted provider. Its plaintext is the compact kiosk request JWS encoded as UTF-8 text.

```cddl
; Pseudo-CDDL / JSON shape guidance only.
EncryptedKioskRequest = {
  "v": 1,
  "alg": "ECDH-P256+HKDF-SHA256+AES-GCM",
  "enc": "A256GCM",
  "contentType": "application/smart-health-checkin-kiosk-request+jws+aesgcm",
  "requestId": kiosk-request-id,
  "createdAt": unix-time-ms-number,
  "expiresAt": unix-time-ms-number,
  "creatorKeyId": non-empty-string,
  "recipientKeyId": non-empty-string,
  "iv": base64url-96-bit-iv,
  "ciphertext": base64url-aes-gcm-ciphertext-and-tag,
  "ephemeralPublicKeyJwk": P256PublicJwk,
  * json-member => json-value
}
```

For this request-envelope suite:

```text
ECDH shared secret = ECDH(sender ephemeral P-256 private key,
                         request-opening recipient P-256 public key)
HKDF hash          = SHA-256
HKDF salt          = utf8(KioskRequestPayload.requestId)
HKDF info          = utf8("smart-health-checkin-kiosk-request-v1")
AES-GCM key length = 256 bits
AES-GCM IV         = fresh 96-bit IV, encoded as unpadded base64url in "iv"
AES-GCM AAD        = utf8(KioskRequestPayload.requestId)
plaintext          = UTF8(compact kiosk request JWS)
ciphertext field   = unpadded base64url of AES-GCM ciphertext plus tag
```

A Kiosk creator SHALL set envelope `requestId`, `createdAt`, and `expiresAt` to the corresponding signed payload values; SHALL set `creatorKeyId` from the compact JWS protected-header `kid`; and SHALL set `recipientKeyId` from `KioskRequestPayload.encryptRequestTo.keyId`. A Phone presenter SHALL bind the Pointer URL `#r` value, provider row `requestId` where present, envelope `requestId`, and verified payload `requestId` by exact equality before same-device re-entry.

The request-envelope recipient key and the response-submission desktop key are different key roles. The request-envelope recipient is identified by `encryptRequestTo.keyId` / `recipientKeyId`. The response-submission recipient is the signed `encryptResponseTo.desktopPublicKeyJwk`. Neither role is the §8 HPKE recipient key in `encryptionInfo`.

### C.k5 Provider request row abstraction

The provider request row is a relay lookup shape, not a clinical object and not a trust anchor. The active InstantDB row is equivalent to:

```cddl
; Provider abstraction, not complete InstantDB schema.
KioskRequestRow = {
  "requestId": kiosk-request-id,
  "encryptedRequest": EncryptedKioskRequest,
  * provider-local-member => json-value
}
```

The current InstantDB schema stores `requests.requestId` and `requests.encryptedRequest` (`rp-web/src/instant/schema.ts` lines 10-13). Permission rules gate reads/writes by a caller-supplied known request id and allow only these request-row fields (`rp-web/instant.perms.ts` lines 28-41). These provider controls are defense in depth. They do not replace request-envelope encryption, compact JWS verification, payload validation, or request-id binding.

### C.k6 `SubmissionPlaintext`

`SubmissionPlaintext` is the phone-to-desktop plaintext encrypted after §9.7 and phone-local §8 processing have produced a valid SMART response for submission.

```cddl
; Pseudo-CDDL / JSON shape guidance only.
SubmissionPlaintext = {
  "requestId": kiosk-request-id,
  "submittedAt": unix-time-ms-number,
  "payload": SubmissionPayload,
  * json-member => json-value
}

SubmissionPayload = SmartResponseSubmissionPayload / ExtensionSubmissionPayload

SmartResponseSubmissionPayload = {
  "kind": "smart-health-checkin-response",
  "smartResponse": SmartHealthCheckinResponse,
  * json-member => json-value
}
```

For the active successful payload, `payload.kind` SHALL be `"smart-health-checkin-response"` and `payload.smartResponse` SHALL be a §6 `SmartHealthCheckinResponse`. `SubmissionPlaintext.requestId` is the kiosk wrapper id. `payload.smartResponse.requestId` is the embedded SMART request id (`KioskRequestPayload.smartRequest.id`).

A Phone presenter SHALL enforce `KioskRequestPayload.constraints.maxPlaintextBytes` against the exact UTF-8 JSON bytes it encrypts. The active implementation uses the same deterministic key-sorted JSON routine for this plaintext byte count and encryption input (`rp-web/src/kiosk/protocol.ts` lines 306-339 and 556-570). That rule is scoped to the kiosk response-submission wrapper and does not canonicalize the clinical SMART response outside this wrapper.

### C.k7 Response-submission ciphertext and submission row metadata

The response-submission ciphertext is distinct from `EncryptedKioskRequest` and from §8 HPKE. The active provider stores raw ciphertext bytes as an `application/octet-stream` blob and stores row metadata needed to find and decrypt that blob.

```cddl
; Provider abstraction, not complete InstantDB or Instant Storage schema.
KioskSubmissionRow = {
  "submissionId": non-empty-string,
  "requestId": kiosk-request-id,
  "storagePath": storage-path-string,
  "storageFileId": non-empty-string,
  "iv": base64url-96-bit-iv,
  "phoneEphemeralPublicKeyJwk": P256PublicJwk,
  * provider-local-member => json-value
}

storage-path-string = "submissions/" kiosk-request-id "/" submissionId ".bin"
```

For this response-submission suite:

```text
ECDH shared secret = ECDH(phone ephemeral P-256 private key,
                         signed desktop P-256 public key)
HKDF hash          = SHA-256
HKDF salt          = utf8(KioskRequestPayload.requestId)
HKDF info          = utf8("smart-health-checkin-kiosk-response-v1")
AES-GCM key length = 256 bits
AES-GCM IV         = fresh 96-bit IV, encoded as unpadded base64url in row "iv"
AES-GCM AAD        = utf8(KioskRequestPayload.requestId)
plaintext          = UTF8(deterministic-json(SubmissionPlaintext))
blob bytes         = AES-GCM ciphertext plus tag
blob content type  = application/octet-stream
```

The active row fields and storage path are implemented in `rp-web/src/kiosk/instant-mailbox.ts` lines 49-90 and `rp-web/src/instant/schema.ts` lines 14-21. The provider permission profile validates row fields and `submissions/<requestId>/<submissionId>.bin` path shape as defense in depth (`rp-web/instant.perms.ts` lines 43-61). The provider row is not Holder consent, patient identity, SMART response validity, §8 validation evidence, mdoc issuer/device trust, clinical-source provenance, or downstream authorization.

A Completion display SHALL bind each candidate row to the expected wrapper `requestId`, validate the storage-path convention when the selected provider defines one, download bounded ciphertext bytes, decode row `iv`, import row `phoneEphemeralPublicKeyJwk` as a P-256 ECDH public key, decrypt with the response-submission construction above, and reject the candidate if decrypted `SubmissionPlaintext.requestId` does not exactly equal the active wrapper `requestId`.

### C.k8 Distinguishing the three cryptographic contexts

A fixture or conformance test that includes kiosk material should label each cryptographic context explicitly:

| Context | Plaintext | Recipient public key | KDF/AEAD | Salt / AAD | Info |
| --- | --- | --- | --- | --- | --- |
| §8 same-device HPKE | CBOR `DeviceResponse` | §8 `encryptionInfo.recipientPublicKey` COSE_Key | DHKEM(P-256, HKDF-SHA256), HKDF-SHA256, AES-128-GCM | empty AAD; no kiosk wrapper salt | `SessionTranscript` bytes |
| §9 request envelope | UTF-8 compact kiosk request JWS | request-opening P-256 JWK identified by `encryptRequestTo.keyId` / `recipientKeyId` | ECDH P-256 + HKDF-SHA-256 + AES-256-GCM | `utf8(wrapper requestId)` | `smart-health-checkin-kiosk-request-v1` |
| §9 response submission | UTF-8 deterministic JSON `SubmissionPlaintext` | signed `encryptResponseTo.desktopPublicKeyJwk` | ECDH P-256 + HKDF-SHA-256 + AES-256-GCM | `utf8(wrapper requestId)` | `smart-health-checkin-kiosk-response-v1` |

A kiosk pointer, provider row, encrypted request envelope, or compact kiosk request JWS SHALL NOT carry inline §8 `deviceRequest`, §8 `encryptionInfo`, `SessionTranscript`, §8 HPKE ciphertext, `dcapiResponse`, or Wallet response bytes.

## Appendix D additions: kiosk fixture and vector index material

Appendix D owns authoritative fixture classification. The repository currently contains strong same-device request/response fixtures and active kiosk implementation tests, but it does not contain a complete deterministic kiosk JWS / encrypted request / encrypted submission vector set.

### D.k1 Current checked-in material relevant to kiosk

| Path | Classification for kiosk Appendix D | Rationale |
| --- | --- | --- |
| `rp-web/src/kiosk/protocol.ts` | Active prototype evidence, not a fixture | Defines current kiosk wrapper TypeScript shapes, constants, deterministic JSON helper, compact JWS creation/verification, request-envelope encryption/opening, response-submission encryption/decryption, pointer parsing, and base64url helpers. Cite for implementation evidence, not as a normative vector. |
| `rp-web/src/kiosk/kiosk-provider.ts` | Active prototype evidence, not a fixture | Defines provider abstractions, request/submission row TypeScript types, request initiation/resolution, completion, opening, and row filtering. |
| `rp-web/src/kiosk/instant-mailbox.ts` and `rp-web/src/instant/schema.ts` | Active provider example / diagnostic schema evidence | Shows the current InstantDB request row, submission row, storage path, storage content type, and size guards. This is an implementation profile example, not a complete InstantDB schema requirement. |
| `rp-web/instant.perms.ts` | Active provider defense-in-depth example | Shows rule-param and field/path gating for the prototype relay. It is useful for implementation notes and negative tests but is not the root of kiosk security. |
| `rp-web/src/kiosk/kiosk-provider.test.ts` | Diagnostic test, not an Appendix D byte vector | Verifies pointer-only URL behavior, absence of clinical strings in stored encrypted request JSON, direct `smartRequest` embedding, active successful payload kind, wrapper request-id binding, and no submitted `dcapiResponse` / `deviceResponse` strings. It does not record deterministic JWS, IV, ciphertext, or row/blob fixture bytes. |
| `rp-web/src/kiosk/demo-keys.ts` | Prototype/diagnostic key material only | Contains intentionally checked-in demo P-256 keys with an explicit “DEMO ONLY” warning. These keys can support future fixtures only when fixture metadata marks them public test-only keys that unlock no PHI. |
| `rp-web/src/kiosk/creator-main.tsx` and `rp-web/src/kiosk/submit-main.tsx` | Active UI evidence, not normative fixture material | Demonstrate current QR creation, request resolution, same-device re-entry, successful payload construction, encrypted submission, and desktop display. UI behavior and debug panels are not conformance artifacts. |
| `docs/plans/kiosk-transport-row-slim.md` | Historical design note with current row-shape evidence | Documents why slim rows are used and names the current request/submission row fields. It is useful context but not normative. |
| `docs/plans/kioskmode-transport.md` and `docs/plans/kioskmode-transport.addendum.md` | Historical planning material | These files contain older field names such as `routeId`, `sessionId`, `certHash`, and inline-ciphertext rows. They should not be cited as current protocol shape except where their own status notes identify them as historical. |
| `docs/SMART-HEALTH-CHECKIN-REQUEST-RESPONSE.md` | Legacy/current model support, not kiosk vector | Its transport-constraints note says kiosk advertises `constraints.maxPlaintextBytes` and the Instant-backed transport enforces it. The detailed clinical model is superseded by canonical §§5-6 for this spec draft. |
| `fixtures/dcapi-requests/ts-smart-checkin-basic/` | Same-device synthetic request fixture; historical/diagnostic for kiosk | Useful for §8 re-entry and SMART request carriage, but it is not a kiosk pointer/JWS/envelope/submission vector. |
| `fixtures/dcapi-requests/ts-smart-checkin-readerauth/` | Same-device synthetic readerAuth fixture; historical/diagnostic for kiosk | Useful for §8 phone-local request construction after kiosk resolution; not a kiosk wrapper vector. |
| `fixtures/dcapi-requests/real-chrome-android-smart-checkin/` | Current same-device real-platform capture; diagnostic for kiosk until refreshed kiosk capture exists | Metadata identifies a real Chrome/Android Credential Manager SMART Health Check-in request with demo data and no PHI. It supports §8 compatibility, not cross-device request-envelope or submission behavior. |
| `fixtures/responses/real-chrome-android-smart-checkin/` | Current same-device real-platform response capture; diagnostic for kiosk until refreshed kiosk capture exists | Metadata identifies matching real Android wallet response artifacts. It is current enough for same-device §8 response byte review, but it does not include kiosk request JWS, encrypted request row, pointer URL, response-submission ciphertext, or provider rows. |
| `fixtures/responses/pymdoc-minimal/` | Normative-style same-device byte fixture; not kiosk material | Useful for Appendix C/D same-device mdoc byte boundaries. It should not be described as a kiosk vector. |
| `fixtures/captures/2026-04-30-mattr-safari-org-iso-mdoc/` | Historical external capture | Metadata says it uses mDL doctype/namespace and informed envelope adoption. It is not a SMART Health Check-in kiosk fixture. |
| `wallet-android/app/src/test/resources/test-vectors.json` and `wallet-android/app/matcher-rs/fixtures/smart-checkin-request.json` | Android same-device / matcher test material; diagnostic for kiosk re-entry only | Useful to prove Android-side same-device request parsing and matcher behavior. They do not cover kiosk JWS/envelope/submission rows. |

### D.k2 Normative examples versus prototype diagnostics

For the kiosk cutpoint, Appendix D should currently say:

1. **Normative kiosk byte vectors:** none checked in yet. The pseudo-CDDL above is suitable for schema and fixture generation, but the repository lacks stable byte-level kiosk vectors with recorded keys, IVs, signing input, ciphertext, pointer URL, rows, blob bytes, and expected negative outcomes.
2. **Normative same-device examples reused by kiosk re-entry:** same-device fixtures already identified by T3.D remain the source for §8 byte-boundary review. Kiosk text may reference them to explain phone-local re-entry, but not as kiosk-wrapper vectors.
3. **Prototype/diagnostic kiosk material:** active `rp-web/src/kiosk/*`, InstantDB schema/permissions, and `kiosk-provider.test.ts` demonstrate current behavior and should be labeled prototype or diagnostic unless promoted into deterministic fixture directories with manifests.
4. **Historical captures/plans:** older captures and planning files should remain historical or diagnostic where metadata says they predate the current wrapper. They must not be promoted as current kiosk vectors without regeneration.

The existing Chrome/Android SMART Health Check-in capture appears current enough to cite for the same-device §8 real-platform request/response path because metadata records the active `org.smarthealthit.checkin.1` document type, stable element, readerAuth presence, no PHI, and matching request/response capture time. It is not current enough to cite as a kiosk full-flow capture, because it predates or omits the kiosk Pointer URL, compact kiosk request JWS, `EncryptedKioskRequest`, provider request row, response-submission ciphertext, submission row, and storage blob. It should remain a same-device real-platform diagnostic/normative-support capture for kiosk re-entry until a refreshed end-to-end kiosk capture is produced.

### D.k3 Recommended future kiosk fixture vectors

A future `fixtures/kiosk/` or equivalent Appendix D subtree should contain deterministic, manifest-described vectors for at least these cases:

| Vector | Expected contents |
| --- | --- |
| Deterministic JWS signing input | Protected header JSON, payload JSON, base64url segments, signing input, public test key, signature, compact JWS, and verification result. If ECDSA randomness prevents deterministic regeneration, record the signature and identify the signing implementation. |
| Encrypted request envelope | Compact JWS plaintext bytes, recipient public/private test JWKs, sender ephemeral public/private test JWKs or recorded ephemeral public JWK, IV, HKDF salt/info, AAD, ciphertext/tag, full `EncryptedKioskRequest`, and expected decrypted payload. |
| Pointer URL | `submit.html#r=<requestId>` example proving the QR/pointer contains no plaintext SMART request, no compact JWS, no encrypted envelope, no §8 `deviceRequest`, and no `encryptionInfo`. |
| Phone resolution | Provider request row plus envelope plus keys plus expected verified `KioskRequestPayload`; includes equality checks for pointer, row, envelope, and signed payload `requestId`. |
| Response submission encryption/decryption | `SubmissionPlaintext`, deterministic JSON bytes, signed `constraints.maxPlaintextBytes`, desktop public/private test JWKs, phone ephemeral public/private test JWKs or recorded public JWK, IV, HKDF salt/info, AAD, ciphertext/blob bytes, row metadata, and decrypted result. |
| Wrong requestId / AAD failures | Mutate pointer `r`, request row `requestId`, envelope `requestId`, payload `requestId`, submission row `requestId`, decrypted `SubmissionPlaintext.requestId`, storage path prefix, and AES-GCM AAD. Each mutation should fail at the named processing step. |
| Expired request | Signed and envelope timestamps with `expiresAt` before validation time, plus expected rejection before Wallet invocation and before successful submission acceptance. |
| Oversized plaintext/blob | A plaintext exceeding signed `constraints.maxPlaintextBytes`, and a blob exceeding local blob-size guard, with expected fail-closed behavior and no successful row write or no accepted row. |
| Malformed row/JWK/IV | Missing row fields, non-string `iv`, invalid base64url `iv`, wrong IV length, missing or non-P-256 JWK, bad JWK coordinates, wrong `kty`/`crv`, and unknown key id cases. |
| Duplicate rows | Two rows for one wrapper `requestId`, including identical replay and conflicting submissions, showing single-use/quarantine/ignore policy hooks without relying on provider ordering as clinical evidence. |
| No plaintext leakage | Machine-checkable assertions that Pointer URL, provider request row JSON, `EncryptedKioskRequest`, submission row JSON, storage path, and blob bytes do not contain known clinical strings from the SMART request or SMART response. |
| Distinct crypto contexts | A combined vector showing §8 HPKE ciphertext cannot be opened with kiosk response-submission rules, and kiosk request/response ciphertexts cannot be swapped because HKDF info, key roles, and AAD differ. |

Each future vector manifest should include `containsPhi: false`, fixture purpose, source command or capture procedure, public-test-key warning, byte hashes for binary artifacts, expected positive/negative outcomes, and links to the §9 and Appendix C rules it exercises.

### D.k4 Stable prerequisites for a refreshed kiosk capture

A refreshed end-to-end kiosk capture should be requested only after §8, §9, §16.6, and Appendix D expectations are stable. The capture should use demo data only and should produce these stable outputs:

1. Kiosk creator inputs: SMART request JSON, creator signing public/private test JWKs, request-opening public/private test JWKs, desktop response public/private test JWKs, provider app id, fixed or recorded `now`, and fixture metadata marking all private keys as public test-only keys.
2. Signed request artifacts: protected header JSON, deterministic payload JSON, base64url header/payload, signing input, compact JWS, JWS public verification result, and parsed `KioskRequestPayload`.
3. Request-envelope artifacts: ephemeral request-envelope public key, IV, HKDF info/salt/AAD labels, ciphertext/tag, full `EncryptedKioskRequest`, provider request row, and Pointer URL.
4. Phone-resolution artifacts: pointer parse result, request row read result, decrypted JWS, verified payload, embedded `smartRequest`, and proof that a fresh §8 request was constructed on the phone rather than carried in the QR.
5. Same-device phone-local artifacts: either references to existing §8 fixture machinery or a fresh `DeviceRequest`, `encryptionInfo`, `SessionTranscript`, Wallet result, `dcapiResponse`, opened `DeviceResponse`, extracted SMART response, and §6/§8 validation report.
6. Response-submission artifacts: `SubmissionPlaintext`, deterministic plaintext bytes, phone ephemeral public JWK, IV, HKDF info/salt/AAD labels, ciphertext blob bytes, submission row, storage path, and desktop decryption/validation report.
7. Negative cases or generated mutations for the wrong-id, expired, malformed, oversized, duplicate, and plaintext-leakage checks listed above.

Until those outputs exist, Appendix D should avoid claiming byte-level kiosk interop vectors are available.

## Organizer notes

### Strengths

- Aligns Appendix C with accepted T4.A/T4.B/T4.C field names and crypto labels while keeping pseudo-CDDL clearly scoped.
- Keeps `KioskRequestPayload.requestId`, provider row ids, and `smartRequest.id` distinct throughout.
- Separates request-envelope crypto, response-submission crypto, and §8 HPKE in a single comparison table.
- Classifies current repository evidence conservatively and avoids promoting prototype tests or historical plans into normative vectors.

### Caveats

- The active repo has no checked-in deterministic kiosk JWS/envelope/submission vectors, so the draft cannot provide byte-level hashes, fixed IVs, fixed ephemeral keys, or ciphertext examples without inventing them.
- Active demo private keys are checked in intentionally, but they should only be reused in Appendix D if fixture metadata marks them public test-only material and confirms no PHI.
- Active `assertSubmissionPlaintext` does not enforce numeric `submittedAt`, although T4.C canonical requires numeric `submittedAt`; Appendix C follows the accepted canonical rather than the looser runtime assertion.

### Open issues

- Decide final Appendix D path names for kiosk vectors, such as `fixtures/kiosk/request-jws-basic/`, `fixtures/kiosk/encrypted-request-basic/`, and `fixtures/kiosk/response-submission-basic/`.
- Decide whether Appendix C should include JSON Schema snippets in addition to pseudo-CDDL, or whether Appendix B remains limited to transport-neutral clinical request/response schemas.
- Decide whether exact mirrored metadata checks for envelope `createdAt`, `expiresAt`, `creatorKeyId`, and `recipientKeyId` become core fixture requirements or deployment-profile requirements.
- Decide how a future full kiosk capture records phone-local §8 validation evidence when the active successful submission payload carries only `smartResponse` and not raw §8 artifacts.

### Downstream dependencies

- §11 and §12 should reuse the no-plaintext-leakage, metadata-minimization, demo-key, and untrusted-relay notes without changing Appendix C shapes.
- §13 should register or stabilize the kiosk JWS `typ`, request-envelope content type, algorithm labels, and submission payload-kind registry if the final spec creates one.
- §16.6 should wait for or explicitly mark the absence of a refreshed full kiosk byte ladder.
- T6.C / final Appendix D should update this classification after deterministic kiosk fixture directories are generated and checked in.

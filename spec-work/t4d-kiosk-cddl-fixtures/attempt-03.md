# T4.D attempt 03: kiosk pseudo-CDDL and fixture material

This draft supplies Appendix C and Appendix D material for the kiosk wrapper portions of SMART Health Check-in 1.0. It assumes the accepted T4.A/T4.B/T4.C text: the kiosk flow is a wrapper around the same-device §8 flow; `KioskRequestPayload.smartRequest` embeds the §5 SMART request directly; the Pointer URL is pointer-only with `#r=<requestId>`; and the relay/provider is untrusted.

The snippets below are profile pseudo-CDDL / JSON shape guidance. They are not complete JOSE, JWK, JSON Schema, ISO/IEC 18013-5, InstantDB, or storage-service schemas. If this appendix conflicts with §§5-9, the body text controls.

## Appendix C additions: kiosk pseudo-CDDL and profile constraints

### C.10 Kiosk notation and fixed values

Appendix C.1 notation applies. The kiosk wrapper uses JSON and compact JWS rather than CBOR for the wrapper artifacts described here. The following names are editorial labels for profile shapes, not registered on-the-wire type names unless the associated string value is explicitly shown.

```text
kiosk-request-jws-typ       = "smart-health-checkin+kiosk-request+jws"
kiosk-wrapper-alg           = "ECDH-P256+HKDF-SHA256+AES-GCM"
kiosk-request-enc           = "A256GCM"
kiosk-request-content-type  = "application/smart-health-checkin-kiosk-request+jws+aesgcm"
kiosk-request-hkdf-info     = "smart-health-checkin-kiosk-request-v1"
kiosk-response-hkdf-info    = "smart-health-checkin-kiosk-response-v1"
kiosk-success-payload-kind  = "smart-health-checkin-response"
kiosk-blob-content-type     = "application/octet-stream"
```

For fields defined as `b64u`, the value is base64url without padding. Numeric timestamp fields in the active profile are JSON numbers containing milliseconds since the Unix epoch. Public JWK placeholders below mean P-256 public keys with at least `kty: "EC"`, `crv: "P-256"`, and base64url coordinate fields `x` and `y`; public JWKs in protocol artifacts do not include private member `d`.

The active TypeScript implementation evidence for these constants and shapes is in `rp-web/src/kiosk/protocol.ts:3-83`, with request creation and envelope encryption in `rp-web/src/kiosk/protocol.ts:138-229`, request opening in `rp-web/src/kiosk/protocol.ts:232-304`, and response-submission encryption in `rp-web/src/kiosk/protocol.ts:306-367`.

### C.11 Compact kiosk request JWS

A kiosk request JWS is a compact JWS with exactly three non-empty base64url segments:

```text
kiosk-request-jws = b64u(protected-header-json) "." b64u(payload-json) "." b64u(es256-signature)
```

The protected header is constrained to:

```cddl
; Pseudo-CDDL for the JSON protected header after base64url decoding.
kiosk-request-jws-header = {
  "alg" => "ES256",
  "kid" => non-empty-tstr,
  "typ" => "smart-health-checkin+kiosk-request+jws",
  * tstr => any
}
```

For this profile, the signing input is:

```text
base64url(utf8(deterministic-json(protected-header))) || "." ||
base64url(utf8(deterministic-json(KioskRequestPayload)))
```

The deterministic JSON rule for the kiosk request JWS recursively sorts object member names lexicographically, omits members whose value is `undefined`, preserves array order, and serializes with JSON stringification before UTF-8 encoding. This rule applies to the kiosk-wrapper JWS input only. It does not define canonical JSON for the transport-neutral SMART request or SMART response outside the signed kiosk wrapper.

The JWS signature authenticates the wrapper payload under deployment Kiosk creator trust policy. It does not by itself prove Holder consent, patient identity, requester identity through display fields, mdoc issuer/device trust, clinical-source provenance, or downstream authorization.

### C.12 `KioskRequestPayload`

`KioskRequestPayload` is the signed JSON object carried as the compact JWS payload. It binds wrapper routing, request-envelope encryption metadata, response-submission encryption metadata, provider routing metadata, and one embedded SMART request.

```cddl
; Pseudo-CDDL / JSON shape guidance, not complete JSON Schema.
kiosk-request-payload = {
  "v" => 1,
  "iss" => non-empty-tstr,
  "aud" => non-empty-tstr,
  "requestId" => non-empty-tstr,
  "createdAt" => epoch-ms-number,
  "expiresAt" => epoch-ms-number,
  "submitTo" => kiosk-submit-to,
  "smartRequest" => smart-health-checkin-request-json-object,
  "encryptRequestTo" => kiosk-encrypt-request-to,
  "encryptResponseTo" => kiosk-encrypt-response-to,
  "constraints" => kiosk-constraints,
  "minter" => kiosk-minter,
  * tstr => any
}

kiosk-submit-to = {
  "backend" => "instantdb",          ; active provider shape
  "appId" => non-empty-tstr,
  * tstr => any
}

kiosk-encrypt-request-to = {
  "alg" => "ECDH-P256+HKDF-SHA256+AES-GCM",
  "keyId" => non-empty-tstr,
  * tstr => any
}

kiosk-encrypt-response-to = {
  "alg" => "ECDH-P256+HKDF-SHA256+AES-GCM",
  "desktopPublicKeyJwk" => p256-ecdh-public-jwk,
  * tstr => any
}

kiosk-constraints = {
  "maxPlaintextBytes" => non-negative-safe-json-integer,
  * tstr => any
}

kiosk-minter = {
  "keyId" => non-empty-tstr,
  * tstr => any
}
```

`smartRequest` is the complete `SmartHealthCheckinRequest` object defined in §5. It is not a request-profile wrapper, demo preset, IPS shortcut, broad “all of the above” selector, SDK helper object, pointer descriptor, inline §8 `DeviceRequest`, or inline §8 `encryptionInfo`.

`requestId` is the kiosk wrapper identifier. It is distinct from `smartRequest.id`; the SMART response later echoes `smartRequest.id` as `SmartHealthCheckinResponse.requestId`. `constraints.maxPlaintextBytes` is signed metadata enforced over the exact serialized `SubmissionPlaintext` bytes before response-submission encryption. `encryptResponseTo.desktopPublicKeyJwk` is used only for the phone-to-desktop response-submission leg, not for §8 HPKE and not for request-envelope opening.

### C.13 `EncryptedKioskRequest`

`EncryptedKioskRequest` is the JSON envelope stored or served for phone pickup. Its plaintext is the compact kiosk request JWS UTF-8 text, not the unsigned payload alone and not the raw `smartRequest` alone.

```cddl
; Pseudo-CDDL / JSON shape guidance, not complete JSON Schema.
encrypted-kiosk-request = {
  "v" => 1,
  "alg" => "ECDH-P256+HKDF-SHA256+AES-GCM",
  "enc" => "A256GCM",
  "contentType" => "application/smart-health-checkin-kiosk-request+jws+aesgcm",
  "requestId" => non-empty-tstr,
  "createdAt" => epoch-ms-number,
  "expiresAt" => epoch-ms-number,
  "creatorKeyId" => non-empty-tstr,
  "recipientKeyId" => non-empty-tstr,
  "iv" => b64u-96-bit-iv,
  "ciphertext" => b64u-aes-gcm-ciphertext-and-tag,
  "ephemeralPublicKeyJwk" => p256-ecdh-public-jwk,
  * tstr => any
}
```

Request-envelope encryption is:

```text
ECDH P-256 shared secret = ECDH(ephemeral request private key, request-opening public key)
HKDF-SHA-256 salt        = utf8(KioskRequestPayload.requestId)
HKDF-SHA-256 info        = utf8("smart-health-checkin-kiosk-request-v1")
AES-GCM key length       = 256 bits
AES-GCM IV               = base64url-decode(EncryptedKioskRequest.iv)
AES-GCM AAD              = utf8(KioskRequestPayload.requestId)
plaintext                = compact kiosk request JWS UTF-8 text
```

The Kiosk creator sets envelope `requestId`, `createdAt`, and `expiresAt` to the corresponding signed payload values; sets `creatorKeyId` from the JWS protected-header `kid`; and sets `recipientKeyId` from `KioskRequestPayload.encryptRequestTo.keyId`. A Phone presenter binds the Pointer URL fragment `r`, provider row `requestId` when present, `EncryptedKioskRequest.requestId`, and verified `KioskRequestPayload.requestId` by exact string equality before re-entering §8.

This request-envelope construction is distinct from both §8 HPKE and the response-submission encryption in C.15. The request envelope uses AES-256-GCM with custom ECDH/HKDF inputs and a compact JWS plaintext. Section 8 HPKE uses the direct `dcapi` `SessionTranscript` as HPKE `info`, AES-128-GCM, and a CBOR `DeviceResponse` plaintext. Response submission uses the signed desktop public JWK and `smart-health-checkin-kiosk-response-v1` as HKDF info.

### C.14 Provider request row abstraction

A provider request row is a relay lookup abstraction. The active row shape is equivalent to:

```cddl
kiosk-request-provider-row = {
  "requestId" => non-empty-tstr,
  "encryptedRequest" => encrypted-kiosk-request,
  * tstr => any
}
```

The row is routing metadata and encrypted state. A Submission service may index or clean up by row metadata, but it is not trusted to see plaintext `KioskRequestPayload`, plaintext `smartRequest`, private keys, or clinical trust evidence. Active InstantDB code stores `requestId` and `encryptedRequest` in `rp-web/src/kiosk/instant-mailbox.ts:13-31`, and the provider contract exposes request read/write behavior in `rp-web/src/kiosk/kiosk-provider.ts:48-65`.

### C.15 `SubmissionPlaintext`

After §9.7 phone resolution and phone-local §8 processing, the Phone presenter constructs a response-submission plaintext for the kiosk return leg. For the active successful SMART-response completion profile:

```cddl
; Pseudo-CDDL / JSON shape guidance, not complete JSON Schema.
submission-plaintext = {
  "requestId" => non-empty-tstr,      ; kiosk wrapper requestId
  "submittedAt" => epoch-ms-number,
  "payload" => submission-success-payload / extension-submission-payload,
  * tstr => any
}

submission-success-payload = {
  "kind" => "smart-health-checkin-response",
  "smartResponse" => smart-health-checkin-response-json-object,
  * tstr => any
}
```

`SubmissionPlaintext.requestId` is the kiosk wrapper `KioskRequestPayload.requestId`, not `smartRequest.id`, not `SmartHealthCheckinResponse.requestId`, not a provider row id, and not a §8 presentation-session id. For the active success payload, `payload.smartResponse.requestId` equals `KioskRequestPayload.smartRequest.id` and is validated under §6 and §6.6.

The active implementation serializes `SubmissionPlaintext` as deterministic key-sorted JSON before byte counting and encryption, using the same recursive object-key sort, `undefined` omission, array-order preservation, and JSON stringification rule described for the kiosk JWS. In this context the rule defines the bytes encrypted for the kiosk response-submission wrapper only; it does not define canonical JSON for the SMART response outside the wrapper.

The active success payload does not include plaintext §8 `DeviceResponse` CBOR, Digital Credentials API `dcapiResponse`, §8 HPKE `enc` or `cipherText`, §8 `deviceRequest`, §8 `encryptionInfo`, request-opening private keys, desktop private keys, Wallet secrets, provider credentials, or unrelated diagnostics. The active payload construction is evidenced by `rp-web/src/kiosk/submit-main.tsx:269-279` and by `rp-web/src/kiosk/kiosk-provider.test.ts:80-108`.

### C.16 Response-submission encryption and submission row metadata

The response-submission ciphertext is a kiosk wrapper artifact. It is distinct from §8 HPKE ciphertext, from `EncryptedKioskRequest`, and from the transport-neutral SMART response.

Response-submission encryption is:

```text
ECDH P-256 shared secret = ECDH(phone ephemeral private key, KioskRequestPayload.encryptResponseTo.desktopPublicKeyJwk)
HKDF-SHA-256 salt        = utf8(KioskRequestPayload.requestId)
HKDF-SHA-256 info        = utf8("smart-health-checkin-kiosk-response-v1")
AES-GCM key length       = 256 bits
AES-GCM IV               = row.iv or equivalent base64url field
AES-GCM AAD              = utf8(KioskRequestPayload.requestId)
plaintext                = SubmissionPlaintext UTF-8 JSON bytes
ciphertext               = AES-GCM ciphertext including authentication tag
```

The active provider stores ciphertext bytes as an opaque `application/octet-stream` blob and carries decryption metadata in a slim row equivalent to:

```cddl
kiosk-submission-provider-row = {
  "submissionId" => non-empty-tstr,
  "requestId" => non-empty-tstr,
  "storagePath" => non-empty-tstr,
  "storageFileId" => non-empty-tstr,
  "iv" => b64u-96-bit-iv,
  "phoneEphemeralPublicKeyJwk" => p256-ecdh-public-jwk,
  * tstr => any
}
```

For the active storage convention, `storagePath` is `submissions/<requestId>/<submissionId>.bin`. The provider row and blob locator are routing metadata. They are not Holder consent, patient identity, SMART response validity, mdoc issuer/device trust, clinical-source provenance, or downstream authorization.

A Completion display decrypts with the desktop private key corresponding to the signed `encryptResponseTo.desktopPublicKeyJwk`, checks decrypted `SubmissionPlaintext.requestId` against the active wrapper `requestId`, validates `payload.smartResponse` under §6 and §6.6 against the original embedded SMART request, and accounts for §8 validation before clinical workflow use. Active row/blob behavior is evidenced by `rp-web/src/kiosk/instant-mailbox.ts:49-117`, row filtering by `rp-web/src/kiosk/kiosk-provider.ts:214-222`, and prototype display behavior by `rp-web/src/kiosk/creator-main.tsx:262-355`.

### C.17 Provider capabilities abstraction

A kiosk provider used by the active flow provides capabilities equivalent to:

```cddl
kiosk-provider-capabilities = {
  "writeEncryptedRequest" => capability,
  "readEncryptedRequest" => capability,
  "writeEncryptedSubmission" => capability,
  "downloadSubmissionBlob" => capability,
  "observeSubmissionRows" => capability,
  * tstr => any
}
```

Programming-language method names, database products, object stores, queues, webhooks, polling endpoints, and local-network transports are not protocol-visible requirements. What matters for the profile is that the provider can route opaque encrypted request state by wrapper `requestId`, route opaque encrypted submission state by wrapper `requestId`, provide the IV and phone ephemeral public JWK needed for local decryption, and avoid requiring plaintext clinical content or private key material.

The active TypeScript adapter names these capabilities `writeRequest`, `readRequest`, `writeSubmission`, `downloadSubmissionBlob`, and `useSubmissionRows` (`rp-web/src/kiosk/kiosk-provider.ts:48-65`).

### C.18 Pseudo-CDDL support definitions

These support names are intentionally approximate. Complete definitions belong to JSON Schema, JOSE/JWK specifications, WebCrypto/COSE/HPKE specifications, provider profiles, and future conformance-vector manifests.

```cddl
non-empty-tstr = tstr .size (1..)
epoch-ms-number = number
non-negative-safe-json-integer = number
b64u-96-bit-iv = tstr              ; base64url without padding, decodes to 12 bytes
b64u-aes-gcm-ciphertext-and-tag = tstr
p256-ecdh-public-jwk = json-object ; kty EC, crv P-256, x/y base64url, no private d
smart-health-checkin-request-json-object = json-object
smart-health-checkin-response-json-object = json-object
extension-submission-payload = json-object
capability = any
json-object = { * tstr => any }
```

Appendix C does not define duplicate-member policy, complete JWK validation, complete base64url rejection behavior, provider authorization, production key custody, clock-skew windows, or final registry entries. Those are conformance, security, privacy, registry, deployment-profile, or fixture-manifest concerns.

## Appendix D additions: kiosk fixture index and future vectors

### D.9 Kiosk fixture status and classification

Appendix D.1 classification applies. A checked-in artifact is not a normative conformance vector merely because it exists. For kiosk material, this draft uses the following conservative classifications:

| Material | Classification | Use and caveats |
| --- | --- | --- |
| `rp-web/src/kiosk/protocol.ts` | Implementation evidence / implementation regression source | Defines active prototype constants and algorithms for request JWS creation, encrypted request envelopes, pointer parsing, response-submission encryption, base64url helpers, and deterministic JSON. It is code evidence, not a published fixture vector. |
| `rp-web/src/kiosk/kiosk-provider.ts` and `rp-web/src/kiosk/instant-mailbox.ts` | Implementation evidence / provider-profile example | Shows active provider abstraction and InstantDB/Instant Storage row/blob shapes. It does not make InstantDB or these exact programming names universal. |
| `rp-web/src/kiosk/kiosk-provider.test.ts` | Implementation regression | Exercises pointer-only URLs, opaque encrypted request storage, direct `smartRequest`, response submission opening, wrapper `requestId` binding, active payload kind, and absence of raw `dcapiResponse` / `deviceResponse` in the submitted payload. It is not a byte-stable public conformance vector. |
| `rp-web/src/kiosk/demo-keys.ts` | Prototype / diagnostic key material | Intentionally checked-in demo keys allow static prototype review. They are not production trust anchors and should be cited only as test-only or demo-only material. |
| `docs/plans/kiosk-transport-row-slim.md`, `docs/plans/kioskmode-transport.md`, and `docs/plans/kioskmode-transport.addendum.md` | Historical / design notes | Useful for understanding why rows are slim and why the relay is untrusted. They should not override accepted §9 text or active code. |
| `site/kiosk-flow-explainer.html` | Illustrative | May help readers understand the flow, but it is not a fixture oracle. |
| `fixtures/dcapi-requests/real-chrome-android-smart-checkin/` and `fixtures/responses/real-chrome-android-smart-checkin/` | Diagnostic real-platform same-device capture and historical kiosk dependency | Current enough to cite for §8 same-device request/response carriage, but not a current kiosk end-to-end fixture because they do not include the kiosk Pointer URL, compact kiosk request JWS, `EncryptedKioskRequest`, provider request row, response-submission plaintext, encrypted submission blob, or submission row. |
| `fixtures/captures/2026-04-30-mattr-safari-org-iso-mdoc/` | Historical capture | Direct mdoc capture material, not an active kiosk vector. |

There are no checked-in normative kiosk examples, kiosk JWS round-trip vectors, or deterministic kiosk byte fixtures in the current repository evidence. The existing Chrome/Android SMART Check-in captures should remain diagnostic/historical for kiosk purposes until a refreshed kiosk capture is produced after §8, §9, §16.6, and Appendix D expectations are stable. They may still be referenced from the same-device fixture sections for the §8 portion of a future kiosk byte ladder.

### D.10 Existing kiosk implementation-regression checks

The current implementation-regression test `rp-web/src/kiosk/kiosk-provider.test.ts` supports these non-normative observations:

1. the generated submit URL starts with `https://clinic.example/verifier/submit.html#r=` and does not include clinical display text;
2. the stored `encryptedRequest` JSON does not expose the test SMART request strings;
3. the resolved signed payload contains `smartRequest` directly and not legacy `request` or `presetId` wrappers;
4. the submitted successful payload uses `kind: "smart-health-checkin-response"`;
5. the decrypted submission top-level `requestId` equals the wrapper request id; and
6. the submitted payload does not contain raw `dcapiResponse` or `deviceResponse` strings.

These checks are valuable implementation regression coverage. They should not be promoted to normative conformance vectors until fixture manifests identify deterministic inputs, expected byte strings or semantic checks, validation policy, intentionally public key material, and expected failure behavior.

### D.11 Recommended future kiosk fixture roots

A future public kiosk fixture suite should add a dedicated root, for example `fixtures/kiosk/`, with separate positive and negative vector directories. Recommended vector classes are:

| Future vector | Purpose |
| --- | --- |
| Deterministic JWS signing input | Freeze protected-header JSON, payload JSON, base64url header, base64url payload, signing input, ES256 signature assumptions, and verified payload extraction. If nondeterministic ECDSA remains in use, compare signing input and verification result rather than a fixed signature. |
| Encrypted request envelope | Exercise `EncryptedKioskRequest` field validation, P-256 ECDH, HKDF salt `requestId`, info `smart-health-checkin-kiosk-request-v1`, AES-256-GCM IV/AAD, compact JWS plaintext, and content type `application/smart-health-checkin-kiosk-request+jws+aesgcm`. |
| Pointer URL | Confirm `#r=<requestId>` only; confirm absence of `smartRequest`, compact JWS, encrypted envelope, §8 `DeviceRequest`, §8 `encryptionInfo`, Wallet response, response submission, and secrets. |
| Phone resolution | Bind pointer `r`, provider request row `requestId`, envelope `requestId`, and signed payload `requestId`; verify creator JWS; validate direct embedded `smartRequest`; construct a fresh §8 request. |
| Response submission encryption/decryption | Freeze `SubmissionPlaintext` canonical bytes, signed `constraints.maxPlaintextBytes` enforcement, response-submission ECDH/HKDF/AES-GCM inputs, row metadata, blob content type, and desktop decryption result. |
| Wrong `requestId` / AAD failures | Show rejection when pointer, row, envelope, signed payload, AES-GCM AAD, decrypted plaintext, or inner SMART response request id is mismatched. |
| Expired request | Show rejection of expired `expiresAt`, unacceptable future `createdAt`, and stale completion outside allowed policy. |
| Oversized plaintext/blob | Show enforcement of signed `constraints.maxPlaintextBytes`, local plaintext limits, and blob-size guards before successful row write or decryption. |
| Malformed row/JWK/IV | Show rejection for missing row fields, malformed storage path, invalid base64url IV, wrong IV length, unacceptable P-256 JWK, private key leaked in a public JWK field, and unusable key material. |
| Duplicate rows | Show deterministic policy for repeated valid rows, replayed blobs, later submissions, and first-success workflow acceptance. |
| No plaintext leakage | Assert that Pointer URLs, request rows, encrypted envelopes, submission rows, blob metadata, logs, and diagnostic summaries do not contain raw SMART requests, raw SMART responses, FHIR resources, SMART Health Cards, `dcapiResponse`, `deviceResponse`, private keys, or secrets unless explicitly marked as intentionally public fixture material. |

Each vector directory should include a manifest stating fixture class, producer version, source commit, creation time, PHI status, intentionally public test keys, fixed or random inputs, byte-exact files, semantic checks, expected pass/fail result, and which §9 / Appendix C requirements it exercises.

### D.12 Refreshed kiosk capture prerequisites and expected outputs

A refreshed kiosk capture is needed before promoting any kiosk material beyond implementation-regression or diagnostic status. The stable prerequisites are:

1. §8 same-device byte boundaries, §9 kiosk wrapper fields, §16.6 worked example content, and Appendix D fixture classifications are stable;
2. the demo SMART request and expected SMART response used by the capture are frozen and contain no PHI;
3. creator signing keys, request-opening keys, desktop response-encryption keys, and any phone ephemeral keys used for deterministic vectors are test-only and explicitly marked, or the manifest states which outputs are nondeterministic;
4. the provider profile, provider app id, pointer base URL, origin, clock, TTL, and size limits are fixed for the vector; and
5. negative-vector policy for malformed, mismatched, duplicate, expired, and oversized cases is defined.

The refreshed capture should output, at minimum:

- `manifest.json` with classification, source commit, producer tools, PHI status, key status, and validation expectations;
- deterministic protected-header JSON, payload JSON, base64url header/payload, and compact JWS signing input;
- compact kiosk request JWS and verified decoded header/payload inspection;
- `EncryptedKioskRequest` JSON plus request-envelope IV, ephemeral public JWK, ciphertext, and decryption inspection;
- provider request row JSON;
- Pointer URL text and QR payload text showing only `#r=<requestId>` routing;
- phone-resolution inspection showing request-id bindings and direct `smartRequest` validation;
- the paired §8 request/response artifacts or references to a same-device fixture root when a real phone-local presentation is included;
- `SubmissionPlaintext` canonical JSON bytes and semantic JSON;
- response-submission row JSON, blob bytes, IV, phone ephemeral public JWK, blob content type, and desktop decryption inspection;
- negative vectors for wrong request id/AAD, expired request, oversized plaintext/blob, malformed row/JWK/IV, duplicate row, and plaintext-leakage scans.

Until such a capture exists, Appendix D should cite existing Chrome/Android captures only as same-device diagnostic evidence and should cite kiosk code/tests only as implementation evidence.

## Organizer notes

### Strengths

- Aligns Appendix C kiosk shapes with accepted T4.A/T4.B/T4.C field names, algorithm labels, content types, deterministic JSON rules, request/submission id bindings, and provider abstractions.
- Keeps request-envelope crypto, response-submission crypto, and §8 HPKE explicitly distinct.
- Conservatively classifies existing repository material: no current kiosk byte vectors are overstated as normative examples.
- Gives a concrete future fixture plan with positive and negative vectors and manifest expectations.

### Caveats

- The pseudo-CDDL intentionally does not attempt complete JOSE, JWK, JSON Schema, ISO/IEC 18013-5, InstantDB, or storage schema coverage.
- Active code accepts and emits demo issuer/audience/key values; this draft treats them as prototype evidence, not registry values or production trust anchors.
- Active kiosk request JWS signatures and AES-GCM outputs are not deterministic unless future vector tooling fixes or records randomness.
- The active Completion display prototype opens and displays submissions but does not independently rerun full §6/§8 validation in that UI path; the spec text should keep the stronger validation requirement from T4.C.

### Open issues

- Decide in §13 or a profile registry whether `backend: "instantdb"`, algorithm labels, JWS `typ`, content type, payload kind, and provider profile identifiers are final registered values.
- Decide in conformance material how strict duplicate JSON member handling, base64url rejection, JWK key-ops/use fields, and maximum numeric timestamp ranges must be.
- Decide whether any digest or storage-integrity hint should be allowed in provider profiles; active slim rows do not require one.
- Decide whether future public vectors require deterministic ECDSA signatures or compare only signing inputs and verification outcomes.

### Downstream dependencies

- T5 security/privacy should cover production key custody, relay metadata leakage, stale QR risk, replay, logs, debug displays, and demo private-key treatment.
- T5 conformance/registries should convert only stable §9 obligations into checklist and registry rows.
- T6.6 should supply a worked kiosk byte ladder only after the fixture prerequisites in D.12 are stable.
- Final Appendix D/T6.C should add a real `fixtures/kiosk/` root or explicitly state that kiosk conformance vectors remain future work for 1.0 publication.

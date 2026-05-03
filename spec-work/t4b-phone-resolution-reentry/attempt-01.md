## 9.7 Phone resolution and re-entry into §8

This subsection defines the phone-side processing that occurs after a Holder scans or opens a kiosk Pointer URL created under §§9.1-9.6. The Phone presenter resolves the pointer, obtains and opens the encrypted kiosk request, verifies the creator-signed wrapper, validates the embedded SMART request, and then constructs and invokes the base same-device `org-iso-mdoc` flow defined in §8 on the phone.

This subsection does not define phone-to-desktop response submission or Completion display processing. After the phone-local §8 flow produces a SMART response or a same-device failure, processing hands off to §§9.8-9.12.

### 9.7.1 Inputs and artifacts

For the active profile, the Phone presenter starts with:

1. a Pointer URL whose fragment contains `r=<requestId>` as defined in §9.6;
2. a Submission service or provider method that can read the provider request row or encrypted request envelope associated with that `requestId`;
3. request-opening private key material, or a deployment-approved local decrypting component, corresponding to `EncryptedKioskRequest.recipientKeyId` and `KioskRequestPayload.encryptRequestTo.keyId`;
4. a configured set of trusted Kiosk creator public keys or trust metadata indexed by the compact JWS protected-header `kid` and interpreted under deployment policy; and
5. the capability to invoke the same-device §8 Verifier role on the phone.

The Pointer URL is only a locator. It does not contain the §8 `DeviceRequest`, §8 `encryptionInfo`, a compact kiosk request JWS, an `EncryptedKioskRequest`, a SMART request, a SMART response, or response-submission material. The Phone presenter constructs the §8 request only after the kiosk wrapper has been successfully resolved and validated.

### 9.7.2 Pointer parsing and request retrieval

A Phone presenter that supports the active Pointer URL format SHALL parse the URL fragment as form-style parameters and SHALL obtain the kiosk wrapper request identifier from parameter `r`. If `r` is absent, empty, malformed under the deployment's identifier policy, or otherwise unusable as a provider lookup key, the Phone presenter SHALL fail this kiosk resolution attempt and SHALL NOT invoke the Wallet for a SMART request derived from that URL.

The Phone presenter SHALL treat the parsed `r` value as the expected kiosk wrapper `requestId`. It SHALL use that value, and any provider routing context implied by the phone page's configuration, to fetch or read the corresponding provider request row or `EncryptedKioskRequest` envelope. A Submission service MAY return a provider row such as:

```json
{
  "requestId": "<kiosk-wrapper-requestId>",
  "encryptedRequest": { "...": "EncryptedKioskRequest" }
}
```

A Phone presenter SHALL fail safely if no provider row or encrypted request envelope is available for the pointer `requestId`, if the provider response is ambiguous, or if a provider row's `requestId` does not exactly equal the pointer `requestId`.

### 9.7.3 Request-id binding before and after opening

The Phone presenter SHALL bind the same kiosk wrapper `requestId` across all wrapper layers it observes:

| Layer | Required binding |
| --- | --- |
| Pointer URL | Fragment parameter `r` is the expected wrapper `requestId`. |
| Provider row, when present | Row `requestId` equals the pointer `requestId`. |
| Encrypted envelope | `EncryptedKioskRequest.requestId` equals the pointer `requestId` and row `requestId`, when a row is present. |
| AES-GCM request-envelope construction | The request-envelope decryption uses `utf8(requestId)` as HKDF salt and AES-GCM additional authenticated data as defined in §9.3. |
| Signed payload | After JWS verification, `KioskRequestPayload.requestId` equals the pointer, row, and envelope `requestId`. |

A Phone presenter SHALL reject the kiosk request if any available row, envelope, authenticated decryption context, or verified signed payload uses a different wrapper `requestId`. This binding is for kiosk wrapper routing and anti-substitution. It does not replace the distinct SMART request identifier `smartRequest.id`, which is later used by §6 response validation.

### 9.7.4 Opening the `EncryptedKioskRequest`

Before decryption, the Phone presenter SHALL validate the encrypted envelope's version and algorithm labels for the active profile:

- `v` is `1`;
- `alg` is `ECDH-P256+HKDF-SHA256+AES-GCM`;
- `enc` is `A256GCM`;
- `contentType` is `application/smart-health-checkin-kiosk-request+jws+aesgcm`;
- `requestId`, `recipientKeyId`, `iv`, `ciphertext`, and `ephemeralPublicKeyJwk` are present and well-formed for the selected implementation; and
- `expiresAt`, when present on the envelope, has not passed under the deployment's clock-skew policy.

The Phone presenter SHALL use request-opening private key material corresponding to `recipientKeyId` and to the deployment policy for `KioskRequestPayload.encryptRequestTo.keyId`. It SHALL derive the request-envelope AES-GCM key using the §9.3 construction with the envelope ephemeral P-256 public key, `salt = utf8(requestId)`, and `info = utf8("smart-health-checkin-kiosk-request-v1")`. It SHALL decrypt the envelope with AES-GCM using the envelope `iv`, ciphertext, and `additionalData = utf8(requestId)`.

If decryption or authentication fails, the Phone presenter SHALL fail this kiosk resolution attempt and SHALL NOT attempt to recover a SMART request from unauthenticated bytes, provider metadata, URL text, cached display text, or other fallback inputs.

A deployable untrusted-relay profile SHALL NOT require the Submission service itself to hold the request-opening private key or to reveal plaintext `KioskRequestPayload` to route the request. A deployment can place request-opening private key material in the Phone presenter, in a phone-local trusted component, or in another deployment-approved decrypting component, but that component is part of the phone-side validation boundary rather than the untrusted relay.

### 9.7.5 Compact kiosk request JWS verification

The decrypted plaintext SHALL be interpreted as a compact JWS string. The Phone presenter SHALL reject the kiosk request unless the plaintext is a syntactically valid compact JWS with three non-empty base64url parts.

The Phone presenter SHALL parse and verify the protected header before accepting the payload. For this profile it SHALL require:

- `alg` equal to `ES256`;
- `typ` equal to `smart-health-checkin+kiosk-request+jws`; and
- a non-empty `kid` that selects creator public-key material trusted for kiosk request creation under deployment policy.

The Phone presenter SHALL verify the compact JWS signature over the exact compact-JWS signing input using the creator public key selected by `kid`. It SHALL reject the request if the `kid` is unknown, untrusted, unacceptable for the claimed issuer or deployment, expired or revoked under local policy, uses the wrong key type or algorithm, or if signature verification fails.

After signature verification, the Phone presenter SHALL parse the JWS payload as a `KioskRequestPayload` and SHALL validate at least:

1. `v` is `1`;
2. `requestId` exactly equals the pointer, provider row, and encrypted-envelope `requestId` values established above;
3. `createdAt` and `expiresAt` are present as the active millisecond-since-Unix-epoch numeric representation, `expiresAt` is later than `createdAt`, and the request is within the deployment's accepted time window;
4. `createdAt` is not unacceptably far in the future under the deployment's clock-skew policy;
5. `iss` and `aud` are acceptable under the deployment policy for the Phone presenter and request-opening context;
6. `submitTo` identifies the Submission service or provider context from which the Phone presenter read the request, such as the active `{ "backend": "instantdb", "appId": "..." }` shape, and does not redirect the phone to an unbound provider;
7. `encryptRequestTo.alg` equals `ECDH-P256+HKDF-SHA256+AES-GCM`, and `encryptRequestTo.keyId` is consistent with the envelope `recipientKeyId` and request-opening key policy;
8. `encryptResponseTo.alg`, if present for later submission, uses a supported signed metadata label for the deployment; its operational use is defined by §9.8, not by this subsection;
9. `constraints.maxPlaintextBytes`, if present, is within the deployment's accepted maximum and is treated as signed metadata for later submission processing; and
10. `minter.keyId`, if present, is consistent with or acceptable for the JWS protected-header `kid` under deployment policy.

A Phone presenter SHALL NOT treat active demo issuer strings, audience strings, provider app ids, or checked-in demo keys as universal production trust anchors. Production acceptance of `iss`, `aud`, creator keys, key rotation, revocation, and provider identifiers is deployment policy constrained by §7 and later registry/security sections.

### 9.7.6 Embedded SMART request validation

After wrapper verification, the Phone presenter SHALL extract `KioskRequestPayload.smartRequest`. The `smartRequest` member SHALL be the complete SMART request JSON object defined by §5. The Phone presenter SHALL validate it under §5 before constructing any same-device §8 request.

The Phone presenter SHALL reject the kiosk request if `smartRequest` is absent, not a JSON object, not a valid `SmartHealthCheckinRequest`, or is replaced by a preset id, `requestProfile`, SDK helper object, package descriptor, broad shortcut label, profile-family shortcut, legacy inline §8 request fragment, or any other wrapper in place of the SMART request.

The kiosk wrapper `requestId` and `smartRequest.id` are distinct. A Phone presenter SHALL preserve that distinction. It SHALL use wrapper `requestId` for kiosk request resolution, wrapper binding, expiration, and later kiosk-session correlation. It SHALL use `smartRequest.id` only as the SMART clinical request identifier that the Wallet/Responder later copies into `SmartHealthCheckinResponse.requestId` under §6.1.3.

The Phone presenter MAY display the SMART request `purpose`, request item `title`, `summary`, advisory `required` flags, accepted media types, and selector summaries to help the Holder understand what will be requested from the Wallet. It SHALL NOT represent those SMART request display fields, selector URLs, provider ids, pointer URL text, or relay metadata as authenticated requester identity merely because the kiosk wrapper signature verified. Authenticated requester, origin, reader, issuer, and clinical-source trust decisions remain governed by §7 and by the §8 invocation and validation path.

### 9.7.7 Re-entry into the same-device `org-iso-mdoc` flow

Once the Phone presenter has validated the kiosk wrapper and embedded SMART request, it SHALL re-enter the base same-device flow by acting as the phone-local Verifier for §8.

For that re-entry, the Phone presenter SHALL construct a fresh §8 same-device presentation request from the validated `smartRequest`. In particular, it SHALL:

1. serialize the validated SMART request as JSON text for `ItemsRequest.requestInfo["org.smarthealthit.checkin.request"]` as required by §8.2.1;
2. construct the §8 `ItemsRequest`, tag-24 `ItemsRequestBytes`, `DeviceRequest` version `"1.0"`, and optional `readerAuth` according to §8.2;
3. generate or select fresh §8 HPKE recipient key material and `encryptionInfo` for the phone-local presentation session according to §8.2.5;
4. invoke the Digital Credentials API, privileged-caller mechanism, or deployment-approved same-device presentation surface with protocol `org-iso-mdoc`; and
5. retain the §8 original SMART request, recipient private key, exact `encryptionInfo` base64url string, origin or origin-equivalent context, and validation state needed for §8.7 response processing.

The QR code and pointer resolution artifacts SHALL NOT be reused as the §8 `DeviceRequest` or `encryptionInfo`. If an implementation encounters legacy URL fragment parameters that inline `deviceRequest`, `encryptionInfo`, or similar same-device request material, those parameters are not the active §9 pointer-only wrapper and SHALL NOT be processed as a conforming §9.7 re-entry path.

A Phone presenter SHOULD make clear to the Holder that scanning the QR has only loaded a request for review and Wallet invocation. Holder consent and disclosure occur through Wallet/Responder processing in the §8 flow, subject to Wallet policy and Holder control. If the phone cannot invoke an available Wallet or same-device presentation surface, the Phone presenter SHALL fail safely, show or report an appropriate unavailable-wallet status according to local UX and privacy policy, and SHALL NOT synthesize a SMART response or submit clinical content outside the §8 flow.

### 9.7.8 Processing the same-device result and handoff

If the Wallet/Responder returns a §8 presentation response, the Phone presenter in its Verifier role SHALL perform the §8.7 and §8.8 Verifier-side validation steps before treating the extracted SMART response as protocol-valid for kiosk submission. In particular, it SHALL validate the mdoc transport, HPKE opening, `SessionTranscript`, issuer/MSO and digest bindings, device authentication, stable response element, SMART response syntax, and §6.6 cross-validation against the same `smartRequest` that was extracted from the verified kiosk wrapper.

Successful §8 processing yields a validated SMART response and associated presentation-validation state on the phone. This subsection stops at that handoff. Encryption of the phone submission to the desktop public key signed in `encryptResponseTo`, construction of submission plaintext or rows, replay/single-use behavior, Completion display processing, and desktop-side consumption are defined in §§9.8-9.12.

### 9.7.9 Failure handling

A Phone presenter SHALL fail closed for kiosk resolution and same-device re-entry failures. Failure handling MAY use deployment-specific UI, telemetry, retry, cleanup, or staff-assistance behavior, but it SHALL NOT leak plaintext clinical content to the Submission service and SHALL NOT proceed to Wallet invocation or response submission from unvalidated wrapper state.

At a minimum, a Phone presenter SHALL distinguish these classes for local handling, user display, diagnostics, or policy decisions:

| Failure class | Required behavior |
| --- | --- |
| Missing or malformed pointer | Do not fetch arbitrary request state; do not invoke §8. |
| Missing provider row or envelope | Report that the kiosk request is unavailable, expired, or no longer present without inventing a request. |
| Row/envelope/pointer/payload `requestId` mismatch | Reject as a binding failure. |
| Expired or not-yet-valid wrapper | Reject unless an explicit deployment clock-skew policy permits the observed times. |
| Unsupported envelope or payload version/algorithm/content type | Reject unless a future registered profile defines compatible processing. |
| Decrypt or AES-GCM authentication failure | Reject and do not parse plaintext from failed decryption. |
| Untrusted creator key, unacceptable `iss`/`aud`, or failed JWS signature | Reject and do not display the embedded request as trusted kiosk content. |
| Invalid `submitTo` provider binding | Reject or quarantine as a provider-confusion or substitution failure. |
| Invalid embedded `smartRequest` | Reject before §8 construction. |
| Same-device invocation unavailable or Wallet unavailable | Do not synthesize a response; report an unavailable presentation path. |
| Same-device §8 validation failure | Do not hand off a SMART response to kiosk submission. |

A Phone presenter SHOULD avoid displaying highly detailed cryptographic failure reasons to bystanders at a kiosk. It MAY log coarse diagnostic categories subject to §12 privacy guidance and local policy.

## Organizer notes

### Strengths

- Keeps §9.7 as a resolver and re-entry section, with response submission and desktop completion deferred to T4.C.
- Preserves the accepted T4.A invariants: pointer-only `#r=<requestId>`, direct `smartRequest` embedding, wrapper `requestId` distinct from `smartRequest.id`, and no inline §8 `DeviceRequest` or `encryptionInfo` in the QR.
- Provides a concrete phone-side validation sequence that matches active `openEncryptedKioskRequest`, `verifyKioskRequestJws`, provider row binding, and `SmartCheckinButton`/same-device invocation behavior.

### Caveats

- Active demo code ships request-opening private key material in browser-delivered demo configuration so a static demo can decrypt requests on the phone. The deployable text above treats this as demonstration behavior and requires production key custody to keep the untrusted relay out of the plaintext path.
- Active code hard-codes demo `iss`, `aud`, creator keys, and InstantDB provider shape. The draft uses those field names but leaves production acceptance to deployment policy and later registry/security work.
- Active `submit-main.tsx` combines §9.7 resolution, §8 invocation, and early §9.8 submission in one UI. This draft separates the normative cutpoints and mentions later submission only as handoff context.

### Open issues

- T4.C must decide the exact response-submission plaintext shape, including whether the active `{ kind: "smart-health-checkin-response", smartResponse: ... }` payload is canonical or revised.
- T4.D must add CDDL/schema/fixtures for `KioskRequestPayload`, `EncryptedKioskRequest`, compact JWS protected headers, base64url fields, row binding examples, and failure vectors.
- §11/§12 should refine QR substitution, pointer guessing, request-opening key custody, logging/telemetry, error displays, relay metadata minimization, and clock-skew/replay guidance.
- §13/T5 should decide whether exact issuer/audience conventions, `typ`, content type, algorithm labels, TTLs, entropy requirements, and creator-key registries become conformance-profile values.

### Downstream dependencies

- §9.8-§9.12 consume the verified kiosk wrapper, the validated SMART response from §8, wrapper `requestId`, signed `encryptResponseTo`, and signed `constraints` metadata.
- §8 remains the only version 1.0 same-device clinical presentation path; any future OID4VP or alternate kiosk re-entry path would need a separately registered profile.

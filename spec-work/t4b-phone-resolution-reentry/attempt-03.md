### 9.7 Phone resolution and re-entry into §8

This subsection defines the phone-side processing that starts when the Holder opens the Pointer URL defined in §9.6 and ends when the Phone presenter invokes the base same-device presentation flow defined in §8 with the embedded SMART request. It does not define phone-to-desktop response submission, Completion display processing, or replay and cleanup behavior after a SMART response is obtained; those steps are defined in §§9.8-9.12.

The Phone presenter is a Verifier for the phone-local §8 invocation. Before it constructs that §8 request, it acts as a kiosk-wrapper processor: it resolves a pointer, retrieves an encrypted kiosk request, opens and verifies the wrapper, validates the embedded `smartRequest`, and binds all wrapper identifiers that are intended to refer to the same kiosk session.

#### 9.7.1 Pointer parsing

For the active Pointer URL format, a Phone presenter SHALL parse the URL fragment as form-style parameters and SHALL read the `r` fragment parameter as the kiosk wrapper request identifier. The `r` value is the `requestId` from §9.4 and §9.6. It is not the clinical SMART request identifier `smartRequest.id`.

A Phone presenter SHALL reject the pointer as missing or unsupported when it cannot recover a non-empty `r` value for this pointer format. A Phone presenter SHALL NOT infer a kiosk request identifier from plaintext request-looking fields, inline `DeviceRequest` values, `encryptionInfo`, query parameters not defined by the selected pointer profile, or display text on the page.

The Pointer URL is only a bearer locator for protected kiosk state. Possession of the URL does not authenticate the Kiosk creator, prove Holder consent, prove requester identity, prove clinical-source provenance, or create a valid §8 presentation request.

#### 9.7.2 Request-row or envelope retrieval

After recovering the pointer `requestId`, a Phone presenter SHALL use the configured Submission service or provider profile to fetch or read the provider request row or encrypted request envelope associated with that identifier. For the active provider shape, the row contains:

```json
{
  "requestId": "<kiosk-wrapper-requestId>",
  "encryptedRequest": { "...": "EncryptedKioskRequest" }
}
```

A Submission service MAY enforce provider-local access controls, row-shape checks, rate limits, anti-enumeration controls, coarse expiration, and cleanup policy. These controls are defense in depth. The Phone presenter SHALL still perform the cryptographic, binding, expiration, trust, and SMART request validation checks in this subsection.

A Phone presenter SHALL fail safely when the provider is unavailable, the row is absent, the row is malformed, the encrypted envelope is absent, or the provider returns more than one ambiguous candidate for the pointer. A provider or Submission service SHALL NOT require access to plaintext `KioskRequestPayload` or plaintext `smartRequest` in order for a conforming untrusted-relay deployment to route the request.

#### 9.7.3 Request identifier binding

Before invoking §8, the Phone presenter SHALL establish that the pointer, provider row, encrypted envelope, and signed kiosk payload all identify the same kiosk wrapper request.

At minimum, the Phone presenter SHALL verify all of the following values are equal as exact strings:

1. the Pointer URL fragment parameter `r`;
2. the provider request row `requestId`, when a provider row carries such a member;
3. `EncryptedKioskRequest.requestId`; and
4. the decrypted and verified `KioskRequestPayload.requestId`.

A Phone presenter SHALL reject the kiosk request if any of these values is missing where required by the selected provider profile, or if any required equality check fails. This binding is the kiosk wrapper binding only. It does not permit substituting the wrapper `requestId` for `smartRequest.id`, and it does not change the §6 rule that a SMART response later echoes the clinical request id as `SmartHealthCheckinResponse.requestId`.

A Phone presenter SHOULD also check envelope metadata that is intended to mirror signed payload metadata, including `EncryptedKioskRequest.createdAt`, `EncryptedKioskRequest.expiresAt`, `EncryptedKioskRequest.creatorKeyId`, and `EncryptedKioskRequest.recipientKeyId`, against the decrypted and verified payload and JWS header when those values are present in both places. A mismatch is a wrapper-integrity failure unless a future provider profile explicitly defines different mirrored metadata semantics.

#### 9.7.4 Opening the encrypted request envelope

A Phone presenter SHALL process `EncryptedKioskRequest` using the request-envelope suite from §9.3. For the active profile, the Phone presenter SHALL require:

- `v` equal to numeric `1`;
- `alg` equal to `ECDH-P256+HKDF-SHA256+AES-GCM`;
- `enc` equal to `A256GCM`;
- `contentType` equal to `application/smart-health-checkin-kiosk-request+jws+aesgcm`;
- non-empty `requestId`, `recipientKeyId`, `iv`, and `ciphertext` values;
- a P-256 `ephemeralPublicKeyJwk`; and
- a `recipientKeyId` acceptable for request-opening private key material available to the Phone presenter or to the deployment profile under which the Phone presenter is running.

The Phone presenter SHALL derive the request-opening content-encryption key using the §9.3 suite, with `salt = utf8(EncryptedKioskRequest.requestId)`, `info = utf8("smart-health-checkin-kiosk-request-v1")`, and AES-GCM additional authenticated data `utf8(EncryptedKioskRequest.requestId)`. The Phone presenter SHALL decrypt the envelope ciphertext to UTF-8 compact JWS text. The Phone presenter SHALL reject the request if key selection fails, the public-key material is invalid, base64url decoding fails, AES-GCM authentication fails, plaintext decoding fails, or the plaintext is not a compact JWS.

A conforming untrusted-relay deployment SHALL NOT place the request-opening private key under control of the Submission service merely so the relay can inspect or route request contents. A deployment profile MAY deliver request-opening private key material to a phone-side component, a trusted backend assisting the phone, or another trusted component, but that profile SHALL define key custody, audience, origin or application binding, rotation, and production-vs-demo separation. Browser-delivered demo request-opening private keys are demonstration behavior only and are not a production key-management pattern.

#### 9.7.5 Kiosk request JWS verification and payload checks

After decrypting the compact JWS, the Phone presenter SHALL verify the kiosk request JWS before using any payload field to construct a §8 request. The Phone presenter SHALL:

1. require the compact JWS to have exactly three non-empty base64url parts;
2. parse the protected header as a JSON object;
3. require protected header `alg` equal to `ES256`;
4. require protected header `typ` equal to `smart-health-checkin+kiosk-request+jws`;
5. require a non-empty protected header `kid`;
6. resolve `kid` to a creator public key that is trusted for kiosk request creation under deployment policy;
7. verify the ES256 signature over the compact JWS signing input;
8. parse the JWS payload as a `KioskRequestPayload` JSON object;
9. require payload `v` equal to numeric `1`;
10. require payload `iss` and `aud` to satisfy the deployment's kiosk-creator issuer and request-opening audience policy;
11. require `createdAt` and `expiresAt` to be valid time values for this profile, with `expiresAt` later than `createdAt`;
12. reject expired requests and reject requests whose `createdAt` is unacceptably far in the future under deployment clock-skew policy;
13. require payload `submitTo` to identify the provider binding actually used to retrieve the request, including `submitTo.backend` and provider application or routing identifiers such as the active `submitTo.appId`;
14. require `encryptRequestTo.alg` and `encryptResponseTo.alg` to be recognized algorithm labels for this profile;
15. require `encryptRequestTo.keyId` to be consistent with the envelope recipient key used for request opening;
16. require `minter.keyId`, when present, to be consistent with the protected-header `kid` or otherwise acceptable under creator-key policy;
17. require signed `constraints` to be syntactically valid and acceptable to local policy; and
18. require all request identifier bindings from §9.7.3.

The Phone presenter SHALL reject the request if the creator key is untrusted, the signature is invalid, the JWS header or payload is malformed, the `typ` or algorithm labels are unsupported, issuer or audience policy fails, freshness checks fail, `submitTo` does not bind to the provider used for resolution, or any required binding check fails.

The signed `encryptResponseTo` and `constraints` members are retained as signed metadata for later steps. Their operational use for phone-to-desktop submission is defined in §§9.8-9.12, not in this subsection.

#### 9.7.6 Embedded SMART request validation

The `KioskRequestPayload.smartRequest` member is the complete SMART request object for the check-in interaction. A Phone presenter SHALL require `smartRequest` to be present as a JSON object and SHALL validate it under §5 before invoking §8.

The Phone presenter SHALL keep the following identifiers distinct:

- `KioskRequestPayload.requestId` is the kiosk wrapper identifier used for pointer lookup, envelope binding, row binding, and kiosk-session correlation.
- `KioskRequestPayload.smartRequest.id` is the clinical SMART request identifier used by §8 as the request carried to the Wallet/Responder and later by §6 as the value that a SMART response echoes in `SmartHealthCheckinResponse.requestId`.

A Phone presenter, Kiosk creator, Verifier, Requester, Submission service, or Completion display SHALL NOT substitute one identifier for the other.

Validation of `smartRequest` includes the §5 encoding and field rules: `type` is `smart-health-checkin-request`, `version` is `1`, `id` is non-empty, request item identifiers are valid and unique, request item display and selector fields are well formed, `accept[]` values are present, `profilesFrom[]` is an array of canonical profile-family URLs when present, and prohibited requester identity metadata is not introduced into the clinical request body. A Phone presenter SHALL reject or fail the kiosk interaction if the embedded SMART request is absent, not a JSON object, invalid under §5, or unacceptable under deployment policy.

Successful kiosk-wrapper verification does not make SMART request display fields authenticated requester identity. A Phone presenter and Wallet/Responder SHALL NOT present `purpose`, item `title`, item `summary`, selector URLs, unknown SMART request fields, pointer metadata, relay URLs, provider app ids, or wrapper routing values as authenticated requester identity unless the same fact is established by §7 trust processing or deployment policy outside the clinical request body. The wrapper signature authenticates the kiosk wrapper according to creator-key policy; it does not create clinical-source provenance for later returned Artifacts.

#### 9.7.7 Re-entry into the same-device §8 flow

Only after the Phone presenter has completed pointer parsing, request retrieval, request-id binding, request-envelope decryption, JWS verification, creator-trust evaluation, freshness checks, provider binding, and embedded SMART request validation, the Phone presenter SHALL invoke or participate in the same-device `org-iso-mdoc` flow defined in §8 using the validated `smartRequest` as the SMART request.

For this re-entry, the Phone presenter acts as the phone-local Verifier for §8. It SHALL construct a new §8 `DeviceRequest`, `ItemsRequest`, `encryptionInfo`, and related presentation-session artifacts on the phone according to §8. The Pointer URL, QR code, provider row, encrypted kiosk request envelope, and kiosk request JWS did not contain a §8 `DeviceRequest`, did not contain §8 `encryptionInfo`, did not contain a §8 `SessionTranscript`, and did not contain Wallet response material. Legacy or experimental fragments that inline `deviceRequest` or `encryptionInfo` are not the active version 1.0 kiosk pointer profile.

The Phone presenter SHALL carry the validated `smartRequest` in the §8 request only at `ItemsRequest.requestInfo["org.smarthealthit.checkin.request"]`, as required by §8. It SHALL request `docType` `org.smarthealthit.checkin.1`, namespace `org.smarthealthit.checkin`, and element `smart_health_checkin_response`, and SHALL follow the §8 rules for `SessionTranscript`, optional `readerAuth`, HPKE recipient key material, Digital Credentials API invocation, Wallet response opening, mdoc validation, and §6 response cross-validation.

The Browser / User Agent or platform origin used for the §8 same-device invocation is the phone-side origin or deployment-approved privileged-caller context for that invocation. A Phone presenter, Wallet/Responder, or Verifier SHALL NOT derive the §8 origin from the kiosk Pointer URL display text, SMART request body, wrapper `iss`, wrapper `aud`, `submitTo`, relay URL, provider application id, or requester-looking fields.

If the phone platform cannot invoke the Wallet through the §8 flow, if Digital Credentials API support is unavailable, if the Holder cancels before a Wallet response is produced, or if §8 request construction or Wallet invocation fails, the Phone presenter SHALL fail safely and report an unavailable-wallet or invocation-failed state to the Holder. Any later status conveyed to the kiosk side is response-submission and completion behavior governed by §§9.8-9.12.

#### 9.7.8 Failure handling before submission

A Phone presenter SHALL avoid submitting clinical response material or completion success for a kiosk request that fails the processing in this subsection. At a high level, a Phone presenter SHALL map the following conditions to safe failure states visible to the Holder and, where the later submission/completion profile permits, to non-clinical completion status:

| Condition | Required phone-side treatment |
| --- | --- |
| Missing or unsupported pointer | Do not fetch arbitrary request state; display that no kiosk request pointer is available. |
| Missing provider row or envelope | Do not invoke §8; display that the kiosk request was not found or is unavailable. |
| Expired request or unacceptable `createdAt` | Do not invoke §8; display that the kiosk request expired or is not yet valid. |
| Decrypt failure or malformed envelope | Do not use payload fields; display a request-opening failure without exposing key material. |
| Untrusted creator key, bad JWS, wrong `typ`, or unsupported algorithm | Do not use the payload; display an untrusted or invalid kiosk request failure. |
| `requestId` mismatch among pointer, row, envelope, or signed payload | Do not invoke §8; treat as pointer/payload substitution or corruption. |
| `iss`, `aud`, `submitTo`, or key-id policy failure | Do not invoke §8; treat as wrong deployment, wrong provider, or unacceptable creator context. |
| Invalid embedded `smartRequest` | Do not construct a §8 presentation request; report that the clinical request is invalid. |
| Wallet invocation unavailable, unsupported, cancelled, or failed before response | Do not claim completion; report local wallet invocation status. |

Failure messages SHOULD be specific enough for Holder recovery and operator diagnosis but SHOULD NOT expose private keys, decrypted JWS plaintext, raw clinical request details beyond the Holder-facing context appropriate for review, provider credentials, or sensitive relay diagnostics. Implementations SHOULD log only the minimum metadata needed for abuse prevention and troubleshooting under the privacy requirements in §12.

Once a Wallet/Responder returns a candidate SMART response through the phone-local §8 flow, the Phone presenter proceeds to the response-submission handoff defined by §§9.8-9.12. This subsection intentionally stops at the boundary where §8 has produced and validated a SMART response for the validated `smartRequest`.

#### Organizer notes

**Strengths.** This draft keeps T4.B tightly scoped to phone resolution and §8 re-entry. It preserves the accepted T4.A decisions: pointer-only `#r=<requestId>`, direct `smartRequest` embedding, wrapper `requestId` distinct from `smartRequest.id`, untrusted relay, and no inline §8 `DeviceRequest` or `encryptionInfo` in the QR. It also aligns with active code behavior: fragment parsing via `r`, provider `readRequest`, `openEncryptedKioskRequest`, `verifyKioskRequestJws`, `validateSmartCheckinRequest`, and phone UI invoking `SmartCheckinButton` with the resolved `smartRequest`.

**Caveats.** Active demo code names the request-opening key as a submission-service key and ships demo private key material to the browser. The deployable requirement above treats that as request-opening private key material that must not be controlled by an untrusted relay. Active demo constants for `iss` and `aud` are intentionally not standardized as production values.

**Open issues.** Later conformance work should decide exact clock-skew windows, whether envelope mirrored metadata checks are SHALL or SHOULD for every provider profile, exact duplicate JSON-member handling for the JWS payload, and whether request-opening can be performed by a trusted backend on behalf of the phone without weakening the untrusted-relay model.

**Downstream dependencies.** T4.C must define the shape, encryption, size limits, replay controls, and completion semantics for the post-§8 SMART response submission, including how signed `encryptResponseTo` and `constraints.maxPlaintextBytes` are used. T4.D must align kiosk CDDL and fixtures with the `requestId` binding, envelope algorithm labels, JWS `typ`, and pointer-only profile. §§11-13 should cover QR substitution, pointer guessing, metadata leakage, production key custody, creator-key trust registries, algorithm registries, and conformance classes.
